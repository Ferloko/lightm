-- LIGHT: completar la estructura editorial de articles.
-- Ejecutar en Supabase SQL Editor si la base se creó con una versión anterior del esquema.

alter table public.articles
  add column if not exists is_visible boolean not null default true;

alter table public.articles
  add column if not exists is_featured boolean not null default false;

alter table public.articles
  add column if not exists featured_order integer not null default 99;

notify pgrst, 'reload schema';
