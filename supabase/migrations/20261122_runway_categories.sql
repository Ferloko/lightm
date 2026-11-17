-- Runway: categorías editables (Ready-to-Wear, Alta costura…) en site_settings
-- (public:runway-categories, sección del Dashboard "runway") y la categoría de cada firma.
alter table public.runway_brands add column if not exists category_id text not null default '';
update public.runway_brands set category_id = 'ready-to-wear' where category_id = '';

create or replace function public.site_setting_section(p_key text)
returns text language sql immutable set search_path = public as $$
  select case p_key
    when 'public:masthead-team' then 'masthead'
    when 'public:homepage-feature' then 'homepage-feature'
    when 'public:homepage-voices' then 'homepage-feature'
    when 'public:archive-placements' then 'homepage-feature'
    when 'public:magazine-editions' then 'editions'
    when 'public:page-banners' then 'banners'
    when 'public:living-guide' then 'living'
    when 'public:runway-categories' then 'runway'
    else 'team'
  end
$$;
