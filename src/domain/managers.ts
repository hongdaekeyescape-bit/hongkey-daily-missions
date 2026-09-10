/**
 * 관리자 예외 명단. 이 사람들은 업무 진행 여부와 관계없이
 * 그날 근무하면 업무를 완료한 것으로 처리한다.
 * - 미이행(경고) 판정에서 제외
 * - 클린 순위에서 제외(청소 경쟁 대상 아님)
 * - 본인 미션 화면은 자동 완료로 표시
 */
export const MANAGER_EXEMPT = new Set<string>(['옥정호'])

export function isExemptManager(name: string): boolean {
  return MANAGER_EXEMPT.has(name)
}
