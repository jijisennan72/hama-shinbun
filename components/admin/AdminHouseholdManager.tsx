'use client'

import { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Users, Plus, Edit2, Check, X, Upload, Download, AlertCircle, CheckCircle, ChevronLeft, ChevronRight, Search } from 'lucide-react'

const PAGE_SIZE = 10

interface Household {
  id: string
  household_number: string
  name: string
  is_admin: boolean
  user_id: string | null
}

interface CsvRow {
  number: string
  name: string
  pin: string
  error?: string
}

const CSV_TEMPLATE = '利用者番号,利用者名,PINコード\n101,山田家,1234\n102,田中家,5678\n'

function parseCsv(text: string): CsvRow[] {
  const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n').filter(l => l.trim())
  // ヘッダー行を除外（1行目が数字でない場合）
  const dataLines = lines[0] && /^\d/.test(lines[0].split(',')[0].trim()) ? lines : lines.slice(1)
  return dataLines.map(line => {
    const parts = line.split(',').map(s => s.trim())
    const number = parts[0] ?? ''
    const name = parts[1] ?? ''
    const pin = parts[2] ?? ''
    let error: string | undefined
    if (!number) error = '利用者番号が空です'
    else if (!name) error = '利用者名が空です'
    else if (!/^\d{4}$/.test(pin)) error = 'PINは4桁の数字が必要です'
    return { number, name, pin, error }
  })
}

