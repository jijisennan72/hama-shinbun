import { createClient } from '@/lib/supabase/server'
import AdminBoardManager from '@/components/admin/AdminBoardManager'

export default async function AdminBoardPage() {
  const supabase = await createClient()

  const { data: raw } = await supabase
    .from('board_threads')
    .select(`
      id, title, content, is_anonymous, created_at,
      households(household_number),
      board_replies(id, content, is_anonymous, created_at, households(household_number))
    `)
    .order('created_at', { ascending: false })

  const threads = (raw || []).map(t => ({
    id: t.id,
    title: t.title,
    content: t.content,
    is_anonymous: t.is_anonymous,
    created_at: t.created_at,
    poster: t.is_anonymous ? '匿名' : `${(t.households as any)?.household_number ?? '?'}番`,
    replies: (Array.isArray(t.board_replies) ? t.board_replies : []).map((r: any) => ({
      id: r.id,
      content: r.content,
      is_anonymous: r.is_anonymous,
      created_at: r.created_at,
      poster: r.is_anonymous ? '匿名' : `${r.households?.household_number ?? '?'}番`,
    })),
  }))

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-gray-900">掲示板管理</h1>
      <AdminBoardManager initialThreads={threads} />
    </div>
  )
}
