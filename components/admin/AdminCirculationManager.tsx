'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Plus, Trash2, ClipboardList, ChevronDown, ChevronUp, Users, CheckCircle, Clock, FileText, Upload } from 'lucide-react'

interface ReadRecord {
  household_id: string
  read_at: string
  households: { name: string; household_number: string } | null
}

interface CirculationItem {
  id: string
  title: string
  content: string | null
  file_url: string | null
  created_at: string
  circulation_reads: ReadRecord[]
}

interface Household {
  id: string
  name: string
  household_number: string
}

interface Props {
  initialItems: CirculationItem[]
  households: Household[]
}

export default function AdminCirculationManager({ initialItems, households }: Props) {
  const [items, setItems] = useState(initialItems)
  const [showCreate, setShowCreate] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null)
  const [creating, setCreating] = useState(false)
  const [uploadingId, setUploadingId] = useState<string | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const supabase = createClient()

  // ---- 添付ファイル操作 ----

  const uploadAttachment = async (file: File, itemId: string): Promise<string | null> => {
    const path = `circulation-attachments/${itemId}-${Date.now()}.pdf`
    const { error } = await supabase.storage.from('pdf-documents').upload(path, file, { contentType: 'application/pdf' })
    if (error) { setUploadError(`アップロード失敗: ${error.message}`); return null }
    const { data: { publicUrl } } = supabase.storage.from('pdf-documents').getPublicUrl(path)
    return publicUrl
  }

  const removeStorageFile = async (fileUrl: string) => {
    const marker = '/pdf-documents/'
    const idx = fileUrl.indexOf(marker)
    if (idx !== -1) {
      await supabase.storage.from('pdf-documents').remove([fileUrl.slice(idx + marker.length)])
    }
  }

  const handleAttachmentUpload = async (itemId: string, file: File, currentUrl: string | null) => {
    setUploadingId(itemId)
    setUploadError(null)
    if (currentUrl) await removeStorageFile(currentUrl)
    const url = await uploadAttachment(file, itemId)
    if (url) {
      await supabase.from('circulation_items').update({ file_url: url }).eq('id', itemId)
      setItems(prev => prev.map(i => i.id === itemId ? { ...i, file_url: url } : i))
    }
    setUploadingId(null)
  }

  const handleAttachmentRemove = async (itemId: string, currentUrl: string) => {
    if (!confirm('資料PDFを削除しますか？')) return
    await removeStorageFile(currentUrl)
    await supabase.from('circulation_items').update({ file_url: null }).eq('id', itemId)
    setItems(prev => prev.map(i => i.id === itemId ? { ...i, file_url: null } : i))
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return
    setCreating(true)
    const { data } = await supabase
      .from('circulation_items')
      .insert({ title: title.trim(), content: content.trim() || null })
      .select('*, circulation_reads(household_id, read_at, households(name, household_number))')
      .single()
    if (data) {
      let fileUrl: string | null = null
      if (attachmentFile) {
        fileUrl = await uploadAttachment(attachmentFile, data.id)
        if (fileUrl) {
          await supabase.from('circulation_items').update({ file_url: fileUrl }).eq('id', data.id)
        }
      }
      setItems(prev => [{ ...data, file_url: fileUrl }, ...prev])
    }
    setTitle('')
    setContent('')
    setAttachmentFile(null)
    setShowCreate(false)
    setCreating(false)
  }

  const handleDelete = async (id: string, itemTitle: string) => {
    if (!confirm(`「${itemTitle}」を削除しますか？`)) return
    await supabase.from('circulation_items').delete().eq('id', id)
    setItems(prev => prev.filter(i => i.id !== id))
  }

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id)
  }

  return (
    <div className="space-y-4">
      {/* 新規作成フォーム */}
      <button
        onClick={() => setShowCreate(!showCreate)}
        className="btn-primary flex items-center gap-2"
      >
        <Plus className="w-4 h-4" />
        新規回覧板を作成
      </button>

      {showCreate && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <h2 className="font-semibold text-gray-800 mb-3">回覧板の新規作成</h2>
          <form onSubmit={handleCreate} className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">タイトル</label>
              <input
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="例: 夏祭りのご案内"
                className="input-field"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">内容</label>
              <textarea
                value={content}
                onChange={e => setContent(e.target.value)}
                rows={4}
                placeholder="回覧板の内容を入力してください"
                className="input-field resize-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">資料PDF（任意）</label>
              <input
                type="file"
                accept="application/pdf"
                onChange={e => setAttachmentFile(e.target.files?.[0] || null)}
                className="block w-full text-sm text-gray-500 file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-sm file:bg-primary-50 file:text-primary-600 hover:file:bg-primary-100"
              />
              {attachmentFile && (
                <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                  <FileText className="w-3 h-3" />{attachmentFile.name}
                </p>
              )}
            </div>
            <p className="text-xs text-gray-400">※ 作成後、全世帯に表示されます</p>
            <div className="flex gap-2">
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

      {/* 回覧板一覧 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-100 font-semibold text-gray-700">
          回覧板一覧（{items.length}件）
        </div>
        {items.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <ClipboardList className="w-8 h-8 mx-auto mb-2" />
            <p className="text-sm">回覧板はまだありません</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {items.map(item => {
              const readCount = item.circulation_reads?.length ?? 0
              const totalHouseholds = households.length
              const isExpanded = expandedId === item.id

              // 既読済み世帯IDのSet
              const readHouseholdIds = new Set(
                (item.circulation_reads || []).map(r => r.household_id)
              )

              return (
                <div key={item.id}>
                  {/* ヘッダー行 */}
                  <div className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-800">{item.title}</p>
                        {item.content && (
                          <p className="text-sm text-gray-500 mt-0.5 line-clamp-1">{item.content}</p>
                        )}
                        <p className="text-xs text-gray-400 mt-1">
                          {new Date(item.created_at).toLocaleDateString('ja-JP')}
                        </p>
                        {/* 添付ファイルコントロール */}
                        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                          {item.file_url ? (
                            <>
                              <a
                                href={item.file_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-xs text-primary-600 bg-primary-50 hover:bg-primary-100 px-2 py-1 rounded transition-colors"
                              >
                                <FileText className="w-3 h-3" />資料PDFを確認
                              </a>
                              <label className="inline-flex items-center gap-1 text-xs text-gray-500 bg-gray-100 hover:bg-gray-200 px-2 py-1 rounded cursor-pointer transition-colors">
                                <Upload className="w-3 h-3" />PDFを変更
                                <input type="file" accept="application/pdf" className="hidden"
                                  onChange={e => { const f = e.target.files?.[0]; if (f) handleAttachmentUpload(item.id, f, item.file_url) }} />
                              </label>
                              <button
                                onClick={() => handleAttachmentRemove(item.id, item.file_url!)}
                                className="text-xs text-red-400 hover:text-red-600 px-1"
                              >
                                削除
                              </button>
                            </>
                          ) : (
                            <label className="inline-flex items-center gap-1 text-xs text-gray-500 bg-gray-100 hover:bg-gray-200 px-2 py-1 rounded cursor-pointer transition-colors">
                              <Upload className="w-3 h-3" />
                              {uploadingId === item.id ? 'アップロード中...' : '資料PDFを追加'}
                              <input type="file" accept="application/pdf" className="hidden"
                                disabled={uploadingId === item.id}
                                onChange={e => { const f = e.target.files?.[0]; if (f) handleAttachmentUpload(item.id, f, null) }} />
                            </label>
                          )}
                        </div>
                        {uploadError && uploadingId === null && (
                          <p className="text-xs text-red-500 mt-1">{uploadError}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {/* 既読進捗バッジ */}
                        <span className={`text-xs font-medium px-2 py-1 rounded-full flex items-center gap-1 ${
                          readCount === totalHouseholds && totalHouseholds > 0
                            ? 'bg-green-100 text-green-700'
                            : 'bg-orange-100 text-orange-700'
                        }`}>
                          <Users className="w-3 h-3" />
                          既読 {readCount}/{totalHouseholds}世帯
                        </span>
                        {/* 詳細展開ボタン */}
                        <button
                          onClick={() => toggleExpand(item.id)}
                          className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
                          title="既読状況を確認"
                        >
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>
                        {/* 削除ボタン */}
                        <button
                          onClick={() => handleDelete(item.id, item.title)}
                          className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded"
                          title="削除"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* 既読状況詳細パネル */}
                  {isExpanded && (
                    <div className="px-4 pb-4 bg-gray-50 border-t border-gray-100">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide pt-3 pb-2">
                        既読状況（{readCount}/{totalHouseholds}世帯）
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                        {households.map(h => {
                          const readRecord = (item.circulation_reads || []).find(
                            r => r.household_id === h.id
                          )
                          const isRead = readHouseholdIds.has(h.id)
                          return (
                            <div
                              key={h.id}
                              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${
                                isRead ? 'bg-green-50' : 'bg-white border border-gray-100'
                              }`}
                            >
                              {isRead ? (
                                <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                              ) : (
                                <Clock className="w-4 h-4 text-gray-300 flex-shrink-0" />
                              )}
                              <div className="flex-1 min-w-0">
                                <span className="font-medium text-gray-700">
                                  {h.household_number}番 {h.name}
                                </span>
                                {isRead && readRecord && (
                                  <p className="text-xs text-green-600">
                                    {new Date(readRecord.read_at).toLocaleString('ja-JP', {
                                      month: 'numeric',
                                      day: 'numeric',
                                      hour: '2-digit',
                                      minute: '2-digit',
                                    })}
                                  </p>
                                )}
                              </div>
                            </div>
                          )
                        })}
                      </div>
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
