import { createClient } from '@/lib/supabase/server'

export default async function AdminRegistrationsPage() {
  const supabase = await createClient()
  const { data: registrations } = await supabase
    .from('event_registrations')
    .select('*, events(title, event_date), households(name, household_number)')
    .order('created_at', { ascending: false })

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="text-left p-3 font-semibold text-gray-700">イベント</th>
              <th className="text-left p-3 font-semibold text-gray-700">世帯</th>
              <th className="text-left p-3 font-semibold text-gray-700">人数</th>
              <th className="text-left p-3 font-semibold text-gray-700">申込日</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {(registrations || []).map(r => (
              <tr key={r.id} className="hover:bg-gray-50">
                <td className="p-3">
                  <p className="font-medium text-gray-800">{r.events?.title}</p>
                  <p className="text-xs text-gray-400">{r.events?.event_date ? new Date(r.events.event_date).toLocaleDateString('ja-JP') : ''}</p>
                </td>
                <td className="p-3">
                  <p className="font-medium">{r.households?.name}</p>
                  <p className="text-xs text-gray-400">#{r.households?.household_number}</p>
                </td>
                <td className="p-3 text-center">{r.attendee_count}名</td>
                <td className="p-3 text-gray-400 text-xs">{new Date(r.created_at).toLocaleDateString('ja-JP')}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {(!registrations || registrations.length === 0) && (
          <div className="text-center py-8 text-gray-400">申込はありません</div>
        )}
      </div>
    </div>
  )
}
