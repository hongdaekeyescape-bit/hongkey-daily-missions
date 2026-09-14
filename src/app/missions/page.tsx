'use client'

import { useEffect } from 'react'

export default function MissionsRedirect() {
  useEffect(() => {
    window.location.replace('/v2')
  }, [])
  return <p className="py-24 text-center text-sm text-ink-soft">이동 중…</p>
}
