import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'
import { sendText } from '@/lib/evolution'

export async function POST(req: NextRequest) {
  try {
    const { officeId, phone, message } = (await req.json()) as {
      officeId: string
      phone: string
      message: string
    }

    if (!officeId || !phone || !message) {
      return NextResponse.json(
        { error: 'officeId, phone, and message are required' },
        { status: 400 }
      )
    }

    const { data: session } = await supabaseAdmin
      .from('whatsapp_sessions')
      .select('instance_id, session_status')
      .eq('office_id', officeId)
      .maybeSingle()

    if (!session?.instance_id || session.session_status !== 'connected') {
      return NextResponse.json(
        { error: 'WhatsApp not connected' },
        { status: 400 }
      )
    }

    const result = await sendText(session.instance_id, phone, message)

    if (!result.ok) {
      return NextResponse.json(
        { error: result.error || 'Failed to send' },
        { status: 500 }
      )
    }

    return NextResponse.json({ status: 'sent', data: result.data })
  } catch (err) {
    console.error('[Send] Error:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
