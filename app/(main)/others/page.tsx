import { createClient as createAdminClient } from '@supabase/supabase-js'
import { FolderOpen } from 'lucide-react'
import LocalContentAccordion from '@/components/LocalContentAccordion'

export default async function OthersPage() {
  const supabase = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: items } = await supabase
    .from('local_contents')
    .select('id, title, body, pdf_url, color, parent_id, order_index')
    .eq('category', 'others')
    .order('order_index', { ascending: true })

  const allItems = items ?? []

  // 3段階ツリーを構築
  const byParent: Record<string, typeof allItems> = {}
  for (const item of allItems) {
    const key = item.parent_id ?? '__root__'
    if (!byParent[key]) byParent[key] = []
    byParent[key].push(item)
  }

  const sections = byParent['__root__'] ?? []

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-1">
        <FolderOpen className="w-5 h-5 text-gray-500" />
        <h1 className="text-lg font-bold text-gray-800">その他</h1>
      </div>

      {sections.length === 0 ? (
        <div className="card text-center py-10">
          <FolderOpen className="w-8 h-8 text-gray-300 mx-auto mb-3" />
          <p className="text-sm text-gray-400">ただ今準備中です</p>
        </div>
      ) : (
        <LocalContentAccordion sections={sections} byParent={byParent} />
      )}
    </div>
  )
}
