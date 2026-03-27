'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  Home, FileText, Calendar, Bell,
  LogOut, LogIn, Search, X, Clock, Trash2,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface Household {
  name: string
  household_number: string
  is_admin: boolean
}

const STORAGE_KEY = 'hama_search_history'
const MAX_HISTORY = 10

function loadHistory(): string[] {
  if (typeof window === 'undefined') return []
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]')
  } catch {
    return []
  }
}

function saveHistory(history: string[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(history))
}

function addToHistory(keyword: string, current: string[]): string[] {
  const filtered = current.filter(h => h !== keyword)
  return [keyword, ...filtered].slice(0, MAX_HISTORY)
}

export default function Navigation({ household }: { household: Household | null }) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  const [query, setQuery] = useState('')
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false)
  const [history, setHistory] = useState<string[]>([])
  const [showHistory, setShowHistory] = useState(false)

  const headerRef = useRef<HTMLElement>(null)
  const mobileInputRef = useRef<HTMLInputElement>(null)
  const pcInputRef = useRef<HTMLInputElement>(null)

  // マウント時に履歴を読み込む
  useEffect(() => {
    setHistory(loadHistory())
  }, [])

  // フォーム外クリックで履歴を閉じる
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (headerRef.current && !headerRef.current.contains(e.target as Node)) {
        setShowHistory(false)
        setMobileSearchOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const runSearch = useCallback((kw?: string) => {
    const q = (kw ?? query).trim()
    if (!q) return
    const next = addToHistory(q, loadHistory())
    setHistory(next)
    saveHistory(next)
    setShowHistory(false)
    setMobileSearchOpen(false)
    router.push(`/?q=${encodeURIComponent(q)}`)
  }, [query, router])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    runSearch()
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      setShowHistory(false)
      setMobileSearchOpen(false)
    }
  }

  const handleFocus = () => {
    if (history.length > 0) setShowHistory(true)
  }

  const deleteOne = (kw: string, e: React.MouseEvent) => {
    e.stopPropagation()
    const next = history.filter(h => h !== kw)
    setHistory(next)
    saveHistory(next)
    if (next.length === 0) setShowHistory(false)
  }

  const clearAll = (e: React.MouseEvent) => {
    e.stopPropagation()
    setHistory([])
    saveHistory([])
    setShowHistory(false)
  }

  const openMobileSearch = () => {
    setMobileSearchOpen(true)
    setTimeout(() => {
      mobileInputRef.current?.focus()
      if (history.length > 0) setShowHistory(true)
    }, 50)
  }

  const closeMobileSearch = () => {
    setMobileSearchOpen(false)
    setShowHistory(false)
    setQuery('')
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  const navItems = [
    { href: '/',              icon: Home,          label: 'ホーム' },
    { href: '/pdf',           icon: FileText,       label: '倉庫' },
    { href: '/search',        icon: Search,         label: '検索' },
    { href: '/events',        icon: Calendar,       label: 'イベント' },
    { href: '/notifications', icon: Bell,           label: 'お知らせ' },
  ]

  // 検索履歴ドロップダウン
  const HistoryDropdown = showHistory && history.length > 0 ? (
    <div className="absolute right-0 top-full mt-1.5 w-72 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden z-50">
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-100">
        <span className="text-xs font-medium text-gray-500 flex items-center gap-1">
          <Clock className="w-3.5 h-3.5" />検索履歴
        </span>
        <button
          type="button"
          onClick={clearAll}
          className="text-xs text-red-400 hover:text-red-600 flex items-center gap-0.5 transition-colors"
        >
          <Trash2 className="w-3 h-3" />履歴をクリア
        </button>
      </div>
      <ul>
        {history.map(kw => (
          <li key={kw}>
            <button
              type="button"
              onClick={() => runSearch(kw)}
              className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-gray-50 transition-colors gap-2"
            >
              <span className="flex items-center gap-2 min-w-0">
                <Clock className="w-4 h-4 text-gray-300 flex-shrink-0" />
                <span className="text-sm text-gray-700 truncate">{kw}</span>
              </span>
              <span
                role="button"
                onClick={e => deleteOne(kw, e)}
                className="p-1 text-gray-300 hover:text-gray-500 rounded flex-shrink-0 transition-colors"
                aria-label={`「${kw}」を削除`}
              >
                <X className="w-3.5 h-3.5" />
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  ) : null

  return (
    <>
      <header ref={headerRef} className="bg-primary-900 text-white px-4 py-3 sticky top-0 z-10">
        {/* 1行目：タイトル＋右ボタン群 */}
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
              <form onSubmit={handleSubmit} className="flex items-center bg-primary-800 hover:bg-primary-700 rounded-lg px-2.5 py-1.5 gap-2 transition-colors">
                <input
                  ref={pcInputRef}
                  type="text"
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  onKeyDown={handleKeyDown}
                  onFocus={handleFocus}
                  placeholder="検索..."
                  className="bg-transparent text-white placeholder-primary-300 text-sm w-36 outline-none"
                />
                <button type="submit" className="text-primary-300 hover:text-white transition-colors" aria-label="検索">
                  <Search className="w-4 h-4" />
                </button>
              </form>
              {HistoryDropdown}
            </div>

            {/* スマホ：未展開時のみアイコン表示 */}
            {!mobileSearchOpen && (
              <button
                type="button"
                onClick={openMobileSearch}
                className="md:hidden p-1.5 hover:bg-primary-700 rounded-lg transition-colors"
                aria-label="検索を開く"
              >
                <Search className="w-4 h-4" />
              </button>
            )}

            {household?.is_admin && (
              <Link href="/admin" className="text-xs bg-primary-700 hover:bg-primary-600 px-2 py-1 rounded">
                管理
              </Link>
            )}
            {household ? (
              <button onClick={handleLogout} className="p-1.5 hover:bg-primary-700 rounded-lg" title="ログアウト">
                <LogOut className="w-4 h-4" />
              </button>
            ) : (
              <Link href="/login" className="flex items-center gap-1 text-xs bg-primary-700 hover:bg-primary-600 px-2 py-1 rounded">
                <LogIn className="w-3 h-3" />ログイン
              </Link>
            )}
          </div>
        </div>

        {/* 2行目：スマホ展開検索フォーム */}
        {mobileSearchOpen && (
          <div className="relative mt-2 md:hidden">
            <form onSubmit={handleSubmit} className="flex items-center bg-primary-800 rounded-lg px-2.5 py-1.5 gap-2">
              <input
                ref={mobileInputRef}
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                onFocus={handleFocus}
                placeholder="キーワードで検索..."
                className="bg-transparent text-white placeholder-primary-300 text-sm flex-1 outline-none"
              />
              <button type="submit" className="text-primary-300 hover:text-white flex-shrink-0" aria-label="検索">
                <Search className="w-4 h-4" />
              </button>
              <button type="button" onClick={closeMobileSearch} className="text-primary-300 hover:text-white flex-shrink-0" aria-label="検索を閉じる">
                <X className="w-3.5 h-3.5" />
              </button>
            </form>
            {HistoryDropdown}
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
