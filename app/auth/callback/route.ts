import { NextResponse, type NextRequest } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

/** Where sign-in links land. Swaps the one-time code for a session, then finishes on /sign-in. */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const raw = searchParams.get("next");
  const next = raw && raw.startsWith("/") && !raw.startsWith("//") ? raw : "/counselors";
  const back = (extra: string) => NextResponse.redirect(`${origin}/sign-in?next=${encodeURIComponent(next)}&${extra}`);

  const code = searchParams.get("code");
  if (!code) return back("error=link");

  const supabase = await supabaseServer();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  return error ? back("error=link") : back("welcome=1");
}
