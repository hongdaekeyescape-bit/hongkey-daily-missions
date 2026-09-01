'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { guessRole } from '@/domain/shift'
import { todaySeoul, nowHourSeoul, hhmmSeoul } from '@/lib/time'
import { canAttend } from '@/lib/attendanceConfig'
import { listActiveStaff, type Staff } from '@/data/staff'
import {
  getAttendanceForDate,
  recordAttendance,
  deleteAttendance,
  type AttendanceType,
} from '@/data/attendance'

type Att = Record<string, { in?: string; out?: string }>

export default function CheckinPage() {
  const router = useRouter()
  const date = todaySeoul()
  const [staff, setStaff] = useState<Staff[]>([])
  const [att, setAtt] = useState<Att>({})
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    try {
      const [s, rows] = await Promise.all([listActiveStaff(), getAttendanceForDate(date)])
      const map: Att = {}
      for (const r of rows) {
        if (!map[r.name]) map[r.name] = {}
        map[r.name][r.type] = r.at
      }
      setStaff(s.filter((x) => canAttend(x.name)))
      setAtt(map)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }, [date])

  useEffect(() => {
    load()
  }, [load])

  async function mark(name: string, type: AttendanceType) {
    setBusy(`${name}:${type}`)
    setError(null)
    try {
      const r = await recordAttendance(name, date, type, guessRole(nowHourSeoul()))
      setAtt((prev) => ({ ...prev, [name]: { ...prev[name], [type]: r.at } }))
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(null)
    }
  }

  async function cancel(name: string, type: AttendanceType) {
    if (!confirm(`${name} ${type === 'in' ? '출근' : '퇴근'} 인증을 취소할까요?`)) return
    setBusy(`${name}:${type}`)
    try {
      await deleteAttendance(name, date, type)
      setAtt((prev) => {
        const next = { ...prev[name] }
        delete next[type]
        return { ...prev, [name]: next }
      })
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(null)
    }
  }

  function cell(name: string, type: AttendanceType, label: string) {
    const at = att[name]?.[type]
    const key = `${name}:${type}`
    if (at) {
      return (
        <button
          onClick={() => cancel(name, type)}
          disabled={busy === key}
          className="flex flex-col items-center rounded-xl bg-mint-50 px-3 py-2 text-mint-700"
        >
          <span className="text-sm font-bold">✅ {hhmmSeoul(at)}</span>
          <span className="text-[10px] text-pink-600 underline">취소</span>
        </button>
      )
    }
    return (
      <button
        onClick={() => mark(name, type)}
        disabled={busy === key}
        className="rounded-xl bg-mint-500 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-40"
      >
        {busy === key ? '…' : `${label}`}
      </button>
    )
  }

  return (
    <main className="flex flex-col gap-4">
      <header className="flex items-center justify-between pt-2">
        <button onClick={() => router.push('/v2')} className="text-sm text-ink-soft">
          ← 처음
        </button>
        <div className="text-center">
          <div className="font-display text-lg">🖐 출퇴근 인증</div>
          <div className="text-xs text-ink-soft">{date} · 공용 (이름 눌러 인증)</div>
        </div>
        <span className="w-10" />
      </header>

      {error && <p className="rounded-2xl bg-pink-50 p-3 text-center text-sm text-pink-600">{error}</p>}
      {loading ? (
        <p className="py-10 text-center text-sm text-ink-soft">불러오는 중…</p>
      ) : staff.length === 0 ? (
        <p className="py-10 text-center text-sm text-ink-soft">
          출퇴근 대상 직원이 없어요. (테스트 대상만 표시)
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {staff.map((s) => (
            <li
              key={s.id}
              className="flex items-center gap-2 rounded-2xl bg-white p-3 shadow-sm"
            >
              <span className="flex-1 font-bold">{s.name}</span>
              {cell(s.name, 'in', '출근')}
              {cell(s.name, 'out', '퇴근')}
            </li>
          ))}
        </ul>
      )}

      <p className="text-center text-[11px] text-ink-soft">
        여러 명이 한 폰에서 각자 이름 눌러 인증하세요. 실수로 눌렀으면 ✅ 아래 &apos;취소&apos;.
      </p>
    </main>
  )
}
