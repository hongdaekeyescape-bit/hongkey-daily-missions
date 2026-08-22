'use client'

import { useRouter } from 'next/navigation'

export default function AdminLogout() {
  const router = useRouter()
  async function logout() {
    await fetch('/api/admin/login', { method: 'DELETE' })
    router.refresh()
  }
  return (
    <button onClick={logout} className="text-sm font-semibold text-ink-soft underline">
      로그아웃
    </button>
  )
}
