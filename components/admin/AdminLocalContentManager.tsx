'use client'

import { useState, useRef } from 'react'
import { Plus, Trash2, Pencil, Check, ChevronUp, ChevronDown, Paperclip, ExternalLink, X, CheckCircle2, XCircle, PlusCircle, Loader2 } from 'lucide-react'

interface LocalContent {
  id: string
  category: string
  order_index: number
  title: string
  body: string | null
  pdf_url: string | null
  extracted_text: string | null
  color: 'blue' | 'orange' | 'purple'
  created_at: string
}

const COLOR_OPTIONS = [
  { value: 'blue',   label: '青',      badge: 'bg-blue-100 text-blue-700',     ring: 'ring-blue-400'   },
  { value: 'orange', label: 'オレンジ', badge: 'bg-orange-100 text-orange-700', ring: 'ring-orange-400' },
  { value: 'purple', label: '紫',      badge: 'bg-purple-100 text-purple-700', ring: 'ring-purple-400' },
] as const

function colorBadge(color: string) {
  return COLOR_OPTIONS.find(c => c.value === color)?.badge ?? 'bg-gray-100 text-gray-600'
}

export default function AdminLocalContentManager({
  initialItems,
  category,
  label,
}: {
  initialItems: LocalContent[]
  category: 'history' | 'rules'
  label: string
}) {
  const [items, setItems] = useState(initialItems)
  const [showCreate, setShowCreate] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [uploadingId, setUploadingId] = useState<string | null>(null)
  const [addingTextId, setAddingTextId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  // 新規フォーム
  const [newTitle, setNewTitle] = useState('')
  const [newBody, setNewBody] = useState('')
  const [newColor, setNewColor] = useState<'blue' | 'orange' | 'purple'>('blue')
  const [newPdf, setNewPdf] = useState<File | null>(null)
  const [newTxt, setNewTxt] = useState<File | null>(null)

  // 編集フォーム
  const [editTitle, setEditTitle] = useState('')
  const [editBody, setEditBody] = useState('')
  const [editColor, setEditColor] = useState<'blue' | 'orange' | 'purple'>('blue')
  const [editTxt, setEditTxt] = useState<File | null>(null)

  const createPdfRef = useRef<HTMLInputElement>(null)
  const createTxtRef = useRef<HTMLInputElement>(null)
  const addTextInputRef = useRef<HTMLInputElement>(null)
  const addTextTargetId = useRef<string | null>(null)

  const uploadPdf = async (file: File, itemId: string, oldUrl?: string | null): Promise<string | null> => {
    const fd = new FormData()
    fd.append('file', file)
    fd.append('itemId', itemId)
    fd.append('fileType', 'pdf')
    if (oldUrl) {
      const marker = '/pdf-documents/'
      const idx = oldUrl.indexOf(marker)
      if (idx !== -1) fd.append('oldPath', oldUrl.slice(idx + marker.length))
    }
    const res = await fetch('/api/admin/local-contents', { method: 'PUT', body: fd })
    const data = await res.json()
    if (!res.ok) { setError(`PDF アップロード失敗: ${data.error}`); return null }
    return data.url
  }

  const uploadTxt = async (file: File, itemId: string): Promise<string | null> => {
    const fd = new FormData()
    fd.append('file', file)
    fd.append('itemId', itemId)
    fd.append('fileType', 'txt')
    const res = await fetch('/api/admin/local-contents', { method: 'PUT', body: fd })
    const data = await res.json()
    if (!res.ok) { setError(`テキストアップロード失敗: ${data.error}`); return null }
    return data.text ?? null
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTitle.trim()) return
    setSaving(true)
    setError(null)
    try {
      const maxOrder = items.length > 0 ? Math.max(...items.map(i => i.order_index)) + 1 : 0
      const res = await fetch('/api/admin/local-contents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category, title: newTitle.trim(), body: newBody.trim() || null, color: newColor, order_index: maxOrder }),
      })
      const data = await res.json()
      if (!res.ok || !data.item) { setError(data.error ?? '登録失敗'); return }

      let item: LocalContent = data.item
      if (newPdf) {
        const url = await uploadPdf(newPdf, item.id)
        if (url) item = { ...item, pdf_url: url }
      }
      if (newTxt) {
        const text = await uploadTxt(newTxt, item.id)
        if (text !== null) item = { ...item, extracted_text: text }
      }

      setItems(prev => [...prev, item])
      setNewTitle(''); setNewBody(''); setNewColor('blue'); setNewPdf(null); setNewTxt(null)
      if (createPdfRef.current) createPdfRef.current.value = ''
      if (createTxtRef.current) createTxtRef.current.value = ''
      setShowCreate(false)
    } finally {
      setSaving(false)
    }
  }

  const handleEditStart = (item: LocalContent) => {
    setEditingId(item.id)
    setEditTitle(item.title)
    setEditBody(item.body ?? '')
    setEditColor(item.color)
    setEditTxt(null)
  }

  const handleEditSave = async (e: React.FormEvent, item: LocalContent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/local-contents', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: item.id, title: editTitle.trim(), body: editBody.trim() || null, color: editColor }),
      })
      if (!res.ok) { const d = await res.json(); setError(d.error ?? '更新失敗'); return }

      let updated = { ...item, title: editTitle.trim(), body: editBody.trim() || null, color: editColor }
      if (editTxt) {
        const text = await uploadTxt(editTxt, item.id)
        if (text !== null) updated = { ...updated, extracted_text: text }
      }
      setItems(prev => prev.map(i => i.id === item.id ? updated : i))
      setEditingId(null)
      setEditTxt(null)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (item: LocalContent) => {
    if (!confirm(`「${item.title}」を削除しますか？`)) return
    await fetch('/api/admin/local-contents', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: item.id }),
    })
    setItems(prev => prev.filter(i => i.id !== item.id))
  }

  const handleRemovePdf = async (item: LocalContent) => {
    if (!item.pdf_url || !confirm('PDFを削除しますか？')) return
    const marker = '/pdf-documents/'
    const idx = item.pdf_url.indexOf(marker)
    if (idx === -1) return
    await fetch('/api/admin/local-contents', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ storagePath: item.pdf_url.slice(idx + marker.length), itemId: item.id }),
    })
    setItems(prev => prev.map(i => i.id === item.id ? { ...i, pdf_url: null } : i))
  }

  const handleAttachPdf = async (item: LocalContent, file: File) => {
    setUploadingId(item.id)
    setError(null)
    const url = await uploadPdf(file, item.id, item.pdf_url)
    if (url) setItems(prev => prev.map(i => i.id === item.id ? { ...i, pdf_url: url } : i))
    setUploadingId(null)
  }

  const handleAddTextClick = (itemId: string) => {
    addTextTargetId.current = itemId
    addTextInputRef.current?.click()
  }

  const handleAddTextChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    const itemId = addTextTargetId.current
    if (!file || !itemId) return
    setAddingTextId(itemId)
    const text = await uploadTxt(file, itemId)
    if (text !== null) setItems(prev => prev.map(i => i.id === itemId ? { ...i, extracted_text: text } : i))
    setAddingTextId(null)
    if (addTextInputRef.current) addTextInputRef.current.value = ''
  }

  const handleMoveUp = async (idx: number) => {
    if (idx === 0) return
    const a = items[idx], b = items[idx - 1]
    await fetch('/api/admin/local-contents', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'swap', id1: a.id, idx1: a.order_index, id2: b.id, idx2: b.order_index }),
    })
    const next = [...items]
    next[idx] = { ...a, order_index: b.order_index }
    next[idx - 1] = { ...b, order_index: a.order_index }
    setItems(next)
  }

  const handleMoveDown = async (idx: number) => {
    if (idx === items.length - 1) return
    const a = items[idx], b = items[idx + 1]
    await fetch('/api/admin/local-contents', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'swap', id1: a.id, idx1: a.order_index, id2: b.id, idx2: b.order_index }),
    })
    const next = [...items]
    next[idx] = { ...a, order_index: b.order_index }
    next[idx + 1] = { ...b, order_index: a.order_index }
    setItems(next)
  }

  return (
    <div className="space-y-4">
      <button onClick={() => { setShowCreate(!showCreate); setError(null) }} className="btn-primary flex items-center gap-2">
        <Plus className="w-4 h-4" />{label}を追加
      </button>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">{error}</div>
      )}

      {/* 新規作成フォーム */}
      {showCreate && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <h2 className="font-semibold text-gray-800 mb-4">{label}の新規追加</h2>
          <form onSubmit={handleCreate} className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">タイトル <span className="text-red-500">*</span></label>
              <input type="text" value={newTitle} onChange={e => setNewTitle(e.target.value)} className="input-field" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">本文</label>
              <textarea value={newBody} onChange={e => setNewBody(e.target.value)} rows={4} className="input-field resize-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">色</label>
              <div className="flex gap-2">
                {COLOR_OPTIONS.map(c => (
                  <button key={c.value} type="button" onClick={() => setNewColor(c.value)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${c.badge} ${newColor === c.value ? `ring-2 ${c.ring}` : 'opacity-50'}`}>
                    {c.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">PDF添付（任意）</label>
              <input ref={createPdfRef} type="file" accept="application/pdf"
                onChange={e => setNewPdf(e.target.files?.[0] ?? null)}
                className="block w-full text-sm text-gray-500 file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-sm file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200" />
              {newPdf && <p className="text-xs text-green-600 mt-1">✅ {newPdf.name}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">テキストファイル（任意・検索用）</label>
              <input ref={createTxtRef} type="file" accept=".txt"
                onChange={e => setNewTxt(e.target.files?.[0] ?? null)}
                className="block w-full text-sm text-gray-500 file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-sm file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200" />
              {newTxt && <p className="text-xs text-green-600 mt-1">✅ {newTxt.name}</p>}
              <p className="text-xs text-gray-400 mt-1">登録するとキーワード検索の対象になります</p>
            </div>
            <div className="flex gap-2 pt-1">
              <button type="submit" disabled={saving} className="btn-primary">{saving ? '登録中...' : '登録する'}</button>
              <button type="button" onClick={() => setShowCreate(false)} className="btn-secondary">キャンセル</button>
            </div>
          </form>
        </div>
      )}

      {/* 一覧 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-100 font-semibold text-gray-700">
          {label}一覧（{items.length}件）
        </div>
        {items.length === 0 ? (
          <div className="text-center py-10 text-gray-400 text-sm">まだ登録がありません</div>
        ) : (
          <div className="divide-y divide-gray-50">
            {items.map((item, idx) => {
              const isEditing = editingId === item.id
              return (
                <div key={item.id} className="p-4">
                  {isEditing ? (
                    <form onSubmit={e => handleEditSave(e, item)} className="space-y-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">タイトル</label>
                        <input type="text" value={editTitle} onChange={e => setEditTitle(e.target.value)} className="input-field text-sm" required />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">本文</label>
                        <textarea value={editBody} onChange={e => setEditBody(e.target.value)} rows={4} className="input-field text-sm resize-none" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-2">色</label>
                        <div className="flex gap-2">
                          {COLOR_OPTIONS.map(c => (
                            <button key={c.value} type="button" onClick={() => setEditColor(c.value)}
                              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${c.badge} ${editColor === c.value ? `ring-2 ${c.ring}` : 'opacity-50'}`}>
                              {c.label}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">テキストファイル更新（任意）</label>
                        <input type="file" accept=".txt"
                          onChange={e => setEditTxt(e.target.files?.[0] ?? null)}
                          className="block w-full text-sm text-gray-500 file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-sm file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200" />
                        {editTxt && <p className="text-xs text-green-600 mt-1">✅ {editTxt.name}</p>}
                        {item.extracted_text && !editTxt && <p className="text-xs text-green-600 mt-1">現在テキストあり（ファイルを選択で上書き）</p>}
                      </div>
                      <div className="flex gap-2">
                        <button type="submit" disabled={saving}
                          className="flex items-center gap-1.5 text-sm bg-primary-600 text-white hover:bg-primary-700 px-3 py-1.5 rounded-lg disabled:opacity-50">
                          <Check className="w-3.5 h-3.5" />{saving ? '保存中...' : '保存する'}
                        </button>
                        <button type="button" onClick={() => setEditingId(null)} className="btn-secondary text-sm py-1.5">キャンセル</button>
                      </div>
                    </form>
                  ) : (
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:gap-3">
                      {/* 順序バッジ＋コンテンツ */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">{item.order_index + 1}</span>
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${colorBadge(item.color)}`}>
                            {COLOR_OPTIONS.find(c => c.value === item.color)?.label}
                          </span>
                          <p className="font-semibold text-gray-800 text-sm">{item.title}</p>
                        </div>
                        {item.body && (
                          <p className="text-xs text-gray-500 mt-1 line-clamp-2">{item.body}</p>
                        )}
                        {/* PDF / テキスト操作 */}
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          {item.pdf_url ? (
                            <>
                              <a href={item.pdf_url} target="_blank" rel="noopener noreferrer"
                                className="flex items-center gap-1 text-xs text-primary-600 bg-primary-50 hover:bg-primary-100 px-2 py-1 rounded-full transition-colors">
                                <ExternalLink className="w-3 h-3" />PDFを確認
                              </a>
                              <label className="flex items-center gap-1 text-xs text-gray-500 bg-gray-100 hover:bg-gray-200 px-2 py-1 rounded-full cursor-pointer transition-colors">
                                <Paperclip className="w-3 h-3" />{uploadingId === item.id ? '更新中...' : 'PDFを変更'}
                                <input type="file" accept="application/pdf" className="hidden" disabled={uploadingId === item.id}
                                  onChange={e => { const f = e.target.files?.[0]; if (f) handleAttachPdf(item, f); e.target.value = '' }} />
                              </label>
                              <button onClick={() => handleRemovePdf(item)}
                                className="flex items-center gap-1 text-xs text-red-400 hover:text-red-600 px-2 py-1 rounded-full hover:bg-red-50 transition-colors">
                                <X className="w-3 h-3" />削除
                              </button>
                            </>
                          ) : (
                            <label className="flex items-center gap-1 text-xs text-gray-500 bg-gray-100 hover:bg-gray-200 px-2 py-1 rounded-full cursor-pointer transition-colors">
                              <Paperclip className="w-3 h-3" />{uploadingId === item.id ? 'アップロード中...' : 'PDFを添付'}
                              <input type="file" accept="application/pdf" className="hidden" disabled={uploadingId === item.id}
                                onChange={e => { const f = e.target.files?.[0]; if (f) handleAttachPdf(item, f); e.target.value = '' }} />
                            </label>
                          )}
                          {/* テキスト状態 */}
                          {item.extracted_text ? (
                            <span className="flex items-center gap-0.5 text-xs text-green-600">
                              <CheckCircle2 className="w-3 h-3" />テキストあり
                            </span>
                          ) : (
                            <>
                              <span className="flex items-center gap-0.5 text-xs text-gray-400">
                                <XCircle className="w-3 h-3" />テキストなし
                              </span>
                              <button type="button" onClick={() => handleAddTextClick(item.id)}
                                disabled={addingTextId === item.id}
                                className="flex items-center gap-1 text-xs bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 px-2 py-0.5 rounded-full transition-colors disabled:opacity-50">
                                {addingTextId === item.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <PlusCircle className="w-3 h-3" />}
                                テキスト追加
                              </button>
                            </>
                          )}
                        </div>
                      </div>

                      {/* 操作ボタン */}
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button onClick={() => handleMoveUp(idx)} disabled={idx === 0}
                          className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded disabled:opacity-20" title="上へ">
                          <ChevronUp className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleMoveDown(idx)} disabled={idx === items.length - 1}
                          className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded disabled:opacity-20" title="下へ">
                          <ChevronDown className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleEditStart(item)}
                          className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded" title="編集">
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDelete(item)}
                          className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded" title="削除">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* テキスト追加用隠しinput（一覧共通） */}
      <input ref={addTextInputRef} type="file" accept=".txt" className="hidden" onChange={handleAddTextChange} />
    </div>
  )
}
