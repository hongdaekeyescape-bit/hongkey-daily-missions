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

export type Frequency = 'always' | 'biweekly' | 'monthly_first'

export interface TaskTemplate {
  id: string
  scope: Scope
  weekday: number // 1(월)~7(일)
  title: string
  description?: string
  category: Category
  is_periodic: boolean
  frequency: Frequency // always=상시, biweekly=짝수주, monthly_first=월 첫주
  guide?: string // 업무 가이드(어떻게 하는지)
  example_photo_url?: string // (구) 예시 사진 1장 — 하위호환
  guide_photos?: string[] // 사진 예시 여러 장
  guide_captions?: string[] // 예시 사진 캡션(인덱스 정렬)
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
  photo_url: string // 첫 사진(하위호환)
  photos?: string[] // 완료 사진 여러 장
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
  frequency: Frequency
  guide?: string
  guide_photos?: string[]
  guide_captions?: string[]
  has_guide: boolean
  done: boolean
  done_by?: string
  photo_url?: string
  photos?: string[]
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
