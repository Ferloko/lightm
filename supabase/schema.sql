-- MODA Studio / Supabase schema
create type public.editorial_role as enum ('owner', 'admin', 'staff_writer');
create type public.article_status as enum ('draft', 'published');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  role public.editorial_role not null default 'staff_writer',
  created_at timestamptz not null default now()
);

create table public.articles (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles(id),
  slug text unique,
  eyebrow text not null default 'MODA / PORTADA',
  title text not null,
  category text not null default 'Moda',
  excerpt text not null default '',
  lead text not null default '',
  reading_time text not null default '8 min de lectura',
  date date,
  body text not null default '',
  page_blocks jsonb not null default '[]'::jsonb,
  cover_image_path text,
  cover_caption text,
  status public.article_status not null default 'draft',
  is_visible boolean not null default true,
  is_featured boolean not null default false,
  featured_order integer not null default 99,
  published_at timestamptz,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table public.newsletter_subscribers (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  source text not null default 'home',
  subscribed_at timestamptz not null default now()
);

create table public.page_views (
  id uuid primary key default gen_random_uuid(),
  path text not null,
  viewed_at timestamptz not null default now()
);

create table public.calendar_events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null default '',
  start_at timestamptz not null,
  end_at timestamptz,
  all_day boolean not null default true,
  color text not null default 'acid',
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.campaigns (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text not null default '',
  start_date date not null,
  end_date date not null,
  color text not null default 'acid',
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint campaigns_valid_range check (end_date >= start_date)
);

-- Safe migration for projects that already created the first version of articles.
alter table public.articles add column if not exists slug text;
alter table public.articles add column if not exists eyebrow text not null default 'MODA / PORTADA';
alter table public.articles add column if not exists lead text not null default '';
alter table public.articles add column if not exists reading_time text not null default '8 min de lectura';
alter table public.articles add column if not exists date date;
alter table public.articles add column if not exists page_blocks jsonb not null default '[]'::jsonb;
alter table public.articles add column if not exists cover_caption text;
alter table public.articles add column if not exists is_visible boolean not null default true;
alter table public.articles add column if not exists is_featured boolean not null default false;
alter table public.articles add column if not exists featured_order integer not null default 99;
create unique index if not exists articles_slug_unique on public.articles(slug) where slug is not null;

alter table public.profiles enable row level security;
alter table public.articles enable row level security;
alter table public.newsletter_subscribers enable row level security;
alter table public.page_views enable row level security;
alter table public.calendar_events enable row level security;
alter table public.campaigns enable row level security;

create or replace function public.current_editorial_role()
returns public.editorial_role
language sql stable security definer set search_path = public
as $$ select role from public.profiles where id = auth.uid() $$;

create policy "Editors can read their profile" on public.profiles for select using (id = auth.uid());
create policy "Admins can read author profiles" on public.profiles for select to authenticated using (public.current_editorial_role() in ('owner','admin'));
create policy "Visitors and admins can read eligible articles" on public.articles for select using (status = 'published' or author_id = auth.uid() or public.current_editorial_role() in ('owner','admin'));
create policy "Staff can create their drafts" on public.articles for insert to authenticated with check (author_id = auth.uid());
create policy "Authors can edit their drafts" on public.articles for update to authenticated using (author_id = auth.uid() and status = 'draft') with check (author_id = auth.uid() and status = 'draft');
create policy "Only owner and admin can publish" on public.articles for update to authenticated using (public.current_editorial_role() in ('owner','admin')) with check (public.current_editorial_role() in ('owner','admin'));
create policy "Authors and admins can delete" on public.articles for delete to authenticated using (author_id = auth.uid() or public.current_editorial_role() in ('owner','admin'));

create policy "Anyone can subscribe to newsletter" on public.newsletter_subscribers for insert to anon, authenticated with check (length(email) > 3);
create policy "Editors can read newsletter subscribers" on public.newsletter_subscribers for select to authenticated using (public.current_editorial_role() in ('owner','admin'));

create policy "Anyone can record page views" on public.page_views for insert to anon, authenticated with check (length(path) > 0);
create policy "Editors can read page views" on public.page_views for select to authenticated using (public.current_editorial_role() in ('owner','admin'));

create policy "Team can read calendar" on public.calendar_events for select to authenticated using (public.current_editorial_role() in ('owner', 'admin'));
create policy "Team can create calendar events" on public.calendar_events for insert to authenticated with check (public.current_editorial_role() in ('owner', 'admin'));
create policy "Team can update calendar events" on public.calendar_events for update to authenticated using (public.current_editorial_role() in ('owner', 'admin')) with check (public.current_editorial_role() in ('owner', 'admin'));
create policy "Team can delete calendar events" on public.calendar_events for delete to authenticated using (public.current_editorial_role() in ('owner', 'admin'));

create policy "Team can read campaigns" on public.campaigns for select to authenticated using (public.current_editorial_role() in ('owner', 'admin'));
create policy "Team can create campaigns" on public.campaigns for insert to authenticated with check (public.current_editorial_role() in ('owner', 'admin'));
create policy "Team can update campaigns" on public.campaigns for update to authenticated using (public.current_editorial_role() in ('owner', 'admin')) with check (public.current_editorial_role() in ('owner', 'admin'));
create policy "Team can delete campaigns" on public.campaigns for delete to authenticated using (public.current_editorial_role() in ('owner', 'admin'));

insert into storage.buckets (id, name, public) values ('editorial-assets', 'editorial-assets', true)
on conflict (id) do nothing;
create policy "Public can read editorial assets" on storage.objects for select using (bucket_id = 'editorial-assets');
create policy "Editors can upload editorial assets" on storage.objects for insert to authenticated with check (bucket_id = 'editorial-assets' and public.current_editorial_role() in ('owner', 'admin'));
create policy "Authors and admins can update assets" on storage.objects for update to authenticated using (bucket_id = 'editorial-assets' and owner_id = auth.uid()::text);


-- Runway: marcas y fichas editoriales administrables.
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
create policy "Anyone can read runway brands" on public.runway_brands for select using (true);
create policy "Editors can create runway brands" on public.runway_brands for insert to authenticated with check (public.current_editorial_role() in ('owner', 'admin'));
create policy "Editors can update runway brands" on public.runway_brands for update to authenticated using (public.current_editorial_role() in ('owner', 'admin')) with check (public.current_editorial_role() in ('owner', 'admin'));
create policy "Editors can delete runway brands" on public.runway_brands for delete to authenticated using (public.current_editorial_role() in ('owner', 'admin'));


-- Contenido editorial público editable desde el Dashboard.
create table if not exists public.site_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);
alter table public.site_settings enable row level security;
drop policy if exists "Anyone can read public site settings" on public.site_settings;
create policy "Anyone can read public site settings" on public.site_settings for select to anon, authenticated using (key like 'public:%');
drop policy if exists "Editors can create public site settings" on public.site_settings;
create policy "Editors can create public site settings" on public.site_settings for insert to authenticated with check (key like 'public:%' and public.current_editorial_role() in ('owner', 'admin'));
drop policy if exists "Editors can update public site settings" on public.site_settings;
create policy "Editors can update public site settings" on public.site_settings for update to authenticated using (key like 'public:%' and public.current_editorial_role() in ('owner', 'admin')) with check (key like 'public:%' and public.current_editorial_role() in ('owner', 'admin'));

