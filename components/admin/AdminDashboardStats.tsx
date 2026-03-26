'use client'

import { useState } from 'react'
import { FileText, MessageSquare, Calendar, Users, ChevronDown, ChevronUp, Eye, Download } from 'lucide-react'
import AdminFeedbackList from '@/components/admin/AdminFeedbackList'
import AdminEventManager from '@/components/admin/AdminEventManager'
import AdminHouseholdManager from '@/components/admin/AdminHouseholdManager'

type PanelKey = 'feedback' | 'registrations' | 'pdf' | 'households' | null

interface PdfDoc {
  id: string; title: string; year: number; month: number
  published_at: string; file_url: string; file_size: number | null
}

function PdfPanel({ pdfs }: { pdfs: PdfDoc[] }) {
  const byYear: Record<number, PdfDoc[]> = {}
  for (const pdf of pdfs) {
    if (!byYear[pdf.year]) byYear[pdf.year] = []
    byYear[pdf.year].push(pdf)
  }
  const years = Object.keys(byYear).map(Number).sort((a, b) => b - a)
  const [expandedYear, setExpandedYear] = useState<number | null>(years[0] ?? null)

  if (pdfs.length === 0) {
    return <p className="text-center text-gray-400 text-sm py-8">データがありません</p>
  }

  return (
    <div className="p-4 space-y-2">
      {years.map(year => (
        <div key={year}>
          <button
            onClick={() => setExpandedYear(expandedYear === year ? null : year)}
            className="w-full flex items-center justify-between px-3 py-2 bg-gray-50 rounded-lg text-sm text-gray-600 font-medium"
          >
            {year}年（{byYear[year].length}件）
            {expandedYear === year
              ? <ChevronUp className="w-4 h-4" />
              : <ChevronDown className="w-4 h-4" />}
          </button>
          {expandedYear === year && (
            <div className="mt-1 space-y-2">
              {byYear[year].map(pdf => (
                <div
                  key={pdf.id}
                  className="bg-white border border-gray-100 rounded-xl p-3 shadow-sm cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => window.open(pdf.file_url, '_blank', 'noopener,noreferrer')}
                >
                  <div className="flex items-start gap-3">
                    <div className="bg-red-100 p-2 rounded-lg flex-shrink-0">
                      <FileText className="w-5 h-5 text-red-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-800 text-sm">{pdf.title}</p>
                      <p className="text-xs text-gray-400 mt-1">
                        {pdf.year}年{pdf.month}月号
                        {pdf.file_size != null && ` · ${Math.round(pdf.file_size / 1024)}KB`}
                      </p>
                    </div>
                    <div className="flex gap-1 flex-shrink-0" onClick={e => e.stopPropagation()}>
                      <a
                        href={pdf.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 bg-primary-100 text-primary-600 rounded-lg hover:bg-primary-200 transition-colors"
                        title="閲覧"
                      >
                        <Eye className="w-4 h-4" />
                      </a>
                      <a
                        href={pdf.file_url}
                        download
                        className="p-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors"
                        title="ダウンロード"
                      >
                        <Download className="w-4 h-4" />
                      </a>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
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
