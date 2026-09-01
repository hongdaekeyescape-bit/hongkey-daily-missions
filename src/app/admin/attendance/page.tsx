'use client'

import { useCallback, useEffect, useState } from 'react'
import { summarizeAttendance, type StaffAttendance } from '@/domain/attendance'
import { getAttendanceForMonth } from '@/data/attendance'
import { getBoolSetting, setBoolSetting } from '@/data/settings'
import { hhmmSeoul, todaySeoul } from '@/lib/time'

export default function AttendancePage() {
  const [month, setMonth] = useState(todaySeoul().slice(0, 7))
  const [rows, setRows] = useState<StaffAttendance[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [open, setOpen] = useState<string | null>(null)
  const [warnOn, setWarnOn] = useState<boolean | null>(null)

  useEffect(() => {
    getBoolSetting('warnings_enabled', true).then(setWarnOn)
  }, [])

  async function toggleWarn() {
    const next = !(warnOn ?? true)
    setWarnOn(next)
    try {
      await setBoolSetting('warnings_enabled', next)
    } catch {
      setWarnOn(!next)
    }
  }

  const load = useCallback(async (m: string) => {
    setRows(null)
    setError(null)
    try {
      const data = await getAttendanceForMonth(m)
      setRows(summarizeAttendance(data))
    } catch (e) {
      setError((e as Error).message)
    }
  }, [])

  useEffect(() => {
    load(month)
  }, [month, load])

  function downloadCsv() {
    if (!rows) return
    const lines: string[] = ['직원,날짜,출근,퇴근,근무시간']
    for (const s of rows) {
      for (const d of s.sessions) {
        lines.push(
          [
            s.name,
            d.date,
            d.in ? hhmmSeoul(d.in) : '',
            d.out ? hhmmSeoul(d.out) : '',
            d.hours != null ? d.hours : '',
          ].join(',')
        )
      }
      lines.push(`${s.name},합계,근무일 ${s.days}일,,${s.totalHours}`)
      lines.push('')
    }
    const csv = '﻿' + lines.join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `출퇴근_${month}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between rounded-2xl bg-white/80 p-3 shadow-sm">
        <div>
          <div className="text-sm font-bold">미이행 경고 기능</div>
          <div className="text-xs text-ink-soft">근무조 미완료 시 다음주 출근에 경고 팝업</div>
        </div>
        <button
          onClick={toggleWarn}
          className={
            'relative h-7 w-12 rounded-full transition ' +
            (warnOn ? 'bg-mint-500' : 'bg-gray-300')
          }
        >
          <span
            className={
              'absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-all ' +
              (warnOn ? 'left-[22px]' : 'left-0.5')
            }
          />
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <label className="text-sm font-bold text-ink-soft">월</label>
        <input
          type="month"
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          className="rounded-xl border-2 border-mint-200 bg-white px-3 py-2 text-sm"
        />
        <button
          onClick={downloadCsv}
          disabled={!rows || rows.length === 0}
          className="ml-auto rounded-full bg-mint-500 px-4 py-2 text-sm font-bold text-white disabled:opacity-40"
        >
          ⬇ CSV 내려받기
        </button>
      </div>

      {error && <p className="rounded-2xl bg-pink-50 p-4 text-sm text-pink-600">{error}</p>}
      {!rows && !error && <p className="py-8 text-center text-sm text-ink-soft">불러오는 중…</p>}
      {rows && rows.length === 0 && (
        <p className="py-8 text-center text-sm text-ink-soft">이 달 출퇴근 기록이 없어요.</p>
      )}

      {rows &&
        rows.map((s) => (
          <section key={s.name} className="rounded-2xl bg-white/80 p-4 shadow-sm">
            <button
              onClick={() => setOpen(open === s.name ? null : s.name)}
              className="flex w-full items-center justify-between"
            >
              <span className="font-extrabold">{s.name}</span>
              <span className="flex items-center gap-3 text-sm">
                <span className="text-ink-soft">근무 {s.days}일</span>
                <span className="font-display text-mint-600">{s.totalHours}시간</span>
                <span className="text-xs text-ink-soft">{open === s.name ? '▲' : '▼'}</span>
              </span>
            </button>
            {open === s.name && (
              <table className="mt-3 w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-ink-soft">
                    <th className="py-1">날짜</th>
                    <th>출근</th>
                    <th>퇴근</th>
                    <th className="text-right">시간</th>
                  </tr>
                </thead>
                <tbody>
                  {s.sessions.map((d) => (
                    <tr key={d.date} className="border-t border-gray-100">
                      <td className="py-1.5">{d.date.slice(5)}</td>
                      <td>{d.in ? hhmmSeoul(d.in) : '-'}</td>
                      <td>{d.out ? hhmmSeoul(d.out) : '-'}</td>
                      <td className="text-right font-semibold">{d.hours != null ? d.hours : '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        ))}

      <p className="text-center text-xs text-ink-soft">
        ※ 같은 날 출근~퇴근으로 계산. 자정 넘긴 마감은 퇴근이 다음날로 잡힐 수 있어 확인 필요.
      </p>
    </div>
  )
}
