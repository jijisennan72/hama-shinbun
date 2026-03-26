'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp, ChevronLeft, ChevronRight, History } from 'lucide-react'

interface ChangelogEntry {
  id: number
  version: string
  release_date: string
  content: string
}

const INITIAL_COUNT = 5
const PAGE_SIZE = 10

function formatDate(dateStr: string) {
  // "2026-03-25" → "2026/03/25"
  return dateStr.replace(/-/g, '/')
}

export default function ChangelogSection({ entries }: { entries: ChangelogEntry[] }) {
  const [expanded, setExpanded] = useState(false)
  const [page, setPage] = useState(0)

  const displayed = expanded
    ? entries.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)
    : entries.slice(0, INITIAL_COUNT)

  const totalPages = Math.ceil(entries.length / PAGE_SIZE)
  const hasMore = entries.length > INITIAL_COUNT

  return (
    <div className="card">
      <div className="flex items-center gap-2 mb-3">
        <History className="w-4 h-4 text-gray-400" />
        <h2 className="text-sm font-semibold text-gray-700">更新履歴</h2>
      </div>

      <div className="space-y-3">
        {displayed.map(entry => (
          <div key={entry.id} className="space-y-0.5">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded font-medium">
                {entry.version.replace(/^v(\d)/, 'ver$1')}
              </span>
              <span className="text-xs text-gray-400">{formatDate(entry.release_date)}</span>
            </div>
            <p className="text-xs text-gray-700 leading-relaxed pl-1">{entry.content}</p>
          </div>
        ))}
      </div>

      {/* 展開ボタン */}
      {!expanded && hasMore && (
        <button
          onClick={() => setExpanded(true)}
          className="mt-3 flex items-center gap-1 text-xs text-indigo-500 hover:text-indigo-600 transition-colors"
        >
          <ChevronDown className="w-3.5 h-3.5" />
          過去の履歴を見る（{entries.length - INITIAL_COUNT}件）
        </button>
      )}

      {/* 閉じるボタン */}
      {expanded && (
        <button
          onClick={() => { setExpanded(false); setPage(0) }}
          className="mt-3 flex items-center gap-1 text-xs text-gray-400 hover:text-gray-500 transition-colors"
        >
          <ChevronUp className="w-3.5 h-3.5" />
          閉じる
        </button>
      )}

      {/* ページネーション（展開時・10件超の場合のみ） */}
      {expanded && totalPages > 1 && (
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100 text-xs text-gray-500">
          <button
            onClick={() => setPage(p => p - 1)}
            disabled={page === 0}
            className="p-1 rounded hover:bg-gray-100 disabled:opacity-30"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span>{page + 1} / {totalPages}</span>
          <button
            onClick={() => setPage(p => p + 1)}
            disabled={page >= totalPages - 1}
            className="p-1 rounded hover:bg-gray-100 disabled:opacity-30"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  )
}
