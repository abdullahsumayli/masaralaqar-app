import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import Header from '@/components/layout/Header'
import KanbanBoard from '@/components/leads/KanbanBoard'
import type { Lead } from '@/lib/types'

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

export default async function LeadsPage() {
  const supabase = await getSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: userData } = await supabase
    .from('users')
    .select('office_id')
    .eq('id', user.id)
    .single()

  if (!userData) return null

  const { data: leads } = await supabase
    .from('leads')
    .select('*')
    .eq('office_id', userData.office_id)
    .order('created_at', { ascending: false })

  return (
    <div>
      <Header title="العملاء المحتملون" subtitle="إدارة وتتبع جميع العملاء بالسحب والإفلات" />
      <div className="p-8">
        <KanbanBoard initialLeads={(leads as Lead[]) || []} />
      </div>
    </div>
  )
}
