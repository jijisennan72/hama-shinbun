'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Plus, Trash2, CalendarDays, Pencil, X, Check, ChevronLeft, ChevronRight } from 'lucide-react'

const CATEGORIES = ['会議', '清掃', 'イベント', 'その他'] as const
type Category = typeof CATEGORIES[number]

const CATEGORY_COLORS: Record<Category, string> = {
  '会議':   'bg-blue-100 text-blue-700',
  '清掃':   'bg-green-100 text-green-700',
  'イベント': 'bg-purple-100 text-purple-700',
  'その他': 'bg-gray-100 text-gray-600',
}

// 祝日（2025〜2026）
const HOLIDAYS = new Set([
  '2025-01-01','2025-01-13','2025-02-11','2025-02-23','2025-02-24',
  '2025-03-20','2025-04-29','2025-05-03','2025-05-04','2025-05-05',
  '2025-05-06','2025-07-21','2025-08-11','2025-09-15','2025-09-23',
  '2025-10-13','2025-11-03','2025-11-23','2025-11-24',
  '2026-01-01','2026-01-12','2026-02-11','2026-02-23',
  '2026-03-20','2026-04-29','2026-05-03','2026-05-04','2026-05-05',
  '2026-05-06','2026-07-20','2026-08-11','2026-09-21','2026-09-22','2026-09-23',
  '2026-10-12','2026-11-03','2026-11-23',
])

interface ScheduleEvent {
  id: string
  title: string
  event_date: string
  event_time: string | null
  location: string | null
  content: string | null
  category: Category
  created_at: string
}

type DraftEvent = Omit<ScheduleEvent, 'id' | 'created_at'>

const emptyDraft = (): DraftEvent => ({
  title: '',
  event_date: '',
  event_time: '',
  location: '',
  content: '',
  category: '会議',
})

function formatDate(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' })
}

