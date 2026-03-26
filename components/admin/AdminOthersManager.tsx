'use client'

import { useState, useRef } from 'react'
import {
  Plus, Trash2, Pencil, Check, ChevronUp, ChevronDown,
  Paperclip, ExternalLink, X, CheckCircle2, XCircle, PlusCircle, Loader2, FolderOpen,
} from 'lucide-react'

interface LocalContent {
  id: string
  category: string
  parent_id: string | null
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

function ColorSelect({ value, onChange }: { value: string; onChange: (v: 'blue' | 'orange' | 'purple') => void }) {
  return (
    <div className="flex gap-2">
      {COLOR_OPTIONS.map(c => (
        <button key={c.value} type="button" onClick={() => onChange(c.value)}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${c.badge} ${value === c.value ? `ring-2 ${c.ring}` : 'opacity-50'}`}>
          {c.label}
        </button>
      ))}
    </div>
  )
}

export default function AdminOthersManager({ initialItems }: { initialItems: LocalContent[] }) {
  const [items, setItems] = useState(initialItems)
  const [expandedParentId, setExpandedParentId] = useState<string | null>(null)
  const [showCreateParent, setShowCreateParent] = useState(false)
  const [creatingChildFor, setCreatingChildFor] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [uploadingId, setUploadingId] = useState<string | null>(null)
  const [addingTextId, setAddingTextId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  // 親作成フォーム
  const [newParentTitle, setNewParentTitle] = useState('')
  const [newParentColor, setNewParentColor] = useState<'blue' | 'orange' | 'purple'>('blue')

  // 子作成フォーム
  const [newChildTitle, setNewChildTitle] = useState('')
  const [newChildBody, setNewChildBody] = useState('')
  const [newChildColor, setNewChildColor] = useState<'blue' | 'orange' | 'purple'>('blue')
  const [newChildPdf, setNewChildPdf] = useState<File | null>(null)
  const [newChildTxt, setNewChildTxt] = useState<File | null>(null)

  // 編集フォーム（親・子共用）
  const [editTitle, setEditTitle] = useState('')
  const [editBody, setEditBody] = useState('')
  const [editColor, setEditColor] = useState<'blue' | 'orange' | 'purple'>('blue')
  const [editTxt, setEditTxt] = useState<File | null>(null)

  const childPdfRef = useRef<HTMLInputElement>(null)
  const childTxtRef = useRef<HTMLInputElement>(null)
  const addTextInputRef = useRef<HTMLInputElement>(null)
  const addTextTargetId = useRef<string | null>(null)

  const parents = items.filter(i => !i.parent_id).sort((a, b) => a.order_index - b.order_index)
  const getChildren = (parentId: string) =>
    items.filter(i => i.parent_id === parentId).sort((a, b) => a.order_index - b.order_index)

  // ── upload helpers ──────────────────────────────────────
  const uploadPdf = async (file: File, itemId: string, oldUrl?: string | null): Promise<string | null> => {
    const fd = new FormData()
    fd.append('file', file); fd.append('itemId', itemId); fd.append('fileType', 'pdf')
    if (oldUrl) {
      const m = '/pdf-documents/'; const i = oldUrl.indexOf(m)
      if (i !== -1) fd.append('oldPath', oldUrl.slice(i + m.length))
    }
    const res = await fetch('/api/admin/local-contents', { method: 'PUT', body: fd })
    const data = await res.json()
    if (!res.ok) { setError(`PDF アップロード失敗: ${data.error}`); return null }
    return data.url
  }

  const uploadTxt = async (file: File, itemId: string): Promise<string | null> => {
    const fd = new FormData()
    fd.append('file', file); fd.append('itemId', itemId); fd.append('fileType', 'txt')
    const res = await fetch('/api/admin/local-contents', { method: 'PUT', body: fd })
    const data = await res.json()
    if (!res.ok) { setError(`テキストアップロード失敗: ${data.error}`); return null }
    return data.text ?? null
  }

  // ── 親カード CRUD ────────────────────────────────────────
  const handleCreateParent = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newParentTitle.trim()) return
    setSaving(true); setError(null)
    try {
      const maxOrder = parents.length > 0 ? Math.max(...parents.map(i => i.order_index)) + 1 : 0
      const res = await fetch('/api/admin/local-contents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category: 'others', title: newParentTitle.trim(), color: newParentColor, order_index: maxOrder, parent_id: null }),
      })
      const data = await res.json()
      if (!res.ok || !data.item) { setError(data.error ?? '登録失敗'); return }
      setItems(prev => [...prev, data.item])
      setNewParentTitle(''); setNewParentColor('blue'); setShowCreateParent(false)
    } finally { setSaving(false) }
  }

  // ── 子カード CRUD ────────────────────────────────────────
  const handleCreateChild = async (e: React.FormEvent, parentId: string) => {
    e.preventDefault()
    if (!newChildTitle.trim()) return
    setSaving(true); setError(null)
    try {
      const siblings = getChildren(parentId)
      const maxOrder = siblings.length > 0 ? Math.max(...siblings.map(i => i.order_index)) + 1 : 0
      const res = await fetch('/api/admin/local-contents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: 'others', parent_id: parentId,
          title: newChildTitle.trim(), body: newChildBody.trim() || null,
          color: newChildColor, order_index: maxOrder,
        }),
      })
      const data = await res.json()
      if (!res.ok || !data.item) { setError(data.error ?? '登録失敗'); return }

      let item: LocalContent = data.item
      if (newChildPdf) { const url = await uploadPdf(newChildPdf, item.id); if (url) item = { ...item, pdf_url: url } }
      if (newChildTxt) { const text = await uploadTxt(newChildTxt, item.id); if (text !== null) item = { ...item, extracted_text: text } }

      setItems(prev => [...prev, item])
      setNewChildTitle(''); setNewChildBody(''); setNewChildColor('blue'); setNewChildPdf(null); setNewChildTxt(null)
      if (childPdfRef.current) childPdfRef.current.value = ''
      if (childTxtRef.current) childTxtRef.current.value = ''
      setCreatingChildFor(null)
    } finally { setSaving(false) }
  }

  // ── 編集（親・子共用）────────────────────────────────────
  const handleEditStart = (item: LocalContent) => {
    setEditingId(item.id); setEditTitle(item.title); setEditBody(item.body ?? ''); setEditColor(item.color); setEditTxt(null)
  }

  const handleEditSave = async (e: React.FormEvent, item: LocalContent) => {
    e.preventDefault()
    setSaving(true); setError(null)
    try {
      const payload: Record<string, any> = { id: item.id, title: editTitle.trim(), color: editColor }
      if (item.parent_id) payload.body = editBody.trim() || null
      const res = await fetch('/api/admin/local-contents', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
      })
      if (!res.ok) { const d = await res.json(); setError(d.error ?? '更新失敗'); return }

      let updated = { ...item, title: editTitle.trim(), color: editColor, ...(item.parent_id ? { body: editBody.trim() || null } : {}) }
      if (editTxt && item.parent_id) {
        const text = await uploadTxt(editTxt, item.id)
        if (text !== null) updated = { ...updated, extracted_text: text }
      }
      setItems(prev => prev.map(i => i.id === item.id ? updated : i))
      setEditingId(null); setEditTxt(null)
    } finally { setSaving(false) }
  }

  // ── 削除 ─────────────────────────────────────────────────
  const handleDelete = async (item: LocalContent) => {
    const msg = item.parent_id ? `「${item.title}」を削除しますか？` : `セクション「${item.title}」と配下のコンテンツをすべて削除しますか？`
    if (!confirm(msg)) return
    await fetch('/api/admin/local-contents', {
      method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: item.id }),
    })
    if (!item.parent_id) {
      setItems(prev => prev.filter(i => i.id !== item.id && i.parent_id !== item.id))
    } else {
      setItems(prev => prev.filter(i => i.id !== item.id))
    }
  }

  // ── PDF操作 ───────────────────────────────────────────────
  const handleAttachPdf = async (item: LocalContent, file: File) => {
    setUploadingId(item.id); setError(null)
    const url = await uploadPdf(file, item.id, item.pdf_url)
    if (url) setItems(prev => prev.map(i => i.id === item.id ? { ...i, pdf_url: url } : i))
    setUploadingId(null)
  }

  const handleRemovePdf = async (item: LocalContent) => {
    if (!item.pdf_url || !confirm('PDFを削除しますか？')) return
    const m = '/pdf-documents/'; const idx = item.pdf_url.indexOf(m)
    if (idx === -1) return
    await fetch('/api/admin/local-contents', {
      method: 'DELETE', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ storagePath: item.pdf_url.slice(idx + m.length), itemId: item.id }),
    })
    setItems(prev => prev.map(i => i.id === item.id ? { ...i, pdf_url: null } : i))
  }

  // ── テキスト追加（既存行） ───────────────────────────────
  const handleAddTextClick = (itemId: string) => { addTextTargetId.current = itemId; addTextInputRef.current?.click() }
  const handleAddTextChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; const itemId = addTextTargetId.current
    if (!file || !itemId) return
    setAddingTextId(itemId)
    const text = await uploadTxt(file, itemId)
    if (text !== null) setItems(prev => prev.map(i => i.id === itemId ? { ...i, extracted_text: text } : i))
    setAddingTextId(null)
    if (addTextInputRef.current) addTextInputRef.current.value = ''
  }

  // ── 順序入れ替え ─────────────────────────────────────────
  const swap = async (a: LocalContent, b: LocalContent) => {
    await fetch('/api/admin/local-contents', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'swap', id1: a.id, idx1: a.order_index, id2: b.id, idx2: b.order_index }),
    })
    setItems(prev => prev.map(i => {
      if (i.id === a.id) return { ...i, order_index: b.order_index }
      if (i.id === b.id) return { ...i, order_index: a.order_index }
      return i
    }))
  }

  // ── 子カード行レンダリング ───────────────────────────────
  const renderChild = (child: LocalContent, siblings: LocalContent[], cidx: number) => {
    const isEditing = editingId === child.id
    return (
      <div key={child.id} className="px-4 py-3 border-l-4 border-l-gray-200 bg-gray-50/50">
        {isEditing ? (
          <form onSubmit={e => handleEditSave(e, child)} className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">タイトル</label>
              <input type="text" value={editTitle} onChange={e => setEditTitle(e.target.value)} className="input-field text-sm" required />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">本文</label>
              <textarea value={editBody} onChange={e => setEditBody(e.target.value)} rows={3} className="input-field text-sm resize-none" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-2">色</label>
              <ColorSelect value={editColor} onChange={setEditColor} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">テキスト更新（任意）</label>
              <input type="file" accept=".txt" onChange={e => setEditTxt(e.target.files?.[0] ?? null)}
                className="block w-full text-sm text-gray-500 file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-sm file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200" />
              {editTxt && <p className="text-xs text-green-600 mt-1">✅ {editTxt.name}</p>}
              {child.extracted_text && !editTxt && <p className="text-xs text-green-600 mt-1">現在テキストあり</p>}
            </div>
            <div className="flex gap-2">
              <button type="submit" disabled={saving} className="flex items-center gap-1.5 text-sm bg-primary-600 text-white hover:bg-primary-700 px-3 py-1.5 rounded-lg disabled:opacity-50">
                <Check className="w-3.5 h-3.5" />{saving ? '保存中...' : '保存する'}
              </button>
              <button type="button" onClick={() => setEditingId(null)} className="btn-secondary text-sm py-1.5">キャンセル</button>
            </div>
          </form>
        ) : (
          <div className="flex flex-col gap-1.5 sm:flex-row sm:items-start sm:gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">{child.order_index + 1}</span>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${colorBadge(child.color)}`}>
                  {COLOR_OPTIONS.find(c => c.value === child.color)?.label}
                </span>
                <p className="font-semibold text-gray-800 text-sm">{child.title}</p>
              </div>
              {child.body && <p className="text-xs text-gray-500 mt-1 line-clamp-2">{child.body}</p>}
              {/* PDF / テキスト操作 */}
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                {child.pdf_url ? (
                  <>
                    <a href={child.pdf_url} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1 text-xs text-primary-600 bg-primary-50 hover:bg-primary-100 px-2 py-1 rounded-full transition-colors">
                      <ExternalLink className="w-3 h-3" />PDF確認
                    </a>
                    <label className="flex items-center gap-1 text-xs text-gray-500 bg-gray-100 hover:bg-gray-200 px-2 py-1 rounded-full cursor-pointer transition-colors">
                      <Paperclip className="w-3 h-3" />{uploadingId === child.id ? '更新中...' : 'PDF変更'}
                      <input type="file" accept="application/pdf" className="hidden" disabled={uploadingId === child.id}
                        onChange={e => { const f = e.target.files?.[0]; if (f) handleAttachPdf(child, f); e.target.value = '' }} />
                    </label>
                    <button onClick={() => handleRemovePdf(child)}
                      className="flex items-center gap-1 text-xs text-red-400 hover:text-red-600 px-2 py-1 rounded-full hover:bg-red-50 transition-colors">
                      <X className="w-3 h-3" />削除
                    </button>
                  </>
                ) : (
                  <label className="flex items-center gap-1 text-xs text-gray-500 bg-gray-100 hover:bg-gray-200 px-2 py-1 rounded-full cursor-pointer transition-colors">
                    <Paperclip className="w-3 h-3" />{uploadingId === child.id ? 'アップロード中...' : 'PDFを添付'}
                    <input type="file" accept="application/pdf" className="hidden" disabled={uploadingId === child.id}
                      onChange={e => { const f = e.target.files?.[0]; if (f) handleAttachPdf(child, f); e.target.value = '' }} />
                  </label>
                )}
                {child.extracted_text ? (
                  <span className="flex items-center gap-0.5 text-xs text-green-600"><CheckCircle2 className="w-3 h-3" />テキストあり</span>
                ) : (
                  <>
                    <span className="flex items-center gap-0.5 text-xs text-gray-400"><XCircle className="w-3 h-3" />テキストなし</span>
                    <button type="button" onClick={() => handleAddTextClick(child.id)} disabled={addingTextId === child.id}
                      className="flex items-center gap-1 text-xs bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 px-2 py-0.5 rounded-full transition-colors disabled:opacity-50">
                      {addingTextId === child.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <PlusCircle className="w-3 h-3" />}テキスト追加
                    </button>
                  </>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              <button onClick={() => cidx > 0 && swap(child, siblings[cidx - 1])} disabled={cidx === 0}
                className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded disabled:opacity-20" title="上へ">
                <ChevronUp className="w-4 h-4" />
              </button>
              <button onClick={() => cidx < siblings.length - 1 && swap(child, siblings[cidx + 1])} disabled={cidx === siblings.length - 1}
                className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded disabled:opacity-20" title="下へ">
                <ChevronDown className="w-4 h-4" />
              </button>
              <button onClick={() => handleEditStart(child)}
                className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded" title="編集">
                <Pencil className="w-4 h-4" />
              </button>
              <button onClick={() => handleDelete(child)}
                className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded" title="削除">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <button onClick={() => { setShowCreateParent(!showCreateParent); setError(null) }}
        className="btn-primary flex items-center gap-2">
        <Plus className="w-4 h-4" />セクションを追加
      </button>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">{error}</div>
      )}

      {/* 親カード作成フォーム */}
      {showCreateParent && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <h2 className="font-semibold text-gray-800 mb-4">セクションの新規追加</h2>
          <form onSubmit={handleCreateParent} className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">セクション名 <span className="text-red-500">*</span></label>
              <input type="text" value={newParentTitle} onChange={e => setNewParentTitle(e.target.value)} placeholder="例: 浜区会則" className="input-field" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">色</label>
              <ColorSelect value={newParentColor} onChange={setNewParentColor} />
            </div>
            <div className="flex gap-2 pt-1">
              <button type="submit" disabled={saving} className="btn-primary">{saving ? '登録中...' : '登録する'}</button>
              <button type="button" onClick={() => setShowCreateParent(false)} className="btn-secondary">キャンセル</button>
            </div>
          </form>
        </div>
      )}

      {/* セクション一覧 */}
      <div className="space-y-3">
        {parents.length === 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 text-center py-10 text-gray-400 text-sm">
            <FolderOpen className="w-8 h-8 mx-auto mb-2 text-gray-300" />
            セクションはまだありません
          </div>
        )}
        {parents.map((parent, pidx) => {
          const isExpanded = expandedParentId === parent.id
          const isEditing = editingId === parent.id
          const children = getChildren(parent.id)

          return (
            <div key={parent.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              {/* 親カード行 */}
              {isEditing ? (
                <div className="p-4 bg-blue-50 border-b border-blue-100">
                  <p className="text-xs font-semibold text-blue-600 mb-3 flex items-center gap-1">
                    <Pencil className="w-3.5 h-3.5" />セクション編集
                  </p>
                  <form onSubmit={e => handleEditSave(e, parent)} className="space-y-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">セクション名</label>
                      <input type="text" value={editTitle} onChange={e => setEditTitle(e.target.value)} className="input-field text-sm" required />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-2">色</label>
                      <ColorSelect value={editColor} onChange={setEditColor} />
                    </div>
                    <div className="flex gap-2">
                      <button type="submit" disabled={saving} className="flex items-center gap-1.5 text-sm bg-primary-600 text-white hover:bg-primary-700 px-3 py-1.5 rounded-lg disabled:opacity-50">
                        <Check className="w-3.5 h-3.5" />{saving ? '保存中...' : '保存する'}
                      </button>
                      <button type="button" onClick={() => setEditingId(null)} className="btn-secondary text-sm py-1.5">キャンセル</button>
                    </div>
                  </form>
                </div>
              ) : (
                <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-50">
                  <button onClick={() => setExpandedParentId(isExpanded ? null : parent.id)}
                    className="flex-1 flex items-center gap-2 text-left">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${colorBadge(parent.color)}`}>
                      {COLOR_OPTIONS.find(c => c.value === parent.color)?.label}
                    </span>
                    <span className="font-semibold text-gray-800 text-sm">{parent.title}</span>
                    <span className="text-xs text-gray-400 ml-auto">{children.length}件</span>
                    {isExpanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                  </button>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button onClick={() => pidx > 0 && swap(parent, parents[pidx - 1])} disabled={pidx === 0}
                      className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded disabled:opacity-20" title="上へ">
                      <ChevronUp className="w-4 h-4" />
                    </button>
                    <button onClick={() => pidx < parents.length - 1 && swap(parent, parents[pidx + 1])} disabled={pidx === parents.length - 1}
                      className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded disabled:opacity-20" title="下へ">
                      <ChevronDown className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleEditStart(parent)}
                      className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded" title="編集">
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDelete(parent)}
                      className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded" title="削除">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* 子カード一覧（展開時） */}
              {isExpanded && (
                <div className="divide-y divide-gray-50">
                  {children.map((child, cidx) => renderChild(child, children, cidx))}

                  {/* 子カード作成フォーム */}
                  {creatingChildFor === parent.id ? (
                    <div className="px-4 py-4 bg-indigo-50 border-l-4 border-l-indigo-300">
                      <p className="text-xs font-semibold text-indigo-600 mb-3">コンテンツの追加</p>
                      <form onSubmit={e => handleCreateChild(e, parent.id)} className="space-y-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">タイトル <span className="text-red-500">*</span></label>
                          <input type="text" value={newChildTitle} onChange={e => setNewChildTitle(e.target.value)} className="input-field text-sm" required />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">本文</label>
                          <textarea value={newChildBody} onChange={e => setNewChildBody(e.target.value)} rows={3} className="input-field text-sm resize-none" />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-2">色</label>
                          <ColorSelect value={newChildColor} onChange={setNewChildColor} />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">PDF添付（任意）</label>
                          <input ref={childPdfRef} type="file" accept="application/pdf"
                            onChange={e => setNewChildPdf(e.target.files?.[0] ?? null)}
                            className="block w-full text-sm text-gray-500 file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-sm file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200" />
                          {newChildPdf && <p className="text-xs text-green-600 mt-1">✅ {newChildPdf.name}</p>}
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">テキストファイル（任意・検索用）</label>
                          <input ref={childTxtRef} type="file" accept=".txt"
                            onChange={e => setNewChildTxt(e.target.files?.[0] ?? null)}
                            className="block w-full text-sm text-gray-500 file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-sm file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200" />
                          {newChildTxt && <p className="text-xs text-green-600 mt-1">✅ {newChildTxt.name}</p>}
                        </div>
                        <div className="flex gap-2">
                          <button type="submit" disabled={saving} className="btn-primary text-sm py-1.5">{saving ? '登録中...' : '追加する'}</button>
                          <button type="button" onClick={() => { setCreatingChildFor(null); setNewChildTitle(''); setNewChildBody(''); setNewChildColor('blue'); setNewChildPdf(null); setNewChildTxt(null) }} className="btn-secondary text-sm py-1.5">キャンセル</button>
                        </div>
                      </form>
                    </div>
                  ) : (
                    <div className="px-4 py-2">
                      <button onClick={() => setCreatingChildFor(parent.id)}
                        className="flex items-center gap-1 text-xs text-indigo-500 hover:text-indigo-600 transition-colors">
                        <PlusCircle className="w-3.5 h-3.5" />コンテンツを追加
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* テキスト追加用隠しinput */}
      <input ref={addTextInputRef} type="file" accept=".txt" className="hidden" onChange={handleAddTextChange} />
    </div>
  )
}
