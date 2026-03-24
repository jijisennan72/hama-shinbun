import React from 'react'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { FileText, ClipboardCheck, Calendar, BarChart2, MessageSquare, Bell, CalendarDays, Megaphone, LogIn, User, Lock, UserCircle } from 'lucide-react'
import EmergencyBanner from '@/components/EmergencyBanner'
import FontSizeSwitcher from '@/components/FontSizeSwitcher'

export default async function DashboardPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  let household: { household_number: string; name: string } | null = null
  if (user) {
    const { data } = await supabase
      .from('households')
      .select('household_number, name')
      .eq('user_id', user.id)
      .single()
    household = data
  }

  const { data: emergencies } = await supabase
    .from('notifications')
    .select('*')
    .eq('is_emergency', true)
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(3)

  const menus = [
    { href: '/schedule',      icon: CalendarDays,  label: '浜区の予定',   color: 'bg-teal-100 text-teal-600',     desc: '今月の予定',              auth: false, loginOnly: false },
    // 文字サイズカードは2番目（FontSizeSwitcherとして別途レンダリング）
    { href: '/notifications', icon: Bell,          label: 'お知らせ',     color: 'bg-yellow-100 text-yellow-600', desc: 'プッシュ通知設定',         auth: false, loginOnly: false },
    { href: '/pdf',           icon: FileText,       label: 'はま新聞',     color: 'bg-blue-100 text-blue-600',     desc: 'バックナンバーを見る',     auth: false, loginOnly: false },
    { href: '/circulation',   icon: ClipboardCheck, label: '回覧板',       color: 'bg-green-100 text-green-600',   desc: '既読確認',                 auth: true,  loginOnly: false },
    { href: '/events',        icon: Calendar,       label: 'イベント申込', color: 'bg-purple-100 text-purple-600', desc: 'イベントに参加する',       auth: true,  loginOnly: false },
    { href: '/surveys',       icon: BarChart2,      label: 'アンケート',   color: 'bg-orange-100 text-orange-600', desc: '住民アンケート',           auth: true,  loginOnly: false },
    { href: '/feedback',      icon: MessageSquare,  label: '意見・要望',   color: 'bg-pink-100 text-pink-600',     desc: 'ご意見をお寄せください',   auth: true,  loginOnly: false },
    { href: '/board',         icon: Megaphone,      label: '掲示板',       color: 'bg-cyan-100 text-cyan-600',     desc: 'みんなの口コミ・情報交換', auth: false, loginOnly: false },
    { href: '/mypage',        icon: UserCircle,     label: 'マイページ',   color: 'bg-indigo-100 text-indigo-600', desc: '申込履歴・設定',           auth: true,  loginOnly: true  },
  ]

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mt-2">
        <h1 className="text-xl font-bold text-gray-900">ホーム</h1>
        {household ? (
          <Link
            href="/mypage"
            className="flex items-center gap-1.5 text-xs text-primary-700 bg-primary-50 hover:bg-primary-100 px-2.5 py-1 rounded-full transition-colors"
          >
            <User className="w-3 h-3" />
            {household.household_number}番 ログイン中
          </Link>
        ) : (
          <Link
            href="/login"
            className="flex items-center gap-1.5 text-xs text-white bg-primary-600 hover:bg-primary-700 px-3 py-1.5 rounded-full transition-colors"
          >
            <LogIn className="w-3 h-3" />
            ログインする
          </Link>
        )}
      </div>

      {emergencies && emergencies.length > 0 && (
        <div className="space-y-2">
          {emergencies.map(n => <EmergencyBanner key={n.id} notification={n} />)}
        </div>
      )}
      <div className="grid grid-cols-2 gap-3">
        {menus.filter(menu => !menu.loginOnly || !!household).map((menu, i) => {
          const locked = menu.auth && !household
          return (
            <React.Fragment key={menu.href}>
              <Link
                href={menu.href}
                className={`card hover:shadow-md transition-shadow active:scale-95 relative ${locked ? 'opacity-50' : ''}`}
              >
                {locked && (
                  <Lock className="absolute top-2 right-2 w-3 h-3 text-gray-400" />
                )}
                <div className={`inline-flex p-2 rounded-lg ${locked ? 'bg-gray-100 text-gray-400' : menu.color} mb-2`}>
                  <menu.icon className="w-5 h-5" />
                </div>
                <p className={`font-semibold text-sm ${locked ? 'text-gray-400' : 'text-gray-800'}`}>{menu.label}</p>
                <p className="text-xs text-gray-400 mt-0.5">{locked ? 'ログインが必要です' : menu.desc}</p>
              </Link>
              {i === 0 && <FontSizeSwitcher />}
            </React.Fragment>
          )
        })}
      </div>
    </div>
  )
}