-- Comentarios y colaboraciones enviados desde Business.
create table if not exists public.contact_submissions (
  id uuid primary key default gen_random_uuid(),
  first_name text not null,
  last_name text not null,
  email text not null,
  comment text not null,
  created_at timestamptz not null default now(),
  constraint contact_submissions_first_name_length check (char_length(btrim(first_name)) between 1 and 120),
  constraint contact_submissions_last_name_length check (char_length(btrim(last_name)) between 1 and 120),
  constraint contact_submissions_email_length check (char_length(email) between 3 and 254),
  constraint contact_submissions_email_format check (email ~* '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$'),
  constraint contact_submissions_comment_length check (char_length(btrim(comment)) between 5 and 5000)
);
alter table public.contact_submissions enable row level security;
drop policy if exists "Anyone can submit Business comments" on public.contact_submissions;
create policy "Anyone can submit Business comments" on public.contact_submissions for insert to anon, authenticated with check (
  char_length(btrim(first_name)) between 1 and 120 and char_length(btrim(last_name)) between 1 and 120
  and char_length(email) between 3 and 254
  and email ~* '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$'
  and char_length(btrim(comment)) between 5 and 5000
);
drop policy if exists "Editors can read Business comments" on public.contact_submissions;
create policy "Editors can read Business comments" on public.contact_submissions for select to authenticated
  using (public.current_editorial_role() in ('owner', 'admin'));

grant insert on table public.contact_submissions to anon, authenticated;
grant select on table public.contact_submissions to authenticated;

