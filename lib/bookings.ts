// Real bookings (public.bookings) and how they map onto the prototype's booking shape, so the existing
// My sessions, session and portal screens can show them alongside prototype bookings with sample counselors.

import type { ProtoBooking } from "@/lib/prototype/store";

/** A row of public.bookings, with the counselor's slug joined in. */
export type BookingRow = {
  id: string;
  counselor_id: string;
  client_id: string;
  start_utc: string;
  end_utc: string;
  duration: 30 | 60;
  status: "confirmed" | "canceled";
  fee_cents: number;
  member_care: boolean;
  note: string;
  offer_cents: number | null;
  offer_note: string;
  offer_status: "pending" | "accepted" | "declined" | null;
  insurance_provider: string | null;
  insurance_member_last4: string | null;
  insurance_group: string | null;
  insurance_status: "pending" | "verified" | "not-covered" | null;
  client_name: string;
  client_email: string;
  client_time_zone: string;
  meet_url: string;
  rescheduled_from: string | null;
  canceled_by: "client" | "counselor" | null;
  cancel_reason: string;
  created_at: string;
  amount_cents: number;
  payment_status: "none" | "card_saved" | "charging" | "charged" | "failed" | "refunded" | "canceled";
  charge_due_at: string | null;
  charged_at: string | null;
  payment_error: string;
  counselor: { slug: string } | null;
};

/** Columns to select, with the counselor slug the prototype screens key on. */
export const BOOKING_SELECT = "*, counselor:counselors(slug)";

export function toProtoBooking(r: BookingRow): ProtoBooking {
  return {
    id: r.id,
    slug: r.counselor?.slug ?? "",
    startIso: new Date(r.start_utc).toISOString(),
    duration: r.duration,
    feeCents: r.fee_cents,
    status: r.status,
    meetUrl: r.meet_url,
    note: r.note,
    createdIso: new Date(r.created_at).toISOString(),
    rescheduledFrom: r.rescheduled_from ?? undefined,
    memberCare: r.member_care || undefined,
    insurance:
      r.insurance_provider && r.insurance_status
        ? { provider: r.insurance_provider, memberIdLast4: r.insurance_member_last4 ?? "", groupNumber: r.insurance_group ?? "", status: r.insurance_status }
        : undefined,
    priceRequest: r.offer_status ? { offeredCents: r.offer_cents ?? 0, note: r.offer_note, status: r.offer_status } : undefined,
    payment:
      r.payment_status && r.payment_status !== "none"
        ? { status: r.payment_status, amountCents: r.amount_cents, dueIso: r.charge_due_at, chargedIso: r.charged_at, error: r.payment_error }
        : undefined,
    real: true,
  };
}

/** What the booking page sends to POST /api/bookings. */
export type NewBooking = {
  slug: string;
  start: string;
  duration: 30 | 60;
  note: string;
  memberCare: boolean;
  rescheduleOf: string | null;
  offer: { cents: number; note: string } | null;
  insurance: { provider: string; memberIdLast4: string; group: string } | null;
  /** The member's saved card (from a Stripe SetupIntent), needed when the session has a fee. */
  paymentMethodId: string | null;
};

/** A short line about a real paid session's payment, for the member and counselor. */
export function paymentSummary(p: NonNullable<ProtoBooking["payment"]>, timeZone?: string) {
  const amount = `$${Math.round(p.amountCents / 100)}`;
  const day = (iso: string | null) =>
    iso ? new Date(iso).toLocaleString("en-US", { timeZone, weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : "";
  switch (p.status) {
    case "card_saved":
      return `${amount}, card saved · charged ${day(p.dueIso)}`;
    case "charging":
      return `${amount}, charging now`;
    case "charged":
      return `${amount} paid`;
    case "failed":
      return `${amount} · payment didn’t go through`;
    case "refunded":
      return `${amount} refunded`;
    case "canceled":
      return "Not charged";
    default:
      return amount;
  }
}
