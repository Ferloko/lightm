-- LIGHT: hoja "Living" en el Dashboard, bloque "Cartas de estilo" en Destacado y retirada de la Newsletter.
-- 1) Living se guarda en site_settings (clave public:living-guide) con su propio permiso Ver/Editar.
--    Valores iniciales como el resto: Admin ve y edita; Staff Writer solo ve.
-- 2) "Cartas de estilo" (public:homepage-voices) pertenece al apartado Destacado.
-- 3) La Newsletter deja de existir: se quita el apartado "Suscriptores" y nadie puede suscribirse.
--    La tabla newsletter_subscribers y sus correos NO se borran (por si quieres exportarlos);
--    para eliminarlos del todo: drop table public.newsletter_subscribers;
-- Idempotente.

insert into public.dashboard_permissions (role, section, can_view, can_edit)
values ('admin', 'living', true, true), ('staff_writer', 'living', true, false)
on conflict (role, section) do nothing;

delete from public.dashboard_permissions where section = 'subscribers';

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
    else 'team' -- claves desconocidas: solo Owner o quien gestione Equipo
  end
$$;

create or replace function public.my_dashboard_permissions()
returns table(section text, can_view boolean, can_edit boolean)
language sql stable security definer set search_path = public
as $$
  select s.section, public.can_dashboard(s.section, 'view'), public.can_dashboard(s.section, 'edit')
  from (values ('overview'), ('editions'), ('runway'), ('living'), ('masthead'), ('homepage-feature'), ('banners'), ('coming-soon'),
               ('calendar'), ('campaigns'), ('comments'), ('deletion-requests'), ('team')) as s(section)
$$;

-- Sin formulario público: se cierra la inserción anónima de suscriptores.
drop policy if exists "Anyone can subscribe to newsletter" on public.newsletter_subscribers;
revoke insert on table public.newsletter_subscribers from anon, authenticated;

-- La página /newsletter ya no existe.
delete from public.page_availability where path = '/newsletter';
