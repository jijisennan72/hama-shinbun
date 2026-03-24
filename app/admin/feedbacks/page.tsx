import { createClient } from '@/lib/supabase/server'
import AdminFeedbackList from '@/components/admin/AdminFeedbackList'

export default async function AdminFeedbacksPage() {
  const supabase = await createClient()
  const { data: feedbacks } = await supabase
    .from('feedbacks')
    .select('*, households(name, household_number)')
    .order('created_at', { ascending: false })

  return (
    <div className="space-y-4">
      <AdminFeedbackList initialFeedbacks={feedbacks || []} />
    </div>
  )
}
