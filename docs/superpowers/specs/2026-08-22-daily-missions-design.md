# 홍키 데일리 미션 — 설계 스펙

- 작성일: 2026-08-22
- 프로젝트 경로: `tools/daily-missions`
- 대상: 홍대키이스케이프 매장 알바(모바일 웹앱/PWA)

## 1. 목적 / 한 줄 요약

매장 알바가 폰 브라우저로 접속하면 **현재 시각으로 근무형태(오픈/미들/마감)를 자동 추정**하고, 이름만 선택하면 **오늘의 할일이 미션 카드**로 제공된다. 각 미션은 **사진을 촬영하면 완료**된다. 고정업무는 엑셀(업무분담표)을 시드로 두되 관리자가 편집하고, 관리자는 날짜+근무형태 단위로 "약속된 업무"를 추가하며 완료현황을 확인한다.

## 2. 확정된 결정 (브레인스토밍 결과)

| 항목 | 결정 |
|---|---|
| 플랫폼 | 모바일 웹앱(PWA) 신규, `tools/daily-missions` |
| 스택 | Next.js(App Router) + TypeScript + Tailwind + Supabase(Postgres + Storage) — `staff-schedule`와 동일 계열 |
| 시작 화면 | **현재 시각으로 근무형태 자동 추정** + 이름 선택. 근무형태 칩은 눌러서 수동 변경 가능 |
| 근무형태 시간 경계 | ~14:00 = 오픈 · 14:00~18:00 = 미들 · 18:00~ = 마감 (Asia/Seoul) |
| 인증 | 근무자: 잠금 없음(이름 선택만). 관리자: **전용 PIN** |
| 고정업무 | **엑셀 시드 + 관리자 편집(CRUD)** |
| 약속업무 배정 | **날짜 + 근무형태** 단위 |
| 완료 단위 | **근무조 공유** — 누가 하든 그 날 한 번. 완료자 이름·사진·시각 기록 |
| 완료 방식 | 미션 카드 → 카메라 촬영 → 완료(도장 연출) |
| 브랜드 컬러 | 민트 + 연핑크. 캐주얼 업무 도우미 톤 |

### v1에서 제외(YAGNI)
푸시 알림 · 사진 승인/반려 워크플로(사진=증빙만) · 개인 점수/랭킹 · 오프라인 동기화 · 근무자 PIN.

## 3. 아키텍처

```
tools/daily-missions/
  src/
    app/                # Next.js App Router (페이지 + route handlers)
      page.tsx          # 시작(이름+근무형태 자동추정)
      missions/         # 오늘의 미션 목록/완료
      admin/            # 관리자(PIN 게이트): 고정업무·약속업무·완료현황·직원명단
      api/              # route handlers (관리자 PIN 검증, 사진 업로드 서명 등 서버 전용)
    domain/             # 순수 로직 (프레임워크 비의존, 단위테스트 대상)
      shift.ts          # 시각 → 근무형태 추정, 근무형태 스코프 매핑
      missions.ts       # (date, role) → 오늘의 미션 목록 계산(협업 합집합, 완료 매핑)
      types.ts
    data/               # Supabase 얇은 데이터 레이어 (도메인 타입 ↔ DB)
    lib/                # supabase 클라이언트, 시간(Asia/Seoul) 유틸
  supabase/
    migrations/         # 스키마
    seed/               # 엑셀 → task_templates 시드
  docs/superpowers/specs/
```

**격리 원칙**: `domain/`은 Supabase/Next를 모른다(순수 함수, 입력→출력). `data/`만 Supabase에 의존. UI는 `data/` + `domain/`을 조합. → 미션 계산 로직을 DB 없이 테스트.

## 4. 데이터 모델 (Supabase Postgres)

### `staff`
| 컬럼 | 타입 | 비고 |
|---|---|---|
| id | uuid PK | |
| name | text | 표시 이름 |
| active | bool | 명단 노출 여부 |
| sort | int | 정렬 |

