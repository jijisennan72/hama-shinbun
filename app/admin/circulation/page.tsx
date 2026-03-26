import { createClient } from '@/lib/supabase/server'
import AdminCirculationManager from '@/components/admin/AdminCirculationManager'

export default async function AdminCirculationPage() {
  const supabase = await createClient()

  const [{ data: items }, { data: households }] = await Promise.all([
    supabase
      .from('circulation_items')
      .select('id, title, content, file_url, extracted_text, created_at, circulation_reads(household_id, read_at, households(name, household_number))')
      .order('created_at', { ascending: false }),
    supabase
      .from('households')
      .select('id, name, household_number')
      .order('household_number', { ascending: true }),
  ])

  return (
    <div className="space-y-4">
      <AdminCirculationManager
        initialItems={(items || []) as any[]}
        households={households || []}
      />
    </div>
  )
}
