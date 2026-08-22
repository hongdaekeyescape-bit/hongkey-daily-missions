'use client'

import { useEffect, useState } from 'react'
import { addStaff, listAllStaff, setStaffActive, type Staff } from '@/data/staff'

export default function StaffPage() {
  const [rows, setRows] = useState<Staff[]>([])
  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function load() {
    try {
      setRows(await listAllStaff())
    } catch (e) {
      setError((e as Error).message)
    }
  }
  useEffect(() => {
    load()
  }, [])

  async function add() {
    if (!name.trim()) return
    setBusy(true)
    setError(null)
    try {
      await addStaff(name.trim())
      setName('')
      await load()
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  async function toggle(s: Staff) {
    await setStaffActive(s.id, !s.active)
    await load()
  }

  return (
    <div className="flex flex-col gap-4">
      <section className="rounded-2xl bg-white p-4 shadow-sm">
        <h2 className="mb-3 font-extrabold">직원 추가</h2>
        <div className="flex gap-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && add()}
            placeholder="이름"
            className="flex-1 rounded-xl border-2 border-mint-200 px-3 py-2 text-sm"
          />
          <button
            onClick={add}
            disabled={busy || !name.trim()}
            className="rounded-full bg-mint-500 px-5 py-2 font-bold text-white disabled:opacity-40"
          >
            추가
          </button>
        </div>
        {error && <p className="mt-2 text-sm text-pink-600">{error}</p>}
      </section>

      <section className="rounded-2xl bg-white/70 p-4 shadow-sm">
        <h3 className="mb-2 text-sm font-extrabold text-ink-soft">직원 명단</h3>
        {rows.length === 0 ? (
          <p className="text-sm text-ink-soft">없음</p>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {rows.map((s) => (
              <li key={s.id} className="flex items-center gap-2 text-sm">
                <span className={s.active ? 'font-semibold' : 'text-ink-soft line-through'}>
                  {s.name}
                </span>
                <button
                  onClick={() => toggle(s)}
                  className={
                    'ml-auto rounded-full px-3 py-1 text-xs font-bold ' +
                    (s.active
                      ? 'bg-mint-100 text-mint-700'
                      : 'bg-gray-100 text-ink-soft')
                  }
                >
                  {s.active ? '활성' : '비활성'}
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
