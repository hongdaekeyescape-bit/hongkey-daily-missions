import type { Assignment, Completion, Role, TaskTemplate } from './types'
import { isDueOn } from './shift'
import { buildMissions } from './missions'
import { weekdaySeoul, weekOfMonth } from '@/lib/time'

/** 그날 존재하는 업무 수(모든 근무형태 합, 협업은 1개). 주기 규칙 반영. */
export function dueTaskCount(
  date: string,
  templates: TaskTemplate[],
  assignments: Assignment[]
): number {
  const wd = weekdaySeoul(date)
  const wom = weekOfMonth(date)
  const t = templates.filter((x) => x.active && x.weekday === wd && isDueOn(x.frequency, wom)).length
  const a = assignments.filter((x) => x.active && x.date === date).length
  return t + a
}

export interface RankEntry {
  name: string
  points: number
  tasks: number
  rank: number
}

/**
 * 홍키 클린 스페셜리스트 순위.
 * 그날 1점을 그날 업무 수로 나눠(업무당 1/N), 완료(사진 올림)한 사람에게 가산. 전체 누적.
 */
export function computeRanking(
  completions: Completion[],
  templates: TaskTemplate[],
  assignments: Assignment[]
): RankEntry[] {
  const nCache = new Map<string, number>()
  const N = (date: string) => {
    if (!nCache.has(date)) nCache.set(date, dueTaskCount(date, templates, assignments))
    return nCache.get(date)!
  }

  const acc = new Map<string, { points: number; tasks: number }>()
  for (const c of completions) {
    const n = N(c.date)
    if (n <= 0) continue
    const e = acc.get(c.done_by) ?? { points: 0, tasks: 0 }
    e.points += 1 / n
    e.tasks += 1
    acc.set(c.done_by, e)
  }

  const arr: RankEntry[] = [...acc.entries()].map(([name, v]) => ({
    name,
    points: Math.round(v.points * 100) / 100,
    tasks: v.tasks,
    rank: 0,
  }))
  arr.sort(
    (a, b) => b.points - a.points || b.tasks - a.tasks || a.name.localeCompare(b.name, 'ko')
  )
  let rank = 0
  let prev = Number.POSITIVE_INFINITY
  arr.forEach((e, i) => {
    if (e.points < prev) {
      rank = i + 1
      prev = e.points
    }
    e.rank = rank
  })
  return arr
}

/**
 * 미이행 판정: 그날 그 근무형태 미션이 다 안 끝났으면(총>0, 완료<총),
 * 그날 그 근무형태로 출근한 사람은 그날 미이행.
 * 반환: name -> 미이행한 날짜 Set
 */
export function computeMisses(input: {
  attendanceIns: { name: string; date: string; role: Role | null }[]
  templates: TaskTemplate[]
  assignments: Assignment[]
  completions: Completion[]
}): Map<string, Set<string>> {
  const { attendanceIns, templates, assignments, completions } = input
  const shiftMissed = new Map<string, boolean>()
  const missed = (date: string, role: Role) => {
    const k = `${date}|${role}`
    if (!shiftMissed.has(k)) {
      const board = buildMissions({
        date,
        weekday: weekdaySeoul(date),
        weekOfMonth: weekOfMonth(date),
        role,
        templates,
        assignments,
        completions,
      })
      shiftMissed.set(k, board.totalCount > 0 && board.doneCount < board.totalCount)
    }
    return shiftMissed.get(k)!
  }

  const out = new Map<string, Set<string>>()
  for (const a of attendanceIns) {
    if (!a.role) continue
    if (missed(a.date, a.role)) {
      if (!out.has(a.name)) out.set(a.name, new Set())
      out.get(a.name)!.add(a.date)
    }
  }
  return out
}
