-- 고정업무 수정 추적: updated_at + 변경 로그
alter table task_templates add column if not exists updated_at timestamptz;

create table if not exists template_changes (
  id uuid primary key default gen_random_uuid(),
  template_id uuid,
  action text not null, -- create | update | delete
  title text,
  scope text,
  weekday int,
  at timestamptz not null default now()
);
create index if not exists idx_template_changes_at on template_changes (at desc);
alter table template_changes enable row level security;
drop policy if exists template_changes_all on template_changes;
create policy template_changes_all on template_changes for all using (true) with check (true);
