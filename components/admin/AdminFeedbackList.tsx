'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { MessageSquare, Eye, EyeOff, CheckCircle2, RotateCcw } from 'lucide-react'

interface Feedback {
  id: string
  category: string
  message: string
  is_read: boolean
  is_resolved: boolean
  resolved_at: string | null
  created_at: string
  households: { name: string; household_number: string } | null
}

const CATEGORY_COLORS: Record<string, string> = {
  '意見': 'bg-blue-100 text-blue-700',
  '要望': 'bg-purple-100 text-purple-700',
  '質問': 'bg-green-100 text-green-700',
  '苦情': 'bg-red-100 text-red-700',
  'その他': 'bg-gray-100 text-gray-700',
}

export default function AdminFeedbackList({ initialFeedbacks }: { initialFeedbacks: Feedback[] }) {
  const [feedbacks, setFeedbacks] = useState(initialFeedbacks)
  const supabase = createClient()

  const toggleRead = async (id: string, current: boolean) => {
    await supabase.from('feedbacks').update({ is_read: !current }).eq('id', id)
    setFeedbacks(prev => prev.map(f => f.id === id ? { ...f, is_read: !current } : f))
  }

  const toggleResolved = async (id: string, current: boolean) => {
    const resolvedAt = current ? null : new Date().toISOString()
    // 楽観的更新
    setFeedbacks(prev => prev.map(f => f.id === id ? { ...f, is_resolved: !current, resolved_at: resolvedAt } : f))
    const { error } = await supabase
      .from('feedbacks')
      .update({ is_resolved: !current, resolved_at: resolvedAt })
      .eq('id', id)
    if (error) {
      console.error('toggleResolved error:', error)
      // ロールバック
      setFeedbacks(prev => prev.map(f => f.id === id ? { ...f, is_resolved: current, resolved_at: f.resolved_at } : f))
      alert(`更新に失敗しました: ${error.message}`)
    }
  }

  const formatDate = (iso: string) => {
    const d = new Date(iso)
    return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      {feedbacks.length === 0 ? (
        <div className="text-center py-8 text-gray-400">
          <MessageSquare className="w-8 h-8 mx-auto mb-2" />
          <p className="text-sm">意見・要望はありません</p>
        </div>
      ) : (
        <div className="divide-y divide-gray-50">
          {feedbacks.map(f => (
            <div key={f.id} className={`p-4 ${f.is_resolved ? 'opacity-60' : ''}`}>
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${CATEGORY_COLORS[f.category] || CATEGORY_COLORS['その他']}`}>
                      {f.category}
                    </span>
                    {f.households && (
                      <span className="text-xs text-gray-400">{f.households.household_number}番 {f.households.name}</span>
                    )}
                    {f.is_resolved && (
                      <span className="text-xs font-medium text-green-600 flex items-center gap-0.5">
                        <CheckCircle2 className="w-3 h-3" />
                        対応済み
                        {f.resolved_at && <span className="font-normal text-green-500 ml-1">{formatDate(f.resolved_at)}</span>}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-800">{f.message}</p>
                  <p className="text-xs text-gray-400 mt-1">{new Date(f.created_at).toLocaleString('ja-JP')}</p>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  {/* 対応済みトグル */}
                  <button
                    onClick={() => toggleResolved(f.id, f.is_resolved)}
                    className={`flex items-center gap-1 text-xs px-2 py-1 rounded transition-colors ${
                      f.is_resolved
                        ? 'bg-green-50 text-green-600 hover:bg-green-100'
                        : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                    }`}
                    title={f.is_resolved ? '対応済みを取り消す' : '対応済みにする'}
                  >
                    {f.is_resolved
                      ? <><RotateCcw className="w-3 h-3" />取消</>
                      : <><CheckCircle2 className="w-3 h-3" />対応済み</>
                    }
                  </button>
                  {/* 既読トグル */}
                  <button
                    onClick={() => toggleRead(f.id, f.is_read)}
                    className={`p-1.5 rounded hover:bg-gray-100 ${f.is_read ? 'text-gray-400' : 'text-primary-600'}`}
                    title={f.is_read ? '未読に戻す' : '既読にする'}
                  >
                    {f.is_read ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
