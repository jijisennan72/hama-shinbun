import { createClient } from '@/lib/supabase/server'
import AdminPdfManager from '@/components/admin/AdminPdfManager'

export default async function AdminPdfPage() {
  const supabase = await createClient()
  const { data: pdfs } = await supabase
    .from('pdf_documents')
    .select('*')
    .order('published_at', { ascending: false })

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-gray-900">PDF管理</h1>
      <AdminPdfManager initialPdfs={pdfs || []} />
    </div>
  )
}
