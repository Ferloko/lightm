-- LIGHT: equipo, permisos por rol y sincronización del Dashboard.
-- Ejecutar UNA vez en el SQL Editor de una base ya inicializada (después de
-- 20261109_editorial_likes_deletions.sql). Es idempotente: puede volver a
-- ejecutarse sin romper datos. No crea tipos ENUM.

-- ---------------------------------------------------------------------------
-- 1. Perfiles: bloqueo de cuentas y alias de acceso desde el buscador
-- ---------------------------------------------------------------------------
alter table public.profiles add column if not exists is_active boolean not null default true;
alter table public.profiles add column if not exists login_alias text;
create unique index if not exists profiles_login_alias_unique on public.profiles (lower(login_alias)) where login_alias is not null;

-- Alias iniciales para los cuatro perfiles conocidos (solo si aún no tienen uno).
update public.profiles p set login_alias = lower(split_part(u.email, '@', 1))
from auth.users u
where u.id = p.id and p.login_alias is null
  and lower(split_part(u.email, '@', 1)) in ('snow', 'songbird', 'moonglow', 'bianca');

-- Una cuenta bloqueada pierde su rol editorial en TODAS las políticas RLS.
create or replace function public.current_editorial_role()
returns public.editorial_role
language sql stable security definer set search_path = public
as $$ select role from public.profiles where id = auth.uid() and is_active $$;

-- El buscador traduce un alias (ej. "snow") al correo de acceso.
-- Solo devuelve algo para alias de cuentas activas.
create or replace function public.editorial_login_email(p_alias text)
returns text
language sql stable security definer set search_path = public, auth
as $$
  select u.email::text from public.profiles p join auth.users u on u.id = p.id
  where p.is_active and p.login_alias is not null and lower(p.login_alias) = lower(btrim(p_alias))
  limit 1
$$;
revoke all on function public.editorial_login_email(text) from public;
grant execute on function public.editorial_login_email(text) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- 2. Permisos del Dashboard por rol (Owner siempre tiene todo)
-- ---------------------------------------------------------------------------
create table if not exists public.dashboard_permissions (
  role public.editorial_role not null,
  section text not null,
  can_view boolean not null default false,
  can_edit boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (role, section),
  constraint dashboard_permissions_edit_implies_view check (not can_edit or can_view)
);
alter table public.dashboard_permissions enable row level security;

-- Valores iniciales: Admin ve y edita todo salvo Equipo; Staff Writer ve todo
-- en modo lectura (como pediste) y no edita nada fuera de sus borradores.
insert into public.dashboard_permissions (role, section, can_view, can_edit)
select r.role::public.editorial_role, s.section,
       case when s.section = 'team' then false else true end,
       case when r.role = 'admin' and s.section <> 'team' then true else false end
from (values ('admin'), ('staff_writer')) as r(role)
cross join (values ('overview'), ('editions'), ('runway'), ('masthead'), ('homepage-feature'), ('coming-soon'),
                   ('calendar'), ('campaigns'), ('subscribers'), ('comments'), ('deletion-requests'), ('team')) as s(section)
on conflict (role, section) do nothing;

create or replace function public.can_dashboard(p_section text, p_action text default 'view')
returns boolean
language plpgsql stable security definer set search_path = public
as $$
declare
  my_role public.editorial_role := public.current_editorial_role();
  allowed boolean;
begin
  if my_role is null then return false; end if;
  if my_role = 'owner' then return true; end if;
  select case when p_action = 'edit' then can_edit else can_view end into allowed
  from public.dashboard_permissions where role = my_role and section = p_section;
  return coalesce(allowed, false);
end;
$$;
revoke all on function public.can_dashboard(text, text) from public;
grant execute on function public.can_dashboard(text, text) to authenticated;

-- Permisos efectivos de la persona que tiene la sesión abierta.
create or replace function public.my_dashboard_permissions()
returns table(section text, can_view boolean, can_edit boolean)
language sql stable security definer set search_path = public
as $$
  select s.section, public.can_dashboard(s.section, 'view'), public.can_dashboard(s.section, 'edit')
  from (values ('overview'), ('editions'), ('runway'), ('masthead'), ('homepage-feature'), ('coming-soon'),
               ('calendar'), ('campaigns'), ('subscribers'), ('comments'), ('deletion-requests'), ('team')) as s(section)