### `task_templates` (고정업무, 엑셀 시드 + 관리자 편집)
| 컬럼 | 타입 | 비고 |
|---|---|---|
| id | uuid PK | |
| scope | enum | `open` · `middle` · `close` · `open_middle` · `middle_close` · `all` |
| weekday | int | 1(월)~7(일) |
| title | text | 미션 제목 |
| description | text? | 세부(예: 매장 밖 청소 하위 항목) |
| category | enum | `vacuum`(청소기)·`mop`(물걸레/요소수)·`toilet`(화장실/변기)·`theme`(테마청소)·`recycle`(분리수거)·`outside`(매장밖)·`maintenance`(유지보수)·`etc` |
| is_periodic | bool | 🔁 정기 업무 |
| sort | int | |
| active | bool | |

### `assignments` (약속업무)
| 컬럼 | 타입 | 비고 |
|---|---|---|
| id | uuid PK | |
| date | date | 배정 날짜 |
| role | enum | `open`·`middle`·`close` |
| title | text | |
| note | text? | |
| active | bool | |

### `completions` (완료기록 · 근무조 공유)
| 컬럼 | 타입 | 비고 |
|---|---|---|
| id | uuid PK | |
| date | date | 완료 날짜(Asia/Seoul) |
| source_type | enum | `template` · `assignment` |
| source_id | uuid | 템플릿/약속 id |
| done_by | text | 완료자 이름 |
| photo_url | text | Supabase Storage 경로 |
| done_at | timestamptz | |

**유일성**: `unique(date, source_type, source_id)` — 같은 날 같은 미션은 한 번만 완료(근무조 공유). 재완료/취소는 관리자 또는 당일 근무자가 삭제 후 재등록.

**사진 저장**: Supabase Storage 버킷 `mission-photos`, 경로 `YYYY-MM-DD/{source_id}.jpg`.

**관리자 PIN**: 서버 환경변수 `ADMIN_PIN`(route handler에서만 검증, 클라이언트 노출 금지). 세션은 짧은 서명 쿠키.

## 5. 도메인 로직 (핵심 · TDD)

### 5.1 시각 → 근무형태 추정 `guessRole(now)`
- `hour < 14` → `open`
- `14 ≤ hour < 18` → `middle`
- `hour ≥ 18` → `close`
- 기준 시간대: Asia/Seoul. UI에서 수동 변경 가능(추정은 초기값일 뿐).

### 5.2 근무형태 → 적용 스코프 `scopesForRole(role)`
| role | 포함 스코프 |
|---|---|
| open | open, open_middle, all |
| middle | middle, open_middle, middle_close, all |
| close | close, middle_close, all |

### 5.3 오늘의 미션 계산 `buildMissions({date, role, templates, assignments, completions})`
1. `weekday = 요일(date)`, `scopes = scopesForRole(role)`
2. 템플릿 항목 = `templates.filter(active && scope∈scopes && weekday==weekday)`
3. 약속 항목 = `assignments.filter(active && date==date && role==role)`
4. 각 항목에 완료여부 매핑: `completions`에서 `(date, source_type, source_id)` 일치 → done + 완료자/사진/시각
5. 정렬: 미완료 우선 → category → sort. 배지: 🔁정기 / 협업(스코프가 open_middle·middle_close·all) / 약속
6. 반환: `{ items: Mission[], doneCount, totalCount }`

→ 순수 함수. DB 없이 픽스처로 테스트(협업 합집합, 공유 완료, 요일 경계, 약속 병합).

## 6. 화면

### 근무자 (잠금 없음)
1. **시작 `/`**: 상단에 자동추정 근무형태 칩(탭하면 오픈/미들/마감 전환) → 이름 선택(검색 가능한 명단) → "미션 시작"
2. **미션 목록 `/missions`**: 진행 게이지("3 / 8 완료"), 미션 카드(제목·카테고리 컬러·🔁/협업/약속 배지·완료도장). 미완료 상단.
3. **완료 플로우**: 카드 탭 → 상세 시트 → 카메라 촬영(`<input type=file accept=image/* capture=environment>`) → 미리보기 → "완료" → 사진 업로드 + completion 생성 → 도장 애니메이션. 완료 카드엔 완료자·시각 표시.
4. **전체 완료 축하** 연출.

