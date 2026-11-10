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