grant select on table public.site_settings to anon, authenticated;
grant insert, update on table public.site_settings to authenticated;

-- Control editorial de páginas temporalmente cerradas.
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
create policy "Anyone can read page availability" on public.page_availability for select using (true);
create policy "Editors can create page availability" on public.page_availability for insert to authenticated with check (public.current_editorial_role() in ('owner', 'admin'));
create policy "Editors can update page availability" on public.page_availability for update to authenticated using (public.current_editorial_role() in ('owner', 'admin')) with check (public.current_editorial_role() in ('owner', 'admin'));


-- LIGHT incremental editorial permissions and engagement tables (also available as migration).
-- LIGHT: preservación de autoría, permisos de borrado, solicitudes y likes.
-- Ejecutar una sola vez en una base existente, después del schema base.
-- No crea ni modifica tipos ENUM, por lo que evita el error de editorial_role ya existente.

-- Copia el nombre del creador en el artículo para conservar el byline incluso si cambia el perfil.
alter table public.articles add column if not exists author_name text not null default '';
update public.articles a
set author_name = p.display_name
from public.profiles p
where a.author_id = p.id and btrim(a.author_name) = '';

-- Owner/Admin pueden revisar artículos de todo el equipo; el resto solo ve lo publicado
-- y visible o los borradores propios.
drop policy if exists "Visitors can read published articles" on public.articles;
drop policy if exists "Visitors and admins can read eligible articles" on public.articles;
create policy "Visitors and admins can read eligible articles"
on public.articles for select
using (
  (status = 'published' and is_visible = true)
  or author_id = auth.uid()
  or public.current_editorial_role() in ('owner', 'admin')
);

-- El nombre del autor se consulta desde profiles(display_name).
drop policy if exists "Admins can read author profiles" on public.profiles;
create policy "Admins can read author profiles"
on public.profiles for select to authenticated
using (public.current_editorial_role() in ('owner', 'admin'));

-- El autor de una historia se fija al crearla y no puede cambiar en un UPDATE.
create or replace function public.preserve_article_attribution()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.author_id is distinct from old.author_id or new.author_name is distinct from old.author_name then
    raise exception 'La autoría original del artículo no se puede cambiar.' using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists preserve_article_author_id on public.articles;
drop trigger if exists preserve_article_attribution on public.articles;
drop function if exists public.preserve_article_author_id();
create trigger preserve_article_attribution
before update of author_id, author_name on public.articles
for each row execute function public.preserve_article_attribution();

-- La base asigna autor y byline desde el perfil autenticado en todo INSERT editorial.
create or replace function public.set_article_creator()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  creator_name text;
begin
  if auth.uid() is null then
    return new; -- Permite operaciones de mantenimiento desde backend confiable.
  end if;
  if new.author_id is distinct from auth.uid() then
    raise exception 'Un artículo nuevo debe pertenecer a la cuenta que lo crea.' using errcode = '42501';
  end if;
  select display_name into creator_name from public.profiles where id = auth.uid();
  if creator_name is null or btrim(creator_name) = '' then
    raise exception 'La cuenta creadora necesita un nombre editorial en su perfil.';
  end if;
  new.author_name := creator_name;
  return new;
end;
$$;
drop trigger if exists set_article_creator on public.articles;
create trigger set_article_creator
before insert on public.articles
for each row execute function public.set_article_creator();

-- Quita cualquier política DELETE anterior (incluida la antigua que permitía a los
-- autores borrar sus borradores) y vuelve a conceder ese permiso solo a Owner/Admin.
do $$
declare
  existing_policy text;
begin
  for existing_policy in
    select policyname from pg_policies
    where schemaname = 'public' and tablename = 'articles' and cmd = 'DELETE'
  loop
    execute format('drop policy %I on public.articles', existing_policy);
  end loop;
end;
$$;
create policy "Only owner and admin can delete articles"
on public.articles for delete to authenticated
using (public.current_editorial_role() in ('owner', 'admin'));
revoke delete on table public.articles from public, anon;
grant delete on table public.articles to authenticated;

