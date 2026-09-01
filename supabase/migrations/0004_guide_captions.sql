-- 예시 사진 캡션(가이드 사진과 인덱스 정렬)
alter table task_templates add column if not exists guide_captions jsonb not null default '[]'::jsonb;
