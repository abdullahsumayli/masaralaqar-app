'use client'

import { useState } from 'react'

interface SettingsFormProps {
  user: { name: string | null; email: string | null; office_id: string }
  office: {
    id: string
    name: string
    plan: string
    whatsapp_phone_id: string | null
    whatsapp_token: string | null
  } | null
}

export default function SettingsForm({ user, office }: SettingsFormProps) {
  const [officeName, setOfficeName] = useState(office?.name || '')
  const [phoneId, setPhoneId] = useState(office?.whatsapp_phone_id || '')
  const [token, setToken] = useState(office?.whatsapp_token || '')
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setSaved(false)

    await fetch('/api/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ officeName, whatsapp_phone_id: phoneId, whatsapp_token: token }),
    })

    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  return (
    <div className="space-y-6">
      {/* Plan Badge */}
      <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-indigo-800">خطة الاشتراك</p>
          <p className="text-xs text-indigo-600 mt-0.5">
            {office?.plan === 'trial' ? 'تجريبية مجانية' : office?.plan}
          </p>
        </div>
        <span className="bg-indigo-600 text-white text-xs font-bold px-3 py-1 rounded-full uppercase">
          {office?.plan || 'trial'}
        </span>
      </div>

      {/* Webhook URL */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
        <h2 className="text-base font-bold text-slate-800 mb-4">رابط الـ Webhook</h2>
        <p className="text-xs text-slate-500 mb-2">استخدم هذا الرابط في إعدادات WhatsApp Business API</p>
        <div className="bg-slate-50 rounded-lg px-4 py-3 font-mono text-sm text-slate-700 border border-slate-200" dir="ltr">
          {typeof window !== 'undefined' ? window.location.origin : 'https://app.masaralaqar.com'}/api/webhook/whatsapp
        </div>
      </div>

      {/* Settings Form */}
      <form onSubmit={handleSave} className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-5">
        <h2 className="text-base font-bold text-slate-800">إعدادات المكتب</h2>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">اسم المكتب</label>
          <input
            type="text"
            value={officeName}
            onChange={e => setOfficeName(e.target.value)}
            className="w-full border border-slate-300 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            WhatsApp Phone Number ID
          </label>
          <input
            type="text"
            value={phoneId}
            onChange={e => setPhoneId(e.target.value)}
            placeholder="من Meta Business Manager"
            className="w-full border border-slate-300 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            dir="ltr"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            WhatsApp Access Token
          </label>
          <input
            type="password"
            value={token}
            onChange={e => setToken(e.target.value)}
            placeholder="EAAxxxxx..."
            className="w-full border border-slate-300 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            dir="ltr"
          />
        </div>

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={saving}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-6 py-2.5 rounded-lg text-sm transition disabled:opacity-50"
          >
            {saving ? 'جارٍ الحفظ...' : 'حفظ الإعدادات'}
          </button>
          {saved && (
            <span className="text-sm text-emerald-600 font-medium">✓ تم الحفظ بنجاح</span>
          )}
        </div>
      </form>

      {/* User Info */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
        <h2 className="text-base font-bold text-slate-800 mb-4">معلومات الحساب</h2>
        <div className="space-y-2 text-sm text-slate-600">
          <p><span className="font-medium text-slate-700">الاسم:</span> {user.name || '—'}</p>
          <p><span className="font-medium text-slate-700">البريد:</span> {user.email || '—'}</p>
        </div>
      </div>
    </div>
  )
}
