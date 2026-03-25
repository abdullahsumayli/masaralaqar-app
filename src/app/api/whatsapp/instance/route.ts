import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'
import { createInstance, deleteInstance, getConnectionState } from '@/lib/evolution'
import { getAppUrl } from '@/lib/get-app-url'

// POST: إنشاء instance جديد للمكتب
export async function POST(req: NextRequest) {
  try {
    const { officeId } = (await req.json()) as { officeId: string }

    if (!officeId) {
      return NextResponse.json({ error: 'officeId required' }, { status: 400 })
    }

    // تحقق من وجود المكتب
    const { data: office } = await supabaseAdmin
      .from('offices')
      .select('id, name')
      .eq('id', officeId)
      .single()

    if (!office) {
      return NextResponse.json({ error: 'Office not found' }, { status: 404 })
    }

    // اسم الـ instance فريد لكل مكتب
    const instanceName = `saqr-${officeId.slice(0, 8)}`
    const appUrl = getAppUrl()
    const webhookUrl = `${appUrl}/api/webhook/whatsapp`

    // أنشئ الـ instance على Evolution API
    const result = await createInstance(instanceName, webhookUrl)

    if (!result.ok) {
      return NextResponse.json(
        { error: result.error || 'Failed to create instance' },
        { status: 500 }
      )
    }

    // حدّث أو أنشئ سجل الجلسة
    const { data: existing } = await supabaseAdmin
      .from('whatsapp_sessions')
      .select('id')
      .eq('office_id', officeId)
      .maybeSingle()

    if (existing) {
      await supabaseAdmin
        .from('whatsapp_sessions')
        .update({
          instance_id: instanceName,
          webhook_url: webhookUrl,
          session_status: 'pending',
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id)
    } else {
      await supabaseAdmin.from('whatsapp_sessions').insert({
        office_id: officeId,
        instance_id: instanceName,
        webhook_url: webhookUrl,
        session_status: 'pending',
      })
    }

    return NextResponse.json({
      status: 'created',
      instanceName,
      webhookUrl,
      data: result.data,
    })
  } catch (err) {
    console.error('[Instance] Create error:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

// GET: جلب حالة الـ instance
export async function GET(req: NextRequest) {
  const officeId = req.nextUrl.searchParams.get('officeId')

  if (!officeId) {
    return NextResponse.json({ error: 'officeId required' }, { status: 400 })
  }

  const { data: session } = await supabaseAdmin
    .from('whatsapp_sessions')
    .select('*')
    .eq('office_id', officeId)
    .maybeSingle()

  if (!session || !session.instance_id) {
    return NextResponse.json({ status: 'not_created', session: null })
  }

  // فحص الحالة الحقيقية من Evolution API
  const state = await getConnectionState(session.instance_id)

  const liveStatus = state.data?.instance?.state || 'unknown'

  // مزامنة الحالة مع قاعدة البيانات إذا اختلفت
  const mappedStatus =
    liveStatus === 'open' || liveStatus === 'connected'
      ? 'connected'
      : liveStatus === 'close' || liveStatus === 'disconnected'
        ? 'disconnected'
        : session.session_status

  if (mappedStatus !== session.session_status) {
    await supabaseAdmin
      .from('whatsapp_sessions')
      .update({
        session_status: mappedStatus,
        updated_at: new Date().toISOString(),
      })
      .eq('id', session.id)
  }

  return NextResponse.json({
    status: mappedStatus,
    session: { ...session, session_status: mappedStatus },
    liveStatus,
  })
}

// DELETE: حذف الـ instance
export async function DELETE(req: NextRequest) {
  const officeId = req.nextUrl.searchParams.get('officeId')

  if (!officeId) {
    return NextResponse.json({ error: 'officeId required' }, { status: 400 })
  }

  const { data: session } = await supabaseAdmin
    .from('whatsapp_sessions')
    .select('*')
    .eq('office_id', officeId)
    .maybeSingle()

  if (session?.instance_id) {
    await deleteInstance(session.instance_id)

    await supabaseAdmin
      .from('whatsapp_sessions')
      .update({
        session_status: 'disconnected',
        updated_at: new Date().toISOString(),
      })
      .eq('id', session.id)
  }

  return NextResponse.json({ status: 'deleted' })
}
