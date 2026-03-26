'use client'

import { useState } from 'react'
import { FileText, Download, Eye, ChevronDown, ChevronUp, Calendar, ClipboardList, ChevronLeft, ChevronRight } from 'lucide-react'

const PAGE_SIZE = 10

function Pagination({ page, total, onPage }: { page: number; total: number; onPage: (p: number) => void }) {
  const totalPages = Math.ceil(total / PAGE_SIZE)
  if (totalPages <= 1) return null
  return (
    <div className="flex items-center justify-between px-1 py-2 mt-2 border-t border-gray-100 text-sm text-gray-500">
      <button onClick={() => onPage(page - 1)} disabled={page === 0}
        className="flex items-center gap-1 px-3 py-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
        <ChevronLeft className="w-4 h-4" />前へ
      </button>
      <span className="text-xs">{page + 1} / {totalPages} ページ（{total}件）</span>
      <button onClick={() => onPage(page + 1)} disabled={page >= totalPages - 1}
        className="flex items-center gap-1 px-3 py-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
        次へ<ChevronRight className="w-4 h-4" />
      </button>
    </div>
  )
}

interface PdfDocument {
  id: string
  title: string
  description: string | null
  file_url: string
  file_size: number | null
  published_at: string
  year: number
  month: number
}

interface EventItem {
  id: string
  title: string
  event_date: string
  attachment_url: string
}

interface CirculationItem {
  id: string
  title: string
  created_at: string
  file_url: string
}

function PdfButtons({ url, stopPropagation = false }: { url: string; stopPropagation?: boolean }) {
  const stop = stopPropagation ? (e: React.MouseEvent) => e.stopPropagation() : undefined
  return (
    <div className="flex gap-1 flex-shrink-0">
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="p-2 bg-primary-100 text-primary-600 rounded-lg hover:bg-primary-200 transition-colors"
        title="閲覧"
        onClick={stop}
      >
        <Eye className="w-4 h-4" />
      </a>
      <a
        href={url}
        download
        className="p-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors"
        title="ダウンロード"
        onClick={stop}
      >
        <Download className="w-4 h-4" />
      </a>
    </div>
  )
}

