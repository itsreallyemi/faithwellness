-- Phase 19: churches can have several member codes.
--
-- Instead of one code they change, a church adds codes (each with an optional label, like "Sunday bulletin")
-- and deletes ones it no longer wants. Any of its codes works for requesting membership. Deleting a code stops
-- that code and its link working; members already approved stay approved. Member care is on while a church
-- has at least one code. Codes stay private: only the church's admins can read them.

create table public.church_codes (
  id uuid primary key default gen_random_uuid(),
  church_id uuid not null references public.churches (id) on delete cascade,
  code text not null unique check (code ~ '^[A-Z0-9]{6,20}$'),
  label text not null default '',
  created_at timestamptz not null default now()
);
create index on public.church_codes (church_id);

-- Carry over the single codes churches have today.
insert into public.church_codes (church_id, code, label)
select id, upper(member_code), 'First code' from public.churches where member_code is not null
on conflict (code) do nothing;

alter table public.church_codes enable row level security;
create policy "church_codes: church admins read" on public.church_codes for select using (public.is_church_admin(church_id));
grant select on public.church_codes to authenticated;
grant all on public.church_codes to service_role;

-- my_church no longer returns a code (the dashboard reads church_codes instead).
drop function public.my_church();
create function public.my_church() returns table (id uuid, slug text, name text, city text, denomination text)
language sql stable security definer set search_path = public as $$
  select c.id, c.slug, c.name, c.city, c.denomination
  from churches c join church_admins a on a.church_id = c.id
  where a.user_id = auth.uid()
  order by a.created_at
  limit 1;
$$;
revoke execute on function public.my_church() from public, anon;
grant execute on function public.my_church() to authenticated;

/** Request membership with any of a church's codes. Returns the church's name. */
create or replace function public.request_membership(p_church_slug text, p_code text) returns text
language plpgsql security definer set search_path = public as $$
declare
  me uuid := auth.uid();
  ch record;
  who record;
begin
  if me is null then raise exception 'Not signed in'; end if;
  select c.id, c.name into ch
  from churches c join church_codes k on k.church_id = c.id
  where c.slug = p_church_slug and k.code = upper(regexp_replace(coalesce(p_code, ''), '\s', '', 'g'));
  if ch.id is null then raise exception 'wrong-code'; end if;
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

/** Churches that offer member care (have at least one code), for the "Join your church" list. */
create or replace function public.member_care_churches() returns table (slug text, name text)
language sql stable security definer set search_path = public as $$
  select c.slug, c.name from churches c
  where exists (select 1 from church_codes k where k.church_id = c.id)
  order by c.name;
$$;

/** A church admin adds a code. */
create function public.add_member_code(p_code text, p_label text) returns public.church_codes
language plpgsql security definer set search_path = public as $$
declare
  mine uuid := (select church_id from church_admins where user_id = auth.uid() order by created_at limit 1);
  result public.church_codes;
begin
  if mine is null then raise exception 'Not a church admin'; end if;
  insert into church_codes (church_id, code, label)
  values (mine, upper(regexp_replace(coalesce(p_code, ''), '\s', '', 'g')), trim(coalesce(p_label, '')))
  returning * into result;
  return result;
end;
$$;

/** A church admin deletes one of its codes. */
create function public.delete_member_code(p_id uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  delete from church_codes where id = p_id and public.is_church_admin(church_id);
  if not found then raise exception 'Code not found'; end if;
end;
$$;

drop function if exists public.set_member_code(text);

revoke execute on function public.add_member_code(text, text) from public, anon;
revoke execute on function public.delete_member_code(uuid) from public, anon;
grant execute on function public.add_member_code(text, text) to authenticated;
grant execute on function public.delete_member_code(uuid) to authenticated;

-- Approving a church now puts its starting code in church_codes.
create or replace function public.review_church_application(p_id uuid, p_decision public.church_application_status, p_note text)
returns public.church_applications
language plpgsql security definer set search_path = public as $$
declare
  app public.church_applications;
  new_church uuid;
  base text;
  candidate text;
  new_code text;
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
    insert into churches (slug, name, city, denomination)
    values (candidate, app.org_name, app.city, coalesce(nullif(app.tradition, ''), 'Not specified'))
    returning id into new_church;
    insert into church_admins (church_id, user_id) values (new_church, app.user_id) on conflict do nothing;
    -- A starting member code (the church can add and delete codes), only if they want member care.
    if app.member_care then
      new_code := upper(left(regexp_replace(app.org_name, '[^A-Za-z]', '', 'g'), 6)) || to_char(now(), 'YYYY');
      if length(new_code) < 6 then new_code := new_code || 'MEMBER'; end if;
      while exists (select 1 from church_codes k where k.code = new_code) loop
        new_code := new_code || floor(random() * 10)::int;
      end loop;
      insert into church_codes (church_id, code, label) values (new_church, left(new_code, 20), 'First code');
    end if;
  end if;

  update church_applications
     set status = p_decision, admin_note = coalesce(trim(p_note), ''), reviewed_at = now(),
         church_id = coalesce(church_id, new_church)
   where id = p_id
  returning * into result;
  return result;
end;
$$;

alter table public.churches drop column member_code;
