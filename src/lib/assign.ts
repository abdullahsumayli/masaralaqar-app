import { supabaseAdmin } from './supabase-server'

export async function assignLead(lead: Record<string, unknown>, officeId: string): Promise<string | null> {
  const { data: agents } = await supabaseAdmin
    .from('users')
    .select('id')
    .eq('office_id', officeId)
    .eq('role', 'agent')

  if (!agents || agents.length === 0) return null

  if (lead.budget && (lead.budget as number) > 2_000_000) return agents[0].id
  if (lead.property_type === 'rent') return agents[1]?.id || agents[0].id

  const { count } = await supabaseAdmin
    .from('leads')
    .select('*', { count: 'exact', head: true })
    .eq('office_id', officeId)

  return agents[(count || 0) % agents.length].id
}
