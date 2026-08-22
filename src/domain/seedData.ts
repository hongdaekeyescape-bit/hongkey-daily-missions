import type { Category, Scope } from './types'

export interface SeedTemplate {
  scope: Scope
  weekday: number
  title: string
  category: Category
  is_periodic: boolean
  description?: string
  guide?: string
  sort: number
}

// 제목별 공통 업무 가이드(예시). 관리자 화면에서 편집·사진예시 추가 가능.
const GUIDES: Record<string, string> = {
  '홀 청소기': '1. 콘센트에 청소기 연결\n2. 홀 전체 바닥을 구석까지 밀기\n3. 소파/테마 입구 앞 먼지 집중\n4. 청소기 먼지통 비우고 제자리',
  '매장 밖 청소': '1. 계단 천장·모서리 거미줄 밀대로 제거\n2. 반계단 위 사물함 윗면 먼지 닦기\n3. 현관 핑크문·유리 마른걸레로 마감',
  '분리수거': '1. 종이/플라스틱/캔/일반 분리\n2. 라벨·이물질 제거 후 압축\n3. 분리수거장에 배출하고 자리 정리',
  '물걸레': '1. 미온수+세제로 물걸레 준비\n2. 홀·복도 바닥 결 따라 닦기\n3. 걸레 헹궈 널어두기',
}

const OUTSIDE_DESC =
  '계단 거미줄 청소 / 반계단 위 사물함 위 청소 / 매장 입구 현관 핑크문 먼지청소'

// 엑셀 "홍키 업무분담표" 전사. weekday: 1(월)~7(일)
// (scope, weekday, title, category, periodic?, desc?)
type Row = [Scope, number, string, Category, boolean?, string?]

const ROWS: Row[] = [
  // 오픈
  ['open', 1, '유지보수', 'maintenance'],
  ['open', 1, '홀 청소기', 'vacuum'],
  ['open', 1, '변기세정제', 'toilet', true],
  ['open', 2, '유지보수', 'maintenance'],
  ['open', 3, '유지보수', 'maintenance'],
  ['open', 3, '홀 청소기', 'vacuum'],
  ['open', 3, '변기세정제', 'toilet', true],
  ['open', 4, '유지보수', 'maintenance'],
  ['open', 5, '유지보수', 'maintenance'],
  ['open', 5, '홀 청소기', 'vacuum'],
  ['open', 5, '변기세정제', 'toilet', true],
  ['open', 6, '3 테마 청소기', 'vacuum'],
  ['open', 7, '3 테마 청소 (먼지)', 'theme'],

  // 미들
  ['middle', 1, '3 테마 청소기', 'vacuum'],
  ['middle', 2, '화장실 청소', 'toilet'],
  ['middle', 3, '3 테마청소 (먼지)', 'theme'],
  ['middle', 4, '에어컨 필터 청소', 'maintenance'],
  ['middle', 4, '공기청정기 청소', 'maintenance'],
  ['middle', 5, '제빙기 청소', 'maintenance'],
  ['middle', 5, '초파리 퇴치기 + 끈끈이 교체', 'maintenance', true],
  ['middle', 6, '매장 전체 먼지', 'vacuum'],
  ['middle', 6, '홀 청소기', 'vacuum'],
  ['middle', 7, '매장 밖 청소', 'outside', false, OUTSIDE_DESC],
  ['middle', 7, '홀 청소기', 'vacuum'],

  // 마감
  ['close', 1, '물걸레', 'mop'],
  ['close', 1, '요소수', 'mop'],
  ['close', 2, '분리수거', 'recycle'],
  ['close', 2, '매장 밖 청소', 'outside', false, OUTSIDE_DESC],
  ['close', 3, '구두방 제습제 비우기', 'maintenance'],
  ['close', 3, '요소수', 'mop'],
  ['close', 4, '인화지 포토존 조명 배터리 교체', 'maintenance'],
  ['close', 4, '분리수거', 'recycle'],
  ['close', 4, '달1번 고백 세탁 물 확인', 'maintenance', true],
  ['close', 5, '매장 밖 청소', 'outside', false, OUTSIDE_DESC],
  ['close', 5, '물걸레', 'mop'],
  ['close', 6, '분리수거', 'recycle'],
  ['close', 6, '상황실 청소 및 정리정돈', 'maintenance'],
  ['close', 7, '구두방 제습제 비우기', 'maintenance'],
  ['close', 7, '배너 조이기', 'maintenance', true],

  // 협업
  ['middle_close', 3, '은나노', 'theme', true],
  ['all', 1, '테마청소 (전부 합쳐서 무조건 끝내기)', 'theme', true],
]

// 같은 (scope,weekday) 안에서 등장 순서대로 sort 부여
export const SEED_TEMPLATES: SeedTemplate[] = (() => {
  const counter = new Map<string, number>()
  return ROWS.map(([scope, weekday, title, category, periodic, description]) => {
    const key = `${scope}:${weekday}`
    const sort = counter.get(key) ?? 0
    counter.set(key, sort + 1)
    return {
      scope,
      weekday,
      title,
      category,
      is_periodic: !!periodic,
      description,
      guide: GUIDES[title],
      sort,
    }
  })
})()
