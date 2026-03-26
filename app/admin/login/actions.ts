'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/server'
import { verifyPin, createSessionToken, hashPin, SESSION_COOKIE } from '@/lib/admin-auth'

const SESSION_TTL_SECONDS = 8 * 60 * 60

export async function adminLogin(
  username: string,
  pin: string,
): Promise<{ error?: string }> {
  username = username.trim()
  pin = pin.trim()

  if (!username || pin.length !== 6) {
    return { error: 'ユーザー名と6桁のPINを入力してください' }
  }

  const supabase = createAdminClient()
  const { data: adminUser, error } = await supabase
    .from('admin_users')
    .select('id, pin_hash')
    .eq('username', username)
    .maybeSingle()

  if (error || !adminUser) {
    return { error: 'ユーザー名またはPINが正しくありません' }
  }

  if (!verifyPin(pin, adminUser.pin_hash)) {
    return { error: 'ユーザー名またはPINが正しくありません' }
  }

  const token = createSessionToken(adminUser.id)
  const cookieStore = await cookies()
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: SESSION_TTL_SECONDS,
    path: '/',
  })

  return {}
}

export async function adminLogout(): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.delete(SESSION_COOKIE)
  redirect('/admin/login')
}

// 管理者ユーザー登録用ユーティリティ（初回セットアップ時のみ使用）
export async function createAdminUser(username: string, pin: string): Promise<{ error?: string }> {
  if (pin.length !== 6) return { error: 'PINは6桁で入力してください' }
  const supabase = createAdminClient()
  const pinHash = hashPin(pin)
  const { error } = await supabase.from('admin_users').insert({ username, pin_hash: pinHash })
  if (error) return { error: error.message }
  return {}
}
