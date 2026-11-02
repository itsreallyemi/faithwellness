import { NextResponse, type NextRequest } from "next/server";
import { payoutOwnerFor, stripe, stripeAccountId } from "@/lib/server/stripe";
import { supabaseServer } from "@/lib/supabase/server";

/** "View payouts in Stripe": a one-time link into the counselor's or church's Stripe Express dashboard. */
export async function GET(request: NextRequest) {
  const { origin, searchParams } = new URL(request.url);
  const kind = searchParams.get("for") === "church" ? "church" : "counselor";
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(`${origin}/sign-in`);
  const owner = await payoutOwnerFor(user.id, kind);
  const account = owner ? await stripeAccountId(owner) : null;
  if (!account) return NextResponse.redirect(origin);
  const link = await stripe().accounts.createLoginLink(account);
  return NextResponse.redirect(link.url);
}
