import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { verifySessionToken, SESSION_COOKIE } from '@/lib/admin-auth'

async function requireAdminSession() {
  const cookieStore = await cookies()
  const token = cookieStore.get(SESSION_COOKIE)?.value
  if (!token || !verifySessionToken(token)) return false
  return true
}

function getAdminSupabase() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// イベント作成
export async function POST(req: NextRequest) {
  if (!await requireAdminSession()) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  const { title, description, event_date, location, max_attendees, event_time } = body
  const supabase = getAdminSupabase()

  const { data: event, error } = await supabase
    .from('events')
    .insert({ title, description, event_date, location, max_attendees, is_active: true })
    .select('id, title, description, event_date, location, max_attendees, attachment_url, extracted_text, is_active, created_at')
    .single()

  if (error || !event) {
    return NextResponse.json({ error: error?.message ?? '登録失敗' }, { status: 400 })
  }

  // schedule_events に同期
  const dateOnly = event_date.slice(0, 10)
  await supabase.from('schedule_events').insert({
    title,
    event_date: dateOnly,
    event_time: event_time || null,
    location: location || null,
    content: description || null,
    category: 'イベント',
    event_id: event.id,
  })

  return NextResponse.json({ event })
}

// イベント更新（フィールド更新 + schedule_events同期オプション）
export async function PATCH(req: NextRequest) {
  if (!await requireAdminSession()) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  const { eventId, syncSchedule, event_time, ...updates } = body
  const supabase = getAdminSupabase()

  const { error } = await supabase.from('events').update(updates).eq('id', eventId)
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  // schedule_events 同期（編集時のみ）
  if (syncSchedule) {
    const dateOnly = updates.event_date?.slice(0, 10)
    await supabase.from('schedule_events').update({
      title: updates.title,
      event_date: dateOnly,
      event_time: event_time || null,
      location: updates.location || null,
      content: updates.description || null,
    }).eq('event_id', eventId)
  }

  return NextResponse.json({ ok: true })
}

// イベント削除
export async function DELETE(req: NextRequest) {
  if (!await requireAdminSession()) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { eventId } = await req.json()
  const supabase = getAdminSupabase()

  const { error } = await supabase.from('events').delete().eq('id', eventId)
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  // schedule_events も削除
  await supabase.from('schedule_events').delete().eq('event_id', eventId)

  return NextResponse.json({ ok: true })
}
