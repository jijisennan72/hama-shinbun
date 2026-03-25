import { createAdminClient } from '@/lib/supabase/server'
import AdminPdfManager from '@/components/admin/AdminPdfManager'

export default async function AdminPdfPage() {
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('pdf_documents')
    .select('*')
  console.log('PDF fetch result:', { data, error })

  const pdfs = (data ?? []).map(({ id, title, published_at, file_url, year, month, extracted_text, extracted_at }) =>
    ({ id, title, published_at, file_url, year, month, extracted_text, extracted_at })
  )

  return (
    <div className="space-y-4">
      <AdminPdfManager initialPdfs={pdfs || []} />
    </div>
  )
}
