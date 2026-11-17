-- LIGHT: los Staff Writers pueden VER (no editar) los borradores que crean Owner y Admin.
-- La edición sigue igual: cada autor sus borradores; Owner/Admin todo. Idempotente.

create or replace function public.is_editorial_lead(p_user uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = p_user and role in ('owner', 'admin'))
$$;
revoke all on function public.is_editorial_lead(uuid) from public, anon;
grant execute on function public.is_editorial_lead(uuid) to authenticated;

drop policy if exists "Visitors and admins can read eligible articles" on public.articles;
create policy "Visitors and admins can read eligible articles" on public.articles for select
  using (
    ((status = 'published'::article_status) and (is_visible = true))
    or (author_id = auth.uid())
    or (public.current_editorial_role() = any (array['owner'::editorial_role, 'admin'::editorial_role]))
    or (public.current_editorial_role() = 'staff_writer'::editorial_role and public.is_editorial_lead(author_id))
  );
