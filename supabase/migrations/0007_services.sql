-- Phase 7: services beyond counseling sessions (weddings, funerals, premarital counseling…).
--
-- Counselors pick services from a shared list (or add their own), each with its own pricing. Clients don't
-- book a time slot for these: they send a request with a date, place and details, and the counselor accepts
-- or declines with a message. All request changes go through the functions at the bottom.

create table public.service_types (
  slug text primary key,
  label text not null,
  sort int not null default 0
);

insert into public.service_types (slug, label, sort) values
  ('wedding', 'Weddings', 10),
  ('vow-renewal', 'Vow renewals', 20),
  ('premarital', 'Premarital counseling', 30),
  ('funeral', 'Funerals and memorials', 40),
  ('baby-dedication', 'Baby dedications and blessings', 50),
  ('baptism', 'Baptisms', 60),
  ('hospital-visit', 'Hospital and hospice visits', 70),
  ('home-blessing', 'Home and business blessings', 80),
  ('spiritual-direction', 'Spiritual direction', 90),
  ('prayer', 'Prayer sessions', 100),
  ('mediation', 'Family mediation', 110),
  ('speaking', 'Speaking and workshops', 120),
  ('guest-preaching', 'Guest preaching', 130)
on conflict (slug) do update set label = excluded.label, sort = excluded.sort;

create table public.counselor_services (
  id uuid primary key default gen_random_uuid(),
  counselor_id uuid not null references public.counselors (id) on delete cascade,
  service_slug text references public.service_types (slug) on delete cascade,  -- null for their own "Other" services
  custom_name text not null default '',
  -- fixed: "$300" · from: "From $300" · honorarium: "Honorarium" (suggested amount optional) · ask: "Ask for pricing"
  pricing text not null default 'ask' check (pricing in ('fixed', 'from', 'honorarium', 'ask')),
  price_cents int not null default 0 check (price_cents >= 0),
  note text not null default '',
  sort int not null default 0,
  check (service_slug is not null or trim(custom_name) <> ''),
  unique (counselor_id, service_slug)
);
create index on public.counselor_services (counselor_id);

create type public.service_request_status as enum ('new', 'accepted', 'declined', 'withdrawn');

create table public.service_requests (
  id uuid primary key default gen_random_uuid(),
  counselor_id uuid not null references public.counselors (id) on delete cascade,
  client_id uuid not null references public.profiles (id) on delete cascade,
  counselor_service_id uuid references public.counselor_services (id) on delete set null,
  service_name text not null,          -- kept as sent, even if the counselor later renames or removes the service
  client_name text not null,           -- shared with the counselor so they can reply
  client_email text not null,
  preferred_date date,
  flexible boolean not null default false,
  location text not null default '',
  details text not null default '',
  status public.service_request_status not null default 'new',
  counselor_reply text not null default '',
  created_at timestamptz not null default now(),
  responded_at timestamptz
);
create index on public.service_requests (counselor_id, status, created_at);
create index on public.service_requests (client_id, created_at);

alter table public.service_types enable row level security;
alter table public.counselor_services enable row level security;
alter table public.service_requests enable row level security;

create policy "service_types: public read" on public.service_types for select using (true);
create policy "counselor_services: read" on public.counselor_services
  for select using (public.is_published_counselor(counselor_id) or counselor_id = auth.uid());
create policy "counselor_services: add own" on public.counselor_services
  for insert with check (counselor_id = auth.uid());
create policy "counselor_services: change own" on public.counselor_services
  for update using (counselor_id = auth.uid()) with check (counselor_id = auth.uid());
create policy "counselor_services: remove own" on public.counselor_services
  for delete using (counselor_id = auth.uid());
create policy "service_requests: read own" on public.service_requests
  for select using (client_id = auth.uid() or counselor_id = auth.uid());

grant select on public.service_types, public.counselor_services to anon, authenticated;
grant insert, update, delete on public.counselor_services to authenticated;
grant select on public.service_requests to authenticated;

-- Client: request a service from a published counselor.
create function public.request_service(
  p_service uuid, p_date date, p_flexible boolean, p_location text, p_details text
) returns public.service_requests
language plpgsql security definer set search_path = public as $$
declare
  me uuid := auth.uid();
  svc record;
  who record;
  result public.service_requests;
