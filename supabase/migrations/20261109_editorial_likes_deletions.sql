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