function downloadTemplate() {
  const blob = new Blob(['\uFEFF' + CSV_TEMPLATE], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = '利用者登録テンプレート.csv'
  a.click()
  URL.revokeObjectURL(url)
}

export default function AdminHouseholdManager({ initialHouseholds }: { initialHouseholds: Household[] }) {
  const [households, setHouseholds] = useState(initialHouseholds)
  const [showCreate, setShowCreate] = useState(false)
  const [newNumber, setNewNumber] = useState('')
  const [newName, setNewName] = useState('')
  const [newPin, setNewPin] = useState('')
  const [creating, setCreating] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editPin, setEditPin] = useState('')
  const [editSaving, setEditSaving] = useState(false)

  // 検索・ページネーション
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(0)

  // CSV一括登録
  const [csvRows, setCsvRows] = useState<CsvRow[] | null>(null)
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState<{ success: number; errors: string[] } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const supabase = createClient()

  const createHousehold = async (e: React.FormEvent) => {
    e.preventDefault()
    if (newPin.length !== 4) { alert('PINは4桁で入力してください'); return }
    setCreating(true)
    const res = await fetch('/api/admin/households', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ householdNumber: newNumber, name: newName, pin: newPin }),
    })
    const data = await res.json()
    if (data.household) {
      setHouseholds(prev => [...prev, data.household].sort((a, b) => a.household_number.localeCompare(b.household_number)))
    }
    setNewNumber('')
    setNewName('')
    setNewPin('')
    setShowCreate(false)
    setCreating(false)
  }

  const updateHousehold = async (id: string) => {
    if (editPin && !/^\d{4}$/.test(editPin)) {
      alert('PINは4桁の数字で入力してください')
      return
    }
    setEditSaving(true)
    const res = await fetch('/api/admin/households', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ householdId: id, name: editName, newPin: editPin || undefined }),
    })
    const data = await res.json()
    if (data.error) {
      alert(`更新に失敗しました：${data.error}`)
      setEditSaving(false)
      return
    }
    setHouseholds(prev => prev.map(h => h.id === id ? { ...h, name: editName } : h))
    setEditingId(null)
    setEditPin('')
    setEditSaving(false)
  }

  // ---- CSV ----

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => {
      const text = ev.target?.result as string
      const rows = parseCsv(text)
      // 既存の利用者番号と重複チェック
      const existingNumbers = new Set(households.map(h => h.household_number))
      const checked = rows.map(row => ({
        ...row,
        error: row.error ?? (existingNumbers.has(row.number) ? `利用者番号 ${row.number} はすでに登録されています` : undefined),
      }))
      setCsvRows(checked)
      setImportResult(null)
    }
    reader.readAsText(file, 'UTF-8')
    e.target.value = ''
  }

  const handleBulkImport = async () => {
    if (!csvRows) return
    const validRows = csvRows.filter(r => !r.error)
    if (validRows.length === 0) { alert('登録可能なデータがありません'); return }
    if (!confirm(`${validRows.length}件の利用者を一括登録します。よろしいですか？`)) return

    setImporting(true)
    let success = 0
    const errors: string[] = []

    for (const row of validRows) {
      const res = await fetch('/api/admin/households', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ householdNumber: row.number, name: row.name, pin: row.pin }),
      })
      const data = await res.json()
      if (data.household) {
        setHouseholds(prev => [...prev, data.household].sort((a, b) => a.household_number.localeCompare(b.household_number)))
        success++
      } else {
        errors.push(`${row.number}番（${row.name}）: ${data.error ?? '登録失敗'}`)
      }
    }

    setImportResult({ success, errors })
    setImporting(false)
    setCsvRows(null)
  }

  const resetCsv = () => {
    setCsvRows(null)
    setImportResult(null)
  }

  const validCount = csvRows?.filter(r => !r.error).length ?? 0
  const errorCount = csvRows?.filter(r => r.error).length ?? 0

  return (
    <div className="space-y-4">
      {/* ---- アクションボタン ---- */}
      <div className="flex flex-wrap gap-2">
        <button onClick={() => { setShowCreate(!showCreate); resetCsv() }} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" />
          新規利用者登録
        </button>
        <label className="btn-secondary flex items-center gap-2 cursor-pointer">
          <Upload className="w-4 h-4" />
          CSVで一括登録
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={handleFileSelect}
          />
        </label>
        <button onClick={downloadTemplate} className="btn-secondary flex items-center gap-2">
          <Download className="w-4 h-4" />
          CSVテンプレート
        </button>
      </div>

      {/* ---- 個別登録フォーム ---- */}
      {showCreate && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <form onSubmit={createHousehold} className="space-y-3">
            <input type="text" value={newNumber} onChange={e => setNewNumber(e.target.value)} placeholder="利用者番号（例: 101）" className="input-field" required />
            <input type="text" value={newName} onChange={e => setNewName(e.target.value)} placeholder="利用者名（例: 山田家）" className="input-field" required />
            <input type="text" value={newPin} onChange={e => setNewPin(e.target.value.replace(/\D/g, '').slice(0, 4))} placeholder="PINコード（4桁）" className="input-field" inputMode="numeric" maxLength={4} required />
            <div className="flex gap-2">
              <button type="submit" disabled={creating} className="btn-primary">登録する</button>
              <button type="button" onClick={() => setShowCreate(false)} className="btn-secondary">キャンセル</button>
            </div>
          </form>
        </div>
      )}

      {/* ---- CSV登録結果 ---- */}
      {importResult && (
        <div className={`rounded-xl border p-4 space-y-2 ${importResult.errors.length > 0 ? 'bg-yellow-50 border-yellow-200' : 'bg-green-50 border-green-200'}`}>
          <p className="flex items-center gap-2 text-sm font-semibold text-gray-700">
            <CheckCircle className="w-4 h-4 text-green-500" />
            {importResult.success}件の登録が完了しました
          </p>
          {importResult.errors.length > 0 && (
            <div>
              <p className="flex items-center gap-1.5 text-xs font-semibold text-red-600 mb-1">
                <AlertCircle className="w-3.5 h-3.5" />
                {importResult.errors.length}件のエラー
              </p>
              <ul className="space-y-0.5">
                {importResult.errors.map((e, i) => (
                  <li key={i} className="text-xs text-red-600">・{e}</li>
                ))}
              </ul>
            </div>
          )}
          <button onClick={() => setImportResult(null)} className="text-xs text-gray-400 hover:text-gray-600 underline mt-1">
            閉じる
          </button>
        </div>
      )}

      {/* ---- CSVプレビュー ---- */}
      {csvRows && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between">
            <div>
              <p className="font-semibold text-gray-800 text-sm">CSV読み込みプレビュー</p>
              <p className="text-xs text-gray-500 mt-0.5">
                全{csvRows.length}件：
                <span className="text-green-600 font-medium ml-1">登録可能 {validCount}件</span>
                {errorCount > 0 && <span className="text-red-500 font-medium ml-2">スキップ {errorCount}件</span>}
              </p>
            </div>
            <button onClick={resetCsv} className="p-1 text-gray-400 hover:text-gray-600">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left px-3 py-2 font-semibold text-gray-600 w-20">利用者番号</th>
                  <th className="text-left px-3 py-2 font-semibold text-gray-600">利用者名</th>
                  <th className="text-left px-3 py-2 font-semibold text-gray-600 w-20">PIN</th>
                  <th className="text-left px-3 py-2 font-semibold text-gray-600">状態</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {csvRows.map((row, i) => (
                  <tr key={i} className={row.error ? 'bg-red-50' : ''}>
                    <td className="px-3 py-2 font-mono text-gray-700">{row.number || '—'}</td>
                    <td className="px-3 py-2 text-gray-700">{row.name || '—'}</td>
                    <td className="px-3 py-2 font-mono text-gray-400">{'*'.repeat(row.pin.length)}</td>
                    <td className="px-3 py-2">
                      {row.error
                        ? <span className="text-red-500 flex items-center gap-1"><AlertCircle className="w-3 h-3 flex-shrink-0" />{row.error}</span>
                        : <span className="text-green-600 flex items-center gap-1"><CheckCircle className="w-3 h-3" />登録可</span>
                      }
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {validCount > 0 && (
            <div className="p-4 border-t border-gray-100 flex gap-2">
              <button
                onClick={handleBulkImport}
                disabled={importing}
                className="btn-primary flex items-center gap-2"
              >
                <Upload className="w-4 h-4" />
                {importing ? '登録中...' : `${validCount}件を登録実行`}
              </button>
              <button onClick={resetCsv} className="btn-secondary">キャンセル</button>
            </div>
          )}
        </div>
      )}

      {/* ---- 利用者一覧 ---- */}
      {(() => {
        const filtered = households.filter(h =>
          h.name.includes(search) || h.household_number.includes(search)
        )
        const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
        const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)
        return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {/* 検索ボックス */}
        <div className="p-3 border-b border-gray-100">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(0) }}
              placeholder="名前・番号で絞り込み..."
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-400"
            />
          </div>
        </div>
        <div className="px-3 py-2 bg-gray-50 border-b border-gray-100 flex gap-4 text-xs font-semibold text-gray-600">
          <span className="w-16">番号</span>
          <span className="flex-1">利用者名</span>
          <span className="w-12">管理者</span>
          <span className="w-8"></span>
        </div>
        {filtered.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <Users className="w-8 h-8 mx-auto mb-2" />
            <p className="text-sm">{search ? '該当する利用者がいません' : '利用者はありません'}</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {paged.map(h => (
              <div key={h.id} className="flex items-center gap-4 p-3">
                <span className="w-16 text-sm font-mono text-gray-600">#{h.household_number}</span>
                <div className="flex-1">
                  {editingId === h.id ? (
                    <div className="space-y-1">
                      <div className="flex items-center gap-1">
                        <input
                          value={editName}
                          onChange={e => setEditName(e.target.value)}
                          className="input-field text-sm py-1"
                          placeholder="利用者名"
                          autoFocus
                        />
                      </div>
                      <div className="flex items-center gap-1">
                        <input
                          value={editPin}
                          onChange={e => setEditPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                          className="input-field text-sm py-1 w-28"
                          placeholder="新PIN（空欄=変更なし）"
                          inputMode="numeric"
                          maxLength={4}
                        />
                      </div>
                      <div className="flex items-center gap-1">
                        <button onClick={() => updateHousehold(h.id)} disabled={editSaving} className="p-1 text-green-600 disabled:opacity-50">
                          <Check className="w-4 h-4" />
                        </button>
                        <button onClick={() => { setEditingId(null); setEditPin('') }} className="p-1 text-gray-400">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <span className="text-sm font-medium text-gray-800">{h.name}</span>
                  )}
                </div>
                <span className="w-12 text-center">
                  {h.is_admin && <span className="text-xs bg-orange-100 text-orange-600 px-1.5 py-0.5 rounded">管理者</span>}
                </span>
                {!h.is_admin && (
                  <button onClick={() => { setEditingId(h.id); setEditName(h.name); setEditPin('') }} className="w-8 p-1 text-gray-400 hover:text-gray-600">
                    <Edit2 className="w-4 h-4" />
                  </button>
                )}
                {h.is_admin && <span className="w-8" />}
              </div>
            ))}
          </div>
        )}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 text-sm text-gray-500">
            <button onClick={() => setPage(p => p - 1)} disabled={page === 0}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
              <ChevronLeft className="w-4 h-4" />前へ
            </button>
            <span className="text-xs">{page + 1} / {totalPages} ページ（{filtered.length}件）</span>
            <button onClick={() => setPage(p => p + 1)} disabled={page >= totalPages - 1}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
              次へ<ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
        )
      })()}
    </div>
  )
}
