'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { MessageSquare, Trash2, ChevronDown, ChevronUp } from 'lucide-react'

interface Reply {
  id: string
  content: string
  poster: string
  is_anonymous: boolean
  created_at: string
}

interface Thread {
  id: string
  title: string
  content: string
  poster: string
  is_anonymous: boolean
  created_at: string
  replies: Reply[]
}

function formatDatetime(iso: string) {
  const d = new Date(iso)
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

export default function AdminBoardManager({ initialThreads }: { initialThreads: Thread[] }) {
  const [threads, setThreads] = useState(initialThreads)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const supabase = createClient()

  const deleteThread = async (id: string, title: string) => {
    if (!confirm(`「${title}」スレッドを削除しますか？\nレスも含めてすべて削除されます。`)) return
    await supabase.from('board_threads').delete().eq('id', id)
    setThreads(prev => prev.filter(t => t.id !== id))
  }

  const deleteReply = async (threadId: string, replyId: string) => {
    if (!confirm('このレスを削除しますか？')) return
    await supabase.from('board_replies').delete().eq('id', replyId)
    setThreads(prev => prev.map(t =>
      t.id === threadId ? { ...t, replies: t.replies.filter(r => r.id !== replyId) } : t
    ))
  }

  if (threads.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 text-center py-10 text-gray-400">
        <MessageSquare className="w-8 h-8 mx-auto mb-2" />
        <p className="text-sm">投稿はありません</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 divide-y divide-gray-50">
      {threads.map(t => (
        <div key={t.id}>
          {/* スレッドヘッダー */}
          <div className="p-4 flex items-start gap-3">
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-gray-800 text-sm">{t.title}</p>
              <p className="text-xs text-gray-400 mt-0.5">
                {t.poster} · {formatDatetime(t.created_at)} · レス {t.replies.length}件
              </p>
              <p className="text-xs text-gray-600 mt-1.5 line-clamp-2">{t.content}</p>
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              <button
                onClick={() => setExpandedId(expandedId === t.id ? null : t.id)}
                className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
                title="レスを表示"
              >
                {expandedId === t.id
                  ? <ChevronUp className="w-4 h-4" />
                  : <ChevronDown className="w-4 h-4" />}
              </button>
              <button
                onClick={() => deleteThread(t.id, t.title)}
                className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded"
                title="スレッドを削除"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* レス一覧（展開時） */}
          {expandedId === t.id && (
            <div className="bg-gray-50 border-t border-gray-100 divide-y divide-gray-100">
              {t.replies.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-3">レスはありません</p>
              ) : (
                t.replies.map((r, i) => (
                  <div key={r.id} className="flex items-start gap-3 px-5 py-3">
                    <span className="text-xs font-bold text-gray-300 flex-shrink-0 w-7">#{i + 2}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-gray-500 mb-1">
                        <span className="font-semibold text-primary-600">{r.poster}</span>
                        {' · '}{formatDatetime(r.created_at)}
                      </p>
                      <p className="text-sm text-gray-700 whitespace-pre-wrap">{r.content}</p>
                    </div>
                    <button
                      onClick={() => deleteReply(t.id, r.id)}
                      className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded flex-shrink-0"
                      title="レスを削除"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
