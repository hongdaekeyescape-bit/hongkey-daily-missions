-- 출퇴근 인증(지문 대체) 기록
create table if not exists attendance (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  date date not null,
  type text not null check (type in ('in','out')),
  at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (name, date, type)
);
create index if not exists idx_attendance_date on attendance (date);

alter table attendance enable row level security;
drop policy if exists attendance_all on attendance;
create policy attendance_all on attendance for all using (true) with check (true);
