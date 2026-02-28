import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'

export async function POST(req: NextRequest) {
  const { name, officeName, email, password } = await req.json()

  if (!name || !officeName || !email || !password) {
    return NextResponse.json({ error: 'جميع الحقول مطلوبة' }, { status: 400 })
  }

  // إنشاء المستخدم في Supabase Auth
  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })

  if (authError) {
    return NextResponse.json({ error: authError.message }, { status: 400 })
  }

  // إنشاء المكتب
  const { data: office, error: officeError } = await supabaseAdmin
    .from('offices')
    .insert({ name: officeName, plan: 'trial' })
    .select()
    .single()

  if (officeError) {
    await supabaseAdmin.auth.admin.deleteUser(authData.user.id)
    return NextResponse.json({ error: officeError.message }, { status: 500 })
  }

  // إنشاء المستخدم في جدول users
  const { error: userError } = await supabaseAdmin
    .from('users')
    .insert({
      id: authData.user.id,
      office_id: office.id,
      name,
      email,
      role: 'admin',
    })

  if (userError) {
    await supabaseAdmin.auth.admin.deleteUser(authData.user.id)
    return NextResponse.json({ error: userError.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
