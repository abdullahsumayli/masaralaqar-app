import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import Header from '@/components/layout/Header'
import { TrendingUp, Users, CheckCircle, Clock } from 'lucide-react'
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

const stageLabels: Record<string, string> = {
  new: 'جديد',
  contacted: 'تم التواصل',
  qualified: 'مؤهل',
  viewing: 'معاينة',
  closed: 'مغلق',
}

const stageColors: Record<string, string> = {
  new: 'bg-slate-100 text-slate-700',
  contacted: 'bg-blue-100 text-blue-700',
  qualified: 'bg-yellow-100 text-yellow-700',
  viewing: 'bg-purple-100 text-purple-700',
  closed: 'bg-emerald-100 text-emerald-700',
}

function scoreColor(score: number) {
  if (score >= 70) return 'bg-emerald-100 text-emerald-700'
  if (score >= 40) return 'bg-yellow-100 text-yellow-700'
  return 'bg-red-100 text-red-700'
}

export default async function DashboardPage() {
  const supabase = await getSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: userData } = await supabase
    .from('users')
    .select('office_id')
    .eq('id', user.id)
    .single()

  if (!userData) return null

  const officeId = userData.office_id
  const today = new Date().toISOString().split('T')[0]

  const [{ data: allLeads }, { data: todayLeads }] = await Promise.all([
    supabase.from('leads').select('*').eq('office_id', officeId),
    supabase.from('leads').select('*').eq('office_id', officeId).gte('created_at', today),
  ])

  const leads: Lead[] = allLeads || []
  const closed = leads.filter(l => l.stage === 'closed').length
  const total = leads.length
  const conversionRate = total > 0 ? Math.round((closed / total) * 100) : 0
  const recent = [...leads].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 5)

  const stageCount = leads.reduce((acc, l) => {
    acc[l.stage] = (acc[l.stage] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  const stats = [
    { label: 'عملاء اليوم', value: todayLeads?.length || 0, icon: Users, color: 'text-indigo-600', bg: 'bg-indigo-50' },
    { label: 'إجمالي العملاء', value: total, icon: Clock, color: 'text-slate-600', bg: 'bg-slate-50' },
    { label: 'صفقات مغلقة', value: closed, icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'معدل التحويل', value: `${conversionRate}%`, icon: TrendingUp, color: 'text-purple-600', bg: 'bg-purple-50' },
  ]

  return (
    <div>
      <Header title="لوحة التحكم" subtitle="نظرة عامة على أداء مكتبك" />

      <div className="p-8 space-y-8">
        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map(stat => {
            const Icon = stat.icon
            return (
              <div key={stat.label} className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
                <div className={`w-10 h-10 ${stat.bg} rounded-lg flex items-center justify-center mb-4`}>
                  <Icon className={`w-5 h-5 ${stat.color}`} />
                </div>
                <p className="text-3xl font-bold text-slate-800">{stat.value}</p>
                <p className="text-sm text-slate-500 mt-1">{stat.label}</p>
              </div>
            )
          })}
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Stages */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
            <h2 className="text-lg font-bold text-slate-800 mb-4">توزيع المراحل</h2>
            <div className="space-y-3">
              {Object.entries(stageLabels).map(([key, label]) => (
                <div key={key} className="flex items-center justify-between">
                  <span className={`text-sm font-medium px-3 py-1 rounded-full ${stageColors[key]}`}>
                    {label}
                  </span>
                  <span className="text-sm font-bold text-slate-700">
                    {stageCount[key] || 0} عميل
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Leads */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
            <h2 className="text-lg font-bold text-slate-800 mb-4">آخر العملاء</h2>
            <div className="space-y-3">
              {recent.length === 0 && (
                <p className="text-slate-400 text-sm text-center py-4">لا يوجد عملاء بعد</p>
              )}
              {recent.map(lead => (
                <div key={lead.id} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-slate-800">{lead.name || lead.phone}</p>
                    <p className="text-xs text-slate-400">{lead.phone}</p>
                  </div>
                  <span className={`text-xs font-bold px-2 py-1 rounded-full ${scoreColor(lead.score)}`}>
                    {lead.score}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