### 관리자 (전용 PIN `/admin`)
5. **PIN 로그인** → 6. **고정업무 편집**(근무형태×요일 그리드, 항목 추가/수정/삭제) · 7. **약속업무**(날짜+근무형태로 추가, 목록/삭제) · 8. **완료현황**(날짜 선택, 근무형태별 완료/미완료 + 사진 + 완료자) · 9. **직원 명단 관리**(추가/비활성/정렬)

## 7. 디자인 톤

- 브랜드 컬러: **민트(주)** + **연핑크(보조)**. 배경은 밝고 부드럽게, 카드 라운드 크게.
- 캐주얼 "업무 도우미" — 미션/도장/게이지로 게임 느낌. 이모지·카테고리 컬러 액센트.
- 카테고리 컬러(초안): 청소기=민트, 테마청소=연핑크, 화장실/변기=하늘, 물걸레/요소수=라임, 분리수거=앰버, 매장밖=코랄, 유지보수=라벤더.
- 폰 우선(1열), 큰 터치 타깃. PWA 매니페스트 + 홈 화면 추가.

## 8. 엑셀 시드 (task_templates 초기 데이터)

weekday: 1=월 … 7=일. `🔁` → is_periodic=true(제목에서 이모지 제거).

### 오픈 (scope=open)
- 월: 유지보수(maintenance) · 홀 청소기(vacuum) · 변기세정제🔁(toilet)
- 화: 유지보수(maintenance)
- 수: 유지보수 · 홀 청소기 · 변기세정제🔁
- 목: 유지보수
- 금: 유지보수 · 홀 청소기 · 변기세정제🔁
- 토: 3 테마 청소기(vacuum)
- 일: 3 테마 청소 (먼지)(theme)

### 미들 (scope=middle)
- 월: 3 테마 청소기(vacuum)
- 화: 화장실 청소(toilet)
- 수: 3 테마청소 (먼지)(theme)
- 목: 에어컨 필터 청소(maintenance) · 공기청정기 청소(maintenance)
- 금: 제빙기 청소(maintenance) · 초파리 퇴치기 + 끈끈이 교체🔁(maintenance)
- 토: 매장 전체 먼지(vacuum) · 홀 청소기(vacuum)
- 일: 매장 밖 청소(outside) · 홀 청소기(vacuum)

### 마감 (scope=close)
- 월: 물걸레(mop) · 요소수(mop)
- 화: 분리수거(recycle) · 매장 밖 청소(outside)
- 수: 구두방 제습제 비우기(maintenance) · 요소수(mop)
- 목: 인화지 포토존 조명 배터리 교체(maintenance) · 분리수거(recycle) · 달1번 고백 세탁 물 확인🔁(maintenance)
- 금: 매장 밖 청소(outside) · 물걸레(mop)
- 토: 분리수거(recycle) · 상황실 청소 및 정리정돈(maintenance)
- 일: 구두방 제습제 비우기(maintenance) · 배너 조이기🔁(maintenance)

### 협업
- 오픈+미들(open_middle): (초기 항목 없음)
- 미들+마감(middle_close): 수 — 은나노🔁(theme)
- 전체(all): 월 — 테마청소 (전부 합쳐서 무조건 끝내기)🔁(theme)

### 세부 설명(description)
- "매장 밖 청소" = 계단 거미줄 청소 / 반계단 위 사물함 위 청소 / 매장 입구 현관 핑크문 먼지청소

> 카테고리는 초기 추정값이며 관리자가 편집 화면에서 조정 가능.

## 9. 테스트 전략

- **도메인 단위테스트(주력)**: `guessRole` 경계값, `scopesForRole` 매핑, `buildMissions`(협업 합집합·공유 완료 매핑·요일 필터·약속 병합·정렬/배지). 픽스처 기반, DB 불필요.
- **데이터 레이어**: Supabase 얇은 어댑터 — 통합 테스트는 최소(대표 경로).
- **라이브 검증**: 대표 화면(시작→미션→사진완료, 관리자 편집) 브라우저 확인.

## 10. 열린 항목 / 후속

- 완료 취소(재촬영)를 근무자에게 허용할지: v1은 당일 삭제 허용(간단). 필요시 관리자 전용으로 축소.
- 영업일 경계(자정 이후 마감 근무): v1은 캘린더 날짜(Asia/Seoul) 기준. 심야 마감이 흔하면 "새벽 N시 이전은 전날"로 보정 검토.
