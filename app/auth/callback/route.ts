import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

const EMAIL_TYPES: EmailOtpType[] = ["email", "magiclink", "signup", "email_change", "recovery", "invite"];

/**
 * Where sign-in links land, then finishes on /sign-in.
 * - Email links (our Supabase email templates) arrive with token_hash + type, so the link in the email points at
 *   faithwellnesscounseling.com rather than Supabase, and works even when opened on another device.
 * - Google's redirect sign-in arrives with a one-time code instead.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const raw = searchParams.get("next");
  const next = raw && raw.startsWith("/") && !raw.startsWith("//") ? raw : "/counselors";
  const back = (extra: string) => NextResponse.redirect(`${origin}/sign-in?next=${encodeURIComponent(next)}&${extra}`);

  const supabase = await supabaseServer();
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  if (tokenHash && type && EMAIL_TYPES.includes(type)) {
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
    return error ? back("error=link") : back("welcome=1");
  }

  const code = searchParams.get("code");
  if (!code) return back("error=link");
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  return error ? back("error=link") : back("welcome=1");
}
