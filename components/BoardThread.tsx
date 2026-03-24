'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { AlertTriangle, ChevronLeft } from 'lucide-react'

interface Post {
  id: string
  content: string
  poster: string
  created_at: string
}

interface ThreadDetail {
  id: string
  title: string
  content: string
  poster: string
  created_at: string
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

export default function BoardThread({
  thread,
  initialReplies,
  householdId,
  householdNumber,
}: {
  thread: ThreadDetail
  initialReplies: Post[]
  householdId: string
  householdNumber: string
}) {
  const [replies, setReplies] = useState<Post[]>(initialReplies)
  const [content, setContent] = useState('')
  const [isAnonymous, setIsAnonymous] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleReply = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!content.trim()) return
    setSubmitting(true)
    const anonymous = householdId ? isAnonymous : true
    const { data } = await supabase
      .from('board_replies')
      .insert({
        thread_id: thread.id,
        content: content.trim(),
        household_id: householdId || null,
        is_anonymous: anonymous,
      })
      .select('id, content, created_at')
      .single()
    if (data) {
      setReplies(prev => [...prev, {
        id: data.id,
        content: data.content,
        poster: isAnonymous ? '匿名' : `${householdNumber}番`,
        created_at: data.created_at,
      }])
    }
    setContent('')
    setSubmitting(false)
  }

  // 元投稿を #1、レスを #2, #3... として表示
  const allPosts: Post[] = [
    { id: `${thread.id}-op`, content: thread.content, poster: thread.poster, created_at: thread.created_at },
    ...replies,
  ]

  return (
    <div className="space-y-4">
      <button
        onClick={() => router.back()}
        className="flex items-center gap-1 text-sm text-primary-600"
      >
        <ChevronLeft className="w-4 h-4" />
        掲示板に戻る
      </button>

      {/* スレッドタイトル */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <h1 className="font-bold text-gray-900 text-base leading-snug">{thread.title}</h1>
        <p className="text-xs text-gray-400 mt-1">{allPosts.length}件の投稿</p>
      </div>

      {/* 投稿一覧（2chスタイル） */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 divide-y divide-gray-100">
        {allPosts.map((post, i) => (
          <div key={post.id} className="p-4">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className="text-xs font-bold text-gray-300 w-8 flex-shrink-0">#{i + 1}</span>
              <span className="text-xs font-semibold text-primary-600">{post.poster}</span>
              <span className="text-xs text-gray-400">{formatDatetime(post.created_at)}</span>
            </div>
            <p className="text-sm text-gray-800 whitespace-pre-wrap pl-8">{post.content}</p>
          </div>
        ))}
      </div>

      {/* レス投稿フォーム */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 space-y-3">
        <p className="text-sm font-semibold text-gray-700">レスを投稿する</p>
        <PostNotice />
        <form onSubmit={handleReply} className="space-y-3">
          <textarea
            value={content}
            onChange={e => setContent(e.target.value)}
            placeholder="レス内容（必須）"
            rows={3}
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
          <button type="submit" disabled={submitting} className="btn-primary w-full">
            {submitting ? '投稿中...' : 'レスする'}
          </button>
        </form>
      </div>
    </div>
  )
}
