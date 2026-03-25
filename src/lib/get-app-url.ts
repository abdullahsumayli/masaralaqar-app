/**
 * يرجع URL التطبيق الصحيح بناءً على المتغيرات المتاحة
 * الأولوية:
 * 1. NEXT_PUBLIC_APP_URL (إذا ضبطته يدوياً)
 * 2. VERCEL_PROJECT_PRODUCTION_URL (الدومين الرئيسي على Vercel)
 * 3. VERCEL_URL (URL الـ deployment الحالي)
 * 4. localhost للتطوير المحلي
 */
export function getAppUrl(): string {
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL
  }

  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  }

  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`
  }

  return 'http://localhost:3000'
}
