'use server'

import { cookies, headers } from 'next/headers'
import { createAdminClient } from '@/lib/supabase/server'
import { verifyPin, hashPin, verifySessionToken, SESSION_COOKIE } from '@/lib/admin-auth'

export async function changeAdminPin(
  currentPin: string,
  newPin: string,
): Promise<{ error?: string; success?: boolean }> {
  if (currentPin.length !== 6 || newPin.length !== 6) {
    return { error: 'PINは6桁で入力してください' }
  }
  if (currentPin === newPin) {
    return { error: '新しいPINは現在のPINと異なる値にしてください' }
  }

  // セッションから管理者IDを取得
  const cookieStore = await cookies()
  const token = cookieStore.get(SESSION_COOKIE)?.value
  if (!token) return { error: '認証情報がありません。再ログインしてください。' }

  const session = verifySessionToken(token)
  if (!session) return { error: 'セッションが無効です。再ログインしてください。' }

  const supabase = createAdminClient()

  // 現在のpin_hashを取得
  const { data: adminUser, error: fetchError } = await supabase
    .from('admin_users')
    .select('id, pin_hash')
    .eq('id', session.adminId)
    .maybeSingle()

  if (fetchError || !adminUser) {
    return { error: '管理者情報の取得に失敗しました' }
  }

  // 現在のPINを検証
  if (!verifyPin(currentPin, adminUser.pin_hash)) {
    return { error: '現在のPINが正しくありません' }
  }

  // 新しいPINをハッシュ化して保存
  const newPinHash = hashPin(newPin)
  const { error: updateError } = await supabase
    .from('admin_users')
    .update({ pin_hash: newPinHash })
    .eq('id', adminUser.id)

  if (updateError) {
    return { error: 'PINの更新に失敗しました' }
  }

  return { success: true }
}
