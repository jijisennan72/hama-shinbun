import React from 'react'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { FileText, ClipboardCheck, Calendar, BarChart2, MessageSquare, Bell, CalendarDays, Megaphone, Lock, UserCircle, Search, ChevronRight, BookOpen, ScrollText } from 'lucide-react'
import EmergencyBanner from '@/components/EmergencyBanner'
import FontSizeSwitcher from '@/components/FontSizeSwitcher'
import ChangelogSection from '@/components/ChangelogSection'

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

export default async function DashboardPage({
  searchParams,
}: {
  searchParams?: { q?: string }
}) {
  const supabase = await createClient()
  const q = (searchParams?.q ?? '').trim()

  const { data: { user } } = await supabase.auth.getUser()

  let household: { household_number: string; name: string } | null = null
  if (user) {
    const { data } = await supabase
      .from('households')
      .select('household_number, name')
      .eq('user_id', user.id)
      .single()
    household = data
  }

  // 検索モード
  if (q) {
    const keywords = q.split(/[\s　]+/).filter(Boolean)

    // PDFクエリ（AND検索）
    let pdfQuery = supabase.from('pdf_documents').select('id, title, file_url, year, month, extracted_text')
    for (const kw of keywords) pdfQuery = pdfQuery.ilike('extracted_text', `%${kw}%`)

    // お知らせクエリ（title OR body でAND）
    let notifQuery = supabase.from('notifications').select('id, title, body, created_at').eq('is_active', true)
    for (const kw of keywords) notifQuery = notifQuery.or(`title.ilike.%${kw}%,body.ilike.%${kw}%`)

    // 予定クエリ（title OR content でAND）
    let scheduleQuery = supabase.from('schedule_events').select('id, title, content, event_date, location')
    for (const kw of keywords) scheduleQuery = scheduleQuery.or(`title.ilike.%${kw}%,content.ilike.%${kw}%`)

    // 掲示板クエリ（title OR content でAND）
    let boardQuery = supabase.from('board_threads').select('id, title, content, created_at')
    for (const kw of keywords) boardQuery = boardQuery.or(`title.ilike.%${kw}%,content.ilike.%${kw}%`)

    // 回覧板クエリ（extracted_text でAND検索）
    let circulationQuery = supabase.from('circulation_items').select('id, title, extracted_text, created_at').not('extracted_text', 'is', null)
    for (const kw of keywords) circulationQuery = circulationQuery.ilike('extracted_text', `%${kw}%`)

    // イベントクエリ（extracted_text でAND検索）
    let eventTextQuery = supabase.from('events').select('id, title, event_date, extracted_text').not('extracted_text', 'is', null).eq('is_active', true)
    for (const kw of keywords) eventTextQuery = eventTextQuery.ilike('extracted_text', `%${kw}%`)

    const [
      { data: pdfHits },
      { data: notifHits },
      { data: scheduleHits },
      { data: boardHits },
      { data: circulationHits },
      { data: eventTextHits },
    ] = await Promise.all([
      pdfQuery.order('published_at', { ascending: false }),
      notifQuery.order('created_at', { ascending: false }).limit(10),
      scheduleQuery.order('event_date', { ascending: false }).limit(10),
      boardQuery.order('created_at', { ascending: false }).limit(10),
      circulationQuery.order('created_at', { ascending: false }).limit(10),
      eventTextQuery.order('event_date', { ascending: false }).limit(10),
    ])

    const pdfs        = pdfHits ?? []
    const notifs      = notifHits ?? []
    const schedules   = scheduleHits ?? []
    const boards      = boardHits ?? []
    const circulations = circulationHits ?? []
    const eventTexts  = eventTextHits ?? []
    const totalCount = pdfs.length + notifs.length + schedules.length + boards.length + circulations.length + eventTexts.length

    return (
      <div className="space-y-4">
        {/* パンくずナビ */}
        <nav className="flex items-center gap-1 text-sm mb-3" aria-label="パンくずリスト">
          <Link href="/" className="text-blue-600 hover:text-blue-700 hover:underline whitespace-nowrap">
            ホーム
          </Link>
          <ChevronRight className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
          <span className="text-gray-500 truncate flex items-center gap-1">
            <Search className="w-3.5 h-3.5 flex-shrink-0" />
            「{q}」の検索結果
            {totalCount > 0 && <span className="text-gray-400">（{totalCount}件）</span>}
          </span>
        </nav>

        {/* 検索結果 */}
        {totalCount === 0 ? (
          <div className="card text-center py-10">
            <Search className="w-8 h-8 mx-auto mb-3 text-gray-300" />
            <p className="text-gray-500 text-sm">該当する情報が見つかりませんでした</p>
            <p className="text-gray-400 text-xs mt-1">別のキーワードで試してみてください</p>
          </div>
        ) : (
          <div className="space-y-3">

            {/* ── はま新聞 ── */}
            {pdfs.map(pdf => {
              const context = pdf.extracted_text ? extractContext(pdf.extracted_text, keywords[0]) : ''
              return (
                <div key={`pdf-${pdf.id}`} className="card space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium bg-red-100 text-red-700 px-2 py-0.5 rounded-full flex-shrink-0">📰 はま新聞</span>
                    <p className="font-semibold text-gray-800 text-sm truncate">{pdf.year}年{pdf.month}月号</p>
                  </div>
                  {context && (
                    <p className="text-xs text-gray-600 leading-relaxed bg-gray-50 rounded px-3 py-2">
                      {highlightKeywords(context, keywords)}
                    </p>
                  )}
                  <a href={pdf.file_url} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs bg-primary-600 text-white hover:bg-primary-700 px-3 py-1.5 rounded-lg transition-colors">
                    <FileText className="w-3.5 h-3.5" />PDFを見る
                  </a>
                </div>
              )
            })}

            {/* ── お知らせ ── */}
            {notifs.map(n => {
              const context = n.body ? extractContext(n.body, keywords[0]) : ''
              return (
                <div key={`notif-${n.id}`} className="card space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full flex-shrink-0">🔔 お知らせ</span>
                    <p className="font-semibold text-gray-800 text-sm truncate">{highlightKeywords(n.title, keywords)}</p>
                  </div>
                  {context && (
                    <p className="text-xs text-gray-600 leading-relaxed bg-gray-50 rounded px-3 py-2">
                      {highlightKeywords(context, keywords)}
                    </p>
                  )}
                  <Link href="/notifications"
                    className="inline-flex items-center gap-1.5 text-xs bg-yellow-500 text-white hover:bg-yellow-600 px-3 py-1.5 rounded-lg transition-colors">
                    <Bell className="w-3.5 h-3.5" />見る
                  </Link>
                </div>
              )
            })}

            {/* ── 予定表 ── */}
            {schedules.map(s => {
              const context = s.content ? extractContext(s.content, keywords[0]) : ''
              return (
                <div key={`schedule-${s.id}`} className="card space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium bg-teal-100 text-teal-700 px-2 py-0.5 rounded-full flex-shrink-0">📅 予定</span>
                    <p className="font-semibold text-gray-800 text-sm truncate">{highlightKeywords(s.title, keywords)}</p>
                  </div>
                  <p className="text-xs text-gray-400">{s.event_date}{s.location ? `　📍${s.location}` : ''}</p>
                  {context && (
                    <p className="text-xs text-gray-600 leading-relaxed bg-gray-50 rounded px-3 py-2">
                      {highlightKeywords(context, keywords)}
                    </p>
                  )}
                  <Link href="/schedule"
                    className="inline-flex items-center gap-1.5 text-xs bg-teal-600 text-white hover:bg-teal-700 px-3 py-1.5 rounded-lg transition-colors">
                    <CalendarDays className="w-3.5 h-3.5" />予定表を見る
                  </Link>
                </div>
              )
            })}

            {/* ── 掲示板 ── */}
            {boards.map(b => {
              const context = b.content ? extractContext(b.content, keywords[0]) : ''
              return (
                <div key={`board-${b.id}`} className="card space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium bg-cyan-100 text-cyan-700 px-2 py-0.5 rounded-full flex-shrink-0">📋 掲示板</span>
                    <p className="font-semibold text-gray-800 text-sm truncate">{highlightKeywords(b.title, keywords)}</p>
                  </div>
                  {context && (
                    <p className="text-xs text-gray-600 leading-relaxed bg-gray-50 rounded px-3 py-2">
                      {highlightKeywords(context, keywords)}
                    </p>
                  )}
                  <Link href={`/board/${b.id}`}
                    className="inline-flex items-center gap-1.5 text-xs bg-cyan-600 text-white hover:bg-cyan-700 px-3 py-1.5 rounded-lg transition-colors">
                    <MessageSquare className="w-3.5 h-3.5" />スレッドを見る
                  </Link>
                </div>
              )
            })}

            {/* ── イベント（テキスト検索） ── */}
            {eventTexts.map(ev => {
              const context = ev.extracted_text ? extractContext(ev.extracted_text, keywords[0]) : ''
              return (
                <div key={`event-${ev.id}`} className="card space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full flex-shrink-0">📅 イベント</span>
                    <p className="font-semibold text-gray-800 text-sm truncate">{highlightKeywords(ev.title, keywords)}</p>
                  </div>
                  {context && (
                    <p className="text-xs text-gray-600 leading-relaxed bg-gray-50 rounded px-3 py-2">
                      {highlightKeywords(context, keywords)}
                    </p>
                  )}
                  <Link href="/events"
                    className="inline-flex items-center gap-1.5 text-xs bg-amber-600 text-white hover:bg-amber-700 px-3 py-1.5 rounded-lg transition-colors">
                    <CalendarDays className="w-3.5 h-3.5" />イベントを見る
                  </Link>
                </div>
              )
            })}

            {/* ── 回覧板 ── */}
            {circulations.map(c => {
              const context = c.extracted_text ? extractContext(c.extracted_text, keywords[0]) : ''
              return (
                <div key={`circulation-${c.id}`} className="card space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full flex-shrink-0">📄 回覧板</span>
                    <p className="font-semibold text-gray-800 text-sm truncate">{highlightKeywords(c.title, keywords)}</p>
                  </div>
                  {context && (
                    <p className="text-xs text-gray-600 leading-relaxed bg-gray-50 rounded px-3 py-2">
                      {highlightKeywords(context, keywords)}
                    </p>
                  )}
                  <Link href="/circulation"
                    className="inline-flex items-center gap-1.5 text-xs bg-indigo-600 text-white hover:bg-indigo-700 px-3 py-1.5 rounded-lg transition-colors">
                    <FileText className="w-3.5 h-3.5" />回覧板を見る
                  </Link>
                </div>
              )
            })}

          </div>
        )}
      </div>
    )
  }

  // 通常ホーム
  const { data: changelog } = await supabase
    .from('changelog')
    .select('id, version, release_date, content')
    .order('release_date', { ascending: false })
    .order('id', { ascending: false })

  const { data: emergencies } = await supabase
    .from('notifications')
    .select('*')
    .eq('is_emergency', true)
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(3)

  const menus = [
    { href: '/notifications', icon: Bell,          label: 'お知らせ',     color: 'bg-yellow-100 text-yellow-600', desc: 'プッシュ通知設定',         auth: false, loginOnly: false },
    { href: '/schedule',      icon: CalendarDays,  label: '予定表',       color: 'bg-teal-100 text-teal-600',     desc: '今月の予定',              auth: false, loginOnly: false },
    { href: '/newspaper',     icon: FileText,       label: 'はま新聞',     color: 'bg-blue-100 text-blue-600',     desc: 'バックナンバーを見る',     auth: false, loginOnly: false },
    { href: '/circulation',   icon: ClipboardCheck, label: '回覧板',       color: 'bg-green-100 text-green-600',   desc: '既読確認',                 auth: true,  loginOnly: false },
    { href: '/surveys',       icon: BarChart2,      label: 'アンケート',   color: 'bg-orange-100 text-orange-600', desc: '住民アンケート',           auth: true,  loginOnly: false },
    { href: '/events',        icon: Calendar,       label: 'イベント申込', color: 'bg-purple-100 text-purple-600', desc: 'イベントに参加する',       auth: true,  loginOnly: false },
    { href: '/feedback',      icon: MessageSquare,  label: '意見・要望',   color: 'bg-pink-100 text-pink-600',     desc: 'ご意見をお寄せください',   auth: true,  loginOnly: false },
    { href: '/board',         icon: Megaphone,      label: '掲示板',       color: 'bg-cyan-100 text-cyan-600',     desc: 'みんなの口コミ・情報交換', auth: false, loginOnly: false },
    { href: '/mypage',        icon: UserCircle,     label: 'マイページ',   color: 'bg-indigo-100 text-indigo-600', desc: '申込履歴・設定',           auth: true,  loginOnly: true  },
    { href: '/history',       icon: BookOpen,       label: '浜区の歴史',   color: 'bg-amber-100 text-amber-600',   desc: '浜区のあゆみ',             auth: false, loginOnly: false },
    { href: '/rules',         icon: ScrollText,     label: '浜区会会則',   color: 'bg-rose-100 text-rose-600',     desc: '浜区会の規約・会則',       auth: false, loginOnly: false },
  ]

  return (
    <div className="space-y-4">
      {emergencies && emergencies.length > 0 && (
        <div className="space-y-2">
          {emergencies.map(n => <EmergencyBanner key={n.id} notification={n} />)}
        </div>
      )}
      <div className="grid grid-cols-2 gap-3">
        {menus.filter(menu => !menu.loginOnly || !!household).map((menu, i) => {
          const locked = menu.auth && !household
          return (
            <React.Fragment key={menu.href}>
              <Link
                href={menu.href}
                className={`card hover:shadow-md transition-shadow active:scale-95 relative ${locked ? 'opacity-50' : ''}`}
              >
                {locked && (
                  <Lock className="absolute top-2 right-2 w-3 h-3 text-gray-400" />
                )}
                <div className={`inline-flex p-2 rounded-lg ${locked ? 'bg-gray-100 text-gray-400' : menu.color} mb-2`}>
                  <menu.icon className="w-5 h-5" />
                </div>
                <p className={`font-semibold text-sm ${locked ? 'text-gray-400' : 'text-gray-800'}`}>{menu.label}</p>
                <p className="text-xs text-gray-400 mt-0.5">{locked ? 'ログインが必要です' : menu.desc}</p>
              </Link>
              {i === 0 && <FontSizeSwitcher />}
            </React.Fragment>
          )
        })}
      </div>
      <ChangelogSection entries={changelog ?? []} />
    </div>
  )
}
