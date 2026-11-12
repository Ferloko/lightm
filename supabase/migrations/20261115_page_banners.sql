-- LIGHT: nuevo apartado del Dashboard "Banners" (imagen de cabecera de cada hoja pública).
-- Se guarda en site_settings bajo la clave public:page-banners y tiene su propio permiso Ver/Editar.
-- Valores iniciales como el resto: Admin ve y edita; Staff Writer solo ve. Idempotente.

insert into public.dashboard_permissions (role, section, can_view, can_edit)
values ('admin', 'banners', true, true), ('staff_writer', 'banners', true, false)
on conflict (role, section) do nothing;

create or replace function public.site_setting_section(p_key text)
returns text language sql immutable set search_path = public as $$
  select case p_key
    when 'public:masthead-team' then 'masthead'
    when 'public:homepage-feature' then 'homepage-feature'
    when 'public:archive-placements' then 'homepage-feature'
    when 'public:magazine-editions' then 'editions'
    when 'public:page-banners' then 'banners'
    else 'team' -- claves desconocidas: solo Owner o quien gestione Equipo
  end
$$;

create or replace function public.my_dashboard_permissions()
returns table(section text, can_view boolean, can_edit boolean)
language sql stable security definer set search_path = public
as $$
  select s.section, public.can_dashboard(s.section, 'view'), public.can_dashboard(s.section, 'edit')
  from (values ('overview'), ('editions'), ('runway'), ('masthead'), ('homepage-feature'), ('banners'), ('coming-soon'),
               ('calendar'), ('campaigns'), ('subscribers'), ('comments'), ('deletion-requests'), ('team')) as s(section)
$$;
