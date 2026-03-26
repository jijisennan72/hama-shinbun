'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp, ExternalLink } from 'lucide-react'

interface Item {
  id: string
  title: string
  body: string | null
  pdf_url: string | null
  color: string
  parent_id: string | null
  order_index: number
}

const COLOR_STYLES = {
  blue:   { border: 'border-l-blue-400',   bg: 'bg-blue-50/60'   },
  orange: { border: 'border-l-orange-400', bg: 'bg-orange-50/60' },
  purple: { border: 'border-l-purple-400', bg: 'bg-purple-50/60' },
}

function getStyle(color: string) {
  return COLOR_STYLES[color as keyof typeof COLOR_STYLES] ?? COLOR_STYLES.blue
}

export default function LocalContentAccordion({
  parents,
  childrenMap,
}: {
  parents: Item[]
  childrenMap: Record<string, Item[]>
}) {
  const [openId, setOpenId] = useState<string | null>(parents[0]?.id ?? null)

  return (
    <div className="space-y-2">
      {parents.map(parent => {
        const children = childrenMap[parent.id] ?? []
        const isOpen = openId === parent.id
        const style = getStyle(parent.color)

        return (
          <div key={parent.id} className="rounded-xl shadow-sm border border-gray-100 overflow-hidden bg-white">
            <button
              onClick={() => setOpenId(isOpen ? null : parent.id)}
              className={`w-full flex items-center justify-between px-4 py-3 text-left transition-colors ${isOpen ? 'bg-gray-50' : 'bg-white hover:bg-gray-100'}`}
            >
              <span className="font-semibold text-sm text-gray-800">{parent.title}</span>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <span className="text-xs text-gray-500">{children.length}件</span>
                {isOpen
                  ? <ChevronUp className="w-4 h-4 text-gray-500" />
                  : <ChevronDown className="w-4 h-4 text-gray-500" />}
              </div>
            </button>

            {isOpen && (
              <div className="border-t border-gray-100">
                {children.length === 0 ? (
                  <p className="px-4 py-4 text-xs text-gray-400">コンテンツはまだありません</p>
                ) : (
                  <div className="divide-y divide-gray-50">
                    {children.map(child => {
                      const cs = getStyle(child.color)
                      return (
                        <div key={child.id} className={`px-4 py-3 border-l-4 ${cs.border} ${cs.bg}`}>
                          <p className="font-medium text-sm text-gray-800">{child.title}</p>
                          {child.body && (
                            <p className="text-xs text-gray-600 mt-1 leading-relaxed whitespace-pre-wrap">{child.body}</p>
                          )}
                          {child.pdf_url && (
                            <a
                              href={child.pdf_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 mt-2 text-xs bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 px-3 py-1.5 rounded-lg transition-colors"
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
            )}
          </div>
        )
      })}
    </div>
  )
}
