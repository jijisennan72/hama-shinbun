'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  Plus, Trash2, BarChart2, ToggleLeft, ToggleRight,
  ChevronDown, ChevronUp, X, MessageSquare, FileText, Upload,
} from 'lucide-react'

// ---- 型定義 ----

interface QuestionDraft {
  localId: string
  text: string
  type: 'single' | 'multiple'
  options: string[]
}

interface Survey {
  id: string
  title: string
  description: string | null
  is_active: boolean
  attachment_url: string | null
  created_at: string
  starts_at: string | null
  expires_at: string | null
  respondent_count: number
}

interface SurveyQuestion {
  id: string
  question_text: string
  question_type: 'single' | 'multiple' | 'text'
  options: string[] | null
  order_index: number
}

interface SurveyResponse {
  question_id: string
  household_id: string
  answer: string
}

interface SurveyResults {
  questions: SurveyQuestion[]
  responses: SurveyResponse[]
  totalRespondents: number
  householdMap: Record<string, string>  // household_id → household_number
}

// ---- ユーティリティ ----

function parseAnswer(raw: string): string | string[] {
  try { return JSON.parse(raw) } catch { return raw }
}

function aggregateChoices(
  questionId: string,
  options: string[],
  responses: SurveyResponse[],
) {
  const counts: Record<string, number> = {}
  options.forEach(o => { counts[o] = 0 })
  responses
    .filter(r => r.question_id === questionId)
    .forEach(r => {
      const val = parseAnswer(r.answer)
      const selected = Array.isArray(val) ? val : [val]
      selected.forEach(s => { if (s && counts[s] !== undefined) counts[s]++ })
    })
  const total = Object.values(counts).reduce((a, b) => a + b, 0)
  return { counts, total }
}

// ---- 期限ヘルパー ----

