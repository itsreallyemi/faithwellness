import "server-only";
import { openSlots } from "@/lib/availability";
import { BOOKING_SELECT, type BookingRow } from "@/lib/bookings";
import type { AvailabilityRule, Duration } from "@/lib/types";
import { accessTokenFor, deleteSessionEvents, freeBusy } from "./google";
import { adminDb } from "./secrets";

/** A published counselor with a connected calendar: everything booking needs, read with the service role. */
export async function bookableCounselor(slug: string) {
  const { data } = await adminDb()
    .from("counselors")
    .select(
      `id, slug, is_published, offers_30, offers_60, fee_30_cents, fee_60_cents, free_30, free_60, church_id, free_for_members,
       profile:profiles!inner(time_zone),
       hours:availability_rules(weekday, start_time, end_time),
       integration:integrations(check_calendars, write_calendar, status)`,
    )
    .eq("slug", slug)
    .maybeSingle();
  if (!data?.is_published) return null;
  const c = data as unknown as {
    id: string;
    slug: string;
    offers_30: boolean;
    offers_60: boolean;
    fee_30_cents: number;
    fee_60_cents: number;
    free_30: boolean;
    free_60: boolean;
    church_id: string | null;
    free_for_members: boolean;
    profile: { time_zone: string };
    hours: { weekday: number; start_time: string; end_time: string }[];
    integration: { check_calendars: string[]; write_calendar: string; status: string } | null;
  };
  if (c.integration?.status !== "connected" || !c.integration.write_calendar) return null;
  const rules: AvailabilityRule[] = c.hours.map((h) => ({ weekday: h.weekday, start: h.start_time.slice(0, 5), end: h.end_time.slice(0, 5) }));
  return { ...c, timeZone: c.profile.time_zone, rules, integration: c.integration };
}

export type BookableCounselor = NonNullable<Awaited<ReturnType<typeof bookableCounselor>>>;

/**
 * Is this start still open right now? Re-asks Google for busy times around it, then applies the same rules
 * as the times shown on the profile (weekly hours, half-hour starts, lead time, 15-minute rest).
 */
export async function stillOpen(c: BookableCounselor, start: Date, duration: Duration) {
  const token = await accessTokenFor(c.id);
  if (!token) return false;
  const pad = 2 * 3_600_000;
  const busy = await freeBusy(token, c.integration.check_calendars, new Date(start.getTime() - pad), new Date(start.getTime() + duration * 60_000 + pad));
  if (!busy) return false;
  const days = Math.ceil((start.getTime() - Date.now()) / 86_400_000) + 2;
  return openSlots(c.rules, c.timeZone, duration, busy, { days }).some((s) => s.getTime() === start.getTime());
}

/**
 * Member care: free when the counselor offers it to their church's members and the client is a verified,
 * unexpired member of that church. Decided here, never trusted from the browser.
 */
export async function isMemberCare(c: BookableCounselor, clientId: string) {
  if (!c.free_for_members || !c.church_id) return false;
  const { data } = await adminDb()
    .from("church_memberships")
    .select("expires_at")
    .eq("church_id", c.church_id)
    .eq("user_id", clientId)
    .eq("status", "verified")
    .maybeSingle();
  return Boolean(data && (!data.expires_at || new Date(data.expires_at) > new Date()));
}

/** Cancels a booking: removes its Google events (Google emails the client), then marks it canceled. */
export async function cancelBooking(id: string, by: "client" | "counselor", reason: string) {
  const db = adminDb();
  const { data: b } = await db
    .from("bookings")
    .select("id, counselor_id, status, google_event_id, rest_event_id")
    .eq("id", id)
    .maybeSingle();
  if (!b || b.status !== "confirmed") return null;
  const token = await accessTokenFor(b.counselor_id);
  const { data: integration } = await db.from("integrations").select("write_calendar").eq("counselor_id", b.counselor_id).maybeSingle();
  if (token && integration?.write_calendar) {
    await deleteSessionEvents(token, integration.write_calendar, b.google_event_id, b.rest_event_id);
  }
  const { data } = await db
    .from("bookings")
    .update({ status: "canceled", canceled_by: by, cancel_reason: reason, canceled_at: new Date().toISOString() })
    .eq("id", id)
    .select(BOOKING_SELECT)
    .single();
  return data as BookingRow | null;
}
