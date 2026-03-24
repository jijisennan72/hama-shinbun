import { createClient } from '@/lib/supabase/server'
import AdminScheduleManager from '@/components/admin/AdminScheduleManager'

export default async function AdminSchedulePage() {
  const supabase = await createClient()
  const { data: events } = await supabase
    .from('schedule_events')
    .select('*')
    .order('event_date', { ascending: true })

  return (
    <div className="space-y-4">
      <AdminScheduleManager initialEvents={events || []} />
    </div>
  )
}