function SectionHeader({
  icon,
  label,
  count,
  open,
  onToggle,
}: {
  icon: React.ReactNode
  label: string
  count: number
  open: boolean
  onToggle: () => void
}) {
  return (
    <button
      onClick={onToggle}
      className="w-full flex items-center justify-between p-3 bg-gray-100 rounded-lg font-semibold text-gray-700 text-sm"
    >
      <span className="flex items-center gap-2">
        {icon}
        {label}（{count}件）
      </span>
      {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
    </button>
  )
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr)
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`
}

export default function PdfList({
  pdfs,
  events = [],
  circulations = [],
  paginate = false,
}: {
  pdfs: PdfDocument[]
  events?: EventItem[]
  circulations?: CirculationItem[]
  paginate?: boolean
}) {
  // セクション開閉状態（広報PDFはデフォルトで開く）
  const [openSection, setOpenSection] = useState<'pdf' | 'events' | 'circulation' | null>(null)

  const grouped = pdfs.reduce((acc, pdf) => {
    const key = `${pdf.year}年`
    if (!acc[key]) acc[key] = []
    acc[key].push(pdf)
    return acc
  }, {} as Record<string, PdfDocument[]>)
  const yearKeys = Object.keys(grouped)

  // 広報PDF内の年アコーディオン（初期値は最初の年を開く）
  const [expandedYear, setExpandedYear] = useState<string | null>(yearKeys[0] ?? null)

  // ページネーション（paginate=true のときのみ使用）
  const [pdfPage, setPdfPage] = useState(0)
  const [eventsPage, setEventsPage] = useState(0)
  const [circulationsPage, setCirculationsPage] = useState(0)

  const pagedPdfs = paginate ? pdfs.slice(pdfPage * PAGE_SIZE, (pdfPage + 1) * PAGE_SIZE) : pdfs
  const pagedEvents = paginate ? events.slice(eventsPage * PAGE_SIZE, (eventsPage + 1) * PAGE_SIZE) : events
  const pagedCirculations = paginate ? circulations.slice(circulationsPage * PAGE_SIZE, (circulationsPage + 1) * PAGE_SIZE) : circulations

  // ページネーション時はページ内のPDFのみでグループ化
  const pagedGrouped = pagedPdfs.reduce((acc, pdf) => {
    const key = `${pdf.year}年`
    if (!acc[key]) acc[key] = []
    acc[key].push(pdf)
    return acc
  }, {} as Record<string, PdfDocument[]>)
  const pagedYearKeys = Object.keys(pagedGrouped)

  const toggle = (key: 'pdf' | 'events' | 'circulation') =>
    setOpenSection(prev => (prev === key ? null : key))

  const hasPdfs = pdfs.length > 0
  const hasEvents = events.length > 0
  const hasCirculations = circulations.length > 0

  if (!hasPdfs && !hasEvents && !hasCirculations) {
    return (
      <div className="card text-center py-8 text-gray-400">
        <FileText className="w-8 h-8 mx-auto mb-2" />
        <p className="text-sm">PDFはまだありません</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">

      {/* ---- 広報PDF ---- */}
      {hasPdfs && (
        <div>
          <SectionHeader
            icon={<FileText className="w-4 h-4 text-red-500" />}
            label="はま新聞"
            count={pdfs.length}
            open={openSection === 'pdf'}
            onToggle={() => toggle('pdf')}
          />
          {openSection === 'pdf' && (
            <div className="mt-2 space-y-2">
              {(paginate ? pagedYearKeys : yearKeys).map((year) => {
                const items = paginate ? pagedGrouped[year] : grouped[year]
                return (
                  <div key={year}>
                    <button
                      onClick={() => setExpandedYear(expandedYear === year ? null : year)}
                      className="w-full flex items-center justify-between px-3 py-2 bg-gray-50 rounded-lg text-sm text-gray-600 font-medium"
                    >
                      {year}（{items.length}件）
                      {expandedYear === year
                        ? <ChevronUp className="w-4 h-4" />
                        : <ChevronDown className="w-4 h-4" />}
                    </button>
                    {expandedYear === year && (
                      <div className="mt-1 space-y-2">
                        {items.map(pdf => (
                          <div
                            key={pdf.id}
                            className="card cursor-pointer hover:shadow-md transition-shadow"
                            onClick={() => window.open(pdf.file_url, '_blank', 'noopener,noreferrer')}
                          >
                            <div className="flex items-start gap-3">
                              <div className="bg-red-100 p-2 rounded-lg flex-shrink-0">
                                <FileText className="w-5 h-5 text-red-600" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-semibold text-gray-800 text-sm">{pdf.title}</p>
                                {pdf.description && <p className="text-xs text-gray-500 mt-0.5">{pdf.description}</p>}
                                <p className="text-xs text-gray-400 mt-1">
                                  {pdf.year}年{pdf.month}月号
                                  {pdf.file_size && ` · ${Math.round(pdf.file_size / 1024)}KB`}
                                </p>
                              </div>
                              <PdfButtons url={pdf.file_url} stopPropagation />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
              {paginate && <Pagination page={pdfPage} total={pdfs.length} onPage={p => { setPdfPage(p); setExpandedYear(null) }} />}
            </div>
          )}
        </div>
      )}

      {/* ---- イベント案内 ---- */}
      {hasEvents && (
        <div>
          <SectionHeader
            icon={<Calendar className="w-4 h-4 text-purple-500" />}
            label="イベント案内"
            count={events.length}
            open={openSection === 'events'}
            onToggle={() => toggle('events')}
          />
          {openSection === 'events' && (
            <div className="mt-2 space-y-2">
              {pagedEvents.map(ev => (
                <div
                  key={ev.id}
                  className="card cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => window.open(ev.attachment_url, '_blank', 'noopener,noreferrer')}
                >
                  <div className="flex items-start gap-3">
                    <div className="bg-purple-100 p-2 rounded-lg flex-shrink-0">
                      <Calendar className="w-5 h-5 text-purple-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-800 text-sm">{ev.title}</p>
                      <p className="text-xs text-gray-400 mt-1">開催日：{formatDate(ev.event_date)}</p>
                    </div>
                    <PdfButtons url={ev.attachment_url} stopPropagation />
                  </div>
                </div>
              ))}
              {paginate && <Pagination page={eventsPage} total={events.length} onPage={setEventsPage} />}
            </div>
          )}
        </div>
      )}

      {/* ---- 回覧板 ---- */}
      {hasCirculations && (
        <div>
          <SectionHeader
            icon={<ClipboardList className="w-4 h-4 text-green-500" />}
            label="回覧板"
            count={circulations.length}
            open={openSection === 'circulation'}
            onToggle={() => toggle('circulation')}
          />
          {openSection === 'circulation' && (
            <div className="mt-2 space-y-2">
              {pagedCirculations.map(item => (
                <div
                  key={item.id}
                  className="card cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => window.open(item.file_url, '_blank', 'noopener,noreferrer')}
                >
                  <div className="flex items-start gap-3">
                    <div className="bg-green-100 p-2 rounded-lg flex-shrink-0">
                      <ClipboardList className="w-5 h-5 text-green-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-800 text-sm">{item.title}</p>
                      <p className="text-xs text-gray-400 mt-1">発行日：{formatDate(item.created_at)}</p>
                    </div>
                    <PdfButtons url={item.file_url} stopPropagation />
                  </div>
                </div>
              ))}
              {paginate && <Pagination page={circulationsPage} total={circulations.length} onPage={setCirculationsPage} />}
            </div>
          )}
        </div>
      )}

    </div>
  )
}
