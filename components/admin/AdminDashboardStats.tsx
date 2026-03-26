'use client'

import { useState } from 'react'
import { FileText, MessageSquare, Calendar, Users, ChevronDown, ChevronUp } from 'lucide-react'
import AdminFeedbackList from '@/components/admin/AdminFeedbackList'
import AdminEventManager from '@/components/admin/AdminEventManager'
import AdminHouseholdManager from '@/components/admin/AdminHouseholdManager'

type PanelKey = 'feedback' | 'registrations' | 'pdf' | 'households' | null

interface PdfDoc {
  id: string; title: string; year: number; month: number
  published_at: string; file_url: string; file_size: number | null
}

function fmtDate(iso: string) {
  const d = new Date(iso)
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`
}

function PdfPanel({ pdfs }: { pdfs: PdfDoc[] }) {
  // 年でグループ化
  const byYear: Record<number, PdfDoc[]> = {}
  for (const pdf of pdfs) {
    if (!byYear[pdf.year]) byYear[pdf.year] = []
    byYear[pdf.year].push(pdf)
  }
  const years = Object.keys(byYear).map(Number).sort((a, b) => b - a)

  if (pdfs.length === 0) {
    return <p className="text-center text-gray-400 text-sm py-8">データがありません</p>
  }

  return (
    <div className="divide-y divide-gray-100">
      {years.map(year => (
        <div key={year}>
          <p className="px-5 py-2 text-xs font-semibold text-gray-400 bg-gray-50">{year}年</p>
          {byYear[year].map(pdf => (
            <button
              key={pdf.id}
              onClick={() => window.open(pdf.file_url, '_blank', 'noopener,noreferrer')}
              className="w-full flex items-center gap-3 px-5 py-3 text-left hover:bg-gray-50 transition-colors"
            >
              <FileText className="w-4 h-4 text-red-500 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800 truncate">{pdf.title}</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {pdf.year}年{pdf.month}月号
                  {pdf.published_at && `　${fmtDate(pdf.published_at)}`}
                  {pdf.file_size != null && `　${Math.round(pdf.file_size / 1024)}KB`}
                </p>
              </div>
            </button>
          ))}
        </div>
      ))}
    </div>
  )
}

export default function AdminDashboardStats({
  pdfs,
  allFeedbacks,
  unreadCount,
  events,
  households,
}: {
  pdfs: PdfDoc[]
  allFeedbacks: any[]
  unreadCount: number
  events: any[]
  households: any[]
}) {
  const [open, setOpen] = useState<PanelKey>(null)

  const toggle = (key: PanelKey) => setOpen(prev => prev === key ? null : key)

  const stats = [
    { key: 'feedback'      as PanelKey, label: '回答必要',  value: unreadCount,       icon: MessageSquare, accent: 'bg-rose-500'   },
    { key: 'registrations' as PanelKey, label: '申込件数',  value: events.reduce((s: number, e: any) => s + (e.event_registrations?.length ?? 0), 0), icon: Calendar, accent: 'bg-orange-500' },
    { key: 'pdf'           as PanelKey, label: '登録資料',  value: pdfs.length,        icon: FileText,      color: 'text-blue-600 bg-blue-100'  },
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
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 bg-gray-50">
            <p className="font-semibold text-gray-700 text-sm">
              登録資料
              <span className="ml-2 font-normal text-gray-400">（{pdfs.length}件）</span>
            </p>
          </div>
          <PdfPanel pdfs={pdfs} />
        </div>
      )}
      {open === 'households' && (
        <AdminHouseholdManager initialHouseholds={households} />
      )}
    </>
  )
}
