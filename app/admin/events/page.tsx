import { createClient } from '@/lib/supabase/server'
import AdminEventManager from '@/components/admin/AdminEventManager'

export default async function AdminEventsPage() {
  const supabase = await createClient()

  const { data: events } = await supabase
    .from('events')
    .select('*, event_registrations(id, attendee_count, notes, created_at, households(name, household_number))')
    .order('event_date', { ascending: false })

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-gray-900">イベント管理</h1>
      <AdminEventManager initialEvents={events || []} />
    </div>
  )
}
