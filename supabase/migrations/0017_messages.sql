-- Phase 17: real messages between members and counselors.
--
-- One thread per member and counselor. Only the two of them can read it (RLS), and messages arrive live through
-- Supabase Realtime. Booking notes ("Session confirmed", cancellations) are system messages the server adds.
-- Email alerts never include message text, and go out at most once per thread every 30 minutes per person.
-- The six fictional sample counselors are marked is_sample: the site keeps their demo messaging in the browser.

alter table public.counselors add column is_sample boolean not null default false;
update public.counselors c set is_sample = true
from auth.users u
where u.id = c.id and u.email like '%@example.test';

create table public.threads (
  id uuid primary key default gen_random_uuid(),
  counselor_id uuid not null references public.counselors (id) on delete cascade,
  client_id uuid not null references public.profiles (id) on delete cascade,
  client_name text not null default '',          -- shown to the counselor, who can't read the client's profile
  created_at timestamptz not null default now(),
  last_message_at timestamptz not null default now(),
  client_read_at timestamptz,
  counselor_read_at timestamptz,
  client_emailed_at timestamptz,
  counselor_emailed_at timestamptz,
  unique (counselor_id, client_id)
);
create index on public.threads (client_id, last_message_at desc);
create index on public.threads (counselor_id, last_message_at desc);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.threads (id) on delete cascade,
  sender_id uuid references public.profiles (id) on delete set null,   -- null for system notes
  kind text not null default 'text' check (kind in ('text', 'system')),
  body text not null check (char_length(body) between 1 and 4000),
  booking_id uuid references public.bookings (id) on delete set null,
  created_at timestamptz not null default now()
);
create index on public.messages (thread_id, created_at);

alter table public.threads enable row level security;
alter table public.messages enable row level security;

create function public.in_thread(p_thread uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from threads where id = p_thread and (client_id = auth.uid() or counselor_id = auth.uid()));
$$;
grant execute on function public.in_thread(uuid) to authenticated;

create policy "threads: participants read" on public.threads
  for select using (client_id = auth.uid() or counselor_id = auth.uid());
create policy "messages: participants read" on public.messages
  for select using (public.in_thread(thread_id));

grant select on public.threads, public.messages to authenticated;
grant all on public.threads, public.messages to service_role;

-- Live updates for the inbox.
alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.threads;

/** A member's thread with a counselor, created if needed. Returns its id. */
create function public.thread_with(p_counselor_slug text) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  me uuid := auth.uid();
  cid uuid;
  tid uuid;
begin
  if me is null then raise exception 'Not signed in'; end if;
  select id into cid from counselors where slug = p_counselor_slug and is_published;
  if cid is null then raise exception 'Counselor not found'; end if;
  if cid = me then raise exception 'You can''t message yourself'; end if;
  insert into threads (counselor_id, client_id, client_name)
  values (cid, me, coalesce((select full_name from profiles where id = me), ''))
  on conflict (counselor_id, client_id) do update set client_name = excluded.client_name
  returning id into tid;
  return tid;
end;
$$;

/** Sends a message in a thread the sender belongs to. Returns the new message. */
create function public.send_message(p_thread uuid, p_body text) returns public.messages
language plpgsql security definer set search_path = public as $$
declare
  result public.messages;
begin
  if not public.in_thread(p_thread) then raise exception 'Thread not found'; end if;
  if coalesce(trim(p_body), '') = '' then raise exception 'Empty message'; end if;
  insert into messages (thread_id, sender_id, body) values (p_thread, auth.uid(), trim(p_body)) returning * into result;
  update threads set last_message_at = result.created_at,
         client_read_at = case when client_id = auth.uid() then result.created_at else client_read_at end,
         counselor_read_at = case when counselor_id = auth.uid() then result.created_at else counselor_read_at end
   where id = p_thread;
  return result;
end;
$$;

/** Marks a thread read for whoever is looking at it. */
create function public.mark_thread_read(p_thread uuid) returns void
language sql security definer set search_path = public as $$
  update threads
     set client_read_at = case when client_id = auth.uid() then now() else client_read_at end,
         counselor_read_at = case when counselor_id = auth.uid() then now() else counselor_read_at end
   where id = p_thread and (client_id = auth.uid() or counselor_id = auth.uid());
$$;

revoke execute on function public.thread_with(text) from public, anon;
revoke execute on function public.send_message(uuid, text) from public, anon;
revoke execute on function public.mark_thread_read(uuid) from public, anon;
grant execute on function public.thread_with(text) to authenticated;
grant execute on function public.send_message(uuid, text) to authenticated;
grant execute on function public.mark_thread_read(uuid) to authenticated;
