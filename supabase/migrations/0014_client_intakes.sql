-- Phase 14: a client's answers to the "find a counselor" questions belong to their account, not one browser.
--
-- Until now the answers lived only in the browser and were cleared on sign-out, so every email sign-in asked
-- again. "Skip for now" is remembered too, so skipping once doesn't bring the questions back each time.
-- Answers are private: only the client reads or changes their own row.

create table public.client_intakes (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  answers jsonb,                            -- null when they skipped
  skipped boolean not null default false,
  updated_at timestamptz not null default now()
);

alter table public.client_intakes enable row level security;

create policy "client_intakes: read own" on public.client_intakes for select using (user_id = auth.uid());
create policy "client_intakes: add own" on public.client_intakes for insert with check (user_id = auth.uid());
create policy "client_intakes: change own" on public.client_intakes
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

grant select, insert, update on public.client_intakes to authenticated;
grant all on public.client_intakes to service_role;
