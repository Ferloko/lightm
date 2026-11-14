-- LIGHT: vuelven los Suscriptores (la portada recoge correos de quienes siguen a LIGHT).
-- Deshace la parte de 20261118 que cerraba las altas y quitaba el apartado "Suscriptores".
-- Valores como al principio: Admin ve y edita; Staff Writer solo ve. Idempotente.

insert into public.dashboard_permissions (role, section, can_view, can_edit)
values ('admin', 'subscribers', true, true), ('staff_writer', 'subscribers', true, false)
on conflict (role, section) do nothing;

create or replace function public.my_dashboard_permissions()
returns table(section text, can_view boolean, can_edit boolean)
language sql stable security definer set search_path = public
as $$
  select s.section, public.can_dashboard(s.section, 'view'), public.can_dashboard(s.section, 'edit')
  from (values ('overview'), ('editions'), ('runway'), ('living'), ('masthead'), ('homepage-feature'), ('banners'), ('coming-soon'),
               ('calendar'), ('campaigns'), ('subscribers'), ('comments'), ('deletion-requests'), ('team')) as s(section)
$$;

drop policy if exists "Anyone can subscribe to newsletter" on public.newsletter_subscribers;
create policy "Anyone can subscribe to newsletter" on public.newsletter_subscribers for insert to anon, authenticated
  with check (char_length(email) between 3 and 254 and email ~* '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$');
grant insert on table public.newsletter_subscribers to anon, authenticated;
