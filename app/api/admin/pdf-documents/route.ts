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

// PDFアップロード + DB登録（FormData）
export async function POST(req: NextRequest) {
  if (!await requireAdminSession()) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const formData = await req.formData()
  const file = formData.get('file') as File | null
  const txtFile = formData.get('txtFile') as File | null
  const year = parseInt(formData.get('year') as string)
  const month = parseInt(formData.get('month') as string)

  if (!file || isNaN(year) || isNaN(month)) {
    return NextResponse.json({ error: 'file, year, month は必須です' }, { status: 400 })
  }

  const supabase = getAdminSupabase()
  const baseName = `${year}-${String(month).padStart(2, '0')}-${Date.now()}`

  // ① PDFアップロード
  const pdfPath = `${baseName}.pdf`
  const pdfBuffer = await file.arrayBuffer()
  const { error: uploadError } = await supabase.storage
    .from('pdf-documents')
    .upload(pdfPath, pdfBuffer, { contentType: 'application/pdf' })

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 400 })
  }

  const { data: { publicUrl } } = supabase.storage.from('pdf-documents').getPublicUrl(pdfPath)

  // ② txtファイル処理（任意）
  let extractedText: string | null = null
  if (txtFile) {
    extractedText = await txtFile.text()
    const txtPath = `${baseName}.txt`
    await supabase.storage
      .from('pdf-documents')
      .upload(txtPath, new TextEncoder().encode(extractedText), { contentType: 'text/plain' })
  }

  // ③ DB登録
  const insertPayload: Record<string, unknown> = {
    title: 'はま新聞',
    file_url: publicUrl,
    file_size: file.size,
    year,
    month,
    published_at: new Date(year, month - 1).toISOString(),
  }
  if (extractedText !== null) {
    insertPayload.extracted_text = extractedText
    insertPayload.extracted_at = new Date().toISOString()
  }

  const { data: newPdf, error: dbError } = await supabase
    .from('pdf_documents')
    .insert(insertPayload)
    .select()
    .single()

  if (dbError || !newPdf) {
    return NextResponse.json({ error: dbError?.message ?? 'DB登録失敗' }, { status: 400 })
  }

  return NextResponse.json({ pdf: newPdf })
}

// テキスト追加（既存PDFにtxtを後付け）
export async function PUT(req: NextRequest) {
  if (!await requireAdminSession()) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const formData = await req.formData()
  const txtFile = formData.get('txtFile') as File | null
  const pdfId = formData.get('pdfId') as string | null
  const pdfFileName = formData.get('pdfFileName') as string | null

  if (!txtFile || !pdfId) {
    return NextResponse.json({ error: 'txtFile と pdfId は必須です' }, { status: 400 })
  }

  const supabase = getAdminSupabase()
  const text = await txtFile.text()

  // Storage に txt 保存
  if (pdfFileName) {
    const txtFileName = pdfFileName.replace(/\.pdf$/i, '.txt')
    await supabase.storage
      .from('pdf-documents')
      .upload(txtFileName, new TextEncoder().encode(text), {
        contentType: 'text/plain',
        upsert: true,
      })
  }

  // DB更新
  await supabase
    .from('pdf_documents')
    .update({ extracted_text: text, extracted_at: new Date().toISOString() })
    .eq('id', pdfId)

  return NextResponse.json({ ok: true, text })
}

// PDF削除（Storage + DB）
export async function DELETE(req: NextRequest) {
  if (!await requireAdminSession()) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id, pdfPath } = await req.json()
  const supabase = getAdminSupabase()

  if (pdfPath) {
    const txtPath = pdfPath.replace(/\.pdf$/i, '.txt')
    await supabase.storage.from('pdf-documents').remove([pdfPath, txtPath])
  }

  const { error } = await supabase.from('pdf_documents').delete().eq('id', id)
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json({ ok: true })
}
