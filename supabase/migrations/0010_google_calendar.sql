-- Phase 10: counselors connect Google Calendar.
--
-- FaithWellness checks the counselor's chosen calendars for busy times and writes each session (with a Meet link)
-- and its 15-minute rest block to the calendar they pick. OAuth tokens are encrypted by the server before they're
-- stored, and only the server (with the service role) can read or write them: counselors can see and change
-- their calendar choices, never the tokens. Connecting is now required to go live.

create table public.integrations (
  counselor_id uuid primary key references public.counselors (id) on delete cascade,
  provider text not null default 'google' check (provider = 'google'),
  google_email text not null default '',
  refresh_token_enc text,                 -- AES-256-GCM, key in TOKEN_ENCRYPTION_KEY (server only)
  access_token_enc text,
  access_expires_at timestamptz,
  -- [{ "id": "...", "name": "...", "primary": true }]
  calendars jsonb not null default '[]',
  check_calendars text[] not null default '{}',   -- calendar ids checked for conflicts
  write_calendar text not null default '',        -- calendar id sessions and rest blocks go to
  status text not null default 'connected' check (status in ('connected', 'needs_reconnect')),
  connected_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.integrations enable row level security;

create policy "integrations: read own" on public.integrations for select using (counselor_id = auth.uid());
create policy "integrations: change own choices" on public.integrations
  for update using (counselor_id = auth.uid()) with check (counselor_id = auth.uid());

-- Counselors read everything but the tokens, and may only change which calendars are used.
grant select (counselor_id, provider, google_email, calendars, check_calendars, write_calendar, status, connected_at, updated_at)
  on public.integrations to authenticated;
grant update (check_calendars, write_calendar, updated_at) on public.integrations to authenticated;
-- The server (service role) stores and refreshes the encrypted tokens.
grant select, insert, update, delete on public.integrations to service_role;

-- Same checklist as before, plus a connected calendar.
create or replace function public.counselor_missing(c public.counselors) returns text[]
language sql stable security definer set search_path = public as $$
  select array_remove(array[
    case when trim(c.summary) = '' or trim(c.about) = '' then 'introduction' end,
    case when not exists (select 1 from counselor_focus_areas where counselor_id = c.id) then 'focus' end,
    case when (c.offers_30 and c.fee_30_cents <= 0 and not c.free_30)
           or (c.offers_60 and c.fee_60_cents <= 0 and not c.free_60) then 'fees' end,
    case when not exists (select 1 from availability_rules where counselor_id = c.id) then 'hours' end,
    case when not exists (
      select 1 from integrations i where i.counselor_id = c.id and i.status = 'connected' and i.write_calendar <> ''
    ) then 'calendar' end
  ], null);
$$;

-- Connecting, disconnecting or a token going bad re-runs the go-live check.
create function public.integration_touches_counselor() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'DELETE' then
    update counselors set updated_at = now() where id = old.counselor_id;
  else
    update counselors set updated_at = now() where id = new.counselor_id;
  end if;
  return null;
end;
$$;

create trigger integration_touches_counselor
  after insert or update or delete on public.integrations
  for each row execute function public.integration_touches_counselor();
