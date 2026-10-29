-- Phase 4: counselor applications and FaithWellness review.
--
-- A signed-in person applies from /for-counselors. FaithWellness admins review it at /admin, confirm the
-- accreditation with the church or denomination themselves, and approve, decline or ask for more.
-- Approving upgrades the account to a counselor and creates their (unpublished) counselor profile.
-- All changes go through the functions below, so nobody can approve themselves.

create type public.application_status as enum ('submitted', 'needs_info', 'approved', 'declined');

create table public.counselor_applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.profiles (id) on delete cascade,
  full_name text not null,
  email text not null,
  role_kind text not null check (role_kind in ('pastor', 'lay', 'clinician')),
  accrediting_body text not null,           -- a slug from lib/accreditation.ts, or 'not-listed'
  church_name text not null default '',     -- when their church or denomination isn't listed
  license text not null default '',         -- licensed clinicians only
  note text not null default '',
  status public.application_status not null default 'submitted',
  accreditation_confirmed boolean not null default false,
  confirmation_note text not null default '',  -- how FaithWellness confirmed it, e.g. who they spoke to
  admin_note text not null default '',         -- shown to the applicant when asking for more or declining
  submitted_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references public.profiles (id) on delete set null
);

create index on public.counselor_applications (status, submitted_at);

alter table public.counselor_applications enable row level security;

create function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and role = 'admin');
$$;
-- Visitors need it too: the "counselors: admin read" policy runs it on every directory read (it returns false for them).
grant execute on function public.is_admin() to anon, authenticated;

create policy "applications: read own or admin" on public.counselor_applications
  for select using (user_id = auth.uid() or public.is_admin());

-- Admins also see counselors who are approved but not live yet.
create policy "counselors: admin read" on public.counselors for select using (public.is_admin());

grant select on public.counselor_applications to authenticated;

-- Applicant: send or update their own application. Allowed while it's waiting for review, when FaithWellness
-- asked for more information, or after a decline (a fresh start). Not once approved.
create function public.submit_counselor_application(
  p_full_name text, p_role_kind text, p_accrediting_body text, p_church_name text, p_license text, p_note text
) returns public.counselor_applications
language plpgsql security definer set search_path = public as $$
declare
  me uuid := auth.uid();
  existing public.counselor_applications;
  result public.counselor_applications;
begin
  if me is null then raise exception 'Not signed in'; end if;
  if coalesce(trim(p_full_name), '') = '' then raise exception 'Name is required'; end if;
  if p_accrediting_body = 'not-listed' and coalesce(trim(p_church_name), '') = '' then
    raise exception 'Church or denomination name is required';
  end if;
  if p_role_kind = 'clinician' and coalesce(trim(p_license), '') = '' then raise exception 'License is required'; end if;

  select * into existing from counselor_applications where user_id = me;
  if existing.status = 'approved' then raise exception 'Already approved'; end if;

  insert into counselor_applications as a (user_id, full_name, email, role_kind, accrediting_body, church_name, license, note)
  values (me, trim(p_full_name), (select email from auth.users where id = me), p_role_kind, p_accrediting_body,
          trim(coalesce(p_church_name, '')), trim(coalesce(p_license, '')), trim(coalesce(p_note, '')))
  on conflict (user_id) do update set
    full_name = excluded.full_name, email = excluded.email, role_kind = excluded.role_kind,
    accrediting_body = excluded.accrediting_body, church_name = excluded.church_name, license = excluded.license,
    note = excluded.note, status = 'submitted', submitted_at = now(), admin_note = '',
    accreditation_confirmed = false, confirmation_note = '', reviewed_at = null, reviewed_by = null
  returning * into result;
  return result;
end;
$$;

-- Admin: approve, ask for more information, or decline.
create function public.review_counselor_application(
  p_id uuid, p_decision public.application_status, p_admin_note text, p_confirmed boolean, p_confirmation_note text
) returns public.counselor_applications
language plpgsql security definer set search_path = public as $$
declare
  app public.counselor_applications;
  base text;
  candidate text;
  n int := 1;
begin
  if not public.is_admin() then raise exception 'Only FaithWellness admins can review applications'; end if;
  if p_decision not in ('approved', 'needs_info', 'declined') then raise exception 'Unknown decision'; end if;
  if p_decision = 'approved' and not p_confirmed then raise exception 'Confirm the accreditation before approving'; end if;
  if p_decision in ('needs_info', 'declined') and coalesce(trim(p_admin_note), '') = '' then
    raise exception 'Add a note for the applicant';
  end if;

  update counselor_applications set
    status = p_decision, admin_note = trim(coalesce(p_admin_note, '')), accreditation_confirmed = p_confirmed,
    confirmation_note = trim(coalesce(p_confirmation_note, '')), reviewed_at = now(), reviewed_by = auth.uid()
  where id = p_id
  returning * into app;
  if app.id is null then raise exception 'Application not found'; end if;

  if p_decision = 'approved' then
    update profiles set role = 'counselor', full_name = case when full_name = '' then app.full_name else full_name end
    where id = app.user_id and role = 'client';

    -- A web address like /counselors/grace-thompson, numbered if the name is taken.
    base := trim(both '-' from regexp_replace(lower(app.full_name), '[^a-z0-9]+', '-', 'g'));
    if base = '' then base := 'counselor'; end if;
    candidate := base;
    while exists (select 1 from counselors where slug = candidate and id <> app.user_id) loop
      n := n + 1;
      candidate := base || '-' || n;
    end loop;

    insert into counselors (id, slug, preferred_name, title, church_id, is_published)
    values (
      app.user_id, candidate, app.full_name,
      case app.role_kind when 'pastor' then 'Pastoral Counselor' when 'lay' then 'Lay Counselor' else 'Licensed Counselor' end,
      (select id from churches where slug = app.accrediting_body),
      false
    )
    on conflict (id) do nothing;
  end if;

  return app;
end;
$$;

revoke execute on function public.submit_counselor_application(text, text, text, text, text, text) from public, anon;
revoke execute on function public.review_counselor_application(uuid, public.application_status, text, boolean, text) from public, anon;
grant execute on function public.submit_counselor_application(text, text, text, text, text, text) to authenticated;
grant execute on function public.review_counselor_application(uuid, public.application_status, text, boolean, text) to authenticated;
