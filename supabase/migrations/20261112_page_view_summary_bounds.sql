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
