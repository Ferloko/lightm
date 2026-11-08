-- Mantiene compatible el rol Staff Writer con public.profiles.role.
alter type public.editorial_role add value if not exists 'staff_writer';

-- Contenido editorial público editable desde el Dashboard.
create table if not exists public.site_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.site_settings enable row level security;

drop policy if exists "Anyone can read public site settings" on public.site_settings;
create policy "Anyone can read public site settings"
  on public.site_settings for select to anon, authenticated
  using (key like 'public:%');

drop policy if exists "Editors can create public site settings" on public.site_settings;
create policy "Editors can create public site settings"
  on public.site_settings for insert to authenticated
  with check (key like 'public:%' and public.current_editorial_role() in ('owner','admin'));

drop policy if exists "Editors can update public site settings" on public.site_settings;
create policy "Editors can update public site settings"
  on public.site_settings for update to authenticated
  using (key like 'public:%' and public.current_editorial_role() in ('owner','admin'))
  with check (key like 'public:%' and public.current_editorial_role() in ('owner','admin'));

-- RLS restringe estas concesiones a claves públicas y editores.
grant select on table public.site_settings to anon, authenticated;
grant insert, update on table public.site_settings to authenticated;
