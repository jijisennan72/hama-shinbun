import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { FileText, Bell, Calendar, MessageSquare, BarChart2, Users, ClipboardList, CalendarDays, Megaphone } from 'lucide-react'

export default async function AdminDashboard() {
  const supabase = await createClient()

  const [
    { count: pdfCount },
    { count: feedbackCount },
    { count: registrationCount },
    { count: householdCount },
  ] = await Promise.all([
    supabase.from('pdf_documents').select('*', { count: 'exact', head: true }),
    supabase.from('feedbacks').select('*', { count: 'exact', head: true }).eq('is_read', false),
    supabase.from('event_registrations').select('*', { count: 'exact', head: true }),
    supabase.from('households').select('*', { count: 'exact', head: true }),
  ])

  const stats = [
    { label: 'PDF数', value: pdfCount ?? 0, icon: FileText, color: 'text-blue-600 bg-blue-100' },
    { label: '未読意見', value: feedbackCount ?? 0, icon: MessageSquare, color: 'text-pink-600 bg-pink-100' },
    { label: '申込件数', value: registrationCount ?? 0, icon: Calendar, color: 'text-purple-600 bg-purple-100' },
    { label: '利用者数', value: householdCount ?? 0, icon: Users, color: 'text-green-600 bg-green-100' },
  ]

  const adminMenus = [
    { href: '/admin/schedule', icon: CalendarDays, label: '予定管理', desc: '浜区の予定の作成・編集' },
    { href: '/admin/notifications', icon: Bell, label: '通知送信', desc: 'お知らせ・緊急通知' },
    { href: '/admin/pdf', icon: FileText, label: 'PDF管理', desc: '広報PDFの追加・削除' },
    { href: '/admin/circulation', icon: ClipboardList, label: '回覧板管理', desc: '回覧板の作成・既読確認' },
    { href: '/admin/events', icon: CalendarDays, label: 'イベント管理', desc: 'イベントの作成・申込者確認' },
    { href: '/admin/surveys', icon: BarChart2, label: 'アンケート管理', desc: 'アンケートの作成・集計' },
    { href: '/admin/feedbacks', icon: MessageSquare, label: '意見・要望', desc: '住民からの意見確認' },
    { href: '/admin/board', icon: Megaphone, label: '掲示板管理', desc: '投稿・レスの削除' },
    { href: '/admin/households', icon: Users, label: '利用者管理', desc: '利用者の登録・編集' },
  ]

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">管理者ダッシュボード</h1>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map(s => (
          <div key={s.label} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <div className={`inline-flex p-2 rounded-lg ${s.color} mb-2`}>
              <s.icon className="w-5 h-5" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{s.value}</p>
            <p className="text-sm text-gray-500">{s.label}</p>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {adminMenus.map(menu => (
          <Link key={menu.href} href={menu.href} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 hover:shadow-md transition-shadow flex items-center gap-4">
            <div className="bg-gray-100 p-3 rounded-lg">
              <menu.icon className="w-6 h-6 text-gray-600" />
            </div>
            <div>
              <p className="font-semibold text-gray-800">{menu.label}</p>
              <p className="text-sm text-gray-500">{menu.desc}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
