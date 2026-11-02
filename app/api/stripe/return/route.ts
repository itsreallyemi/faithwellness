import { NextResponse, type NextRequest } from "next/server";
import { payHeldChurchShares } from "@/lib/server/payments";
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
  // Shares held while the church wasn't set up are paid out now.
  if (ready && owner?.kind === "church") await payHeldChurchShares(owner.id).catch(() => 0);
  return NextResponse.redirect(await payoutsPage(origin, owner, ready ? "ready" : "incomplete"));
}
