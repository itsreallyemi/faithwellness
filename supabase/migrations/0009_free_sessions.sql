-- Phase 9: counselors can offer a session length for free.
--
-- A fee of $0 used to mean "not set yet", which kept free counselors from going live. Now each length
-- has its own "free" switch: a length is ready when it has a fee above $0 or is marked free.

alter table public.counselors
  add column free_30 boolean not null default false,
  add column free_60 boolean not null default false;

grant update (free_30, free_60) on public.counselors to authenticated;

create or replace function public.counselor_missing(c public.counselors) returns text[]
language sql stable security definer set search_path = public as $$
  select array_remove(array[
    case when trim(c.summary) = '' or trim(c.about) = '' then 'introduction' end,
    case when not exists (select 1 from counselor_focus_areas where counselor_id = c.id) then 'focus' end,
    case when (c.offers_30 and c.fee_30_cents <= 0 and not c.free_30)
           or (c.offers_60 and c.fee_60_cents <= 0 and not c.free_60) then 'fees' end,
    case when not exists (select 1 from availability_rules where counselor_id = c.id) then 'hours' end
  ], null);
$$;

-- Sample counselors already listed with a $0 fee meant it as free (James Whitfield's 30-minute check-ins).
alter table public.counselors disable trigger counselor_set_published;
update public.counselors set free_30 = true where is_published and offers_30 and fee_30_cents = 0;
update public.counselors set free_60 = true where is_published and offers_60 and fee_60_cents = 0;
alter table public.counselors enable trigger counselor_set_published;
