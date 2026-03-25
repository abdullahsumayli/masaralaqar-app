import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'

export async function GET() {
  try {
    const cookieStore = await cookies()

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
        },
      }
    )

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    // جلب بيانات المستخدم مع المكتب
    const { data: profile } = await supabase
      .from('users')
      .select('id, name, email, role, office_id')
      .eq('id', user.id)
      .single()

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    return NextResponse.json({
      userId: profile.id,
      name: profile.name,
      email: profile.email,
      role: profile.role,
      officeId: profile.office_id,
    })
  } catch (err) {
    console.error('[Auth] me error:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
