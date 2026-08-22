import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: '홍키 데일리 미션',
  description: '홍대키이스케이프 매장 오늘의 할일 미션',
  manifest: '/manifest.webmanifest',
  icons: { icon: '/icon.svg', apple: '/icon.svg' },
  appleWebApp: { capable: true, title: '데일리미션', statusBarStyle: 'default' },
}

export const viewport: Viewport = {
  themeColor: '#2fd4b6',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ko">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Jua&family=Gowun+Dodum&display=swap"
        />
      </head>
      <body>
        <div className="mx-auto min-h-dvh w-full max-w-md px-4 pb-16 pt-6">
          {children}
        </div>
      </body>
    </html>
  )
}
