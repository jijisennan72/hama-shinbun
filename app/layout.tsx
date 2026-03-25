import type { Metadata, Viewport } from 'next'
import './globals.css'
import ServiceWorkerRegistration from '@/components/ServiceWorkerRegistration'

export const metadata: Metadata = {
  title: 'はまアプリ | 地域のお知らせ',
  description: '浜地区の広報・回覧板・イベント情報をお届けします',
  manifest: '/manifest.json',
  icons: {
    icon: [
      { url: '/favicon.ico' },
      { url: '/favicon.png', type: 'image/png' },
    ],
    apple: '/favicon.png',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'はまアプリ',
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
        <link rel="apple-touch-icon" href="/favicon.png" />
        {/* 文字サイズ設定をページ描画前に適用（FOUC防止） */}
        <script dangerouslySetInnerHTML={{ __html: `
          try {
            var s = localStorage.getItem('hama-font-size');
            if (s === 'large') document.documentElement.classList.add('font-large');
            else if (s === 'xlarge') document.documentElement.classList.add('font-xlarge');
          } catch(e) {}
          try {
            var dm = localStorage.getItem('hama-dark-mode');
            if (dm === 'dark') {
              document.documentElement.classList.add('dark');
            } else if (dm === 'light') {
              document.documentElement.classList.remove('dark');
            } else {
              if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
                document.documentElement.classList.add('dark');
              }
            }
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
