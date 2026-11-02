import { after, NextResponse, type NextRequest } from "next/server";
import { BOOKING_SELECT, type BookingRow, type NewBooking } from "@/lib/bookings";
import { bookableCounselor, cancelBooking, isMemberCare, stillOpen } from "@/lib/server/bookings";
import { accessTokenFor, createSessionEvents } from "@/lib/server/google";
import { bookingConfirmed } from "@/lib/server/notify";
import { cardBelongsTo, chargeBooking, chargeDueAt, customerFor, refundBooking } from "@/lib/server/payments";
import { stripeConfigured } from "@/lib/server/stripe";
import { addBookingNotes } from "@/lib/server/threads";
import { adminDb, calendarConfigured } from "@/lib/server/secrets";
import { supabaseServer } from "@/lib/supabase/server";

const fail = (error: string, status: number) => NextResponse.json({ error }, { status });

/**
 * Books a session with a real counselor: re-checks their calendar, saves the booking (the database refuses
 * double bookings), then writes the Google event with its Meet link, the client invite and the rest block.
 * When rescheduling, the old session is canceled only after the new one is safely booked.
 */
export async function POST(request: NextRequest) {
  if (!calendarConfigured) return fail("not-configured", 503);
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return fail("signed-out", 401);

  const body = (await request.json()) as NewBooking;
  const start = new Date(body.start);
  const duration = body.duration === 30 ? 30 : 60;
  if (Number.isNaN(start.getTime())) return fail("bad-request", 400);

  const c = await bookableCounselor(body.slug);
  if (!c) return fail("not-bookable", 404);
  if (c.id === user.id) return fail("own-profile", 400);
  if (duration === 30 ? !c.offers_30 : !c.offers_60) return fail("bad-request", 400);

  const db = adminDb();
  // Moving an already-paid session carries the payment over to the new time, so nobody is charged twice.
  let paidOld: Record<string, unknown> | null = null;
  if (body.rescheduleOf) {
    const { data: old } = await db
      .from("bookings")
      .select("client_id, status, payment_status, payment_intent_id, payment_method_id, amount_cents, charged_at, platform_fee_cents, church_fee_cents, stripe_fee_cents, counselor_transfer_id, church_transfer_id")
      .eq("id", body.rescheduleOf)
      .maybeSingle();
    if (old?.client_id !== user.id || old.status !== "confirmed") return fail("bad-request", 400);
    if (old.payment_status === "charged") {
      const { client_id: _c, status: _s, ...payment } = old;
      paidOld = payment;
    }
  }

  if (!(await stillOpen(c, start, duration))) return fail("taken", 409);

  const { data: profile } = await db.from("profiles").select("full_name, time_zone").eq("id", user.id).maybeSingle();
  const fee = duration === 30 ? (c.free_30 ? 0 : c.fee_30_cents) : c.free_60 ? 0 : c.fee_60_cents;
  const memberCare = await isMemberCare(c, user.id);

  // What the card will be charged 24 hours before (Member Benefits and insurance sessions aren't charged).
  const owed = memberCare || body.insurance ? 0 : body.offer ? Math.max(0, Math.round(body.offer.cents)) : fee;
  // Moving a session whose card is saved but not charged yet keeps that card.
  if (body.rescheduleOf && !body.paymentMethodId) {
    const { data: old } = await db.from("bookings").select("payment_status, payment_method_id").eq("id", body.rescheduleOf).maybeSingle();
    if (old?.payment_status === "card_saved" && old.payment_method_id) body.paymentMethodId = old.payment_method_id;
  }
  const charges = owed > 0 && stripeConfigured && !paidOld;
  if (charges) {
    if (!body.paymentMethodId) return fail("card-needed", 400);
    const customer = await customerFor(user.id, user.email ?? "");
    if (!(await cardBelongsTo(body.paymentMethodId, customer).catch(() => false))) return fail("card-needed", 400);
  }

  const { data: created, error } = await db
    .from("bookings")
    .insert({
      counselor_id: c.id,
      client_id: user.id,
      start_utc: start.toISOString(),
      end_utc: new Date(start.getTime() + duration * 60_000).toISOString(),
      duration,
      fee_cents: fee,
      member_care: memberCare,
      note: (body.note ?? "").slice(0, 2000),
      // Member care sessions are already free, so there's nothing to offer.
      offer_cents: body.offer && !memberCare ? Math.max(0, Math.round(body.offer.cents)) : null,
      offer_note: body.offer && !memberCare ? body.offer.note.slice(0, 1000) : "",
      offer_status: body.offer && !memberCare ? "pending" : null,
      insurance_provider: body.insurance?.provider ?? null,
      insurance_member_last4: body.insurance?.memberIdLast4?.slice(-4) ?? null,
      insurance_group: body.insurance?.group ?? null,
      insurance_status: body.insurance ? "pending" : null,
      client_name: profile?.full_name ?? "",
      client_email: user.email ?? "",
      client_time_zone: profile?.time_zone ?? "",
      rescheduled_from: body.rescheduleOf ?? null,
      ...(paidOld ?? {
        amount_cents: charges ? owed : 0,
        payment_status: charges ? "card_saved" : "none",
        payment_method_id: charges ? body.paymentMethodId : null,
        charge_due_at: charges ? chargeDueAt(start).toISOString() : null,
      }),
    })
    .select("id")
    .single();
  // 23P01: the double-booking guard. Someone else took this time a moment ago.
  if (error) return fail(error.code === "23P01" ? "taken" : "failed", error.code === "23P01" ? 409 : 500);

  // Booked less than 24 hours ahead: charge now, and don't book if the card is declined.
  if (charges && chargeDueAt(start).getTime() <= Date.now()) {
    const result = await chargeBooking(created.id);
    if (result === "failed") {
      await db.from("bookings").delete().eq("id", created.id);
      return fail("card-declined", 402);
    }
  }

  try {
    const token = await accessTokenFor(c.id);
    if (!token) throw new Error("No Google access");
    const events = await createSessionEvents(token, c.integration.write_calendar, {
      bookingId: created.id,
      start,
      end: new Date(start.getTime() + duration * 60_000),
      clientEmail: user.email ?? "",
    });
    await db
      .from("bookings")
      .update({ google_event_id: events.eventId, rest_event_id: events.restEventId, meet_url: events.meetUrl })
      .eq("id", created.id);
  } catch (e) {
    console.error("Booking calendar write failed", e instanceof Error ? e.message : e);
    // Without the calendar event the counselor wouldn't know about it, so undo the booking (and any charge).
    await refundBooking(created.id);
    await db.from("bookings").delete().eq("id", created.id);
    return fail("calendar-failed", 502);
  }

  if (body.rescheduleOf) {
    // The payment moved with the session.
    if (paidOld) await db.from("bookings").update({ payment_status: "none", payment_intent_id: null }).eq("id", body.rescheduleOf);
    await cancelBooking(body.rescheduleOf, "client", "Rescheduled to a new time.");
  }

  // Notes in the conversation and emails go out after the response, so the client isn't kept waiting.
  after(async () => {
    const facts = { id: created.id, counselor_id: c.id, client_id: user.id, client_name: profile?.full_name ?? "" };
    await addBookingNotes(
      facts,
      body.rescheduleOf ? "Session moved to a new time" : "Session confirmed",
      { from: "client", text: [body.note, body.offer && !memberCare ? body.offer.note : ""].filter(Boolean).join("\n\n") },
    );
    await bookingConfirmed(created.id, Boolean(body.rescheduleOf));
  });

  const { data: booking } = await db.from("bookings").select(BOOKING_SELECT).eq("id", created.id).single();
  return NextResponse.json({ booking: booking as BookingRow });
}
