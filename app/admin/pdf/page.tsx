import { createAdminClient } from '@/lib/supabase/server'
import AdminPdfManager from '@/components/admin/AdminPdfManager'

export const dynamic = 'force-dynamic'

export default async function AdminPdfPage() {
  const supabase = createAdminClient()

  const { data: pdfs, error } = await supabase
    .from('pdf_documents')
    .select('id, title, published_at, file_url, year, month, extracted_text, extracted_at')
    .order('published_at', { ascending: false })

  if (error) {
    console.error('[AdminPdfPage] fetch error:', error)
  }

  return (
    <div className="space-y-4">
      <AdminPdfManager initialPdfs={pdfs || []} />
    </div>
  )
}
