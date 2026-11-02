-- Phase 24: Stripe payments, part 3.
--
-- church_id: the church that earned a booking's 8% share when it was charged. A church that hadn't set up payouts
-- yet has its share held (church_transfer_id empty); it's paid out once the church connects.
-- charge_attempts: counts charge attempts, so a member can retry a declined payment with another card (each attempt
-- gets its own Stripe idempotency key).

alter table public.bookings
  add column church_id uuid references public.churches (id) on delete set null,
  add column charge_attempts int not null default 0;

-- Shares already held: credit the counselor's current church.
update public.bookings b
set church_id = c.church_id
from public.counselors c
where c.id = b.counselor_id
  and b.payment_status = 'charged'
  and b.church_fee_cents > 0
  and b.church_transfer_id is null;

create index on public.bookings (church_id) where church_transfer_id is null and church_fee_cents > 0;
