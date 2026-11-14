-- LIGHT: el nombre del autor se pone solo (el de la cuenta que crea el artículo) y Owner/Admin
-- pueden cambiarlo. La cuenta creadora (author_id) sigue sin poder cambiarse: de ella dependen
-- los permisos sobre borradores y la atribución interna. Idempotente.

create or replace function public.preserve_article_attribution()
returns trigger language plpgsql set search_path = public as $$
begin
  if new.author_id is distinct from old.author_id then
    raise exception 'La cuenta creadora del artículo no se puede cambiar.' using errcode = '42501';
  end if;
  if new.author_name is distinct from old.author_name then
    if auth.uid() is not null and coalesce(public.current_editorial_role()::text, '') not in ('owner', 'admin') then
      raise exception 'Solo Owner y Admin pueden cambiar el nombre del autor.' using errcode = '42501';
    end if;
    if btrim(coalesce(new.author_name, '')) = '' then
      raise exception 'El nombre del autor no puede quedar vacío.' using errcode = '23514';
    end if;
    new.author_name := btrim(new.author_name);
  end if;
  return new;
end;
$$;

create or replace function public.set_article_creator()
returns trigger language plpgsql security definer set search_path = public as $$
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
  -- Por defecto, el nombre de la cuenta. Owner/Admin pueden dejar otro desde el principio.
  if public.current_editorial_role() in ('owner', 'admin') and btrim(coalesce(new.author_name, '')) <> '' then
    new.author_name := btrim(new.author_name);
  else
    new.author_name := creator_name;
  end if;
  return new;
end;
$$;
