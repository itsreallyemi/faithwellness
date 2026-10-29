import { NextResponse, type NextRequest } from "next/server";
import { openSlots } from "@/lib/availability";
import { getCounselor } from "@/lib/counselors";
import { sampleSlots } from "@/lib/sample-slots";
import { accessTokenFor, freeBusy } from "@/lib/server/google";
import { adminDb, calendarConfigured } from "@/lib/server/secrets";
import type { Duration } from "@/lib/types";

const DAYS = 21;

/**
 * Open session times for a counselor, as ISO strings, soonest first.
 * Real counselors: weekly hours minus their Google Calendar busy times, with the 15-minute rest.
 * Sample counselors (no calendar, fictional): weekly hours only, so the prototype keeps working.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const duration: Duration = searchParams.get("duration") === "30" ? 30 : 60;
  const counselor = await getCounselor(searchParams.get("slug") ?? "");
  if (!counselor) return NextResponse.json({ error: "not-found" }, { status: 404 });
  if (duration === 30 ? !counselor.offers30 : !counselor.offers60) return reply({ slots: [], live: false });

  const now = new Date();
  const integration = calendarConfigured
    ? (
        await adminDb()
          .from("integrations")
          .select("counselor_id, check_calendars, status, counselors!inner(slug)")
          .eq("counselors.slug", counselor.slug)
          .maybeSingle()
      ).data
    : null;

  if (!integration) {
    return reply({ slots: sampleSlots(counselor.availability, counselor.timeZone, duration, { from: now, days: DAYS }).map(iso), live: false });
  }

  const token = integration.status === "connected" ? await accessTokenFor(integration.counselor_id) : null;
  const busy = token ? await freeBusy(token, integration.check_calendars, now, new Date(now.getTime() + DAYS * 86_400_000)) : null;
  // If Google can't confirm when they're busy, offer nothing rather than risk a double booking.
  if (!busy) return reply({ slots: [], live: true, unavailable: true });

  return reply({ slots: openSlots(counselor.availability, counselor.timeZone, duration, busy, { from: now, days: DAYS }).map(iso), live: true });
}

const iso = (d: Date) => d.toISOString();

function reply(body: { slots: string[]; live: boolean; unavailable?: boolean }) {
  return NextResponse.json(body, { headers: { "Cache-Control": "no-store" } });
}
