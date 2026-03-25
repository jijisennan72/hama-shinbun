'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ChevronRight } from 'lucide-react'

const LABELS: Record<string, string> = {
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

export default function AdminBreadcrumb() {
  const pathname = usePathname()

  if (pathname === '/admin') return null

  const label = LABELS[pathname]
  if (!label) return null

  return (
    <nav className="flex items-center gap-1 text-sm mb-3" aria-label="パンくずリスト">
      <Link href="/admin" className="text-blue-600 hover:text-blue-700 hover:underline whitespace-nowrap">
        ホーム
      </Link>
      <ChevronRight className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
      <span className="text-gray-500 truncate">{label}</span>
    </nav>
  )
}
