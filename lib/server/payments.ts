import "server-only";
import type Stripe from "stripe";
import { adminDb } from "./secrets";
import { splitFee, stripe } from "./stripe";

// Charging members for sessions (see docs: cards are saved at booking and charged 24 hours before).
// Separate charges and transfers: FaithWellness charges the card, then transfers the counselor's and church's
// shares. Split: FaithWellness 10%, the counselor's church 8%, the counselor the rest minus Stripe's card fee.

const HOUR = 3_600_000;

/** The member's Stripe customer, created on first use. */
export async function customerFor(userId: string, email: string) {
  const db = adminDb();
  const { data } = await db.from("profiles").select("stripe_customer_id, full_name").eq("id", userId).maybeSingle();
  if (data?.stripe_customer_id) return data.stripe_customer_id as string;
  const customer = await stripe().customers.create({
    email: email || undefined,
    name: data?.full_name || undefined,
    metadata: { faithwellness_user: userId },
  });
  await db.from("profiles").update({ stripe_customer_id: customer.id }).eq("id", userId);
  return customer.id;
}

/** True when the saved card belongs to this member (so nobody can book with someone else's card). */
export async function cardBelongsTo(paymentMethodId: string, customerId: string) {
  const pm = await stripe().paymentMethods.retrieve(paymentMethodId);
  return pm.customer === customerId;
}

/** When a booking's card is charged: 24 hours before it starts, or now for last-minute bookings. */
export function chargeDueAt(start: Date) {
  return new Date(Math.max(Date.now(), start.getTime() - 24 * HOUR));
}

type ChargeRow = {
  id: string;
  status: string;
  client_id: string;
  fee_cents: number;
  member_care: boolean;
  offer_cents: number | null;
  offer_status: string | null;
  insurance_status: string | null;
  payment_status: string;
  payment_method_id: string | null;
  counselor: { id: string; stripe_account_id: string | null; church: { id: string; stripe_account_id: string | null; payouts_ready: boolean } | null } | null;
};

/** What the member owes: their offer if it was accepted (or is still waiting), otherwise the usual fee. */
function amountOwed(b: ChargeRow) {
  if (b.member_care || b.insurance_status) return 0;
  if (b.offer_status === "accepted" || b.offer_status === "pending") return b.offer_cents ?? 0;
  return b.fee_cents;
}

/**
 * Charges one booking's saved card and pays out the shares. Safe to call more than once: only bookings still
 * waiting with a saved card are charged. Returns "charged", "nothing-owed", "failed" or "skipped".
 */
