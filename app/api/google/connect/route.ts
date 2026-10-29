import { randomBytes } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { authUrl, STATE_COOKIE } from "@/lib/server/google";
import { calendarConfigured } from "@/lib/server/secrets";
import { supabaseServer } from "@/lib/supabase/server";

const SETTINGS = "/portal/settings?tab=scheduling";

/** "Connect Google Calendar" in portal settings. Sends an approved counselor to Google's permission screen. */
export async function GET(request: NextRequest) {
  const { origin } = new URL(request.url);
  const back = (status: string) => NextResponse.redirect(`${origin}${SETTINGS}&calendar=${status}#calendar`);

  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(`${origin}/sign-in?next=${encodeURIComponent(SETTINGS)}`);
  const { data: counselor } = await supabase.from("counselors").select("id").eq("id", user.id).maybeSingle();
  if (!counselor) return back("not-counselor");
  if (!calendarConfigured) return back("not-configured");

  // Checked in the callback, so only the browser that started this can finish it.
  const state = randomBytes(24).toString("hex");
  const res = NextResponse.redirect(authUrl({ redirectUri: `${origin}/api/google/callback`, state, loginHint: user.email ?? undefined }));
  res.cookies.set(STATE_COOKIE, state, { httpOnly: true, secure: origin.startsWith("https"), sameSite: "lax", maxAge: 600, path: "/api/google" });
  return res;
}
