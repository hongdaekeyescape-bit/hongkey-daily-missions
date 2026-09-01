import { describe, it, expect } from 'vitest'
import { summarizeAttendance, type AttendanceRecord } from './attendance'

const R = (name: string, date: string, type: 'in' | 'out', at: string): AttendanceRecord => ({
  name,
  date,
  type,
  at,
})

describe('summarizeAttendance', () => {
  it('직원별 근무일수와 근무시간(출근~퇴근)을 집계한다', () => {
    const rows = [
      R('신재민', '2026-09-01', 'in', '2026-09-01T00:05:00Z'), // 09:05 KST
      R('신재민', '2026-09-01', 'out', '2026-09-01T09:05:00Z'), // 18:05 KST → 9시간
      R('신재민', '2026-09-02', 'in', '2026-09-02T01:00:00Z'),
      R('신재민', '2026-09-02', 'out', '2026-09-02T09:30:00Z'), // 8.5시간
    ]
    const [s] = summarizeAttendance(rows)
    expect(s.name).toBe('신재민')
    expect(s.days).toBe(2)
    expect(s.totalHours).toBe(17.5)
    expect(s.sessions[0].hours).toBe(9)
    expect(s.sessions[1].hours).toBe(8.5)
  })

  it('퇴근 없는 날은 근무일에 포함하되 시간은 계산 안 함', () => {
    const rows = [R('a', '2026-09-01', 'in', '2026-09-01T00:00:00Z')]
    const [s] = summarizeAttendance(rows)
    expect(s.days).toBe(1)
    expect(s.totalHours).toBe(0)
    expect(s.sessions[0].hours).toBeUndefined()
  })

  it('같은 날 여러 번이면 가장 이른 출근·가장 늦은 퇴근을 쓴다', () => {
    const rows = [
      R('a', '2026-09-01', 'in', '2026-09-01T02:00:00Z'),
      R('a', '2026-09-01', 'in', '2026-09-01T01:00:00Z'),
      R('a', '2026-09-01', 'out', '2026-09-01T08:00:00Z'),
      R('a', '2026-09-01', 'out', '2026-09-01T10:00:00Z'),
    ]
    const [s] = summarizeAttendance(rows)
    expect(s.sessions[0].in).toBe('2026-09-01T01:00:00Z')
    expect(s.sessions[0].out).toBe('2026-09-01T10:00:00Z')
    expect(s.sessions[0].hours).toBe(9)
  })

  it('여러 직원을 이름순으로 반환', () => {
    const rows = [
      R('나', '2026-09-01', 'in', '2026-09-01T00:00:00Z'),
      R('가', '2026-09-01', 'in', '2026-09-01T00:00:00Z'),
    ]
    expect(summarizeAttendance(rows).map((s) => s.name)).toEqual(['가', '나'])
  })
})
