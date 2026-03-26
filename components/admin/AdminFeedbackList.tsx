'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { MessageSquare, Eye, EyeOff, CheckCircle2, RotateCcw, Send } from 'lucide-react'

interface FeedbackReply {
  id: string
  reply_text: string
  replied_at: string
  replied_by: string
  sender_type: 'admin' | 'user'
}

interface Feedback {
  id: string
  category: string
  message: string
  is_read: boolean
  is_resolved: boolean
  resolved_at: string | null
  created_at: string
  households: { name: string; household_number: string } | null
  feedback_replies: FeedbackReply[]
}

const CATEGORY_COLORS: Record<string, string> = {
  '意見': 'bg-blue-100 text-blue-700',
  '要望': 'bg-purple-100 text-purple-700',
  '質問': 'bg-green-100 text-green-700',
  '苦情': 'bg-red-100 text-red-700',
  'その他': 'bg-gray-100 text-gray-700',
}

export default function AdminFeedbackList({ initialFeedbacks }: { initialFeedbacks: Feedback[] }) {
  const [feedbacks, setFeedbacks] = useState(
    initialFeedbacks.map(f => ({
      ...f,
      feedback_replies: (f.feedback_replies ?? [])
        .sort((a, b) => new Date(a.replied_at).getTime() - new Date(b.replied_at).getTime()),
    }))
  )
  const [replyTexts, setReplyTexts] = useState<Record<string, string>>({})
  const [sendingId, setSendingId] = useState<string | null>(null)
  const supabase = createClient()

  const toggleRead = async (id: string, current: boolean) => {
    await supabase.from('feedbacks').update({ is_read: !current }).eq('id', id)
    setFeedbacks(prev => prev.map(f => f.id === id ? { ...f, is_read: !current } : f))
  }

  const toggleResolved = async (id: string, current: boolean) => {
    const resolvedAt = current ? null : new Date().toISOString()
    const updates: Record<string, unknown> = { is_resolved: !current, resolved_at: resolvedAt }
    if (!current) updates.is_read = true
    setFeedbacks(prev => prev.map(f =>
      f.id === id
        ? { ...f, is_resolved: !current, resolved_at: resolvedAt, is_read: !current ? true : f.is_read }
        : f
    ))
    const { error } = await supabase.from('feedbacks').update(updates).eq('id', id)
    if (error) {
      console.error('toggleResolved error:', error)
      setFeedbacks(prev => prev.map(f => f.id === id ? { ...f, is_resolved: current, resolved_at: f.resolved_at } : f))
      alert(`更新に失敗しました: ${error.message}`)
    }
  }

  const handleReply = async (feedbackId: string) => {
    const text = (replyTexts[feedbackId] ?? '').trim()
    if (!text) return
    setSendingId(feedbackId)
    const { data: reply, error } = await supabase
      .from('feedback_replies')
      .insert({ feedback_id: feedbackId, reply_text: text, replied_by: '管理者', sender_type: 'admin' })
      .select('id, reply_text, replied_at, replied_by, sender_type')
      .single()
    if (error) {
      alert(`回答の送信に失敗しました: ${error.message}`)
    } else if (reply) {
      // 回答送信時に既読 + 対応済みに自動更新 → ダッシュボード未読カウントを減らす
      await supabase.from('feedbacks')
        .update({ is_read: true, is_resolved: true, resolved_at: new Date().toISOString() })
        .eq('id', feedbackId)
      setFeedbacks(prev => prev.map(f =>
        f.id === feedbackId
          ? {
              ...f,
              feedback_replies: [...f.feedback_replies, reply as FeedbackReply],
              is_read: true,
              is_resolved: true,
              resolved_at: new Date().toISOString(),
            }
          : f
      ))
      setReplyTexts(prev => ({ ...prev, [feedbackId]: '' }))
    }
    setSendingId(null)
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
        <div className="divide-y divide-gray-100">
          {feedbacks.map(f => {
            const hasUserReply = f.feedback_replies.some(r => r.sender_type === 'user')
            return (
              <div key={f.id} className={`p-4 ${f.is_resolved ? 'opacity-70' : ''}`}>
                {/* ヘッダー */}
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${CATEGORY_COLORS[f.category] || CATEGORY_COLORS['その他']}`}>
                        {f.category}
                      </span>
                      {f.households && (
                        <span className="text-xs text-gray-400">{f.households.household_number}番 {f.households.name}</span>
                      )}
                      {!f.is_read && (
                        <span className="text-xs font-bold text-primary-600 bg-primary-50 px-1.5 py-0.5 rounded">未読</span>
                      )}
                      {hasUserReply && (
                        <span className="text-xs font-bold text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded">ユーザー返答あり</span>
                      )}
                      {f.is_resolved && (
                        <span className="text-xs font-medium text-green-600 flex items-center gap-0.5">
                          <CheckCircle2 className="w-3 h-3" />
                          対応済み
                          {f.resolved_at && <span className="font-normal text-green-500 ml-1">{formatDate(f.resolved_at)}</span>}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-400">{formatDate(f.created_at)}</p>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
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
                    <button
                      onClick={() => toggleRead(f.id, f.is_read)}
                      className={`p-1.5 rounded hover:bg-gray-100 ${f.is_read ? 'text-gray-400' : 'text-primary-600'}`}
                      title={f.is_read ? '未読に戻す' : '既読にする'}
                    >
                      {f.is_read ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* チャットスレッド */}
                <div className="space-y-2 mb-3">
                  {/* 元のメッセージ（ユーザー右寄せ） */}
                  <div className="flex justify-end">
                    <div className="max-w-[85%] bg-gray-100 rounded-2xl rounded-tr-sm px-3 py-2">
                      <p className="text-xs text-gray-500 font-medium mb-0.5">
                        {f.households?.name ?? 'ユーザー'}
                      </p>
                      <p className="text-sm text-gray-800 whitespace-pre-wrap">{f.message}</p>
                      <p className="text-xs text-gray-400 text-right mt-1">{formatDate(f.created_at)}</p>
                    </div>
                  </div>

                  {/* 返信スレッド */}
                  {f.feedback_replies.map(r => (
                    r.sender_type === 'admin' ? (
                      /* 管理者（左寄せ） */
                      <div key={r.id} className="flex justify-start">
                        <div className="max-w-[85%] bg-blue-50 rounded-2xl rounded-tl-sm px-3 py-2 border border-blue-100">
                          <p className="text-xs text-blue-600 font-medium mb-0.5">管理者</p>
                          <p className="text-sm text-gray-800 whitespace-pre-wrap">{r.reply_text}</p>
                          <p className="text-xs text-gray-400 text-right mt-1">{formatDate(r.replied_at)}</p>
                        </div>
                      </div>
                    ) : (
                      /* ユーザー返答（右寄せ・オレンジ強調） */
                      <div key={r.id} className="flex justify-end">
                        <div className="max-w-[85%] bg-orange-50 rounded-2xl rounded-tr-sm px-3 py-2 border border-orange-100">
                          <p className="text-xs text-orange-600 font-medium mb-0.5">
                            {f.households?.name ?? 'ユーザー'}（返答）
                          </p>
                          <p className="text-sm text-gray-800 whitespace-pre-wrap">{r.reply_text}</p>
                          <p className="text-xs text-gray-400 text-right mt-1">{formatDate(r.replied_at)}</p>
                        </div>
                      </div>
                    )
                  ))}
                </div>

                {/* 管理者回答フォーム */}
                <div className="flex gap-2 items-end pt-2 border-t border-gray-100">
                  <textarea
                    value={replyTexts[f.id] ?? ''}
                    onChange={e => setReplyTexts(prev => ({ ...prev, [f.id]: e.target.value }))}
                    placeholder="回答を入力..."
                    rows={2}
                    className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
                  />
                  <button
                    onClick={() => handleReply(f.id)}
                    disabled={sendingId === f.id || !(replyTexts[f.id] ?? '').trim()}
                    className="flex-shrink-0 flex items-center gap-1 text-xs bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 px-3 py-2 rounded-lg transition-colors"
                  >
                    <Send className="w-3.5 h-3.5" />
                    {sendingId === f.id ? '送信中' : '回答する'}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
