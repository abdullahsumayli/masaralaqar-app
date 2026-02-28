'use client'

import { useState } from 'react'
import type { Lead, LeadStage } from '@/lib/types'
import LeadCard from './LeadCard'

const STAGES: { key: LeadStage; label: string; color: string }[] = [
  { key: 'new', label: 'جديد', color: 'bg-slate-100 text-slate-700' },
  { key: 'contacted', label: 'تم التواصل', color: 'bg-blue-100 text-blue-700' },
  { key: 'qualified', label: 'مؤهل', color: 'bg-yellow-100 text-yellow-700' },
  { key: 'viewing', label: 'معاينة', color: 'bg-purple-100 text-purple-700' },
  { key: 'closed', label: 'مغلق', color: 'bg-emerald-100 text-emerald-700' },
]

interface KanbanBoardProps {
  initialLeads: Lead[]
}

export default function KanbanBoard({ initialLeads }: KanbanBoardProps) {
  const [leads, setLeads] = useState<Lead[]>(initialLeads)
  const [dragging, setDragging] = useState<string | null>(null)

  function getLeadsByStage(stage: LeadStage) {
    return leads.filter(l => l.stage === stage)
  }

  function handleDragStart(e: React.DragEvent, leadId: string) {
    setDragging(leadId)
    e.dataTransfer.effectAllowed = 'move'
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  async function handleDrop(e: React.DragEvent, stage: LeadStage) {
    e.preventDefault()
    if (!dragging) return

    const lead = leads.find(l => l.id === dragging)
    if (!lead || lead.stage === stage) {
      setDragging(null)
      return
    }

    setLeads(prev => prev.map(l => l.id === dragging ? { ...l, stage } : l))
    setDragging(null)

    await fetch('/api/leads', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: dragging, stage }),
    })
  }

  return (
    <div className="flex gap-4 overflow-x-auto pb-4 min-h-[calc(100vh-200px)]">
      {STAGES.map(stage => {
        const stageLeads = getLeadsByStage(stage.key)
        return (
          <div
            key={stage.key}
            className="flex-shrink-0 w-72"
            onDragOver={handleDragOver}
            onDrop={e => handleDrop(e, stage.key)}
          >
            {/* Column Header */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${stage.color}`}>
                  {stage.label}
                </span>
              </div>
              <span className="text-xs text-slate-400 font-medium bg-slate-100 px-2 py-1 rounded-full">
                {stageLeads.length}
              </span>
            </div>

            {/* Cards */}
            <div className="space-y-3 min-h-[100px]">
              {stageLeads.map(lead => (
                <div
                  key={lead.id}
                  draggable
                  onDragStart={e => handleDragStart(e, lead.id)}
                  className={`transition ${dragging === lead.id ? 'opacity-50' : ''}`}
                >
                  <LeadCard lead={lead} />
                </div>
              ))}
              {stageLeads.length === 0 && (
                <div className="border-2 border-dashed border-slate-200 rounded-xl h-24 flex items-center justify-center">
                  <p className="text-xs text-slate-400">اسحب عميلاً هنا</p>
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
