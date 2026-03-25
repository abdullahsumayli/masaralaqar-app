import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'
import { getQRCode } from '@/lib/evolution'

export async function GET(req: NextRequest) {
  const officeId = req.nextUrl.searchParams.get('officeId')

  if (!officeId) {
    return NextResponse.json({ error: 'officeId required' }, { status: 400 })
  }

  const { data: session } = await supabaseAdmin
    .from('whatsapp_sessions')
    .select('instance_id, session_status')
    .eq('office_id', officeId)
    .maybeSingle()

  if (!session?.instance_id) {
    return NextResponse.json(
      { error: 'Instance not created. Create one first.' },
      { status: 404 }
    )
  }

  if (session.session_status === 'connected') {
    return NextResponse.json({ status: 'already_connected' })
  }

  const result = await getQRCode(session.instance_id)

  if (!result.ok) {
    return NextResponse.json(
      { error: result.error || 'Failed to get QR code' },
      { status: 500 }
    )
  }

  return NextResponse.json({
    qr: result.data?.base64 || null,
    code: result.data?.code || null,
  })
}
