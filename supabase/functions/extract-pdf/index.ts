// Supabase Edge Function (Deno) - PDF text extraction
// Deno has DOMMatrix natively, so npm:pdf-parse works here unlike in Node.js/Vercel

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { Buffer } from 'node:buffer'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { pdfId, pdfUrl } = await req.json()

    if (!pdfId || !pdfUrl) {
      return new Response(
        JSON.stringify({ error: 'pdfId and pdfUrl are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`[extract-pdf] Start: pdfId=${pdfId}`)

    // ① PDFダウンロード
    const fetchRes = await fetch(pdfUrl)
    if (!fetchRes.ok) throw new Error(`PDF fetch failed: ${fetchRes.status}`)
    const arrayBuffer = await fetchRes.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    console.log(`[extract-pdf] Downloaded ${buffer.length} bytes`)

    // ② テキスト抽出（npm:pdf-parse は Deno の DOMMatrix 実装で動作する）
    const pdfParseModule = await import('npm:pdf-parse/lib/pdf-parse.js')
    const pdfParse = pdfParseModule.default ?? pdfParseModule
    const data = await pdfParse(buffer)
    const text = (data.text ?? '').trim()
    console.log(`[extract-pdf] Extracted ${text.length} chars`)

    // ③ Supabase DB 更新（環境変数は Edge Function に自動注入される）
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const { error } = await supabase
      .from('pdf_documents')
      .update({
        extracted_text: text || null,
        text_extracted_at: new Date().toISOString(),
      })
      .eq('id', pdfId)

    if (error) throw error
    console.log(`[extract-pdf] DB updated: pdfId=${pdfId}, chars=${text.length}`)

    return new Response(
      JSON.stringify({ success: true, chars: text.length }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    console.error('[extract-pdf] Error:', err)
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
