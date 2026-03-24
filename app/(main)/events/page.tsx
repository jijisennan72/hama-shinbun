import { createClient } from '@/lib/supabase/server'
import EventList from '@/components/EventList'

export default async function EventsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: household } = await supabase
    .from('households')
    .select('id')
    .eq('user_id', user!.id)
    .single()

  const { data: events } = await supabase
    .from('events')
    .select('*, event_registrations(id, household_id, attendee_count, notes)')
    .gte('event_date', new Date().toISOString())
    .order('event_date', { ascending: true })

  type RegRow = { id: string; household_id: string; attendee_count: number; notes: string | null }

  const eventsWithRegistration = (events || []).map(e => {
    const myReg = (e.event_registrations as RegRow[])?.find(r => r.household_id === household?.id)
    return {
      ...e,
      attachment_url: (e.attachment_url as string | null) ?? null,
      is_registered: !!myReg,
      my_registration: myReg
        ? {
            id: myReg.id,
            attendee_count: myReg.attendee_count,
            notes: myReg.notes,
          }
        : null,
      current_attendees: (e.event_registrations as RegRow[] || []).reduce(
        (sum, r) => sum + (r.attendee_count || 0), 0
      ),
    }
  })

  return (
    <div className="space-y-4">
      <EventList events={eventsWithRegistration} householdId={household?.id} />
    </div>
  )
}
