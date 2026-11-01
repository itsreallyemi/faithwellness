-- Phase 15: reminder emails before sessions.
--
-- A daily job emails the client and counselor about sessions in roughly the next day and a half, and marks
-- each booking so nobody gets the same reminder twice.

alter table public.bookings add column reminder_sent_at timestamptz;

create index on public.bookings (start_utc) where status = 'confirmed' and reminder_sent_at is null;
