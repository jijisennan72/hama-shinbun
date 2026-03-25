'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  Home, FileText, ClipboardCheck, Calendar, Bell,
  LogOut, LogIn, Search, X,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface Household {
  name: string
  household_number: string
  is_admin: boolean
}

interface SearchResult {
  key: string
  type: 'schedule' | 'notification' | 'newspaper'
  title: string
  date: string
  href: string
  snippet?: string
}

function fmtDate(d: string) {
  return d.slice(0, 10).replace(/-/g, '/')
}

function makeSnippet(text: string, query: string): string {
  const idx = text.toLowerCase().indexOf(query.toLowerCase())
  if (idx === -1) return text.slice(0, 60) + '…'
  const start = Math.max(0, idx - 30)
  const end = Math.min(text.length, start + 60)
  return (start > 0 ? '…' : '') + text.slice(start, end).trim() + (end < text.length ? '…' : '')
}

export default function Navigation({ household }: { household: Household | null }) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  // --- 検索ステート ---
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [searched, setSearched] = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false)

  const headerRef = useRef<HTMLElement>(null)
  const mobileInputRef = useRef<HTMLInputElement>(null)

  // フォーム外クリックで閉じる
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (headerRef.current && !headerRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
        setMobileSearchOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const runSearch = useCallback(async (q: string) => {
    if (!q.trim()) return
    const like = `%${q.trim()}%`
    const [{ data: schedules }, { data: notifications }, { data: newspapers }] = await Promise.all([
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
      supabase
        .from('pdf_documents')
        .select('id, title, extracted_text, year, month')
        .not('extracted_text', 'is', null)
        .ilike('extracted_text', like)
        .limit(3),
    ])
    setResults([
      ...(schedules ?? []).map(s => ({
        key: `s-${s.id}`, type: 'schedule' as const,
        title: s.title, date: s.event_date, href: '/schedule',
      })),
      ...(notifications ?? []).map(n => ({
        key: `n-${n.id}`, type: 'notification' as const,
        title: n.title, date: fmtDate(n.created_at), href: '/notifications',
      })),
      ...(newspapers ?? []).map(p => ({
        key: `p-${p.id}`, type: 'newspaper' as const,
        title: p.title, date: `${p.year}年${p.month}月号`, href: '/newspaper',
        snippet: makeSnippet(p.extracted_text ?? '', q.trim()),
      })),
    ])
    setSearched(true)
    setDropdownOpen(true)
  }, [supabase])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') runSearch(query)
    if (e.key === 'Escape') { setDropdownOpen(false); setMobileSearchOpen(false) }
  }

  const handleSelect = (href: string) => {
    router.push(href)
    setDropdownOpen(false)
    setMobileSearchOpen(false)
    setQuery('')
    setSearched(false)
  }

  const openMobileSearch = () => {
    setMobileSearchOpen(true)
    setTimeout(() => mobileInputRef.current?.focus(), 50)
  }

  const closeMobileSearch = () => {
    setMobileSearchOpen(false)
    setDropdownOpen(false)
    setQuery('')
    setSearched(false)
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  const navItems = [
    { href: '/',             icon: Home,          label: 'ホーム' },
    { href: '/pdf',          icon: FileText,       label: '倉庫' },
    { href: '/circulation',  icon: ClipboardCheck, label: '回覧板' },
    { href: '/events',       icon: Calendar,       label: 'イベント' },
    { href: '/notifications', icon: Bell,          label: 'お知らせ' },
  ]

  // 検索結果ドロップダウン（PC・モバイル共用）
  const Dropdown = dropdownOpen ? (
    <div className="absolute right-0 top-full mt-1 w-80 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden z-50">
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
              className="w-full flex flex-col gap-0.5 px-4 py-3 text-left hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-2 w-full">
                <span className={`text-xs font-medium px-1.5 py-0.5 rounded-full flex-shrink-0 ${
                  r.type === 'schedule'
                    ? 'bg-teal-100 text-teal-700'
                    : r.type === 'notification'
                    ? 'bg-yellow-100 text-yellow-700'
                    : 'bg-blue-100 text-blue-700'
                }`}>
                  {r.type === 'schedule' ? '予定' : r.type === 'notification' ? 'お知らせ' : 'はま新聞'}
                </span>
                <span className="flex-1 text-sm text-gray-800 truncate">{r.title}</span>
                <span className="text-xs text-gray-400 flex-shrink-0">{r.date}</span>
              </div>
              {r.snippet && (
                <p className="text-xs text-gray-500 truncate pl-0.5">{r.snippet}</p>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  ) : null

  return (
    <>
      <header
        ref={headerRef}
        className="bg-primary-900 text-white px-4 py-3 sticky top-0 z-10"
      >
        {/* ── 1行目：タイトル＋右ボタン群（常時表示） ── */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-bold text-lg">はまアプリ</h1>
            {household && (
              <p className="text-xs text-primary-200">
                {household.household_number}番 {household.name}
              </p>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* PC：常時フォーム表示 */}
            <div className="relative hidden md:block">
              <div className="flex items-center bg-primary-800 hover:bg-primary-700 rounded-lg px-2.5 py-1.5 gap-2 transition-colors">
                <input
                  type="text"
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="検索..."
                  className="bg-transparent text-white placeholder-primary-300 text-sm w-36 outline-none"
                />
                <button
                  onClick={() => runSearch(query)}
                  className="text-primary-300 hover:text-white transition-colors"
                  aria-label="検索"
                >
                  <Search className="w-4 h-4" />
                </button>
              </div>
              {Dropdown}
            </div>

            {/* スマホ：未展開時のみアイコン表示 */}
            {!mobileSearchOpen && (
              <button
                onClick={openMobileSearch}
                className="md:hidden p-1.5 hover:bg-primary-700 rounded-lg transition-colors"
                aria-label="検索を開く"
              >
                <Search className="w-4 h-4" />
              </button>
            )}

            {household?.is_admin && (
              <Link
                href="/admin"
                className="text-xs bg-primary-700 hover:bg-primary-600 px-2 py-1 rounded"
              >
                管理
              </Link>
            )}
            {household ? (
              <button
                onClick={handleLogout}
                className="p-1.5 hover:bg-primary-700 rounded-lg"
                title="ログアウト"
              >
                <LogOut className="w-4 h-4" />
              </button>
            ) : (
              <Link
                href="/login"
                className="flex items-center gap-1 text-xs bg-primary-700 hover:bg-primary-600 px-2 py-1 rounded"
              >
                <LogIn className="w-3 h-3" />
                ログイン
              </Link>
            )}
          </div>
        </div>

        {/* ── 2行目：スマホ展開検索フォーム（展開時のみ・md以上は非表示） ── */}
        {mobileSearchOpen && (
          <div className="relative mt-2 md:hidden">
            <div className="flex items-center bg-primary-800 rounded-lg px-2.5 py-1.5 gap-2">
              <input
                ref={mobileInputRef}
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="予定・お知らせを検索..."
                className="bg-transparent text-white placeholder-primary-300 text-sm flex-1 outline-none"
              />
              <button
                onClick={() => runSearch(query)}
                className="text-primary-300 hover:text-white flex-shrink-0"
                aria-label="検索"
              >
                <Search className="w-4 h-4" />
              </button>
              <button
                onClick={closeMobileSearch}
                className="text-primary-300 hover:text-white flex-shrink-0"
                aria-label="検索を閉じる"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            {Dropdown}
          </div>
        )}
      </header>

      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-10">
        <div className="max-w-2xl mx-auto flex">
          {navItems.map(item => {
            const isActive =
              pathname === item.href ||
              (item.href !== '/' && pathname.startsWith(item.href))
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex-1 flex flex-col items-center py-2 text-xs transition-colors ${
                  isActive ? 'text-primary-600' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <item.icon className={`w-5 h-5 mb-0.5 ${isActive ? 'stroke-2' : ''}`} />
                {item.label}
              </Link>
            )
          })}
        </div>
      </nav>
    </>
  )
}
