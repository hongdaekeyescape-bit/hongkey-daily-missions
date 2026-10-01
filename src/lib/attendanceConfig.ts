/** 출퇴근 인증 대상. 2026-10-01 전 직원 활성화(ATTENDANCE_ALL=true). false로 되돌리면 ATTENDANCE_STAFF만. */
export const ATTENDANCE_ALL = true
export const ATTENDANCE_STAFF = new Set<string>(['신재민'])

export function canAttend(name: string): boolean {
  return ATTENDANCE_ALL || ATTENDANCE_STAFF.has(name)
}