function toDateStr(y: number, m: number, d: number) {
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

// ---- カレンダーコンポーネント ----
function CalendarView({
  year, month, eventDates, selectedDate, onSelectDate, onDoubleClickDate,
}: {
  year: number
  month: number  // 0-indexed
  eventDates: Set<string>
  selectedDate: string | null
  onSelectDate: (d: string | null) => void
  onDoubleClickDate: (d: string) => void
}) {
  const WEEKDAYS = ['月', '火', '水', '木', '金', '土', '日']
  const firstDay = new Date(year, month, 1)
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  // 月曜始まり: 月=0,火=1,...,日=6
  const startOffset = (firstDay.getDay() + 6) % 7

  const cells: (number | null)[] = [
    ...Array(startOffset).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]
  // 6行になるよう末尾を埋める
  while (cells.length % 7 !== 0) cells.push(null)

  const todayStr = toDateStr(new Date().getFullYear(), new Date().getMonth(), new Date().getDate())

  return (
    <div>
      <div className="grid grid-cols-7 text-center text-xs mb-1">
        {WEEKDAYS.map((w, i) => (
          <div key={w} className={`py-1 font-semibold ${i === 5 ? 'text-blue-500' : i === 6 ? 'text-red-500' : 'text-gray-500'}`}>
            {w}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-0.5">
        {cells.map((day, idx) => {
          if (!day) return <div key={`e-${idx}`} />
          const dateStr = toDateStr(year, month, day)
          const dow = (startOffset + day - 1) % 7 // 0=月...6=日
          const isSat = dow === 5
          const isSunOrHoliday = dow === 6 || HOLIDAYS.has(dateStr)
          const isToday = dateStr === todayStr
          const isSelected = dateStr === selectedDate
          const hasEvent = eventDates.has(dateStr)

          return (
            <button
              key={dateStr}
              onClick={() => onSelectDate(isSelected ? null : dateStr)}
              onDoubleClick={() => onDoubleClickDate(dateStr)}
              className={`relative flex flex-col items-center py-1.5 rounded-lg text-xs font-medium transition-colors ${
                isSelected
                  ? 'bg-primary-600 text-white'
                  : isToday
                  ? 'bg-primary-50 ring-1 ring-primary-400'
                  : 'hover:bg-gray-100'
              } ${
                !isSelected && isSat ? 'text-blue-600' :
                !isSelected && isSunOrHoliday ? 'text-red-600' :
                !isSelected ? 'text-gray-700' : ''
              }`}
            >
              {day}
              {hasEvent && (
                <span className={`w-1 h-1 rounded-full mt-0.5 ${isSelected ? 'bg-white' : 'bg-primary-500'}`} />
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ---- メインコンポーネント ----
export default function AdminScheduleManager({ initialEvents }: { initialEvents: ScheduleEvent[] }) {
  const [events, setEvents] = useState(initialEvents)
  const [showCreate, setShowCreate] = useState(false)
  const [draft, setDraft] = useState<DraftEvent>(emptyDraft())
  const [creating, setCreating] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editDraft, setEditDraft] = useState<DraftEvent>(emptyDraft())
  const [saving, setSaving] = useState(false)

  // カレンダー用ステート
  const today = new Date()
  const [calYear, setCalYear] = useState(today.getFullYear())
  const [calMonth, setCalMonth] = useState(today.getMonth())
  const [selectedDate, setSelectedDate] = useState<string | null>(null)

  // モーダル用ステート
  const [modalDate, setModalDate] = useState<string | null>(null)
  const [modalDraft, setModalDraft] = useState<DraftEvent>(emptyDraft())
  const [modalCreating, setModalCreating] = useState(false)

  const openModal = (dateStr: string) => {
    setModalDraft({ ...emptyDraft(), event_date: dateStr })
    setModalDate(dateStr)
  }
  const closeModal = () => {
    setModalDate(null)
    setModalDraft(emptyDraft())
  }
  const patchModal = (key: keyof DraftEvent, val: string) =>
    setModalDraft(prev => ({ ...prev, [key]: val }))

  const handleModalCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!modalDraft.title.trim() || !modalDraft.event_date) return
    setModalCreating(true)
    const payload = {
      title: modalDraft.title.trim(),
      event_date: modalDraft.event_date,
      event_time: modalDraft.event_time || null,
      location: modalDraft.location?.trim() || null,
      content: modalDraft.content?.trim() || null,
      category: modalDraft.category,
    }
    const { data } = await supabase.from('schedule_events').insert(payload).select().single()
    if (data) setEvents(prev => [...prev, data].sort((a, b) => a.event_date.localeCompare(b.event_date)))
    setModalCreating(false)
    closeModal()
  }

  const supabase = createClient()

  const patch = (key: keyof DraftEvent, val: string) =>
    setDraft(prev => ({ ...prev, [key]: val }))

  const patchEdit = (key: keyof DraftEvent, val: string) =>
    setEditDraft(prev => ({ ...prev, [key]: val }))

  // 月移動
  const prevMonth = () => {
    setSelectedDate(null)
    if (calMonth === 0) { setCalYear(y => y - 1); setCalMonth(11) }
    else setCalMonth(m => m - 1)
  }
  const nextMonth = () => {
    setSelectedDate(null)
    if (calMonth === 11) { setCalYear(y => y + 1); setCalMonth(0) }
    else setCalMonth(m => m + 1)
  }
  const goToday = () => {
    setCalYear(today.getFullYear())
    setCalMonth(today.getMonth())
    setSelectedDate(null)
  }

  // 表示する予定：日付選択中はその日のみ、未選択は表示月の全件
  const visibleEvents = selectedDate
    ? events.filter(ev => ev.event_date === selectedDate)
    : events.filter(ev => {
        const [y, m] = ev.event_date.split('-').map(Number)
        return y === calYear && m === calMonth + 1
      })

  // カレンダーに渡す「予定あり日付」Set
  const eventDates = new Set(events.map(ev => ev.event_date))

  const todayStr = toDateStr(today.getFullYear(), today.getMonth(), today.getDate())
  const upcomingEvents = events
    .filter(ev => ev.event_date >= todayStr)
    .slice(0, 5)

  // ---- 作成 ----
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!draft.title.trim() || !draft.event_date) return
    setCreating(true)
    const payload = {
      title: draft.title.trim(),
      event_date: draft.event_date,
      event_time: draft.event_time || null,
      location: draft.location?.trim() || null,
      content: draft.content?.trim() || null,
      category: draft.category,
    }
    const { data } = await supabase.from('schedule_events').insert(payload).select().single()
    if (data) setEvents(prev => [...prev, data].sort((a, b) => a.event_date.localeCompare(b.event_date)))
    setDraft(emptyDraft())
    setShowCreate(false)
    setCreating(false)
  }

  // ---- 編集開始 ----
  const startEdit = (ev: ScheduleEvent) => {
    setEditingId(ev.id)
    setEditDraft({
      title: ev.title,
      event_date: ev.event_date,
      event_time: ev.event_time ?? '',
      location: ev.location ?? '',
      content: ev.content ?? '',
      category: ev.category,
    })
  }

  // ---- 編集保存 ----
  const handleSave = async (id: string) => {
    setSaving(true)
    const payload = {
      title: editDraft.title.trim(),
      event_date: editDraft.event_date,
      event_time: editDraft.event_time || null,
      location: editDraft.location?.trim() || null,
      content: editDraft.content?.trim() || null,
      category: editDraft.category,
    }
    const { data } = await supabase.from('schedule_events').update(payload).eq('id', id).select().single()
    if (data) {
      setEvents(prev => prev.map(ev => ev.id === id ? data : ev).sort((a, b) => a.event_date.localeCompare(b.event_date)))
    }
    setEditingId(null)
    setSaving(false)
  }

  // ---- 削除 ----
  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`「${title}」を削除しますか？`)) return
    await supabase.from('schedule_events').delete().eq('id', id)
    setEvents(prev => prev.filter(ev => ev.id !== id))
  }

  return (
    <div className="space-y-4">
      {/* 作成ボタン */}
      <button onClick={() => setShowCreate(!showCreate)} className="btn-primary flex items-center gap-2">
        <Plus className="w-4 h-4" />
        予定を追加
      </button>

      {/* 作成フォーム */}
      {showCreate && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <h2 className="font-semibold text-gray-800 mb-4">新規予定の追加</h2>
          <form onSubmit={handleCreate} className="space-y-3">
            <EventForm draft={draft} patch={patch} />
            <div className="flex gap-2 pt-1">
              <button type="submit" disabled={creating} className="btn-primary">
                {creating ? '作成中...' : '作成する'}
              </button>
              <button type="button" onClick={() => { setShowCreate(false); setDraft(emptyDraft()) }} className="btn-secondary">
                キャンセル
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ---- カレンダー ---- */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        {/* ヘッダー：月ナビ */}
        <div className="flex items-center justify-between mb-3">
          <button onClick={prevMonth} className="p-1.5 rounded hover:bg-gray-100 text-gray-500">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-2">
            <span className="font-semibold text-gray-800">{calYear}年{calMonth + 1}月</span>
            {(calYear !== today.getFullYear() || calMonth !== today.getMonth()) && (
              <button
                onClick={goToday}
                className="text-xs text-primary-600 bg-primary-50 hover:bg-primary-100 px-2 py-0.5 rounded-full transition-colors"
              >
                今月
              </button>
            )}
          </div>
          <button onClick={nextMonth} className="p-1.5 rounded hover:bg-gray-100 text-gray-500">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <CalendarView
          year={calYear}
          month={calMonth}
          eventDates={eventDates}
          selectedDate={selectedDate}
          onSelectDate={setSelectedDate}
          onDoubleClickDate={openModal}
        />

        {selectedDate && (
          <p className="text-xs text-primary-600 text-center mt-2">
            {selectedDate} の予定を表示中
            <button onClick={() => setSelectedDate(null)} className="ml-2 underline">すべて表示</button>
          </p>
        )}
      </div>

      {/* ---- 直近の予定（最大5件） ---- */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100">
          <p className="font-semibold text-gray-700 text-sm">直近の予定</p>
        </div>
        {upcomingEvents.length === 0 ? (
          <div className="text-center py-6 text-gray-400 text-sm">
            今後の予定はありません
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {upcomingEvents.map(ev => {
              const [y, m, d] = ev.event_date.split('-').map(Number)
              const date = new Date(y, m - 1, d)
              const dow = ['日','月','火','水','木','金','土'][date.getDay()]
              const isSat = date.getDay() === 6
              const isSun = date.getDay() === 0 || HOLIDAYS.has(ev.event_date)
              return (
                <div key={ev.id} className="flex items-center gap-3 px-4 py-3">
                  <div className="flex-shrink-0 text-center w-12">
                    <p className="text-xs text-gray-400">{m}月</p>
                    <p className="text-xl font-bold text-gray-800 leading-tight">{d}</p>
                    <p className={`text-xs font-medium ${isSat ? 'text-blue-500' : isSun ? 'text-red-600' : 'text-gray-500'}`}>
                      ({dow})
                    </p>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                      <span className={`text-xs font-medium px-1.5 py-0.5 rounded-full ${CATEGORY_COLORS[ev.category] ?? CATEGORY_COLORS['その他']}`}>
                        {ev.category}
                      </span>
                      {ev.event_time && (
                        <p className="text-xs text-gray-400">🕐 {ev.event_time}</p>
                      )}
                    </div>
                    <p className="text-sm font-semibold text-gray-800 truncate">{ev.title}</p>
                    {ev.location && (
                      <p className="text-xs text-gray-400 mt-0.5 truncate">📍 {ev.location}</p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ---- 予定一覧 ---- */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-100 font-semibold text-gray-700">
          {selectedDate
            ? `${selectedDate} の予定（${visibleEvents.length}件）`
            : `${calYear}年${calMonth + 1}月の予定（${visibleEvents.length}件）`
          }
        </div>
        {visibleEvents.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <CalendarDays className="w-8 h-8 mx-auto mb-2" />
            <p className="text-sm">予定がありません</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {visibleEvents.map(ev => (
              <div key={ev.id} className="p-4">
                {editingId === ev.id ? (
                  <div className="space-y-3">
                    <EventForm draft={editDraft} patch={patchEdit} />
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleSave(ev.id)}
                        disabled={saving}
                        className="flex items-center gap-1 text-sm bg-green-600 text-white px-3 py-1.5 rounded-lg hover:bg-green-700 disabled:opacity-50"
                      >
                        <Check className="w-4 h-4" />{saving ? '保存中...' : '保存'}
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="flex items-center gap-1 text-sm text-gray-500 bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-lg"
                      >
                        <X className="w-4 h-4" />キャンセル
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${CATEGORY_COLORS[ev.category] ?? CATEGORY_COLORS['その他']}`}>
                          {ev.category}
                        </span>
                        <span className="text-xs text-gray-500">{formatDate(ev.event_date)}{ev.event_time ? ` ${ev.event_time}` : ''}</span>
                      </div>
                      <p className="font-semibold text-gray-800">{ev.title}</p>
                      {ev.location && <p className="text-xs text-gray-500 mt-0.5">📍 {ev.location}</p>}
                      {ev.content && <p className="text-sm text-gray-600 mt-1">{ev.content}</p>}
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button onClick={() => startEdit(ev)} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded" title="編集">
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDelete(ev.id, ev.title)} className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded" title="削除">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ---- モーダル（ダブルクリックで日付指定作成） ---- */}
      {modalDate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* オーバーレイ */}
          <div className="absolute inset-0 bg-black/40" onClick={closeModal} />
          {/* ダイアログ */}
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-gray-800">
                {formatDate(modalDate)} の予定を追加
              </h2>
              <button onClick={closeModal} className="p-1.5 rounded hover:bg-gray-100 text-gray-400">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleModalCreate} className="space-y-3">
              <EventForm draft={modalDraft} patch={patchModal} />
              <div className="flex gap-2 pt-1">
                <button type="submit" disabled={modalCreating} className="btn-primary">
                  {modalCreating ? '作成中...' : '作成する'}
                </button>
                <button type="button" onClick={closeModal} className="btn-secondary">
                  キャンセル
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

// ---- 共通フォームフィールド ----
function EventForm({ draft, patch }: { draft: DraftEvent; patch: (k: keyof DraftEvent, v: string) => void }) {
  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">タイトル <span className="text-red-500">*</span></label>
          <input type="text" value={draft.title} onChange={e => patch('title', e.target.value)} placeholder="例：浜区定例会議" className="input-field" required />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">日付 <span className="text-red-500">*</span></label>
          <input type="date" value={draft.event_date} onChange={e => patch('event_date', e.target.value)} className="input-field" required />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">時間（任意）</label>
          <input type="time" value={draft.event_time ?? ''} onChange={e => patch('event_time', e.target.value)} className="input-field" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">カテゴリ</label>
          <select value={draft.category} onChange={e => patch('category', e.target.value)} className="input-field">
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">場所（任意）</label>
          <input type="text" value={draft.location ?? ''} onChange={e => patch('location', e.target.value)} placeholder="例：集会所" className="input-field" />
        </div>
        <div className="col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">内容（任意）</label>
          <textarea value={draft.content ?? ''} onChange={e => patch('content', e.target.value)} rows={2} placeholder="詳細な内容を入力" className="input-field resize-none" />
        </div>
      </div>
    </>
  )
}
