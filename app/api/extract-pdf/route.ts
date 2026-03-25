import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const { pdfId, pdfUrl } = await req.json()
  if (!pdfId || !pdfUrl) {
    return NextResponse.json({ error: 'pdfId and pdfUrl are required' }, { status: 400 })
  }

  try {
    const response = await fetch(pdfUrl)
    if (!response.ok) throw new Error(`Failed to fetch PDF: ${response.status}`)
    const buffer = Buffer.from(await response.arrayBuffer())

    // Dynamic import to avoid Next.js build issues with pdf-parse's test file
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pdfParseModule = await import('pdf-parse') as any
    const pdfParse = pdfParseModule.default ?? pdfParseModule
    const data = await pdfParse(buffer)
    const text = data.text.trim()

    const supabase = await createClient()
    const { error } = await supabase
      .from('pdf_documents')
      .update({
        extracted_text: text,
        text_extracted_at: new Date().toISOString(),
      })
      .eq('id', pdfId)

    if (error) throw error
    return NextResponse.json({ success: true, chars: text.length })
  } catch (err) {
    console.error('[extract-pdf]', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
