-- Phase 13: counselors answer price offers and insurance on real bookings.
--
-- Bookings are read-only to clients and counselors, so these functions are the only way to change the two
-- answers, and only for the counselor's own upcoming, confirmed sessions.

create function public.answer_price_offer(p_id uuid, p_accept boolean) returns void
language plpgsql security definer set search_path = public as $$
begin
  update bookings set offer_status = case when p_accept then 'accepted' else 'declined' end
  where id = p_id and counselor_id = auth.uid() and status = 'confirmed' and offer_status = 'pending';
  if not found then raise exception 'Offer not found or already answered'; end if;
end;
$$;

create function public.answer_insurance(p_id uuid, p_covered boolean) returns void
language plpgsql security definer set search_path = public as $$
begin
  update bookings set insurance_status = case when p_covered then 'verified' else 'not-covered' end
  where id = p_id and counselor_id = auth.uid() and status = 'confirmed' and insurance_status = 'pending';
  if not found then raise exception 'Insurance check not found or already answered'; end if;
end;
$$;

revoke execute on function public.answer_price_offer(uuid, boolean) from public, anon;
revoke execute on function public.answer_insurance(uuid, boolean) from public, anon;
grant execute on function public.answer_price_offer(uuid, boolean) to authenticated;
grant execute on function public.answer_insurance(uuid, boolean) to authenticated;
