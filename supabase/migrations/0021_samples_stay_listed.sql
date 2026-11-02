-- Phase 21: the six fictional sample counselors always stay in the directory.
--
-- The go-live checklist (calendar, payouts…) is for real counselors. Samples can't connect a calendar or Stripe,
-- so any update to them was taking them out of the directory. Remove this once real counselors replace them.

create or replace function public.counselor_set_published() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  new.is_published := new.is_sample or cardinality(public.counselor_missing(new)) = 0;
  new.updated_at := now();
  return new;
end;
$$;

update public.counselors set updated_at = now() where is_sample;
