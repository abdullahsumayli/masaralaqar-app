import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import Header from '@/components/layout/Header'
import SettingsForm from '@/components/settings/SettingsForm'

async function getSupabase() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (list) => list.forEach(({ name, value, options }) => cookieStore.set(name, value, options)),
      },
    }
  )
}

export default async function SettingsPage() {
  const supabase = await getSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: userData } = await supabase
    .from('users')
    .select('office_id, name, email')
    .eq('id', user.id)
    .single()

  if (!userData) return null

  const { data: office } = await supabase
    .from('offices')
    .select('*')
    .eq('id', userData.office_id)
    .single()

  return (
    <div>
      <Header title="الإعدادات" subtitle="إعدادات مكتبك ونظام WhatsApp" />
      <div className="p-8 max-w-2xl">
        <SettingsForm user={userData} office={office} />
      </div>
    </div>
  )
}
