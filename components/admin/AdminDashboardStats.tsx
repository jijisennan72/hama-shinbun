'use client'

import { useState } from 'react'
import { MessageSquare, Calendar, FileText, Users, ChevronDown, ChevronUp } from 'lucide-react'
import AdminFeedbackList from '@/components/admin/AdminFeedbackList'
import AdminEventManager from '@/components/admin/AdminEventManager'
import AdminHouseholdManager from '@/components/admin/AdminHouseholdManager'
import PdfList from '@/components/PdfList'

type PanelKey = 'feedback' | 'registrations' | 'pdf' | 'households' | null

export default function AdminDashboardStats({
  pdfs,
  allFeedbacks,
  unreadCount,
  events,
  households,
  pdfEvents,
  circulations,
}: {
  pdfs: any[]
  allFeedbacks: any[]
  unreadCount: number
  events: any[]
  households: any[]
  pdfEvents: any[]
  circulations: any[]
}) {
  const [open, setOpen] = useState<PanelKey>(null)

  const toggle = (key: PanelKey) => setOpen(prev => prev === key ? null : key)

  const stats = [
    { key: 'feedback'      as PanelKey, label: '回答必要',  value: unreadCount,       icon: MessageSquare, accent: 'bg-rose-500'   },
    { key: 'registrations' as PanelKey, label: '申込件数',  value: events.reduce((s: number, e: any) => s + (e.event_registrations?.length ?? 0), 0), icon: Calendar, accent: 'bg-orange-500' },
    { key: 'pdf'           as PanelKey, label: '登録資料',  value: pdfs.length + pdfEvents.length + circulations.length, icon: FileText, color: 'text-blue-600 bg-blue-100' },
    { key: 'households'    as PanelKey, label: '登録人数',  value: households.length,  icon: Users,         color: 'text-green-600 bg-green-100' },
  ]

  return (
    <>
      {/* サマリーカード */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map(s => {
          const isOpen = open === s.key
          const isAccent = 'accent' in s
          return isAccent ? (
            <button
              key={s.key}
              onClick={() => toggle(s.key)}
              className={`${s.accent} rounded-xl shadow-sm p-4 text-left transition-all active:scale-95 ${
                isOpen ? 'shadow-lg ring-2 ring-white/40' : 'hover:shadow-lg'
              }`}
            >
              <div className="inline-flex p-2 rounded-lg bg-white/20 text-white mb-2">
                <s.icon className="w-5 h-5" />
              </div>
              <p className="text-2xl font-bold text-white">{s.value}</p>
              <div className="flex items-center justify-between mt-0.5">
                <p className="text-sm text-white/80">{s.label}</p>
                {isOpen
                  ? <ChevronUp className="w-3.5 h-3.5 text-white/60" />
                  : <ChevronDown className="w-3.5 h-3.5 text-white/40" />}
              </div>
            </button>
          ) : (
            <button
              key={s.key}
              onClick={() => toggle(s.key)}
              className={`bg-white rounded-xl shadow-sm border p-4 text-left transition-shadow active:scale-95 ${
                isOpen ? 'border-gray-300 shadow-md' : 'border-gray-100 hover:shadow-md'
              }`}
            >
              <div className={`inline-flex p-2 rounded-lg ${'color' in s ? s.color : ''} mb-2`}>
                <s.icon className="w-5 h-5" />
              </div>
              <p className="text-2xl font-bold text-gray-900">{s.value}</p>
              <div className="flex items-center justify-between mt-0.5">
                <p className="text-sm text-gray-500">{s.label}</p>
                {isOpen
                  ? <ChevronUp className="w-3.5 h-3.5 text-gray-400" />
                  : <ChevronDown className="w-3.5 h-3.5 text-gray-300" />}
              </div>
            </button>
          )
        })}
      </div>

      {/* 展開パネル */}
      {open === 'feedback' && (
        <AdminFeedbackList initialFeedbacks={allFeedbacks} />
      )}
      {open === 'registrations' && (
        <AdminEventManager initialEvents={events} />
      )}
      {open === 'pdf' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <PdfList pdfs={pdfs} events={pdfEvents} circulations={circulations} />
        </div>
      )}
      {open === 'households' && (
        <AdminHouseholdManager initialHouseholds={households} />
      )}
    </>
  )
}
