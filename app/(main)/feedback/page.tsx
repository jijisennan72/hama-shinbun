'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { CheckCircle, CheckCircle2, ClockIcon, Mail, ChevronDown, ChevronUp, Send } from 'lucide-react'

interface FeedbackReply {
  id: string
  reply_text: string
  replied_at: string
  replied_by: string
  sender_type: 'admin' | 'user'
}

interface FeedbackItem {
  id: string
  category: string
  message: string
  is_resolved: boolean
  resolved_at: string | null
  created_at: string
  feedback_replies: FeedbackReply[]
}

const CATEGORY_COLORS: Record<string, string> = {
  '意見': 'bg-blue-100 text-blue-700',
  '要望': 'bg-purple-100 text-purple-700',
  '質問': 'bg-yellow-100 text-yellow-700',
  '苦情': 'bg-red-100 text-red-700',
  'その他': 'bg-gray-100 text-gray-600',
}

function formatDate(iso: string) {
  const d = new Date(iso)
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

export default function FeedbackPage() {
  const [category, setCategory] = useState('意見')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [history, setHistory] = useState<FeedbackItem[]>([])
  const [householdId, setHouseholdId] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    const loadHistory = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: household } = await supabase
        .from('households').select('id').eq('user_id', user.id).single()
      if (!household) return
      setHouseholdId(household.id)
      const { data } = await supabase
        .from('feedbacks')
        .select('id, category, message, is_resolved, resolved_at, created_at, feedback_replies(id, reply_text, replied_at, replied_by, sender_type)')
        .eq('household_id', household.id)
        .order('created_at', { ascending: false })
      setHistory((data || []).map(f => ({
        ...f,
        is_resolved: f.is_resolved ?? false,
        resolved_at: f.resolved_at ?? null,
        feedback_replies: ((f.feedback_replies as FeedbackReply[]) ?? [])
          .sort((a, b) => new Date(a.replied_at).getTime() - new Date(b.replied_at).getTime()),
      })))
    }
    loadHistory()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!message.trim()) return
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    const { data: household } = await supabase
      .from('households').select('id').eq('user_id', user!.id).single()
    const { data: inserted } = await supabase
      .from('feedbacks')
      .insert({ household_id: household?.id, category, message: message.trim() })
      .select('id, category, message, is_resolved, resolved_at, created_at')
      .single()
    if (inserted) {
      setHistory(prev => [{ ...inserted, is_resolved: false, resolved_at: null, feedback_replies: [] }, ...prev])
    }
    setSubmitted(true)
    setLoading(false)
  }

  if (submitted) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col items-center justify-center py-12 space-y-4">
          <CheckCircle className="w-16 h-16 text-green-500" />
          <h2 className="text-xl font-bold text-gray-800">送信完了</h2>
          <p className="text-gray-500 text-sm text-center">ご意見・ご要望をありがとうございます。<br />担当者が確認いたします。</p>
          <button onClick={() => { setSubmitted(false); setMessage('') }} className="btn-secondary">
            続けて送信する
          </button>
        </div>
        <HistorySection history={history} setHistory={setHistory} householdId={householdId} />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="card">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">カテゴリ</label>
            <div className="flex gap-2 flex-wrap">
              {['意見', '要望', '質問', '苦情', 'その他'].map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCategory(c)}
                  className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                    category === c ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">内容</label>
            <textarea
              value={message}
              onChange={e => setMessage(e.target.value)}
              rows={6}
              placeholder="ご意見・ご要望をご記入ください"
              className="input-field resize-none"
              required
            />
          </div>
          <button type="submit" disabled={loading || !message.trim()} className="btn-primary w-full">
            {loading ? '送信中...' : '送信する'}
          </button>
        </form>
      </div>
      <HistorySection history={history} setHistory={setHistory} householdId={householdId} />
    </div>
  )
}

// ---- 送信履歴セクション ----

