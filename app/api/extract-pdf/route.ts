import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Service role client to bypass RLS
const adminSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('[extract-pdf] SUPABASE_SERVICE_ROLE_KEY is not set')
    return NextResponse.json({ error: 'SUPABASE_SERVICE_ROLE_KEY not configured' }, { status: 500 })
  }

  let pdfId: string | undefined
  let pdfUrl: string | undefined
  try {
    const body = await req.json()
    pdfId = body.pdfId
    pdfUrl = body.pdfUrl
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  if (!pdfId || !pdfUrl) {
    return NextResponse.json({ error: 'pdfId and pdfUrl are required' }, { status: 400 })
  }

  console.log(`[extract-pdf] Start: pdfId=${pdfId}`)

  // ① PDFダウンロード
  let buffer: Buffer
  try {
    const response = await fetch(pdfUrl)
    if (!response.ok) throw new Error(`HTTP ${response.status} ${response.statusText}`)
    buffer = Buffer.from(await response.arrayBuffer())
    console.log(`[extract-pdf] Downloaded ${buffer.length} bytes`)
  } catch (err) {
    console.error('[extract-pdf] Download failed:', err)
    return NextResponse.json({ error: `Download failed: ${String(err)}` }, { status: 502 })
  }

  // ② pdf-parse でテキスト抽出（関数内で require してモジュールロード失敗を防ぐ）
  let text = ''
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-explicit-any
    const pdfParseModule: any = require('pdf-parse')
    const pdfParse: (buf: Buffer) => Promise<{ text: string }> =
      typeof pdfParseModule === 'function' ? pdfParseModule : pdfParseModule.default
    const data = await pdfParse(buffer)
    text = (data.text ?? '').trim()
    console.log(`[extract-pdf] Extracted ${text.length} chars`)
  } catch (err) {
    console.error('[extract-pdf] pdf-parse failed:', err)
    return NextResponse.json({ error: `PDF extraction failed: ${String(err)}` }, { status: 500 })
  }

  // ③ Supabase 更新
  try {
    const { error } = await adminSupabase
      .from('pdf_documents')
      .update({
        extracted_text: text || null,
        text_extracted_at: new Date().toISOString(),
      })
      .eq('id', pdfId)

    if (error) throw error
    console.log(`[extract-pdf] DB updated: pdfId=${pdfId}, chars=${text.length}`)
  } catch (err) {
    console.error('[extract-pdf] Supabase update failed:', err)
    return NextResponse.json({ error: `DB update failed: ${String(err)}` }, { status: 500 })
  }

  return NextResponse.json({ success: true, chars: text.length })
}