-- Historial de solicitudes de borrado. article_id se conserva como UUID sin FK para
-- mantener la auditoría después de borrar el artículo.
create table if not exists public.article_deletion_requests (
  id uuid primary key default gen_random_uuid(),
  article_id uuid,
  article_title text not null,
  article_slug text,
  requester_id uuid,
  request_note text not null check (length(btrim(request_note)) between 5 and 4000),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  resolution_note text,
  resolved_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  constraint article_deletion_requests_requester_id_fkey
    foreign key (requester_id) references public.profiles(id) on delete set null,
  constraint article_deletion_requests_resolution_check check (
    (status = 'pending' and resolved_at is null and resolved_by is null)
    or (status in ('approved', 'rejected') and resolved_at is not null and resolved_by is not null and length(btrim(coalesce(resolution_note, ''))) >= 5)
  )
);
create unique index if not exists article_deletion_requests_one_pending_per_article
  on public.article_deletion_requests(article_id)
  where status = 'pending' and article_id is not null;
create index if not exists article_deletion_requests_created_at_idx
  on public.article_deletion_requests(created_at desc);
alter table public.article_deletion_requests enable row level security;

drop policy if exists "Authors and admins can read deletion requests" on public.article_deletion_requests;
create policy "Authors and admins can read deletion requests"
on public.article_deletion_requests for select to authenticated
using (
  requester_id = auth.uid()
  or public.current_editorial_role() in ('owner', 'admin')
);
drop policy if exists "Staff can request deletion of own drafts" on public.article_deletion_requests;
create policy "Staff can request deletion of own drafts"
on public.article_deletion_requests for insert to authenticated
with check (
  requester_id = auth.uid()
  and status = 'pending'
  and public.current_editorial_role() = 'staff_writer'
  and exists (
    select 1 from public.articles a
    where a.id = article_id
      and a.author_id = auth.uid()
      and a.status = 'draft'
      and a.title = article_title
      and coalesce(a.slug, '') = coalesce(article_slug, '')
  )
);
revoke all on table public.article_deletion_requests from public, anon, authenticated;
grant select, insert on table public.article_deletion_requests to authenticated;

