import type { Metadata, Viewport } from 'next'
import './globals.css'
import ServiceWorkerRegistration from '@/components/ServiceWorkerRegistration'

export const metadata: Metadata = {
  title: '浜区公式アプリ | 地域のお知らせ',
  description: '浜地区の広報・回覧板・イベント情報をお届けします',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: '浜区公式アプリ',
  },
}

export const viewport: Viewport = {
  themeColor: '#1e3a8a',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <head>
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
        {/* 文字サイズ設定をページ描画前に適用（FOUC防止） */}
        <script dangerouslySetInnerHTML={{ __html: `
          try {
            var s = localStorage.getItem('hama-font-size');
            if (s === 'large') document.documentElement.classList.add('font-large');
            else if (s === 'xlarge') document.documentElement.classList.add('font-xlarge');
          } catch(e) {}
        ` }} />
      </head>
      <body className="bg-gray-50 min-h-screen">
        <ServiceWorkerRegistration />
        {children}
      </body>
    </html>
  )
}
