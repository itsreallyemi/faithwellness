-- Phase 23: members report a problem with a paid session (the counselor didn't join, the video failed…).
--
-- The counselor and FaithWellness are emailed. The counselor (or a FaithWellness admin) either refunds the
-- session in full or resolves it without a refund, with a message to the member. Refunds go through the server
-- (Stripe), which marks the report "refunded".

create table public.session_problems (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null unique references public.bookings (id) on delete cascade,
  client_id uuid not null references public.profiles (id) on delete cascade,
  counselor_id uuid not null references public.counselors (id) on delete cascade,
  reason text not null check (reason in ('no_show', 'technical', 'cut_short', 'other')),
  note text not null default '',
  status text not null default 'open' check (status in ('open', 'refunded', 'resolved')),
  response text not null default '',     -- the counselor's or admin's message when resolving without a refund
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);
create index on public.session_problems (counselor_id, status);
create index on public.session_problems (status, created_at);

alter table public.session_problems enable row level security;
create policy "session_problems: member, counselor or admin reads" on public.session_problems
  for select using (client_id = auth.uid() or counselor_id = auth.uid() or public.is_admin());
grant select on public.session_problems to authenticated;
grant all on public.session_problems to service_role;

/** The member reports a problem with one of their paid sessions, once it has started. */
create function public.report_session_problem(p_booking uuid, p_reason text, p_note text) returns public.session_problems
language plpgsql security definer set search_path = public as $$
declare
  b public.bookings;
  result public.session_problems;
begin
  select * into b from bookings where id = p_booking and client_id = auth.uid();
  if b.id is null then raise exception 'Session not found'; end if;
  if b.payment_status <> 'charged' then raise exception 'Only paid sessions can be refunded'; end if;
  if b.start_utc > now() then raise exception 'You can report a problem once the session has started'; end if;
  insert into session_problems (booking_id, client_id, counselor_id, reason, note)
  values (b.id, b.client_id, b.counselor_id, p_reason, trim(coalesce(p_note, '')))
  on conflict (booking_id) do nothing
  returning * into result;
  if result.id is null then raise exception 'Already reported'; end if;
  return result;
end;
$$;

/** The counselor (or an admin) resolves a report without a refund, explaining why. */
create function public.resolve_session_problem(p_id uuid, p_response text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if coalesce(trim(p_response), '') = '' then raise exception 'Add a message for the member'; end if;
  update session_problems set status = 'resolved', response = trim(p_response), resolved_at = now()
  where id = p_id and status = 'open' and (counselor_id = auth.uid() or public.is_admin());
  if not found then raise exception 'Report not found'; end if;
end;
$$;

revoke execute on function public.report_session_problem(uuid, text, text) from public, anon;
revoke execute on function public.resolve_session_problem(uuid, text) from public, anon;
grant execute on function public.report_session_problem(uuid, text, text) to authenticated;
grant execute on function public.resolve_session_problem(uuid, text) to authenticated;