begin
  if me is null then raise exception 'Not signed in'; end if;
  select cs.id, cs.counselor_id, coalesce(st.label, cs.custom_name) as name into svc
  from counselor_services cs
  join counselors c on c.id = cs.counselor_id and c.is_published
  left join service_types st on st.slug = cs.service_slug
  where cs.id = p_service;
  if svc.id is null then raise exception 'Service not found'; end if;
  if svc.counselor_id = me then raise exception 'You can''t request your own service'; end if;
  if coalesce(trim(p_details), '') = '' then raise exception 'Add a few details'; end if;

  select p.full_name, u.email into who from profiles p join auth.users u on u.id = p.id where p.id = me;

  insert into service_requests (counselor_id, client_id, counselor_service_id, service_name, client_name, client_email,
                                preferred_date, flexible, location, details)
  values (svc.counselor_id, me, svc.id, svc.name, coalesce(nullif(trim(who.full_name), ''), 'A FaithWellness member'),
          coalesce(who.email, ''), p_date, coalesce(p_flexible, false), trim(coalesce(p_location, '')), trim(p_details))
  returning * into result;
  return result;
end;
$$;

-- Counselor: accept or decline a new request, with a message the client sees.
create function public.respond_to_service_request(p_id uuid, p_status public.service_request_status, p_reply text)
returns public.service_requests
language plpgsql security definer set search_path = public as $$
declare
  result public.service_requests;
begin
  if p_status not in ('accepted', 'declined') then raise exception 'Unknown response'; end if;
  if coalesce(trim(p_reply), '') = '' then raise exception 'Add a message for them'; end if;
  update service_requests set status = p_status, counselor_reply = trim(p_reply), responded_at = now()
  where id = p_id and counselor_id = auth.uid() and status = 'new'
  returning * into result;
  if result.id is null then raise exception 'Request not found or already answered'; end if;
  return result;
end;
$$;

-- Client: withdraw a request that's waiting or accepted.
create function public.withdraw_service_request(p_id uuid) returns public.service_requests
language plpgsql security definer set search_path = public as $$
declare
  result public.service_requests;
begin
  update service_requests set status = 'withdrawn', responded_at = coalesce(responded_at, now())
  where id = p_id and client_id = auth.uid() and status in ('new', 'accepted')
  returning * into result;
  if result.id is null then raise exception 'Request not found'; end if;
  return result;
end;
$$;

revoke execute on function public.request_service(uuid, date, boolean, text, text) from public, anon;
revoke execute on function public.respond_to_service_request(uuid, public.service_request_status, text) from public, anon;
revoke execute on function public.withdraw_service_request(uuid) from public, anon;
grant execute on function public.request_service(uuid, date, boolean, text, text) to authenticated;
grant execute on function public.respond_to_service_request(uuid, public.service_request_status, text) to authenticated;
grant execute on function public.withdraw_service_request(uuid) to authenticated;

-- Sample services for the six fictional counselors, so the directory filter has something to show.
insert into public.counselor_services (counselor_id, service_slug, pricing, price_cents, note, sort)
select c.id, v.slug, v.pricing, v.cents, v.note, v.sort
from (values
  ('ruth-okafor', 'wedding', 'honorarium', 30000, 'Includes two planning meetings and the rehearsal.', 1),
  ('ruth-okafor', 'premarital', 'fixed', 24000, 'Four sessions using the Prepare/Enrich inventory.', 2),
  ('ruth-okafor', 'funeral', 'honorarium', 0, 'For families in and beyond Grace Fellowship.', 3),
  ('ruth-okafor', 'hospital-visit', 'ask', 0, 'Pasadena area.', 4),
  ('james-whitfield', 'funeral', 'honorarium', 25000, '', 1),
  ('james-whitfield', 'wedding', 'from', 35000, '', 2),
  ('james-whitfield', 'baby-dedication', 'ask', 0, '', 3),
  ('james-whitfield', 'guest-preaching', 'ask', 0, 'Happy to fill the pulpit for a Sunday or a revival week.', 4),
  ('daniela-mercado', 'premarital', 'fixed', 60000, 'Six sessions, including a session on family of origin.', 1),
  ('daniela-mercado', 'mediation', 'from', 15000, 'Per session. Bilingual: English and Spanish.', 2),
  ('sarah-park', 'speaking', 'ask', 0, 'Trauma-informed care training for church staff and volunteers.', 1),
  ('abigail-nwosu', 'speaking', 'from', 50000, 'Stewardship and debt-freedom workshops for churches and small groups.', 1),
  ('abigail-nwosu', 'premarital', 'fixed', 18000, 'Two sessions on money, budgeting and generosity as a couple.', 2),
  ('miriam-levy-cole', 'speaking', 'ask', 0, 'Talks on faith and mental health for congregations and leaders.', 1),
  ('miriam-levy-cole', 'mediation', 'from', 20000, 'Per session, for families and ministry teams.', 2)
) as v(counselor, slug, pricing, cents, note, sort)
join public.counselors c on c.slug = v.counselor
on conflict (counselor_id, service_slug) do nothing;
