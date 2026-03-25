'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Upload, Trash2, FileText, Loader2, RefreshCw, CheckCircle2 } from 'lucide-react'

interface PdfDocument {
  id: string
  title: string
  published_at: string
  file_url: string
  year: number
  month: number
  extracted_text?: string | null
}

export default function AdminPdfManager({ initialPdfs }: { initialPdfs: PdfDocument[] }) {
  const [pdfs, setPdfs] = useState(initialPdfs)
  const [uploading, setUploading] = useState(false)
  const [year, setYear] = useState(new Date().getFullYear())
  const [month, setMonth] = useState(new Date().getMonth() + 1)
  const [file, setFile] = useState<File | null>(null)
  const [backfilling, setBackfilling] = useState(false)
  const [backfillStatus, setBackfillStatus] = useState('')
  const supabase = createClient()

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!file) return
    setUploading(true)
    const fileName = `${year}-${String(month).padStart(2, '0')}-${Date.now()}.pdf`
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('pdf-documents')
      .upload(fileName, file, { contentType: 'application/pdf' })
    if (uploadError) { alert('アップロードに失敗しました'); setUploading(false); return }
    const { data: { publicUrl } } = supabase.storage.from('pdf-documents').getPublicUrl(uploadData.path)
    const { data: newPdf } = await supabase.from('pdf_documents').insert({
      title: 'はま新聞',
      file_url: publicUrl,
      file_size: file.size,
      year,
      month,
      published_at: new Date(year, month - 1).toISOString(),
    }).select().single()
    if (newPdf) {
      setPdfs(prev => [newPdf, ...prev])
      // テキスト抽出を同期実行
      try {
        const res = await fetch('/api/extract-pdf', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pdfId: newPdf.id, pdfUrl: publicUrl }),
        })
        const result = await res.json()
        if (result.success) {
          setPdfs(prev => prev.map(p =>
            p.id === newPdf.id ? { ...p, extracted_text: `(${result.chars}文字抽出済み)` } : p
          ))
        } else {
          console.error('[AdminPdfManager] extract failed:', result.error)
        }
      } catch (extractErr) {
        console.error('[AdminPdfManager] extract fetch error:', extractErr)
      }
    }
    setFile(null)
    setUploading(false)
  }

  const handleDelete = async (pdf: PdfDocument) => {
    if (!confirm(`「${pdf.title}」を削除しますか？`)) return
    const path = pdf.file_url.split('/').pop()
    if (path) await supabase.storage.from('pdf-documents').remove([path])
    await supabase.from('pdf_documents').delete().eq('id', pdf.id)
    setPdfs(prev => prev.filter(p => p.id !== pdf.id))
  }

  const handleBackfill = async () => {
    const targets = pdfs.filter(p => !p.extracted_text)
    if (targets.length === 0) { alert('未抽出のPDFはありません'); return }
    setBackfilling(true)
    for (let i = 0; i < targets.length; i++) {
      setBackfillStatus(`${i + 1}/${targets.length} 処理中...`)
      await fetch('/api/extract-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pdfId: targets[i].id, pdfUrl: targets[i].file_url }),
      })
    }
    // リスト更新
    const { data } = await supabase.from('pdf_documents').select('*').order('published_at', { ascending: false })
    if (data) setPdfs(data)
    setBackfilling(false)
    setBackfillStatus(`完了（${targets.length}件）`)
    setTimeout(() => setBackfillStatus(''), 3000)
  }

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h2 className="font-semibold text-gray-800 mb-4">はま新聞を追加</h2>
        <form onSubmit={handleUpload} className="space-y-3">
          <div className="flex gap-2">
            <select value={year} onChange={e => setYear(parseInt(e.target.value))} className="input-field">
              {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map(y => (
                <option key={y} value={y}>{y}年</option>
              ))}
            </select>
            <select value={month} onChange={e => setMonth(parseInt(e.target.value))} className="input-field">
              {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                <option key={m} value={m}>{m}月</option>
              ))}
            </select>
          </div>
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
          <button type="submit" disabled={uploading || !file} className="btn-primary w-full flex items-center justify-center gap-2" aria-label="追加する">
            {uploading ? <><Loader2 className="w-4 h-4 animate-spin" />アップロード中...</> : <><Upload className="w-4 h-4" />追加する</>}
          </button>
        </form>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <span className="font-semibold text-gray-700">登録済みはま新聞（{pdfs.length}件）</span>
          <div className="flex items-center gap-2">
            {backfillStatus && (
              <span className="text-xs text-gray-500">{backfillStatus}</span>
            )}
            <button
              onClick={handleBackfill}
              disabled={backfilling}
              className="flex items-center gap-1.5 text-xs bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
            >
              {backfilling
                ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />抽出中...</>
                : <><RefreshCw className="w-3.5 h-3.5" />テキスト再抽出</>
              }
            </button>
          </div>
        </div>
        {pdfs.length === 0 ? (
          <div className="text-center py-8 text-gray-400 text-sm">PDFはまだありません</div>
        ) : (
          <div className="divide-y divide-gray-50">
            {pdfs.map(pdf => (
              <div key={pdf.id} className="flex items-center gap-3 p-3">
                <FileText className="w-5 h-5 text-red-500 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-800 text-sm truncate">{pdf.title}</p>
                  <p className="text-xs text-gray-400">
                    {pdf.year}年{pdf.month}月
                    {pdf.extracted_text
                      ? <span className="ml-2 text-green-600 inline-flex items-center gap-0.5"><CheckCircle2 className="w-3 h-3" />テキスト抽出済み</span>
                      : <span className="ml-2 text-gray-400">未抽出</span>
                    }
                  </p>
                </div>
                <button onClick={() => handleDelete(pdf)} className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
