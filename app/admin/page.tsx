import React from 'react'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Bell, FileText, MessageSquare, BarChart2, Users, ClipboardList, CalendarDays, Megaphone, Calendar } from 'lucide-react'
import AdminDashboardStats from '@/components/admin/AdminDashboardStats'
import FontSizeSwitcher from '@/components/FontSizeSwitcher'

export default async function AdminDashboard() {
  const supabase = await createClient()

  const [
    { data: pdfs },
    { data: feedbacks },
    { data: registrations },
    { data: households },
  ] = await Promise.all([
    supabase
      .from('pdf_documents')
      .select('id, title, year, month, published_at, file_url, file_size')
      .order('published_at', { ascending: false }),
    supabase
      .from('feedbacks')
      .select('id, category, message, is_resolved, created_at, households(household_number, name)')
      .eq('is_read', false)
      .eq('is_resolved', false)
      .order('created_at', { ascending: false }),
    supabase
      .from('event_registrations')
      .select('id, attendee_count, notes, created_at, households(household_number, name), events(title)')
      .order('created_at', { ascending: false }),
    supabase
      .from('households')
      .select('id, household_number, name, is_admin, created_at')
      .order('household_number', { ascending: true }),
  ])

  const adminMenus = [
    { href: '/admin/notifications', icon: Bell,          label: 'お知らせ管理',   desc: 'お知らせ・緊急通知' },
    { href: '/admin/schedule',      icon: CalendarDays,  label: '予定管理',       desc: '予定表の作成・編集' },
    { href: '/admin/pdf',           icon: FileText,      label: 'はま新聞管理',   desc: 'はま新聞PDFの追加・削除' },
    { href: '/admin/circulation',   icon: ClipboardList, label: '回覧板管理',     desc: '回覧板の作成・既読確認' },
    { href: '/admin/surveys',       icon: BarChart2,     label: 'アンケート管理', desc: 'アンケートの作成・集計' },
    { href: '/admin/events',        icon: Calendar,      label: 'イベント管理',   desc: 'イベントの作成・申込者確認' },
    { href: '/admin/feedbacks',     icon: MessageSquare, label: '意見・要望管理', desc: '住民からの意見確認' },
    { href: '/admin/board',         icon: Megaphone,     label: '掲示板管理',     desc: '投稿・レスの削除' },
    { href: '/admin/households',    icon: Users,         label: '利用者管理',     desc: '利用者の登録・編集' },
  ]

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const toAny = (v: unknown) => (v ?? []) as any[]

  return (
    <div className="space-y-6">

      <AdminDashboardStats
        pdfs={toAny(pdfs)}
        feedbacks={toAny(feedbacks)}
        registrations={toAny(registrations)}
        households={toAny(households)}
      />

      <div className="grid grid-cols-2 gap-3">
        {adminMenus.map((menu, i) => (
          <React.Fragment key={menu.href}>
            <Link
              href={menu.href}
              className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 hover:shadow-md transition-shadow flex items-center gap-3"
            >
              <div className="bg-gray-100 p-2.5 rounded-lg flex-shrink-0">
                <menu.icon className="w-5 h-5 text-gray-600" />
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-gray-800 text-sm">{menu.label}</p>
                <p className="text-xs text-gray-500 mt-0.5 truncate">{menu.desc}</p>
              </div>
            </Link>
            {i === 0 && <FontSizeSwitcher />}
          </React.Fragment>
        ))}
      </div>
    </div>
  )
}
