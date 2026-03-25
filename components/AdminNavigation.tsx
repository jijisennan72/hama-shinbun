'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, LogOut } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export default function AdminNavigation() {
  const router = useRouter()
  const supabase = createClient()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <header className="bg-violet-900 dark:bg-indigo-950 text-white px-4 py-3 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <Link href="/" className="p-1 hover:bg-violet-700 dark:hover:bg-indigo-900 rounded">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-bold">管理者画面</h1>
            <span className="text-xs bg-amber-500 text-white px-1.5 py-0.5 rounded font-medium">管理者</span>
          </div>
          <p className="text-xs text-violet-300 dark:text-indigo-300">はまアプリ</p>
        </div>
      </div>
      <button onClick={handleLogout} className="p-1.5 hover:bg-violet-700 dark:hover:bg-indigo-900 rounded-lg">
        <LogOut className="w-4 h-4" />
      </button>
    </header>
  )
}
