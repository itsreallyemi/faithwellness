"use client";

// The signed-in counselor's own profile, loaded in the browser (RLS lets them read it before it's published),
// and the portal settings that save to the database. Calendar, notifications and days off are still prototype.

import { COUNSELOR_SELECT, fromRow, type CounselorRow } from "@/lib/counselor-row";
import type { PortalSettings } from "@/lib/prototype/portal";
import type { Counselor, CounselorService } from "@/lib/types";
import { supabaseBrowser } from "./client";

/** Keys from public.counselor_missing(), in checklist order. */
export type GoLiveItem = "introduction" | "focus" | "fees" | "hours" | "calendar";
export const GO_LIVE_ITEMS: GoLiveItem[] = ["introduction", "focus", "fees", "hours", "calendar"];

/** The counselor's Google Calendar connection, without its tokens (only the server can read those). */
export type CalendarConnection = {
  googleEmail: string;
  calendars: { id: string; name: string; primary: boolean }[];
  checkCalendars: string[];
  writeCalendar: string;
  status: "connected" | "needs_reconnect";
};

export type OwnCounselor = {
  id: string;
  counselor: Counselor;
  live: boolean;
  missing: GoLiveItem[];
  newRequests: number;
  calendar: CalendarConnection | null;
};

export async function loadOwnCounselor(slug: string): Promise<OwnCounselor | null> {
  const sb = supabaseBrowser();
  const [{ data }, { data: missing }] = await Promise.all([
    sb.from("counselors").select(`id, is_published, ${COUNSELOR_SELECT}`).eq("slug", slug).maybeSingle(),
    sb.rpc("my_go_live_checklist"),
  ]);
  if (!data) return null;
  const row = data as unknown as CounselorRow & { id: string; is_published: boolean };
  const [{ count }, { data: cal }] = await Promise.all([
    sb.from("service_requests").select("id", { count: "exact", head: true }).eq("counselor_id", row.id).eq("status", "new"),
    sb
      .from("integrations")
      .select("google_email, calendars, check_calendars, write_calendar, status")
      .eq("counselor_id", row.id)
      .maybeSingle(),
  ]);
  return {
    id: row.id,
    counselor: fromRow(row),
    live: row.is_published,
    missing: (missing as GoLiveItem[] | null) ?? [],
    newRequests: count ?? 0,
    calendar: cal
      ? {
          googleEmail: cal.google_email,
          calendars: cal.calendars ?? [],
          checkCalendars: cal.check_calendars ?? [],
          writeCalendar: cal.write_calendar,
          status: cal.status,
        }
      : null,
  };
}

/** Writes the database-backed parts of a settings change. Returns false if anything failed. */
export async function saveSettings(id: string, patch: Partial<PortalSettings>): Promise<boolean> {
  const sb = supabaseBrowser();
  const counselor: Record<string, unknown> = {};
  if (patch.title !== undefined) counselor.title = patch.title;
  if (patch.summary !== undefined) counselor.summary = patch.summary;
  if (patch.about !== undefined) counselor.about = patch.about;
  if (patch.offers30 !== undefined) counselor.offers_30 = patch.offers30;
  if (patch.offers60 !== undefined) counselor.offers_60 = patch.offers60;
  if (patch.fee30Cents !== undefined) counselor.fee_30_cents = patch.fee30Cents;
  if (patch.fee60Cents !== undefined) counselor.fee_60_cents = patch.fee60Cents;
  if (patch.slidingScale !== undefined) counselor.sliding_scale = patch.slidingScale;
  if (patch.free30 !== undefined) counselor.free_30 = patch.free30;
  if (patch.free60 !== undefined) counselor.free_60 = patch.free60;

  if (Object.keys(counselor).length) {
    const { error } = await sb.from("counselors").update(counselor).eq("id", id);
    if (error) return false;
  }
  if (patch.timeZone !== undefined) {
    const { error } = await sb.from("profiles").update({ time_zone: patch.timeZone }).eq("id", id);
    if (error) return false;
  }
  if (patch.hours !== undefined) {
    // Replace the whole week: simpler than diffing, and the list is short.
    const { error } = await sb.from("availability_rules").delete().eq("counselor_id", id);
    if (error) return false;
    if (patch.hours.length) {
      const rows = patch.hours.map((h) => ({ counselor_id: id, weekday: h.weekday, start_time: h.start, end_time: h.end }));
      const { error: insertError } = await sb.from("availability_rules").insert(rows);
      if (insertError) return false;
    }
  }
  return true;
}

