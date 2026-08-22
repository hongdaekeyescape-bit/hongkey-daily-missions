-- 홍키 데일리 미션 초기 스키마
-- 내부 매장용, v1은 RLS 비활성(anon 키로 접근). 관리자 화면은 앱 서버의 PIN 게이트로 보호.

create table if not exists staff (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  active boolean not null default true,
  sort int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists task_templates (
  id uuid primary key default gen_random_uuid(),
  scope text not null check (scope in ('open','middle','close','open_middle','middle_close','all')),
  weekday int not null check (weekday between 1 and 7),
  title text not null,
  description text,
  category text not null default 'etc'
    check (category in ('vacuum','mop','toilet','theme','recycle','outside','maintenance','etc')),
  is_periodic boolean not null default false,
  sort int not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create index if not exists idx_templates_scope_weekday on task_templates (scope, weekday) where active;

create table if not exists assignments (
  id uuid primary key default gen_random_uuid(),
  date date not null,
  role text not null check (role in ('open','middle','close')),
  title text not null,
  note text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create index if not exists idx_assignments_date_role on assignments (date, role) where active;

create table if not exists completions (
  id uuid primary key default gen_random_uuid(),
  date date not null,
  source_type text not null check (source_type in ('template','assignment')),
  source_id uuid not null,
  done_by text not null,
  photo_url text not null,
  done_at timestamptz not null default now(),
  unique (date, source_type, source_id)
);
create index if not exists idx_completions_date on completions (date);

-- ── Storage: 미션 완료 사진 버킷 (public) ────────────────────────────
insert into storage.buckets (id, name, public)
values ('mission-photos', 'mission-photos', true)
on conflict (id) do nothing;

-- 내부 매장용: anon 키로 사진 읽기/올리기 허용 (버킷 한정)
drop policy if exists "mission_photos_read" on storage.objects;
create policy "mission_photos_read" on storage.objects
  for select using (bucket_id = 'mission-photos');

drop policy if exists "mission_photos_insert" on storage.objects;
create policy "mission_photos_insert" on storage.objects
  for insert with check (bucket_id = 'mission-photos');

drop policy if exists "mission_photos_update" on storage.objects;
create policy "mission_photos_update" on storage.objects
  for update using (bucket_id = 'mission-photos');
