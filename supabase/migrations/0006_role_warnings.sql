-- 출퇴근에 근무형태 기록(미이행 판정용) + 경고 표시 기록
alter table attendance add column if not exists role text;

create table if not exists warning_ack (
  name text not null,
  week text not null, -- 예: 2026-W36
  acked_at timestamptz not null default now(),
  unique (name, week)
);
alter table warning_ack enable row level security;
drop policy if exists warning_ack_all on warning_ack;
create policy warning_ack_all on warning_ack for all using (true) with check (true);
