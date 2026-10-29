-- Phase 6: approved counselors go live automatically once their profile is complete.
--
-- A profile is complete with: a photo, an introduction (summary and about), at least one focus area,
-- a fee for each session length they offer, and some weekly hours. Whenever any of those change, the
-- counselor's is_published flag is recalculated, so they appear in (or leave) the directory by themselves.

-- What's still missing, as short keys the portal turns into a checklist.
create function public.counselor_missing(c public.counselors) returns text[]
language sql stable security definer set search_path = public as $$
  select array_remove(array[
    case when coalesce((select avatar_url from profiles where id = c.id), '') = '' then 'photo' end,
    case when trim(c.summary) = '' or trim(c.about) = '' then 'introduction' end,
    case when not exists (select 1 from counselor_focus_areas where counselor_id = c.id) then 'focus' end,
    case when (c.offers_30 and c.fee_30_cents <= 0) or (c.offers_60 and c.fee_60_cents <= 0) then 'fees' end,
    case when not exists (select 1 from availability_rules where counselor_id = c.id) then 'hours' end
  ], null);
$$;

-- For the portal checklist: the signed-in counselor's missing items.
create function public.my_go_live_checklist() returns text[]
language sql stable security definer set search_path = public as $$
  select public.counselor_missing(c) from counselors c where c.id = auth.uid();
$$;

-- Recalculate on every change to the counselor row.
create function public.counselor_set_published() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  new.is_published := cardinality(public.counselor_missing(new)) = 0;
  new.updated_at := now();
  return new;
end;
$$;

create trigger counselor_set_published
  before update on public.counselors
  for each row execute function public.counselor_set_published();

-- Focus areas, hours and photos live in other tables; touching the counselor row re-runs the check above.
create function public.touch_counselor() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  cid uuid;
begin
  if tg_table_name = 'profiles' then
    cid := new.id;
  elsif tg_op = 'DELETE' then
    cid := old.counselor_id;
  else
    cid := new.counselor_id;
  end if;
  update counselors set updated_at = now() where id = cid;
  return null;
end;
$$;

create trigger focus_touches_counselor
  after insert or update or delete on public.counselor_focus_areas
  for each row execute function public.touch_counselor();

create trigger hours_touch_counselor
  after insert or update or delete on public.availability_rules
  for each row execute function public.touch_counselor();

create trigger photo_touches_counselor
  after update of avatar_url on public.profiles
  for each row execute function public.touch_counselor();

revoke execute on function public.counselor_missing(public.counselors) from public, anon;
revoke execute on function public.my_go_live_checklist() from public, anon;
grant execute on function public.my_go_live_checklist() to authenticated;
