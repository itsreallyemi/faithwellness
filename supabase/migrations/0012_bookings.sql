-- Phase 12: real bookings.
--
-- The server creates bookings (after re-checking Google Calendar) and writes the Google event with its Meet link
-- and rest block, so clients and counselors only read here. The database itself refuses double bookings:
-- two confirmed sessions for the same counselor can't overlap, counting the 15-minute rest after each.

create extension if not exists btree_gist;

create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  counselor_id uuid not null references public.counselors (id) on delete cascade,
  client_id uuid not null references public.profiles (id) on delete cascade,
  start_utc timestamptz not null,
  end_utc timestamptz not null,
  -- end_utc + the mandatory 15-minute rest, filled in by the trigger below. Kept as a column because
  -- Postgres only allows immutable expressions in the double-booking guard.
  rest_until timestamptz not null,
  duration int not null check (duration in (30, 60)),
  status text not null default 'confirmed' check (status in ('confirmed', 'canceled')),
  fee_cents int not null default 0 check (fee_cents >= 0),       -- the counselor's fee when booked
  member_care boolean not null default false,                     -- client booked through church member care
  note text not null default '',                                  -- client's note to the counselor
  -- Hardship price offer: what the client can pay, and the counselor's answer.
  offer_cents int check (offer_cents is null or offer_cents >= 0),
  offer_note text not null default '',
  offer_status text check (offer_status in ('pending', 'accepted', 'declined')),
  -- Insurance the counselor bills directly. Only the last four of the member ID are kept.
  insurance_provider text,
  insurance_member_last4 text,
  insurance_group text,
  insurance_status text check (insurance_status in ('pending', 'verified', 'not-covered')),
  -- Shown to the counselor, who can't read the client's profile.
  client_name text not null default '',
  client_email text not null default '',
  client_time_zone text not null default '',
  meet_url text not null default '',
  google_event_id text,
  rest_event_id text,
  rescheduled_from uuid references public.bookings (id) on delete set null,
  canceled_by text check (canceled_by in ('client', 'counselor')),
  cancel_reason text not null default '',
  created_at timestamptz not null default now(),
  canceled_at timestamptz,
  check (end_utc > start_utc),
  -- No two confirmed sessions within 15 minutes of each other for the same counselor.
  constraint no_double_booking exclude using gist (
    counselor_id with =,
    tstzrange(start_utc, rest_until) with &&
  ) where (status = 'confirmed')
);

create function public.bookings_set_rest_until() returns trigger
language plpgsql as $$
begin
  new.rest_until := new.end_utc + interval '15 minutes';
  return new;
end;
$$;

create trigger bookings_set_rest_until
  before insert or update of end_utc on public.bookings
  for each row execute function public.bookings_set_rest_until();

create index on public.bookings (client_id, start_utc);
create index on public.bookings (counselor_id, start_utc);

alter table public.bookings enable row level security;

create policy "bookings: read own" on public.bookings
  for select using (client_id = auth.uid() or counselor_id = auth.uid());

grant select on public.bookings to authenticated;
grant all on public.bookings to service_role;
