import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { notFound } from 'next/navigation'
import Header from '@/components/layout/Header'
import LeadDetail from '@/components/leads/LeadDetail'
import type { Lead, Message } from '@/lib/types'

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

export default async function LeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await getSupabase()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: userData } = await supabase
    .from('users')
    .select('office_id')
    .eq('id', user.id)
    .single()

  if (!userData) return null

  const [{ data: lead }, { data: messages }] = await Promise.all([
    supabase.from('leads').select('*').eq('id', id).eq('office_id', userData.office_id).single(),
    supabase.from('messages').select('*').eq('lead_id', id).order('created_at', { ascending: true }),
  ])

  if (!lead) notFound()

  return (
    <div>
      <Header title={lead.name || lead.phone} subtitle="تفاصيل العميل ومحادثاته" />
      <div className="p-8">
        <LeadDetail lead={lead as Lead} messages={(messages as Message[]) || []} />
      </div>
    </div>
  )
}
