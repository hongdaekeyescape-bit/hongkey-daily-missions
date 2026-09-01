export interface AttendanceRecord {
  name: string
  date: string // YYYY-MM-DD (Asia/Seoul, 탭 시각 기준)
  type: 'in' | 'out'
  at: string // ISO timestamp
}

export interface DaySession {
  date: string
  in?: string // ISO
  out?: string // ISO
  hours?: number // 소수 1자리
}

export interface StaffAttendance {
  name: string
  days: number // 출근한 날 수
  totalHours: number // 근무시간 합(소수 1자리)
  sessions: DaySession[] // 날짜 오름차순
}

function diffHours(inIso: string, outIso: string): number {
  const h = (new Date(outIso).getTime() - new Date(inIso).getTime()) / 3_600_000
  return Math.round(h * 10) / 10
}

/**
 * 출퇴근 기록을 직원별·날짜별로 집계.
 * 같은 날짜(Asia/Seoul)의 출근(가장 이른 in)~퇴근(가장 늦은 out)으로 근무시간 계산.
 */
export function summarizeAttendance(rows: AttendanceRecord[]): StaffAttendance[] {
  const byName = new Map<string, Map<string, DaySession>>()

  for (const r of rows) {
    if (!byName.has(r.name)) byName.set(r.name, new Map())
    const days = byName.get(r.name)!
    if (!days.has(r.date)) days.set(r.date, { date: r.date })
    const s = days.get(r.date)!
    if (r.type === 'in') {
      if (!s.in || r.at < s.in) s.in = r.at
    } else {
      if (!s.out || r.at > s.out) s.out = r.at
    }
  }

  const result: StaffAttendance[] = []
  for (const [name, daysMap] of byName) {
    const sessions = [...daysMap.values()].sort((a, b) => a.date.localeCompare(b.date))
    let totalHours = 0
    let days = 0
    for (const s of sessions) {
      if (s.in) days += 1
      if (s.in && s.out) {
        s.hours = diffHours(s.in, s.out)
        totalHours += s.hours
      }
    }
    result.push({ name, days, totalHours: Math.round(totalHours * 10) / 10, sessions })
  }
  return result.sort((a, b) => a.name.localeCompare(b.name, 'ko'))
}
