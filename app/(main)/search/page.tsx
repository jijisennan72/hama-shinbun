import React from 'react'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { FileText, Calendar, MessageSquare, Bell, CalendarDays, Search, BookOpen, FolderOpen } from 'lucide-react'
import SearchForm from '@/components/SearchForm'

function extractContext(text: string, keyword: string): string {
  const lower = text.toLowerCase()
  const kw = keyword.toLowerCase()
  const idx = lower.indexOf(kw)
  if (idx === -1) return text.slice(0, 100) + '…'
  const start = Math.max(0, idx - 50)
  const end = Math.min(text.length, idx + keyword.length + 50)
  return (start > 0 ? '…' : '') + text.slice(start, end) + (end < text.length ? '…' : '')
}

function highlightKeywords(text: string, keywords: string[]): React.ReactNode {
  type Segment = { text: string; highlighted: boolean }
  let segments: Segment[] = [{ text, highlighted: false }]
  for (const kw of keywords) {
    if (!kw) continue
    const kwLower = kw.toLowerCase()
    const next: Segment[] = []
    for (const seg of segments) {
      if (seg.highlighted) { next.push(seg); continue }
      const lower = seg.text.toLowerCase()
      let lastIdx = 0
      let idx = lower.indexOf(kwLower)
      if (idx === -1) { next.push(seg); continue }
      while (idx !== -1) {
        if (idx > lastIdx) next.push({ text: seg.text.slice(lastIdx, idx), highlighted: false })
        next.push({ text: seg.text.slice(idx, idx + kw.length), highlighted: true })
        lastIdx = idx + kw.length
        idx = lower.indexOf(kwLower, lastIdx)
      }
      if (lastIdx < seg.text.length) next.push({ text: seg.text.slice(lastIdx), highlighted: false })
    }
    segments = next
  }
  return (
    <>
      {segments.map((seg, i) =>
        seg.highlighted
          ? <mark key={i} className="bg-yellow-200 font-bold not-italic rounded-sm px-0.5">{seg.text}</mark>
          : seg.text
      )}
    </>
  )
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams?: { q?: string }
}) {
  const supabase = await createClient()
  const q = (searchParams?.q ?? '').trim()

  let results: React.ReactNode = null

  if (q) {
    const keywords = q.split(/[\s　]+/).filter(Boolean)

    let pdfQuery = supabase.from('pdf_documents').select('id, title, file_url, year, month, extracted_text')
    for (const kw of keywords) pdfQuery = pdfQuery.ilike('extracted_text', `%${kw}%`)

    let notifQuery = supabase.from('notifications').select('id, title, body, created_at').eq('is_active', true)
    for (const kw of keywords) notifQuery = notifQuery.or(`title.ilike.%${kw}%,body.ilike.%${kw}%`)

    let scheduleQuery = supabase.from('schedule_events').select('id, title, content, event_date, location')
    for (const kw of keywords) scheduleQuery = scheduleQuery.or(`title.ilike.%${kw}%,content.ilike.%${kw}%`)

    let boardQuery = supabase.from('board_threads').select('id, title, content, created_at')
    for (const kw of keywords) boardQuery = boardQuery.or(`title.ilike.%${kw}%,content.ilike.%${kw}%`)

    let circulationQuery = supabase.from('circulation_items').select('id, title, extracted_text, created_at').not('extracted_text', 'is', null)
    for (const kw of keywords) circulationQuery = circulationQuery.ilike('extracted_text', `%${kw}%`)

    let eventTextQuery = supabase.from('events').select('id, title, event_date, extracted_text').not('extracted_text', 'is', null).eq('is_active', true)
    for (const kw of keywords) eventTextQuery = eventTextQuery.ilike('extracted_text', `%${kw}%`)

    let localQuery = supabase.from('local_contents').select('id, category, title, body, extracted_text')
    for (const kw of keywords) localQuery = localQuery.or(`title.ilike.%${kw}%,body.ilike.%${kw}%,extracted_text.ilike.%${kw}%`)

    const [
      { data: pdfHits },
      { data: notifHits },
      { data: scheduleHits },
      { data: boardHits },
      { data: circulationHits },
      { data: eventTextHits },
      { data: localHits },
    ] = await Promise.all([
      pdfQuery.order('published_at', { ascending: false }),
      notifQuery.order('created_at', { ascending: false }).limit(10),
      scheduleQuery.order('event_date', { ascending: false }).limit(10),
      boardQuery.order('created_at', { ascending: false }).limit(10),
      circulationQuery.order('created_at', { ascending: false }).limit(10),
      eventTextQuery.order('event_date', { ascending: false }).limit(10),
      localQuery.order('order_index', { ascending: true }).limit(10),
    ])

    const pdfs         = pdfHits ?? []
    const notifs       = notifHits ?? []
    const schedules    = scheduleHits ?? []
    const boards       = boardHits ?? []
    const circulations = circulationHits ?? []
    const eventTexts   = eventTextHits ?? []
    const localContents = localHits ?? []
    const totalCount   = pdfs.length + notifs.length + schedules.length + boards.length + circulations.length + eventTexts.length + localContents.length

    results = totalCount === 0 ? (
      <div className="card text-center py-10">
        <Search className="w-8 h-8 mx-auto mb-3 text-gray-300" />
        <p className="text-gray-500 text-sm">該当する情報が見つかりませんでした</p>
        <p className="text-gray-400 text-xs mt-1">別のキーワードで試してみてください</p>
      </div>
    ) : (
      <div className="space-y-3">
        <p className="text-xs text-gray-500">「{q}」の検索結果（{totalCount}件）</p>

        {pdfs.map(pdf => {
          const context = pdf.extracted_text ? extractContext(pdf.extracted_text, keywords[0]) : ''
          return (
            <div key={`pdf-${pdf.id}`} className="card space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium bg-red-100 text-red-700 px-2 py-0.5 rounded-full flex-shrink-0">📰 はま新聞</span>
                <p className="font-semibold text-gray-800 text-sm truncate">{pdf.year}年{pdf.month}月号</p>
              </div>
              {context && <p className="text-xs text-gray-600 leading-relaxed bg-gray-50 rounded px-3 py-2">{highlightKeywords(context, keywords)}</p>}
              <a href={pdf.file_url} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs bg-primary-600 text-white hover:bg-primary-700 px-3 py-1.5 rounded-lg transition-colors">
                <FileText className="w-3.5 h-3.5" />PDFを見る
              </a>
            </div>
          )
        })}

        {notifs.map(n => {
          const context = n.body ? extractContext(n.body, keywords[0]) : ''
          return (
            <div key={`notif-${n.id}`} className="card space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full flex-shrink-0">🔔 お知らせ</span>
                <p className="font-semibold text-gray-800 text-sm truncate">{highlightKeywords(n.title, keywords)}</p>
              </div>
              {context && <p className="text-xs text-gray-600 leading-relaxed bg-gray-50 rounded px-3 py-2">{highlightKeywords(context, keywords)}</p>}
              <Link href="/notifications"
                className="inline-flex items-center gap-1.5 text-xs bg-yellow-500 text-white hover:bg-yellow-600 px-3 py-1.5 rounded-lg transition-colors">
                <Bell className="w-3.5 h-3.5" />見る
              </Link>
            </div>
          )
        })}

        {schedules.map(s => {
          const context = s.content ? extractContext(s.content, keywords[0]) : ''
          return (
            <div key={`schedule-${s.id}`} className="card space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium bg-teal-100 text-teal-700 px-2 py-0.5 rounded-full flex-shrink-0">📅 予定</span>
                <p className="font-semibold text-gray-800 text-sm truncate">{highlightKeywords(s.title, keywords)}</p>
              </div>
              <p className="text-xs text-gray-400">{s.event_date}{s.location ? `　📍${s.location}` : ''}</p>
              {context && <p className="text-xs text-gray-600 leading-relaxed bg-gray-50 rounded px-3 py-2">{highlightKeywords(context, keywords)}</p>}
              <Link href="/schedule"
                className="inline-flex items-center gap-1.5 text-xs bg-teal-600 text-white hover:bg-teal-700 px-3 py-1.5 rounded-lg transition-colors">
                <CalendarDays className="w-3.5 h-3.5" />予定表を見る
              </Link>
            </div>
          )
        })}

        {boards.map(b => {
          const context = b.content ? extractContext(b.content, keywords[0]) : ''
          return (
            <div key={`board-${b.id}`} className="card space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium bg-cyan-100 text-cyan-700 px-2 py-0.5 rounded-full flex-shrink-0">📋 掲示板</span>
                <p className="font-semibold text-gray-800 text-sm truncate">{highlightKeywords(b.title, keywords)}</p>
              </div>
              {context && <p className="text-xs text-gray-600 leading-relaxed bg-gray-50 rounded px-3 py-2">{highlightKeywords(context, keywords)}</p>}
              <Link href={`/board/${b.id}`}
                className="inline-flex items-center gap-1.5 text-xs bg-cyan-600 text-white hover:bg-cyan-700 px-3 py-1.5 rounded-lg transition-colors">
                <MessageSquare className="w-3.5 h-3.5" />スレッドを見る
              </Link>
            </div>
          )
        })}

        {eventTexts.map(ev => {
          const context = ev.extracted_text ? extractContext(ev.extracted_text, keywords[0]) : ''
          return (
            <div key={`event-${ev.id}`} className="card space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full flex-shrink-0">📅 イベント</span>
                <p className="font-semibold text-gray-800 text-sm truncate">{highlightKeywords(ev.title, keywords)}</p>
              </div>
              {context && <p className="text-xs text-gray-600 leading-relaxed bg-gray-50 rounded px-3 py-2">{highlightKeywords(context, keywords)}</p>}
              <Link href="/events"
                className="inline-flex items-center gap-1.5 text-xs bg-amber-600 text-white hover:bg-amber-700 px-3 py-1.5 rounded-lg transition-colors">
                <CalendarDays className="w-3.5 h-3.5" />イベントを見る
              </Link>
            </div>
          )
        })}

        {circulations.map(c => {
          const context = c.extracted_text ? extractContext(c.extracted_text, keywords[0]) : ''
          return (
            <div key={`circulation-${c.id}`} className="card space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full flex-shrink-0">📄 回覧板</span>
                <p className="font-semibold text-gray-800 text-sm truncate">{highlightKeywords(c.title, keywords)}</p>
              </div>
              {context && <p className="text-xs text-gray-600 leading-relaxed bg-gray-50 rounded px-3 py-2">{highlightKeywords(context, keywords)}</p>}
              <Link href="/circulation"
                className="inline-flex items-center gap-1.5 text-xs bg-indigo-600 text-white hover:bg-indigo-700 px-3 py-1.5 rounded-lg transition-colors">
                <FileText className="w-3.5 h-3.5" />回覧板を見る
              </Link>
            </div>
          )
        })}

        {localContents.map(lc => {
          const isHistory = lc.category === 'history'
          const context = lc.extracted_text ? extractContext(lc.extracted_text, keywords[0])
            : lc.body ? extractContext(lc.body, keywords[0]) : ''
          return (
            <div key={`local-${lc.id}`} className="card space-y-2">
              <div className="flex items-center gap-2">
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full flex-shrink-0 ${isHistory ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-600'}`}>
                  {isHistory ? '📖 浜区の歴史' : '📂 その他'}
                </span>
                <p className="font-semibold text-gray-800 text-sm truncate">{highlightKeywords(lc.title, keywords)}</p>
              </div>
              {context && <p className="text-xs text-gray-600 leading-relaxed bg-gray-50 rounded px-3 py-2">{highlightKeywords(context, keywords)}</p>}
              <Link href={isHistory ? '/history' : '/others'}
                className={`inline-flex items-center gap-1.5 text-xs text-white px-3 py-1.5 rounded-lg transition-colors ${isHistory ? 'bg-amber-600 hover:bg-amber-700' : 'bg-gray-600 hover:bg-gray-700'}`}>
                <BookOpen className="w-3.5 h-3.5" />{isHistory ? '浜区の歴史を見る' : 'その他を見る'}
              </Link>
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-1">
        <Search className="w-5 h-5 text-gray-500" />
        <h1 className="text-lg font-bold text-gray-800">検索</h1>
      </div>

      <SearchForm defaultValue={q} />

      {!q && (
        <div className="card text-center py-10">
          <Search className="w-8 h-8 mx-auto mb-3 text-gray-300" />
          <p className="text-gray-500 text-sm">キーワードを入力してください</p>
          <p className="text-gray-400 text-xs mt-1">お知らせ・予定・はま新聞・掲示板などを横断検索します</p>
        </div>
      )}

      {results}
    </div>
  )
}
