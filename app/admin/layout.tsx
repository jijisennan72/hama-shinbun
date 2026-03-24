import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import AdminNavigation from '@/components/AdminNavigation'
import Breadcrumb from '@/components/Breadcrumb'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: household } = await supabase
    .from('households')
    .select('is_admin')
    .eq('user_id', user.id)
    .single()

  if (!household?.is_admin) redirect('/')

  return (
    <div className="min-h-screen bg-gray-100">
      <AdminNavigation />
      <main className="max-w-4xl mx-auto px-4 pb-8 pt-4">
        <Breadcrumb />
        {children}
      </main>
      <footer className="text-center text-xs text-gray-400 py-4">
        --- 浜区アプリ2026 ver0.1 ---
      </footer>
    </div>
  )
}
