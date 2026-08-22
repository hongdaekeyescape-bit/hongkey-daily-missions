'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function AdminLogin() {
  const router = useRouter()
  const [pin, setPin] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ pin }),
      })
      const data = await res.json()
      if (data.ok) {
        router.refresh()
      } else {
        setError(data.error ?? 'PIN이 올바르지 않아요.')
        setBusy(false)
      }
    } catch {
      setError('로그인에 실패했어요.')
      setBusy(false)
    }
  }

  return (
    <main className="flex flex-col items-center gap-5 pt-24">
      <div className="text-5xl">🔐</div>
      <h1 className="text-xl font-extrabold">관리자 로그인</h1>
      <form onSubmit={submit} className="flex w-full flex-col gap-3">
        <input
          value={pin}
          onChange={(e) => setPin(e.target.value)}
          type="password"
          inputMode="numeric"
          placeholder="PIN"
          autoFocus
          className="w-full rounded-2xl border-2 border-mint-200 bg-white px-4 py-3 text-center text-lg tracking-widest outline-none focus:border-mint-500"
        />
        {error && <p className="text-center text-sm text-pink-600">{error}</p>}
        <button
          type="submit"
          disabled={busy || !pin}
          className="rounded-full bg-mint-500 py-4 text-lg font-extrabold text-white shadow-lg disabled:opacity-40"
        >
          {busy ? '확인 중…' : '입장'}
        </button>
      </form>
      <a href="/" className="text-xs text-ink-soft underline">
        ← 근무자 화면으로
      </a>
    </main>
  )
}
