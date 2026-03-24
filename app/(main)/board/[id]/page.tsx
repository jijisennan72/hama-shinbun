import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import BoardThread from '@/components/BoardThread'

export default async function BoardThreadPage({ params }: { params: { id: string } }) {
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

  const { data: thread } = await supabase
    .from('board_threads')
    .select('id, title, content, is_anonymous, created_at, households(household_number)')
    .eq('id', params.id)
    .single()

  if (!thread) notFound()

  const { data: repliesRaw } = await supabase
    .from('board_replies')
    .select('id, content, is_anonymous, created_at, households(household_number)')
    .eq('thread_id', params.id)
    .order('created_at', { ascending: true })

  const threadData = {
    id: thread.id,
    title: thread.title,
    content: thread.content,
    is_anonymous: thread.is_anonymous,
    created_at: thread.created_at,
    poster: thread.is_anonymous ? '匿名' : `${(thread.households as any)?.household_number ?? '?'}番`,
  }

  const replies = (repliesRaw || []).map(r => ({
    id: r.id,
    content: r.content,
    is_anonymous: r.is_anonymous,
    created_at: r.created_at,
    poster: r.is_anonymous ? '匿名' : `${(r.households as any)?.household_number ?? '?'}番`,
  }))

  return (
    <BoardThread
      thread={threadData}
      initialReplies={replies}
      householdId={household?.id ?? ''}
      householdNumber={household?.household_number ?? ''}
    />
  )
}
