import { createClient } from '@/lib/supabase/server'
import ScheduleList from '@/components/ScheduleList'

export default async function SchedulePage() {
  const supabase = await createClient()

  const { data: events } = await supabase
    .from('schedule_events')
    .select('id, title, event_date, event_time, location, content, category')
    .order('event_date', { ascending: true })

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-gray-900 mt-2">浜区の予定</h1>
      <ScheduleList events={events || []} />
    </div>
  )
}
