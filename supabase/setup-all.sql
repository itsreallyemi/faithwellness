-- FaithWellness: full database setup (tables, privacy rules, access, sample counselors).
-- Run once in Supabase → SQL Editor on a new project.

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

-- Lets a signed-in person permanently delete their own account from /account.
-- Deleting the auth user cascades to their profile (and counselor rows, if any).

create function public.delete_my_account() returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then
    raise exception 'Not signed in';
  end if;
  delete from auth.users where id = auth.uid();
end;
$$;

revoke execute on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;

-- Generated by scripts/generate-seed.mjs from supabase/seed-data.json. Do not edit by hand.
-- FICTIONAL sample counselors. Replace before launch.

insert into public.focus_areas (slug, label, sort, featured) values ('marriage', 'Marriage', 0, true) on conflict (slug) do update set label = excluded.label, sort = excluded.sort, featured = excluded.featured;
insert into public.focus_areas (slug, label, sort, featured) values ('trauma', 'Trauma', 1, true) on conflict (slug) do update set label = excluded.label, sort = excluded.sort, featured = excluded.featured;
insert into public.focus_areas (slug, label, sort, featured) values ('abuse-recovery', 'Abuse recovery', 2, true) on conflict (slug) do update set label = excluded.label, sort = excluded.sort, featured = excluded.featured;
insert into public.focus_areas (slug, label, sort, featured) values ('financial', 'Financial', 3, true) on conflict (slug) do update set label = excluded.label, sort = excluded.sort, featured = excluded.featured;
insert into public.focus_areas (slug, label, sort, featured) values ('grief', 'Grief & loss', 4, true) on conflict (slug) do update set label = excluded.label, sort = excluded.sort, featured = excluded.featured;
insert into public.focus_areas (slug, label, sort, featured) values ('anxiety', 'Anxiety', 5, true) on conflict (slug) do update set label = excluded.label, sort = excluded.sort, featured = excluded.featured;
insert into public.focus_areas (slug, label, sort, featured) values ('ministry-burnout', 'Ministry burnout', 6, true) on conflict (slug) do update set label = excluded.label, sort = excluded.sort, featured = excluded.featured;
insert into public.focus_areas (slug, label, sort, featured) values ('premarital', 'Premarital', 7, false) on conflict (slug) do update set label = excluded.label, sort = excluded.sort, featured = excluded.featured;
insert into public.focus_areas (slug, label, sort, featured) values ('parenting', 'Parenting', 8, false) on conflict (slug) do update set label = excluded.label, sort = excluded.sort, featured = excluded.featured;

insert into public.churches (id, slug, name, city, denomination) values ('ce40e1e8-7ed1-4ba3-8544-c725ee3dfee5', 'grace-fellowship', 'Grace Fellowship', 'Pasadena, CA', 'Non-denominational') on conflict (slug) do update set name = excluded.name, city = excluded.city, denomination = excluded.denomination;
insert into public.churches (id, slug, name, city, denomination) values ('b6ddfb60-bd1f-418d-8404-d2d0d87a2dfb', 'cornerstone-church', 'Cornerstone Church', 'Riverside, CA', 'Baptist') on conflict (slug) do update set name = excluded.name, city = excluded.city, denomination = excluded.denomination;
insert into public.churches (id, slug, name, city, denomination) values ('4f0a6c26-f15d-453c-89df-c40445d37485', 'hope-community', 'Hope Community Church', 'Irvine, CA', 'Non-denominational') on conflict (slug) do update set name = excluded.name, city = excluded.city, denomination = excluded.denomination;
insert into public.churches (id, slug, name, city, denomination) values ('a6e07f9b-41a7-44af-8ec4-27e7223f6c6d', 'living-waters', 'Living Waters Presbyterian', 'Long Beach, CA', 'Presbyterian') on conflict (slug) do update set name = excluded.name, city = excluded.city, denomination = excluded.denomination;
insert into public.churches (id, slug, name, city, denomination) values ('ae28de14-fcf1-488a-84e7-4bec18c2edd8', 'redeemer-city', 'Redeemer City Church', 'Los Angeles, CA', 'Non-denominational') on conflict (slug) do update set name = excluded.name, city = excluded.city, denomination = excluded.denomination;

