-- 앱 설정(경고 온/오프 등) 키-값
create table if not exists app_settings (
  key text primary key,
  value text not null,
  updated_at timestamptz not null default now()
);
alter table app_settings enable row level security;
drop policy if exists app_settings_all on app_settings;
create policy app_settings_all on app_settings for all using (true) with check (true);

insert into app_settings (key, value) values ('warnings_enabled', 'true')
on conflict (key) do nothing;
