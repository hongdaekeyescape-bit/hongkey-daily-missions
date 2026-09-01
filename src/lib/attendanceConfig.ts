/** 출퇴근 인증 대상. 테스트 중엔 특정 직원만, 전직원 전환은 ATTENDANCE_ALL=true. */
export const ATTENDANCE_ALL = false
export const ATTENDANCE_STAFF = new Set<string>(['신재민'])

export function canAttend(name: string): boolean {
  return ATTENDANCE_ALL || ATTENDANCE_STAFF.has(name)
}