function HistorySection({
  history,
  setHistory,
  householdId,
}: {
  history: FeedbackItem[]
  setHistory: React.Dispatch<React.SetStateAction<FeedbackItem[]>>
  householdId: string | null
}) {
  const [hideResolved, setHideResolved] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [replyTexts, setReplyTexts] = useState<Record<string, string>>({})
  const [sendingId, setSendingId] = useState<string | null>(null)
  const supabase = createClient()

  if (history.length === 0) return null

  const visibleHistory = hideResolved ? history.filter(h => !h.is_resolved) : history

  const hasAdminReply = (item: FeedbackItem) =>
    item.feedback_replies.some(r => r.sender_type === 'admin')

  const handleUserReply = async (feedbackId: string) => {
    const text = (replyTexts[feedbackId] ?? '').trim()
    if (!text || !householdId) return
    setSendingId(feedbackId)
    const { data: reply, error } = await supabase
      .from('feedback_replies')
      .insert({
        feedback_id: feedbackId,
        reply_text: text,
        replied_by: 'ユーザー',
        sender_type: 'user',
        household_id: householdId,
      })
      .select('id, reply_text, replied_at, replied_by, sender_type')
      .single()
    if (error) {
      alert(`返答の送信に失敗しました: ${error.message}`)
    } else if (reply) {
      setHistory(prev => prev.map(f =>
        f.id === feedbackId
          ? { ...f, feedback_replies: [...f.feedback_replies, reply as FeedbackReply] }
          : f
      ))
      setReplyTexts(prev => ({ ...prev, [feedbackId]: '' }))
    }
    setSendingId(null)
  }

  return (
    <div className="space-y-2">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-700 flex items-center gap-1.5">
          <ClockIcon className="w-4 h-4 text-gray-400" />
          自分の送信履歴
        </h2>
        <button
          type="button"
          onClick={() => setHideResolved(v => !v)}
          className="flex items-center gap-1.5 text-xs text-gray-500 select-none"
          aria-pressed={hideResolved}
        >
          <span>対応済みを隠す</span>
          <span className={`relative inline-flex h-5 w-9 flex-shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 ${hideResolved ? 'bg-primary-600' : 'bg-gray-300'}`}>
            <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200 ${hideResolved ? 'translate-x-4' : 'translate-x-0'}`} />
          </span>
        </button>
      </div>

      {/* 一覧 */}
      {visibleHistory.length === 0 ? (
        <p className="text-xs text-gray-400 text-center py-4">表示する履歴がありません</p>
      ) : (
        <div className="space-y-2">
          {visibleHistory.map(item => {
            const isExpanded = expandedId === item.id
            const adminReplyExists = hasAdminReply(item)
            return (
              <div key={item.id} className={`card py-3 px-4 ${item.is_resolved ? 'opacity-70' : ''}`}>
                {/* ヘッダー行 */}
                <button
                  type="button"
                  className="w-full text-left"
                  onClick={() => setExpandedId(isExpanded ? null : item.id)}
                >
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${CATEGORY_COLORS[item.category] ?? CATEGORY_COLORS['その他']}`}>
                        {item.category}
                      </span>
                      <span className="text-xs text-gray-400">{formatDate(item.created_at)}</span>
                      {adminReplyExists && (
                        <span className="text-xs font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                          <Mail className="w-3 h-3" />
                          回答あり
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {item.is_resolved && (
                        <span className="text-xs font-medium text-green-600 flex items-center gap-0.5">
                          <CheckCircle2 className="w-3 h-3" />
                          対応済み
                        </span>
                      )}
                      {isExpanded
                        ? <ChevronUp className="w-3.5 h-3.5 text-gray-400" />
                        : <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
                      }
                    </div>
                  </div>
                  {/* 折りたたみ時：本文プレビュー */}
                  {!isExpanded && (
                    <p className="text-sm text-gray-700">
                      {item.message.length > 60 ? item.message.slice(0, 60) + '…' : item.message}
                    </p>
                  )}
                </button>

                {/* 展開時：チャットスレッド */}
                {isExpanded && (
                  <div className="mt-3 space-y-2">
                    {/* 元のメッセージ（ユーザー右寄せ） */}
                    <div className="flex justify-end">
                      <div className="max-w-[85%] bg-primary-600 text-white rounded-2xl rounded-tr-sm px-3 py-2">
                        <p className="text-sm whitespace-pre-wrap">{item.message}</p>
                        <p className="text-xs opacity-70 text-right mt-1">{formatDate(item.created_at)}</p>
                      </div>
                    </div>

                    {/* 返信スレッド */}
                    {item.feedback_replies.map(r => (
                      r.sender_type === 'admin' ? (
                        /* 管理者（左寄せ） */
                        <div key={r.id} className="flex justify-start">
                          <div className="max-w-[85%] bg-blue-50 dark:bg-blue-900/30 rounded-2xl rounded-tl-sm px-3 py-2 border border-blue-100 dark:border-blue-800">
                            <p className="text-xs text-blue-600 dark:text-blue-400 font-medium mb-0.5">管理者</p>
                            <p className="text-sm text-gray-800 dark:text-gray-100 whitespace-pre-wrap">{r.reply_text}</p>
                            <p className="text-xs text-gray-400 text-right mt-1">{formatDate(r.replied_at)}</p>
                          </div>
                        </div>
                      ) : (
                        /* ユーザー返答（右寄せ） */
                        <div key={r.id} className="flex justify-end">
                          <div className="max-w-[85%] bg-gray-200 dark:bg-gray-700 rounded-2xl rounded-tr-sm px-3 py-2">
                            <p className="text-sm text-gray-800 dark:text-gray-100 whitespace-pre-wrap">{r.reply_text}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 text-right mt-1">{formatDate(r.replied_at)}</p>
                          </div>
                        </div>
                      )
                    ))}

                    {/* 返答フォーム（管理者が1回以上回答済みの場合） */}
                    {adminReplyExists && (
                      <div className="flex gap-2 items-end pt-1 border-t border-gray-100">
                        <textarea
                          value={replyTexts[item.id] ?? ''}
                          onChange={e => setReplyTexts(prev => ({ ...prev, [item.id]: e.target.value }))}
                          placeholder="返答を入力..."
                          rows={2}
                          className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-400 resize-none"
                        />
                        <button
                          type="button"
                          onClick={() => handleUserReply(item.id)}
                          disabled={sendingId === item.id || !(replyTexts[item.id] ?? '').trim()}
                          className="flex-shrink-0 flex items-center gap-1 text-xs bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-50 px-3 py-2 rounded-lg transition-colors"
                        >
                          <Send className="w-3.5 h-3.5" />
                          {sendingId === item.id ? '送信中' : '返答する'}
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
