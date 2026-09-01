'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'

const KEY = 'dm_device_ok'

export default function DeviceGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [state, setState] = useState<'checking' | 'ok' | 'locked'>('checking')
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  // 관리자 경로는 기기 제한 없음(자체 PIN 보호)
  const isAdmin = pathname?.startsWith('/admin')

  useEffect(() => {
    if (isAdmin) {
      setState('ok')
      return
    }
    let saved = false
    try {
      saved = localStorage.getItem(KEY) === '1'
    } catch {}
    if (saved) {
      setState('ok')
      return
    }
    // 게이트 활성 여부 확인
    fetch('/api/device')
      .then((r) => r.json())
      .then((d) => setState(d.enabled ? 'locked' : 'ok'))
      .catch(() => setState('ok'))
  }, [isAdmin])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const r = await fetch('/api/device', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ code }),
      })
      const d = await r.json()
      if (d.ok) {
        try {
          localStorage.setItem(KEY, '1')
        } catch {}
        setState('ok')
      } else {
        setError(d.error ?? '코드가 올바르지 않아요.')
        setBusy(false)
      }
    } catch {
      setError('확인에 실패했어요.')
      setBusy(false)
    }
  }

  if (state === 'checking') {
    return <p className="py-24 text-center text-sm text-ink-soft">확인 중…</p>
  }
  if (state === 'locked') {
    return (
      <main className="flex flex-col items-center gap-5 pt-24">
        <div className="text-5xl">🏪📱</div>
        <h1 className="font-display text-xl">매장 기기 등록</h1>
        <p className="text-center text-sm text-ink-soft">
          이 앱은 매장 폰에서만 사용해요.
          <br />
          관리자에게 받은 등록 코드를 한 번만 입력하면 이 폰이 등록됩니다.
        </p>
        <form onSubmit={submit} className="flex w-full flex-col gap-3">
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            type="password"
            placeholder="등록 코드"
            autoFocus
            className="w-full rounded-2xl border-2 border-mint-200 bg-white px-4 py-3 text-center text-lg outline-none focus:border-mint-500"
          />
          {error && <p className="text-center text-sm text-pink-600">{error}</p>}
          <button
            type="submit"
            disabled={busy || !code}
            className="rounded-full bg-mint-500 py-4 text-lg font-extrabold text-white shadow-lg disabled:opacity-40"
          >
            {busy ? '확인 중…' : '이 폰 등록'}
          </button>
        </form>
      </main>
    )
  }
  return <>{children}</>
}
