import { describe, it, expect } from 'vitest'
import { weekdaySeoul, todaySeoul, nowHourSeoul, weekOfMonth } from './time'

describe('weekOfMonth', () => {
  it('1~7일=1주, 8~14=2주, 15~21=3주, 22~28=4주', () => {
    expect(weekOfMonth('2026-08-01')).toBe(1)
    expect(weekOfMonth('2026-08-07')).toBe(1)
    expect(weekOfMonth('2026-08-08')).toBe(2)
    expect(weekOfMonth('2026-08-19')).toBe(3)
    expect(weekOfMonth('2026-08-25')).toBe(4)
  })
})

describe('weekdaySeoul', () => {
  it('월=1 … 일=7', () => {
    expect(weekdaySeoul('2026-08-17')).toBe(1) // 월
    expect(weekdaySeoul('2026-08-19')).toBe(3) // 수
    expect(weekdaySeoul('2026-08-22')).toBe(6) // 토
    expect(weekdaySeoul('2026-08-23')).toBe(7) // 일
  })
})

describe('todaySeoul / nowHourSeoul', () => {
  it('Asia/Seoul 기준으로 날짜·시각을 낸다 (UTC 20시 → 서울 다음날 05시)', () => {
    const d = new Date('2026-08-19T20:00:00Z')
    expect(todaySeoul(d)).toBe('2026-08-20')
    expect(nowHourSeoul(d)).toBe(5)
  })
})
