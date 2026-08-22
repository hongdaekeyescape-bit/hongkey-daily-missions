import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: '홍키 데일리 미션',
  description: '홍대키이스케이프 매장 오늘의 할일 미션',
  manifest: '/manifest.webmanifest',
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
      <body>
        <div className="mx-auto min-h-dvh w-full max-w-md px-4 pb-16 pt-6">
          {children}
        </div>
      </body>
    </html>
  )
}
