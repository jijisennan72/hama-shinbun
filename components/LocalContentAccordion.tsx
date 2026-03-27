'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp, ExternalLink, X } from 'lucide-react'

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

function isImageUrl(url: string) {
  return /\.(jpg|jpeg|png|gif|webp)(\?.*)?$/i.test(url)
}

function ImageModal({ src, alt, onClose }: { src: string; alt: string; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onClick={onClose}
    >
      <button
        onClick={onClose}
        className="absolute top-4 right-4 p-2 bg-white/20 hover:bg-white/30 rounded-full text-white transition-colors"
      >
        <X className="w-5 h-5" />
      </button>
      <img
        src={src}
        alt={alt}
        className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-xl"
        onClick={e => e.stopPropagation()}
      />
    </div>
  )
}

export default function LocalContentAccordion({
  parents,
  childrenMap,
}: {
  parents: Item[]
  childrenMap: Record<string, Item[]>
}) {
  const [openId, setOpenId] = useState<string | null>(parents[0]?.id ?? null)
  const [modalImage, setModalImage] = useState<{ src: string; alt: string } | null>(null)

  return (
    <>
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
                        const hasImage = child.pdf_url && isImageUrl(child.pdf_url)
                        const hasPdf = child.pdf_url && !hasImage
                        return (
                          <div key={child.id} className={`px-4 py-3 border-l-4 ${cs.border} ${cs.bg}`}>
                            <p className="font-medium text-sm text-gray-800">{child.title}</p>
                            {child.body && (
                              <p className="text-xs text-gray-600 mt-1 leading-relaxed whitespace-pre-wrap">{child.body}</p>
                            )}
                            {hasPdf && (
                              <a
                                href={child.pdf_url!}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 mt-2 text-xs bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 px-3 py-1.5 rounded-lg transition-colors"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />PDFを見る
                              </a>
                            )}
                            {hasImage && (
                              <button
                                onClick={() => setModalImage({ src: child.pdf_url!, alt: child.title })}
                                className="mt-2 block"
                              >
                                <img
                                  src={child.pdf_url!}
                                  alt={child.title}
                                  className="max-h-48 w-auto rounded-lg border border-gray-200 object-contain hover:opacity-90 transition-opacity"
                                />
                                <span className="text-xs text-gray-400 mt-1 block">タップで拡大</span>
                              </button>
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

      {modalImage && (
        <ImageModal
          src={modalImage.src}
          alt={modalImage.alt}
          onClose={() => setModalImage(null)}
        />
      )}
    </>
  )
}
