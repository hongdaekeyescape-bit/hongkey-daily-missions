# 홍키 데일리 미션 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 매장 알바가 폰으로 접속 → 시각 자동추정 근무형태 + 이름 선택 → 오늘의 미션을 사진 촬영으로 완료하는 모바일 웹앱(PWA), 관리자는 PIN으로 고정업무·약속업무·완료현황 관리.

**Architecture:** Next.js(App Router) + Supabase. 순수 도메인 로직(`domain/`)은 프레임워크 비의존 · TDD. `data/`만 Supabase 의존. UI는 둘을 조합. 완료는 `(date, source_type, source_id)` 유일 → 근무조 공유.

**Tech Stack:** Next 16.3.0, React 19.2.8, TypeScript 5, Tailwind v4, @supabase/supabase-js, vitest, tsx.

## Global Constraints

- 프로젝트 경로: `tools/daily-missions`. 모든 경로는 이 디렉터리 기준(별도 표기 없으면).
- 시간대: Asia/Seoul 기준으로 "오늘"과 근무형태 추정.
- 근무형태 enum(코드): `open` · `middle` · `close`. 템플릿 스코프: `open` · `middle` · `close` · `open_middle` · `middle_close` · `all`.
- 시간 경계: hour<14→open, 14≤hour<18→middle, hour≥18→close.
- 카테고리 enum: `vacuum` `mop` `toilet` `theme` `recycle` `outside` `maintenance` `etc`.
- 관리자 PIN은 서버 환경변수 `ADMIN_PIN`, route handler에서만 검증. 클라이언트 노출 금지.
- 브랜드 컬러: 민트(주)/연핑크(보조). 폰 우선 1열 레이아웃.
- 커밋 메시지: 한국어 conventional, 각 태스크 끝에 커밋.

---

