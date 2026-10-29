import { NextResponse, type NextRequest } from "next/server";
import { CALENDAR_SCOPES, exchangeCode, listCalendars, saveConnection, STATE_COOKIE } from "@/lib/server/google";
import { supabaseServer } from "@/lib/supabase/server";

/** Where Google sends the counselor back. Saves the connection, then returns to portal settings. */
export async function GET(request: NextRequest) {
  const { origin, searchParams } = new URL(request.url);
  const back = (status: string) => {
    const res = NextResponse.redirect(`${origin}/portal/settings?tab=scheduling&calendar=${status}#calendar`);
    res.cookies.delete({ name: STATE_COOKIE, path: "/api/google" });
    return res;
  };

  if (searchParams.get("error")) return back("canceled");
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  if (!code || !state || state !== request.cookies.get(STATE_COOKIE)?.value) return back("expired");

  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return back("expired");

  try {
    const tokens = await exchangeCode(code, `${origin}/api/google/callback`);
    // Google lets people untick permissions on its screen. Without these, bookings can't work.
    const granted = tokens.scope.split(" ");
    if (!CALENDAR_SCOPES.every((s) => granted.includes(s))) return back("missing-permission");
    await saveConnection(user.id, tokens, await listCalendars(tokens.access_token));
    return back("connected");
  } catch (e) {
    console.error("Google Calendar connect failed", e instanceof Error ? e.message : e);
    return back("failed");
  }
}
