'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  User, KeyRound, Calendar, MessageSquare, BarChart2,
  ChevronDown, ChevronUp, Trash2, CheckCircle2, ClockIcon,
  AlertCircle, CheckCircle, ExternalLink, Moon, Mail,
} from 'lucide-react'

interface Household {
  id: string
  household_number: string
  name: string
}

interface EventRegistration {
  id: string
  attendee_count: number
  notes: string | null
  created_at: string
  event: {
    id: string
    title: string
    event_date: string
    location: string | null
  } | null
}

interface FeedbackReply {
  id: string
  reply_text: string
  replied_at: string
  replied_by: string
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

interface AnsweredSurvey {
  survey_id: string
  answered_at: string
  title: string
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
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`
}

function formatDatetime(iso: string) {
  const d = new Date(iso)
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function parseNotes(notes: string | null): { adults: number; children: number } {
  try {
    if (!notes) return { adults: 1, children: 0 }
    const parsed = JSON.parse(notes)
    return { adults: parsed.adults ?? 1, children: parsed.children ?? 0 }
  } catch {
    return { adults: 1, children: 0 }
  }
}

// ---- プロフィール + PIN変更 ----

function ProfileCard({ household }: { household: Household }) {
  const [showPinForm, setShowPinForm] = useState(false)
  const [currentPin, setCurrentPin] = useState('')
  const [newPin, setNewPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [changing, setChanging] = useState(false)
  const [pinResult, setPinResult] = useState<{ ok: boolean; msg: string } | null>(null)
  const supabase = createClient()

  const handlePinChange = async (e: React.FormEvent) => {
    e.preventDefault()
    if (newPin !== confirmPin) {
      setPinResult({ ok: false, msg: '新しい暗証番号が一致しません' })
      return
    }
    if (!/^\d{4}$/.test(newPin)) {
      setPinResult({ ok: false, msg: '暗証番号は4桁の数字で入力してください' })
      return
    }
    setChanging(true)
    setPinResult(null)

    // 現在のPINで再認証
    const email = `${household.household_number}@hama.local`
    const { error: verifyError } = await supabase.auth.signInWithPassword({ email, password: currentPin + '@hama' })
    if (verifyError) {
      setPinResult({ ok: false, msg: '現在の暗証番号が正しくありません' })
      setChanging(false)
      return
    }

    // パスワード更新
    const { error: updateError } = await supabase.auth.updateUser({ password: newPin + '@hama' })
    if (updateError) {
      setPinResult({ ok: false, msg: '暗証番号の変更に失敗しました' })
    } else {
      setPinResult({ ok: true, msg: '暗証番号を変更しました' })
      setCurrentPin('')
      setNewPin('')
      setConfirmPin('')
      setShowPinForm(false)
    }
    setChanging(false)
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 space-y-3">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0">
          <User className="w-6 h-6 text-primary-600" />
        </div>
        <div>
          <p className="text-xs text-gray-400">利用者番号</p>
          <p className="font-bold text-gray-900 text-lg leading-tight">{household.household_number}番</p>
          <p className="text-sm text-gray-700">{household.name}</p>
        </div>
      </div>

      <button
        onClick={() => { setShowPinForm(v => !v); setPinResult(null) }}
        className="flex items-center gap-1.5 text-sm text-primary-600 hover:text-primary-700"
      >
        <KeyRound className="w-4 h-4" />
        暗証番号を変更する
        {showPinForm ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
      </button>

      {showPinForm && (
        <form onSubmit={handlePinChange} className="space-y-2 pt-1 border-t border-gray-100">
          <input
            type="password"
            inputMode="numeric"
            maxLength={4}
            value={currentPin}
            onChange={e => setCurrentPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
            placeholder="現在の暗証番号（4桁）"
            className="input-field text-sm"
            required
          />
          <input
            type="password"
            inputMode="numeric"
            maxLength={4}
            value={newPin}
            onChange={e => setNewPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
            placeholder="新しい暗証番号（4桁）"
            className="input-field text-sm"
            required
          />
          <input
            type="password"
            inputMode="numeric"
            maxLength={4}
            value={confirmPin}
            onChange={e => setConfirmPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
            placeholder="新しい暗証番号（確認）"
            className="input-field text-sm"
            required
          />
          {pinResult && (
            <p className={`flex items-center gap-1 text-xs ${pinResult.ok ? 'text-green-600' : 'text-red-500'}`}>
              {pinResult.ok
                ? <CheckCircle className="w-3.5 h-3.5" />
                : <AlertCircle className="w-3.5 h-3.5" />
              }
              {pinResult.msg}
            </p>
          )}
          <div className="flex gap-2">
            <button type="submit" disabled={changing} className="btn-primary text-sm py-1.5">
              {changing ? '変更中...' : '変更する'}
            </button>
            <button type="button" onClick={() => setShowPinForm(false)} className="btn-secondary text-sm py-1.5">
              キャンセル
            </button>
          </div>
        </form>
      )}
    </div>
  )
}

// ---- 申込済みイベント ----

function EventSection({ registrations: initialRegistrations }: { registrations: EventRegistration[] }) {
  const [registrations, setRegistrations] = useState(initialRegistrations)
  const [cancellingId, setCancellingId] = useState<string | null>(null)
  const supabase = createClient()
  const now = new Date().toISOString()

  const handleCancel = async (regId: string, eventTitle: string) => {
    if (!confirm(`「${eventTitle}」の申込をキャンセルしますか？`)) return
    setCancellingId(regId)
    await supabase.from('event_registrations').delete().eq('id', regId)
    setRegistrations(prev => prev.filter(r => r.id !== regId))
    setCancellingId(null)
  }

  return (
    <section className="space-y-2">
      <h2 className="text-sm font-semibold text-gray-700 flex items-center gap-1.5">
        <Calendar className="w-4 h-4 text-gray-400" />
        申込済みイベント
      </h2>
      {registrations.length === 0 ? (
        <p className="text-xs text-gray-400 text-center py-4 bg-white rounded-xl border border-gray-100">
          申込済みのイベントはありません
        </p>
      ) : (
        <div className="space-y-2">
          {registrations.map(r => {
            if (!r.event) return null
            const { adults, children } = parseNotes(r.notes)
            const isFuture = r.event.event_date > now
            return (
              <div key={r.id} className="bg-white rounded-xl border border-gray-200 shadow-sm p-3 flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-gray-800 truncate">{r.event.title}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{formatDate(r.event.event_date)}</p>
                  {r.event.location && (
                    <p className="text-xs text-gray-400">{r.event.location}</p>
                  )}
                  <p className="text-xs text-gray-500 mt-1">
                    大人 {adults}名
                    {children > 0 && `・子供 ${children}名`}
                    （計 {r.attendee_count}名）
                  </p>
                </div>
                {isFuture && (
                  <button
                    onClick={() => handleCancel(r.id, r.event!.title)}
                    disabled={cancellingId === r.id}
                    className="flex-shrink-0 flex items-center gap-1 text-xs text-red-500 hover:text-red-700 px-2 py-1 rounded border border-red-200 hover:border-red-400 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    {cancellingId === r.id ? '...' : 'キャンセル'}
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}

// ---- 送信済み意見・要望 ----

function FeedbackSection({ feedbacks }: { feedbacks: FeedbackItem[] }) {
  return (
    <section className="space-y-2">
      <h2 className="text-sm font-semibold text-gray-700 flex items-center gap-1.5">
        <MessageSquare className="w-4 h-4 text-gray-400" />
        送信済み意見・要望
      </h2>
      {feedbacks.length === 0 ? (
        <p className="text-xs text-gray-400 text-center py-4 bg-white rounded-xl border border-gray-100">
          送信履歴はありません
        </p>
      ) : (
        <div className="space-y-2">
          {feedbacks.map(item => (
            <div key={item.id} className={`bg-white rounded-xl border border-gray-200 shadow-sm p-3 ${item.is_resolved ? 'opacity-70' : ''}`}>
              <div className="flex items-start justify-between gap-2 mb-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${CATEGORY_COLORS[item.category] ?? CATEGORY_COLORS['その他']}`}>
                    {item.category}
                  </span>
                  <span className="text-xs text-gray-400">{formatDatetime(item.created_at)}</span>
                  {item.feedback_replies.length > 0 && (
                    <span className="text-xs font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                      <Mail className="w-3 h-3" />
                      回答あり
                    </span>
                  )}
                </div>
                {item.is_resolved ? (
                  <span className="text-xs font-medium text-green-600 flex items-center gap-0.5 flex-shrink-0">
                    <CheckCircle2 className="w-3 h-3" />
                    対応済み
                  </span>
                ) : (
                  <span className="text-xs text-gray-400 flex items-center gap-0.5 flex-shrink-0">
                    <ClockIcon className="w-3 h-3" />
                    確認中
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-700 line-clamp-2">{item.message}</p>
              {/* 回答表示 */}
              {item.feedback_replies.length > 0 && (
                <div className="mt-2 space-y-1.5">
                  {item.feedback_replies.map(r => (
                    <div key={r.id} className="bg-blue-50 dark:bg-blue-900/30 rounded-lg px-3 py-2 border-l-4 border-blue-400">
                      <p className="text-xs text-blue-600 dark:text-blue-400 font-medium mb-0.5 flex items-center gap-1">
                        <Mail className="w-3 h-3" />
                        {r.replied_by} の回答
                      </p>
                      <p className="text-sm text-gray-800 dark:text-gray-100">{r.reply_text}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

// ---- 回答済みアンケート ----

function SurveySection({ surveys }: { surveys: AnsweredSurvey[] }) {
  const router = useRouter()
  return (
    <section className="space-y-2">
      <h2 className="text-sm font-semibold text-gray-700 flex items-center gap-1.5">
        <BarChart2 className="w-4 h-4 text-gray-400" />
        回答済みアンケート
      </h2>
      {surveys.length === 0 ? (
        <p className="text-xs text-gray-400 text-center py-4 bg-white rounded-xl border border-gray-100">
          回答済みのアンケートはありません
        </p>
      ) : (
        <div className="space-y-2">
          {surveys.map(s => (
            <div key={s.survey_id} className="bg-white rounded-xl border border-gray-200 shadow-sm p-3 flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm text-gray-800 truncate">{s.title}</p>
                <p className="text-xs text-gray-400 mt-0.5">回答日時：{formatDatetime(s.answered_at)}</p>
              </div>
              <button
                onClick={() => router.push('/surveys')}
                className="flex-shrink-0 flex items-center gap-1 text-xs text-orange-600 hover:text-orange-700 px-2 py-1 rounded border border-orange-200 hover:border-orange-400 transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                集計を見る
              </button>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

// ---- ダークモード設定 ----

function DarkModeSettings() {
  const [isDark, setIsDark] = useState(false)

  useEffect(() => {
    setIsDark(document.documentElement.classList.contains('dark'))
  }, [])

  const handleToggle = () => {
    const next = !isDark
    setIsDark(next)
    const html = document.documentElement
    if (next) {
      html.classList.add('dark')
      localStorage.setItem('hama-dark-mode', 'dark')
    } else {
      html.classList.remove('dark')
      localStorage.setItem('hama-dark-mode', 'light')
    }
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
      <h2 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-1.5">
        <Moon className="w-4 h-4 text-gray-400" />
        表示設定
      </h2>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-800">ダークモード</p>
          <p className="text-xs text-gray-400 mt-0.5">{isDark ? 'ダーク（暗い配色）' : 'ライト（明るい配色）'}</p>
        </div>
        <button
          onClick={handleToggle}
          className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors duration-200 focus:outline-none ${
            isDark ? 'bg-indigo-600' : 'bg-gray-300'
          }`}
          aria-label="ダークモード切替"
        >
          <span
            className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform duration-200 ${
              isDark ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
      </div>
    </div>
  )
}

// ---- メインコンポーネント ----

export default function MyPage({
  household,
  registrations,
  feedbacks,
  answeredSurveys,
}: {
  household: Household
  registrations: EventRegistration[]
  feedbacks: FeedbackItem[]
  answeredSurveys: AnsweredSurvey[]
}) {
  return (
    <div className="space-y-4">
<ProfileCard household={household} />
      <DarkModeSettings />
      <EventSection registrations={registrations} />
      <FeedbackSection feedbacks={feedbacks} />
      <SurveySection surveys={answeredSurveys} />
    </div>
  )
}
