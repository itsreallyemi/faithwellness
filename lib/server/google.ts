import "server-only";
import { adminDb, decrypt, encrypt } from "./secrets";

// Google Calendar over plain HTTPS: OAuth for the counselor's permission, then the Calendar API v3.
// See docs/booking-engine.md for how availability and bookings use it.

/** Cookie holding the random value that ties Google's reply to the browser that asked. */
export const STATE_COOKIE = "fw_google_state";

export const CALENDAR_SCOPES = [
  "https://www.googleapis.com/auth/calendar.events",
  "https://www.googleapis.com/auth/calendar.freebusy",
  "https://www.googleapis.com/auth/calendar.calendarlist.readonly",
];

const clientId = () => process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!;
const clientSecret = () => process.env.GOOGLE_CLIENT_SECRET!;

export function authUrl({ redirectUri, state, loginHint }: { redirectUri: string; state: string; loginHint?: string }) {
  const p = new URLSearchParams({
    client_id: clientId(),
    redirect_uri: redirectUri,
    response_type: "code",
    scope: ["openid", "email", ...CALENDAR_SCOPES].join(" "),
    // A refresh token, so FaithWellness can check the calendar when clients look for times.
    access_type: "offline",
    prompt: "consent",
    include_granted_scopes: "true",
    state,
  });
  if (loginHint) p.set("login_hint", loginHint);
  return `https://accounts.google.com/o/oauth2/v2/auth?${p}`;
}

type TokenResponse = {
  access_token: string;
  expires_in: number;
  refresh_token?: string;
  scope: string;
  id_token?: string;
};

async function tokenRequest(body: Record<string, string>): Promise<TokenResponse> {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: clientId(), client_secret: clientSecret(), ...body }),
  });
  if (!res.ok) throw new GoogleError(res.status, await res.text());
  return res.json();
}

export class GoogleError extends Error {
  constructor(
    public status: number,
    body: string,
  ) {
    super(`Google ${status}: ${body.slice(0, 300)}`);
  }
}

export function exchangeCode(code: string, redirectUri: string) {
  return tokenRequest({ code, redirect_uri: redirectUri, grant_type: "authorization_code" });
}

/** The Google account's email, from the ID token Google just sent us over HTTPS. */
export function emailFromIdToken(idToken?: string) {
  if (!idToken) return "";
  try {
    const payload = JSON.parse(Buffer.from(idToken.split(".")[1], "base64url").toString("utf8"));
    return typeof payload.email === "string" ? payload.email : "";
  } catch {
    return "";
  }
}

export type GoogleCalendar = { id: string; name: string; primary: boolean };

/** Calendars the counselor can write to (their own and shared ones with edit rights). */
export async function listCalendars(accessToken: string): Promise<GoogleCalendar[]> {
  const res = await fetch("https://www.googleapis.com/calendar/v3/users/me/calendarList?minAccessRole=writer", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new GoogleError(res.status, await res.text());
  const data = (await res.json()) as { items?: { id: string; summary?: string; summaryOverride?: string; primary?: boolean }[] };
  return (data.items ?? []).map((c) => ({ id: c.id, name: c.summaryOverride || c.summary || c.id, primary: Boolean(c.primary) }));
}

/** Saves a fresh connection: encrypted tokens plus the calendar list, defaulting to the primary calendar. */
export async function saveConnection(counselorId: string, tokens: TokenResponse, calendars: GoogleCalendar[]) {
  const db = adminDb();
  const { data: existing } = await db.from("integrations").select("refresh_token_enc").eq("counselor_id", counselorId).maybeSingle();
  const primary = calendars.find((c) => c.primary) ?? calendars[0];
  const refresh = tokens.refresh_token ? encrypt(tokens.refresh_token) : existing?.refresh_token_enc;
  if (!refresh) throw new Error("Google didn't send a refresh token");
  const { error } = await db.from("integrations").upsert({
    counselor_id: counselorId,
    provider: "google",
    google_email: emailFromIdToken(tokens.id_token),
    refresh_token_enc: refresh,
    access_token_enc: encrypt(tokens.access_token),
    access_expires_at: new Date(Date.now() + (tokens.expires_in - 60) * 1000).toISOString(),
    calendars,
    check_calendars: primary ? [primary.id] : [],
    write_calendar: primary?.id ?? "",
    status: "connected",
    connected_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });
  if (error) throw error;
}

/**
 * A working access token for the counselor, refreshing it when it has expired. Marks the connection
 * needs_reconnect if Google refuses (the counselor revoked access), which also takes them out of the directory.
 */
export async function accessTokenFor(counselorId: string): Promise<string | null> {
  const db = adminDb();
  const { data: row } = await db
    .from("integrations")
    .select("refresh_token_enc, access_token_enc, access_expires_at, status")
    .eq("counselor_id", counselorId)
    .maybeSingle();
  if (!row || row.status !== "connected" || !row.refresh_token_enc) return null;
  if (row.access_token_enc && row.access_expires_at && new Date(row.access_expires_at) > new Date()) return decrypt(row.access_token_enc);
  try {
    const fresh = await tokenRequest({ refresh_token: decrypt(row.refresh_token_enc), grant_type: "refresh_token" });
    await db
      .from("integrations")
      .update({
        access_token_enc: encrypt(fresh.access_token),
        access_expires_at: new Date(Date.now() + (fresh.expires_in - 60) * 1000).toISOString(),
      })
      .eq("counselor_id", counselorId);
    return fresh.access_token;
  } catch (e) {
    if (e instanceof GoogleError && (e.status === 400 || e.status === 401)) {
      await db.from("integrations").update({ status: "needs_reconnect", updated_at: new Date().toISOString() }).eq("counselor_id", counselorId);
    }
    return null;
  }
}

/** Revokes FaithWellness's access at Google and forgets the connection. */
export async function disconnect(counselorId: string) {
  const db = adminDb();
  const { data: row } = await db.from("integrations").select("refresh_token_enc").eq("counselor_id", counselorId).maybeSingle();
  if (row?.refresh_token_enc) {
    await fetch(`https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(decrypt(row.refresh_token_enc))}`, { method: "POST" }).catch(() => {});
  }
  await db.from("integrations").delete().eq("counselor_id", counselorId);
}

/** Busy blocks across the given calendars. Returns null if Google can't be reached, so callers can say so. */
export async function freeBusy(accessToken: string, calendarIds: string[], from: Date, to: Date) {
  const res = await fetch("https://www.googleapis.com/calendar/v3/freeBusy", {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ timeMin: from.toISOString(), timeMax: to.toISOString(), items: calendarIds.map((id) => ({ id })) }),
  });
  if (!res.ok) return null;
  const data = (await res.json()) as { calendars?: Record<string, { busy?: { start: string; end: string }[]; errors?: unknown[] }> };
  const calendars = Object.values(data.calendars ?? {});
  // A calendar Google couldn't read means we can't promise the time is free.
  if (calendars.some((c) => c.errors?.length)) return null;
  return calendars.flatMap((c) => (c.busy ?? []).map((b) => ({ start: new Date(b.start), end: new Date(b.end) })));
}