function formatExpiryDate(iso: string) {
  const d = new Date(iso)
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`
}

function ExpiryBadge({ expiresAt }: { expiresAt: string }) {
  const now = new Date()
  const exp = new Date(expiresAt)
  const expired = exp < now
  const days = Math.ceil((exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  const dateStr = formatExpiryDate(expiresAt)
  if (expired) {
    return <span className="text-xs text-red-400 font-medium">期限：{dateStr}（終了）</span>
  }
  return (
    <span className="text-xs text-gray-500">
      期限：{dateStr}
      <span className={`ml-1 font-semibold ${days <= 3 ? 'text-red-500' : 'text-orange-500'}`}>残り{days}日</span>
    </span>
  )
}

// ---- コンポーネント ----

export default function AdminSurveyManager({
  initialSurveys,
}: {
  initialSurveys: (Omit<Survey, 'respondent_count'> & { respondent_count: number })[]
}) {
  const [surveys, setSurveys] = useState<Survey[]>(initialSurveys)
  const [showCreate, setShowCreate] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newDescription, setNewDescription] = useState('')
  const [newAttachmentFile, setNewAttachmentFile] = useState<File | null>(null)
  const [newStartsAt, setNewStartsAt] = useState('')
  const [newExpiresAt, setNewExpiresAt] = useState('')
  const [questions, setQuestions] = useState<QuestionDraft[]>([])
  const [creating, setCreating] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [results, setResults] = useState<Record<string, SurveyResults>>({})
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [uploadingId, setUploadingId] = useState<string | null>(null)
  const [expandedRespondents, setExpandedRespondents] = useState<Record<string, boolean>>({})
  const supabase = createClient()

  // ---- 質問ドラフト操作 ----

  const addQuestion = () =>
    setQuestions(prev => [...prev, { localId: `q-${Date.now()}`, text: '', type: 'single', options: ['', ''] }])

  const removeQuestion = (localId: string) =>
    setQuestions(prev => prev.filter(q => q.localId !== localId))

  const updateQuestion = (localId: string, patch: Partial<QuestionDraft>) =>
    setQuestions(prev => prev.map(q => q.localId === localId ? { ...q, ...patch } : q))

  const addOption = (localId: string) =>
    setQuestions(prev => prev.map(q => q.localId === localId ? { ...q, options: [...q.options, ''] } : q))

  const removeOption = (localId: string, i: number) =>
    setQuestions(prev => prev.map(q =>
      q.localId === localId ? { ...q, options: q.options.filter((_, idx) => idx !== i) } : q
    ))

  const updateOption = (localId: string, i: number, val: string) =>
    setQuestions(prev => prev.map(q =>
      q.localId === localId ? { ...q, options: q.options.map((o, idx) => idx === i ? val : o) } : q
    ))

  // ---- アンケート作成 ----

  const createSurvey = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTitle.trim()) return
    setCreating(true)

    const { data: survey } = await supabase
      .from('surveys')
      .insert({
        title: newTitle.trim(),
        description: newDescription.trim() || null,
        is_active: true,
        starts_at: newStartsAt || null,
        expires_at: newExpiresAt || null,
      })
      .select()
      .single()

    if (survey) {
      // 添付ファイルアップロード
      let attachmentUrl: string | null = null
      if (newAttachmentFile) {
        const result = await uploadAttachment(newAttachmentFile, survey.id)
        if (result) {
          attachmentUrl = result.url
          await supabase.from('surveys').update({ attachment_url: attachmentUrl }).eq('id', survey.id)
        }
      }

      const validQuestions = questions.filter(q => q.text.trim())
      const questionRows = [
        ...validQuestions.map((q, i) => ({
          survey_id: survey.id,
          question_text: q.text.trim(),
          question_type: q.type,
          options: q.options.filter(o => o.trim()),
          order_index: i,
        })),
        // 自由記述欄を自動追加
        {
          survey_id: survey.id,
          question_text: 'ご意見・コメント（任意）',
          question_type: 'text' as const,
          options: null,
          order_index: 999,
        },
      ]
      if (questionRows.length > 0) {
        await supabase.from('survey_questions').insert(questionRows)
      }
      setSurveys(prev => [{ ...survey, attachment_url: attachmentUrl, respondent_count: 0, starts_at: newStartsAt || null, expires_at: newExpiresAt || null }, ...prev])
    }

    setNewTitle('')
    setNewDescription('')
    setNewAttachmentFile(null)
    setNewStartsAt('')
    setNewExpiresAt('')
    setQuestions([])
    setShowCreate(false)
    setCreating(false)
  }

  // ---- アクティブ切替・削除 ----

  const toggleActive = async (id: string, current: boolean) => {
    await supabase.from('surveys').update({ is_active: !current }).eq('id', id)
    setSurveys(prev => prev.map(s => s.id === id ? { ...s, is_active: !current } : s))
  }

  const deleteSurvey = async (id: string) => {
    if (!confirm('このアンケートを削除しますか？回答データも削除されます。')) return
    await supabase.from('surveys').delete().eq('id', id)
    setSurveys(prev => prev.filter(s => s.id !== id))
    setResults(prev => { const next = { ...prev }; delete next[id]; return next })
  }

  // ---- 添付ファイル操作 ----

  const uploadAttachment = async (file: File, surveyId: string): Promise<{ url: string; path: string } | null> => {
    const path = `survey-attachments/${surveyId}-${Date.now()}.pdf`
    const { error } = await supabase.storage.from('pdf-documents').upload(path, file, { contentType: 'application/pdf' })
    if (error) { setUploadError(`アップロード失敗: ${error.message}`); return null }
    const { data: { publicUrl } } = supabase.storage.from('pdf-documents').getPublicUrl(path)
    return { url: publicUrl, path }
  }

  const removeStorageFile = async (attachmentUrl: string) => {
    const marker = '/pdf-documents/'
    const idx = attachmentUrl.indexOf(marker)
    if (idx !== -1) {
      const path = attachmentUrl.slice(idx + marker.length)
      await supabase.storage.from('pdf-documents').remove([path])
    }
  }

  const handleAttachmentUpload = async (surveyId: string, file: File, currentUrl: string | null) => {
    setUploadingId(surveyId)
    setUploadError(null)
    if (currentUrl) await removeStorageFile(currentUrl)
    const result = await uploadAttachment(file, surveyId)
    if (result) {
      await supabase.from('surveys').update({ attachment_url: result.url }).eq('id', surveyId)
      setSurveys(prev => prev.map(s => s.id === surveyId ? { ...s, attachment_url: result.url } : s))
    }
    setUploadingId(null)
  }

  const handleAttachmentRemove = async (surveyId: string, currentUrl: string) => {
    if (!confirm('資料PDFを削除しますか？')) return
    await removeStorageFile(currentUrl)
    await supabase.from('surveys').update({ attachment_url: null }).eq('id', surveyId)
    setSurveys(prev => prev.map(s => s.id === surveyId ? { ...s, attachment_url: null } : s))
  }

  // ---- 集計データ取得 ----

  const loadResults = async (surveyId: string) => {
    if (expandedId === surveyId) { setExpandedId(null); return }
    if (results[surveyId]) { setExpandedId(surveyId); return }

    setLoadingId(surveyId)
    const [{ data: qs }, { data: rs }] = await Promise.all([
      supabase.from('survey_questions').select('*').eq('survey_id', surveyId).order('order_index'),
      supabase.from('survey_responses').select('question_id, household_id, answer').eq('survey_id', surveyId),
    ])
    const uniqueHouseholdIds = [...new Set((rs || []).map(r => r.household_id))]
    const totalRespondents = uniqueHouseholdIds.length

    // 世帯番号を取得
    let householdMap: Record<string, string> = {}
    if (uniqueHouseholdIds.length > 0) {
      const { data: households } = await supabase
        .from('households')
        .select('id, household_number')
        .in('id', uniqueHouseholdIds)
      ;(households || []).forEach(h => { householdMap[h.id] = h.household_number })
    }

    setResults(prev => ({ ...prev, [surveyId]: { questions: qs || [], responses: rs || [], totalRespondents, householdMap } }))
    setSurveys(prev => prev.map(s => s.id === surveyId ? { ...s, respondent_count: totalRespondents } : s))
    setExpandedId(surveyId)
    setLoadingId(null)
  }

  // ---- レンダリング ----

  return (
    <div className="space-y-4">
      <button onClick={() => setShowCreate(!showCreate)} className="btn-primary flex items-center gap-2">
        <Plus className="w-4 h-4" />
        新規アンケート作成
      </button>

      {/* ---- 作成フォーム ---- */}
      {showCreate && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <h2 className="font-semibold text-gray-800 mb-4">アンケートの新規作成</h2>
          <form onSubmit={createSurvey} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">タイトル <span className="text-red-500">*</span></label>
              <input
                type="text"
                value={newTitle}
                onChange={e => setNewTitle(e.target.value)}
                placeholder="アンケートタイトル"
                className="input-field"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">説明（任意）</label>
              <textarea
                value={newDescription}
                onChange={e => setNewDescription(e.target.value)}
                placeholder="アンケートの説明"
                rows={2}
                className="input-field resize-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">公開開始日時（任意）</label>
                <input
                  type="datetime-local"
                  value={newStartsAt}
                  onChange={e => {
                    setNewStartsAt(e.target.value)
                    if (e.target.value) {
                      const d = new Date(e.target.value)
                      d.setDate(d.getDate() + 7)
                      setNewExpiresAt(d.toISOString().slice(0, 16))
                    }
                  }}
                  className="input-field"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">回答期限（任意）</label>
                <input
                  type="datetime-local"
                  value={newExpiresAt}
                  onChange={e => setNewExpiresAt(e.target.value)}
                  className="input-field"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">資料PDF（任意）</label>
              <input
                type="file"
                accept="application/pdf"
                onChange={e => setNewAttachmentFile(e.target.files?.[0] || null)}
                className="block w-full text-sm text-gray-500 file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-sm file:bg-primary-50 file:text-primary-600 hover:file:bg-primary-100"
              />
              {newAttachmentFile && (
                <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                  <FileText className="w-3 h-3" />{newAttachmentFile.name}
                </p>
              )}
            </div>

            {/* 質問ビルダー */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-gray-700">選択肢の質問</p>
                <button
                  type="button"
                  onClick={addQuestion}
                  className="flex items-center gap-1 text-xs text-primary-600 bg-primary-50 hover:bg-primary-100 px-2 py-1 rounded transition-colors"
                >
                  <Plus className="w-3 h-3" />
                  質問を追加
                </button>
              </div>

              {questions.length === 0 ? (
                <p className="text-xs text-gray-400 text-center border border-dashed border-gray-200 rounded-lg py-3">
                  「質問を追加」ボタンで選択肢の質問を追加できます
                </p>
              ) : (
                questions.map((q, qi) => (
                  <div key={q.localId} className="border border-gray-200 rounded-lg p-3 space-y-2 bg-gray-50">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-gray-400 flex-shrink-0">Q{qi + 1}</span>
                      <input
                        type="text"
                        value={q.text}
                        onChange={e => updateQuestion(q.localId, { text: e.target.value })}
                        placeholder="質問文を入力"
                        className="input-field text-sm py-1.5 flex-1"
                      />
                      <select
                        value={q.type}
                        onChange={e => updateQuestion(q.localId, { type: e.target.value as 'single' | 'multiple' })}
                        className="text-xs border border-gray-200 rounded px-2 py-1.5 bg-white flex-shrink-0"
                      >
                        <option value="single">単一選択</option>
                        <option value="multiple">複数選択</option>
                      </select>
                      <button
                        type="button"
                        onClick={() => removeQuestion(q.localId)}
                        className="p-1 text-red-400 hover:text-red-600 flex-shrink-0"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    {/* 選択肢入力 */}
                    <div className="space-y-1.5 pl-6">
                      {q.options.map((opt, oi) => (
                        <div key={oi} className="flex items-center gap-1.5">
                          <span className="text-xs text-gray-300 flex-shrink-0">
                            {q.type === 'single' ? '○' : '□'}
                          </span>
                          <input
                            type="text"
                            value={opt}
                            onChange={e => updateOption(q.localId, oi, e.target.value)}
                            placeholder={`選択肢 ${oi + 1}`}
                            className="input-field text-sm py-1 flex-1"
                          />
                          {q.options.length > 2 && (
                            <button
                              type="button"
                              onClick={() => removeOption(q.localId, oi)}
                              className="text-gray-300 hover:text-red-400 flex-shrink-0"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={() => addOption(q.localId)}
                        className="text-xs text-gray-400 hover:text-primary-600 flex items-center gap-1 mt-1"
                      >
                        <Plus className="w-3 h-3" />
                        選択肢を追加
                      </button>
                    </div>
                  </div>
                ))
              )}

              {/* 自由記述は自動追加の案内 */}
              <div className="flex items-center gap-2 text-xs text-gray-400 border border-dashed border-gray-200 rounded-lg px-3 py-2">
                <MessageSquare className="w-3.5 h-3.5 flex-shrink-0" />
                「ご意見・コメント（任意）」の自由記述欄は自動で追加されます
              </div>
            </div>

            <div className="flex gap-2">
              <button type="submit" disabled={creating} className="btn-primary">
                {creating ? '作成中...' : '作成する'}
              </button>
              <button
                type="button"
                onClick={() => { setShowCreate(false); setQuestions([]) }}
                className="btn-secondary"
              >
                キャンセル
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ---- アンケート一覧 ---- */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {surveys.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <BarChart2 className="w-8 h-8 mx-auto mb-2" />
            <p className="text-sm">アンケートはありません</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {surveys.map(s => (
              <div key={s.id}>
                {/* サマリー行 */}
                <div className="p-4 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-800">{s.title}</p>
                    {s.description && <p className="text-xs text-gray-500 mt-0.5 truncate">{s.description}</p>}
                    <div className="flex items-center gap-3 mt-1 flex-wrap">
                      <span className="text-xs text-gray-500">回答済み：{s.respondent_count}世帯</span>
                      {s.expires_at && <ExpiryBadge expiresAt={s.expires_at} />}
                    </div>
                    {/* 添付ファイル */}
                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                      {s.attachment_url ? (
                        <>
                          <a
                            href={s.attachment_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-primary-600 bg-primary-50 hover:bg-primary-100 px-2 py-1 rounded transition-colors"
                          >
                            <FileText className="w-3 h-3" />
                            資料PDFを確認
                          </a>
                          <label className="inline-flex items-center gap-1 text-xs text-gray-500 bg-gray-100 hover:bg-gray-200 px-2 py-1 rounded cursor-pointer transition-colors">
                            <Upload className="w-3 h-3" />
                            PDFを変更
                            <input
                              type="file"
                              accept="application/pdf"
                              className="hidden"
                              onChange={e => {
                                const f = e.target.files?.[0]
                                if (f) handleAttachmentUpload(s.id, f, s.attachment_url)
                              }}
                            />
                          </label>
                          <button
                            onClick={() => handleAttachmentRemove(s.id, s.attachment_url!)}
                            className="text-xs text-red-400 hover:text-red-600 px-1"
                          >
                            削除
                          </button>
                        </>
                      ) : (
                        <label className="inline-flex items-center gap-1 text-xs text-gray-500 bg-gray-100 hover:bg-gray-200 px-2 py-1 rounded cursor-pointer transition-colors">
                          <Upload className="w-3 h-3" />
                          {uploadingId === s.id ? 'アップロード中...' : '資料PDFを追加'}
                          <input
                            type="file"
                            accept="application/pdf"
                            className="hidden"
                            disabled={uploadingId === s.id}
                            onChange={e => {
                              const f = e.target.files?.[0]
                              if (f) handleAttachmentUpload(s.id, f, null)
                            }}
                          />
                        </label>
                      )}
                    </div>
                    {uploadError && uploadingId === null && (
                      <p className="text-xs text-red-500 mt-1">{uploadError}</p>
                    )}
                  </div>
                  {/* 集計ボタン */}
                  <button
                    onClick={() => loadResults(s.id)}
                    disabled={loadingId === s.id}
                    className="flex items-center gap-1 text-xs text-purple-600 bg-purple-50 hover:bg-purple-100 px-2 py-1 rounded transition-colors flex-shrink-0"
                  >
                    <BarChart2 className="w-3 h-3" />
                    {loadingId === s.id ? '読込中...' : '集計'}
                    {expandedId === s.id
                      ? <ChevronUp className="w-3 h-3" />
                      : <ChevronDown className="w-3 h-3" />}
                  </button>
                  <button
                    onClick={() => toggleActive(s.id, s.is_active)}
                    className={s.is_active ? 'text-green-600' : 'text-gray-400'}
                    title={s.is_active ? '非公開にする' : '公開する'}
                  >
                    {s.is_active ? <ToggleRight className="w-6 h-6" /> : <ToggleLeft className="w-6 h-6" />}
                  </button>
                  <button
                    onClick={() => deleteSurvey(s.id)}
                    className="p-1.5 text-red-400 hover:text-red-600"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {/* ---- 集計パネル ---- */}
                {expandedId === s.id && results[s.id] && (
                  <div className="px-4 pb-5 bg-gray-50 border-t border-gray-100">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide pt-3 pb-3">
                      集計結果 — 回答世帯数: {results[s.id].totalRespondents}件
                    </p>

                    {results[s.id].questions.length === 0 ? (
                      <p className="text-sm text-gray-400">質問データがありません</p>
                    ) : (
                      <div className="space-y-5">
                        {results[s.id].questions.map((q, qi) => {
                          const qResps = results[s.id].responses.filter(r => r.question_id === q.id)
                          const { householdMap } = results[s.id]

                          if (q.question_type === 'text') {
                            // 自由記述（世帯番号付き）
                            const entries = qResps
                              .map(r => {
                                const v = parseAnswer(r.answer)
                                const text = typeof v === 'string' ? v.trim() : ''
                                return { text, num: householdMap[r.household_id] || '?' }
                              })
                              .filter(e => e.text)
                            return (
                              <div key={q.id}>
                                <p className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1.5">
                                  <MessageSquare className="w-3.5 h-3.5 text-gray-400" />
                                  {q.question_text}
                                </p>
                                {entries.length === 0 ? (
                                  <p className="text-xs text-gray-400">回答なし</p>
                                ) : (
                                  <div className="space-y-1.5">
                                    {entries.map((e, i) => (
                                      <div key={i} className="bg-white border border-gray-100 rounded-lg px-3 py-2">
                                        <span className="text-xs font-medium text-purple-600 mr-2">{e.num}番</span>
                                        <span className="text-sm text-gray-700">{e.text}</span>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )
                          }

                          // 選択肢質問
                          const { counts, total } = aggregateChoices(q.id, q.options || [], results[s.id].responses)
                          const respondentKey = `${s.id}-${q.id}`
                          const showRespondents = expandedRespondents[respondentKey]

                          // 回答者一覧: household_id → 選んだ選択肢リスト
                          const respondentList = qResps.map(r => {
                            const val = parseAnswer(r.answer)
                            const selected = Array.isArray(val) ? val : (val ? [val] : [])
                            return { num: householdMap[r.household_id] || '?', selected }
                          }).filter(r => r.selected.length > 0)
                            .sort((a, b) => a.num.localeCompare(b.num, 'ja'))

                          return (
                            <div key={q.id}>
                              <p className="text-sm font-semibold text-gray-700 mb-2">
                                Q{qi + 1}. {q.question_text}
                                <span className="ml-2 text-xs font-normal text-gray-400">
                                  {q.question_type === 'single' ? '単一選択' : '複数選択'} / {total}票
                                </span>
                              </p>
                              <div className="space-y-2">
                                {(q.options || []).map(opt => {
                                  const count = counts[opt] || 0
                                  const pct = total > 0 ? Math.round((count / total) * 100) : 0
                                  return (
                                    <div key={opt}>
                                      <div className="flex items-center justify-between text-xs mb-1">
                                        <span className="text-gray-700">{opt}</span>
                                        <span className="text-gray-500 font-medium tabular-nums">
                                          {count}票 ({pct}%)
                                        </span>
                                      </div>
                                      <div className="w-full bg-gray-200 rounded-full h-2">
                                        <div
                                          className="bg-purple-400 h-2 rounded-full transition-all duration-300"
                                          style={{ width: `${pct}%` }}
                                        />
                                      </div>
                                    </div>
                                  )
                                })}
                              </div>

                              {/* 回答者一覧（展開式） */}
                              <button
                                onClick={() => setExpandedRespondents(prev => ({ ...prev, [respondentKey]: !prev[respondentKey] }))}
                                className="mt-2 flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 transition-colors"
                              >
                                {showRespondents ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                                回答者一覧 ({respondentList.length}件)
                              </button>
                              {showRespondents && (
                                <div className="mt-1.5 space-y-1">
                                  {respondentList.length === 0 ? (
                                    <p className="text-xs text-gray-400 pl-1">回答なし</p>
                                  ) : (
                                    respondentList.map((r, i) => (
                                      <div key={i} className="flex items-start gap-2 bg-white border border-gray-100 rounded-lg px-3 py-1.5 text-xs">
                                        <span className="font-medium text-purple-600 flex-shrink-0">{r.num}番</span>
                                        <span className="text-gray-700">{r.selected.join('、')}</span>
                                      </div>
                                    ))
                                  )}
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
