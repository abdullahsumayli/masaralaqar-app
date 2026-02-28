export type LeadStage = 'new' | 'contacted' | 'qualified' | 'viewing' | 'closed'

export interface Lead {
  id: string
  office_id: string
  name: string | null
  phone: string
  source: string
  budget: number | null
  property_type: string | null
  location: string | null
  stage: LeadStage
  score: number
  assigned_to: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface Message {
  id: string
  lead_id: string
  direction: 'incoming' | 'outgoing'
  content: string
  created_at: string
}

export interface Activity {
  id: string
  lead_id: string
  type: 'call' | 'meeting' | 'note' | 'whatsapp'
  description: string
  created_by: string
  created_at: string
}

export interface Office {
  id: string
  name: string
  plan: string
  whatsapp_token: string | null
  whatsapp_phone_id: string | null
  ai_prompt: string | null
  created_at: string
}

export interface User {
  id: string
  office_id: string
  name: string | null
  email: string | null
  role: 'admin' | 'agent'
  created_at: string
}
