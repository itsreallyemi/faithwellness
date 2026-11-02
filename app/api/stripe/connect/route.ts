import { NextResponse, type NextRequest } from "next/server";
import { onboardingLink, payoutAccount, payoutOwnerFor, payoutsPage, stripeConfigured } from "@/lib/server/stripe";
import { supabaseServer } from "@/lib/supabase/server";

/** "Set up payouts": sends a counselor (?for=counselor) or church admin (?for=church) to Stripe's onboarding. */
export async function GET(request: NextRequest) {
  const { origin, searchParams } = new URL(request.url);
  const kind = searchParams.get("for") === "church" ? "church" : "counselor";

  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(`${origin}/sign-in`);
  const owner = await payoutOwnerFor(user.id, kind);
  if (!owner) return NextResponse.redirect(origin);
  if (!stripeConfigured) return NextResponse.redirect(await payoutsPage(origin, owner, "not-configured"));

  try {
    const account = await payoutAccount(owner, user.email ?? "");
    return NextResponse.redirect(await onboardingLink(account, origin, kind));
  } catch (e) {
    console.error("Stripe connect", e instanceof Error ? e.message : e);
    return NextResponse.redirect(await payoutsPage(origin, owner, "failed"));
  }
}
