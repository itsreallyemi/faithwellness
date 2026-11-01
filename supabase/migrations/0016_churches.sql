-- Phase 16: real church accounts.
--
-- Churches apply (church_applications) and a FaithWellness admin approves them, which creates the church, its
-- member code and its first admin. Church admins approve members who request membership with that code.
-- Verified members book their church's counselors free (member care), checked by the server when booking.
-- A church admin sees only their own church's member list: names, emails and statuses, never sessions.

alter table public.churches
  add column member_code text unique,                 -- member care is on when this is set
  add column created_at timestamptz not null default now();

-- The sample churches with member care keep the codes the prototype used.
update public.churches set member_code = 'GRACE2026' where slug = 'grace-fellowship' and member_code is null;
update public.churches set member_code = 'HOPE2026' where slug = 'hope-community' and member_code is null;

create table public.church_admins (
  church_id uuid not null references public.churches (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (church_id, user_id)
);
create index on public.church_admins (user_id);

create type public.membership_status as enum ('pending', 'verified', 'declined', 'ended');

create table public.church_memberships (
  id uuid primary key default gen_random_uuid(),
  church_id uuid not null references public.churches (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  status public.membership_status not null default 'pending',
  member_name text not null default '',   -- shown to the church's admins, who can't read profiles
  member_email text not null default '',
  requested_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  expires_at timestamptz,                  -- approvals last a year unless re-confirmed
  unique (church_id, user_id)
);
create index on public.church_memberships (church_id, status);

create type public.church_application_status as enum ('submitted', 'needs_info', 'approved', 'declined');

create table public.church_applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.profiles (id) on delete cascade,
  kind text not null check (kind in ('church', 'denomination')),
  org_name text not null,
  city text not null,
  tradition text not null,
  contact_name text not null,
  contact_role text not null,
  email text not null,
  program text not null check (program in ('yes', 'building', 'no')),
  member_care boolean not null default true,   -- wants to offer free sessions to members
  status public.church_application_status not null default 'submitted',
  admin_note text not null default '',
  church_id uuid references public.churches (id) on delete set null,
  submitted_at timestamptz not null default now(),
  reviewed_at timestamptz
);

-- Helpers -------------------------------------------------------------------------------------------------------

create function public.is_church_admin(p_church uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from church_admins where church_id = p_church and user_id = auth.uid());
$$;

/** The signed-in person's verified, unexpired membership at a church (used by member care). */
create function public.is_verified_member(p_user uuid, p_church uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from church_memberships
    where user_id = p_user and church_id = p_church and status = 'verified' and (expires_at is null or expires_at > now())
  );
$$;

-- Access ----------------------------------------------------------------------------------------------------------

alter table public.church_admins enable row level security;
alter table public.church_memberships enable row level security;
alter table public.church_applications enable row level security;

create policy "church_admins: read own" on public.church_admins for select using (user_id = auth.uid() or public.is_admin());
create policy "church_memberships: member or church reads" on public.church_memberships
  for select using (user_id = auth.uid() or public.is_church_admin(church_id));
create policy "church_applications: applicant or admin reads" on public.church_applications
  for select using (user_id = auth.uid() or public.is_admin());

grant select on public.church_admins, public.church_memberships, public.church_applications to authenticated;
grant all on public.church_admins, public.church_memberships, public.church_applications to service_role;
-- member_code stays private: the public directory reads churches, but not their codes.
revoke select on public.churches from anon, authenticated;
grant select (id, slug, name, city, denomination, created_at) on public.churches to anon, authenticated;

-- A church admin reads their own church's code (to share with members).
create function public.my_church() returns table (id uuid, slug text, name text, city text, denomination text, member_code text)
language sql stable security definer set search_path = public as $$
  select c.id, c.slug, c.name, c.city, c.denomination, c.member_code
  from churches c join church_admins a on a.church_id = c.id
  where a.user_id = auth.uid()
  order by a.created_at
  limit 1;
$$;

-- Members -----------------------------------------------------------------------------------------------------------

/** Request membership with a church's member code. Returns the church's name. */
create function public.request_membership(p_church_slug text, p_code text) returns text
language plpgsql security definer set search_path = public as $$
declare
  me uuid := auth.uid();
  ch record;
  who record;
begin
  if me is null then raise exception 'Not signed in'; end if;
  select id, name, member_code into ch from churches where slug = p_church_slug;
  if ch.id is null or ch.member_code is null
     or upper(regexp_replace(coalesce(p_code, ''), '\s', '', 'g')) <> upper(ch.member_code) then
    raise exception 'wrong-code';
  end if;
  select p.full_name, u.email into who from profiles p join auth.users u on u.id = p.id where p.id = me;
  insert into church_memberships (church_id, user_id, status, member_name, member_email)
  values (ch.id, me, 'pending', coalesce(who.full_name, ''), coalesce(who.email, ''))
  on conflict (church_id, user_id) do update
    set status = 'pending', requested_at = now(), updated_at = now(), expires_at = null,
        member_name = excluded.member_name, member_email = excluded.member_email
    where church_memberships.status in ('declined', 'ended')
       or (church_memberships.status = 'verified' and church_memberships.expires_at <= now());
  return ch.name;
end;
$$;

/** The member removes their own membership or request. */
create function public.leave_membership(p_church_slug text) returns void
language sql security definer set search_path = public as $$
  delete from church_memberships m using churches c
  where m.church_id = c.id and c.slug = p_church_slug and m.user_id = auth.uid();
$$;

/** A church admin approves (or re-confirms for another year), declines or ends a membership. */
create function public.decide_membership(p_id uuid, p_status public.membership_status) returns void
language plpgsql security definer set search_path = public as $$
begin
  if p_status = 'pending' then raise exception 'Unknown decision'; end if;
  update church_memberships
     set status = p_status,
         updated_at = now(),
         expires_at = case when p_status = 'verified' then now() + interval '365 days' else null end
   where id = p_id and public.is_church_admin(church_id);
  if not found then raise exception 'Membership not found'; end if;
end;
$$;

/** A church admin changes their member code (old links and codes stop working). */
create function public.set_member_code(p_code text) returns void
language plpgsql security definer set search_path = public as $$
declare
  clean text := upper(regexp_replace(coalesce(p_code, ''), '\s', '', 'g'));
begin
  if length(clean) < 6 then raise exception 'Codes need at least 6 letters or numbers'; end if;
  update churches set member_code = clean
   where id = (select church_id from church_admins where user_id = auth.uid() order by created_at limit 1);
  if not found then raise exception 'Not a church admin'; end if;
end;
$$;

-- Church applications ----------------------------------------------------------------------------------------------

create function public.submit_church_application(
  p_kind text, p_org_name text, p_city text, p_tradition text, p_contact_name text, p_contact_role text, p_program text,
  p_member_care boolean
) returns public.church_applications
language plpgsql security definer set search_path = public as $$
declare
  me uuid := auth.uid();
  my_email text;
  result public.church_applications;
begin
  if me is null then raise exception 'Not signed in'; end if;
  if trim(coalesce(p_org_name, '')) = '' or trim(coalesce(p_city, '')) = '' or trim(coalesce(p_contact_name, '')) = '' then
    raise exception 'Missing details';
  end if;
  select email into my_email from auth.users where id = me;
  insert into church_applications (user_id, kind, org_name, city, tradition, contact_name, contact_role, email, program, member_care)
  values (me, p_kind, trim(p_org_name), trim(p_city), trim(coalesce(p_tradition, '')), trim(p_contact_name),
          trim(coalesce(p_contact_role, '')), my_email, p_program, coalesce(p_member_care, true))
  on conflict (user_id) do update set
    kind = excluded.kind, org_name = excluded.org_name, city = excluded.city, tradition = excluded.tradition,
    contact_name = excluded.contact_name, contact_role = excluded.contact_role, program = excluded.program,
    member_care = excluded.member_care,
    status = 'submitted', admin_note = '', submitted_at = now(), reviewed_at = null
  where church_applications.status <> 'approved'
  returning * into result;
  if result.id is null then raise exception 'Already approved'; end if;
  return result;
end;
$$;

/**
 * A FaithWellness admin reviews a church application. Approving creates the church (with a member code) and
 * makes the applicant its admin.
 */
create function public.review_church_application(p_id uuid, p_decision public.church_application_status, p_note text)
returns public.church_applications
language plpgsql security definer set search_path = public as $$
declare
  app public.church_applications;
  new_church uuid;
  base text;
  candidate text;
  code text;
  n int := 1;
  result public.church_applications;
begin
  if not public.is_admin() then raise exception 'Admins only'; end if;
  if p_decision = 'submitted' then raise exception 'Unknown decision'; end if;
  select * into app from church_applications where id = p_id;
  if app.id is null then raise exception 'Application not found'; end if;

  if p_decision = 'approved' and app.church_id is null then
    base := trim(both '-' from regexp_replace(lower(app.org_name), '[^a-z0-9]+', '-', 'g'));
    candidate := base;
    while exists (select 1 from churches where slug = candidate) loop
      n := n + 1;
      candidate := base || '-' || n;
    end loop;
    -- A starting member code (the church can change it), only if they want member care.
    if app.member_care then
      code := upper(left(regexp_replace(app.org_name, '[^A-Za-z]', '', 'g'), 6)) || to_char(now(), 'YYYY');
      while exists (select 1 from churches where member_code = code) loop
        code := code || floor(random() * 10)::int;
      end loop;
    end if;
    insert into churches (slug, name, city, denomination, member_code)
    values (candidate, app.org_name, app.city, coalesce(nullif(app.tradition, ''), 'Not specified'), code)
    returning id into new_church;
    insert into church_admins (church_id, user_id) values (new_church, app.user_id) on conflict do nothing;
  end if;

  update church_applications
     set status = p_decision, admin_note = coalesce(trim(p_note), ''), reviewed_at = now(),
         church_id = coalesce(church_id, new_church)
   where id = p_id
  returning * into result;
  return result;
end;
$$;

revoke execute on function public.request_membership(text, text) from public, anon;
revoke execute on function public.leave_membership(text) from public, anon;
revoke execute on function public.decide_membership(uuid, public.membership_status) from public, anon;
revoke execute on function public.set_member_code(text) from public, anon;
revoke execute on function public.my_church() from public, anon;
revoke execute on function public.submit_church_application(text, text, text, text, text, text, text, boolean) from public, anon;
revoke execute on function public.review_church_application(uuid, public.church_application_status, text) from public, anon;
revoke execute on function public.is_verified_member(uuid, uuid) from public, anon, authenticated;
grant execute on function public.request_membership(text, text) to authenticated;
grant execute on function public.leave_membership(text) to authenticated;
grant execute on function public.decide_membership(uuid, public.membership_status) to authenticated;
grant execute on function public.set_member_code(text) to authenticated;
grant execute on function public.my_church() to authenticated;
grant execute on function public.submit_church_application(text, text, text, text, text, text, text, boolean) to authenticated;
grant execute on function public.review_church_application(uuid, public.church_application_status, text) to authenticated;
-- is_church_admin is used by policies, so signed-in people need to be able to run it (it only answers about themselves).
grant execute on function public.is_church_admin(uuid) to authenticated;

-- Churches that offer member care (have a code), for the "Join your church" list. Never returns the codes.
create function public.member_care_churches() returns table (slug text, name text)
language sql stable security definer set search_path = public as $$
  select slug, name from churches where member_code is not null order by name;
$$;
grant execute on function public.member_care_churches() to anon, authenticated;

-- For the church dashboard: how many free member-care sessions their members booked this month. A total only:
-- churches never see who booked, when, or with whom.
create function public.my_church_member_sessions_this_month() returns int
language sql stable security definer set search_path = public as $$
  select count(*)::int
  from bookings b
  join counselors c on c.id = b.counselor_id
  where b.member_care and b.status = 'confirmed'
    and date_trunc('month', b.start_utc) = date_trunc('month', now())
    and c.church_id = (select church_id from church_admins where user_id = auth.uid() order by created_at limit 1);
$$;
revoke execute on function public.my_church_member_sessions_this_month() from public, anon;
grant execute on function public.my_church_member_sessions_this_month() to authenticated;
