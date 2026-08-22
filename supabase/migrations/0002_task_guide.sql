-- 고정업무에 업무 가이드 + 사진 예시 컬럼 추가 (기존 DB용)
alter table task_templates add column if not exists guide text;
alter table task_templates add column if not exists example_photo_url text;
