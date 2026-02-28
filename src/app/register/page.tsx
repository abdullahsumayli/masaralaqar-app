'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'

export default function RegisterPage() {
  const router = useRouter()
  const [form, setForm] = useState({
    name: '',
    officeName: '',
    email: '',
    password: '',
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    if (form.password.length < 8) {
      setError('كلمة المرور يجب أن تكون 8 أحرف على الأقل')
      setLoading(false)
      return
    }

    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })

    const data = await res.json()

    if (!res.ok) {
      setError(data.error || 'حدث خطأ، حاول مرة أخرى')
      setLoading(false)
      return
    }

    // تسجيل الدخول تلقائياً
    const supabase = createClient()
    await supabase.auth.signInWithPassword({ email: form.email, password: form.password })

    router.push('/dashboard')
    router.refresh()
  }

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white">مسار العقار</h1>
          <p className="text-slate-400 mt-2">ابدأ تجربتك المجانية الآن</p>
        </div>

        <div className="bg-white rounded-2xl p-8 shadow-xl">
          <h2 className="text-xl font-bold text-slate-800 mb-6">إنشاء حساب جديد</h2>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                اسمك الكامل
              </label>
              <input
                name="name"
                type="text"
                value={form.name}
                onChange={handleChange}
                required
                className="w-full border border-slate-300 rounded-lg px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="محمد العمري"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                اسم المكتب العقاري
              </label>
              <input
                name="officeName"
                type="text"
                value={form.officeName}
                onChange={handleChange}
                required
                className="w-full border border-slate-300 rounded-lg px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="مكتب النخبة للعقارات"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                البريد الإلكتروني
              </label>
              <input
                name="email"
                type="email"
                value={form.email}
                onChange={handleChange}
                required
                className="w-full border border-slate-300 rounded-lg px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="example@office.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                كلمة المرور
              </label>
              <input
                name="password"
                type="password"
                value={form.password}
                onChange={handleChange}
                required
                className="w-full border border-slate-300 rounded-lg px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="8 أحرف على الأقل"
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'جارٍ إنشاء الحساب...' : 'ابدأ التجربة المجانية'}
            </button>
          </form>

          <p className="text-center text-sm text-slate-500 mt-6">
            لديك حساب؟{' '}
            <Link href="/login" className="text-indigo-600 hover:text-indigo-700 font-medium">
              سجّل دخولك
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