### Task 1: 프로젝트 스캐폴드

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.ts`, `vitest.config.ts`, `postcss.config.mjs`, `src/app/globals.css`, `src/app/layout.tsx`, `src/app/page.tsx`(placeholder), `.env.example`, `.gitignore`
- Create: `src/lib/time.ts`

**Interfaces:**
- Produces: `todaySeoul(): string`(YYYY-MM-DD), `weekdaySeoul(date: string): number`(1=월..7=일), `nowHourSeoul(): number`.

- [ ] **Step 1:** `package.json` — deps: next@16.3.0, react@19.2.8, react-dom@19.2.8, @supabase/supabase-js@^2.112.3. devDeps: typescript@^5, @types/node@^20, @types/react@^19, @types/react-dom@^19, tailwindcss@^4, @tailwindcss/postcss@^4, vitest@^4.1.10, tsx@^4. scripts: `dev`,`build`,`start`,`lint`,`test":"vitest run"`,`test:watch`,`seed":"tsx scripts/seed.ts"`.
- [ ] **Step 2:** tsconfig(경로 alias `@/*`→`src/*`), next.config.ts, postcss(`@tailwindcss/postcss`), globals.css(`@import "tailwindcss";` + 민트/연핑크 CSS 변수), layout.tsx(폰 뷰포트 meta, 한글 폰트), page.tsx placeholder.
- [ ] **Step 3:** `src/lib/time.ts` — Asia/Seoul 유틸. `Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Seoul'})`로 날짜, `weekday` 계산(월=1). 순수/결정적이도록 `now = new Date()` 주입 가능한 시그니처: `todaySeoul(now=new Date())`, `nowHourSeoul(now=new Date())`, `weekdaySeoul(date)`.
- [ ] **Step 4:** `vitest.config.ts`(environment node, alias `@`).
- [ ] **Step 5:** 설치·부팅 확인: `npm install` 후 `npm run build`가 통과(placeholder). 커밋: `chore(daily-missions): 프로젝트 스캐폴드`.

---

### Task 2: 도메인 타입 + 근무형태 로직 (TDD)

**Files:**
- Create: `src/domain/types.ts`, `src/domain/shift.ts`, `src/domain/shift.test.ts`

**Interfaces:**
- Produces:
  - `type Role = 'open'|'middle'|'close'`
  - `type Scope = Role|'open_middle'|'middle_close'|'all'`
  - `type Category = 'vacuum'|'mop'|'toilet'|'theme'|'recycle'|'outside'|'maintenance'|'etc'`
  - `guessRole(hour: number): Role`
  - `scopesForRole(role: Role): Scope[]`

- [ ] **Step 1: 실패 테스트** `shift.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { guessRole, scopesForRole } from './shift'
describe('guessRole', () => {
  it('13시→open, 14시→middle, 17시→middle, 18시→close, 22시→close', () => {
    expect(guessRole(13)).toBe('open')
    expect(guessRole(14)).toBe('middle')
    expect(guessRole(17)).toBe('middle')
    expect(guessRole(18)).toBe('close')
    expect(guessRole(22)).toBe('close')
  })
})
describe('scopesForRole', () => {
  it('open→[open,open_middle,all]', () => {
    expect(scopesForRole('open').sort()).toEqual(['all','open','open_middle'])
  })
  it('middle→[middle,open_middle,middle_close,all]', () => {
    expect(scopesForRole('middle').sort()).toEqual(['all','middle','middle_close','open_middle'])
  })
  it('close→[close,middle_close,all]', () => {
    expect(scopesForRole('close').sort()).toEqual(['all','close','middle_close'])
  })
})
```
- [ ] **Step 2:** `npx vitest run src/domain/shift.test.ts` → FAIL(미구현).
- [ ] **Step 3: 구현** `types.ts`(위 타입) + `shift.ts`:
```ts
import type { Role, Scope } from './types'
export function guessRole(hour: number): Role {
  if (hour < 14) return 'open'
  if (hour < 18) return 'middle'
  return 'close'
}
export function scopesForRole(role: Role): Scope[] {
  const base: Record<Role, Scope[]> = {
    open: ['open', 'open_middle', 'all'],
    middle: ['middle', 'open_middle', 'middle_close', 'all'],
    close: ['close', 'middle_close', 'all'],
  }
  return base[role]
}
```
- [ ] **Step 4:** 테스트 PASS 확인.
- [ ] **Step 5:** 커밋 `feat(daily-missions): 근무형태 추정·스코프 매핑 도메인`.

---

### Task 3: 오늘의 미션 계산 buildMissions (TDD)

**Files:**
- Create: `src/domain/missions.ts`, `src/domain/missions.test.ts`

**Interfaces:**
- Consumes: `Role, Scope, Category`(Task 2)
- Produces:
```ts
interface TaskTemplate { id: string; scope: Scope; weekday: number; title: string; description?: string; category: Category; is_periodic: boolean; sort: number; active: boolean }
interface Assignment { id: string; date: string; role: Role; title: string; note?: string; active: boolean }
interface Completion { date: string; source_type: 'template'|'assignment'; source_id: string; done_by: string; photo_url: string; done_at: string }
interface Mission { source_type: 'template'|'assignment'; source_id: string; title: string; description?: string; category: Category; is_periodic: boolean; is_collab: boolean; is_assignment: boolean; done: boolean; done_by?: string; photo_url?: string; done_at?: string }
interface MissionBoard { items: Mission[]; doneCount: number; totalCount: number }
function buildMissions(input: { date: string; weekday: number; role: Role; templates: TaskTemplate[]; assignments: Assignment[]; completions: Completion[] }): MissionBoard
```

- [ ] **Step 1: 실패 테스트** `missions.test.ts` — 케이스:
  1. role=middle, weekday=3(수): 자기 스코프 템플릿 + `middle_close`(은나노) + `all` 포함, `open`전용 제외.
  2. 협업 템플릿(scope=all)은 open/middle/close 모두에 노출(같은 source_id).
  3. 완료 매핑: completion `(date,'template',id)` 존재 시 done=true + done_by/photo_url 반영, 공유(같은 id면 role 무관 동일).
  4. 약속업무: `date`,`role` 일치만 포함, `is_assignment=true`.
  5. 정렬: 미완료 먼저 → category → sort. `doneCount/totalCount` 정확.
  6. 배지: `is_collab`=scope∈{open_middle,middle_close,all}, `is_periodic` 전달.
```ts
import { describe, it, expect } from 'vitest'
import { buildMissions } from './missions'
const T = (o: Partial<any>) => ({ id:'', scope:'middle', weekday:3, title:'t', category:'etc', is_periodic:false, sort:0, active:true, ...o })
it('협업/스코프/완료공유', () => {
  const templates = [
    T({ id:'m1', scope:'middle', title:'화장실', category:'toilet' }),
    T({ id:'mc', scope:'middle_close', title:'은나노', is_periodic:true, category:'theme' }),
    T({ id:'all', scope:'all', title:'테마청소', category:'theme' }),
    T({ id:'o1', scope:'open', title:'변기세정제' }),
  ]
  const completions = [{ date:'2026-08-19', source_type:'template' as const, source_id:'m1', done_by:'홍길동', photo_url:'u', done_at:'x' }]
  const board = buildMissions({ date:'2026-08-19', weekday:3, role:'middle', templates, assignments:[], completions })
  const ids = board.items.map(i=>i.source_id)
  expect(ids).toContain('all'); expect(ids).toContain('mc'); expect(ids).not.toContain('o1')
  expect(board.items.find(i=>i.source_id==='all')!.is_collab).toBe(true)
  expect(board.items.find(i=>i.source_id==='m1')!.done).toBe(true)
  expect(board.doneCount).toBe(1); expect(board.totalCount).toBe(3)
})
```
- [ ] **Step 2:** `npx vitest run src/domain/missions.test.ts` → FAIL.
- [ ] **Step 3: 구현** `missions.ts` — 필터(active·scope∈scopesForRole·weekday), 약속 필터(date·role), completion을 `${type}:${id}` 맵으로 매핑, is_collab/is_assignment 세팅, 정렬(done asc→category→sort), count 집계.
- [ ] **Step 4:** 테스트 PASS.
- [ ] **Step 5:** 커밋 `feat(daily-missions): 오늘의 미션 계산 도메인(협업 합집합·공유완료)`.

---

### Task 4: Supabase 스키마 + 엑셀 시드

**Files:**
- Create: `supabase/migrations/0001_init.sql`, `scripts/seed.ts`, `src/lib/supabase.ts`
- Modify: `.env.example`

**Interfaces:**
- Produces: 테이블 `staff, task_templates, assignments, completions`(스펙 §4), 버킷 `mission-photos`. `getBrowserClient()`, `getServiceClient()`.

- [ ] **Step 1:** `0001_init.sql` — 스펙 §4 4개 테이블, enum은 text+CHECK, `completions`에 `unique(date, source_type, source_id)`, 필요한 인덱스. Storage 버킷은 대시보드/SQL로 생성(주석 안내). RLS는 v1 비활성(내부용).
- [ ] **Step 2:** `src/lib/supabase.ts` — `@supabase/supabase-js` browser(anon) + service(role) 클라이언트. env: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.
- [ ] **Step 3:** `scripts/seed.ts` — 스펙 §8 전 항목을 `task_templates`에 upsert(scope/weekday/title/category/is_periodic/description/sort). "매장 밖 청소" description 포함. 실행 `npm run seed`(env 있을 때). idempotent(기존 삭제 후 삽입 또는 upsert key).
- [ ] **Step 4:** 시드 데이터 개수/필드 sanity를 `scripts/seed.ts`가 콘솔로 출력. (실 DB 없으면 dry 로그만.)
- [ ] **Step 5:** 커밋 `feat(daily-missions): Supabase 스키마·엑셀 시드`.

---

### Task 5: 데이터 레이어

**Files:**
- Create: `src/data/staff.ts`, `src/data/templates.ts`, `src/data/assignments.ts`, `src/data/completions.ts`, `src/data/photos.ts`

**Interfaces:**
- Produces(서버/클라 겸용, 도메인 타입 반환):
  - `listStaff(): Promise<{id,name}[]>`
  - `listActiveTemplates(): Promise<TaskTemplate[]>`, `upsertTemplate`, `deleteTemplate`
  - `listAssignments(date): Promise<Assignment[]>`, `addAssignment`, `deleteAssignment`
  - `listCompletions(date): Promise<Completion[]>`, `addCompletion({date,source_type,source_id,done_by,photo_url})`, `deleteCompletion(id)`
  - `uploadMissionPhoto(file, date, source_id): Promise<string>`(→ public url)

- [ ] **Step 1:** 각 파일에서 supabase 클라이언트로 CRUD 구현(도메인 타입 매핑). completions.add는 unique 충돌 시 friendly 에러.
- [ ] **Step 2:** `photos.ts` — Storage `mission-photos`에 `${date}/${source_id}-${Date.now()}.jpg` 업로드 후 public url.
- [ ] **Step 3:** 타입체크 `npx tsc --noEmit` 통과.
- [ ] **Step 4:** 커밋 `feat(daily-missions): Supabase 데이터 레이어`.

---

### Task 6: 근무자 시작 화면

**Files:**
- Create: `src/app/page.tsx`(시작), `src/app/actions.ts`(서버 액션 or route) 필요 시, `src/components/RoleChip.tsx`, `src/components/NamePicker.tsx`
- Create: `src/lib/session.ts`(선택한 이름/role을 sessionStorage 또는 URL로 전달)

**Interfaces:**
- Consumes: `guessRole`,`nowHourSeoul`,`listStaff`
- Produces: 미션 화면으로 `?role=&name=` 전달.

- [ ] **Step 1:** 시작 화면 — 상단 인사(캐주얼), 자동추정 role 칩(탭하면 open/middle/close 순환/선택 시트), 이름 목록(검색 인풋+버튼 그리드), "미션 시작" → `/missions?role=..&name=..`.
- [ ] **Step 2:** 민트/연핑크 톤, 큰 터치 타깃. 로딩·빈 명단 처리.
- [ ] **Step 3:** 라이브 확인(대표): 브라우저에서 시작 화면 렌더·role 자동값·이름 선택.
- [ ] **Step 4:** 커밋 `feat(daily-missions): 근무자 시작 화면(자동 근무형태+이름)`.

---

### Task 7: 미션 목록 + 사진 완료

**Files:**
- Create: `src/app/missions/page.tsx`, `src/components/MissionCard.tsx`, `src/components/ProgressBar.tsx`, `src/components/CompleteSheet.tsx`, `src/components/Celebrate.tsx`

**Interfaces:**
- Consumes: `buildMissions`,`listActiveTemplates`,`listAssignments`,`listCompletions`,`uploadMissionPhoto`,`addCompletion`,`deleteCompletion`,`todaySeoul`,`weekdaySeoul`
- Produces: 완료 시 completion 생성 → 재계산.

- [ ] **Step 1:** 서버에서 templates/assignments/completions 로드 → `buildMissions`로 보드 계산 → 클라이언트로 전달.
- [ ] **Step 2:** 진행 게이지(doneCount/totalCount), 미션 카드(카테고리 컬러 바·🔁/협업/약속 배지·완료 도장). 미완료 상단.
- [ ] **Step 3:** 카드 탭 → CompleteSheet: `<input type=file accept=image/* capture=environment>` 촬영 → 미리보기 → "완료" → uploadMissionPhoto → addCompletion(done_by=name) → 도장 애니메이션 → 목록 갱신.
- [ ] **Step 4:** 완료 카드에 완료자·시각. 완료 취소(재촬영) = deleteCompletion(당일). 전체완료 시 Celebrate.
- [ ] **Step 5:** 라이브 확인(대표): 미션 목록 → 사진 완료 1건 → 게이지 증가·공유 반영.
- [ ] **Step 6:** 커밋 `feat(daily-missions): 미션 목록·사진 완료·근무조 공유`.

---

### Task 8: 관리자 PIN 게이트

**Files:**
- Create: `src/app/admin/page.tsx`(PIN 입력), `src/app/api/admin/login/route.ts`, `src/lib/adminAuth.ts`, `src/middleware.ts`(또는 레이아웃 가드)

**Interfaces:**
- Produces: `ADMIN_PIN` 검증 후 서명 쿠키 `dm_admin`(HttpOnly). `/admin/*` 보호.

- [ ] **Step 1:** route handler에서 `process.env.ADMIN_PIN` 비교, 일치 시 서명 쿠키 발급(간단 HMAC or 고정 토큰). 불일치 429/401.
- [ ] **Step 2:** `/admin` 하위는 쿠키 없으면 PIN 화면으로. (middleware 또는 서버 컴포넌트 가드.)
- [ ] **Step 3:** 타입체크·기본 동작 확인.
- [ ] **Step 4:** 커밋 `feat(daily-missions): 관리자 PIN 게이트`.

---

### Task 9: 관리자 화면(고정업무·약속업무·완료현황·직원명단)

**Files:**
- Create: `src/app/admin/templates/page.tsx`, `src/app/admin/assignments/page.tsx`, `src/app/admin/status/page.tsx`, `src/app/admin/staff/page.tsx`, `src/app/admin/layout.tsx`(탭 네비)

**Interfaces:**
- Consumes: Task 5 데이터 레이어 CRUD + Task 8 가드.

- [ ] **Step 1:** 고정업무 편집 — 근무형태×요일 필터, 목록/추가/수정/삭제(scope,weekday,title,category,is_periodic).
- [ ] **Step 2:** 약속업무 — 날짜+근무형태 선택 후 추가, 목록/삭제.
- [ ] **Step 3:** 완료현황 — 날짜 선택 → 근무형태별 미션 done/미완료 + 완료자 + 사진 썸네일(클릭 확대).
- [ ] **Step 4:** 직원명단 — 추가/비활성/정렬.
- [ ] **Step 5:** 라이브 확인(대표): 약속업무 추가 → 근무자 화면 반영, 완료현황에서 사진 확인.
- [ ] **Step 6:** 커밋 `feat(daily-missions): 관리자 화면(고정·약속·현황·명단)`.

---

### Task 10: 디자인 마감 + PWA + 최종 검증

**Files:**
- Create: `public/manifest.webmanifest`, `public/icon-192.png`, `public/icon-512.png`, `src/app/globals.css`(테마 정리)
- Modify: `layout.tsx`(manifest 링크, 테마 컬러)

- [ ] **Step 1:** 민트/연핑크 팔레트·카테고리 컬러·도장/게이지 마감. 카드 라운드·터치 타깃 점검.
- [ ] **Step 2:** PWA manifest + 아이콘, `theme-color` 민트, 홈화면 추가 가능.
- [ ] **Step 3:** 전체 검증: `npm run test`(도메인 그린), `npx tsc --noEmit`, `npm run build` 성공.
- [ ] **Step 4:** 대표 화면 브라우저 스모크(시작→미션→사진완료, 관리자 로그인→약속추가→현황).
- [ ] **Step 5:** README(실행·env·시드·배포). 커밋 `feat(daily-missions): 디자인 마감·PWA·검증·README`.

---

## Self-Review

- **Spec coverage:** §3 아키텍처→T1/스캐폴드·구조. §4 데이터모델→T4. §5 도메인→T2·T3. §6 화면 근무자→T6·T7, 관리자→T8·T9. §7 디자인→T10. §8 시드→T4. §9 테스트→T2·T3(도메인), 각 UI 태스크 라이브 확인. 커버 완료.
- **Placeholder scan:** 도메인(핵심 TDD) 태스크는 실제 테스트·구현 코드 포함. UI/데이터 태스크는 파일·인터페이스·단계 명시(경량 인라인 실행 전제). 미해결 플레이스홀더 없음.
- **Type consistency:** `Role/Scope/Category`(T2) → `TaskTemplate/Assignment/Completion/Mission`(T3) → 데이터 레이어(T5)·UI(T6~T9) 동일 시그니처 사용. `buildMissions` 입력에 `weekday` 명시(호출부 `weekdaySeoul(date)`로 계산).
