'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { BarChart2, CheckCircle, ChevronRight, FileText, MessageSquare, Users } from 'lucide-react'

interface SurveyQuestion {
  id: string
  question_text: string
  question_type: 'single' | 'multiple' | 'text'
  options: string[] | null
  order_index: number
}

interface SurveyResponse {
  question_id: string
  answer: string
}

interface Survey {
  id: string
  title: string
  description: string | null
  is_active: boolean
  is_answered: boolean
  attachment_url: string | null
  starts_at: string | null
  expires_at: string | null
  respondent_count: number
  survey_questions?: SurveyQuestion[]
}

function ExpiryBadge({ expiresAt }: { expiresAt: string }) {
  const now = new Date()
  const exp = new Date(expiresAt)
  const expired = exp < now
  const days = Math.ceil((exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  const dateStr = `${exp.getFullYear()}/${String(exp.getMonth() + 1).padStart(2, '0')}/${String(exp.getDate()).padStart(2, '0')}`
  if (expired) {
    return <span className="text-xs text-red-400 font-medium">期限：{dateStr}（受付終了）</span>
  }
  return (
    <span className="text-xs text-gray-500">
      期限：{dateStr}
      <span className={`ml-1 font-semibold ${days <= 3 ? 'text-red-500' : 'text-orange-500'}`}>残り{days}日</span>
    </span>
  )
}

interface ResultData {
  questions: SurveyQuestion[]
  responses: SurveyResponse[]
  totalRespondents: number
}

function parseAnswer(answerJson: string): string | string[] {
  try { return JSON.parse(answerJson) } catch { return answerJson }
}

function aggregateChoices(questionId: string, options: string[], responses: SurveyResponse[]) {
  const qResps = responses.filter(r => r.question_id === questionId)
  const counts: Record<string, number> = {}
  options.forEach(o => { counts[o] = 0 })
  let total = 0
  qResps.forEach(r => {
    const val = parseAnswer(r.answer)
    const vals = Array.isArray(val) ? val : [val]
    vals.forEach(v => { if (v && counts[v] !== undefined) { counts[v]++; total++ } })
  })
  return { counts, total }
}

export default function SurveyList({ surveys, householdId }: { surveys: Survey[]; householdId: string | undefined }) {
  const [activeSurvey, setActiveSurvey] = useState<string | null>(null)
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({})
  const [submitting, setSubmitting] = useState(false)
  const [localSurveys, setLocalSurveys] = useState(surveys)
  const [surveyQuestions, setSurveyQuestions] = useState<Record<string, SurveyQuestion[]>>({})

  // 集計用
  const [resultSurveyId, setResultSurveyId] = useState<string | null>(null)
  const [results, setResults] = useState<Record<string, ResultData>>({})
  const [loadingResultId, setLoadingResultId] = useState<string | null>(null)

  const supabase = createClient()

  const loadSurvey = async (surveyId: string) => {
    if (!surveyQuestions[surveyId]) {
      const { data } = await supabase
        .from('survey_questions')
        .select('*')
        .eq('survey_id', surveyId)
        .order('order_index')
      setSurveyQuestions(prev => ({ ...prev, [surveyId]: data || [] }))
    }
    setActiveSurvey(surveyId)
    setAnswers({})
  }

  const loadResults = async (surveyId: string) => {
    if (results[surveyId]) { setResultSurveyId(surveyId); return }
    setLoadingResultId(surveyId)
    const [{ data: qs }, { data: rs }] = await Promise.all([
      supabase.from('survey_questions').select('*').eq('survey_id', surveyId).order('order_index'),
      supabase.from('survey_responses').select('question_id, answer').eq('survey_id', surveyId),
    ])
    // 総回答世帯数は household_id 列で数えるため別途取得
    const { data: householdRows } = await supabase
      .from('survey_responses')
      .select('household_id')
      .eq('survey_id', surveyId)
    const totalRespondents = new Set((householdRows || []).map(r => r.household_id)).size
    setResults(prev => ({ ...prev, [surveyId]: { questions: qs || [], responses: rs || [], totalRespondents } }))
    setResultSurveyId(surveyId)
    setLoadingResultId(null)
  }

  const submitSurvey = async (surveyId: string) => {
    if (!householdId) return
    const survey = localSurveys.find(s => s.id === surveyId)
    if (survey?.expires_at && new Date(survey.expires_at) < new Date()) {
      alert('このアンケートは回答期限が終了しています。')
      return
    }
    const qs = surveyQuestions[surveyId] || []
    const unanswered = qs.filter(q =>
      q.question_type !== 'text' &&
      (!answers[q.id] || (Array.isArray(answers[q.id]) && (answers[q.id] as string[]).length === 0))
    )
    if (unanswered.length > 0) {
      if (!confirm('未回答の質問があります。このまま送信しますか？')) return
    }
    setSubmitting(true)
    const responseData = qs.map(q => ({
      survey_id: surveyId,
      question_id: q.id,
      household_id: householdId,
      answer: JSON.stringify(answers[q.id] ?? ''),
    }))
    await supabase.from('survey_responses').insert(responseData)
    setLocalSurveys(prev => prev.map(s => s.id === surveyId ? { ...s, is_answered: true } : s))
    setActiveSurvey(null)
    setSubmitting(false)
  }

  if (localSurveys.length === 0) {
    return (
      <div className="card text-center py-8 text-gray-400">
        <BarChart2 className="w-8 h-8 mx-auto mb-2" />
        <p className="text-sm">アンケートはありません</p>
      </div>
    )
  }

  // ---- 集計画面 ----
  if (resultSurveyId) {
    const survey = localSurveys.find(s => s.id === resultSurveyId)
    const data = results[resultSurveyId]
    return (
      <div className="space-y-4">
        <button onClick={() => setResultSurveyId(null)} className="text-sm text-primary-600">← 戻る</button>
        <div className="card">
          <h2 className="font-bold text-gray-800 mb-0.5">{survey?.title}</h2>
          <div className="flex items-center gap-1.5 mt-2 mb-4">
            <Users className="w-4 h-4 text-gray-400" />
            <span className="text-sm text-gray-500">総回答数：<span className="font-semibold text-gray-700">{data.totalRespondents}</span>件</span>
          </div>

          {data.questions.length === 0 ? (
            <p className="text-sm text-gray-400">質問データがありません</p>
          ) : (
            <div className="space-y-6">
              {data.questions.map((q, qi) => {
                const qResps = data.responses.filter(r => r.question_id === q.id)

                if (q.question_type === 'text') {
                  const comments = qResps
                    .map(r => {
                      const v = parseAnswer(r.answer)
                      return typeof v === 'string' ? v.trim() : ''
                    })
                    .filter(t => t.length > 0)
                  return (
                    <div key={q.id}>
                      <p className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1.5">
                        <MessageSquare className="w-3.5 h-3.5 text-gray-400" />
                        {q.question_text}
                        <span className="text-xs font-normal text-gray-400 ml-1">（自由記述 / {comments.length}件）</span>
                      </p>
                      {comments.length === 0 ? (
                        <p className="text-xs text-gray-400">回答なし</p>
                      ) : (
                        <div className="space-y-1.5">
                          {comments.map((text, i) => (
                            <div key={i} className="bg-gray-50 border border-gray-100 rounded-lg px-3 py-2 text-sm text-gray-700">
                              {text}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                }

                const { counts, total } = aggregateChoices(q.id, q.options || [], data.responses)
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
                              <span className="text-gray-500 font-medium tabular-nums">{count}票（{pct}%）</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div
                                className="bg-orange-400 h-2 rounded-full transition-all duration-300"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    )
  }

  // ---- 回答フォーム ----
  if (activeSurvey) {
    const survey = localSurveys.find(s => s.id === activeSurvey)
    const questions = surveyQuestions[activeSurvey] || []
    return (
      <div className="space-y-4">
        <button onClick={() => setActiveSurvey(null)} className="text-sm text-primary-600">← 戻る</button>
        <div className="card">
          <h2 className="font-bold text-gray-800 mb-1">{survey?.title}</h2>
          {survey?.description && <p className="text-sm text-gray-600 mb-2">{survey.description}</p>}
          {survey?.attachment_url && (
            <a
              href={survey.attachment_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 mb-4 text-xs text-primary-600 bg-primary-50 hover:bg-primary-100 px-3 py-1.5 rounded-full transition-colors"
            >
              <FileText className="w-3.5 h-3.5" />
              📄 資料を見る
            </a>
          )}
          <div className="space-y-4">
            {questions.map((q, i) => (
              <div key={q.id}>
                <p className="text-sm font-semibold text-gray-700 mb-2">
                  {q.question_type !== 'text' && `${i + 1}. `}
                  {q.question_text}
                  {q.question_type !== 'text' && (
                    <span className="ml-1.5 text-xs font-normal text-gray-400">
                      {q.question_type === 'single' ? '（1つ選択）' : '（複数選択可）'}
                    </span>
                  )}
                  {q.question_type === 'text' && (
                    <span className="ml-1.5 text-xs font-normal text-gray-400">任意</span>
                  )}
                </p>
                {q.question_type === 'text' ? (
                  <textarea
                    rows={3}
                    className="input-field resize-none text-sm"
                    placeholder="ご自由にお書きください"
                    value={(answers[q.id] as string) || ''}
                    onChange={e => setAnswers(prev => ({ ...prev, [q.id]: e.target.value }))}
                  />
                ) : q.question_type === 'single' ? (
                  <div className="space-y-2">
                    {(q.options || []).map(opt => (
                      <label key={opt} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name={q.id}
                          value={opt}
                          checked={answers[q.id] === opt}
                          onChange={() => setAnswers(prev => ({ ...prev, [q.id]: opt }))}
                          className="w-4 h-4"
                        />
                        <span className="text-sm text-gray-700">{opt}</span>
                      </label>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {(q.options || []).map(opt => (
                      <label key={opt} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          value={opt}
                          checked={((answers[q.id] as string[]) || []).includes(opt)}
                          onChange={e => {
                            const current = (answers[q.id] as string[]) || []
                            setAnswers(prev => ({
                              ...prev,
                              [q.id]: e.target.checked ? [...current, opt] : current.filter(v => v !== opt),
                            }))
                          }}
                          className="w-4 h-4 rounded"
                        />
                        <span className="text-sm text-gray-700">{opt}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
          <button
            onClick={() => submitSurvey(activeSurvey)}
            disabled={submitting}
            className="btn-primary w-full mt-4"
          >
            {submitting ? '送信中...' : '回答を送信する'}
          </button>
        </div>
      </div>
    )
  }

  // ---- 一覧 ----
  return (
    <div className="space-y-3">
      {localSurveys.map(survey => {
        const expired = survey.expires_at ? new Date(survey.expires_at) < new Date() : false
        const canAnswer = !survey.is_answered && !expired
        return (
          <div key={survey.id} className="card">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg flex-shrink-0 ${survey.is_answered ? 'bg-green-100' : expired ? 'bg-gray-100' : 'bg-orange-100'}`}>
                {survey.is_answered ? (
                  <CheckCircle className="w-5 h-5 text-green-600" />
                ) : (
                  <BarChart2 className={`w-5 h-5 ${expired ? 'text-gray-400' : 'text-orange-600'}`} />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-800 text-sm">{survey.title}</p>
                {survey.description && <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{survey.description}</p>}
                <div className="flex items-center gap-3 mt-1 flex-wrap">
                  <span className="text-xs text-gray-400">回答済み：{survey.respondent_count}世帯</span>
                  {survey.expires_at && <ExpiryBadge expiresAt={survey.expires_at} />}
                </div>
              </div>
              {canAnswer && (
                <button onClick={() => loadSurvey(survey.id)} className="p-1 text-gray-400 hover:text-gray-600">
                  <ChevronRight className="w-5 h-5" />
                </button>
              )}
            </div>

            {survey.attachment_url && (
              <a
                href={survey.attachment_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 mt-2 ml-11 text-xs text-primary-600 bg-primary-50 hover:bg-primary-100 px-3 py-1.5 rounded-full transition-colors"
              >
                <FileText className="w-3.5 h-3.5" />
                📄 資料を見る
              </a>
            )}

            {survey.is_answered ? (
              <div className="mt-2 ml-11 flex items-center gap-3">
                <span className="text-xs text-green-600 font-medium">回答済み</span>
                <button
                  onClick={() => loadResults(survey.id)}
                  disabled={loadingResultId === survey.id}
                  className="text-xs text-purple-600 bg-purple-50 hover:bg-purple-100 px-3 py-1 rounded-full transition-colors disabled:opacity-50"
                >
                  {loadingResultId === survey.id ? '読込中...' : '📊 集計を見る'}
                </button>
              </div>
            ) : expired ? (
              <p className="mt-2 ml-11 text-xs text-red-400 font-medium">回答受付終了</p>
            ) : (
              <button onClick={() => loadSurvey(survey.id)} className="mt-3 w-full text-sm text-primary-600 bg-primary-50 hover:bg-primary-100 py-1.5 rounded-lg transition-colors">
                回答する
              </button>
            )}
          </div>
        )
      })}
    </div>
  )
}
