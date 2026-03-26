'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp, History } from 'lucide-react'

interface ChangelogEntry {
  id: number
  version: string
  release_date: string
  content: string
}

const INITIAL_COUNT = 5

function formatDate(dateStr: string) {
  return dateStr.replace(/-/g, '/')
}

export default function ChangelogSection({ entries }: { entries: ChangelogEntry[] }) {
  const [expanded, setExpanded] = useState(false)

  const displayed = expanded ? entries : entries.slice(0, INITIAL_COUNT)
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

      {!expanded && hasMore && (
        <button
          onClick={() => setExpanded(true)}
          className="mt-3 flex items-center gap-1 text-xs text-indigo-500 hover:text-indigo-600 transition-colors"
        >
          <ChevronDown className="w-3.5 h-3.5" />
          過去の履歴を見る（{entries.length - INITIAL_COUNT}件）
        </button>
      )}

      {expanded && (
        <button
          onClick={() => setExpanded(false)}
          className="mt-3 flex items-center gap-1 text-xs text-gray-400 hover:text-gray-500 transition-colors"
        >
          <ChevronUp className="w-3.5 h-3.5" />
          閉じる
        </button>
      )}
    </div>
  )
}
