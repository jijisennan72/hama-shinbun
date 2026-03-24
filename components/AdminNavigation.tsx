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
    <header className="bg-gray-900 text-white px-4 py-3 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <Link href="/" className="p-1 hover:bg-gray-700 rounded">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="font-bold">管理者画面</h1>
          <p className="text-xs text-gray-400">浜区公式アプリ</p>
        </div>
      </div>
      <button onClick={handleLogout} className="p-1.5 hover:bg-gray-700 rounded-lg">
        <LogOut className="w-4 h-4" />
      </button>
    </header>
  )
}
