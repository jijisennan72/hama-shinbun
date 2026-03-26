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

// カテゴリ別一覧取得（認証不要）
export async function GET(req: NextRequest) {
  const category = req.nextUrl.searchParams.get('category')
  if (!category) return NextResponse.json({ error: 'category required' }, { status: 400 })

  const supabase = getAdminSupabase()
  const { data, error } = await supabase
    .from('local_contents')
    .select('*')
    .eq('category', category)
    .order('order_index', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ items: data })
}

// 新規作成
export async function POST(req: NextRequest) {
  if (!await requireAdminSession()) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const { category, title, body: bodyText, color, order_index } = body
  const supabase = getAdminSupabase()

  const { data, error } = await supabase
    .from('local_contents')
    .insert({ category, title, body: bodyText ?? null, color: color ?? 'blue', order_index: order_index ?? 0 })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ item: data })
}

// 更新（フィールド更新 or order_index スワップ）
export async function PATCH(req: NextRequest) {
  if (!await requireAdminSession()) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const supabase = getAdminSupabase()

  // 上下入れ替え
  if (body.action === 'swap') {
    const { id1, idx1, id2, idx2 } = body
    await Promise.all([
      supabase.from('local_contents').update({ order_index: idx2 }).eq('id', id1),
      supabase.from('local_contents').update({ order_index: idx1 }).eq('id', id2),
    ])
    return NextResponse.json({ ok: true })
  }

  const { id, ...updates } = body
  const { error } = await supabase
    .from('local_contents')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}

// PDF アップロード（FormData）
export async function PUT(req: NextRequest) {
  if (!await requireAdminSession()) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const formData = await req.formData()
  const file = formData.get('file') as File | null
  const itemId = formData.get('itemId') as string | null
  const oldPath = formData.get('oldPath') as string | null

  if (!file || !itemId) return NextResponse.json({ error: 'file と itemId は必須です' }, { status: 400 })

  const supabase = getAdminSupabase()
  const path = `local-contents/${itemId}-${Date.now()}.pdf`

  if (oldPath) await supabase.storage.from('pdf-documents').remove([oldPath])

  const arrayBuffer = await file.arrayBuffer()
  const { error: uploadError } = await supabase.storage
    .from('pdf-documents')
    .upload(path, arrayBuffer, { contentType: 'application/pdf' })

  if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 400 })

  const { data: { publicUrl } } = supabase.storage.from('pdf-documents').getPublicUrl(path)
  await supabase.from('local_contents').update({ pdf_url: publicUrl, updated_at: new Date().toISOString() }).eq('id', itemId)

  return NextResponse.json({ ok: true, path, url: publicUrl })
}

// 削除（アイテム削除 or Storage ファイル削除のみ）
export async function DELETE(req: NextRequest) {
  if (!await requireAdminSession()) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const supabase = getAdminSupabase()

  // Storage ファイルのみ削除
  if (body.storagePath) {
    await supabase.storage.from('pdf-documents').remove([body.storagePath])
    if (body.itemId) {
      await supabase.from('local_contents').update({ pdf_url: null }).eq('id', body.itemId)
    }
    return NextResponse.json({ ok: true })
  }

  // アイテム削除（PDF も一緒に削除）
  const { id } = body
  const { data: item } = await supabase.from('local_contents').select('pdf_url').eq('id', id).single()
  if (item?.pdf_url) {
    const marker = '/pdf-documents/'
    const idx = item.pdf_url.indexOf(marker)
    if (idx !== -1) {
      await supabase.storage.from('pdf-documents').remove([item.pdf_url.slice(idx + marker.length)])
    }
  }

  const { error } = await supabase.from('local_contents').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}
