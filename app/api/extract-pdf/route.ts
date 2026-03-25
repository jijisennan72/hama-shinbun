import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Service role client to bypass RLS for internal updates
const adminSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  const { pdfId, pdfUrl } = await req.json()
  if (!pdfId || !pdfUrl) {
    return NextResponse.json({ error: 'pdfId and pdfUrl are required' }, { status: 400 })
  }

  try {
    // PDFをダウンロード
    const response = await fetch(pdfUrl)
    if (!response.ok) {
      const msg = `PDF fetch failed: ${response.status} ${response.statusText}`
      console.error('[extract-pdf]', msg)
      return NextResponse.json({ error: msg }, { status: 502 })
    }
    const buffer = Buffer.from(await response.arrayBuffer())
    console.log(`[extract-pdf] Downloaded ${buffer.length} bytes for pdfId=${pdfId}`)

    // pdf-parse は lib/ パスを直接指定してテストファイル読み込みを回避
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pdfParse = require('pdf-parse/lib/pdf-parse')
    const data = await pdfParse(buffer)
    const text = (data.text ?? '').trim()
    console.log(`[extract-pdf] Extracted ${text.length} chars from pdfId=${pdfId}`)

    // Service role で RLS をバイパスして更新
    const { error } = await adminSupabase
      .from('pdf_documents')
      .update({
        extracted_text: text || null,
        text_extracted_at: new Date().toISOString(),
      })
      .eq('id', pdfId)

    if (error) {
      console.error('[extract-pdf] Supabase update error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    console.log(`[extract-pdf] Success: pdfId=${pdfId}, chars=${text.length}`)
    return NextResponse.json({ success: true, chars: text.length })
  } catch (err) {
    console.error('[extract-pdf] Unexpected error:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
