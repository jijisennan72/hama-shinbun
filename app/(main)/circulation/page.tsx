import { createClient } from '@/lib/supabase/server'
import CirculationList from '@/components/CirculationList'

export default async function CirculationPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: household } = await supabase
    .from('households')
    .select('id')
    .eq('user_id', user!.id)
    .single()

  const { data: items } = await supabase
    .from('circulation_items')
    .select('*, circulation_reads(household_id)')
    .order('created_at', { ascending: false })

  const itemsWithRead = (items || []).map(item => ({
    ...item,
    is_read: item.circulation_reads?.some((r: { household_id: string }) => r.household_id === household?.id) ?? false,
  }))

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-gray-900 mt-2">回覧板</h1>
      <CirculationList items={itemsWithRead} householdId={household?.id} />
    </div>
  )
}
