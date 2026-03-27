'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ChevronRight } from 'lucide-react'

const LABELS: Record<string, string> = {
  '/search':               '検索',
  '/schedule':             '予定表',
  '/notifications':        'お知らせ・通知設定',
  '/newspaper':            'はま新聞',
  '/pdf':                  '倉庫',
  '/circulation':          '回覧板',
  '/events':               'イベント申込',
  '/surveys':              'アンケート',
  '/feedback':             '意見・要望',
  '/board':                '掲示板',
  '/history':              '浜区の歴史',
  '/others':               'その他',
  '/mypage':               'マイページ',
  '/admin':                '管理者ダッシュボード',
  '/admin/schedule':       '予定管理',
  '/admin/notifications':  '通知送信',
  '/admin/pdf':            'PDF管理',
  '/admin/circulation':    '回覧板管理',
  '/admin/events':         'イベント管理',
  '/admin/surveys':        'アンケート管理',
  '/admin/feedbacks':      '意見・要望',
  '/admin/board':          '掲示板管理',
  '/admin/households':     '利用者管理',
  '/admin/registrations':  '申込管理',
}

export default function Breadcrumb() {
  const pathname = usePathname()

  // ホーム・管理者ダッシュボードトップは表示しない
  if (pathname === '/' || pathname === '/admin') return null

  // /board/[id] → /board として扱う
  const normalized = pathname.replace(/^\/board\/.+/, '/board')
  const label = LABELS[normalized]
  if (!label) return null

  return (
    <nav className="flex items-center gap-1 text-sm mb-3" aria-label="パンくずリスト">
      <Link href="/" className="text-blue-600 hover:text-blue-700 hover:underline whitespace-nowrap">
        ホーム
      </Link>
      <ChevronRight className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
      <span className="text-gray-500 truncate">{label}</span>
    </nav>
  )
}
