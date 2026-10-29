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
