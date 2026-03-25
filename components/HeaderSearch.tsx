'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Search, X, Clock, Trash2 } from 'lucide-react'
import { useRouter } from 'next/navigation'

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

export default function HeaderSearch() {
  const [query, setQuery] = useState('')
  const [mobileExpanded, setMobileExpanded] = useState(false)
  const [history, setHistory] = useState<string[]>([])
  const [showHistory, setShowHistory] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  // マウント時に履歴を読み込む
  useEffect(() => {
    setHistory(loadHistory())
  }, [])

  // フォーム外クリックで履歴を閉じる
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowHistory(false)
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
    setMobileExpanded(false)
    router.push(`/?q=${encodeURIComponent(q)}`)
  }, [query, router])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    runSearch()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') { setShowHistory(false); handleClose() }
  }

  const handleClose = () => {
    setMobileExpanded(false)
    setShowHistory(false)
    setQuery('')
    router.push('/')
  }

  const handleMobileOpen = () => {
    setMobileExpanded(true)
    setTimeout(() => { inputRef.current?.focus(); setShowHistory(true) }, 50)
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

  const inputEl = (extraClass = '') => (
    <input
      ref={inputRef}
      type="text"
      value={query}
      onChange={e => setQuery(e.target.value)}
      onKeyDown={handleKeyDown}
      onFocus={handleFocus}
      placeholder="検索..."
      className={`bg-transparent text-white placeholder-primary-300 text-sm outline-none ${extraClass}`}
    />
  )

  const historyDropdown = (
    <div className="absolute right-0 top-full mt-1.5 w-72 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden z-50">
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-100">
        <span className="text-xs font-medium text-gray-500 flex items-center gap-1">
          <Clock className="w-3.5 h-3.5" />検索履歴
        </span>
        <button
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
  )

  return (
    <div ref={containerRef} className="relative">
      {/* PC：常時表示 */}
      <form onSubmit={handleSubmit} className="hidden md:flex items-center bg-primary-800 hover:bg-primary-700 rounded-lg px-2.5 py-1.5 gap-2 transition-colors">
        {inputEl('w-36')}
        <button type="submit" className="text-primary-300 hover:text-white transition-colors" aria-label="検索">
          <Search className="w-4 h-4" />
        </button>
      </form>

      {/* スマホ：アイコン→展開 */}
      <div className="md:hidden">
        {mobileExpanded ? (
          <form onSubmit={handleSubmit} className="flex items-center bg-primary-800 rounded-lg px-2.5 py-1.5 gap-1.5">
            {inputEl('w-28')}
            <button type="submit" className="text-primary-300 hover:text-white" aria-label="検索">
              <Search className="w-4 h-4" />
            </button>
            <button type="button" onClick={handleClose} className="text-primary-300 hover:text-white" aria-label="閉じる">
              <X className="w-3.5 h-3.5" />
            </button>
          </form>
        ) : (
          <button
            type="button"
            onClick={handleMobileOpen}
            className="p-1.5 hover:bg-primary-700 rounded-lg transition-colors"
            aria-label="検索を開く"
          >
            <Search className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* 検索履歴ドロップダウン */}
      {showHistory && history.length > 0 && historyDropdown}
    </div>
  )
}
