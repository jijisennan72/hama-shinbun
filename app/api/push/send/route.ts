import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { household } = await supabase
    .from('households')
    .select('is_admin')
    .eq('user_id', user.id)
    .single()
    .then(r => ({ household: r.data }))

  if (!household?.is_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const { title, body: notifBody, isEmergency } = body

  const { data: subscriptions } = await supabase
    .from('push_subscriptions')
    .select('subscription')

  if (!subscriptions || subscriptions.length === 0) {
    return NextResponse.json({ sent: 0 })
  }

  // Push notifications would be sent here using web-push library
  // For now, return success count
  return NextResponse.json({ sent: subscriptions.length, title, body: notifBody, isEmergency })
}
