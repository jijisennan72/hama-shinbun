'use client'

import { useState } from 'react'
import { CalendarDays, MapPin, Clock, ChevronLeft, ChevronRight, X } from 'lucide-react'

type Category = '会議' | '清掃' | 'イベント' | 'その他'

interface ScheduleEvent {
  id: string
  title: string
  event_date: string
  event_time: string | null
  location: string | null
  content: string | null
  category: Category
}

const CATEGORY_COLORS: Record<Category, string> = {
  '会議':    'bg-blue-100 text-blue-700',
  '清掃':    'bg-green-100 text-green-700',
  'イベント': 'bg-purple-100 text-purple-700',
  'その他':  'bg-gray-100 text-gray-600',
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

function toDateStr(y: number, m: number, d: number) {
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

function formatDateLabel(dateStr: string) {
  const [y, m, d] = dateStr.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  return date.toLocaleDateString('ja-JP', { month: 'long', day: 'numeric', weekday: 'short' })
}

export default function ScheduleList({ events }: { events: ScheduleEvent[] }) {
  const today = new Date()
  const [calYear, setCalYear] = useState(today.getFullYear())
  const [calMonth, setCalMonth] = useState(today.getMonth())
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [modalEvent, setModalEvent] = useState<ScheduleEvent | null>(null)

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

  const todayStr = toDateStr(today.getFullYear(), today.getMonth(), today.getDate())
  const isCurrentMonth = calYear === today.getFullYear() && calMonth === today.getMonth()

  const eventDates = new Set(events.map(ev => ev.event_date))

  const selectedEvents = selectedDate
    ? events.filter(ev => ev.event_date === selectedDate)
    : []

  const upcomingEvents = events
    .filter(ev => ev.event_date >= todayStr)
    .slice(0, 5)

  // ---- カレンダーグリッド ----
  const WEEKDAYS = ['月', '火', '水', '木', '金', '土', '日']
  const firstDay = new Date(calYear, calMonth, 1)
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate()
  const startOffset = (firstDay.getDay() + 6) % 7  // 月曜始まり

  const cells: (number | null)[] = [
    ...Array(startOffset).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]
  while (cells.length % 7 !== 0) cells.push(null)

  return (
    <div className="space-y-4">
      {/* ---- カレンダー ---- */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        {/* 月ナビ */}
        <div className="flex items-center justify-between mb-3">
          <button
            onClick={prevMonth}
            className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 active:scale-95 transition-transform"
            aria-label="前月"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <span className="font-semibold text-gray-800 text-base">
              {calYear}年{calMonth + 1}月
            </span>
            {!isCurrentMonth && (
              <button
                onClick={() => { setCalYear(today.getFullYear()); setCalMonth(today.getMonth()); setSelectedDate(null) }}
                className="text-xs text-teal-600 bg-teal-50 hover:bg-teal-100 px-2 py-0.5 rounded-full transition-colors"
              >
                今月
              </button>
            )}
          </div>
          <button
            onClick={nextMonth}
            className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 active:scale-95 transition-transform"
            aria-label="翌月"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* 曜日ヘッダー */}
        <div className="grid grid-cols-7 text-center text-xs mb-1">
          {WEEKDAYS.map((w, i) => (
            <div key={w} className={`py-1 font-semibold ${i === 5 ? 'text-blue-500' : i === 6 ? 'text-red-500' : 'text-gray-500'}`}>
              {w}
            </div>
          ))}
        </div>

        {/* 日付グリッド */}
        <div className="grid grid-cols-7 gap-0.5">
          {cells.map((day, idx) => {
            if (!day) return <div key={`e-${idx}`} />
            const dateStr = toDateStr(calYear, calMonth, day)
            const dow = (startOffset + day - 1) % 7  // 0=月…6=日
            const isSat = dow === 5
            const isSunOrHoliday = dow === 6 || HOLIDAYS.has(dateStr)
            const isToday = dateStr === todayStr
            const isSelected = dateStr === selectedDate
            const hasEvent = eventDates.has(dateStr)

            return (
              <button
                key={dateStr}
                onClick={() => setSelectedDate(isSelected ? null : dateStr)}
                className={`relative flex flex-col items-center py-2 rounded-lg text-sm font-medium transition-colors ${
                  isSelected
                    ? 'bg-teal-600 text-white'
                    : isToday
                    ? 'day-today ring-1 ring-teal-400'
                    : 'hover:bg-gray-100 active:bg-gray-200'
                } ${
                  !isSelected && isSat ? 'text-blue-600' :
                  !isSelected && isSunOrHoliday ? 'text-red-600' :
                  !isSelected ? 'text-gray-700' : ''
                }`}
              >
                {day}
                {hasEvent && (
                  <span className={`w-1.5 h-1.5 rounded-full mt-0.5 ${isSelected ? 'bg-white' : 'bg-teal-500'}`} />
                )}
              </button>
            )
          })}
        </div>

        {selectedDate && (
          <p className="text-xs text-teal-600 text-center mt-3">
            {formatDateLabel(selectedDate)} を表示中
            <button onClick={() => setSelectedDate(null)} className="ml-2 underline">
              選択解除
            </button>
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
                <button
                  key={ev.id}
                  onClick={() => setModalEvent(ev)}
                  className="flex items-center gap-3 px-4 py-3 w-full text-left hover:bg-gray-50 active:bg-gray-100 transition-colors"
                >
                  <div className="flex-shrink-0 text-center w-12">
                    <p className="text-xs text-gray-400">{m}月</p>
                    <p className="text-xl font-bold text-gray-800 leading-tight">{d}</p>
                    <p className={`text-xs font-medium ${isSat ? 'text-blue-500' : isSun ? 'text-red-500' : 'text-gray-500'}`}>
                      ({dow})
                    </p>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                      <span className={`text-xs font-medium px-1.5 py-0.5 rounded-full ${CATEGORY_COLORS[ev.category] ?? CATEGORY_COLORS['その他']}`}>
                        {ev.category}
                      </span>
                      {ev.event_time && (
                        <span className="text-xs text-gray-400 flex items-center gap-0.5">
                          <Clock className="w-3 h-3" />{ev.event_time}
                        </span>
                      )}
                    </div>
                    <p className="text-sm font-semibold text-gray-800 truncate">{ev.title}</p>
                    {ev.location && (
                      <p className="text-xs text-gray-400 flex items-center gap-0.5 mt-0.5 truncate">
                        <MapPin className="w-3 h-3 flex-shrink-0" />{ev.location}
                      </p>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* ---- 選択日の予定一覧 ---- */}
      {selectedDate && (
        <div className="space-y-3">
          <p className="text-sm font-semibold text-gray-700 px-1">
            {formatDateLabel(selectedDate)}の予定
          </p>
          {selectedEvents.length === 0 ? (
            <div className="card text-center py-6 text-gray-400">
              <CalendarDays className="w-7 h-7 mx-auto mb-1.5" />
              <p className="text-sm">この日の予定はありません</p>
            </div>
          ) : (
            selectedEvents.map(ev => (
              <div key={ev.id} className="card">
                <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${CATEGORY_COLORS[ev.category] ?? CATEGORY_COLORS['その他']}`}>
                    {ev.category}
                  </span>
                  {ev.event_time && (
                    <span className="text-xs text-gray-500 flex items-center gap-1">
                      <Clock className="w-3 h-3" />{ev.event_time}
                    </span>
                  )}
                </div>
                <p className="font-semibold text-gray-800 text-sm">{ev.title}</p>
                <div className="mt-1 space-y-0.5">
                  {ev.location && (
                    <p className="text-xs text-gray-500 flex items-center gap-1">
                      <MapPin className="w-3 h-3" />{ev.location}
                    </p>
                  )}
                  {ev.content && (
                    <p className="text-xs text-gray-600 mt-1">{ev.content}</p>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* 日付未選択時のガイド */}
      {!selectedDate && (
        <p className="text-xs text-center text-gray-400 py-2">
          日付をタップするとその日の予定が表示されます
        </p>
      )}

      {/* ---- 詳細モーダル ---- */}
      {modalEvent && (() => {
        const [my, mm, md] = modalEvent.event_date.split('-').map(Number)
        const mdate = new Date(my, mm - 1, md)
        const mdow = ['日','月','火','水','木','金','土'][mdate.getDay()]
        const isMSat = mdate.getDay() === 6
        const isMSun = mdate.getDay() === 0 || HOLIDAYS.has(modalEvent.event_date)
        return (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60"
            onClick={() => setModalEvent(null)}
          >
            <div
              className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden"
              onClick={e => e.stopPropagation()}
            >
              {/* ヘッダー */}
              <div className="flex items-start justify-between gap-2 px-5 pt-5 pb-3">
                <h2 className="font-bold text-gray-900 text-base leading-snug flex-1">
                  {modalEvent.title}
                </h2>
                <button
                  onClick={() => setModalEvent(null)}
                  className="flex-shrink-0 p-1 rounded-full hover:bg-gray-100 text-gray-400 transition-colors"
                  aria-label="閉じる"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* 詳細 */}
              <div className="px-5 pb-5 space-y-2.5">
                {/* カテゴリ */}
                <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full ${CATEGORY_COLORS[modalEvent.category] ?? CATEGORY_COLORS['その他']}`}>
                  {modalEvent.category}
                </span>

                {/* 日付 */}
                <div className="flex items-center gap-2 text-sm text-gray-700">
                  <CalendarDays className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  <span>
                    {my}年{mm}月{md}日
                    <span className={`ml-1 font-medium ${isMSat ? 'text-blue-500' : isMSun ? 'text-red-500' : 'text-gray-500'}`}>
                      ({mdow})
                    </span>
                  </span>
                </div>

                {/* 時間 */}
                {modalEvent.event_time && (
                  <div className="flex items-center gap-2 text-sm text-gray-700">
                    <Clock className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    <span>{modalEvent.event_time}</span>
                  </div>
                )}

                {/* 場所 */}
                {modalEvent.location && (
                  <div className="flex items-center gap-2 text-sm text-gray-700">
                    <MapPin className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    <span>{modalEvent.location}</span>
                  </div>
                )}

                {/* 内容 */}
                {modalEvent.content && (
                  <div className="pt-1 border-t border-gray-100">
                    <p className="text-xs text-gray-500 mb-1">内容</p>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{modalEvent.content}</p>
                  </div>
                )}

                <button
                  onClick={() => setModalEvent(null)}
                  className="w-full mt-1 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium transition-colors"
                >
                  閉じる
                </button>
              </div>
            </div>
          </div>
        )
      })()}
    </div>
  )
}
