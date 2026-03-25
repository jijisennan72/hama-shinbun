import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Service role client for invoking Edge Functions
const adminSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
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

  console.log(`[api/extract-pdf] Invoking Edge Function: pdfId=${pdfId}`)

  const { data, error } = await adminSupabase.functions.invoke('extract-pdf', {
    body: { pdfId, pdfUrl },
  })

  if (error) {
    console.error('[api/extract-pdf] Edge Function error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  console.log('[api/extract-pdf] Edge Function result:', data)
  return NextResponse.json(data)
}
