import type {
  Assignment,
  Completion,
  Mission,
  MissionBoard,
  Role,
  TaskTemplate,
} from './types'
import { isCollabScope, isDueOn, scopesForRole } from './shift'

const CATEGORY_ORDER = [
  'vacuum',
  'mop',
  'toilet',
  'theme',
  'recycle',
  'outside',
  'maintenance',
  'etc',
]

function completionKey(type: string, id: string): string {
  return `${type}:${id}`
}

/**
 * 특정 날짜/요일/근무형태에 대한 오늘의 미션 보드를 계산한다.
 * - 근무형태 스코프에 해당하는 활성 템플릿 + 그 날짜/근무형태의 활성 약속업무
 * - 완료는 (date, source_type, source_id) 기준으로 매핑 → 근무조 공유
 * - 정렬: 미완료 먼저 → 카테고리 → sort
 */
export function buildMissions(input: {
  date: string
  weekday: number
  weekOfMonth: number
  role: Role
  templates: TaskTemplate[]
  assignments: Assignment[]
  completions: Completion[]
}): MissionBoard {
  const { date, weekday, weekOfMonth, role, templates, assignments, completions } = input
  const scopes = new Set(scopesForRole(role))

  const doneMap = new Map<string, Completion>()
  for (const c of completions) {
    if (c.date === date) doneMap.set(completionKey(c.source_type, c.source_id), c)
  }

  const items: Mission[] = []

  for (const t of templates) {
    if (!t.active) continue
    if (!scopes.has(t.scope)) continue
    if (t.weekday !== weekday) continue
    if (!isDueOn(t.frequency, weekOfMonth)) continue // 주기 규칙(짝수주/월첫주)
    const c = doneMap.get(completionKey('template', t.id))
    const guidePhotos =
      t.guide_photos && t.guide_photos.length
        ? t.guide_photos
        : t.example_photo_url
          ? [t.example_photo_url]
          : []
    items.push({
      source_type: 'template',
      source_id: t.id,
      title: t.title,
      description: t.description,
      category: t.category,
      is_periodic: t.is_periodic,
      is_collab: isCollabScope(t.scope),
      is_assignment: false,
      frequency: t.frequency,
      guide: t.guide,
      guide_photos: guidePhotos,
      has_guide: !!(t.guide || guidePhotos.length),
      done: !!c,
      done_by: c?.done_by,
      photo_url: c?.photo_url,
      photos: c?.photos && c.photos.length ? c.photos : c?.photo_url ? [c.photo_url] : [],
      done_at: c?.done_at,
    })
  }

  for (const a of assignments) {
    if (!a.active) continue
    if (a.date !== date) continue
    if (a.role !== role) continue
    const c = doneMap.get(completionKey('assignment', a.id))
    items.push({
      source_type: 'assignment',
      source_id: a.id,
      title: a.title,
      description: a.note,
      category: 'etc',
      is_periodic: false,
      is_collab: false,
      is_assignment: true,
      frequency: 'always',
      has_guide: false,
      done: !!c,
      done_by: c?.done_by,
      photo_url: c?.photo_url,
      photos: c?.photos && c.photos.length ? c.photos : c?.photo_url ? [c.photo_url] : [],
      done_at: c?.done_at,
    })
  }

  items.sort((a, b) => {
    if (a.done !== b.done) return a.done ? 1 : -1
    const ca = CATEGORY_ORDER.indexOf(a.category)
    const cb = CATEGORY_ORDER.indexOf(b.category)
    if (ca !== cb) return ca - cb
    return a.title.localeCompare(b.title, 'ko')
  })

  const doneCount = items.filter((i) => i.done).length
  return { items, doneCount, totalCount: items.length }
}