create or replace function public.resolve_article_deletion_request(
  p_request_id uuid,
  p_resolution_note text,
  p_approve boolean
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  deletion_request public.article_deletion_requests%rowtype;
begin
  if coalesce(public.current_editorial_role()::text, '') not in ('owner', 'admin') then
    raise exception 'Solo Owner/Admin puede resolver solicitudes.' using errcode = '42501';
  end if;
  if p_approve is null then
    raise exception 'Indica si se aprueba o se rechaza la solicitud.';
  end if;
  if length(btrim(coalesce(p_resolution_note, ''))) < 5 then
    raise exception 'Añade un comentario de resolución de al menos cinco caracteres.';
  end if;

  select * into deletion_request
  from public.article_deletion_requests
  where id = p_request_id
  for update;
  if not found then
    raise exception 'No se encontró la solicitud.';
  end if;
  if deletion_request.status <> 'pending' then
    raise exception 'Esta solicitud ya fue resuelta.';
  end if;

  if p_approve then
    delete from public.articles
    where id = deletion_request.article_id
      and author_id = deletion_request.requester_id
      and status = 'draft';
    if not found then
      raise exception 'El borrador ya no está disponible. Rechaza la solicitud con un comentario para conservar el historial.';
    end if;
    update public.article_deletion_requests
    set status = 'approved', resolution_note = btrim(p_resolution_note),
        resolved_by = auth.uid(), resolved_at = now()
    where id = p_request_id;
  else
    update public.article_deletion_requests
    set status = 'rejected', resolution_note = btrim(p_resolution_note),
        resolved_by = auth.uid(), resolved_at = now()
    where id = p_request_id;
  end if;
end;
$$;
revoke all on function public.resolve_article_deletion_request(uuid, text, boolean) from public;
grant execute on function public.resolve_article_deletion_request(uuid, text, boolean) to authenticated;

-- Likes persistidos como una fila única por historia y visitante anónimo.
create table if not exists public.article_likes (
  article_key text not null check (length(btrim(article_key)) between 1 and 200),
  visitor_id uuid not null,
  created_at timestamptz not null default now(),
  primary key (article_key, visitor_id)
);
alter table public.article_likes enable row level security;
revoke all on table public.article_likes from public, anon, authenticated;

drop trigger if exists remove_article_likes_after_article_delete on public.articles;
create or replace function public.remove_article_likes_after_article_delete()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.article_likes where article_key = old.id::text;
  return old;
end;
$$;
create trigger remove_article_likes_after_article_delete
after delete on public.articles
for each row execute function public.remove_article_likes_after_article_delete();

create or replace function public.get_article_like_state(p_article_key text, p_voter_id uuid)
returns table(liked boolean, like_count bigint)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  article_uuid uuid;
begin
  if p_article_key = 'legacy:vestirse-de-futuro' then
    null;
  else
    begin
      article_uuid := p_article_key::uuid;
    exception when invalid_text_representation then
      return query select false, 0::bigint;
      return;
    end;
    if not exists (
      select 1 from public.articles
      where id = article_uuid and status = 'published' and is_visible = true
    ) then
      return query select false, 0::bigint;
      return;
    end if;
  end if;

  return query
  select exists (
           select 1 from public.article_likes
           where article_key = p_article_key and visitor_id = p_voter_id
         ),
         count(*)::bigint
  from public.article_likes
  where article_key = p_article_key;
end;
$$;

create or replace function public.set_article_like(p_article_key text, p_voter_id uuid, p_liked boolean)
returns table(liked boolean, like_count bigint)
language plpgsql
security definer
set search_path = public
as $$
declare
  article_uuid uuid;
begin
  if p_voter_id is null or p_liked is null then
    raise exception 'Falta el identificador del visitante o el estado del like.';
  end if;
  if p_article_key = 'legacy:vestirse-de-futuro' then
    null;
  else
    begin
      article_uuid := p_article_key::uuid;
    exception when invalid_text_representation then
      raise exception 'Artículo inválido.';
    end;
    if not exists (
      select 1 from public.articles
      where id = article_uuid and status = 'published' and is_visible = true
    ) then
      raise exception 'Solo se pueden marcar historias publicadas y visibles.';
    end if;
  end if;

  if p_liked then
    insert into public.article_likes(article_key, visitor_id)
    values (p_article_key, p_voter_id)
    on conflict (article_key, visitor_id) do nothing;
  else
    delete from public.article_likes
    where article_key = p_article_key and visitor_id = p_voter_id;
  end if;

  return query
  select exists (
           select 1 from public.article_likes
           where article_key = p_article_key and visitor_id = p_voter_id
         ),
         count(*)::bigint
  from public.article_likes
  where article_key = p_article_key;
end;
$$;
revoke all on function public.get_article_like_state(text, uuid) from public;
revoke all on function public.set_article_like(text, uuid, boolean) from public;
grant execute on function public.get_article_like_state(text, uuid) to anon, authenticated;
grant execute on function public.set_article_like(text, uuid, boolean) to anon, authenticated;


-- ===========================================================================
-- Incluido también como migración: supabase/migrations/20261110_team_permissions_sync.sql
-- ===========================================================================
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
-- Si hay dos cuentas con el mismo nombre (p. ej. snow@light.studio y snow@moda.studio),
-- la palabra de acceso se asigna a la de @light.studio.
update public.profiles p set login_alias = x.alias
from (
  select distinct on (lower(split_part(u.email, '@', 1))) u.id, lower(split_part(u.email, '@', 1)) as alias
  from auth.users u join public.profiles pr on pr.id = u.id
  where lower(split_part(u.email, '@', 1)) in ('snow', 'songbird', 'moonglow', 'bianca')
  order by lower(split_part(u.email, '@', 1)), (u.email ilike '%@light.studio') desc, pr.created_at
) x
where p.id = x.id and p.login_alias is null
  and not exists (select 1 from public.profiles o where lower(o.login_alias) = x.alias);

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
grant insert on table public.page_views to anon, authenticated;
grant select on table public.page_views to authenticated;

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
returns text language sql immutable set search_path = public as $$
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

-- LIGHT: métricas reales para los contadores del Resumen.
-- 1) Cada campaña guarda canal, presupuesto e indicadores (inversión, impresiones, clics, conversiones, ingresos).
--    Ad spend, Impressions, CTR, ROAS, Revenue y Conversions se calculan a partir de estas columnas.
-- 2) Cada visita guarda un identificador anónimo de navegador para contar usuarios activos (únicos).
-- Idempotente.

alter table public.campaigns add column if not exists channel text not null default 'social';
alter table public.campaigns add column if not exists budget numeric(14,2) not null default 0;
alter table public.campaigns add column if not exists spend numeric(14,2) not null default 0;
alter table public.campaigns add column if not exists impressions bigint not null default 0;
alter table public.campaigns add column if not exists clicks bigint not null default 0;
alter table public.campaigns add column if not exists conversions bigint not null default 0;
alter table public.campaigns add column if not exists revenue numeric(14,2) not null default 0;

