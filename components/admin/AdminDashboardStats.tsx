'use client'

import { useState } from 'react'
import { MessageSquare, Calendar, FileText, Users, ChevronDown, ChevronUp, BookOpen, FolderOpen } from 'lucide-react'
import AdminFeedbackList from '@/components/admin/AdminFeedbackList'
import AdminEventManager from '@/components/admin/AdminEventManager'
import AdminHouseholdManager from '@/components/admin/AdminHouseholdManager'
import AdminLocalContentManager from '@/components/admin/AdminLocalContentManager'
import AdminOthersManager from '@/components/admin/AdminOthersManager'
import PdfList from '@/components/PdfList'

type PanelKey = 'feedback' | 'registrations' | 'pdf' | 'households' | 'history' | 'others' | null

export default function AdminDashboardStats({
  pdfs,
  allFeedbacks,
  unreadCount,
  events,
  households,
  pdfEvents,
  circulations,
  historyItems,
  othersItems,
}: {
  pdfs: any[]
  allFeedbacks: any[]
  unreadCount: number
  events: any[]
  households: any[]
  pdfEvents: any[]
  circulations: any[]
  historyItems: any[]
  othersItems: any[]
}) {
  const [open, setOpen] = useState<PanelKey>(null)

  const toggle = (key: PanelKey) => setOpen(prev => prev === key ? null : key)

  const stats = [
    { key: 'feedback'      as PanelKey, label: '回答必要',       value: unreadCount,       icon: MessageSquare },
    { key: 'registrations' as PanelKey, label: 'イベント登録＆申込', value: events.reduce((s: number, e: any) => s + (e.event_registrations?.length ?? 0), 0), icon: Calendar },
    { key: 'pdf'           as PanelKey, label: '登録資料',        value: pdfs.length + pdfEvents.length + circulations.length, icon: FileText },
    { key: 'households'    as PanelKey, label: '登録人数',        value: households.length, icon: Users },
    { key: 'history'       as PanelKey, label: '浜区の歴史',      value: historyItems.length, icon: BookOpen },
    { key: 'others'        as PanelKey, label: 'その他',          value: othersItems.filter((i: any) => !i.parent_id).length, icon: FolderOpen },
  ]

  return (
    <>
      {/* サマリーカード */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {stats.map(s => {
          const isOpen = open === s.key
          return (
            <button
              key={s.key}
              onClick={() => toggle(s.key)}
              className={`rounded-xl shadow-sm p-4 text-left transition-all active:scale-95 ${
                isOpen
                  ? 'bg-blue-600 shadow-lg ring-2 ring-blue-400/40'
                  : 'bg-gray-800 dark:bg-gray-900 hover:bg-gray-700 dark:hover:bg-gray-800 hover:shadow-md'
              }`}
            >
              <div className={`inline-flex p-2 rounded-lg mb-2 ${isOpen ? 'bg-white/20' : 'bg-white/10'}`}>
                <s.icon className="w-5 h-5 text-white" />
              </div>
              <p className="text-2xl font-bold text-white">{s.value}</p>
              <div className="flex items-center justify-between mt-0.5">
                <p className={`text-sm ${isOpen ? 'text-white/90' : 'text-white/60'}`}>{s.label}</p>
                {isOpen
                  ? <ChevronUp className="w-3.5 h-3.5 text-white/70" />
                  : <ChevronDown className="w-3.5 h-3.5 text-white/40" />}
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
          <PdfList pdfs={pdfs} events={pdfEvents} circulations={circulations} paginate />
        </div>
      )}
      {open === 'households' && (
        <AdminHouseholdManager initialHouseholds={households} />
      )}
      {open === 'history' && (
        <AdminLocalContentManager initialItems={historyItems} category="history" label="浜区の歴史" />
      )}
      {open === 'others' && (
        <AdminOthersManager initialItems={othersItems} />
      )}
    </>
  )
}
