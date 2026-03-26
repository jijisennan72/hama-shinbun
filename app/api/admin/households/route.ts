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

export async function PATCH(req: NextRequest) {
  if (!await requireAdminSession()) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { householdId, name, newPin } = await req.json()
  const adminSupabase = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { error: nameError } = await adminSupabase
    .from('households').update({ name }).eq('id', householdId)
  if (nameError) return NextResponse.json({ error: nameError.message }, { status: 400 })

  if (newPin) {
    const { data: household } = await adminSupabase
      .from('households').select('user_id').eq('id', householdId).single()
    if (household?.user_id) {
      const { error: pinError } = await adminSupabase.auth.admin.updateUserById(
        household.user_id,
        { password: newPin + '@hama' }
      )
      if (pinError) return NextResponse.json({ error: pinError.message }, { status: 400 })
    }
  }

  return NextResponse.json({ ok: true })
}

export async function POST(req: NextRequest) {
  if (!await requireAdminSession()) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { householdNumber, name, pin } = await req.json()
  const adminSupabase = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const email = `${householdNumber}@hama.local`
  const { data: authData, error: authError } = await adminSupabase.auth.admin.createUser({
    email,
    password: pin + '@hama',
    email_confirm: true,
  })

  if (authError) return NextResponse.json({ error: authError.message }, { status: 400 })

  const { data: household } = await adminSupabase.from('households').insert({
    user_id: authData.user.id,
    household_number: householdNumber,
    name,
    is_admin: false,
  }).select().single()

  return NextResponse.json({ household })
}
