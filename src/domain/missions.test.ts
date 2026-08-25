import { describe, it, expect } from 'vitest'
import { buildMissions } from './missions'
import type { Assignment, Completion, TaskTemplate } from './types'

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

const templates: TaskTemplate[] = [
  T({ id: 'm1', scope: 'middle', title: '화장실 청소', category: 'toilet' }),
  T({ id: 'mc', scope: 'middle_close', title: '은나노', is_periodic: true, category: 'theme' }),
  T({ id: 'all', scope: 'all', title: '테마청소', category: 'theme' }),
  T({ id: 'o1', scope: 'open', title: '변기세정제', category: 'toilet' }),
  T({ id: 'off', scope: 'middle', title: '다른요일', weekday: 1 }),
  T({ id: 'inact', scope: 'middle', title: '비활성', active: false }),
]

const base = { date: '2026-08-19', weekday: 3, weekOfMonth: 3, role: 'middle' as const }

describe('buildMissions', () => {
  it('근무형태 스코프 + 요일로 필터하고 협업/약속 배지를 매긴다', () => {
    const board = buildMissions({ ...base, templates, assignments: [], completions: [] })
    const ids = board.items.map((i) => i.source_id)
    expect(ids).toContain('m1')
    expect(ids).toContain('mc')
    expect(ids).toContain('all')
    expect(ids).not.toContain('o1')
    expect(ids).not.toContain('off')
    expect(ids).not.toContain('inact')
    expect(board.items.find((i) => i.source_id === 'all')!.is_collab).toBe(true)
    expect(board.items.find((i) => i.source_id === 'mc')!.is_collab).toBe(true)
    expect(board.items.find((i) => i.source_id === 'm1')!.is_collab).toBe(false)
  })

  it('all 협업은 open/middle/close 모두에 노출된다', () => {
    for (const role of ['open', 'middle', 'close'] as const) {
      const board = buildMissions({ ...base, role, templates, assignments: [], completions: [] })
      expect(board.items.map((i) => i.source_id)).toContain('all')
    }
  })

  it('완료는 (date,type,id)로 매핑되고 근무조 공유된다', () => {
    const completions: Completion[] = [
      {
        date: '2026-08-19',
        source_type: 'template',
        source_id: 'm1',
        done_by: '홍길동',
        photo_url: 'https://p/1.jpg',
        done_at: 'x',
      },
    ]
    const board = buildMissions({ ...base, templates, assignments: [], completions })
    const m1 = board.items.find((i) => i.source_id === 'm1')!
    expect(m1.done).toBe(true)
    expect(m1.done_by).toBe('홍길동')
    expect(m1.photos).toEqual(['https://p/1.jpg'])
    expect(board.doneCount).toBe(1)
  })

  it('완료 사진 여러 장을 photos로 전달한다', () => {
    const completions: Completion[] = [
      {
        date: '2026-08-19',
        source_type: 'template',
        source_id: 'm1',
        done_by: 'a',
        photo_url: 'u1',
        photos: ['u1', 'u2', 'u3'],
        done_at: 'x',
      },
    ]
    const board = buildMissions({ ...base, templates, assignments: [], completions })
    expect(board.items.find((i) => i.source_id === 'm1')!.photos).toEqual(['u1', 'u2', 'u3'])
  })

  it('약속업무는 날짜+근무형태 일치만 포함', () => {
    const assignments: Assignment[] = [
      { id: 'a1', date: '2026-08-19', role: 'middle', title: '택배', active: true },
      { id: 'a2', date: '2026-08-19', role: 'open', title: '다른조', active: true },
      { id: 'a3', date: '2026-08-20', role: 'middle', title: '다른날', active: true },
    ]
    const board = buildMissions({ ...base, templates: [], assignments, completions: [] })
    expect(board.items.map((i) => i.source_id)).toEqual(['a1'])
    expect(board.items[0].is_assignment).toBe(true)
  })

  it('가이드/예시가 있으면 has_guide=true, guide_photos 전달', () => {
    const withGuide = [
      T({ id: 'g1', title: '가이드', guide: '1. 하기' }),
      T({ id: 'g2', title: '예시여러장', guide_photos: ['a', 'b'] }),
      T({ id: 'g3', title: '구예시1장', example_photo_url: 'https://x/e.jpg' }),
      T({ id: 'g4', title: '없음' }),
    ]
    const board = buildMissions({ ...base, templates: withGuide, assignments: [], completions: [] })
    const byId = (id: string) => board.items.find((i) => i.source_id === id)!
    expect(byId('g1').has_guide).toBe(true)
    expect(byId('g2').guide_photos).toEqual(['a', 'b'])
    expect(byId('g3').guide_photos).toEqual(['https://x/e.jpg']) // 하위호환
    expect(byId('g4').has_guide).toBe(false)
  })

  describe('주기 규칙(frequency)', () => {
    const freqT = [
      T({ id: 'always', title: '상시', frequency: 'always' }),
      T({ id: 'bi', title: '짝수주', frequency: 'biweekly' }),
      T({ id: 'first', title: '월첫주', frequency: 'monthly_first' }),
    ]
    const run = (weekOfMonth: number) =>
      buildMissions({ ...base, weekOfMonth, templates: freqT, assignments: [], completions: [] }).items.map(
        (i) => i.source_id
      )

    it('1주(첫주): 상시 + 월첫주만, 짝수주 제외', () => {
      const ids = run(1)
      expect(ids).toContain('always')
      expect(ids).toContain('first')
      expect(ids).not.toContain('bi')
    })
    it('2주(짝): 상시 + 짝수주만', () => {
      const ids = run(2)
      expect(ids).toContain('always')
      expect(ids).toContain('bi')
      expect(ids).not.toContain('first')
    })
    it('3주(홀): 상시만', () => {
      expect(run(3)).toEqual(['always'])
    })
    it('4주(짝): 상시 + 짝수주', () => {
      const ids = run(4)
      expect(ids).toContain('bi')
      expect(ids).not.toContain('first')
    })
  })

  it('미완료를 완료보다 위로 정렬하고 카운트가 정확', () => {
    const completions: Completion[] = [
      { date: '2026-08-19', source_type: 'template', source_id: 'm1', done_by: 'a', photo_url: 'u', done_at: 'x' },
    ]
    const board = buildMissions({ ...base, templates, assignments: [], completions })
    expect(board.items[board.items.length - 1].source_id).toBe('m1')
    expect(board.totalCount).toBe(3)
    expect(board.doneCount).toBe(1)
  })
})
