import { createAdminClient } from '@/lib/supabase/server'
import AdminFeedbackList from '@/components/admin/AdminFeedbackList'

export const dynamic = 'force-dynamic'

export default async function AdminFeedbacksPage() {
  const supabase = createAdminClient()

  // feedback_replies テーブルが未作成の場合に備えてフォールバックあり
  const { data: feedbacks, error } = await supabase
    .from('feedbacks')
    .select('*, households(name, household_number), feedback_replies(id, reply_text, replied_at, replied_by)')
    .order('created_at', { ascending: false })

  let feedbackData = feedbacks
  if (error) {
    console.warn('feedback_replies join failed, falling back:', error.message)
    const { data: fallback } = await supabase
      .from('feedbacks')
      .select('*, households(name, household_number)')
      .order('created_at', { ascending: false })
    feedbackData = (fallback || []).map((f: Record<string, unknown>) => ({ ...f, feedback_replies: [] }))
  }

  return (
    <div className="space-y-4">
      <AdminFeedbackList initialFeedbacks={(feedbackData || []).map((f: Record<string, unknown>) => ({
        ...(f as object),
        feedback_replies: Array.isArray(f.feedback_replies) ? f.feedback_replies : [],
      }))} />
    </div>
  )
}
