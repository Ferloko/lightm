-- LIGHT: estadísticas por artículo (impresiones, clics por origen, lectura, tiempo y compartidos).
-- Los eventos son anónimos: solo un identificador aleatorio por navegador (el mismo de page_views).
-- El público solo puede INSERTAR eventos; nadie los lee directamente: el Dashboard usa article_stats().
-- Idempotente.

create table if not exists public.article_events (
  id bigint generated always as identity primary key,
  article_key text not null check (char_length(article_key) between 1 and 200), -- slug o id del artículo
  event text not null check (event in ('impression', 'click', 'read_50', 'read_100', 'share', 'time')),
  source text check (source is null or char_length(source) between 1 and 40),  -- dónde estaba la tarjeta
  visitor_id uuid,
  value integer check (value is null or value between 0 and 3600),              -- segundos (evento 'time')
  created_at timestamptz not null default now()
);

create index if not exists article_events_key_created_idx on public.article_events (lower(article_key), created_at);
create index if not exists article_events_created_idx on public.article_events (created_at);
create index if not exists page_views_lower_path_idx on public.page_views (lower(path));

alter table public.article_events enable row level security;
revoke all on table public.article_events from public, anon, authenticated;
grant insert on table public.article_events to anon, authenticated;

drop policy if exists "Anyone can record article events" on public.article_events;
create policy "Anyone can record article events" on public.article_events
  for insert to anon, authenticated with check (true);

-- Estadísticas de los últimos p_days días por artículo. Solo para quien puede ver el Resumen.
-- Une eventos y visitas por slug o id sin distinguir mayúsculas (/historias/Test2 = /historias/test2).
create or replace function public.article_stats(p_days int default 30)
returns table(
  article_id uuid,
  impressions bigint,
  clicks bigint,
  views bigint,
  visitors bigint,
  reads_50 bigint,
  reads_100 bigint,
  avg_seconds numeric,
  shares bigint,
  likes bigint,
  click_sources jsonb
)
language plpgsql stable security definer set search_path = public
as $$
declare
  v_from timestamptz := now() - make_interval(days => least(greatest(coalesce(p_days, 30), 1), 366));
begin
  if not public.can_dashboard('overview') then
    raise exception 'No tienes permiso para ver las estadísticas.' using errcode = '42501';
  end if;

  return query
  with keys as (
    select distinct a.id, k.key
    from public.articles a
    cross join lateral (values (lower(nullif(btrim(a.slug), ''))), (a.id::text)) as k(key)
    where k.key is not null
  ),
  ev as (
    select k.id, e.event, e.source, e.value
    from public.article_events e
    join keys k on lower(e.article_key) = k.key
    where e.created_at >= v_from
  ),
  ev_totals as (
    select ev.id,
      count(*) filter (where ev.event = 'impression') as impressions,
      count(*) filter (where ev.event = 'click') as clicks,
      count(*) filter (where ev.event = 'read_50') as reads_50,
      count(*) filter (where ev.event = 'read_100') as reads_100,
      count(*) filter (where ev.event = 'share') as shares,
      coalesce(sum(ev.value) filter (where ev.event = 'time'), 0) as seconds
    from ev group by ev.id
  ),
  sources as (
    select s.id, jsonb_object_agg(s.source, s.n) as click_sources
    from (select ev.id, coalesce(ev.source, 'otro') as source, count(*) as n from ev where ev.event = 'click' group by 1, 2) s
    group by s.id
  ),
  pv as (
    select k.id, count(*) as views, count(distinct p.visitor_id) as visitors
    from public.page_views p
    join keys k on lower(p.path) = '/historias/' || k.key
    where p.viewed_at >= v_from
    group by k.id
  ),
  lk as (
    select l.article_key, count(*) as likes from public.article_likes l group by l.article_key
  )
  select a.id,
    coalesce(t.impressions, 0), coalesce(t.clicks, 0), coalesce(pv.views, 0), coalesce(pv.visitors, 0),
    coalesce(t.reads_50, 0), coalesce(t.reads_100, 0),
    case when coalesce(pv.views, 0) > 0 then round(coalesce(t.seconds, 0)::numeric / pv.views, 0) else 0 end,
    coalesce(t.shares, 0), coalesce(lk.likes, 0), coalesce(s.click_sources, '{}'::jsonb)
  from public.articles a
  left join ev_totals t on t.id = a.id
  left join sources s on s.id = a.id
  left join pv on pv.id = a.id
  left join lk on lk.article_key = a.id::text
  where a.status = 'published';
end;
$$;

revoke all on function public.article_stats(int) from public, anon;
grant execute on function public.article_stats(int) to authenticated;
