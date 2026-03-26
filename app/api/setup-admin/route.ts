import { createAdminClient } from '@/lib/supabase/server'
import { hashPin } from '@/lib/admin-auth'

export async function GET() {
  const supabase = createAdminClient()
  const pinHash = hashPin('123456')
  const { error } = await supabase
    .from('admin_users')
    .update({ pin_hash: pinHash })
    .eq('username', 'admin')
  if (error) {
    return Response.json({ error: error.message }, { status: 400 })
  }
  return Response.json({ ok: true, message: 'admin PIN reset to 123456. DELETE THIS FILE NOW.' })
}
