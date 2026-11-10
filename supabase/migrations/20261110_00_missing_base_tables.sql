-- LIGHT: tablas del esquema base que pueden faltar en bases creadas solo con migraciones.
-- Sin ellas, Calendario, Campañas, Suscriptores y Visitas no se guardaban en Supabase.
-- Idempotente. Ejecutar antes de 20261110_team_permissions_sync.sql.

create table if not exists public.newsletter_subscribers (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  source text not null default 'home',
  subscribed_at timestamptz not null default now()
);

create table if not exists public.page_views (
  id uuid primary key default gen_random_uuid(),
  path text not null,
  viewed_at timestamptz not null default now()
);

create table if not exists public.calendar_events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null default '',
  start_at timestamptz not null,
  end_at timestamptz,
  all_day boolean not null default true,
  color text not null default 'acid',
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.campaigns (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text not null default '',
  start_date date not null,
  end_date date not null,
  color text not null default 'acid',
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint campaigns_valid_range check (end_date >= start_date)
);

alter table public.newsletter_subscribers enable row level security;
alter table public.page_views enable row level security;
alter table public.calendar_events enable row level security;
alter table public.campaigns enable row level security;
