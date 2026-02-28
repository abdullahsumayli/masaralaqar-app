import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'مسار العقار — نظام إدارة العملاء',
  description: 'نظام CRM ذكي للمكاتب العقارية السعودية',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ar" dir="rtl">
      <body>{children}</body>
    </html>
  )
}
