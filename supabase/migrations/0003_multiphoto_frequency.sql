-- 완료 사진 여러 장 + 가이드 사진 여러 장 + 주기 규칙
alter table completions add column if not exists photos jsonb not null default '[]'::jsonb;
alter table task_templates add column if not exists guide_photos jsonb not null default '[]'::jsonb;
alter table task_templates add column if not exists frequency text not null default 'always'
  check (frequency in ('always','biweekly','monthly_first'));