export async function saveFocusAreas(id: string, slugs: string[]): Promise<boolean> {
  const sb = supabaseBrowser();
  const { error } = await sb.from("counselor_focus_areas").delete().eq("counselor_id", id);
  if (error) return false;
  if (!slugs.length) return true;
  const { error: insertError } = await sb
    .from("counselor_focus_areas")
    .insert(slugs.map((focus_area_slug) => ({ counselor_id: id, focus_area_slug })));
  return !insertError;
}

export type ServiceDraft = {
  /** Existing row id; missing for a new service. */
  id?: string;
  slug: string | null;
  customName: string;
  pricing: CounselorService["pricing"];
  priceCents: number;
  note: string;
};

/**
 * Makes the counselor's services match `next`: removes ones they unticked, updates the rest and adds new ones.
 * Rows are kept rather than replaced, so requests already sent stay linked to their service.
 */
export type TravelDraft = Pick<Counselor, "serviceArea" | "travel" | "travelMiles" | "travelFee" | "travelFeeCents">;

export async function saveServices(
  id: string,
  current: CounselorService[],
  next: ServiceDraft[],
  travel: TravelDraft,
): Promise<boolean> {
  const sb = supabaseBrowser();
  const { error: travelError } = await sb
    .from("counselors")
    .update({
      service_area: travel.serviceArea.trim(),
      travel: travel.travel,
      travel_miles: travel.travel === "radius" ? travel.travelMiles : null,
      travel_fee: travel.travel === "none" ? "none" : travel.travelFee,
      travel_fee_cents: travel.travel !== "none" && (travel.travelFee === "fixed" || travel.travelFee === "per_mile") ? travel.travelFeeCents : 0,
    })
    .eq("id", id);
  if (travelError) return false;
  const keep = new Set(next.flatMap((s) => (s.id ? [s.id] : [])));
  const removed = current.filter((s) => !keep.has(s.id)).map((s) => s.id);
  if (removed.length) {
    const { error } = await sb.from("counselor_services").delete().in("id", removed);
    if (error) return false;
  }
  for (const [sort, s] of next.entries()) {
    const row = {
      counselor_id: id,
      service_slug: s.slug,
      custom_name: s.slug ? "" : s.customName.trim(),
      pricing: s.pricing,
      price_cents: s.pricing === "ask" ? 0 : s.priceCents,
      note: s.note.trim(),
      sort,
    };
    const { error } = s.id
      ? await sb.from("counselor_services").update(row).eq("id", s.id)
      : await sb.from("counselor_services").insert(row);
    if (error) return false;
  }
  return true;
}

/** Which calendars to check for conflicts, and which one sessions go to. */
export async function saveCalendarChoices(id: string, checkCalendars: string[], writeCalendar: string): Promise<boolean> {
  const { error } = await supabaseBrowser()
    .from("integrations")
    .update({ check_calendars: checkCalendars, write_calendar: writeCalendar, updated_at: new Date().toISOString() })
    .eq("counselor_id", id);
  return !error;
}

/** Revokes FaithWellness's access at Google (server side, since it needs the stored token). */
export async function disconnectCalendar(): Promise<boolean> {
  const res = await fetch("/api/google/disconnect", { method: "POST" });
  return res.ok;
}
