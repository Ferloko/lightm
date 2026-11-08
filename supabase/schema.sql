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

create policy "Editors can read their profile" on public.profiles for select to authenticated using (id = auth.uid());
create policy "Visitors can read published articles" on public.articles for select using (status = 'published' or author_id = auth.uid());
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
