import { createClient } from '@/lib/supabase/server'
import AdminFeedbackList from '@/components/admin/AdminFeedbackList'

export const dynamic = 'force-dynamic'

export default async function AdminFeedbacksPage() {
  const supabase = await createClient()
  const { data: feedbacks } = await supabase
    .from('feedbacks')
    .select('*, households(name, household_number), feedback_replies(id, reply_text, replied_at, replied_by)')
    .order('created_at', { ascending: false })

  return (
    <div className="space-y-4">
      <AdminFeedbackList initialFeedbacks={feedbacks || []} />
    </div>
  )
}
