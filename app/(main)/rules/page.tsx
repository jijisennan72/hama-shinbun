import { createClient } from '@/lib/supabase/server'
import { ScrollText, ExternalLink } from 'lucide-react'

const COLOR_STYLES = {
  blue:   { border: 'border-l-blue-400',   bg: 'bg-blue-50',   badge: 'bg-blue-100 text-blue-700'   },
  orange: { border: 'border-l-orange-400', bg: 'bg-orange-50', badge: 'bg-orange-100 text-orange-700' },
  purple: { border: 'border-l-purple-400', bg: 'bg-purple-50', badge: 'bg-purple-100 text-purple-700' },
}

export default async function RulesPage() {
  const supabase = await createClient()
  const { data: items } = await supabase
    .from('local_contents')
    .select('id, title, body, pdf_url, color, order_index')
    .eq('category', 'rules')
    .order('order_index', { ascending: true })

  const contents = items ?? []

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-1">
        <ScrollText className="w-5 h-5 text-rose-500" />
        <h1 className="text-lg font-bold text-gray-800">浜区会会則</h1>
      </div>

      {contents.length === 0 ? (
        <div className="card text-center py-10">
          <ScrollText className="w-8 h-8 text-gray-300 mx-auto mb-3" />
          <p className="text-sm text-gray-400">ただ今準備中です</p>
        </div>
      ) : (
        <div className="space-y-3">
          {contents.map(item => {
            const style = COLOR_STYLES[item.color as keyof typeof COLOR_STYLES] ?? COLOR_STYLES.blue
            return (
              <div key={item.id} className={`card border-l-4 ${style.border} ${style.bg}`}>
                <p className="font-semibold text-gray-800 mb-1">{item.title}</p>
                {item.body && (
                  <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">{item.body}</p>
                )}
                {item.pdf_url && (
                  <a
                    href={item.pdf_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 mt-3 text-xs bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 px-3 py-1.5 rounded-lg transition-colors"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />PDFを確認する
                  </a>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
