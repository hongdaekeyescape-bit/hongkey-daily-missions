'use client'

import { useCallback, useEffect, useState } from 'react'
import { ROLE_LABELS, type Assignment, type Role } from '@/domain/types'
import { todaySeoul } from '@/lib/time'
import {
  addAssignment,
  deleteAssignment,
  listAssignmentsByDate,
} from '@/data/assignments'

const ROLES: Role[] = ['open', 'middle', 'close']

export default function AssignmentsPage() {
  const [date, setDate] = useState(todaySeoul())
  const [role, setRole] = useState<Role>('open')
  const [title, setTitle] = useState('')
  const [note, setNote] = useState('')
  const [rows, setRows] = useState<Assignment[]>([])
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const load = useCallback(async (d: string) => {
    try {
      setRows(await listAssignmentsByDate(d))
    } catch (e) {
      setError((e as Error).message)
    }
  }, [])

  useEffect(() => {
    load(date)
  }, [date, load])

  async function add() {
    if (!title.trim()) return
    setBusy(true)
    setError(null)
    try {
      await addAssignment({ date, role, title: title.trim(), note: note.trim() || undefined })
      setTitle('')
      setNote('')
      await load(date)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  async function remove(id: string) {
    if (!confirm('삭제할까요?')) return
    await deleteAssignment(id)
    await load(date)
  }

  return (
    <div className="flex flex-col gap-4">
      <section className="rounded-2xl bg-white p-4 shadow-sm">
        <h2 className="mb-3 font-extrabold">약속업무 추가</h2>
        <div className="flex flex-col gap-2">
          <div className="grid grid-cols-2 gap-2">
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="rounded-xl border-2 border-mint-200 px-3 py-2 text-sm"
            />
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as Role)}
              className="rounded-xl border-2 border-mint-200 px-3 py-2 text-sm"
            >
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {ROLE_LABELS[r]}
                </option>
              ))}
            </select>
          </div>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="업무 제목 (예: 택배 수령)"
            className="rounded-xl border-2 border-mint-200 px-3 py-2 text-sm"
          />
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="메모(선택)"
            className="rounded-xl border-2 border-mint-200 px-3 py-2 text-sm"
          />
          {error && <p className="text-sm text-pink-600">{error}</p>}
          <button
            onClick={add}
            disabled={busy || !title.trim()}
            className="rounded-full bg-pink-500 py-3 font-bold text-white disabled:opacity-40"
          >
            추가
          </button>
        </div>
      </section>

      <section className="rounded-2xl bg-white/70 p-4 shadow-sm">
        <h3 className="mb-2 text-sm font-extrabold text-ink-soft">{date} 약속업무</h3>
        {rows.length === 0 ? (
          <p className="text-sm text-ink-soft">없음</p>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {rows.map((a) => (
              <li key={a.id} className="flex items-center gap-2 text-sm">
                <span className="rounded-full bg-pink-100 px-2 py-0.5 text-xs font-bold text-pink-600">
                  {ROLE_LABELS[a.role]}
                </span>
                <span className="font-semibold">{a.title}</span>
                {a.note && <span className="text-xs text-ink-soft">· {a.note}</span>}
                <button
                  onClick={() => remove(a.id)}
                  className="ml-auto text-xs text-pink-600 underline"
                >
                  삭제
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
