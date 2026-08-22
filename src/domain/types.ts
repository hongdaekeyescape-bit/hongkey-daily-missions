export type Role = 'open' | 'middle' | 'close'

export type Scope = Role | 'open_middle' | 'middle_close' | 'all'

export type Category =
  | 'vacuum'
  | 'mop'
  | 'toilet'
  | 'theme'
  | 'recycle'
  | 'outside'
  | 'maintenance'
  | 'etc'

export type SourceType = 'template' | 'assignment'

export interface TaskTemplate {
  id: string
  scope: Scope
  weekday: number // 1(월)~7(일)
  title: string
  description?: string
  category: Category
  is_periodic: boolean
  guide?: string // 업무 가이드(어떻게 하는지)
  example_photo_url?: string // 사진 예시(이렇게 찍어주세요)
  sort: number
  active: boolean
}

export interface Assignment {
  id: string
  date: string // YYYY-MM-DD
  role: Role
  title: string
  note?: string
  active: boolean
}

export interface Completion {
  date: string
  source_type: SourceType
  source_id: string
  done_by: string
  photo_url: string
  done_at: string
}

export interface Mission {
  source_type: SourceType
  source_id: string
  title: string
  description?: string
  category: Category
  is_periodic: boolean
  is_collab: boolean
  is_assignment: boolean
  guide?: string
  example_photo_url?: string
  has_guide: boolean
  done: boolean
  done_by?: string
  photo_url?: string
  done_at?: string
}

export interface MissionBoard {
  items: Mission[]
  doneCount: number
  totalCount: number
}

export const ROLE_LABELS: Record<Role, string> = {
  open: '오픈',
  middle: '미들',
  close: '마감',
}

export const CATEGORY_LABELS: Record<Category, string> = {
  vacuum: '청소기',
  mop: '물걸레/요소수',
  toilet: '화장실/변기',
  theme: '테마청소',
  recycle: '분리수거',
  outside: '매장 밖',
  maintenance: '유지보수',
  etc: '기타',
}