$$;
revoke all on function public.my_dashboard_permissions() from public;
grant execute on function public.my_dashboard_permissions() to authenticated;

drop policy if exists "Editors can read dashboard permissions" on public.dashboard_permissions;
create policy "Editors can read dashboard permissions" on public.dashboard_permissions for select to authenticated
  using (public.current_editorial_role() is not null);
drop policy if exists "Owner manages dashboard permissions" on public.dashboard_permissions;
create policy "Owner manages dashboard permissions" on public.dashboard_permissions for all to authenticated
  using (public.current_editorial_role() = 'owner') with check (public.current_editorial_role() = 'owner');
grant select, insert, update on table public.dashboard_permissions to authenticated;

-- ---------------------------------------------------------------------------
-- 3. Equipo: Owner (o quien tenga "Equipo / editar") cambia roles, nombres,
--    alias y bloquea/desbloquea cuentas.
-- ---------------------------------------------------------------------------
drop policy if exists "Team managers can read profiles" on public.profiles;
create policy "Team managers can read profiles" on public.profiles for select to authenticated
  using (public.can_dashboard('team', 'view'));

create or replace function public.list_editorial_team()
returns table(id uuid, email text, display_name text, role public.editorial_role, is_active boolean, login_alias text, created_at timestamptz, last_sign_in_at timestamptz)
language plpgsql stable security definer set search_path = public, auth
as $$
begin
  if not public.can_dashboard('team', 'view') then
    raise exception 'No tienes acceso a Equipo.' using errcode = '42501';
  end if;
  return query
  select p.id, u.email::text, p.display_name, p.role, p.is_active, p.login_alias, p.created_at, u.last_sign_in_at
  from public.profiles p join auth.users u on u.id = p.id
  order by p.role, p.display_name;
end;
$$;
revoke all on function public.list_editorial_team() from public;
grant execute on function public.list_editorial_team() to authenticated;

create or replace function public.update_editorial_member(p_id uuid, p_display_name text, p_role public.editorial_role, p_is_active boolean, p_login_alias text)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  my_role public.editorial_role := public.current_editorial_role();
  target public.profiles%rowtype;
  active_owners int;
begin
  if not public.can_dashboard('team', 'edit') then
    raise exception 'No tienes permiso para editar el equipo.' using errcode = '42501';
  end if;
  select * into target from public.profiles where id = p_id for update;
  if not found then raise exception 'No se encontró el perfil.'; end if;
  if my_role <> 'owner' and (target.role = 'owner' or p_role = 'owner') then
    raise exception 'Solo un Owner puede asignar o modificar a otro Owner.' using errcode = '42501';
  end if;
  if length(btrim(coalesce(p_display_name, ''))) = 0 then
    raise exception 'El nombre editorial no puede quedar vacío.';
  end if;
  if target.role = 'owner' and (p_role <> 'owner' or not p_is_active) then
    select count(*) into active_owners from public.profiles where role = 'owner' and is_active and id <> p_id;
    if active_owners = 0 then
      raise exception 'Debe quedar al menos un Owner activo.';
    end if;
  end if;
  update public.profiles
  set display_name = btrim(p_display_name), role = p_role, is_active = p_is_active,
      login_alias = nullif(lower(btrim(coalesce(p_login_alias, ''))), '')
  where id = p_id;
end;
$$;
revoke all on function public.update_editorial_member(uuid, text, public.editorial_role, boolean, text) from public;
grant execute on function public.update_editorial_member(uuid, text, public.editorial_role, boolean, text) to authenticated;

-- ---------------------------------------------------------------------------
-- 4. Artículos: la fecha de publicación original no se pierde al re-editar
-- ---------------------------------------------------------------------------
create or replace function public.keep_article_published_at()
returns trigger
language plpgsql set search_path = public
as $$
begin
  if new.status = 'published' then
    new.published_at := coalesce(old.published_at, new.published_at, now());
  else
    new.published_at := old.published_at; -- despublicar conserva la fecha histórica
  end if;
  return new;
end;
$$;
drop trigger if exists keep_article_published_at on public.articles;
create trigger keep_article_published_at before update on public.articles
for each row execute function public.keep_article_published_at();

