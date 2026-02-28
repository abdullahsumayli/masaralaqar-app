import type { Lead } from '@/lib/types'
import Link from 'next/link'
import { Phone, MapPin, Home } from 'lucide-react'

const propertyLabels: Record<string, string> = {
  villa: 'فيلا',
  apartment: 'شقة',
  land: 'أرض',
  commercial: 'تجاري',
  rent: 'إيجار',
}

function scoreColor(score: number) {
  if (score >= 70) return 'bg-emerald-100 text-emerald-700'
  if (score >= 40) return 'bg-yellow-100 text-yellow-700'
  return 'bg-slate-100 text-slate-600'
}

interface LeadCardProps {
  lead: Lead
}

export default function LeadCard({ lead }: LeadCardProps) {
  return (
    <Link href={`/leads/${lead.id}`}>
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm hover:shadow-md hover:border-indigo-300 transition cursor-pointer">
        <div className="flex items-start justify-between mb-3">
          <div>
            <p className="font-semibold text-slate-800 text-sm">
              {lead.name || 'غير محدد'}
            </p>
            <div className="flex items-center gap-1 mt-1">
              <Phone className="w-3 h-3 text-slate-400" />
              <p className="text-xs text-slate-500" dir="ltr">{lead.phone}</p>
            </div>
          </div>
          <span className={`text-xs font-bold px-2 py-1 rounded-full ${scoreColor(lead.score)}`}>
            {lead.score}
          </span>
        </div>

        <div className="space-y-1">
          {lead.property_type && (
            <div className="flex items-center gap-2">
              <Home className="w-3 h-3 text-slate-400" />
              <span className="text-xs text-slate-600">
                {propertyLabels[lead.property_type] || lead.property_type}
              </span>
            </div>
          )}
          {lead.location && (
            <div className="flex items-center gap-2">
              <MapPin className="w-3 h-3 text-slate-400" />
              <span className="text-xs text-slate-600">{lead.location}</span>
            </div>
          )}
          {lead.budget && (
            <p className="text-xs text-indigo-600 font-medium mt-1">
              {lead.budget.toLocaleString('ar-SA')} ريال
            </p>
          )}
        </div>
      </div>
    </Link>
  )
}
