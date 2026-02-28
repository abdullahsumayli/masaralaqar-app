import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'
import { analyzeMessage } from '@/lib/ai'
import { calculateScore } from '@/lib/scoring'
import { assignLead } from '@/lib/assign'

// Rate limiting بسيط في الذاكرة
const requestCounts = new Map<string, { count: number; resetAt: number }>()

function isRateLimited(ip: string): boolean {
  const now = Date.now()
  const record = requestCounts.get(ip)

  if (!record || now > record.resetAt) {
    requestCounts.set(ip, { count: 1, resetAt: now + 60_000 })
    return false
  }

  if (record.count >= 100) return true
  record.count++
  return false
}

// WhatsApp Verification
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  if (
    searchParams.get('hub.mode') === 'subscribe' &&
    searchParams.get('hub.verify_token') === process.env.WEBHOOK_VERIFY_TOKEN
  ) {
    return new NextResponse(searchParams.get('hub.challenge'), { status: 200 })
  }
  return new NextResponse('Forbidden', { status: 403 })
}

// WhatsApp Messages
export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for') || 'unknown'

  if (isRateLimited(ip)) {
    return NextResponse.json({ status: 'rate_limited' }, { status: 429 })
  }

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ status: 'invalid_json' }, { status: 400 })
  }

  try {
    const entry = (body.entry as Record<string, unknown>[])?.[0]
    const change = (entry?.changes as Record<string, unknown>[])?.[0]
    const value = change?.value as Record<string, unknown>
    const messages = value?.messages as Record<string, unknown>[]
    const message = messages?.[0]
    const phoneNumberId = (value?.metadata as Record<string, unknown>)?.phone_number_id as string

    if (!message || message.type !== 'text') {
      return NextResponse.json({ status: 'ignored' })
    }

    const phone = message.from as string
    const text = (message.text as Record<string, string>).body

    // ابحث عن المكتب بالـ phone_number_id
    const { data: office } = await supabaseAdmin
      .from('offices')
      .select('id')
      .eq('whatsapp_phone_id', phoneNumberId)
      .single()

    if (!office) return NextResponse.json({ status: 'office_not_found' }, { status: 404 })

    const officeId = office.id

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
        .insert({ office_id: officeId, phone, source: 'whatsapp', stage: 'new' })
        .select()
        .single()

      if (error) throw error
      lead = newLead
    }

    // 3. احفظ الرسالة
    await supabaseAdmin.from('messages').insert({
      lead_id: lead.id,
      direction: 'incoming',
      content: text,
      raw_payload: body
    })

    // 4. حلل بالـ AI
    const aiData = await analyzeMessage(text)

    // 5. احسب الـ Score
    const updatedData = { ...lead, ...aiData }
    const score = calculateScore(text, updatedData)

    // 6. حدّث الـ Lead
    const updatePayload: Record<string, unknown> = { score }
    if (aiData.name && !lead.name) updatePayload.name = aiData.name
    if (aiData.budget && !lead.budget) updatePayload.budget = aiData.budget
    if (aiData.property_type && !lead.property_type) updatePayload.property_type = aiData.property_type
    if (aiData.location && !lead.location) updatePayload.location = aiData.location

    await supabaseAdmin.from('leads').update(updatePayload).eq('id', lead.id)

    // 7. وزّع إذا ما عنده agent
    if (!lead.assigned_to) {
      const agentId = await assignLead(updatedData, officeId)
      if (agentId) {
        await supabaseAdmin.from('leads').update({ assigned_to: agentId }).eq('id', lead.id)
      }
    }

    return NextResponse.json({ status: 'ok' })
  } catch (err) {
    console.error('[Webhook] Error:', err)
    return NextResponse.json({ status: 'error' }, { status: 500 })
  }
}
