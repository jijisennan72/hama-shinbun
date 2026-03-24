import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

export async function PATCH(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: adminCheck } = await supabase
    .from('households').select('is_admin').eq('user_id', user.id).single()
  if (!adminCheck?.is_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

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
        { password: newPin }
      )
      if (pinError) return NextResponse.json({ error: pinError.message }, { status: 400 })
    }
  }

  return NextResponse.json({ ok: true })
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: adminCheck } = await supabase
    .from('households').select('is_admin').eq('user_id', user.id).single()
  if (!adminCheck?.is_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { householdNumber, name, pin } = await req.json()
  const adminSupabase = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const email = `${householdNumber}@hama.local`
  const { data: authData, error: authError } = await adminSupabase.auth.admin.createUser({
    email,
    password: pin,
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
