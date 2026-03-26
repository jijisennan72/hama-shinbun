import { createClient } from '@/lib/supabase/server'
import { FolderOpen } from 'lucide-react'
import LocalContentAccordion from '@/components/LocalContentAccordion'

export default async function OthersPage() {
  const supabase = await createClient()
  const { data: items } = await supabase
    .from('local_contents')
    .select('id, title, body, pdf_url, color, parent_id, order_index')
    .eq('category', 'others')
    .order('order_index', { ascending: true })

  const allItems = items ?? []
  const parents = allItems.filter(i => !i.parent_id)
  const childrenMap: Record<string, typeof allItems> = {}
  for (const child of allItems.filter(i => i.parent_id)) {
    const pid = child.parent_id!
    if (!childrenMap[pid]) childrenMap[pid] = []
    childrenMap[pid].push(child)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-1">
        <FolderOpen className="w-5 h-5 text-gray-500" />
        <h1 className="text-lg font-bold text-gray-800">その他</h1>
      </div>

      {parents.length === 0 ? (
        <div className="card text-center py-10">
          <FolderOpen className="w-8 h-8 text-gray-300 mx-auto mb-3" />
          <p className="text-sm text-gray-400">ただ今準備中です</p>
        </div>
      ) : (
        <LocalContentAccordion parents={parents} childrenMap={childrenMap} />
      )}
    </div>
  )
}
