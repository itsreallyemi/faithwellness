-- Phase 8: photos become optional for going live, and in-person services get a location and travel terms.
--
-- Some ministers would rather not show their face publicly, so a profile can go live without a photo
-- (the directory shows their initials). Services like weddings and funerals happen in person, so counselors
-- say where they're based, how far they'll travel, and whether travel costs extra.

alter table public.counselors
  add column service_area text not null default '',              -- e.g. "Pasadena, CA"
  add column travel text not null default 'none' check (travel in ('none', 'radius', 'anywhere')),
  add column travel_miles int check (travel_miles is null or travel_miles > 0),
  add column travel_fee text not null default 'none' check (travel_fee in ('none', 'fixed', 'per_mile', 'ask')),
  add column travel_fee_cents int not null default 0 check (travel_fee_cents >= 0);

grant update (service_area, travel, travel_miles, travel_fee, travel_fee_cents) on public.counselors to authenticated;

-- Same checklist as before, without the photo.
create or replace function public.counselor_missing(c public.counselors) returns text[]
language sql stable security definer set search_path = public as $$
  select array_remove(array[
    case when trim(c.summary) = '' or trim(c.about) = '' then 'introduction' end,
    case when not exists (select 1 from counselor_focus_areas where counselor_id = c.id) then 'focus' end,
    case when (c.offers_30 and c.fee_30_cents <= 0) or (c.offers_60 and c.fee_60_cents <= 0) then 'fees' end,
    case when not exists (select 1 from availability_rules where counselor_id = c.id) then 'hours' end
  ], null);
$$;

-- Republish anyone who was only waiting on a photo.
update public.counselors set updated_at = now() where not is_published;

-- Sample data only: skip the go-live recalculation, so samples with a free 30-minute session ($0 fee) stay listed.
alter table public.counselors disable trigger counselor_set_published;

-- Sample counselors are based where their church is.
update public.counselors c set service_area = ch.city
from public.churches ch
where ch.id = c.church_id and c.service_area = '';

update public.counselors set travel = 'radius', travel_miles = 50, travel_fee = 'fixed', travel_fee_cents = 5000
where slug in ('ruth-okafor', 'james-whitfield');

alter table public.counselors enable trigger counselor_set_published;
