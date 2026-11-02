-- Phase 22: Stripe payments, part 2 (charging cards).
--
-- Saved cards are charged 24 hours before each session by /api/cron/charges. Vercel's free plan only runs its own
-- crons daily, so Supabase calls that endpoint hourly with pg_cron + pg_net. The bearer token is CRON_SECRET,
-- stored in Supabase Vault as "cron_secret" (added separately, never in this file).

-- "charging" marks a booking while its card is being charged, so two runs can't charge it twice.
alter table public.bookings drop constraint if exists bookings_payment_status_check;
alter table public.bookings add constraint bookings_payment_status_check
  check (payment_status in ('none', 'card_saved', 'charging', 'charged', 'failed', 'refunded', 'canceled'));

create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.unschedule('faithwellness-charge-cards') where exists (select 1 from cron.job where jobname = 'faithwellness-charge-cards');
select cron.schedule(
  'faithwellness-charge-cards',
  '5 * * * *',   -- five past every hour
  $$
  select net.http_post(
    url := 'https://www.faithwellnesscounseling.com/api/cron/charges',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret')
    ),
    body := '{}'::jsonb
  );
  $$
);
