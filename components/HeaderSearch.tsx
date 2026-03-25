'use client'

import { useState, useRef } from 'react'
import { Search, X } from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function HeaderSearch() {
  const [query, setQuery] = useState('')
  const [mobileExpanded, setMobileExpanded] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  const runSearch = () => {
    const q = query.trim()
    if (!q) return
    router.push(`/?q=${encodeURIComponent(q)}`)
    setMobileExpanded(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') runSearch()
    if (e.key === 'Escape') handleClose()
  }

  const handleClose = () => {
    setMobileExpanded(false)
    setQuery('')
    router.push('/')
  }

  const handleMobileOpen = () => {
    setMobileExpanded(true)
    setTimeout(() => inputRef.current?.focus(), 50)
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
    <div className="relative">
      {/* PC：常時表示 */}
      <div className="hidden md:flex items-center bg-primary-800 hover:bg-primary-700 rounded-lg px-2.5 py-1.5 gap-2 transition-colors">
        {inputEl('w-36')}
        <button onClick={runSearch} className="text-primary-300 hover:text-white transition-colors" aria-label="検索">
          <Search className="w-4 h-4" />
        </button>
      </div>

      {/* スマホ：アイコン→展開 */}
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
    </div>
  )
}
