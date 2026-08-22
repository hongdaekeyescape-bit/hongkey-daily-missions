# 홍키 데일리 미션 🧹✨

홍대키이스케이프 매장 알바용 **오늘의 할일 미션 웹앱(PWA)**.
근무자는 폰으로 접속 → 현재 시각으로 근무형태가 자동 추정되고 이름만 고르면 오늘 미션이 뜬다. 각 미션은 **사진을 찍으면 완료**된다. 관리자는 PIN으로 들어가 고정업무·약속업무·완료현황을 관리한다.

## 핵심 개념

- **근무형태**: 오픈(~14시) / 미들(14~18시) / 마감(18시~) — 접속 시각으로 자동 추정, 화면에서 수동 변경 가능.
- **고정업무**: 요일×근무형태로 정해진 업무. 엑셀 업무분담표를 시드로 넣고 관리자 화면에서 편집.
- **협업 업무**: `오픈+미들`, `미들+마감`, `전체` 스코프는 여러 근무형태에 공유됨.
- **약속업무**: 관리자가 특정 날짜+근무형태에 추가하는 임시 업무.
- **완료는 근무조 공유**: 같은 날 같은 미션은 누가 하든 한 번. 완료자 이름·사진·시각 기록.

## 기술 스택

Next.js 16(App Router) · React 19 · TypeScript · Tailwind v4 · Supabase(Postgres + Storage) · vitest

```
src/
  domain/   # 순수 로직(프레임워크 비의존, TDD): shift, missions, types, seedData
  data/     # Supabase CRUD 어댑터
  lib/      # supabase 클라이언트, 시간(Asia/Seoul), 관리자 인증, 카테고리 색
  app/      # 근무자(/ , /missions) · 관리자(/admin/*) · API(/api/admin/login)
supabase/migrations/  # 스키마
scripts/seed.ts       # 엑셀 시드
```

## 셋업

### 1) 환경변수
`.env.example`를 복사해 `.env.local` 작성:

```bash
cp .env.example .env.local
```

- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Supabase 프로젝트 값
- `SUPABASE_SERVICE_ROLE_KEY` — 시드 스크립트용(서버 전용)
- `ADMIN_PIN` — 관리자 화면 PIN
- `ADMIN_SECRET` — 쿠키 서명용 랜덤 문자열

### 2) DB 스키마 + Storage
Supabase SQL 편집기에서 `supabase/migrations/0001_init.sql` 실행. 이어서 사진 버킷 생성:

```sql
insert into storage.buckets (id, name, public) values ('mission-photos','mission-photos', true)
on conflict (id) do nothing;
```

### 3) 엑셀 시드(고정업무 41개)
```bash
npm install
npm run seed
```

### 4) 실행
```bash
npm run dev      # http://localhost:3000
```

### 5) 직원 등록
`/admin` → PIN 입장 → **직원명단**에서 근무자 이름 추가(그래야 시작 화면에 뜬다).

## 개발

```bash
npm run test        # 도메인 단위테스트(vitest)
npx tsc --noEmit    # 타입체크
npm run build       # 프로덕션 빌드
```

## 배포

Vercel 등에 배포하고 위 환경변수를 프로젝트 설정에 등록. 폰에서 접속 후 "홈 화면에 추가"로 앱처럼 사용(PWA).
