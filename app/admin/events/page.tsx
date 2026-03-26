import { createClient } from '@/lib/supabase/server'
import AdminEventManager from '@/components/admin/AdminEventManager'

export default async function AdminEventsPage() {
  const supabase = await createClient()

  const { data: events } = await supabase
    .from('events')
    .select('id, title, description, event_date, location, max_attendees, attachment_url, extracted_text, is_active, created_at, event_registrations(id, attendee_count, notes, created_at, households(name, household_number))')
    .order('event_date', { ascending: false })

  return (
    <div className="space-y-4">
      <AdminEventManager initialEvents={(events || []) as any[]} />
    </div>
  )
}
