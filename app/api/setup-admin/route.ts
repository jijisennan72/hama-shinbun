import { createAdminUser } from '@/app/admin/login/actions'

export async function GET() {
  const result = await createAdminUser('admin', '123456')
  if (result.error) {
    return Response.json({ error: result.error }, { status: 400 })
  }
  return Response.json({ ok: true, message: 'admin user created. DELETE THIS FILE NOW.' })
}