const SITE = "https://www.faithwellnesscounseling.com";
const eventsUrl = (calendarId: string, path = "") =>
  `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events${path}`;

/**
 * Writes a booked session to the counselor's chosen calendar: the session itself (titled only
 * "FaithWellness session", never the client's name or topic) with a Google Meet link and the client invited,
 * then the opaque 15-minute "Rest" block after it.
 */
export async function createSessionEvents(
  accessToken: string,
  calendarId: string,
  { bookingId, start, end, clientEmail }: { bookingId: string; start: Date; end: Date; clientEmail: string },
) {
  const headers = { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" };
  const session = await fetch(`${eventsUrl(calendarId)}?conferenceDataVersion=1&sendUpdates=all`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      summary: "FaithWellness session",
      description: `A FaithWellness counseling session by video. Join with the Google Meet link.\n\nManage or cancel it at ${SITE}/sessions`,
      start: { dateTime: start.toISOString() },
      end: { dateTime: end.toISOString() },
      attendees: clientEmail ? [{ email: clientEmail }] : [],
      guestsCanSeeOtherGuests: false,
      guestsCanInviteOthers: false,
      visibility: "private",
      conferenceData: { createRequest: { requestId: bookingId, conferenceSolutionKey: { type: "hangoutsMeet" } } },
    }),
  });
  if (!session.ok) throw new GoogleError(session.status, await session.text());
  const event = (await session.json()) as {
    id: string;
    hangoutLink?: string;
    conferenceData?: { entryPoints?: { entryPointType: string; uri: string }[] };
  };
  const meetUrl = event.hangoutLink ?? event.conferenceData?.entryPoints?.find((p) => p.entryPointType === "video")?.uri ?? "";

  const rest = await fetch(`${eventsUrl(calendarId)}?sendUpdates=none`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      summary: "Rest",
      description: "15-minute rest after a FaithWellness session.",
      start: { dateTime: end.toISOString() },
      end: { dateTime: new Date(end.getTime() + 15 * 60_000).toISOString() },
      transparency: "opaque",
      visibility: "private",
    }),
  });
  // The session matters more than the rest block; FaithWellness still keeps the 15 minutes free on its side.
  const restEventId = rest.ok ? ((await rest.json()) as { id: string }).id : null;
  return { eventId: event.id, restEventId, meetUrl };
}

/** Removes a session (Google emails the client) and its rest block. Already-deleted events are fine. */
export async function deleteSessionEvents(accessToken: string, calendarId: string, eventId: string | null, restEventId: string | null) {
  const del = (id: string, notify: boolean) =>
    fetch(eventsUrl(calendarId, `/${encodeURIComponent(id)}?sendUpdates=${notify ? "all" : "none"}`), {
      method: "DELETE",
      headers: { Authorization: `Bearer ${accessToken}` },
    }).then((r) => r.ok || r.status === 404 || r.status === 410);
  const results = await Promise.all([eventId ? del(eventId, true) : true, restEventId ? del(restEventId, false) : true]);
  return results.every(Boolean);
}
