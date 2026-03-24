'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { MessageSquare, Plus, ChevronRight, ChevronLeft, AlertTriangle } from 'lucide-react'

interface Thread {
  id: string
  title: string
  poster: string
  is_anonymous: boolean
  created_at: string
  reply_count: number
}

const NOTICE_ITEMS = [
  '投稿内容は他の利用者に公開されます',
  '虚偽の情報や根拠のない誹謗中傷は禁止です',
  '個人情報（氏名・住所・電話番号など）は記載しないでください',
  '特定の個人を傷つける表現は禁止です',
  'スパム行為・宣伝目的の投稿は禁止です',
  '管理者の判断により投稿を削除する場合があります',
]

function PostNotice() {
  return (
    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
      <p className="text-xs font-semibold text-yellow-800 mb-1.5 flex items-center gap-1">
        <AlertTriangle className="w-3.5 h-3.5" />
        投稿前に必ずお読みください
      </p>
      <ul className="space-y-0.5">
        {NOTICE_ITEMS.map((text, i) => (
          <li key={i} className="text-xs text-yellow-700 flex items-start gap-1">
            <span className="flex-shrink-0">・</span>{text}
          </li>
        ))}
      </ul>
    </div>
  )
}

function formatDatetime(iso: string) {
  const d = new Date(iso)
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

export default function BoardList({
  threads: initialThreads,
  householdId,
  householdNumber,
}: {
  threads: Thread[]
  householdId: string
  householdNumber: string
}) {
  const [threads, setThreads] = useState(initialThreads)
  const [page, setPage] = useState(1)
  const [showCreate, setShowCreate] = useState(false)

  const PAGE_SIZE = 10
  const totalPages = Math.max(1, Math.ceil(threads.length / PAGE_SIZE))
  const pagedThreads = threads.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [isAnonymous, setIsAnonymous] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim() || !content.trim()) return
    setSubmitting(true)
    const anonymous = householdId ? isAnonymous : true
    const { data } = await supabase
      .from('board_threads')
      .insert({
        title: title.trim(),
        content: content.trim(),
        household_id: householdId || null,
        is_anonymous: anonymous,
      })
      .select('id')
      .single()
    setSubmitting(false)
    if (data) {
      router.push(`/board/${data.id}`)
    }
  }

  const handleCancel = () => {
    setShowCreate(false)
    setTitle('')
    setContent('')
    setIsAnonymous(false)
  }

  const goPage = (p: number) => {
    setPage(p)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <div className="space-y-4">
      <button
        onClick={() => setShowCreate(!showCreate)}
        className="btn-primary flex items-center gap-2"
      >
        <Plus className="w-4 h-4" />
        新規投稿
      </button>

      {showCreate && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 space-y-3">
          <PostNotice />
          <form onSubmit={handleCreate} className="space-y-3">
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="スレッドタイトル（必須）"
              className="input-field"
              required
              maxLength={200}
            />
            <textarea
              value={content}
              onChange={e => setContent(e.target.value)}
              placeholder="投稿内容（必須）"
              rows={4}
              className="input-field resize-none"
              required
            />
            {householdId ? (
              <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={isAnonymous}
                  onChange={e => setIsAnonymous(e.target.checked)}
                  className="w-4 h-4 rounded"
                />
                匿名で投稿する
                {!isAnonymous && householdNumber && (
                  <span className="text-xs text-gray-400">（{householdNumber}番として投稿）</span>
                )}
              </label>
            ) : (
              <p className="text-xs text-gray-400">
                ※ ログインすると利用者番号で投稿できます（現在は匿名投稿）
              </p>
            )}
            <div className="flex gap-2">
              <button type="submit" disabled={submitting} className="btn-primary">
                {submitting ? '投稿中...' : '投稿する'}
              </button>
              <button type="button" onClick={handleCancel} className="btn-secondary">
                キャンセル
              </button>
            </div>
          </form>
        </div>
      )}

      {threads.length === 0 ? (
        <div className="card text-center py-8 text-gray-400">
          <MessageSquare className="w-8 h-8 mx-auto mb-2" />
          <p className="text-sm">投稿はまだありません</p>
          <p className="text-xs mt-1">最初の投稿をしてみましょう</p>
        </div>
      ) : (
        <>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 divide-y divide-gray-50">
            {pagedThreads.map(t => (
              <button
                key={t.id}
                onClick={() => router.push(`/board/${t.id}`)}
                className="w-full text-left p-4 hover:bg-gray-50 active:bg-gray-100 transition-colors flex items-start gap-3"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-800 text-sm line-clamp-2">{t.title}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    {t.poster} · {formatDatetime(t.created_at)}
                  </p>
                </div>
                <div className="flex items-center gap-1 text-xs text-gray-400 flex-shrink-0 mt-0.5">
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>{t.reply_count}</span>
                  <ChevronRight className="w-4 h-4 ml-0.5" />
                </div>
              </button>
            ))}
          </div>

          {/* ページネーション */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-1">
              <button
                onClick={() => goPage(page - 1)}
                disabled={page === 1}
                className="flex items-center gap-1 text-sm text-primary-600 disabled:text-gray-300 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4" />
                前へ
              </button>
              <span className="text-xs text-gray-500">
                {page} / {totalPages}ページ
              </span>
              <button
                onClick={() => goPage(page + 1)}
                disabled={page === totalPages}
                className="flex items-center gap-1 text-sm text-primary-600 disabled:text-gray-300 disabled:cursor-not-allowed"
              >
                次へ
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
