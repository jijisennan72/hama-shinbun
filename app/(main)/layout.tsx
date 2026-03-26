import { createClient } from '@/lib/supabase/server'
import Navigation from '@/components/Navigation'
import Breadcrumb from '@/components/Breadcrumb'

export default async function MainLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let household = null
  if (user) {
    const { data } = await supabase
      .from('households')
      .select('*')
      .eq('user_id', user.id)
      .single()
    household = data
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation household={household} />
      <main className="max-w-2xl mx-auto px-4 pb-24 pt-4">
        <Breadcrumb />
        {children}
      </main>
      <footer className="text-center text-xs text-gray-400 py-4 pb-28">
        --- はまアプリ2026 ver0.3 ---
      </footer>
    </div>
  )
}
