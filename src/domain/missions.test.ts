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

describe('buildMissions', () => {
  it('근무형태 스코프 + 요일로 필터하고 협업/약속 배지를 매긴다', () => {
    const board = buildMissions({
      date: '2026-08-19',
      weekday: 3,
      role: 'middle',
      templates,
      assignments: [],
      completions: [],
    })
    const ids = board.items.map((i) => i.source_id)
    expect(ids).toContain('m1')
    expect(ids).toContain('mc')
    expect(ids).toContain('all')
    expect(ids).not.toContain('o1') // open 전용 제외
    expect(ids).not.toContain('off') // 다른 요일 제외
    expect(ids).not.toContain('inact') // 비활성 제외

    expect(board.items.find((i) => i.source_id === 'all')!.is_collab).toBe(true)
    expect(board.items.find((i) => i.source_id === 'mc')!.is_collab).toBe(true)
    expect(board.items.find((i) => i.source_id === 'm1')!.is_collab).toBe(false)
    expect(board.items.find((i) => i.source_id === 'mc')!.is_periodic).toBe(true)
  })

  it('all 협업은 open/middle/close 모두에 같은 id로 노출된다', () => {
    for (const role of ['open', 'middle', 'close'] as const) {
      const board = buildMissions({
        date: '2026-08-19',
        weekday: 3,
        role,
        templates,
        assignments: [],
        completions: [],
      })
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
        done_at: '2026-08-19T05:00:00Z',
      },
    ]
    const board = buildMissions({
      date: '2026-08-19',
      weekday: 3,
      role: 'middle',
      templates,
      assignments: [],
      completions,
    })
    const m1 = board.items.find((i) => i.source_id === 'm1')!
    expect(m1.done).toBe(true)
    expect(m1.done_by).toBe('홍길동')
    expect(m1.photo_url).toBe('https://p/1.jpg')
    expect(board.doneCount).toBe(1)
    expect(board.items.find((i) => i.source_id === 'all')!.done).toBe(false)
  })

  it('다른 날짜의 완료는 무시한다', () => {
    const completions: Completion[] = [
      { date: '2026-08-18', source_type: 'template', source_id: 'm1', done_by: 'a', photo_url: 'u', done_at: 'x' },
    ]
    const board = buildMissions({
      date: '2026-08-19',
      weekday: 3,
      role: 'middle',
      templates,
      assignments: [],
      completions,
    })
    expect(board.items.find((i) => i.source_id === 'm1')!.done).toBe(false)
    expect(board.doneCount).toBe(0)
  })

  it('약속업무는 날짜+근무형태 일치만 포함하고 is_assignment=true', () => {
    const assignments: Assignment[] = [
      { id: 'a1', date: '2026-08-19', role: 'middle', title: '택배 수령', active: true },
      { id: 'a2', date: '2026-08-19', role: 'open', title: '다른조', active: true },
      { id: 'a3', date: '2026-08-20', role: 'middle', title: '다른날', active: true },
    ]
    const board = buildMissions({
      date: '2026-08-19',
      weekday: 3,
      role: 'middle',
      templates: [],
      assignments,
      completions: [],
    })
    const ids = board.items.map((i) => i.source_id)
    expect(ids).toEqual(['a1'])
    expect(board.items[0].is_assignment).toBe(true)
  })

  it('미완료를 완료보다 위로 정렬하고 카운트가 정확하다', () => {
    const completions: Completion[] = [
      { date: '2026-08-19', source_type: 'template', source_id: 'm1', done_by: 'a', photo_url: 'u', done_at: 'x' },
    ]
    const board = buildMissions({
      date: '2026-08-19',
      weekday: 3,
      role: 'middle',
      templates,
      assignments: [],
      completions,
    })
    expect(board.items[board.items.length - 1].source_id).toBe('m1') // 완료는 맨 아래
    expect(board.totalCount).toBe(3)
    expect(board.doneCount).toBe(1)
  })
})
