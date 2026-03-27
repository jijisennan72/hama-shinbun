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

function isImageUrl(url: string) {
  return /\.(jpg|jpeg|png|gif|webp)(\?.*)?$/i.test(url)
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

// ── ファイル添付ボタン共通 ──────────────────────────────
function FileAttachArea({
  currentUrl,
  uploading,
  onAttach,
  onRemove,
}: {
  currentUrl: string | null
  uploading: boolean
  onAttach: (f: File) => void
  onRemove: () => void
}) {
  return (
    <div className="flex items-center gap-2 flex-wrap mt-2">
      {currentUrl ? (
        <>
          {isImageUrl(currentUrl) ? (
            <img src={currentUrl} alt="preview" className="h-12 w-auto rounded border border-gray-200 object-contain cursor-pointer"
              onClick={() => window.open(currentUrl, '_blank')} />
          ) : (
            <a href={currentUrl} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs text-primary-600 bg-primary-50 hover:bg-primary-100 px-2 py-1 rounded-full transition-colors">
              <ExternalLink className="w-3 h-3" />PDF確認
            </a>
          )}
          <label className="flex items-center gap-1 text-xs text-gray-500 bg-gray-100 hover:bg-gray-200 px-2 py-1 rounded-full cursor-pointer transition-colors">
            <Paperclip className="w-3 h-3" />{uploading ? '更新中...' : '変更'}
            <input type="file" accept="application/pdf,image/jpeg,image/png,image/gif,image/webp" className="hidden"
              disabled={uploading} onChange={e => { const f = e.target.files?.[0]; if (f) onAttach(f); e.target.value = '' }} />
          </label>
          <button onClick={onRemove} className="flex items-center gap-1 text-xs text-red-400 hover:text-red-600 px-2 py-1 rounded-full hover:bg-red-50 transition-colors">
            <X className="w-3 h-3" />削除
          </button>
        </>
      ) : (
        <label className="flex items-center gap-1 text-xs text-gray-500 bg-gray-100 hover:bg-gray-200 px-2 py-1 rounded-full cursor-pointer transition-colors">
          <Paperclip className="w-3 h-3" />{uploading ? 'アップロード中...' : 'PDF・画像を添付'}
          <input type="file" accept="application/pdf,image/jpeg,image/png,image/gif,image/webp" className="hidden"
            disabled={uploading} onChange={e => { const f = e.target.files?.[0]; if (f) onAttach(f); e.target.value = '' }} />
        </label>
      )}
    </div>
  )
}

export default function AdminOthersManager({ initialItems }: { initialItems: LocalContent[] }) {
  const [items, setItems] = useState(initialItems)

  // 展開状態
  const [expandedSectionId, setExpandedSectionId] = useState<string | null>(null)
  const [expandedGroupId, setExpandedGroupId] = useState<string | null>(null)

  // 作成フォーム表示制御
  const [showCreateSection, setShowCreateSection] = useState(false)
  const [creatingGroupFor, setCreatingGroupFor] = useState<string | null>(null)     // セクションID
  const [creatingContentFor, setCreatingContentFor] = useState<string | null>(null) // グループID

  // 編集
  const [editingId, setEditingId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [uploadingId, setUploadingId] = useState<string | null>(null)
  const [addingTextId, setAddingTextId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  // セクション作成フォーム
  const [newSectionTitle, setNewSectionTitle] = useState('')
  const [newSectionColor, setNewSectionColor] = useState<'blue' | 'orange' | 'purple'>('blue')

  // グループ作成フォーム（セクションの子、level2）
  const [newGroupTitle, setNewGroupTitle] = useState('')
  const [newGroupBody, setNewGroupBody] = useState('')
  const [newGroupColor, setNewGroupColor] = useState<'blue' | 'orange' | 'purple'>('blue')

  // コンテンツ作成フォーム（グループの子、level3）
  const [newContentTitle, setNewContentTitle] = useState('')
  const [newContentBody, setNewContentBody] = useState('')
  const [newContentColor, setNewContentColor] = useState<'blue' | 'orange' | 'purple'>('blue')
  const [newContentFile, setNewContentFile] = useState<File | null>(null)
  const [newContentTxt, setNewContentTxt] = useState<File | null>(null)

  // 編集フォーム（全レベル共用）
  const [editTitle, setEditTitle] = useState('')
  const [editBody, setEditBody] = useState('')
  const [editColor, setEditColor] = useState<'blue' | 'orange' | 'purple'>('blue')
  const [editTxt, setEditTxt] = useState<File | null>(null)

  const contentFileRef = useRef<HTMLInputElement>(null)
  const contentTxtRef = useRef<HTMLInputElement>(null)
  const addTextInputRef = useRef<HTMLInputElement>(null)
  const addTextTargetId = useRef<string | null>(null)

  // ツリー構造
  const sections = items.filter(i => !i.parent_id).sort((a, b) => a.order_index - b.order_index)
  const getGroups = (sectionId: string) =>
    items.filter(i => i.parent_id === sectionId).sort((a, b) => a.order_index - b.order_index)
  const getContents = (groupId: string) =>
    items.filter(i => i.parent_id === groupId).sort((a, b) => a.order_index - b.order_index)

  // ── upload helpers ──────────────────────────────────────
  const uploadFile = async (file: File, itemId: string, oldUrl?: string | null): Promise<string | null> => {
    const fd = new FormData()
    fd.append('file', file); fd.append('itemId', itemId); fd.append('fileType', 'file')
    if (oldUrl) {
      const m = '/pdf-documents/'; const i = oldUrl.indexOf(m)
      if (i !== -1) fd.append('oldPath', oldUrl.slice(i + m.length))
    }
    const res = await fetch('/api/admin/local-contents', { method: 'PUT', body: fd })
    const data = await res.json()
    if (!res.ok) { setError(`アップロード失敗: ${data.error}`); return null }
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

  // ── 汎用 POST helper ─────────────────────────────────────
  const createItem = async (payload: Record<string, unknown>): Promise<LocalContent | null> => {
    const res = await fetch('/api/admin/local-contents', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const data = await res.json()
    if (!res.ok || !data.item) { setError(data.error ?? '登録失敗'); return null }
    return data.item
  }

  // ── セクション作成 ──────────────────────────────────────
  const handleCreateSection = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newSectionTitle.trim()) return
    setSaving(true); setError(null)
    try {
      const maxOrder = sections.length > 0 ? Math.max(...sections.map(i => i.order_index)) + 1 : 0
      const item = await createItem({ category: 'others', title: newSectionTitle.trim(), color: newSectionColor, order_index: maxOrder, parent_id: null })
      if (!item) return
      setItems(prev => [...prev, item])
      setNewSectionTitle(''); setNewSectionColor('blue'); setShowCreateSection(false)
    } finally { setSaving(false) }
  }

  // ── グループ作成（セクション直下） ──────────────────────
  const handleCreateGroup = async (e: React.FormEvent, sectionId: string) => {
    e.preventDefault()
    if (!newGroupTitle.trim()) return
    setSaving(true); setError(null)
    try {
      const siblings = getGroups(sectionId)
      const maxOrder = siblings.length > 0 ? Math.max(...siblings.map(i => i.order_index)) + 1 : 0
      const item = await createItem({
        category: 'others', parent_id: sectionId,
        title: newGroupTitle.trim(), body: newGroupBody.trim() || null,
        color: newGroupColor, order_index: maxOrder,
      })
      if (!item) return
      setItems(prev => [...prev, item])
      setNewGroupTitle(''); setNewGroupBody(''); setNewGroupColor('blue')
      setCreatingGroupFor(null)
    } finally { setSaving(false) }
  }

  // ── コンテンツ作成（グループ直下） ──────────────────────
  const handleCreateContent = async (e: React.FormEvent, groupId: string) => {
    e.preventDefault()
    if (!newContentTitle.trim()) return
    setSaving(true); setError(null)
    try {
      const siblings = getContents(groupId)
      const maxOrder = siblings.length > 0 ? Math.max(...siblings.map(i => i.order_index)) + 1 : 0
      let item = await createItem({
        category: 'others', parent_id: groupId,
        title: newContentTitle.trim(), body: newContentBody.trim() || null,
        color: newContentColor, order_index: maxOrder,
      })
      if (!item) return
      if (newContentFile) { const url = await uploadFile(newContentFile, item.id); if (url) item = { ...item, pdf_url: url } }
      if (newContentTxt) { const text = await uploadTxt(newContentTxt, item.id); if (text !== null) item = { ...item, extracted_text: text } }
      setItems(prev => [...prev, item!])
      setNewContentTitle(''); setNewContentBody(''); setNewContentColor('blue')
      setNewContentFile(null); setNewContentTxt(null)
      if (contentFileRef.current) contentFileRef.current.value = ''
      if (contentTxtRef.current) contentTxtRef.current.value = ''
      setCreatingContentFor(null)
    } finally { setSaving(false) }
  }

  // ── 編集（全レベル共用） ────────────────────────────────
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
      if (editTxt) {
        const text = await uploadTxt(editTxt, item.id)
        if (text !== null) updated = { ...updated, extracted_text: text }
      }
      setItems(prev => prev.map(i => i.id === item.id ? updated : i))
      setEditingId(null); setEditTxt(null)
    } finally { setSaving(false) }
  }

  // ── 削除 ─────────────────────────────────────────────────
  const handleDelete = async (item: LocalContent) => {
    const isSection = !item.parent_id
    const isGroup = !isSection && sections.some(s => s.id === item.parent_id)
    const msg = isSection
      ? `セクション「${item.title}」と配下のすべてのコンテンツを削除しますか？`
      : isGroup
        ? `グループ「${item.title}」と配下のコンテンツを削除しますか？`
        : `「${item.title}」を削除しますか？`
    if (!confirm(msg)) return
    await fetch('/api/admin/local-contents', {
      method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: item.id }),
    })
    // カスケード削除を想定して子孫も削除
    const descendants = (id: string): string[] => {
      const children = items.filter(i => i.parent_id === id)
      return [id, ...children.flatMap(c => descendants(c.id))]
    }
    const toRemove = new Set(descendants(item.id))
    setItems(prev => prev.filter(i => !toRemove.has(i.id)))
  }

  // ── ファイル操作 ──────────────────────────────────────────
  const handleAttachFile = async (item: LocalContent, file: File) => {
    setUploadingId(item.id); setError(null)
    const url = await uploadFile(file, item.id, item.pdf_url)
    if (url) setItems(prev => prev.map(i => i.id === item.id ? { ...i, pdf_url: url } : i))
    setUploadingId(null)
  }

  const handleRemoveFile = async (item: LocalContent) => {
    if (!item.pdf_url || !confirm('ファイルを削除しますか？')) return
    const m = '/pdf-documents/'; const idx = item.pdf_url.indexOf(m)
    if (idx === -1) return
    await fetch('/api/admin/local-contents', {
      method: 'DELETE', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ storagePath: item.pdf_url.slice(idx + m.length), itemId: item.id }),
    })
    setItems(prev => prev.map(i => i.id === item.id ? { ...i, pdf_url: null } : i))
  }

  // ── テキスト追加 ──────────────────────────────────────────
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

  // ── 編集フォーム共通 ─────────────────────────────────────
  const renderEditForm = (item: LocalContent, showBody: boolean, showFileAndTxt: boolean) => (
    <form onSubmit={e => handleEditSave(e, item)} className="space-y-3 p-4 bg-blue-50 border-b border-blue-100">
      <p className="text-xs font-semibold text-blue-600 flex items-center gap-1"><Pencil className="w-3.5 h-3.5" />編集</p>
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">タイトル</label>
        <input type="text" value={editTitle} onChange={e => setEditTitle(e.target.value)} className="input-field text-sm" required />
      </div>
      {showBody && (
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">本文</label>
          <textarea value={editBody} onChange={e => setEditBody(e.target.value)} rows={3} className="input-field text-sm resize-none" />
        </div>
      )}
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-2">色</label>
        <ColorSelect value={editColor} onChange={setEditColor} />
      </div>
      {showFileAndTxt && (
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">テキスト更新（任意）</label>
          <input type="file" accept=".txt" onChange={e => setEditTxt(e.target.files?.[0] ?? null)}
            className="block w-full text-sm text-gray-500 file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-sm file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200" />
          {editTxt && <p className="text-xs text-green-600 mt-1">✅ {editTxt.name}</p>}
          {item.extracted_text && !editTxt && <p className="text-xs text-green-600 mt-1">現在テキストあり</p>}
        </div>
      )}
      <div className="flex gap-2">
        <button type="submit" disabled={saving} className="flex items-center gap-1.5 text-sm bg-primary-600 text-white hover:bg-primary-700 px-3 py-1.5 rounded-lg disabled:opacity-50">
          <Check className="w-3.5 h-3.5" />{saving ? '保存中...' : '保存する'}
        </button>
        <button type="button" onClick={() => setEditingId(null)} className="btn-secondary text-sm py-1.5">キャンセル</button>
      </div>
    </form>
  )

  // ── コンテンツカード行（level3 leaf） ────────────────────
  const renderContent = (content: LocalContent, contents: LocalContent[], cidx: number) => {
    if (editingId === content.id) return <div key={content.id}>{renderEditForm(content, true, true)}</div>
    return (
      <div key={content.id} className="px-4 py-3 bg-gray-50/50 border-l-4 border-l-gray-200">
        <div className="flex flex-col gap-1.5 sm:flex-row sm:items-start sm:gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">{cidx + 1}</span>
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${colorBadge(content.color)}`}>
                {COLOR_OPTIONS.find(c => c.value === content.color)?.label}
              </span>
              <p className="font-semibold text-gray-800 text-sm">{content.title}</p>
            </div>
            {content.body && <p className="text-xs text-gray-500 mt-1 line-clamp-2">{content.body}</p>}
            <FileAttachArea
              currentUrl={content.pdf_url}
              uploading={uploadingId === content.id}
              onAttach={f => handleAttachFile(content, f)}
              onRemove={() => handleRemoveFile(content)}
            />
            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              {content.extracted_text ? (
                <span className="flex items-center gap-0.5 text-xs text-green-600"><CheckCircle2 className="w-3 h-3" />テキストあり</span>
              ) : (
                <>
                  <span className="flex items-center gap-0.5 text-xs text-gray-400"><XCircle className="w-3 h-3" />テキストなし</span>
                  <button type="button" onClick={() => handleAddTextClick(content.id)} disabled={addingTextId === content.id}
                    className="flex items-center gap-1 text-xs bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 px-2 py-0.5 rounded-full transition-colors disabled:opacity-50">
                    {addingTextId === content.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <PlusCircle className="w-3 h-3" />}テキスト追加
                  </button>
                </>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <button onClick={() => cidx > 0 && swap(content, contents[cidx - 1])} disabled={cidx === 0}
              className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded disabled:opacity-20" title="上へ">
              <ChevronUp className="w-4 h-4" />
            </button>
            <button onClick={() => cidx < contents.length - 1 && swap(content, contents[cidx + 1])} disabled={cidx === contents.length - 1}
              className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded disabled:opacity-20" title="下へ">
              <ChevronDown className="w-4 h-4" />
            </button>
            <button onClick={() => handleEditStart(content)} className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded">
              <Pencil className="w-4 h-4" />
            </button>
            <button onClick={() => handleDelete(content)} className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── グループ行（level2） ──────────────────────────────────
  const renderGroup = (group: LocalContent, groups: LocalContent[], gidx: number) => {
    const isExpanded = expandedGroupId === group.id
    const contents = getContents(group.id)
    if (editingId === group.id) return <div key={group.id}>{renderEditForm(group, true, true)}</div>
    return (
      <div key={group.id} className="border-t border-gray-100">
        {/* グループヘッダー行 */}
        <div className="flex items-center gap-2 px-4 py-2.5 bg-gray-50/80">
          <button onClick={() => setExpandedGroupId(isExpanded ? null : group.id)}
            className="flex-1 flex items-center gap-2 text-left min-w-0">
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full flex-shrink-0 ${colorBadge(group.color)}`}>
              {COLOR_OPTIONS.find(c => c.value === group.color)?.label}
            </span>
            <span className="font-semibold text-gray-800 text-sm truncate">{group.title}</span>
            <span className="text-xs text-gray-400 ml-auto flex-shrink-0">{contents.length}件</span>
            {isExpanded ? <ChevronUp className="w-4 h-4 text-gray-400 flex-shrink-0" /> : <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />}
          </button>
          <div className="w-px h-5 bg-gray-200 flex-shrink-0" />
          <div className="flex items-center gap-0.5 flex-shrink-0">
            <button onClick={() => gidx > 0 && swap(group, groups[gidx - 1])} disabled={gidx === 0}
              className="w-7 h-7 flex items-center justify-center text-sm font-bold text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded disabled:opacity-20 transition-colors">↑</button>
            <button onClick={() => gidx < groups.length - 1 && swap(group, groups[gidx + 1])} disabled={gidx === groups.length - 1}
              className="w-7 h-7 flex items-center justify-center text-sm font-bold text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded disabled:opacity-20 transition-colors">↓</button>
          </div>
          <div className="w-px h-5 bg-gray-200 flex-shrink-0" />
          {/* ファイル操作（グループにもファイル添付可） */}
          {group.pdf_url ? (
            <a href={group.pdf_url} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs text-primary-600 hover:text-primary-700 p-1.5 rounded hover:bg-primary-50">
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          ) : null}
          <div className="flex items-center gap-0.5 flex-shrink-0">
            <button onClick={() => handleEditStart(group)} className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded">
              <Pencil className="w-4 h-4" />
            </button>
            <button onClick={() => handleDelete(group)} className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* コンテンツカード一覧（グループ展開時） */}
        {isExpanded && (
          <div className="ml-4 border-l-2 border-gray-100">
            {contents.map((content, cidx) => renderContent(content, contents, cidx))}

            {/* コンテンツ追加フォーム */}
            {creatingContentFor === group.id ? (
              <div className="px-4 py-4 bg-indigo-50 border-l-4 border-l-indigo-300">
                <p className="text-xs font-semibold text-indigo-600 mb-3">コンテンツの追加</p>
                <form onSubmit={e => handleCreateContent(e, group.id)} className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">タイトル <span className="text-red-500">*</span></label>
                    <input type="text" value={newContentTitle} onChange={e => setNewContentTitle(e.target.value)} className="input-field text-sm" required />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">本文</label>
                    <textarea value={newContentBody} onChange={e => setNewContentBody(e.target.value)} rows={3} className="input-field text-sm resize-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-2">色</label>
                    <ColorSelect value={newContentColor} onChange={setNewContentColor} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">PDF・画像添付（任意）</label>
                    <input ref={contentFileRef} type="file" accept="application/pdf,image/jpeg,image/png,image/gif,image/webp"
                      onChange={e => setNewContentFile(e.target.files?.[0] ?? null)}
                      className="block w-full text-sm text-gray-500 file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-sm file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200" />
                    {newContentFile && <p className="text-xs text-green-600 mt-1">✅ {newContentFile.name}</p>}
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">テキストファイル（任意・検索用）</label>
                    <input ref={contentTxtRef} type="file" accept=".txt"
                      onChange={e => setNewContentTxt(e.target.files?.[0] ?? null)}
                      className="block w-full text-sm text-gray-500 file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-sm file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200" />
                    {newContentTxt && <p className="text-xs text-green-600 mt-1">✅ {newContentTxt.name}</p>}
                  </div>
                  <div className="flex gap-2">
                    <button type="submit" disabled={saving} className="btn-primary text-sm py-1.5">{saving ? '登録中...' : '追加する'}</button>
                    <button type="button" onClick={() => { setCreatingContentFor(null); setNewContentTitle(''); setNewContentBody(''); setNewContentColor('blue'); setNewContentFile(null); setNewContentTxt(null) }}
                      className="btn-secondary text-sm py-1.5">キャンセル</button>
                  </div>
                </form>
              </div>
            ) : (
              <div className="px-4 py-2">
                <button onClick={() => setCreatingContentFor(group.id)}
                  className="flex items-center gap-1 text-xs text-indigo-500 hover:text-indigo-600 transition-colors">
                  <PlusCircle className="w-3.5 h-3.5" />コンテンツを追加
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    )
  }

  // ── メインレンダリング ────────────────────────────────────
  return (
    <div className="space-y-4">
      <button onClick={() => { setShowCreateSection(!showCreateSection); setError(null) }}
        className="btn-primary flex items-center gap-2">
        <Plus className="w-4 h-4" />セクションを追加
      </button>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">{error}</div>
      )}

      {/* セクション作成フォーム */}
      {showCreateSection && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <h2 className="font-semibold text-gray-800 mb-4">セクションの新規追加</h2>
          <form onSubmit={handleCreateSection} className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">セクション名 <span className="text-red-500">*</span></label>
              <input type="text" value={newSectionTitle} onChange={e => setNewSectionTitle(e.target.value)} placeholder="例: 浜区会則" className="input-field" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">色</label>
              <ColorSelect value={newSectionColor} onChange={setNewSectionColor} />
            </div>
            <div className="flex gap-2 pt-1">
              <button type="submit" disabled={saving} className="btn-primary">{saving ? '登録中...' : '登録する'}</button>
              <button type="button" onClick={() => setShowCreateSection(false)} className="btn-secondary">キャンセル</button>
            </div>
          </form>
        </div>
      )}

      {/* セクション一覧 */}
      <div className="space-y-3">
        {sections.length === 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 text-center py-10 text-gray-400 text-sm">
            <FolderOpen className="w-8 h-8 mx-auto mb-2 text-gray-300" />
            セクションはまだありません
          </div>
        )}
        {sections.map((section, sidx) => {
          const isExpanded = expandedSectionId === section.id
          const groups = getGroups(section.id)

          return (
            <div key={section.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              {/* セクションヘッダー行 */}
              {editingId === section.id ? (
                renderEditForm(section, false, false)
              ) : (
                <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-50">
                  <button onClick={() => { setExpandedSectionId(isExpanded ? null : section.id); setExpandedGroupId(null) }}
                    className="flex-1 flex items-center gap-2 text-left min-w-0">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full flex-shrink-0 ${colorBadge(section.color)}`}>
                      {COLOR_OPTIONS.find(c => c.value === section.color)?.label}
                    </span>
                    <span className="font-semibold text-gray-800 text-sm truncate">{section.title}</span>
                    <span className="text-xs text-gray-400 ml-auto flex-shrink-0">{groups.length}グループ</span>
                    {isExpanded ? <ChevronUp className="w-4 h-4 text-gray-400 flex-shrink-0" /> : <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />}
                  </button>
                  <div className="w-px h-5 bg-gray-200 flex-shrink-0" />
                  <div className="flex items-center gap-0.5 flex-shrink-0">
                    <button onClick={() => sidx > 0 && swap(section, sections[sidx - 1])} disabled={sidx === 0}
                      className="w-7 h-7 flex items-center justify-center text-sm font-bold text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded disabled:opacity-20 transition-colors">↑</button>
                    <button onClick={() => sidx < sections.length - 1 && swap(section, sections[sidx + 1])} disabled={sidx === sections.length - 1}
                      className="w-7 h-7 flex items-center justify-center text-sm font-bold text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded disabled:opacity-20 transition-colors">↓</button>
                  </div>
                  <div className="w-px h-5 bg-gray-200 flex-shrink-0" />
                  <div className="flex items-center gap-0.5 flex-shrink-0">
                    <button onClick={() => handleEditStart(section)} className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded">
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDelete(section)} className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* グループ一覧（セクション展開時） */}
              {isExpanded && (
                <div>
                  {groups.map((group, gidx) => renderGroup(group, groups, gidx))}

                  {/* グループ追加フォーム */}
                  {creatingGroupFor === section.id ? (
                    <div className="px-4 py-4 bg-teal-50 border-t border-teal-100">
                      <p className="text-xs font-semibold text-teal-600 mb-3">グループの追加</p>
                      <form onSubmit={e => handleCreateGroup(e, section.id)} className="space-y-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">グループ名 <span className="text-red-500">*</span></label>
                          <input type="text" value={newGroupTitle} onChange={e => setNewGroupTitle(e.target.value)} className="input-field text-sm" required />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">本文（任意）</label>
                          <textarea value={newGroupBody} onChange={e => setNewGroupBody(e.target.value)} rows={2} className="input-field text-sm resize-none" />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-2">色</label>
                          <ColorSelect value={newGroupColor} onChange={setNewGroupColor} />
                        </div>
                        <div className="flex gap-2">
                          <button type="submit" disabled={saving} className="btn-primary text-sm py-1.5">{saving ? '登録中...' : '追加する'}</button>
                          <button type="button" onClick={() => { setCreatingGroupFor(null); setNewGroupTitle(''); setNewGroupBody(''); setNewGroupColor('blue') }}
                            className="btn-secondary text-sm py-1.5">キャンセル</button>
                        </div>
                      </form>
                    </div>
                  ) : (
                    <div className="px-4 py-2 border-t border-gray-50">
                      <button onClick={() => setCreatingGroupFor(section.id)}
                        className="flex items-center gap-1 text-xs text-teal-500 hover:text-teal-600 transition-colors">
                        <PlusCircle className="w-3.5 h-3.5" />グループを追加
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
