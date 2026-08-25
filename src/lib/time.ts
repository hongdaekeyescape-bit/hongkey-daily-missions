/** Asia/Seoul 기준 날짜/시각 유틸. 모두 결정적으로 테스트할 수 있게 now 주입 가능. */

const SEOUL = 'Asia/Seoul'

/** YYYY-MM-DD (Asia/Seoul) */
export function todaySeoul(now: Date = new Date()): string {
  // en-CA locale는 YYYY-MM-DD 포맷을 준다.
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: SEOUL,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now)
}

/** 0~23시 (Asia/Seoul) */
export function nowHourSeoul(now: Date = new Date()): number {
  const h = new Intl.DateTimeFormat('en-GB', {
    timeZone: SEOUL,
    hour: '2-digit',
    hour12: false,
  }).format(now)
  return parseInt(h, 10) % 24
}

/** 월 내 주차: 1일~7일=1주, 8~14=2주, … (요일 등장 순서 기준). 입력 YYYY-MM-DD. */
export function weekOfMonth(date: string): number {
  const day = Number(date.split('-')[2])
  return Math.ceil(day / 7)
}

/** 요일: 월=1 … 일=7. 입력은 YYYY-MM-DD. */
export function weekdaySeoul(date: string): number {
  const [y, m, d] = date.split('-').map(Number)
  // 정오 UTC로 잡아 타임존 경계 흔들림 방지 (날짜 문자열은 이미 Seoul 기준)
  const dow = new Date(Date.UTC(y, m - 1, d, 12)).getUTCDay() // 0=일..6=토
  return dow === 0 ? 7 : dow
}