export async function chargeBooking(bookingId: string): Promise<"charged" | "nothing-owed" | "failed" | "skipped"> {
  const db = adminDb();
  const { data } = await db
    .from("bookings")
    .select(
      "id, status, client_id, fee_cents, member_care, offer_cents, offer_status, insurance_status, payment_status, payment_method_id, counselor:counselors(id, stripe_account_id, church:churches(id, stripe_account_id, payouts_ready))",
    )
    .eq("id", bookingId)
    .maybeSingle();
  const b = data as unknown as ChargeRow | null;
  if (!b || b.status !== "confirmed" || b.payment_status !== "card_saved" || !b.payment_method_id) return "skipped";

  const amount = amountOwed(b);
  if (amount <= 0) {
    await db.from("bookings").update({ payment_status: "none", amount_cents: 0 }).eq("id", b.id);
    return "nothing-owed";
  }
  // Claim it first, so two runs at once can't both charge it.
  const { data: claimed } = await db
    .from("bookings")
    .update({ payment_status: "charging" })
    .eq("id", b.id)
    .eq("payment_status", "card_saved")
    .select("id");
  if (!claimed?.length) return "skipped";

  const { data: profile } = await db.from("profiles").select("stripe_customer_id").eq("id", b.client_id).maybeSingle();
  const church = b.counselor?.church ?? null;
  const split = splitFee(amount, Boolean(church));

  let intent: Stripe.PaymentIntent;
  try {
    intent = await stripe().paymentIntents.create(
      {
        amount,
        currency: "usd",
        customer: profile?.stripe_customer_id ?? undefined,
        payment_method: b.payment_method_id,
        off_session: true,
        confirm: true,
        transfer_group: b.id,
        description: "FaithWellness session",
        metadata: { booking_id: b.id },
        expand: ["latest_charge.balance_transaction"],
      },
      { idempotencyKey: `charge-${b.id}` },
    );
  } catch (e) {
    const message = e instanceof Error ? e.message : "The card was declined.";
    await db.from("bookings").update({ payment_status: "failed", payment_error: message.slice(0, 300), amount_cents: amount }).eq("id", b.id);
    return "failed";
  }

  const charge = intent.latest_charge as Stripe.Charge | null;
  const balance = charge?.balance_transaction as Stripe.BalanceTransaction | null;
  const stripeFee = balance?.fee ?? Math.round(amount * 0.029) + 30;
  const counselorShare = Math.max(0, split.counselorBeforeCardFee - stripeFee);

  // Transfers wait for the charge's funds (source_transaction), so they never draw on FaithWellness's own balance.
  let counselorTransfer: string | null = null;
  let churchTransfer: string | null = null;
  if (b.counselor?.stripe_account_id && counselorShare > 0 && charge) {
    const t = await stripe().transfers.create(
      { amount: counselorShare, currency: "usd", destination: b.counselor.stripe_account_id, source_transaction: charge.id, transfer_group: b.id },
      { idempotencyKey: `counselor-${b.id}` },
    );
    counselorTransfer = t.id;
  }
  // A church that hasn't set up payouts yet has its share held (church_transfer_id stays empty).
  if (church?.payouts_ready && church.stripe_account_id && split.church > 0 && charge) {
    const t = await stripe().transfers.create(
      { amount: split.church, currency: "usd", destination: church.stripe_account_id, source_transaction: charge.id, transfer_group: b.id },
      { idempotencyKey: `church-${b.id}` },
    );
    churchTransfer = t.id;
  }

  await db
    .from("bookings")
    .update({
      payment_status: "charged",
      payment_intent_id: intent.id,
      charged_at: new Date().toISOString(),
      amount_cents: amount,
      platform_fee_cents: split.platform,
      church_fee_cents: split.church,
      stripe_fee_cents: stripeFee,
      counselor_transfer_id: counselorTransfer,
      church_transfer_id: churchTransfer,
      payment_error: "",
    })
    .eq("id", b.id);
  return "charged";
}

/** Charges every booking whose time has come. Run hourly. */
export async function chargeDueBookings() {
  const { data } = await adminDb()
    .from("bookings")
    .select("id")
    .eq("status", "confirmed")
    .eq("payment_status", "card_saved")
    .lte("charge_due_at", new Date().toISOString())
    .limit(100);
  const results = { charged: 0, failed: 0, other: 0 };
  for (const { id } of data ?? []) {
    const r = await chargeBooking(id);
    if (r === "charged") results.charged++;
    else if (r === "failed") results.failed++;
    else results.other++;
  }
  return results;
}

/** Counselor canceled a charged session: take back both transfers, then refund the member in full. */
export async function refundBooking(bookingId: string) {
  const db = adminDb();
  const { data: b } = await db
    .from("bookings")
    .select("payment_status, payment_intent_id, counselor_transfer_id, church_transfer_id")
    .eq("id", bookingId)
    .maybeSingle();
  if (!b || b.payment_status !== "charged" || !b.payment_intent_id) return false;
  try {
    if (b.counselor_transfer_id) await stripe().transfers.createReversal(b.counselor_transfer_id, {}, { idempotencyKey: `rev-c-${bookingId}` });
    if (b.church_transfer_id) await stripe().transfers.createReversal(b.church_transfer_id, {}, { idempotencyKey: `rev-ch-${bookingId}` });
    await stripe().refunds.create({ payment_intent: b.payment_intent_id }, { idempotencyKey: `refund-${bookingId}` });
    await db.from("bookings").update({ payment_status: "refunded" }).eq("id", bookingId);
    return true;
  } catch (e) {
    console.error("Refund", e instanceof Error ? e.message : e);
    return false;
  }
}