-- ---------------------------------------------------------------------------
-- 5. Políticas basadas en permisos para cada apartado del Dashboard
-- ---------------------------------------------------------------------------
create or replace function public.drop_all_policies(p_table text)
returns void language plpgsql set search_path = public as $$
declare pol text;
begin
  for pol in select policyname from pg_policies where schemaname = 'public' and tablename = p_table loop
    execute format('drop policy %I on public.%I', pol, p_table);
  end loop;
end; $$;

-- Calendario
select public.drop_all_policies('calendar_events');
create policy "Dashboard can read calendar" on public.calendar_events for select to authenticated using (public.can_dashboard('calendar'));
create policy "Dashboard can create calendar" on public.calendar_events for insert to authenticated with check (public.can_dashboard('calendar', 'edit'));
create policy "Dashboard can update calendar" on public.calendar_events for update to authenticated using (public.can_dashboard('calendar', 'edit')) with check (public.can_dashboard('calendar', 'edit'));
create policy "Dashboard can delete calendar" on public.calendar_events for delete to authenticated using (public.can_dashboard('calendar', 'edit'));
grant select, insert, update, delete on table public.calendar_events to authenticated;

-- Campañas
select public.drop_all_policies('campaigns');
create policy "Dashboard can read campaigns" on public.campaigns for select to authenticated using (public.can_dashboard('campaigns'));
create policy "Dashboard can create campaigns" on public.campaigns for insert to authenticated with check (public.can_dashboard('campaigns', 'edit'));
create policy "Dashboard can update campaigns" on public.campaigns for update to authenticated using (public.can_dashboard('campaigns', 'edit')) with check (public.can_dashboard('campaigns', 'edit'));
create policy "Dashboard can delete campaigns" on public.campaigns for delete to authenticated using (public.can_dashboard('campaigns', 'edit'));
grant select, insert, update, delete on table public.campaigns to authenticated;

-- Suscriptores
select public.drop_all_policies('newsletter_subscribers');
create policy "Anyone can subscribe to newsletter" on public.newsletter_subscribers for insert to anon, authenticated
  with check (char_length(email) between 3 and 254 and email ~* '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$');
create policy "Dashboard can read subscribers" on public.newsletter_subscribers for select to authenticated using (public.can_dashboard('subscribers'));
create policy "Dashboard can delete subscribers" on public.newsletter_subscribers for delete to authenticated using (public.can_dashboard('subscribers', 'edit'));
grant insert on table public.newsletter_subscribers to anon, authenticated;
grant select, delete on table public.newsletter_subscribers to authenticated;

-- Comentarios de Business (ahora también se pueden borrar, p. ej. spam)
select public.drop_all_policies('contact_submissions');
create policy "Anyone can submit Business comments" on public.contact_submissions for insert to anon, authenticated with check (
  char_length(btrim(first_name)) between 1 and 120 and char_length(btrim(last_name)) between 1 and 120
  and char_length(email) between 3 and 254
  and email ~* '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$'
  and char_length(btrim(comment)) between 5 and 5000
);
create policy "Dashboard can read Business comments" on public.contact_submissions for select to authenticated using (public.can_dashboard('comments'));
create policy "Dashboard can delete Business comments" on public.contact_submissions for delete to authenticated using (public.can_dashboard('comments', 'edit'));
grant insert on table public.contact_submissions to anon, authenticated;
grant select, delete on table public.contact_submissions to authenticated;

-- Visitas
select public.drop_all_policies('page_views');
create policy "Anyone can record page views" on public.page_views for insert to anon, authenticated with check (char_length(path) between 1 and 300);
create policy "Dashboard can read page views" on public.page_views for select to authenticated using (public.can_dashboard('overview'));

-- Serie de visitas agregada en la base (sin el límite de 10.000 filas) y en tu zona horaria.
create or replace function public.page_view_stats(p_days int default 15, p_tz text default 'UTC')
returns table(day date, views bigint)
language plpgsql stable security definer set search_path = public
as $$
begin
  if not public.can_dashboard('overview') then
    raise exception 'No tienes acceso al Resumen.' using errcode = '42501';
  end if;
  return query
  with days as (
    select generate_series((now() at time zone p_tz)::date - (greatest(p_days, 1) - 1), (now() at time zone p_tz)::date, interval '1 day')::date as day
  )
  select d.day, count(v.id)::bigint
  from days d
  left join public.page_views v on (v.viewed_at at time zone p_tz)::date = d.day
  group by d.day order by d.day;
