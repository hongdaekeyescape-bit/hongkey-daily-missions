import type { Role, Scope } from './types'

/** 현재 시각(0~23)으로 근무형태를 추정. 14시 이전=오픈, 14~18시=미들, 18시 이후=마감. */
export function guessRole(hour: number): Role {
  if (hour < 14) return 'open'
  if (hour < 18) return 'middle'
  return 'close'
}

/** 근무형태가 담당하는 템플릿 스코프 목록(협업 포함). */
export function scopesForRole(role: Role): Scope[] {
  const base: Record<Role, Scope[]> = {
    open: ['open', 'open_middle', 'all'],
    middle: ['middle', 'open_middle', 'middle_close', 'all'],
    close: ['close', 'middle_close', 'all'],
  }
  return base[role]
}

/** 협업(여러 근무형태 공유) 스코프인지. */
export function isCollabScope(scope: Scope): boolean {
  return scope === 'open_middle' || scope === 'middle_close' || scope === 'all'
}
