-- Phase 18: linking counselors to their church.
--
-- FaithWellness admins choose (or change) a counselor's church, usually when approving them. Counselors then
-- choose whether sessions are free for that church's verified members (member care). The church shows up on
-- their profile, and in the church's dashboard under its counselors.

/** Admins set or clear a counselor's church. */
create function public.set_counselor_church(p_counselor uuid, p_church uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Admins only'; end if;
  update counselors set church_id = p_church,
         -- Member care only makes sense with a church.
         free_for_members = case when p_church is null then false else free_for_members end
   where id = p_counselor;
  if not found then raise exception 'Counselor not found'; end if;
end;
$$;

revoke execute on function public.set_counselor_church(uuid, uuid) from public, anon;
grant execute on function public.set_counselor_church(uuid, uuid) to authenticated;

-- Counselors decide whether their church's members book free.
grant update (free_for_members) on public.counselors to authenticated;

/** For the admin review: the counselor (if approved) and their current church, by application. */
create function public.counselor_church_for_application(p_application uuid) returns uuid
language sql stable security definer set search_path = public as $$
  select c.church_id from counselor_applications a join counselors c on c.id = a.user_id
  where a.id = p_application and public.is_admin();
$$;
revoke execute on function public.counselor_church_for_application(uuid) from public, anon;
grant execute on function public.counselor_church_for_application(uuid) to authenticated;
