-- Phase 3: table access and sign-up.
--
-- The project has "Automatically expose new tables" turned off, so nothing is reachable through the
-- Data API until it is granted here. Row Level Security (0001) then decides which rows each person sees.

grant usage on schema public to anon, authenticated;

-- Directory: anyone may read; RLS limits it to published counselors.
grant select on public.churches, public.focus_areas to anon, authenticated;
grant select on public.counselors, public.credentials, public.counselor_focus_areas, public.availability_rules
  to anon, authenticated;
grant select on public.profiles to anon, authenticated;
grant execute on function public.is_published_counselor(uuid) to anon, authenticated;

-- People edit only their own safe columns. Role, slug, church and publishing are set by FaithWellness,
-- so a client can't make themselves a counselor and a counselor can't publish themselves.
grant update (full_name, avatar_url, time_zone) on public.profiles to authenticated;
grant update (
  preferred_name, title, years_ministry, languages, summary, about, approach, verse, verse_ref, help_with,
  fee_30_cents, fee_60_cents, offers_30, offers_60, sliding_scale, fee_note, avatar_tint, updated_at
) on public.counselors to authenticated;
grant insert, update, delete on public.credentials, public.counselor_focus_areas, public.availability_rules
  to authenticated;

-- Every new sign-in account gets a client profile. Counselors are upgraded after FaithWellness approves them.
create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, role, full_name)
  values (new.id, 'client', coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', ''))
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
