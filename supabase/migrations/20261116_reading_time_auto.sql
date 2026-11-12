-- LIGHT: tiempo de lectura automático por artículo.
-- reading_time_auto = true → el Dashboard recalcula el tiempo con las palabras en cada guardado.
-- Se marca automático lo que venía del valor fijo antiguo ("8 min de lectura" o vacío) y lo que ya
-- coincide con el cálculo; un valor distinto (p. ej. "6 min" en un texto de 2 min) se respeta como manual.
-- Además se recalcula ya el texto de los artículos automáticos. Idempotente.

alter table public.articles add column if not exists reading_time_auto boolean not null default true;

create or replace function public.article_reading_minutes(p_title text, p_excerpt text, p_lead text, p_blocks jsonb)
returns int language sql immutable set search_path = public as $$
  select greatest(1, round((
    select count(*) from regexp_matches(
      concat_ws(' ', p_title, p_excerpt, p_lead, (
        select string_agg(b->>'content', ' ')
        from jsonb_array_elements(case when jsonb_typeof(p_blocks) = 'array' then p_blocks else '[]'::jsonb end) b
        where b->>'type' in ('paragraph', 'heading', 'quote'))),
      '[[:alnum:]’'']+', 'g')
  ) / 220.0))::int
$$;

update public.articles a set reading_time_auto = (
  coalesce(nullif(btrim(a.reading_time), ''), '8 min de lectura') = '8 min de lectura'
  or btrim(a.reading_time) = public.article_reading_minutes(a.title, a.excerpt, a.lead, a.page_blocks) || ' min de lectura'
);

update public.articles a
set reading_time = public.article_reading_minutes(a.title, a.excerpt, a.lead, a.page_blocks) || ' min de lectura'
where a.reading_time_auto
  and a.reading_time is distinct from public.article_reading_minutes(a.title, a.excerpt, a.lead, a.page_blocks) || ' min de lectura';
