-- Menú lateral (imagen y textos) editable en Dashboard → Destacado: public:site-menu.
create or replace function public.site_setting_section(p_key text)
returns text language sql immutable set search_path = public as $$
  select case p_key
    when 'public:masthead-team' then 'masthead'
    when 'public:homepage-feature' then 'homepage-feature'
    when 'public:homepage-voices' then 'homepage-feature'
    when 'public:archive-placements' then 'homepage-feature'
    when 'public:site-menu' then 'homepage-feature'
    when 'public:magazine-editions' then 'editions'
    when 'public:page-banners' then 'banners'
    when 'public:living-guide' then 'living'
    when 'public:runway-categories' then 'runway'
    else 'team'
  end
$$;
