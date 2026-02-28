'use client'

import { useState } from 'react'
import type { Lead, Message } from '@/lib/types'
import { Phone, MapPin, Home, DollarSign, Star, Calendar } from 'lucide-react'

const stageLabels: Record<string, string> = {
  new: 'جديد',
  contacted: 'تم التواصل',
  qualified: 'مؤهل',
  viewing: 'معاينة',
  closed: 'مغلق',
}

const propertyLabels: Record<string, string> = {
  villa: 'فيلا',
  apartment: 'شقة',
  land: 'أرض',
  commercial: 'تجاري',
  rent: 'إيجار',
}

function scoreColor(score: number) {
  if (score >= 70) return 'text-emerald-600 bg-emerald-50'
  if (score >= 40) return 'text-yellow-600 bg-yellow-50'
  return 'text-slate-600 bg-slate-50'
}

interface LeadDetailProps {
  lead: Lead
  messages: Message[]
}

export default function LeadDetail({ lead, messages }: LeadDetailProps) {
  const [stage, setStage] = useState(lead.stage)
  const [noteText, setNoteText] = useState('')
  const [saving, setSaving] = useState(false)
  const [localMessages, setLocalMessages] = useState<Message[]>(messages)

  async function handleStageChange(newStage: string) {
    setStage(newStage as Lead['stage'])
    await fetch('/api/leads', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: lead.id, stage: newStage }),
    })
  }

  async function handleAddNote() {
    if (!noteText.trim()) return
    setSaving(true)

    const res = await fetch('/api/leads', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: lead.id, notes: noteText }),
    })

    if (res.ok) {
      const fakeMessage: Message = {
        id: crypto.randomUUID(),
        lead_id: lead.id,
        direction: 'outgoing',
        content: `📝 ملاحظة: ${noteText}`,
        created_at: new Date().toISOString(),
      }
      setLocalMessages(prev => [...prev, fakeMessage])
      setNoteText('')
    }

    setSaving(false)
  }

  return (
    <div className="grid lg:grid-cols-2 gap-6">
      {/* Left: Lead Info */}
      <div className="space-y-4">
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
          <h2 className="text-lg font-bold text-slate-800 mb-5">معلومات العميل</h2>

          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center">
                <Phone className="w-4 h-4 text-slate-500" />
              </div>
              <div>
                <p className="text-xs text-slate-400">رقم الجوال</p>
                <p className="text-sm font-medium text-slate-800" dir="ltr">{lead.phone}</p>
              </div>
            </div>

            {lead.budget && (
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center">
                  <DollarSign className="w-4 h-4 text-slate-500" />
                </div>
                <div>
                  <p className="text-xs text-slate-400">الميزانية</p>
                  <p className="text-sm font-medium text-slate-800">
                    {lead.budget.toLocaleString('ar-SA')} ريال
                  </p>
                </div>
              </div>
            )}

            {lead.property_type && (
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center">
                  <Home className="w-4 h-4 text-slate-500" />
                </div>
                <div>
                  <p className="text-xs text-slate-400">نوع العقار</p>
                  <p className="text-sm font-medium text-slate-800">
                    {propertyLabels[lead.property_type] || lead.property_type}
                  </p>
                </div>
              </div>
            )}

            {lead.location && (
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center">
                  <MapPin className="w-4 h-4 text-slate-500" />
                </div>
                <div>
                  <p className="text-xs text-slate-400">الموقع</p>
                  <p className="text-sm font-medium text-slate-800">{lead.location}</p>
                </div>
              </div>
            )}

            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center">
                <Star className="w-4 h-4 text-slate-500" />
              </div>
              <div>
                <p className="text-xs text-slate-400">درجة الاهتمام</p>
                <span className={`text-sm font-bold px-3 py-1 rounded-full ${scoreColor(lead.score)}`}>
                  {lead.score} / 100
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center">
                <Calendar className="w-4 h-4 text-slate-500" />
              </div>
              <div>
                <p className="text-xs text-slate-400">تاريخ الإضافة</p>
                <p className="text-sm font-medium text-slate-800">
                  {new Date(lead.created_at).toLocaleDateString('ar-SA')}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Stage Selector */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
          <h3 className="text-sm font-bold text-slate-700 mb-3">المرحلة الحالية</h3>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {Object.entries(stageLabels).map(([key, label]) => (
              <button
                key={key}
                onClick={() => handleStageChange(key)}
                className={`py-2 px-3 rounded-lg text-sm font-medium transition ${
                  stage === key
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Right: Messages */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col" style={{ height: '600px' }}>
        <div className="p-5 border-b border-slate-100">
          <h2 className="text-lg font-bold text-slate-800">سجل المحادثات</h2>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          {localMessages.length === 0 && (
            <p className="text-center text-slate-400 text-sm mt-8">لا توجد رسائل بعد</p>
          )}
          {localMessages.map(msg => (
            <div
              key={msg.id}
              className={`flex ${msg.direction === 'outgoing' ? 'justify-start' : 'justify-end'}`}
            >
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${
                  msg.direction === 'incoming'
                    ? 'bg-indigo-600 text-white rounded-tr-sm'
                    : 'bg-slate-100 text-slate-700 rounded-tl-sm'
                }`}
              >
                <p>{msg.content}</p>
                <p className={`text-xs mt-1 ${msg.direction === 'incoming' ? 'text-indigo-200' : 'text-slate-400'}`}>
                  {new Date(msg.created_at).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Add Note */}
        <div className="p-4 border-t border-slate-100">
          <div className="flex gap-2">
            <textarea
              value={noteText}
              onChange={e => setNoteText(e.target.value)}
              placeholder="أضف ملاحظة..."
              rows={2}
              className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <button
              onClick={handleAddNote}
              disabled={saving || !noteText.trim()}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 rounded-lg text-sm font-medium transition disabled:opacity-50"
            >
              {saving ? '...' : 'إرسال'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
