import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  try {
    const { pdfId } = await req.json()

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // DBからstorage_pathを取得
    const { data: pdf } = await supabase
      .from('pdf_documents')
      .select('storage_path')
      .eq('id', pdfId)
      .single()

    // Storageからバイナリ取得
    const { data: fileData } = await supabase.storage
      .from('pdf-documents')
      .download(pdf.storage_path)

    const buffer = await fileData.arrayBuffer()
    const bytes = new Uint8Array(buffer)

    // PDFバイナリからテキストを正規表現で抽出（シンプル版）
    const text = new TextDecoder('latin1').decode(bytes)
    const matches = text.match(/BT[\s\S]*?ET/g) || []
    const extracted = matches
      .join(' ')
      .replace(/\(([^)]+)\)/g, '$1 ')
      .replace(/[^\x20-\x7E\u3000-\u9FFF]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()

    // DBに保存
    await supabase
      .from('pdf_documents')
      .update({
        extracted_text: extracted,
        extracted_at: new Date().toISOString(),
      })
      .eq('id', pdfId)

    return new Response(
      JSON.stringify({ success: true, chars: extracted.length }),
      { headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})
