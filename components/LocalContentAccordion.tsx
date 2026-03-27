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
  blue:   { border: 'border-l-blue-400',   bg: 'bg-gray-800' },
  orange: { border: 'border-l-orange-400', bg: 'bg-gray-800' },
  purple: { border: 'border-l-purple-400', bg: 'bg-gray-800' },
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

function ContentCard({ item, onImageClick }: { item: Item; onImageClick: (src: string, alt: string) => void }) {
  const cs = getStyle(item.color)
  const hasImage = item.pdf_url && isImageUrl(item.pdf_url)
  const hasPdf = item.pdf_url && !hasImage

  return (
    <div className={`px-4 py-3 border-l-4 ${cs.border} ${cs.bg}`}>
      <p className="font-medium text-sm text-gray-100">{item.title}</p>
      {item.body && (
        <p className="text-xs text-gray-300 mt-1 leading-relaxed whitespace-pre-wrap">{item.body}</p>
      )}
      {hasPdf && (
        <a
          href={item.pdf_url!}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 mt-2 text-xs bg-gray-700 border border-gray-600 text-gray-200 hover:bg-gray-600 px-3 py-1.5 rounded-lg transition-colors"
        >
          <ExternalLink className="w-3.5 h-3.5" />PDFを見る
        </a>
      )}
      {hasImage && (
        <button onClick={() => onImageClick(item.pdf_url!, item.title)} className="mt-2 block">
          <img
            src={item.pdf_url!}
            alt={item.title}
            className="max-h-48 w-auto rounded-lg border border-gray-600 object-contain hover:opacity-90 transition-opacity"
          />
          <span className="text-xs text-gray-400 mt-1 block">タップで拡大</span>
        </button>
      )}
    </div>
  )
}

// グループ（セクションの子）コンポーネント
function GroupAccordion({
  group,
  contents,
  onImageClick,
}: {
  group: Item
  contents: Item[]
  onImageClick: (src: string, alt: string) => void
}) {
  const [open, setOpen] = useState(false)
  const style = getStyle(group.color)

  return (
    <div className={`border-l-4 ${style.border}`}>
      {/* グループヘッダー */}
      <button
        onClick={() => setOpen(prev => !prev)}
        className={`w-full flex items-center justify-between px-4 py-2.5 text-left transition-colors ${open ? 'bg-gray-700' : 'bg-white hover:bg-gray-50'}`}
      >
        <div className="flex-1 min-w-0">
          <p className={`font-semibold text-sm ${open ? 'text-gray-100' : 'text-gray-800'}`}>{group.title}</p>
          {group.body && !open && (
            <p className="text-xs text-gray-400 truncate mt-0.5">{group.body}</p>
          )}
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0 ml-2">
          <span className={`text-xs ${open ? 'text-gray-400' : 'text-gray-400'}`}>{contents.length}件</span>
          {open
            ? <ChevronUp className="w-3.5 h-3.5 text-gray-400" />
            : <ChevronDown className="w-3.5 h-3.5 text-gray-400" />}
        </div>
      </button>

      {/* グループ本文（展開時） */}
      {open && (
        <div className={`${style.bg}`}>
          {group.body && (
            <p className="px-4 pt-2 pb-1 text-xs text-gray-300 leading-relaxed whitespace-pre-wrap">{group.body}</p>
          )}
          {group.pdf_url && (() => {
            const hasImage = isImageUrl(group.pdf_url!)
            return hasImage ? (
              <button onClick={() => onImageClick(group.pdf_url!, group.title)} className="px-4 pb-2 block">
                <img src={group.pdf_url!} alt={group.title} className="max-h-32 w-auto rounded border border-gray-600 object-contain" />
              </button>
            ) : (
              <a href={group.pdf_url!} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 mx-4 mb-2 text-xs bg-gray-700 border border-gray-600 text-gray-200 hover:bg-gray-600 px-3 py-1.5 rounded-lg transition-colors">
                <ExternalLink className="w-3.5 h-3.5" />PDFを見る
              </a>
            )
          })()}

          {/* 内容カード（孫） */}
          {contents.length > 0 && (
            <div className="divide-y divide-gray-700 border-t border-gray-700">
              {contents.map(content => (
                <ContentCard key={content.id} item={content} onImageClick={onImageClick} />
              ))}
            </div>
          )}

          {contents.length === 0 && !group.body && !group.pdf_url && (
            <p className="px-4 py-3 text-xs text-gray-400">コンテンツはまだありません</p>
          )}
        </div>
      )}
    </div>
  )
}

export default function LocalContentAccordion({
  sections,
  byParent,
}: {
  sections: Item[]
  byParent: Record<string, Item[]>
}) {
  const [openSectionId, setOpenSectionId] = useState<string | null>(sections[0]?.id ?? null)
  const [modalImage, setModalImage] = useState<{ src: string; alt: string } | null>(null)

  return (
    <>
      <div className="space-y-2">
        {sections.map(section => {
          const isOpen = openSectionId === section.id
          const groups = byParent[section.id] ?? []

          return (
            <div key={section.id} className="rounded-xl shadow-sm border border-gray-100 overflow-hidden bg-white">
              {/* セクションヘッダー */}
              <button
                onClick={() => setOpenSectionId(isOpen ? null : section.id)}
                className={`w-full flex items-center justify-between px-4 py-3 text-left transition-colors ${isOpen ? 'bg-gray-50' : 'bg-white hover:bg-gray-100'}`}
              >
                <span className="font-semibold text-sm text-gray-800">{section.title}</span>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <span className="text-xs text-gray-500">{groups.length}件</span>
                  {isOpen
                    ? <ChevronUp className="w-4 h-4 text-gray-500" />
                    : <ChevronDown className="w-4 h-4 text-gray-500" />}
                </div>
              </button>

              {/* グループ一覧（展開時） */}
              {isOpen && (
                <div className="border-t border-gray-100 divide-y divide-gray-100">
                  {groups.length === 0 ? (
                    <p className="px-4 py-4 text-xs text-gray-400">コンテンツはまだありません</p>
                  ) : (
                    groups.map(group => (
                      <GroupAccordion
                        key={group.id}
                        group={group}
                        contents={byParent[group.id] ?? []}
                        onImageClick={(src, alt) => setModalImage({ src, alt })}
                      />
                    ))
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
