'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Search, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

interface SearchResult {
  key: string
  type: 'schedule' | 'notification'
  title: string
  date: string
  href: string
}

function fmtDate(d: string) {
  return d.slice(0, 10).replace(/-/g, '/')
}

export default function HeaderSearch() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [searched, setSearched] = useState(false)   // 検索実行済みフラグ
  const [isOpen, setIsOpen] = useState(false)
  const [mobileExpanded, setMobileExpanded] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()
  const router = useRouter()

  // フォーム外クリックで閉じる
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
        setMobileExpanded(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const runSearch = useCallback(async () => {
    const q = query.trim()
    if (!q) return
    const like = `%${q}%`

    const [{ data: schedules }, { data: notifications }] = await Promise.all([
      supabase
        .from('schedule_events')
        .select('id, title, event_date')
        .or(`title.ilike.${like},content.ilike.${like}`)
        .order('event_date', { ascending: false })
        .limit(5),
      supabase
        .from('notifications')
        .select('id, title, created_at')
        .or(`title.ilike.${like},body.ilike.${like}`)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(5),
    ])

    const items: SearchResult[] = [
      ...(schedules ?? []).map(s => ({
        key: `s-${s.id}`,
        type: 'schedule' as const,
        title: s.title,
        date: s.event_date,
        href: '/schedule',
      })),
      ...(notifications ?? []).map(n => ({
        key: `n-${n.id}`,
        type: 'notification' as const,
        title: n.title,
        date: fmtDate(n.created_at),
        href: '/notifications',
      })),
    ]

    setResults(items)
    setSearched(true)
    setIsOpen(true)
  }, [query, supabase])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') runSearch()
    if (e.key === 'Escape') { setIsOpen(false); setMobileExpanded(false) }
  }

  const handleSelect = (href: string) => {
    router.push(href)
    setIsOpen(false)
    setMobileExpanded(false)
    setQuery('')
    setSearched(false)
  }

  const handleMobileOpen = () => {
    setMobileExpanded(true)
    setTimeout(() => inputRef.current?.focus(), 50)
  }

  const handleClose = () => {
    setMobileExpanded(false)
    setIsOpen(false)
    setQuery('')
    setSearched(false)
  }

  const inputEl = (extraClass = '') => (
    <input
      ref={inputRef}
      type="text"
      value={query}
      onChange={e => setQuery(e.target.value)}
      onKeyDown={handleKeyDown}
      placeholder="検索..."
      className={`bg-transparent text-white placeholder-primary-300 text-sm outline-none ${extraClass}`}
    />
  )

  return (
    <div ref={containerRef} className="relative">

      {/* ── PC：常時表示 ── */}
      <div className="hidden md:flex items-center bg-primary-800 hover:bg-primary-700 rounded-lg px-2.5 py-1.5 gap-2 transition-colors">
        {inputEl('w-36')}
        <button onClick={runSearch} className="text-primary-300 hover:text-white transition-colors" aria-label="検索">
          <Search className="w-4 h-4" />
        </button>
      </div>

      {/* ── スマホ：アイコン→展開 ── */}
      <div className="md:hidden">
        {mobileExpanded ? (
          <div className="flex items-center bg-primary-800 rounded-lg px-2.5 py-1.5 gap-1.5">
            {inputEl('w-28')}
            <button onClick={runSearch} className="text-primary-300 hover:text-white" aria-label="検索">
              <Search className="w-4 h-4" />
            </button>
            <button onClick={handleClose} className="text-primary-300 hover:text-white" aria-label="閉じる">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <button
            onClick={handleMobileOpen}
            className="p-1.5 hover:bg-primary-700 rounded-lg transition-colors"
            aria-label="検索を開く"
          >
            <Search className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* ── ドロップダウン ── */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden z-50">
          {results.length === 0 ? (
            <p className="text-center text-gray-400 text-sm py-5">
              {searched ? '該当する情報が見つかりませんでした' : ''}
            </p>
          ) : (
            <div className="divide-y divide-gray-50 max-h-72 overflow-y-auto">
              {results.map(r => (
                <button
                  key={r.key}
                  onClick={() => handleSelect(r.href)}
                  className="w-full flex items-center gap-2 px-4 py-3 text-left hover:bg-gray-50 transition-colors"
                >
                  <span className={`text-xs font-medium px-1.5 py-0.5 rounded-full flex-shrink-0 ${
                    r.type === 'schedule'
                      ? 'bg-teal-100 text-teal-700'
                      : 'bg-yellow-100 text-yellow-700'
                  }`}>
                    {r.type === 'schedule' ? '予定' : 'お知らせ'}
                  </span>
                  <span className="flex-1 text-sm text-gray-800 truncate">{r.title}</span>
                  <span className="text-xs text-gray-400 flex-shrink-0">{r.date}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
