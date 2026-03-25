'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  MessageSquare,
  QrCode,
  Wifi,
  WifiOff,
  RefreshCw,
  Trash2,
  Loader2,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react'

interface Session {
  id: string
  instance_id: string
  session_status: string
  phone_number: string
  last_connected_at: string | null
  webhook_url: string | null
}

// TODO: استبدل هذا بجلب officeId من الجلسة الحقيقية
function useOfficeId() {
  const [officeId, setOfficeId] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => r.json())
      .then((d) => setOfficeId(d.officeId || d.office_id || null))
      .catch(() => setOfficeId(null))
  }, [])

  return officeId
}

export default function WhatsAppPage() {
  const officeId = useOfficeId()
  const [session, setSession] = useState<Session | null>(null)
  const [status, setStatus] = useState<string>('loading')
  const [qrCode, setQrCode] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchStatus = useCallback(async () => {
    if (!officeId) return

    try {
      const res = await fetch(`/api/whatsapp/instance?officeId=${officeId}`)
      const data = await res.json()

      setStatus(data.status || 'not_created')
      setSession(data.session || null)
      setError(null)
    } catch {
      setError('فشل الاتصال بالسيرفر')
    }
  }, [officeId])

  // فحص الحالة كل 5 ثوان عند الانتظار
  useEffect(() => {
    fetchStatus()

    const interval = setInterval(() => {
      if (status === 'pending' || qrCode) {
        fetchStatus()
      }
    }, 5000)

    return () => clearInterval(interval)
  }, [fetchStatus, status, qrCode])

  // إذا تم الاتصال، أزل QR
  useEffect(() => {
    if (status === 'connected') {
      setQrCode(null)
    }
  }, [status])

  async function handleCreateInstance() {
    if (!officeId) return
    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/whatsapp/instance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ officeId }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'فشل إنشاء الاتصال')
        return
      }

      // بعد الإنشاء، اجلب QR
      await fetchQR()
      await fetchStatus()
    } catch {
      setError('خطأ في الشبكة')
    } finally {
      setLoading(false)
    }
  }

  async function fetchQR() {
    if (!officeId) return
    setLoading(true)

    try {
      const res = await fetch(`/api/whatsapp/qr?officeId=${officeId}`)
      const data = await res.json()

      if (data.status === 'already_connected') {
        setStatus('connected')
        setQrCode(null)
        return
      }

      if (data.qr) {
        setQrCode(data.qr)
      } else {
        setError('لم يتم توليد رمز QR. حاول مرة أخرى.')
      }
    } catch {
      setError('فشل جلب رمز QR')
    } finally {
      setLoading(false)
    }
  }

  async function handleDisconnect() {
    if (!officeId) return
    if (!confirm('هل أنت متأكد من فصل الواتساب؟')) return

    setLoading(true)
    try {
      await fetch(`/api/whatsapp/instance?officeId=${officeId}`, {
        method: 'DELETE',
      })
      setSession(null)
      setStatus('not_created')
      setQrCode(null)
    } catch {
      setError('فشل فصل الاتصال')
    } finally {
      setLoading(false)
    }
  }

  if (!officeId) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    )
  }

  return (
    <div className="p-8 max-w-2xl mx-auto" dir="rtl">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
          <MessageSquare className="w-5 h-5 text-green-600" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-900">ربط واتساب</h1>
          <p className="text-sm text-slate-500">اربط رقم واتساب المكتب مع صقر</p>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* حالة الاتصال */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm font-medium text-slate-700">حالة الاتصال</span>
          <button
            onClick={fetchStatus}
            className="p-2 hover:bg-slate-100 rounded-lg transition"
            title="تحديث"
          >
            <RefreshCw className="w-4 h-4 text-slate-400" />
          </button>
        </div>

        <div className="flex items-center gap-3">
          {status === 'connected' ? (
            <>
              <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
              <span className="text-green-700 font-medium">متصل</span>
              <Wifi className="w-4 h-4 text-green-500 mr-auto" />
            </>
          ) : status === 'pending' ? (
            <>
              <div className="w-3 h-3 bg-yellow-500 rounded-full animate-pulse" />
              <span className="text-yellow-700 font-medium">في انتظار المسح</span>
              <QrCode className="w-4 h-4 text-yellow-500 mr-auto" />
            </>
          ) : status === 'disconnected' ? (
            <>
              <div className="w-3 h-3 bg-red-500 rounded-full" />
              <span className="text-red-700 font-medium">مفصول</span>
              <WifiOff className="w-4 h-4 text-red-500 mr-auto" />
            </>
          ) : status === 'not_created' ? (
            <>
              <div className="w-3 h-3 bg-slate-300 rounded-full" />
              <span className="text-slate-500 font-medium">غير مربوط</span>
            </>
          ) : (
            <>
              <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
              <span className="text-slate-500">جاري الفحص...</span>
            </>
          )}
        </div>

        {session?.last_connected_at && (
          <p className="text-xs text-slate-400 mt-3">
            آخر اتصال: {new Date(session.last_connected_at).toLocaleString('ar-SA')}
          </p>
        )}
      </div>

      {/* QR Code */}
      {qrCode && status !== 'connected' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 mb-6 text-center">
          <h3 className="text-sm font-medium text-slate-700 mb-4">
            امسح رمز QR من تطبيق واتساب
          </h3>
          <div className="inline-block p-4 bg-white rounded-xl border">
            <img
              src={qrCode.startsWith('data:') ? qrCode : `data:image/png;base64,${qrCode}`}
              alt="QR Code"
              className="w-64 h-64"
            />
          </div>
          <p className="text-xs text-slate-400 mt-4">
            افتح واتساب {'>'} الأجهزة المرتبطة {'>'} ربط جهاز
          </p>
        </div>
      )}

      {/* أزرار التحكم */}
      <div className="flex gap-3">
        {(status === 'not_created' || status === 'disconnected') && !qrCode && (
          <button
            onClick={handleCreateInstance}
            disabled={loading}
            className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-medium transition disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <CheckCircle2 className="w-5 h-5" />
            )}
            ربط واتساب
          </button>
        )}

        {status === 'pending' && !qrCode && (
          <button
            onClick={fetchQR}
            disabled={loading}
            className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium transition disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <QrCode className="w-5 h-5" />
            )}
            عرض رمز QR
          </button>
        )}

        {(status === 'connected' || status === 'pending' || status === 'disconnected') && session && (
          <button
            onClick={handleDisconnect}
            disabled={loading}
            className="flex items-center justify-center gap-2 px-6 py-3 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl font-medium transition border border-red-200 disabled:opacity-50"
          >
            <Trash2 className="w-4 h-4" />
            فصل
          </button>
        )}
      </div>

      {/* معلومات تقنية */}
      {session && (
        <div className="mt-8 p-4 bg-slate-50 rounded-xl border border-slate-200">
          <h4 className="text-xs font-medium text-slate-500 mb-2">معلومات تقنية</h4>
          <div className="space-y-1 text-xs text-slate-400 font-mono">
            <p>Instance: {session.instance_id}</p>
            <p>Webhook: {session.webhook_url || 'غير مُعد'}</p>
            <p>Phone: {session.phone_number || 'غير مربوط'}</p>
          </div>
        </div>
      )}
    </div>
  )
}
