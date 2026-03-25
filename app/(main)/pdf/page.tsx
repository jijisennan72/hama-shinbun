import { createClient } from '@/lib/supabase/server'
import PdfList from '@/components/PdfList'

export default async function PdfPage() {
  const supabase = await createClient()

  const { data: pdfs } = await supabase
    .from('pdf_documents')
    .select('*')
    .order('published_at', { ascending: false })

  return (
    <div className="space-y-4">
      <PdfList pdfs={pdfs || []} />
    </div>
  )
}
