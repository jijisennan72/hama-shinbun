'use client'

import { useRef, useState } from 'react'
import { Upload, Trash2, FileText, Loader2, CheckCircle2, XCircle, PlusCircle } from 'lucide-react'

interface PdfDocument {
  id: string
  title: string
  published_at: string
  file_url: string
  year: number
  month: number
  extracted_text?: string | null
}

function toJapaneseEra(year: number): string {
  if (year >= 2019) {
    const n = year - 2018
    return n === 1 ? '令和元年' : `令和${n}年`
  }
  if (year >= 1989) return `平成${year - 1988}年`
  return ''
}

export default function AdminPdfManager({ initialPdfs }: { initialPdfs: PdfDocument[] }) {
  const [pdfs, setPdfs] = useState(initialPdfs)
  const [uploading, setUploading] = useState(false)
  const [year, setYear] = useState(new Date().getFullYear())
  const [month, setMonth] = useState(new Date().getMonth() + 1)
  const [file, setFile] = useState<File | null>(null)
  const [txtFile, setTxtFile] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [addingTextId, setAddingTextId] = useState<string | null>(null)
  const addTextInputRef = useRef<HTMLInputElement>(null)
  const addTextTargetId = useRef<string | null>(null)

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!file) return
    setUploading(true)
    setError(null)

    const fd = new FormData()
    fd.append('file', file)
    fd.append('year', String(year))
    fd.append('month', String(month))
    if (txtFile) fd.append('txtFile', txtFile)

    const res = await fetch('/api/admin/pdf-documents', { method: 'POST', body: fd })
    const data = await res.json()

    if (!res.ok || !data.pdf) {
      setError(`PDFアップロードに失敗しました: ${data.error ?? ''}`)
      setUploading(false)
      return
    }

    setPdfs(prev => [data.pdf, ...prev])
    setFile(null)
    setTxtFile(null)
    setUploading(false)
  }

  const handleDelete = async (pdf: PdfDocument) => {
    if (!confirm(`「${pdf.title}」を削除しますか？`)) return
    const pdfPath = pdf.file_url.split('/').pop() ?? null

    const res = await fetch('/api/admin/pdf-documents', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: pdf.id, pdfPath }),
    })
    if (!res.ok) {
      const d = await res.json()
      setError(`削除に失敗しました: ${d.error ?? ''}`)
      return
    }
    setPdfs(prev => prev.filter(p => p.id !== pdf.id))
  }

  const handleAddTextClick = (pdfId: string) => {
    addTextTargetId.current = pdfId
    addTextInputRef.current?.click()
  }

  const handleAddTextChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    const pdfId = addTextTargetId.current
    if (!selectedFile || !pdfId) return

    setAddingTextId(pdfId)
    setError(null)

    const pdf = pdfs.find(p => p.id === pdfId)
    const pdfFileName = pdf?.file_url.split('/').pop() ?? ''

    const fd = new FormData()
    fd.append('txtFile', selectedFile)
    fd.append('pdfId', pdfId)
    fd.append('pdfFileName', pdfFileName)

    const res = await fetch('/api/admin/pdf-documents', { method: 'PUT', body: fd })
    const data = await res.json()

    if (!res.ok) {
      setError(`テキスト追加に失敗しました: ${data.error ?? ''}`)
    } else {
      setPdfs(prev => prev.map(p => p.id === pdfId ? { ...p, extracted_text: data.text } : p))
    }

    setAddingTextId(null)
    if (addTextInputRef.current) addTextInputRef.current.value = ''
  }

  return (
    <div className="space-y-4">
      {/* 新規登録フォーム */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h2 className="font-semibold text-gray-800 mb-4">はま新聞を追加</h2>
        <form onSubmit={handleUpload} className="space-y-3">
          <div className="flex gap-2">
            <select value={year} onChange={e => setYear(parseInt(e.target.value))} className="input-field">
              {Array.from({ length: 8 }, (_, i) => new Date().getFullYear() - i).map(y => (
                <option key={y} value={y}>{y}年（{toJapaneseEra(y)}）</option>
              ))}
            </select>
            <select value={month} onChange={e => setMonth(parseInt(e.target.value))} className="input-field">
              {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                <option key={m} value={m}>{m}月</option>
              ))}
            </select>
          </div>

          {/* PDFファイル選択 */}
          <div className="border-2 border-dashed border-gray-200 rounded-lg p-4 text-center">
            <input type="file" accept="application/pdf" onChange={e => setFile(e.target.files?.[0] || null)} className="hidden" id="pdf-upload" required />
            <label htmlFor="pdf-upload" className="cursor-pointer">
              {file ? (
                <div className="flex items-center justify-center gap-2 text-primary-600">
                  <FileText className="w-5 h-5" />
                  <span className="text-sm font-medium">{file.name}</span>
                </div>
              ) : (
                <div className="text-gray-400">
                  <Upload className="w-8 h-8 mx-auto mb-1" />
                  <p className="text-sm">PDFファイルを選択</p>
                </div>
              )}
            </label>
          </div>

          {/* テキストファイル選択（任意） */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              📝 テキストファイル（任意・検索用）
            </label>
            <input
              type="file"
              accept=".txt"
              onChange={e => setTxtFile(e.target.files?.[0] || null)}
              className="block w-full text-sm text-gray-500 file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-sm file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200"
            />
            {txtFile && (
              <p className="mt-1 text-xs text-green-600">✅ {txtFile.name}</p>
            )}
            <p className="mt-1 text-xs text-gray-400">
              同じ名前のPDFと対応するテキストファイルを登録できます
            </p>
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
          )}

          <button type="submit" disabled={uploading || !file} className="btn-primary w-full flex items-center justify-center gap-2" aria-label="追加する">
            {uploading ? <><Loader2 className="w-4 h-4 animate-spin" />アップロード中...</> : <><Upload className="w-4 h-4" />追加する</>}
          </button>
        </form>
      </div>

      {/* 一覧 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-100">
          <span className="font-semibold text-gray-700">登録済みはま新聞（{pdfs.length}件）</span>
        </div>
        {pdfs.length === 0 ? (
          <div className="text-center py-8 text-gray-400 text-sm">PDFはまだありません</div>
        ) : (
          <div className="divide-y divide-gray-50">
            {pdfs.map(pdf => {
              const hasText = !!(pdf.extracted_text && pdf.extracted_text.trim())
              return (
                <div key={pdf.id} className="flex items-center gap-3 p-3">
                  <FileText className="w-5 h-5 text-red-500 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-800 text-sm truncate">{pdf.title}</p>
                    <p className="text-xs text-gray-400 flex items-center gap-2">
                      {pdf.year}年{pdf.month}月
                      {hasText ? (
                        <span className="inline-flex items-center gap-0.5 text-green-600">
                          <CheckCircle2 className="w-3 h-3" />📝✅ テキストあり
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-0.5 text-gray-400">
                          <XCircle className="w-3 h-3" />📝❌ テキストなし
                        </span>
                      )}
                    </p>
                  </div>
                  {!hasText && (
                    <button
                      onClick={() => handleAddTextClick(pdf.id)}
                      disabled={addingTextId === pdf.id}
                      className="flex items-center gap-1 text-xs bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 px-2 py-1 rounded transition-colors disabled:opacity-50"
                    >
                      {addingTextId === pdf.id
                        ? <Loader2 className="w-3 h-3 animate-spin" />
                        : <PlusCircle className="w-3 h-3" />
                      }
                      テキスト追加
                    </button>
                  )}
                  <button onClick={() => handleDelete(pdf)} className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* テキスト追加用の隠しinput（一覧共通） */}
      <input
        ref={addTextInputRef}
        type="file"
        accept=".txt"
        className="hidden"
        onChange={handleAddTextChange}
      />
    </div>
  )
}