-- Rev. Ruth Okafor
insert into auth.users (id, instance_id, aud, role, email, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) values ('97f1caea-1747-43d1-8a48-a273e7b4a552', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'ruth-okafor@example.test', '{}', '{}', now(), now()) on conflict (id) do nothing;
insert into public.profiles (id, role, full_name, avatar_url, time_zone) values ('97f1caea-1747-43d1-8a48-a273e7b4a552', 'counselor', 'Rev. Ruth Okafor', '/counselors/ruth-okafor.jpg', 'America/Los_Angeles') on conflict (id) do update set role = 'counselor', full_name = excluded.full_name, avatar_url = excluded.avatar_url, time_zone = excluded.time_zone;
insert into public.counselors (id, slug, preferred_name, title, church_id, years_ministry, languages, summary, about, approach, verse, verse_ref, help_with, badges, insurance_accepted, fee_30_cents, fee_60_cents, offers_30, offers_60, sliding_scale, free_for_members, fee_note, avatar_tint, is_published) values ('97f1caea-1747-43d1-8a48-a273e7b4a552', 'ruth-okafor', 'Ruth', 'Pastoral Counselor', (select id from public.churches where slug = 'grace-fellowship'), 18, array['English', 'Igbo']::text[], 'Walking with couples and individuals through conflict, loss and rebuilding trust.', 'I grew up in a pastor’s home in Lagos and was ordained after seminary in California. For nearly two decades I’ve sat with couples on the edge of giving up and individuals carrying grief they never had room to name.

I believe no story is too broken for grace — and that healing usually happens slowly, in honest conversation, with someone who won’t rush you.', 'We start where you are. I pair trauma-informed practice with Scripture and prayer — only as much as you want — so faith becomes a source of strength, not pressure. If you need clinical support beyond pastoral care, I’ll help you find it.', 'He heals the brokenhearted and binds up their wounds.', 'Psalm 147:3', array['Marriage', 'Rebuilding trust', 'Trauma', 'Grief & loss', 'Life transitions', 'Women in ministry']::text[], array['AACC Certified', 'M.Div.', 'Trauma-informed', 'Ordained 2008']::text[], '{}'::text[], 4500, 8000, true, true, true, false, 'Sliding scale', '#FFE9DF', true) on conflict (id) do update set slug = excluded.slug, preferred_name = excluded.preferred_name, title = excluded.title, church_id = excluded.church_id, years_ministry = excluded.years_ministry, languages = excluded.languages, summary = excluded.summary, about = excluded.about, approach = excluded.approach, verse = excluded.verse, verse_ref = excluded.verse_ref, help_with = excluded.help_with, badges = excluded.badges, insurance_accepted = excluded.insurance_accepted, fee_30_cents = excluded.fee_30_cents, fee_60_cents = excluded.fee_60_cents, offers_30 = excluded.offers_30, offers_60 = excluded.offers_60, sliding_scale = excluded.sliding_scale, free_for_members = excluded.free_for_members, fee_note = excluded.fee_note, avatar_tint = excluded.avatar_tint, is_published = excluded.is_published;
delete from public.credentials where counselor_id = '97f1caea-1747-43d1-8a48-a273e7b4a552';
insert into public.credentials (counselor_id, label, issuer, year, sort) values ('97f1caea-1747-43d1-8a48-a273e7b4a552', 'M.Div., Pastoral Care', '[Seminary name]', 2007, 0);
insert into public.credentials (counselor_id, label, issuer, year, sort) values ('97f1caea-1747-43d1-8a48-a273e7b4a552', 'Board Certified Christian Counselor', 'AACC · [credential ID]', null, 1);
insert into public.credentials (counselor_id, label, issuer, year, sort) values ('97f1caea-1747-43d1-8a48-a273e7b4a552', 'Trauma-Informed Care certificate', '[Issuing body]', 2019, 2);
delete from public.counselor_focus_areas where counselor_id = '97f1caea-1747-43d1-8a48-a273e7b4a552';
insert into public.counselor_focus_areas (counselor_id, focus_area_slug) values ('97f1caea-1747-43d1-8a48-a273e7b4a552', 'marriage');
insert into public.counselor_focus_areas (counselor_id, focus_area_slug) values ('97f1caea-1747-43d1-8a48-a273e7b4a552', 'trauma');
insert into public.counselor_focus_areas (counselor_id, focus_area_slug) values ('97f1caea-1747-43d1-8a48-a273e7b4a552', 'grief');
delete from public.availability_rules where counselor_id = '97f1caea-1747-43d1-8a48-a273e7b4a552';
insert into public.availability_rules (counselor_id, weekday, start_time, end_time) values ('97f1caea-1747-43d1-8a48-a273e7b4a552', 2, '10:00', '15:30');
insert into public.availability_rules (counselor_id, weekday, start_time, end_time) values ('97f1caea-1747-43d1-8a48-a273e7b4a552', 4, '09:30', '12:00');

-- Daniela Mercado, LMFT
insert into auth.users (id, instance_id, aud, role, email, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) values ('a1bc07f3-53b3-417c-874c-dcf79a682b35', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'daniela-mercado@example.test', '{}', '{}', now(), now()) on conflict (id) do nothing;
insert into public.profiles (id, role, full_name, avatar_url, time_zone) values ('a1bc07f3-53b3-417c-874c-dcf79a682b35', 'counselor', 'Daniela Mercado, LMFT', '/counselors/daniela-mercado.jpg', 'America/Los_Angeles') on conflict (id) do update set role = 'counselor', full_name = excluded.full_name, avatar_url = excluded.avatar_url, time_zone = excluded.time_zone;
insert into public.counselors (id, slug, preferred_name, title, church_id, years_ministry, languages, summary, about, approach, verse, verse_ref, help_with, badges, insurance_accepted, fee_30_cents, fee_60_cents, offers_30, offers_60, sliding_scale, free_for_members, fee_note, avatar_tint, is_published) values ('a1bc07f3-53b3-417c-874c-dcf79a682b35', 'daniela-mercado', 'Daniela', 'Marriage & Family Therapist', (select id from public.churches where slug = 'cornerstone-church'), 12, array['English', 'Spanish']::text[], 'Premarital and marriage care that pairs proven methods with a faith-filled view of covenant.', 'Before becoming a therapist I served as a youth pastor for six years, and I still lead Cornerstone’s marriage ministry with my husband, Marco.

I love helping engaged couples build a strong foundation and helping long-married couples rediscover each other.', 'I use proven tools like Prepare/Enrich and emotionally focused therapy, grounded in a biblical view of covenant. Sessions are practical — you’ll leave with something to try this week.', 'A cord of three strands is not quickly broken.', 'Ecclesiastes 4:12', array['Premarital', 'Marriage', 'Parenting', 'Blended families']::text[], array['LMFT', 'Prepare/Enrich', 'Bilingual']::text[], array['Aetna', 'Blue Cross Blue Shield', 'Cigna', 'Magellan']::text[], 5500, 9000, true, true, false, false, 'Couples welcome', '#F3EEE6', true) on conflict (id) do update set slug = excluded.slug, preferred_name = excluded.preferred_name, title = excluded.title, church_id = excluded.church_id, years_ministry = excluded.years_ministry, languages = excluded.languages, summary = excluded.summary, about = excluded.about, approach = excluded.approach, verse = excluded.verse, verse_ref = excluded.verse_ref, help_with = excluded.help_with, badges = excluded.badges, insurance_accepted = excluded.insurance_accepted, fee_30_cents = excluded.fee_30_cents, fee_60_cents = excluded.fee_60_cents, offers_30 = excluded.offers_30, offers_60 = excluded.offers_60, sliding_scale = excluded.sliding_scale, free_for_members = excluded.free_for_members, fee_note = excluded.fee_note, avatar_tint = excluded.avatar_tint, is_published = excluded.is_published;
delete from public.credentials where counselor_id = 'a1bc07f3-53b3-417c-874c-dcf79a682b35';
insert into public.credentials (counselor_id, label, issuer, year, sort) values ('a1bc07f3-53b3-417c-874c-dcf79a682b35', 'Licensed Marriage & Family Therapist', 'California BBS', null, 0);
insert into public.credentials (counselor_id, label, issuer, year, sort) values ('a1bc07f3-53b3-417c-874c-dcf79a682b35', 'Prepare/Enrich facilitator', null, null, 1);
delete from public.counselor_focus_areas where counselor_id = 'a1bc07f3-53b3-417c-874c-dcf79a682b35';
insert into public.counselor_focus_areas (counselor_id, focus_area_slug) values ('a1bc07f3-53b3-417c-874c-dcf79a682b35', 'marriage');
insert into public.counselor_focus_areas (counselor_id, focus_area_slug) values ('a1bc07f3-53b3-417c-874c-dcf79a682b35', 'premarital');
insert into public.counselor_focus_areas (counselor_id, focus_area_slug) values ('a1bc07f3-53b3-417c-874c-dcf79a682b35', 'parenting');
delete from public.availability_rules where counselor_id = 'a1bc07f3-53b3-417c-874c-dcf79a682b35';
insert into public.availability_rules (counselor_id, weekday, start_time, end_time) values ('a1bc07f3-53b3-417c-874c-dcf79a682b35', 1, '16:15', '19:00');
insert into public.availability_rules (counselor_id, weekday, start_time, end_time) values ('a1bc07f3-53b3-417c-874c-dcf79a682b35', 3, '11:00', '14:00');
insert into public.availability_rules (counselor_id, weekday, start_time, end_time) values ('a1bc07f3-53b3-417c-874c-dcf79a682b35', 5, '18:00', '20:30');

-- Sarah Park, LPC
insert into auth.users (id, instance_id, aud, role, email, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) values ('f99183b2-339c-41e7-8f37-161174d84db1', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'sarah-park@example.test', '{}', '{}', now(), now()) on conflict (id) do nothing;
insert into public.profiles (id, role, full_name, avatar_url, time_zone) values ('f99183b2-339c-41e7-8f37-161174d84db1', 'counselor', 'Sarah Park, LPC', '/counselors/sarah-park.jpg', 'America/Los_Angeles') on conflict (id) do update set role = 'counselor', full_name = excluded.full_name, avatar_url = excluded.avatar_url, time_zone = excluded.time_zone;
insert into public.counselors (id, slug, preferred_name, title, church_id, years_ministry, languages, summary, about, approach, verse, verse_ref, help_with, badges, insurance_accepted, fee_30_cents, fee_60_cents, offers_30, offers_60, sliding_scale, free_for_members, fee_note, avatar_tint, is_published) values ('f99183b2-339c-41e7-8f37-161174d84db1', 'sarah-park', 'Sarah', 'Licensed Professional Counselor', (select id from public.churches where slug = 'hope-community'), 10, array['English', 'Korean']::text[], 'Gentle, paced trauma care for survivors — you set the pace, always.', 'I serve on the care team at Hope Community and specialize in helping survivors of abuse find safety and their voice again.

Many of the people I work with were hurt in church settings, and I hold that with deep care.', 'You set the pace, always. I use EMDR and body-based tools alongside gentle conversation about faith — including your questions and doubts, which are always welcome here.', 'The Lord is close to the brokenhearted and saves those who are crushed in spirit.', 'Psalm 34:18', array['Abuse recovery', 'Trauma', 'Anxiety', 'Church hurt']::text[], array['LPC', 'EMDR trained', 'Trauma-informed']::text[], array['Blue Cross Blue Shield', 'Optum', 'UnitedHealthcare']::text[], 4000, 7500, true, true, true, false, 'Sliding scale', '#E3F1E8', true) on conflict (id) do update set slug = excluded.slug, preferred_name = excluded.preferred_name, title = excluded.title, church_id = excluded.church_id, years_ministry = excluded.years_ministry, languages = excluded.languages, summary = excluded.summary, about = excluded.about, approach = excluded.approach, verse = excluded.verse, verse_ref = excluded.verse_ref, help_with = excluded.help_with, badges = excluded.badges, insurance_accepted = excluded.insurance_accepted, fee_30_cents = excluded.fee_30_cents, fee_60_cents = excluded.fee_60_cents, offers_30 = excluded.offers_30, offers_60 = excluded.offers_60, sliding_scale = excluded.sliding_scale, free_for_members = excluded.free_for_members, fee_note = excluded.fee_note, avatar_tint = excluded.avatar_tint, is_published = excluded.is_published;
delete from public.credentials where counselor_id = 'f99183b2-339c-41e7-8f37-161174d84db1';
insert into public.credentials (counselor_id, label, issuer, year, sort) values ('f99183b2-339c-41e7-8f37-161174d84db1', 'Licensed Professional Counselor', null, null, 0);
insert into public.credentials (counselor_id, label, issuer, year, sort) values ('f99183b2-339c-41e7-8f37-161174d84db1', 'EMDR basic training', null, null, 1);
delete from public.counselor_focus_areas where counselor_id = 'f99183b2-339c-41e7-8f37-161174d84db1';
insert into public.counselor_focus_areas (counselor_id, focus_area_slug) values ('f99183b2-339c-41e7-8f37-161174d84db1', 'trauma');
insert into public.counselor_focus_areas (counselor_id, focus_area_slug) values ('f99183b2-339c-41e7-8f37-161174d84db1', 'abuse-recovery');
insert into public.counselor_focus_areas (counselor_id, focus_area_slug) values ('f99183b2-339c-41e7-8f37-161174d84db1', 'anxiety');
delete from public.availability_rules where counselor_id = 'f99183b2-339c-41e7-8f37-161174d84db1';
insert into public.availability_rules (counselor_id, weekday, start_time, end_time) values ('f99183b2-339c-41e7-8f37-161174d84db1', 1, '10:30', '13:00');
insert into public.availability_rules (counselor_id, weekday, start_time, end_time) values ('f99183b2-339c-41e7-8f37-161174d84db1', 3, '09:00', '14:30');

-- Pastor James Whitfield
insert into auth.users (id, instance_id, aud, role, email, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) values ('81e2c5dd-ec63-4963-8f39-4804db004fb3', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'james-whitfield@example.test', '{}', '{}', now(), now()) on conflict (id) do nothing;
insert into public.profiles (id, role, full_name, avatar_url, time_zone) values ('81e2c5dd-ec63-4963-8f39-4804db004fb3', 'counselor', 'Pastor James Whitfield', '/counselors/james-whitfield.jpg', 'America/Los_Angeles') on conflict (id) do update set role = 'counselor', full_name = excluded.full_name, avatar_url = excluded.avatar_url, time_zone = excluded.time_zone;
insert into public.counselors (id, slug, preferred_name, title, church_id, years_ministry, languages, summary, about, approach, verse, verse_ref, help_with, badges, insurance_accepted, fee_30_cents, fee_60_cents, offers_30, offers_60, sliding_scale, free_for_members, fee_note, avatar_tint, is_published) values ('81e2c5dd-ec63-4963-8f39-4804db004fb3', 'james-whitfield', 'James', 'Care Pastor', (select id from public.churches where slug = 'grace-fellowship'), 24, array['English']::text[], 'Twenty years shepherding families through grief, transition and hard conversations.', 'I’ve been a pastor for over twenty years and a widower for five. Walking through my own loss taught me more about grief than any class.

Today I lead GriefShare at Grace and meet with families facing illness, loss and big transitions.', 'I listen first. Then we pray, read Scripture together and talk honestly about where God feels near or far. I’ll also connect you with licensed care when you need more.', 'Blessed are those who mourn, for they will be comforted.', 'Matthew 5:4', array['Grief & loss', 'Life transitions', 'Spiritual direction', 'Marriage']::text[], array['M.A. Counseling', 'Ordained', 'Free for members']::text[], '{}'::text[], 0, 3000, true, true, false, true, 'Free for Grace members', '#FFD8C8', true) on conflict (id) do update set slug = excluded.slug, preferred_name = excluded.preferred_name, title = excluded.title, church_id = excluded.church_id, years_ministry = excluded.years_ministry, languages = excluded.languages, summary = excluded.summary, about = excluded.about, approach = excluded.approach, verse = excluded.verse, verse_ref = excluded.verse_ref, help_with = excluded.help_with, badges = excluded.badges, insurance_accepted = excluded.insurance_accepted, fee_30_cents = excluded.fee_30_cents, fee_60_cents = excluded.fee_60_cents, offers_30 = excluded.offers_30, offers_60 = excluded.offers_60, sliding_scale = excluded.sliding_scale, free_for_members = excluded.free_for_members, fee_note = excluded.fee_note, avatar_tint = excluded.avatar_tint, is_published = excluded.is_published;
delete from public.credentials where counselor_id = '81e2c5dd-ec63-4963-8f39-4804db004fb3';
insert into public.credentials (counselor_id, label, issuer, year, sort) values ('81e2c5dd-ec63-4963-8f39-4804db004fb3', 'M.A., Counseling', null, null, 0);
insert into public.credentials (counselor_id, label, issuer, year, sort) values ('81e2c5dd-ec63-4963-8f39-4804db004fb3', 'Ordained minister', null, null, 1);
insert into public.credentials (counselor_id, label, issuer, year, sort) values ('81e2c5dd-ec63-4963-8f39-4804db004fb3', 'GriefShare facilitator', null, null, 2);
delete from public.counselor_focus_areas where counselor_id = '81e2c5dd-ec63-4963-8f39-4804db004fb3';
insert into public.counselor_focus_areas (counselor_id, focus_area_slug) values ('81e2c5dd-ec63-4963-8f39-4804db004fb3', 'grief');
insert into public.counselor_focus_areas (counselor_id, focus_area_slug) values ('81e2c5dd-ec63-4963-8f39-4804db004fb3', 'marriage');
delete from public.availability_rules where counselor_id = '81e2c5dd-ec63-4963-8f39-4804db004fb3';
insert into public.availability_rules (counselor_id, weekday, start_time, end_time) values ('81e2c5dd-ec63-4963-8f39-4804db004fb3', 4, '13:30', '17:00');
insert into public.availability_rules (counselor_id, weekday, start_time, end_time) values ('81e2c5dd-ec63-4963-8f39-4804db004fb3', 5, '10:00', '12:00');

-- Abigail Nwosu, CFP®
insert into auth.users (id, instance_id, aud, role, email, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) values ('336e0c3a-2f3d-46f6-8236-59f4faa10985', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'abigail-nwosu@example.test', '{}', '{}', now(), now()) on conflict (id) do nothing;
insert into public.profiles (id, role, full_name, avatar_url, time_zone) values ('336e0c3a-2f3d-46f6-8236-59f4faa10985', 'counselor', 'Abigail Nwosu, CFP®', '/counselors/abigail-nwosu.jpg', 'America/Los_Angeles') on conflict (id) do update set role = 'counselor', full_name = excluded.full_name, avatar_url = excluded.avatar_url, time_zone = excluded.time_zone;
insert into public.counselors (id, slug, preferred_name, title, church_id, years_ministry, languages, summary, about, approach, verse, verse_ref, help_with, badges, insurance_accepted, fee_30_cents, fee_60_cents, offers_30, offers_60, sliding_scale, free_for_members, fee_note, avatar_tint, is_published) values ('336e0c3a-2f3d-46f6-8236-59f4faa10985', 'abigail-nwosu', 'Abigail', 'Biblical Financial Counselor', (select id from public.churches where slug = 'living-waters'), 9, array['English', 'Yoruba']::text[], 'Practical, shame-free help with debt, budgeting and generosity as a couple.', 'I spent ten years in banking before answering a call to help families find freedom from money stress.

As a deacon at Living Waters I lead our budgeting ministry, and I’ve seen how financial peace can heal a marriage.', 'No shame, ever. We look at the numbers together, set goals rooted in stewardship and generosity, and build a plan that fits real life — then I check in so you stay on track.', 'The plans of the diligent lead surely to abundance.', 'Proverbs 21:5', array['Debt & budgeting', 'Couples & money', 'Generosity', 'Job loss']::text[], array['CFP®', 'Crown Financial', 'Deacon']::text[], '{}'::text[], 3500, 6000, true, true, false, false, 'First session $20', '#FFF4EF', true) on conflict (id) do update set slug = excluded.slug, preferred_name = excluded.preferred_name, title = excluded.title, church_id = excluded.church_id, years_ministry = excluded.years_ministry, languages = excluded.languages, summary = excluded.summary, about = excluded.about, approach = excluded.approach, verse = excluded.verse, verse_ref = excluded.verse_ref, help_with = excluded.help_with, badges = excluded.badges, insurance_accepted = excluded.insurance_accepted, fee_30_cents = excluded.fee_30_cents, fee_60_cents = excluded.fee_60_cents, offers_30 = excluded.offers_30, offers_60 = excluded.offers_60, sliding_scale = excluded.sliding_scale, free_for_members = excluded.free_for_members, fee_note = excluded.fee_note, avatar_tint = excluded.avatar_tint, is_published = excluded.is_published;
delete from public.credentials where counselor_id = '336e0c3a-2f3d-46f6-8236-59f4faa10985';
insert into public.credentials (counselor_id, label, issuer, year, sort) values ('336e0c3a-2f3d-46f6-8236-59f4faa10985', 'CERTIFIED FINANCIAL PLANNER™', null, null, 0);
insert into public.credentials (counselor_id, label, issuer, year, sort) values ('336e0c3a-2f3d-46f6-8236-59f4faa10985', 'Crown Financial Ministries coach', null, null, 1);
delete from public.counselor_focus_areas where counselor_id = '336e0c3a-2f3d-46f6-8236-59f4faa10985';
insert into public.counselor_focus_areas (counselor_id, focus_area_slug) values ('336e0c3a-2f3d-46f6-8236-59f4faa10985', 'financial');
insert into public.counselor_focus_areas (counselor_id, focus_area_slug) values ('336e0c3a-2f3d-46f6-8236-59f4faa10985', 'marriage');
delete from public.availability_rules where counselor_id = '336e0c3a-2f3d-46f6-8236-59f4faa10985';
insert into public.availability_rules (counselor_id, weekday, start_time, end_time) values ('336e0c3a-2f3d-46f6-8236-59f4faa10985', 1, '11:00', '13:00');
insert into public.availability_rules (counselor_id, weekday, start_time, end_time) values ('336e0c3a-2f3d-46f6-8236-59f4faa10985', 1, '19:00', '21:00');
insert into public.availability_rules (counselor_id, weekday, start_time, end_time) values ('336e0c3a-2f3d-46f6-8236-59f4faa10985', 6, '09:00', '11:30');

-- Dr. Miriam Levy-Cole
insert into auth.users (id, instance_id, aud, role, email, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) values ('42f65796-14c0-46a4-884b-ac077a829580', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'miriam-levy-cole@example.test', '{}', '{}', now(), now()) on conflict (id) do nothing;
insert into public.profiles (id, role, full_name, avatar_url, time_zone) values ('42f65796-14c0-46a4-884b-ac077a829580', 'counselor', 'Dr. Miriam Levy-Cole', '/counselors/miriam-levy-cole.jpg', 'America/Los_Angeles') on conflict (id) do update set role = 'counselor', full_name = excluded.full_name, avatar_url = excluded.avatar_url, time_zone = excluded.time_zone;
insert into public.counselors (id, slug, preferred_name, title, church_id, years_ministry, languages, summary, about, approach, verse, verse_ref, help_with, badges, insurance_accepted, fee_30_cents, fee_60_cents, offers_30, offers_60, sliding_scale, free_for_members, fee_note, avatar_tint, is_published) values ('42f65796-14c0-46a4-884b-ac077a829580', 'miriam-levy-cole', 'Miriam', 'Clinical Psychologist', (select id from public.churches where slug = 'redeemer-city'), 15, array['English', 'Hebrew']::text[], 'Evidence-based therapy for couples healing after betrayal, with room for faith.', 'I’m a clinical psychologist and a member of Redeemer City, where I help train our lay counselors.

My work centers on couples healing after betrayal and on pastors and ministry leaders facing burnout.', 'I bring evidence-based therapy — Gottman Method, CBT — into conversation with your faith, honoring your convictions while giving you tools that have research behind them.', 'Come to me, all you who are weary and burdened, and I will give you rest.', 'Matthew 11:28', array['Affair recovery', 'Ministry burnout', 'Depression', 'Marriage']::text[], array['PsyD', 'Gottman Level 2', 'Licensed in CA']::text[], array['Aetna', 'Anthem', 'Cigna', 'UnitedHealthcare']::text[], 6000, 9000, true, true, false, false, 'Superbill available', '#F3EEE6', true) on conflict (id) do update set slug = excluded.slug, preferred_name = excluded.preferred_name, title = excluded.title, church_id = excluded.church_id, years_ministry = excluded.years_ministry, languages = excluded.languages, summary = excluded.summary, about = excluded.about, approach = excluded.approach, verse = excluded.verse, verse_ref = excluded.verse_ref, help_with = excluded.help_with, badges = excluded.badges, insurance_accepted = excluded.insurance_accepted, fee_30_cents = excluded.fee_30_cents, fee_60_cents = excluded.fee_60_cents, offers_30 = excluded.offers_30, offers_60 = excluded.offers_60, sliding_scale = excluded.sliding_scale, free_for_members = excluded.free_for_members, fee_note = excluded.fee_note, avatar_tint = excluded.avatar_tint, is_published = excluded.is_published;
delete from public.credentials where counselor_id = '42f65796-14c0-46a4-884b-ac077a829580';
insert into public.credentials (counselor_id, label, issuer, year, sort) values ('42f65796-14c0-46a4-884b-ac077a829580', 'Doctor of Psychology (PsyD)', null, null, 0);
insert into public.credentials (counselor_id, label, issuer, year, sort) values ('42f65796-14c0-46a4-884b-ac077a829580', 'Gottman Method Couples Therapy, Level 2', null, null, 1);
insert into public.credentials (counselor_id, label, issuer, year, sort) values ('42f65796-14c0-46a4-884b-ac077a829580', 'Licensed Psychologist', 'California Board of Psychology', null, 2);
delete from public.counselor_focus_areas where counselor_id = '42f65796-14c0-46a4-884b-ac077a829580';
insert into public.counselor_focus_areas (counselor_id, focus_area_slug) values ('42f65796-14c0-46a4-884b-ac077a829580', 'marriage');
insert into public.counselor_focus_areas (counselor_id, focus_area_slug) values ('42f65796-14c0-46a4-884b-ac077a829580', 'trauma');
insert into public.counselor_focus_areas (counselor_id, focus_area_slug) values ('42f65796-14c0-46a4-884b-ac077a829580', 'ministry-burnout');
insert into public.counselor_focus_areas (counselor_id, focus_area_slug) values ('42f65796-14c0-46a4-884b-ac077a829580', 'anxiety');
delete from public.availability_rules where counselor_id = '42f65796-14c0-46a4-884b-ac077a829580';
insert into public.availability_rules (counselor_id, weekday, start_time, end_time) values ('42f65796-14c0-46a4-884b-ac077a829580', 2, '08:00', '10:00');
insert into public.availability_rules (counselor_id, weekday, start_time, end_time) values ('42f65796-14c0-46a4-884b-ac077a829580', 5, '15:00', '18:00');
