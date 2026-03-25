import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'
import { analyzeMessage, generateReply } from '@/lib/ai'
import { calculateScore } from '@/lib/scoring'
import { assignLead } from '@/lib/assign'
import { sendText } from '@/lib/evolution'

// رد سريع على Evolution API ثم عالج في الخلفية
export const maxDuration = 30

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ status: 'invalid_json' }, { status: 400 })
  }

  const event = body.event as string
  const instanceName = body.instance as string

  if (!event || !instanceName) {
    return NextResponse.json({ status: 'ignored' })
  }

  // جلب الجلسة المرتبطة بهذا الـ instance
  const { data: session } = await supabaseAdmin
    .from('whatsapp_sessions')
    .select('*, offices!inner(id, name)')
    .eq('instance_id', instanceName)
    .maybeSingle()

  // === CONNECTION_UPDATE ===
  if (event === 'CONNECTION_UPDATE' || event === 'connection.update') {
    const data = body.data as Record<string, unknown> | undefined
    const state = (data?.state as string) || (data?.status as string) || ''

    if (session) {
      const newStatus =
        state === 'open' || state === 'connected'
          ? 'connected'
          : state === 'close' || state === 'disconnected'
            ? 'disconnected'
            : session.session_status

      await supabaseAdmin
        .from('whatsapp_sessions')
        .update({
          session_status: newStatus,
          last_connected_at:
            newStatus === 'connected' ? new Date().toISOString() : session.last_connected_at,
          updated_at: new Date().toISOString(),
        })
        .eq('id', session.id)
    }

    return NextResponse.json({ status: 'connection_updated' })
  }

  // === QRCODE_UPDATED ===
  if (event === 'QRCODE_UPDATED' || event === 'qrcode.updated') {
    return NextResponse.json({ status: 'qr_received' })
  }

  // === MESSAGES_UPSERT ===
  if (event === 'MESSAGES_UPSERT' || event === 'messages.upsert') {
    const data = body.data as Record<string, unknown> | undefined
    if (!data) return NextResponse.json({ status: 'no_data' })

    const key = data.key as Record<string, unknown> | undefined
    const fromMe = key?.fromMe as boolean

    // تجاهل الرسائل المرسلة منا
    if (fromMe) return NextResponse.json({ status: 'own_message' })

    const remoteJid = key?.remoteJid as string
    if (!remoteJid || remoteJid.includes('@g.us')) {
      // تجاهل رسائل المجموعات
      return NextResponse.json({ status: 'group_ignored' })
    }

    // استخراج رقم الهاتف
    const phone = remoteJid.replace('@s.whatsapp.net', '')

    // استخراج نص الرسالة
    const message = data.message as Record<string, unknown> | undefined
    const text =
      (message?.conversation as string) ||
      (message?.extendedTextMessage as Record<string, unknown>)?.text as string ||
      ''

    if (!text) return NextResponse.json({ status: 'no_text' })

    const pushName = (data.pushName as string) || ''

    if (!session) {
      console.error(`[Webhook] No session found for instance: ${instanceName}`)
      return NextResponse.json({ status: 'session_not_found' }, { status: 404 })
    }

    const officeId = session.office_id

    try {
      // 1. ابحث عن lead موجود
      let { data: lead } = await supabaseAdmin
        .from('leads')
        .select('*')
        .eq('office_id', officeId)
        .eq('phone', phone)
        .maybeSingle()

      // 2. أنشئ lead جديد
      if (!lead) {
        const { data: newLead, error } = await supabaseAdmin
          .from('leads')
          .insert({
            office_id: officeId,
            phone,
            name: pushName || null,
            source: 'whatsapp',
            stage: 'new',
          })
          .select()
          .single()

        if (error) throw error
        lead = newLead
      }

      // 3. احفظ الرسالة الواردة
      await supabaseAdmin.from('messages').insert({
        lead_id: lead.id,
        direction: 'incoming',
        content: text,
        raw_payload: body,
      })

      // 4. حلل بالـ AI
      const aiData = await analyzeMessage(text)

      // 5. احسب الـ Score
      const updatedData = { ...lead, ...aiData }
      const score = calculateScore(text, updatedData)

      // 6. حدّث الـ Lead
      const updatePayload: Record<string, unknown> = {
        score,
        updated_at: new Date().toISOString(),
      }
      if (pushName && !lead.name) updatePayload.name = pushName
      if (aiData.name && !lead.name) updatePayload.name = aiData.name
      if (aiData.budget && !lead.budget) updatePayload.budget = aiData.budget
      if (aiData.property_type && !lead.property_type)
        updatePayload.property_type = aiData.property_type
      if (aiData.location && !lead.location) updatePayload.location = aiData.location

      await supabaseAdmin.from('leads').update(updatePayload).eq('id', lead.id)

      // 7. وزّع إذا ما عنده agent
      if (!lead.assigned_to) {
        const agentId = await assignLead(updatedData, officeId)
        if (agentId) {
          await supabaseAdmin
            .from('leads')
            .update({ assigned_to: agentId })
            .eq('id', lead.id)
        }
      }

      // 8. جلب إعدادات صقر للمكتب
      const { data: aiAgent } = await supabaseAdmin
        .from('ai_agents')
        .select('*')
        .eq('office_id', officeId)
        .eq('is_active', true)
        .maybeSingle()

      // 9. توليد رد AI وإرساله
      if (aiAgent) {
        // جلب آخر رسائل المحادثة للسياق
        const { data: recentMessages } = await supabaseAdmin
          .from('messages')
          .select('direction, content')
          .eq('lead_id', lead.id)
          .order('created_at', { ascending: false })
          .limit(10)

        const history = (recentMessages || [])
          .reverse()
          .map((m) => ({
            role: m.direction === 'incoming' ? 'user' as const : 'assistant' as const,
            content: m.content || '',
          }))

        // جلب العقارات المتاحة للمطابقة
        const { data: properties } = await supabaseAdmin
          .from('properties')
          .select('title, price, location, type, bedrooms, area, city, district')
          .eq('status', 'available')
          .limit(20)

        const reply = await generateReply({
          agentConfig: aiAgent,
          message: text,
          history,
          leadInfo: updatedData,
          properties: properties || [],
        })

        if (reply) {
          // أرسل الرد عبر Evolution API
          await sendText(instanceName, phone, reply)

          // احفظ الرد في قاعدة البيانات
          await supabaseAdmin.from('messages').insert({
            lead_id: lead.id,
            direction: 'outgoing',
            content: reply,
          })
        }
      }

      return NextResponse.json({ status: 'ok' })
    } catch (err) {
      console.error('[Webhook] Error processing message:', err)
      return NextResponse.json({ status: 'error' }, { status: 500 })
    }
  }

  return NextResponse.json({ status: 'unhandled_event' })
}

// Evolution API لا يحتاج GET verification مثل Meta
export async function GET() {
  return NextResponse.json({ status: 'evolution_webhook_active' })
}
