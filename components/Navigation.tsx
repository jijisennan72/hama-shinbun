'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Home, FileText, ClipboardCheck, Calendar, BarChart2, MessageSquare, Bell, LogOut, LogIn } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface Household {
  name: string
  household_number: string
  is_admin: boolean
}

export default function Navigation({ household }: { household: Household | null }) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  const navItems = [
    { href: '/', icon: Home, label: 'ホーム' },
    { href: '/pdf', icon: FileText, label: 'PDF' },
    { href: '/circulation', icon: ClipboardCheck, label: '回覧板' },
    { href: '/events', icon: Calendar, label: 'イベント' },
    { href: '/notifications', icon: Bell, label: 'お知らせ' },
  ]

  return (
    <>
      <header className="bg-primary-900 text-white px-4 py-3 flex items-center justify-between sticky top-0 z-10">
        <div>
          <h1 className="font-bold text-lg">はまアプリ</h1>
          {household && (
            <p className="text-xs text-primary-200">{household.household_number}番 {household.name}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {household?.is_admin && (
            <Link href="/admin" className="text-xs bg-primary-700 hover:bg-primary-600 px-2 py-1 rounded">
              管理
            </Link>
          )}
          {household ? (
            <button onClick={handleLogout} className="p-1.5 hover:bg-primary-700 rounded-lg" title="ログアウト">
              <LogOut className="w-4 h-4" />
            </button>
          ) : (
            <Link
              href="/login"
              className="flex items-center gap-1 text-xs bg-primary-700 hover:bg-primary-600 px-2 py-1 rounded"
            >
              <LogIn className="w-3 h-3" />
              ログイン
            </Link>
          )}
        </div>
      </header>
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-10">
        <div className="max-w-2xl mx-auto flex">
          {navItems.map(item => {
            const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href))
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex-1 flex flex-col items-center py-2 text-xs transition-colors ${
                  isActive ? 'text-primary-600' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <item.icon className={`w-5 h-5 mb-0.5 ${isActive ? 'stroke-2' : ''}`} />
                {item.label}
              </Link>
            )
          })}
        </div>
      </nav>
    </>
  )
}
