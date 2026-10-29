import { NextResponse, type NextRequest } from "next/server";
import { BOOKING_SELECT, type BookingRow, type NewBooking } from "@/lib/bookings";
import { bookableCounselor, cancelBooking, stillOpen } from "@/lib/server/bookings";
import { accessTokenFor, createSessionEvents } from "@/lib/server/google";
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
  if (body.rescheduleOf) {
    const { data: old } = await db.from("bookings").select("client_id, status").eq("id", body.rescheduleOf).maybeSingle();
    if (old?.client_id !== user.id || old.status !== "confirmed") return fail("bad-request", 400);
  }

  if (!(await stillOpen(c, start, duration))) return fail("taken", 409);

  const { data: profile } = await db.from("profiles").select("full_name, time_zone").eq("id", user.id).maybeSingle();
  const fee = duration === 30 ? (c.free_30 ? 0 : c.fee_30_cents) : c.free_60 ? 0 : c.fee_60_cents;
  const { data: created, error } = await db
    .from("bookings")
    .insert({
      counselor_id: c.id,
      client_id: user.id,
      start_utc: start.toISOString(),
      end_utc: new Date(start.getTime() + duration * 60_000).toISOString(),
      duration,
      fee_cents: fee,
      member_care: Boolean(body.memberCare),
      note: (body.note ?? "").slice(0, 2000),
      offer_cents: body.offer ? Math.max(0, Math.round(body.offer.cents)) : null,
      offer_note: body.offer?.note?.slice(0, 1000) ?? "",
      offer_status: body.offer ? "pending" : null,
      insurance_provider: body.insurance?.provider ?? null,
      insurance_member_last4: body.insurance?.memberIdLast4?.slice(-4) ?? null,
      insurance_group: body.insurance?.group ?? null,
      insurance_status: body.insurance ? "pending" : null,
      client_name: profile?.full_name ?? "",
      client_email: user.email ?? "",
      client_time_zone: profile?.time_zone ?? "",
      rescheduled_from: body.rescheduleOf ?? null,
    })
    .select("id")
    .single();
  // 23P01: the double-booking guard. Someone else took this time a moment ago.
  if (error) return fail(error.code === "23P01" ? "taken" : "failed", error.code === "23P01" ? 409 : 500);

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
    // Without the calendar event the counselor wouldn't know about it, so undo the booking.
    await db.from("bookings").delete().eq("id", created.id);
    return fail("calendar-failed", 502);
  }

  if (body.rescheduleOf) await cancelBooking(body.rescheduleOf, "client", "Rescheduled to a new time.");

  const { data: booking } = await db.from("bookings").select(BOOKING_SELECT).eq("id", created.id).single();
  return NextResponse.json({ booking: booking as BookingRow });
}
