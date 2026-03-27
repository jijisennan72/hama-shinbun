'use client'

import { useSearchParams } from 'next/navigation'
import { Suspense, useEffect, useState } from 'react'
import { ChevronRight } from 'lucide-react'
import Link from 'next/link'

function PdfViewer() {
  const searchParams = useSearchParams()
  const url = searchParams.get('url') ?? ''
  const title = searchParams.get('title') ?? 'PDF'

  const [isMobile, setIsMobile] = useState<boolean | null>(null)

  useEffect(() => {
    const mobile =
      /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) ||
      window.innerWidth < 768
    setIsMobile(mobile)
  }, [])

  // モバイルはPDF URLに直接リダイレクト
  useEffect(() => {
    if (isMobile && url) {
      window.location.href = url
    }
  }, [isMobile, url])

  if (!url) {
    return (
      <div className="flex items-center justify-center h-screen text-gray-400 text-sm">
        URLが指定されていません
      </div>
    )
  }

  // モバイル判定前 or リダイレクト待ち
  if (isMobile !== false) {
    return (
      <div className="flex items-center justify-center h-screen text-gray-400 text-sm">
        読み込み中...
      </div>
    )
  }

  // PC: iframeで表示
  return (
    <div className="flex flex-col h-screen">
      {/* 固定ヘッダー（パンくずナビのみ） */}
      <header className="flex-shrink-0 bg-white border-b border-gray-200 px-3 py-2 z-10">
        <nav className="flex items-center gap-1 text-xs text-gray-500" aria-label="パンくずリスト">
          <Link href="/" className="text-blue-600 hover:underline whitespace-nowrap">ホーム</Link>
          <ChevronRight className="w-3 h-3 text-gray-400 flex-shrink-0" />
          <Link href="/pdf" className="text-blue-600 hover:underline whitespace-nowrap">倉庫</Link>
          <ChevronRight className="w-3 h-3 text-gray-400 flex-shrink-0" />
          <span className="truncate">{title}</span>
        </nav>
      </header>

      {/* PDF表示エリア */}
      <iframe
        src={url}
        className="flex-1 w-full border-0"
        title={title}
      />
    </div>
  )
}

export default function PdfViewPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-screen text-gray-400 text-sm">読み込み中...</div>}>
      <PdfViewer />
    </Suspense>
  )
}
