import React from 'react'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Bell, FileText, BarChart2, ClipboardList, CalendarDays, Megaphone, Settings } from 'lucide-react'
import AdminDashboardStats from '@/components/admin/AdminDashboardStats'
import FontSizeSwitcher from '@/components/FontSizeSwitcher'

export const dynamic = 'force-dynamic'

export default async function AdminDashboard() {
  const supabase = await createClient()
  const adminSupabase = createAdminClient()

  const [
    { data: pdfs },
    { data: allFeedbacksRaw },
    { data: events },
    { data: households },
    { data: pdfEvents },
    { data: circulations },
    { data: latestCirculation },
    { data: latestSurveys },
  ] = await Promise.all([
    supabase
      .from('pdf_documents')
      .select('id, title, description, year, month, published_at, file_url, file_size')
      .order('published_at', { ascending: false }),
    adminSupabase
      .from('feedbacks')
      .select('id, category, message, is_read, is_resolved, resolved_at, created_at, households(household_number, name)')
      .order('created_at', { ascending: false }),
    supabase
      .from('events')
      .select('*, event_registrations(id, attendee_count, notes, created_at, households(name, household_number))')
      .order('event_date', { ascending: false }),
    adminSupabase
      .from('households')
      .select('id, household_number, name, is_admin, user_id, created_at')
      .order('household_number', { ascending: true }),
    supabase
      .from('events')
      .select('id, title, event_date, attachment_url')
      .not('attachment_url', 'is', null)
      .eq('is_active', true)
      .order('event_date', { ascending: false }),
    supabase
      .from('circulation_items')
      .select('id, title, created_at, file_url')
      .not('file_url', 'is', null)
      .order('created_at', { ascending: false }),
    adminSupabase
      .from('circulation_items')
      .select('id, title, circulation_reads(household_id)')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    adminSupabase
      .from('surveys')
      .select('id, title, survey_responses(household_id)')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ])

  // feedback_repliesはクライアント側でlazy load（サーバー側JOINによるタイムアウト回避）
  const allFeedbacks = (allFeedbacksRaw ?? []).map((f: any) => ({ ...f, feedback_replies: [] }))
  const unreadCount = allFeedbacks.filter((f: any) => !f.is_read && !f.is_resolved).length

  const totalHouseholds = (households ?? []).length
  const circulationDesc = latestCirculation
    ? `${latestCirculation.title}　${(latestCirculation.circulation_reads as any[]).length}/${totalHouseholds}世帯既読`
    : '回覧板の作成・既読確認'
  const latestSurvey = latestSurveys as any
  const surveyDesc = latestSurvey
    ? `${latestSurvey.title}　${new Set((latestSurvey.survey_responses as any[]).map((r: any) => r.household_id)).size}件回答済み`
    : 'アンケートの作成・集計'

  const adminMenus = [
    { href: '/admin/notifications', icon: Bell,          label: 'お知らせ管理',   desc: 'お知らせ・緊急通知' },
    { href: '/admin/schedule',      icon: CalendarDays,  label: '予定管理',       desc: '予定表の作成・編集' },
    { href: '/admin/pdf',           icon: FileText,      label: 'はま新聞管理',   desc: 'はま新聞PDFの追加・削除' },
    { href: '/admin/circulation',   icon: ClipboardList, label: '回覧板管理',     desc: circulationDesc },
    { href: '/admin/surveys',       icon: BarChart2,     label: 'アンケート管理', desc: surveyDesc },
    { href: '/admin/board',         icon: Megaphone,     label: '掲示板管理',     desc: '投稿・レスの削除' },
    { href: '/admin/settings',      icon: Settings,      label: '管理者設定',     desc: 'PINコードの変更' },
  ]

  return (
    <div className="space-y-6">

      <AdminDashboardStats
        pdfs={(pdfs ?? []) as any[]}
        allFeedbacks={allFeedbacks}
        unreadCount={unreadCount}
        events={(events ?? []) as any[]}
        households={(households ?? []) as any[]}
        pdfEvents={(pdfEvents ?? []) as any[]}
        circulations={(circulations ?? []) as any[]}
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
