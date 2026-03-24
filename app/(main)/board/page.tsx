import { createClient } from '@/lib/supabase/server'
import BoardList from '@/components/BoardList'

export default async function BoardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let household: { id: string; household_number: string } | null = null
  if (user) {
    const { data } = await supabase
      .from('households')
      .select('id, household_number')
      .eq('user_id', user.id)
      .single()
    household = data
  }

  const { data: raw } = await supabase
    .from('board_threads')
    .select('id, title, is_anonymous, created_at, households(household_number), board_replies(id)')
    .order('created_at', { ascending: false })

  const threads = (raw || []).map(t => ({
    id: t.id,
    title: t.title,
    is_anonymous: t.is_anonymous,
    created_at: t.created_at,
    poster: t.is_anonymous ? '匿名' : `${(t.households as any)?.household_number ?? '?'}番`,
    reply_count: Array.isArray(t.board_replies) ? t.board_replies.length : 0,
  }))

  return (
    <div className="space-y-4">
      <p className="text-xs text-gray-400">みんなの口コミ・情報交換</p>
      <BoardList
        threads={threads}
        householdId={household?.id ?? ''}
        householdNumber={household?.household_number ?? ''}
      />
    </div>
  )
}
