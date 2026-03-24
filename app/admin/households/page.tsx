import { createClient } from '@/lib/supabase/server'
import AdminHouseholdManager from '@/components/admin/AdminHouseholdManager'

export default async function AdminHouseholdsPage() {
  const supabase = await createClient()
  const { data: households } = await supabase
    .from('households')
    .select('*')
    .order('household_number', { ascending: true })

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-gray-900">利用者管理</h1>
      <AdminHouseholdManager initialHouseholds={households || []} />
    </div>
  )
}
