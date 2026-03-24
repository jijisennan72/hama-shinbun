'use client'

import { useState } from 'react'
import {
  FileText, MessageSquare, Calendar, Users,
  X, ChevronLeft, ChevronRight, CheckCircle2, RotateCcw, ExternalLink,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface PdfDoc {
  id: string; title: string; year: number; month: number
  published_at: string; file_url: string; file_size: number | null
}
interface Feedback {
  id: string; category: string; message: string
  is_resolved: boolean; created_at: string
  households: { household_number: string; name: string } | null
}
interface Registration {
  id: string; attendee_count: number; notes: string | null; created_at: string
  households: { household_number: string; name: string } | null
  events: { title: string } | null
}
interface Household {
  id: string; household_number: string; name: string; is_admin: boolean
}

type ModalKey = 'pdf' | 'feedback' | 'registrations' | 'households' | null

const PAGE_SIZE = 10

const CATEGORY_COLORS: Record<string, string> = {
  '意見': 'bg-blue-100 text-blue-700',
  '要望': 'bg-purple-100 text-purple-700',
  '質問': 'bg-green-100 text-green-700',
  '苦情': 'bg-red-100 text-red-700',
  'その他': 'bg-gray-100 text-gray-700',
}

function fmt(iso: string) {
  const d = new Date(iso)
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function parseNotes(notes: string | null) {
  try {
    if (!notes) return { adults: 1, children: 0 }
    const p = JSON.parse(notes)
    return { adults: p.adults ?? 1, children: p.children ?? 0 }
  } catch { return { adults: 1, children: 0 } }
}

function ModalWrap({ title, count, onClose, page, onPage, children }: {
  title: string; count: number; onClose: () => void
  page: number; onPage: (p: number) => void; children: React.ReactNode
}) {
  const totalPages = Math.ceil(count / PAGE_SIZE)
  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center p-4 bg-black/60 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-lg my-8"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="font-bold text-gray-900">
            {title}
            <span className="ml-2 text-sm font-normal text-gray-400">（{count}件）</span>
          </h2>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-100 text-gray-400">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="divide-y divide-gray-50 max-h-[60vh] overflow-y-auto">
          {children}
        </div>
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100 text-sm text-gray-500">
            <button
              onClick={() => onPage(page - 1)}
              disabled={page === 0}
              className="p-1 rounded hover:bg-gray-100 disabled:opacity-30"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span>{page + 1} / {totalPages}</span>
            <button
              onClick={() => onPage(page + 1)}
              disabled={page >= totalPages - 1}
              className="p-1 rounded hover:bg-gray-100 disabled:opacity-30"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default function AdminDashboardStats({
  pdfs,
  feedbacks: initialFeedbacks,
  registrations,
  households,
}: {
  pdfs: PdfDoc[]
  feedbacks: Feedback[]
  registrations: Registration[]
  households: Household[]
}) {
  const [modal, setModal] = useState<ModalKey>(null)
  const [pages, setPages] = useState({ pdf: 0, feedback: 0, registrations: 0, households: 0 })
  const [feedbacks, setFeedbacks] = useState(initialFeedbacks)
  const supabase = createClient()

  const setPage = (key: keyof typeof pages, p: number) =>
    setPages(prev => ({ ...prev, [key]: p }))

  const close = () => setModal(null)

  const toggleResolved = async (id: string, current: boolean) => {
    const resolvedAt = current ? null : new Date().toISOString()
    setFeedbacks(prev => prev.map(f => f.id === id ? { ...f, is_resolved: !current } : f))
    await supabase.from('feedbacks').update({ is_resolved: !current, resolved_at: resolvedAt }).eq('id', id)
  }

  const stats = [
    { key: 'pdf'           as ModalKey, label: 'PDF数',   value: pdfs.length,          icon: FileText,     color: 'text-blue-600 bg-blue-100'   },
    { key: 'feedback'      as ModalKey, label: '未読意見', value: feedbacks.length,      icon: MessageSquare, color: 'text-pink-600 bg-pink-100'   },
    { key: 'registrations' as ModalKey, label: '申込件数', value: registrations.length, icon: Calendar,     color: 'text-purple-600 bg-purple-100' },
    { key: 'households'    as ModalKey, label: '利用者数', value: households.length,    icon: Users,        color: 'text-green-600 bg-green-100'  },
  ]

  return (
    <>
      {/* サマリーカード */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map(s => (
          <button
            key={s.label}
            onClick={() => setModal(s.key)}
            className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 text-left hover:shadow-md transition-shadow active:scale-95"
          >
            <div className={`inline-flex p-2 rounded-lg ${s.color} mb-2`}>
              <s.icon className="w-5 h-5" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{s.value}</p>
            <p className="text-sm text-gray-500">{s.label}</p>
          </button>
        ))}
      </div>

      {/* PDF一覧モーダル */}
      {modal === 'pdf' && (() => {
        const page = pages.pdf
        const slice = pdfs.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)
        return (
          <ModalWrap title="PDF一覧" count={pdfs.length} onClose={close} page={page} onPage={p => setPage('pdf', p)}>
            {slice.length === 0 ? (
              <p className="text-center text-gray-400 text-sm py-8">登録済みのPDFはありません</p>
            ) : slice.map(pdf => (
              <button
                key={pdf.id}
                onClick={() => window.open(pdf.file_url, '_blank', 'noopener,noreferrer')}
                className="w-full flex items-start gap-3 px-5 py-3 text-left hover:bg-gray-50 transition-colors"
              >
                <FileText className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800 truncate">{pdf.title}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {pdf.year}年{pdf.month}月号
                    {pdf.published_at && `　発行：${fmt(pdf.published_at).slice(0, 10)}`}
                    {pdf.file_size != null && `　${Math.round(pdf.file_size / 1024)}KB`}
                  </p>
                </div>
                <ExternalLink className="w-3.5 h-3.5 text-gray-300 flex-shrink-0 mt-1" />
              </button>
            ))}
          </ModalWrap>
        )
      })()}

      {/* 未読意見モーダル */}
      {modal === 'feedback' && (() => {
        const page = pages.feedback
        const slice = feedbacks.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)
        return (
          <ModalWrap title="未読意見・要望" count={feedbacks.length} onClose={close} page={page} onPage={p => setPage('feedback', p)}>
            {slice.length === 0 ? (
              <p className="text-center text-gray-400 text-sm py-8">未読の意見・要望はありません</p>
            ) : slice.map(f => (
              <div key={f.id} className={`px-5 py-3 ${f.is_resolved ? 'opacity-60' : ''}`}>
                <div className="flex items-start gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${CATEGORY_COLORS[f.category] ?? CATEGORY_COLORS['その他']}`}>
                        {f.category}
                      </span>
                      {f.households && (
                        <span className="text-xs text-gray-400">{f.households.household_number}番 {f.households.name}</span>
                      )}
                      <span className="text-xs text-gray-400">{fmt(f.created_at)}</span>
                    </div>
                    <p className="text-sm text-gray-800">{f.message}</p>
                  </div>
                  <button
                    onClick={() => toggleResolved(f.id, f.is_resolved)}
                    className={`flex-shrink-0 flex items-center gap-1 text-xs px-2 py-1 rounded transition-colors ${
                      f.is_resolved
                        ? 'bg-green-50 text-green-600 hover:bg-green-100'
                        : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                    }`}
                  >
                    {f.is_resolved
                      ? <><RotateCcw className="w-3 h-3" />取消</>
                      : <><CheckCircle2 className="w-3 h-3" />対応済み</>}
                  </button>
                </div>
              </div>
            ))}
          </ModalWrap>
        )
      })()}

      {/* 申込件数モーダル */}
      {modal === 'registrations' && (() => {
        const page = pages.registrations
        const slice = registrations.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)
        return (
          <ModalWrap title="イベント申込一覧" count={registrations.length} onClose={close} page={page} onPage={p => setPage('registrations', p)}>
            {slice.length === 0 ? (
              <p className="text-center text-gray-400 text-sm py-8">申込がありません</p>
            ) : slice.map(r => {
              const { adults, children } = parseNotes(r.notes)
              return (
                <div key={r.id} className="px-5 py-3">
                  <p className="text-sm font-semibold text-gray-800 truncate">{r.events?.title ?? '（不明）'}</p>
                  <div className="flex items-center gap-3 mt-1 text-xs text-gray-500 flex-wrap">
                    {r.households && (
                      <span>{r.households.household_number}番 {r.households.name}</span>
                    )}
                    <span>大人{adults}名{children > 0 ? `・子供${children}名` : ''}</span>
                    <span className="ml-auto">{fmt(r.created_at)}</span>
                  </div>
                </div>
              )
            })}
          </ModalWrap>
        )
      })()}

      {/* 利用者一覧モーダル */}
      {modal === 'households' && (() => {
        const page = pages.households
        const slice = households.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)
        return (
          <ModalWrap title="利用者一覧" count={households.length} onClose={close} page={page} onPage={p => setPage('households', p)}>
            {slice.length === 0 ? (
              <p className="text-center text-gray-400 text-sm py-8">利用者がいません</p>
            ) : slice.map(h => (
              <div key={h.id} className="flex items-center gap-3 px-5 py-3">
                <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-sm font-bold text-gray-600 flex-shrink-0">
                  {h.household_number}
                </div>
                <p className="flex-1 text-sm font-semibold text-gray-800">
                  {h.household_number}番　{h.name}
                </p>
                {h.is_admin && (
                  <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-medium flex-shrink-0">
                    管理者
                  </span>
                )}
              </div>
            ))}
          </ModalWrap>
        )
      })()}
    </>
  )
}
