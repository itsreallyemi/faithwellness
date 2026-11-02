import { NextResponse, type NextRequest } from "next/server";
import { payoutOwnerFor, payoutsPage, refreshPayouts } from "@/lib/server/stripe";
import { supabaseServer } from "@/lib/supabase/server";

/** Where Stripe sends people back after onboarding: records whether payouts are ready, then returns to the site. */
export async function GET(request: NextRequest) {
  const { origin, searchParams } = new URL(request.url);
  const kind = searchParams.get("for") === "church" ? "church" : "counselor";
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(`${origin}/sign-in`);
  const owner = await payoutOwnerFor(user.id, kind);
  const ready = owner ? await refreshPayouts(owner).catch(() => false) : false;
  return NextResponse.redirect(await payoutsPage(origin, owner, ready ? "ready" : "incomplete"));
}
