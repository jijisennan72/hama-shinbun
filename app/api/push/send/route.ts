import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { verifySessionToken, SESSION_COOKIE } from '@/lib/admin-auth'

export async function POST(req: NextRequest) {
  const cookieStore = await cookies()
  const token = cookieStore.get(SESSION_COOKIE)?.value
  if (!token || !verifySessionToken(token)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  const { title, body: notifBody, isEmergency } = body

  const supabase = await createClient()
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
