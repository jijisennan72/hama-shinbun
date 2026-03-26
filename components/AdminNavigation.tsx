'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ArrowLeft, LogOut, Home } from 'lucide-react'
import { adminLogout } from '@/app/admin/login/actions'

export default function AdminNavigation() {
  const pathname = usePathname()
  const isTop = pathname === '/admin'

  return (
    <header className="bg-violet-900 dark:bg-indigo-950 text-white px-4 py-3 flex items-center justify-between">
      <div className="flex items-center gap-3">
        {!isTop && (
          <Link href="/admin" className="flex items-center gap-1 text-sm text-violet-200 hover:text-white hover:bg-violet-700 dark:hover:bg-indigo-900 px-2 py-1 rounded transition-colors">
            <ArrowLeft className="w-4 h-4" />
            管理TOP
          </Link>
        )}
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-bold">管理者画面</h1>
            <span className="text-xs bg-amber-500 text-white px-1.5 py-0.5 rounded font-medium">管理者</span>
          </div>
          <p className="text-xs text-violet-300 dark:text-indigo-300">はまアプリ</p>
        </div>
      </div>
      <div className="flex items-center gap-1">
        <Link href="/" className="flex items-center gap-1 text-sm text-violet-200 hover:text-white hover:bg-violet-700 dark:hover:bg-indigo-900 px-2 py-1.5 rounded-lg transition-colors">
          <Home className="w-4 h-4" />
          <span className="hidden sm:inline">ユーザーHOME</span>
        </Link>
        <form action={adminLogout}>
          <button type="submit" className="p-1.5 hover:bg-violet-700 dark:hover:bg-indigo-900 rounded-lg" title="ログアウト">
            <LogOut className="w-4 h-4" />
          </button>
        </form>
      </div>
    </header>
  )
}
