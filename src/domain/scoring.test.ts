import { describe, it, expect } from 'vitest'
import { computeRanking, computeMisses, dueTaskCount } from './scoring'
import type { Assignment, Completion, TaskTemplate } from './types'

// 2026-08-19 = 수요일(weekday 3), weekOfMonth 3
const T = (o: Partial<TaskTemplate>): TaskTemplate => ({
  id: 'x',
  scope: 'middle',
  weekday: 3,
  title: 't',
  category: 'etc',
  is_periodic: false,
  frequency: 'always',
  sort: 0,
  active: true,
  ...o,
})
const C = (done_by: string, id: string, date = '2026-08-19'): Completion => ({
  date,
  source_type: 'template',
  source_id: id,
  done_by,
  photo_url: 'u',
  done_at: 'x',
})

describe('dueTaskCount', () => {
  it('그날 due 템플릿 + 그날 약속 수', () => {
    const templates = [
      T({ id: 'a', scope: 'open' }),
      T({ id: 'b', scope: 'middle' }),
      T({ id: 'c', scope: 'middle', frequency: 'biweekly' }), // 3주=홀 → 제외
      T({ id: 'd', weekday: 1 }), // 다른 요일 → 제외
    ]
    const assignments: Assignment[] = [
      { id: 'z', date: '2026-08-19', role: 'open', title: 't', active: true },
    ]
    expect(dueTaskCount('2026-08-19', templates, assignments)).toBe(3) // a,b + z
  })
})

describe('computeRanking', () => {
  it('업무당 1/N 가산, 완수 많은 사람이 상위', () => {
    // 그날 N=4 (t1..t4 all always, weekday3)
    const templates = ['t1', 't2', 't3', 't4'].map((id) => T({ id }))
    const completions = [C('철수', 't1'), C('철수', 't2'), C('철수', 't3'), C('영희', 't4')]
    const rank = computeRanking(completions, templates, [])
    expect(rank[0].name).toBe('철수')
    expect(rank[0].points).toBe(0.75) // 3/4
    expect(rank[0].rank).toBe(1)
    expect(rank[1].name).toBe('영희')
    expect(rank[1].points).toBe(0.25)
    expect(rank[1].rank).toBe(2)
  })

  it('여러 날 누적', () => {
    const templates = [T({ id: 't1' }), T({ id: 't2' })] // N=2
    const completions = [C('철수', 't1', '2026-08-19'), C('철수', 't1', '2026-08-26')]
    const rank = computeRanking(completions, templates, [])
    expect(rank[0].points).toBe(1) // 0.5 + 0.5
    expect(rank[0].tasks).toBe(2)
  })
})

describe('computeMisses', () => {
  const templates = [T({ id: 't1', scope: 'middle' }), T({ id: 't2', scope: 'middle' })]
  it('근무조 미완료면 그날 그 근무형태 출근자 미이행', () => {
    const completions = [C('철수', 't1')] // t2 미완료 → 미들 미완료
    const misses = computeMisses({
      attendanceIns: [
        { name: '철수', date: '2026-08-19', role: 'middle' },
        { name: '영희', date: '2026-08-19', role: 'middle' },
        { name: '민수', date: '2026-08-19', role: 'open' }, // open은 미션 없음 → 미이행 아님
      ],
      templates,
      assignments: [],
      completions,
    })
    expect(misses.get('철수')?.has('2026-08-19')).toBe(true)
    expect(misses.get('영희')?.has('2026-08-19')).toBe(true)
    expect(misses.has('민수')).toBe(false)
  })

  it('다 완료면 미이행 없음', () => {
    const completions = [C('철수', 't1'), C('철수', 't2')]
    const misses = computeMisses({
      attendanceIns: [{ name: '철수', date: '2026-08-19', role: 'middle' }],
      templates,
      assignments: [],
      completions,
    })
    expect(misses.size).toBe(0)
  })
})
