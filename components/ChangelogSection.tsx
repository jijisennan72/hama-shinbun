'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp, History } from 'lucide-react'

interface ChangelogEntry {
  id: number
  version: string
  release_date: string
  content: string | string[]
}

interface GroupedEntry {
  key: string
  version: string
  release_date: string
  items: string[]
}

const INITIAL_COUNT = 5

function formatDate(dateStr: string) {
  return dateStr.replace(/-/g, '/')
}

function toItems(content: string | string[]): string[] {
  if (Array.isArray(content)) return content.filter(Boolean)
  // 改行区切りのテキストも箇条書きに
  return content.split('\n').map(s => s.trim()).filter(Boolean)
}

function groupEntries(entries: ChangelogEntry[]): GroupedEntry[] {
  const map = new Map<string, GroupedEntry>()
  for (const entry of entries) {
    const key = `${entry.version}__${entry.release_date}`
    const existing = map.get(key)
    const newItems = toItems(entry.content)
    if (existing) {
      existing.items.push(...newItems)
    } else {
      map.set(key, { key, version: entry.version, release_date: entry.release_date, items: newItems })
    }
  }
  return Array.from(map.values())
}

export default function ChangelogSection({ entries }: { entries: ChangelogEntry[] }) {
  const [expanded, setExpanded] = useState(false)

  const grouped = groupEntries(entries)
  const displayed = expanded ? grouped : grouped.slice(0, INITIAL_COUNT)
  const hasMore = grouped.length > INITIAL_COUNT

  return (
    <div className="card">
      <div className="flex items-center gap-2 mb-3">
        <History className="w-4 h-4 text-gray-400" />
        <h2 className="text-sm font-semibold text-gray-700">更新履歴</h2>
      </div>

      <div className="space-y-3">
        {displayed.map(entry => (
          <div key={entry.key} className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded font-medium">
                {entry.version.replace(/^v(\d)/, 'ver$1')}
              </span>
              <span className="text-xs text-gray-400">{formatDate(entry.release_date)}</span>
            </div>
            <ul className="pl-1 space-y-0.5">
              {entry.items.map((item, i) => (
                <li key={i} className="text-xs text-gray-700 leading-relaxed flex gap-1">
                  <span className="flex-shrink-0 text-gray-400">・</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {!expanded && hasMore && (
        <button
          onClick={() => setExpanded(true)}
          className="mt-3 flex items-center gap-1 text-xs text-indigo-500 hover:text-indigo-600 transition-colors"
        >
          <ChevronDown className="w-3.5 h-3.5" />
          過去の履歴を見る（{grouped.length - INITIAL_COUNT}件）
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