do $$ begin
  alter table public.campaigns add constraint campaigns_channel_check check (channel in ('social', 'search', 'email', 'other'));
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.campaigns add constraint campaigns_metrics_non_negative check (budget >= 0 and spend >= 0 and impressions >= 0 and clicks >= 0 and conversions >= 0 and revenue >= 0);
exception when duplicate_object then null; end $$;

alter table public.page_views add column if not exists visitor_id text;
do $$ begin
  alter table public.page_views add constraint page_views_visitor_id_length check (visitor_id is null or char_length(visitor_id) between 8 and 64);
exception when duplicate_object then null; end $$;
create index if not exists page_views_visitor_idx on public.page_views (visitor_id, viewed_at);

-- Resumen agregado de visitas y usuarios únicos de los últimos p_days días, en tu zona horaria.
create or replace function public.page_view_summary(p_days int default 30, p_tz text default 'UTC')
returns table(views bigint, visitors bigint, today_views bigint)
language plpgsql stable security definer set search_path = public
as $$
begin
  if not public.can_dashboard('overview') then
    raise exception 'No tienes acceso al Resumen.' using errcode = '42501';
  end if;
  return query
  select
    count(*)::bigint,
    count(distinct v.visitor_id)::bigint,
    count(*) filter (where (v.viewed_at at time zone p_tz)::date = (now() at time zone p_tz)::date)::bigint
  from public.page_views v
  where (v.viewed_at at time zone p_tz)::date >= (now() at time zone p_tz)::date - (greatest(p_days, 1) - 1);
end;
$$;
revoke all on function public.page_view_summary(int, text) from public;
revoke execute on function public.page_view_summary(int, text) from anon;
grant execute on function public.page_view_summary(int, text) to authenticated;

-- LIGHT: resumen de visitas acotado y honesto.
-- 1) p_days se limita a 1–366 días en ambas funciones.
-- 2) El filtro usa un rango sobre viewed_at (aprovecha page_views_viewed_at_idx) en lugar de convertir cada fila.
-- 3) page_view_summary devuelve untracked_views: visitas registradas antes de que existiera visitor_id,
--    que no se pueden atribuir a un visitante (antes contaban como 0 usuarios).
-- Idempotente.

drop function if exists public.page_view_summary(int, text);

create function public.page_view_summary(p_days int default 30, p_tz text default 'UTC')
returns table(views bigint, visitors bigint, untracked_views bigint, today_views bigint)
language plpgsql stable security definer set search_path = public
as $$
declare
  v_days int := least(greatest(coalesce(p_days, 30), 1), 366);
  v_today date := (now() at time zone p_tz)::date;
  v_from timestamptz := ((v_today - (v_days - 1))::timestamp at time zone p_tz);
  v_today_from timestamptz := (v_today::timestamp at time zone p_tz);
begin
  if not public.can_dashboard('overview') then
    raise exception 'No tienes acceso al Resumen.' using errcode = '42501';
  end if;
  return query
  select
    count(*)::bigint,
    count(distinct v.visitor_id)::bigint,
    count(*) filter (where v.visitor_id is null)::bigint,
    count(*) filter (where v.viewed_at >= v_today_from)::bigint
  from public.page_views v
  where v.viewed_at >= v_from;
end;
$$;
revoke all on function public.page_view_summary(int, text) from public;
revoke execute on function public.page_view_summary(int, text) from anon;
grant execute on function public.page_view_summary(int, text) to authenticated;

-- Serie diaria con el mismo límite y un filtro por rango.
create or replace function public.page_view_stats(p_days int default 15, p_tz text default 'UTC')
returns table(day date, views bigint)
language plpgsql stable security definer set search_path = public
as $$
declare
  v_days int := least(greatest(coalesce(p_days, 15), 1), 366);
  v_today date := (now() at time zone p_tz)::date;
begin
  if not public.can_dashboard('overview') then
    raise exception 'No tienes acceso al Resumen.' using errcode = '42501';
  end if;
  return query
  with days as (
    select generate_series(v_today - (v_days - 1), v_today, interval '1 day')::date as day
  ),
  recent as (
    select (pv.viewed_at at time zone p_tz)::date as day
    from public.page_views pv
    where pv.viewed_at >= ((v_today - (v_days - 1))::timestamp at time zone p_tz)
  )
  select d.day, count(r.day)::bigint
  from days d
  left join recent r on r.day = d.day
  group by d.day order by d.day;
end;
$$;
revoke all on function public.page_view_stats(int, text) from public;
revoke execute on function public.page_view_stats(int, text) from anon;
grant execute on function public.page_view_stats(int, text) to authenticated;
