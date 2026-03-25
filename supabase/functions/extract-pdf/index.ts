// Supabase Edge Function (Deno) - PDF text extraction using pdfjs-dist

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import * as pdfjs from 'https://esm.sh/pdfjs-dist@4.9.155/build/pdf.mjs'

// Deno環境ではWorkerは不要なので無効化
pdfjs.GlobalWorkerOptions.workerSrc = ''

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
    console.log(`[extract-pdf] Downloaded ${arrayBuffer.byteLength} bytes`)

    // ② pdfjs-distでテキスト抽出
    const loadingTask = pdfjs.getDocument({ data: new Uint8Array(arrayBuffer) })
    const pdfDoc = await loadingTask.promise
    const numPages = pdfDoc.numPages
    console.log(`[extract-pdf] Pages: ${numPages}`)

    const pageTexts: string[] = []
    for (let i = 1; i <= numPages; i++) {
      const page = await pdfDoc.getPage(i)
      const content = await page.getTextContent()
      const pageText = content.items
        .map((item: { str?: string }) => item.str ?? '')
        .join(' ')
      pageTexts.push(pageText)
    }

    const text = pageTexts.join('\n').trim()
    console.log(`[extract-pdf] Extracted ${text.length} chars`)

    // ③ Supabase DB 更新
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
