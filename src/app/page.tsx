'use client'

import { useEffect } from 'react'

// 주 리다이렉트는 next.config redirects(엣지). 이건 폴백.
export default function Home() {
  useEffect(() => {
    window.location.replace('/v2')
  }, [])
  return <p className="py-24 text-center text-sm text-ink-soft">이동 중…</p>
}
