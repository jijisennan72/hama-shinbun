import { createClient } from '@/lib/supabase/server'
import PdfList from '@/components/PdfList'

export default async function PdfPage() {
  const supabase = await createClient()

  const [{ data: pdfs }, { data: events }, { data: circulations }] = await Promise.all([
    supabase
      .from('pdf_documents')
      .select('*')
      .order('published_at', { ascending: false }),
    supabase
      .from('events')
      .select('id, title, event_date, attachment_url')
      .not('attachment_url', 'is', null)
      .eq('is_active', true)
      .order('event_date', { ascending: false }),
    supabase
      .from('circulation_items')
      .select('id, title, created_at, file_url')
      .not('file_url', 'is', null)
      .order('created_at', { ascending: false }),
  ])

  return (
    <div className="space-y-4">
<PdfList
        pdfs={pdfs || []}
        events={events || []}
        circulations={circulations || []}
      />
    </div>
  )
}
