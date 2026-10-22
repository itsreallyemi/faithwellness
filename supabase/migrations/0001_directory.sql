-- Phase 2: public directory tables.
-- Bookings, integrations, threads and messages arrive in later phases.

create type public.user_role as enum ('client', 'counselor', 'admin');

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role public.user_role not null default 'client',
  full_name text not null default '',
  avatar_url text,
  time_zone text not null default 'America/Los_Angeles',
  created_at timestamptz not null default now()
);

create table public.churches (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  city text not null,
  denomination text not null
);

create table public.counselors (
  id uuid primary key references public.profiles (id) on delete cascade,
  slug text not null unique,
  preferred_name text not null,
  title text not null,
  church_id uuid references public.churches (id) on delete set null,
  years_ministry int check (years_ministry >= 0),
  languages text[] not null default '{}',
  summary text not null default '',
  about text not null default '',          -- paragraphs separated by a blank line
  approach text not null default '',
  verse text,
  verse_ref text,
  help_with text[] not null default '{}',
  badges text[] not null default '{}',
  fee_30_cents int not null default 0 check (fee_30_cents >= 0),
  fee_60_cents int not null default 0 check (fee_60_cents >= 0),
  offers_30 boolean not null default true,
  offers_60 boolean not null default true,
  sliding_scale boolean not null default false,
  free_for_members boolean not null default false,
  fee_note text,
  insurance_accepted text[] not null default '{}',  -- plans a licensed counselor bills through their own practice
  avatar_tint text not null default '#FFE9DF',
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (offers_30 or offers_60)
);

create table public.credentials (
  id uuid primary key default gen_random_uuid(),
  counselor_id uuid not null references public.counselors (id) on delete cascade,
  label text not null,
  issuer text,
  year int,
  sort int not null default 0
);

create table public.focus_areas (
  slug text primary key,
  label text not null,
  sort int not null default 0,
  featured boolean not null default false
);

create table public.counselor_focus_areas (
  counselor_id uuid not null references public.counselors (id) on delete cascade,
  focus_area_slug text not null references public.focus_areas (slug) on delete cascade,
  primary key (counselor_id, focus_area_slug)
);

-- Weekly hours in the counselor's own time zone (profiles.time_zone).
create table public.availability_rules (
  id uuid primary key default gen_random_uuid(),
  counselor_id uuid not null references public.counselors (id) on delete cascade,
  weekday smallint not null check (weekday between 0 and 6),  -- 0 = Sunday
  start_time time not null,
  end_time time not null,
  check (end_time > start_time)
);

create index on public.counselors (is_published);
create index on public.credentials (counselor_id);
create index on public.availability_rules (counselor_id);

-- Row Level Security --------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.churches enable row level security;
alter table public.counselors enable row level security;
alter table public.credentials enable row level security;
alter table public.focus_areas enable row level security;
alter table public.counselor_focus_areas enable row level security;
alter table public.availability_rules enable row level security;

create function public.is_published_counselor(cid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from counselors where id = cid and is_published);
$$;

-- profiles: you see yourself; anyone sees the profile of a published counselor.
create policy "profiles: read own" on public.profiles
  for select using (id = auth.uid());
create policy "profiles: read published counselors" on public.profiles
  for select using (public.is_published_counselor(id));
create policy "profiles: update own" on public.profiles
  for update using (id = auth.uid()) with check (id = auth.uid());

-- Reference data is public.
create policy "churches: public read" on public.churches for select using (true);
create policy "focus_areas: public read" on public.focus_areas for select using (true);

-- counselors: public sees published rows; a counselor manages their own.
create policy "counselors: read published or own" on public.counselors
  for select using (is_published or id = auth.uid());
create policy "counselors: update own" on public.counselors
  for update using (id = auth.uid()) with check (id = auth.uid());

-- Child tables follow the parent counselor.
create policy "credentials: read" on public.credentials
  for select using (public.is_published_counselor(counselor_id) or counselor_id = auth.uid());
create policy "credentials: manage own" on public.credentials
  for all using (counselor_id = auth.uid()) with check (counselor_id = auth.uid());

create policy "counselor_focus_areas: read" on public.counselor_focus_areas
  for select using (public.is_published_counselor(counselor_id) or counselor_id = auth.uid());
create policy "counselor_focus_areas: manage own" on public.counselor_focus_areas
  for all using (counselor_id = auth.uid()) with check (counselor_id = auth.uid());

create policy "availability_rules: read" on public.availability_rules
  for select using (public.is_published_counselor(counselor_id) or counselor_id = auth.uid());
create policy "availability_rules: manage own" on public.availability_rules
  for all using (counselor_id = auth.uid()) with check (counselor_id = auth.uid());
