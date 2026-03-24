'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Calendar, MapPin, Users, CheckCircle, FileText, ChevronDown, ChevronUp } from 'lucide-react'

interface MyRegistration {
  id: string
  attendee_count: number
  notes: string | null
}

interface Event {
  id: string
  title: string
  description: string | null
  event_date: string
  location: string | null
  max_attendees: number | null
  attachment_url: string | null
  is_registered: boolean
  my_registration: MyRegistration | null
  current_attendees: number
}

interface AttendeeInput {
  adults: number
  children: number
}

function parseNotes(notes: string | null): { adults: number; children: number } | null {
  if (!notes) return null
  try {
    const parsed = JSON.parse(notes)
    if (typeof parsed.adults === 'number' && typeof parsed.children === 'number') return parsed
  } catch {}
  return null
}

export default function EventList({ events, householdId }: { events: Event[]; householdId: string | undefined }) {
  const [localEvents, setLocalEvents] = useState(events)
  const [registering, setRegistering] = useState<string | null>(null)
  const [cancelling, setCancelling] = useState<string | null>(null)
  const [attendeeInputs, setAttendeeInputs] = useState<Record<string, AttendeeInput>>({})
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())

  const toggleExpand = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }
  const supabase = createClient()

  const getInput = (eventId: string): AttendeeInput =>
    attendeeInputs[eventId] ?? { adults: 1, children: 0 }

  const setInput = (eventId: string, patch: Partial<AttendeeInput>) => {
    setAttendeeInputs(prev => ({
      ...prev,
      [eventId]: { ...getInput(eventId), ...patch },
    }))
  }

  const setError = (eventId: string, msg: string) =>
    setErrors(prev => ({ ...prev, [eventId]: msg }))

  const clearError = (eventId: string) =>
    setErrors(prev => { const next = { ...prev }; delete next[eventId]; return next })

  const register = async (eventId: string) => {
    if (!householdId) return
    const { adults, children } = getInput(eventId)
    const total = adults + children
    if (total < 1) return
    setRegistering(eventId)
    clearError(eventId)

    // 既存申込があれば UPDATE、なければ INSERT（duplicate key 回避）
    const { error: upsertError } = await supabase
      .from('event_registrations')
      .upsert(
        {
          event_id: eventId,
          household_id: householdId,
          attendee_count: total,
          notes: JSON.stringify({ adults, children }),
        },
        { onConflict: 'event_id,household_id' }
      )

    if (upsertError) {
      setError(eventId, `申込に失敗しました：${upsertError.message}`)
      setRegistering(null)
      return
    }

    // upsert 後にレコードを取得
    const { data: reg, error: selectError } = await supabase
      .from('event_registrations')
      .select('id, attendee_count, notes')
      .eq('event_id', eventId)
      .eq('household_id', householdId)
      .single()

    if (selectError || !reg) {
      setError(eventId, '申込は完了しましたが、表示の更新に失敗しました。ページを再読み込みしてください。')
      setRegistering(null)
      return
    }

    setLocalEvents(prev =>
      prev.map(e => {
        if (e.id !== eventId) return e
        // UPDATE の場合は旧人数を引いてから新人数を足す
        const oldCount = e.my_registration?.attendee_count ?? 0
        const newCurrentAttendees = e.current_attendees - oldCount + total
        return {
          ...e,
          is_registered: true,
          my_registration: { id: reg.id, attendee_count: reg.attendee_count, notes: reg.notes },
          current_attendees: newCurrentAttendees,
        }
      })
    )
    setRegistering(null)
  }

  const cancelRegistration = async (eventId: string, regId: string, attendeeCount: number) => {
    if (!confirm('本当にキャンセルしますか？')) return
    setCancelling(eventId)
    clearError(eventId)
    const { error, count } = await supabase
      .from('event_registrations')
      .delete({ count: 'exact' })
      .eq('id', regId)
    if (error) {
      setError(eventId, `キャンセルに失敗しました：${error.message}`)
    } else if (count === 0) {
      // RLS ポリシーが DELETE を拒否した場合、error は null だが行が削除されない
      setError(eventId, 'キャンセルできませんでした。権限がないか、既にキャンセル済みです。')
    } else {
      setLocalEvents(prev =>
        prev.map(e =>
          e.id === eventId
            ? {
                ...e,
                is_registered: false,
                my_registration: null,
                current_attendees: Math.max(0, e.current_attendees - attendeeCount),
              }
            : e
        )
      )
    }
    setCancelling(null)
  }

  if (localEvents.length === 0) {
    return (
      <div className="card text-center py-8 text-gray-400">
        <Calendar className="w-8 h-8 mx-auto mb-2" />
        <p className="text-sm">開催予定のイベントはありません</p>
      </div>
    )
  }

  const countOptions = Array.from({ length: 6 }, (_, i) => i) // 0〜5

  return (
    <div className="space-y-3">
      {localEvents.map(event => {
        const { adults, children } = getInput(event.id)
        const total = adults + children
        const isFull = event.max_attendees !== null && event.current_attendees >= event.max_attendees
        const myBreakdown = event.my_registration ? parseNotes(event.my_registration.notes) : null

          const isExpanded = expandedIds.has(event.id)
        const stop = (e: React.MouseEvent) => e.stopPropagation()

        return (
          <div
            key={event.id}
            className="card cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => toggleExpand(event.id)}
          >
            {/* ---- 常に表示：ヘッダー行 ---- */}
            <div className="flex items-start gap-2">
              <div className="flex-1 min-w-0">
                {event.is_registered && (
                  <div className="flex items-center gap-1 text-green-600 text-xs font-medium mb-1">
                    <CheckCircle className="w-3.5 h-3.5" />
                    申込済み
                    {myBreakdown ? (
                      <span className="text-gray-500 font-normal">
                        （大人{myBreakdown.adults}名・子供{myBreakdown.children}名）
                      </span>
                    ) : event.my_registration ? (
                      <span className="text-gray-500 font-normal">
                        （{event.my_registration.attendee_count}名）
                      </span>
                    ) : null}
                  </div>
                )}
                <p className="font-semibold text-gray-800">{event.title}</p>
                <div className="flex flex-wrap gap-3 mt-1.5 text-xs text-gray-500">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    {new Date(event.event_date).toLocaleString('ja-JP', {
                      month: 'long', day: 'numeric', weekday: 'short',
                      hour: '2-digit', minute: '2-digit',
                    })}
                  </span>
                  {event.location && (
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5" />
                      {event.location}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex-shrink-0 text-gray-400 mt-0.5">
                {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </div>
            </div>

            {/* ---- 展開時のみ表示 ---- */}
            {isExpanded && (
              <div onClick={stop}>
                {event.description && (
                  <p className="text-sm text-gray-600 mt-3">{event.description}</p>
                )}

                {/* 案内PDF */}
                {event.attachment_url && (
                  <a
                    href={event.attachment_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 mt-2 text-xs text-primary-600 bg-primary-50 hover:bg-primary-100 px-3 py-1.5 rounded-full transition-colors"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    📄 案内を見る
                  </a>
                )}

                {/* 申込状況バー */}
                {event.max_attendees ? (
                  <div className="mt-3">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="flex items-center gap-1 text-gray-500">
                        <Users className="w-3.5 h-3.5" />
                        申込状況
                      </span>
                      <span className={`font-semibold ${isFull ? 'text-red-600' : 'text-gray-700'}`}>
                        {event.current_attendees}名 / 定員{event.max_attendees}名
                        {isFull && '　満員'}
                      </span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-1.5">
                      <div
                        className={`h-1.5 rounded-full transition-all ${isFull ? 'bg-red-400' : 'bg-primary-500'}`}
                        style={{ width: `${Math.min(100, (event.current_attendees / event.max_attendees) * 100)}%` }}
                      />
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-gray-500 mt-3 flex items-center gap-1">
                    <Users className="w-3.5 h-3.5" />
                    申込状況：{event.current_attendees}名（定員なし）
                  </p>
                )}

                {/* エラーメッセージ */}
                {errors[event.id] && (
                  <p className="mt-2 text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">
                    {errors[event.id]}
                  </p>
                )}

                {/* キャンセルボタン */}
                {event.is_registered && event.my_registration && (
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <button
                      onClick={() => cancelRegistration(event.id, event.my_registration!.id, event.my_registration!.attendee_count)}
                      disabled={cancelling === event.id}
                      className="text-xs text-red-500 hover:text-red-700 hover:underline disabled:opacity-50"
                    >
                      {cancelling === event.id ? 'キャンセル中...' : '申込をキャンセルする'}
                    </button>
                  </div>
                )}

                {/* 申込フォーム */}
                {!event.is_registered && !isFull && (
                  <div className="mt-3 pt-3 border-t border-gray-100 space-y-2">
                    <p className="text-xs font-medium text-gray-600">参加人数を選択</p>
                    <div className="flex flex-wrap gap-3">
                      <label className="flex items-center gap-1.5 text-sm text-gray-700">
                        大人
                        <select
                          value={adults}
                          onChange={e => setInput(event.id, { adults: parseInt(e.target.value) })}
                          className="border border-gray-200 rounded px-1.5 py-0.5 text-sm"
                        >
                          {countOptions.map(n => (
                            <option key={n} value={n}>{n}名</option>
                          ))}
                        </select>
                      </label>
                      <label className="flex items-center gap-1.5 text-sm text-gray-700">
                        子供
                        <select
                          value={children}
                          onChange={e => setInput(event.id, { children: parseInt(e.target.value) })}
                          className="border border-gray-200 rounded px-1.5 py-0.5 text-sm"
                        >
                          {countOptions.map(n => (
                            <option key={n} value={n}>{n}名</option>
                          ))}
                        </select>
                      </label>
                      {total > 0 && (
                        <span className="text-xs text-gray-400 self-center">合計 {total}名</span>
                      )}
                    </div>
                    <button
                      onClick={() => register(event.id)}
                      disabled={registering === event.id || total < 1}
                      className="btn-primary text-sm py-1.5 px-4"
                    >
                      {registering === event.id ? '申込中...' : '申し込む'}
                    </button>
                    {total < 1 && (
                      <p className="text-xs text-red-500">大人・子供いずれかを1名以上選択してください</p>
                    )}
                  </div>
                )}

                {!event.is_registered && isFull && (
                  <div className="mt-3 text-sm text-red-500 font-medium">
                    定員に達したため申込を締め切りました
                  </div>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
