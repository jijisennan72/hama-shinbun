'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { CheckCircle, Circle, FileText, ChevronDown, ChevronUp } from 'lucide-react'

interface CirculationItem {
  id: string
  title: string
  content: string | null
  file_url: string | null
  created_at: string
  is_read: boolean
}

export default function CirculationList({ items, householdId }: { items: CirculationItem[]; householdId: string | undefined }) {
  const [localItems, setLocalItems] = useState(items)
  const [loading, setLoading] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const supabase = createClient()

  const toggleExpand = (id: string) => setExpandedId(prev => prev === id ? null : id)

  const markAsRead = async (itemId: string) => {
    if (!householdId) return
    setLoading(itemId)
    await supabase.from('circulation_reads').insert({ circulation_item_id: itemId, household_id: householdId })
    setLocalItems(prev => prev.map(item => item.id === itemId ? { ...item, is_read: true } : item))
    setLoading(null)
  }

  if (localItems.length === 0) {
    return (
      <div className="card text-center py-8 text-gray-400">
        <CheckCircle className="w-8 h-8 mx-auto mb-2" />
        <p className="text-sm">回覧板はありません</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {localItems.map(item => {
        const isExpanded = expandedId === item.id
        const stop = (e: React.MouseEvent) => e.stopPropagation()
        return (
          <div
            key={item.id}
            className={`card cursor-pointer hover:shadow-md transition-shadow ${item.is_read ? 'opacity-60' : 'border-primary-200 bg-primary-50'}`}
            onClick={() => toggleExpand(item.id)}
          >
            <div className="flex items-start gap-3">
              <div className={`mt-0.5 flex-shrink-0 ${item.is_read ? 'text-green-500' : 'text-gray-300'}`}>
                {item.is_read ? <CheckCircle className="w-5 h-5" /> : <Circle className="w-5 h-5" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-semibold text-gray-800 text-sm">{item.title}</p>
                  <div className="flex-shrink-0 text-gray-400">
                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </div>
                </div>
                {item.content && (
                  <p className={`text-xs text-gray-600 mt-1 ${isExpanded ? '' : 'line-clamp-2'}`}>
                    {item.content}
                  </p>
                )}
                <p className="text-xs text-gray-400 mt-1">{new Date(item.created_at).toLocaleDateString('ja-JP')}</p>
                {isExpanded && (
                  <div className="flex items-center gap-2 mt-2" onClick={stop}>
                    {item.file_url && (
                      <a
                        href={item.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs text-primary-600 bg-primary-50 hover:bg-primary-100 px-3 py-1.5 rounded-full transition-colors"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        📄 資料を見る
                      </a>
                    )}
                    {!item.is_read && (
                      <button
                        onClick={() => markAsRead(item.id)}
                        disabled={loading === item.id}
                        className="text-xs bg-green-600 text-white px-3 py-1 rounded-full hover:bg-green-700 disabled:opacity-50"
                      >
                        {loading === item.id ? '処理中...' : '確認しました'}
                      </button>
                    )}
                    {item.is_read && <span className="text-xs text-green-600 font-medium">既読済み</span>}
                  </div>
                )}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
