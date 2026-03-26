import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { cookies } from 'next/headers'
import { verifySessionToken, SESSION_COOKIE } from '@/lib/admin-auth'
import AdminNavigation from '@/components/AdminNavigation'
import AdminBreadcrumb from '@/components/AdminBreadcrumb'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const headersList = await headers()
  const pathname = headersList.get('x-pathname') ?? ''

  // ログインページはそのままレンダリング（認証チェック不要）
  if (pathname === '/admin/login') {
    return <>{children}</>
  }

  // セッションクッキーの署名を検証
  const cookieStore = await cookies()
  const token = cookieStore.get(SESSION_COOKIE)?.value
  if (!token || !verifySessionToken(token)) {
    redirect('/admin/login')
  }

  return (
    <div className="min-h-screen bg-violet-50 dark:bg-[#0f0e2a]">
      <AdminNavigation />
      <main className="max-w-4xl mx-auto px-4 pb-8 pt-4">
        <AdminBreadcrumb />
        {children}
      </main>
      <footer className="text-center text-xs text-gray-400 py-4">
        --- はまアプリ2026 ver0.3 ---
      </footer>
    </div>
  )
}
