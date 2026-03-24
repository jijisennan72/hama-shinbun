'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Plus, Trash2, CalendarDays, ChevronDown, ChevronUp, Users, MapPin, Clock, Paperclip, ExternalLink, X } from 'lucide-react'

interface Registration {
  id: string
  attendee_count: number
  notes: string | null
  created_at: string
  households: { name: string; household_number: string } | null
}

function parseNotes(notes: string | null): { adults: number; children: number } | null {
  if (!notes) return null
  try {
    const parsed = JSON.parse(notes)
    if (typeof parsed.adults === 'number' && typeof parsed.children === 'number') return parsed
  } catch {}
  return null
}

interface Event {
  id: string
  title: string
  description: string | null
  event_date: string
  location: string | null
  max_attendees: number | null
  attachment_url: string | null
  is_active: boolean
  created_at: string
  event_registrations: Registration[]
}

export default function AdminEventManager({ initialEvents }: { initialEvents: Event[] }) {
  const [events, setEvents] = useState(initialEvents)
  const [showCreate, setShowCreate] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [attachingId, setAttachingId] = useState<string | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)

  // フォーム状態
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [eventDate, setEventDate] = useState('')
  const [eventTime, setEventTime] = useState('10:00')
  const [location, setLocation] = useState('')
  const [maxAttendees, setMaxAttendees] = useState('')
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null)

  const supabase = createClient()

  // タイムスタンプ付きパスで upsert を使わずアップロード（UPDATEポリシー不要）
  const uploadAttachment = async (file: File, eventId: string): Promise<{ url: string; path: string } | null> => {
    const path = `event-attachments/${eventId}-${Date.now()}.pdf`
    const { error } = await supabase.storage
      .from('pdf-documents')
      .upload(path, file, { contentType: 'application/pdf' })
    if (error) {
      setUploadError(`アップロード失敗: ${error.message}`)
      return null
    }
    const { data: { publicUrl } } = supabase.storage.from('pdf-documents').getPublicUrl(path)
    return { url: publicUrl, path }
  }

  // Storage上の古いファイルを削除する
  const removeStorageFile = async (attachmentUrl: string) => {
    // URL例: https://xxx.supabase.co/storage/v1/object/public/pdf-documents/event-attachments/xxx.pdf
    const marker = '/pdf-documents/'
    const idx = attachmentUrl.indexOf(marker)
    if (idx !== -1) {
      const path = attachmentUrl.slice(idx + marker.length)
      await supabase.storage.from('pdf-documents').remove([path])
    }
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim() || !eventDate) return
    setCreating(true)
    setUploadError(null)
    const datetimeStr = `${eventDate}T${eventTime}:00`
    const { data: newEvent } = await supabase
      .from('events')
      .insert({
        title: title.trim(),
        description: description.trim() || null,
        event_date: datetimeStr,
        location: location.trim() || null,
        max_attendees: maxAttendees ? parseInt(maxAttendees) : null,
        is_active: true,
      })
      .select('*, event_registrations(id, attendee_count, notes, created_at, households(name, household_number))')
      .single()
    if (newEvent) {
      let finalEvent = { ...newEvent, attachment_url: null as string | null }
      if (attachmentFile) {
        const result = await uploadAttachment(attachmentFile, newEvent.id)
        if (result) {
          await supabase.from('events').update({ attachment_url: result.url }).eq('id', newEvent.id)
          finalEvent = { ...finalEvent, attachment_url: result.url }
        }
      }
      setEvents(prev => [finalEvent, ...prev])
    }
    setTitle('')
    setDescription('')
    setEventDate('')
    setEventTime('10:00')
    setLocation('')
    setMaxAttendees('')
    setAttachmentFile(null)
    setShowCreate(false)
    setCreating(false)
  }

  const handleAttachPdf = async (eventId: string, file: File, oldUrl: string | null) => {
    setAttachingId(eventId)
    setUploadError(null)
    const result = await uploadAttachment(file, eventId)
    if (result) {
      // 古いファイルをStorageから削除
      if (oldUrl) await removeStorageFile(oldUrl)
      const { error } = await supabase.from('events').update({ attachment_url: result.url }).eq('id', eventId)
      if (!error) {
        setEvents(prev => prev.map(e => e.id === eventId ? { ...e, attachment_url: result.url } : e))
      } else {
        setUploadError(`DB更新失敗: ${error.message}`)
      }
    }
    setAttachingId(null)
  }

  const handleRemoveAttachment = async (eventId: string, attachmentUrl: string) => {
    if (!confirm('案内PDFを削除しますか？')) return
    await removeStorageFile(attachmentUrl)
    await supabase.from('events').update({ attachment_url: null }).eq('id', eventId)
    setEvents(prev => prev.map(e => e.id === eventId ? { ...e, attachment_url: null } : e))
  }

  const handleDelete = async (id: string, eventTitle: string) => {
    if (!confirm(`「${eventTitle}」を削除しますか？\n申込データも削除されます。`)) return
    await supabase.from('events').delete().eq('id', id)
    setEvents(prev => prev.filter(e => e.id !== id))
  }

  const toggleActive = async (id: string, current: boolean) => {
    await supabase.from('events').update({ is_active: !current }).eq('id', id)
    setEvents(prev => prev.map(e => e.id === id ? { ...e, is_active: !current } : e))
  }

  return (
    <div className="space-y-4">
      {/* 新規作成ボタン */}
      <button
        onClick={() => { setShowCreate(!showCreate); setUploadError(null) }}
        className="btn-primary flex items-center gap-2"
      >
        <Plus className="w-4 h-4" />
        新規イベントを作成
      </button>

      {uploadError && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
          {uploadError}
        </div>
      )}

      {/* 新規作成フォーム */}
      {showCreate && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <h2 className="font-semibold text-gray-800 mb-4">イベントの新規作成</h2>
          <form onSubmit={handleCreate} className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">タイトル <span className="text-red-500">*</span></label>
              <input
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="例: 夏祭り2024"
                className="input-field"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">内容</label>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                rows={3}
                placeholder="イベントの詳細を入力してください"
                className="input-field resize-none"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">開催日 <span className="text-red-500">*</span></label>
                <input
                  type="date"
                  value={eventDate}
                  onChange={e => setEventDate(e.target.value)}
                  className="input-field"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">開始時刻</label>
                <input
                  type="time"
                  value={eventTime}
                  onChange={e => setEventTime(e.target.value)}
                  className="input-field"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">場所</label>
              <input
                type="text"
                value={location}
                onChange={e => setLocation(e.target.value)}
                placeholder="例: 浜公民館"
                className="input-field"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">定員</label>
              <input
                type="number"
                value={maxAttendees}
                onChange={e => setMaxAttendees(e.target.value)}
                placeholder="例: 50（空欄=制限なし）"
                min={1}
                className="input-field"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">案内PDF（任意）</label>
              <div className="border border-dashed border-gray-200 rounded-lg p-3">
                <input
                  type="file"
                  accept="application/pdf"
                  id="create-attachment"
                  className="hidden"
                  onChange={e => setAttachmentFile(e.target.files?.[0] ?? null)}
                />
                {attachmentFile ? (
                  <div className="flex items-center gap-2 text-sm text-primary-600">
                    <Paperclip className="w-4 h-4 flex-shrink-0" />
                    <span className="truncate flex-1">{attachmentFile.name}</span>
                    <button type="button" onClick={() => setAttachmentFile(null)} className="text-gray-400 hover:text-gray-600">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <label htmlFor="create-attachment" className="flex items-center gap-2 text-sm text-gray-400 cursor-pointer hover:text-gray-600">
                    <Paperclip className="w-4 h-4" />
                    PDFを選択する
                  </label>
                )}
              </div>
            </div>
            <div className="flex gap-2 pt-1">
              <button type="submit" disabled={creating} className="btn-primary">
                {creating ? '作成中...' : '作成する'}
              </button>
              <button type="button" onClick={() => setShowCreate(false)} className="btn-secondary">
                キャンセル
              </button>
            </div>
          </form>
        </div>
      )}

      {/* イベント一覧 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-100 font-semibold text-gray-700">
          イベント一覧（{events.length}件）
        </div>
        {events.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <CalendarDays className="w-8 h-8 mx-auto mb-2" />
            <p className="text-sm">イベントはまだありません</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {events.map(event => {
              const isExpanded = expandedId === event.id
              const registrations = event.event_registrations || []
              const totalAttendees = registrations.reduce((sum, r) => sum + (r.attendee_count || 0), 0)
              const isPast = new Date(event.event_date) < new Date()

              // 大人・子供の合計を notes から集計
              const { totalAdults, totalChildren } = registrations.reduce(
                (acc, r) => {
                  const breakdown = parseNotes(r.notes)
                  if (breakdown) {
                    acc.totalAdults += breakdown.adults
                    acc.totalChildren += breakdown.children
                  } else {
                    // notes がない古いデータは全員大人として扱う
                    acc.totalAdults += r.attendee_count || 0
                  }
                  return acc
                },
                { totalAdults: 0, totalChildren: 0 }
              )
              const remaining = event.max_attendees != null ? event.max_attendees - totalAttendees : null

              return (
                <div key={event.id}>
                  {/* イベント行 */}
                  <div className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold text-gray-800">{event.title}</p>
                          {!event.is_active && (
                            <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">非公開</span>
                          )}
                          {isPast && (
                            <span className="text-xs bg-gray-100 text-gray-400 px-2 py-0.5 rounded-full">終了</span>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-3 mt-1 text-xs text-gray-500">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {new Date(event.event_date).toLocaleString('ja-JP', {
                              year: 'numeric', month: 'numeric', day: 'numeric',
                              weekday: 'short', hour: '2-digit', minute: '2-digit',
                            })}
                          </span>
                          {event.location && (
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              {event.location}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {/* 申込数バッジ */}
                        <span className={`text-xs font-medium px-2 py-1 rounded-lg flex items-center gap-1 ${
                          remaining === 0
                            ? 'bg-red-100 text-red-700'
                            : registrations.length > 0
                            ? 'bg-purple-100 text-purple-700'
                            : 'bg-gray-100 text-gray-500'
                        }`}>
                          <Users className="w-3 h-3" />
                          大人{totalAdults}名・子供{totalChildren}名・合計{totalAttendees}名
                          {remaining !== null && (
                            <> / 定員{event.max_attendees}名・残り{remaining}名</>
                          )}
                        </span>
                        {/* 展開ボタン */}
                        <button
                          onClick={() => setExpandedId(isExpanded ? null : event.id)}
                          className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
                          title="申込者を確認"
                        >
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>
                        {/* 公開/非公開トグル */}
                        <button
                          onClick={() => toggleActive(event.id, event.is_active)}
                          className={`text-xs px-2 py-1 rounded font-medium transition-colors ${
                            event.is_active
                              ? 'bg-green-100 text-green-700 hover:bg-green-200'
                              : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                          }`}
                          title={event.is_active ? '非公開にする' : '公開する'}
                        >
                          {event.is_active ? '公開中' : '非公開'}
                        </button>
                        {/* 削除ボタン */}
                        <button
                          onClick={() => handleDelete(event.id, event.title)}
                          className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded"
                          title="削除"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    {event.description && (
                      <p className="text-sm text-gray-500 mt-1.5">{event.description}</p>
                    )}
                    {/* 案内PDF操作 */}
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      {event.attachment_url ? (
                        <>
                          <a
                            href={event.attachment_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-xs text-primary-600 bg-primary-50 hover:bg-primary-100 px-2 py-1 rounded-full transition-colors"
                          >
                            <ExternalLink className="w-3 h-3" />
                            案内PDFを確認
                          </a>
                          <label className="flex items-center gap-1 text-xs text-gray-500 bg-gray-100 hover:bg-gray-200 px-2 py-1 rounded-full cursor-pointer transition-colors">
                            <Paperclip className="w-3 h-3" />
                            {attachingId === event.id ? '更新中...' : 'PDFを変更'}
                            <input
                              type="file"
                              accept="application/pdf"
                              className="hidden"
                              disabled={attachingId === event.id}
                              onChange={e => { const f = e.target.files?.[0]; if (f) handleAttachPdf(event.id, f, event.attachment_url); e.target.value = '' }}
                            />
                          </label>
                          <button
                            onClick={() => handleRemoveAttachment(event.id, event.attachment_url!)}
                            className="flex items-center gap-1 text-xs text-red-400 hover:text-red-600 px-2 py-1 rounded-full hover:bg-red-50 transition-colors"
                          >
                            <X className="w-3 h-3" />
                            削除
                          </button>
                        </>
                      ) : (
                        <label className="flex items-center gap-1 text-xs text-gray-500 bg-gray-100 hover:bg-gray-200 px-2 py-1 rounded-full cursor-pointer transition-colors">
                          <Paperclip className="w-3 h-3" />
                          {attachingId === event.id ? 'アップロード中...' : '案内PDFを添付'}
                          <input
                            type="file"
                            accept="application/pdf"
                            className="hidden"
                            disabled={attachingId === event.id}
                            onChange={e => { const f = e.target.files?.[0]; if (f) handleAttachPdf(event.id, f, event.attachment_url); e.target.value = '' }}
                          />
                        </label>
                      )}
                    </div>
                  </div>

                  {/* 申込者一覧パネル */}
                  {isExpanded && (
                    <div className="px-4 pb-4 bg-gray-50 border-t border-gray-100">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide pt-3 pb-2">
                        申込者一覧（{registrations.length}件・計{totalAttendees}名）
                      </p>
                      {registrations.length === 0 ? (
                        <p className="text-sm text-gray-400 py-2">申込者はまだいません</p>
                      ) : (
                        <div className="space-y-1.5">
                          {registrations.map((r, i) => (
                            <div key={r.id} className="flex items-center gap-3 bg-white px-3 py-2 rounded-lg border border-gray-100 text-sm">
                              <span className="text-xs text-gray-400 w-5 text-right">{i + 1}.</span>
                              <div className="flex-1">
                                <span className="font-medium text-gray-700">
                                  {r.households?.household_number}番 {r.households?.name}
                                </span>
                              </div>
                              <span className="text-purple-700 font-semibold text-sm">{r.attendee_count}名</span>
                              <span className="text-xs text-gray-400">
                                {new Date(r.created_at).toLocaleDateString('ja-JP', {
                                  month: 'numeric', day: 'numeric',
                                })}申込
                              </span>
                            </div>
                          ))}
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
    </div>
  )
}