end;
$$;
revoke all on function public.page_view_stats(int, text) from public;
grant execute on function public.page_view_stats(int, text) to authenticated;
create index if not exists page_views_viewed_at_idx on public.page_views (viewed_at);

-- Runway
create table if not exists public.runway_brands (
  id text primary key,
  slug text unique not null,
  brand text not null,
  city text not null default 'Paris',
  image text not null default '',
  season text not null default 'Spring 2027 Ready-to-Wear',
  deck text not null default '',
  text text not null default '',
  tags jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);
alter table public.runway_brands enable row level security;
select public.drop_all_policies('runway_brands');
create policy "Anyone can read runway brands" on public.runway_brands for select using (true);
create policy "Dashboard can create runway brands" on public.runway_brands for insert to authenticated with check (public.can_dashboard('runway', 'edit'));
create policy "Dashboard can update runway brands" on public.runway_brands for update to authenticated using (public.can_dashboard('runway', 'edit')) with check (public.can_dashboard('runway', 'edit'));
create policy "Dashboard can delete runway brands" on public.runway_brands for delete to authenticated using (public.can_dashboard('runway', 'edit'));
grant select on table public.runway_brands to anon, authenticated;
grant insert, update, delete on table public.runway_brands to authenticated;

-- Próximamente
create table if not exists public.page_availability (
  path text primary key,
  label text not null,
  enabled boolean not null default false,
  title text not null,
  message text not null default '',
  image text not null default '',
  updated_at timestamptz not null default now()
);
alter table public.page_availability enable row level security;
select public.drop_all_policies('page_availability');
create policy "Anyone can read page availability" on public.page_availability for select using (true);
create policy "Dashboard can create page availability" on public.page_availability for insert to authenticated with check (public.can_dashboard('coming-soon', 'edit'));
create policy "Dashboard can update page availability" on public.page_availability for update to authenticated using (public.can_dashboard('coming-soon', 'edit')) with check (public.can_dashboard('coming-soon', 'edit'));
grant select on table public.page_availability to anon, authenticated;
grant insert, update on table public.page_availability to authenticated;

-- Ajustes públicos compartidos (Masthead, Destacado, Ubicaciones, Ediciones).
-- Cada clave pertenece a un apartado del Dashboard.
create or replace function public.site_setting_section(p_key text)
returns text language sql immutable as $$
  select case p_key
    when 'public:masthead-team' then 'masthead'
    when 'public:homepage-feature' then 'homepage-feature'
    when 'public:archive-placements' then 'homepage-feature'
    when 'public:magazine-editions' then 'editions'
    else 'team' -- claves desconocidas: solo Owner o quien gestione Equipo
  end
$$;

create table if not exists public.site_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);
alter table public.site_settings enable row level security;
select public.drop_all_policies('site_settings');
create policy "Anyone can read public site settings" on public.site_settings for select to anon, authenticated using (key like 'public:%');
create policy "Dashboard can create site settings" on public.site_settings for insert to authenticated
  with check (key like 'public:%' and public.can_dashboard(public.site_setting_section(key), 'edit'));
create policy "Dashboard can update site settings" on public.site_settings for update to authenticated
  using (key like 'public:%' and public.can_dashboard(public.site_setting_section(key), 'edit'))
  with check (key like 'public:%' and public.can_dashboard(public.site_setting_section(key), 'edit'));
grant select on table public.site_settings to anon, authenticated;
grant insert, update on table public.site_settings to authenticated;

-- Solicitudes de borrado: lectura según permiso, además de las propias.
drop policy if exists "Authors and admins can read deletion requests" on public.article_deletion_requests;
create policy "Authors and admins can read deletion requests" on public.article_deletion_requests for select to authenticated
  using (requester_id = auth.uid() or public.can_dashboard('deletion-requests'));

drop function if exists public.drop_all_policies(text);

-- Realtime: los cambios aparecen en directo en otros navegadores abiertos.
do $$
declare t text;
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    foreach t in array array['site_settings', 'runway_brands', 'page_availability', 'calendar_events', 'campaigns', 'articles'] loop
      if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t) then
        execute format('alter publication supabase_realtime add table public.%I', t);
      end if;
    end loop;
  end if;
end;
$$;

notify pgrst, 'reload schema';
