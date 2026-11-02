-- Phase 20: Stripe payments, part 1 (payout accounts) and the payment fields bookings will use in part 2.
--
-- Counselors and churches connect a Stripe Express account to receive payouts. Only the server (service role)
-- writes Stripe ids and statuses. Counselors who charge for sessions need payouts set up before they go live.
-- Split per paid session: FaithWellness 10%, the counselor's church 8%, the counselor the rest minus Stripe's
-- card fee. Cards are saved at booking and charged 24 hours before the session.

alter table public.counselors
  add column stripe_account_id text unique,
  add column payouts_ready boolean not null default false;

alter table public.churches
  add column stripe_account_id text unique,
  add column payouts_ready boolean not null default false;

alter table public.profiles add column stripe_customer_id text unique;

alter table public.bookings
  add column amount_cents int not null default 0 check (amount_cents >= 0),   -- what the member will be charged
  add column payment_status text not null default 'none'
    check (payment_status in ('none', 'card_saved', 'charged', 'failed', 'refunded', 'canceled')),
  add column payment_method_id text,
  add column payment_intent_id text,
  add column charge_due_at timestamptz,
  add column charged_at timestamptz,
  add column platform_fee_cents int not null default 0,
  add column church_fee_cents int not null default 0,
  add column stripe_fee_cents int not null default 0,
  add column counselor_transfer_id text,
  add column church_transfer_id text,
  add column payment_error text not null default '';
create index on public.bookings (charge_due_at) where payment_status = 'card_saved';

-- Same go-live checklist, plus payouts for counselors who charge for any session length they offer.
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
    ) then 'calendar' end,
    case when ((c.offers_30 and not c.free_30) or (c.offers_60 and not c.free_60)) and not c.payouts_ready
      then 'payouts' end
  ], null);
$$;

-- The six fictional samples never take real payments: keep them listed.
alter table public.counselors disable trigger counselor_set_published;
update public.counselors set payouts_ready = true where is_sample;
alter table public.counselors enable trigger counselor_set_published;

/** For the church dashboard: whether the signed-in admin's church can receive its share. */
create function public.my_church_payouts_ready() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select c.payouts_ready from churches c join church_admins a on a.church_id = c.id
                   where a.user_id = auth.uid() order by a.created_at limit 1), false);
$$;
revoke execute on function public.my_church_payouts_ready() from public, anon;
grant execute on function public.my_church_payouts_ready() to authenticated;
