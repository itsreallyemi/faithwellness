import { NextResponse } from "next/server";
import { adminDb } from "@/lib/server/secrets";
import { stripe, stripeConfigured } from "@/lib/server/stripe";
import { supabaseServer } from "@/lib/supabase/server";

/** The signed-in member's most recently saved card, so they don't have to type it in again. */
export async function GET() {
  if (!stripeConfigured) return NextResponse.json({ card: null });
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ card: null }, { status: 401 });
  const { data } = await adminDb().from("profiles").select("stripe_customer_id").eq("id", user.id).maybeSingle();
  if (!data?.stripe_customer_id) return NextResponse.json({ card: null });

  const { data: cards } = await stripe().paymentMethods.list({ customer: data.stripe_customer_id, type: "card", limit: 10 });
  const now = new Date();
  // Newest first; skip cards that have expired.
  const pm = cards.find((c) => c.card && (c.card.exp_year > now.getFullYear() || (c.card.exp_year === now.getFullYear() && c.card.exp_month >= now.getMonth() + 1)));
  if (!pm?.card) return NextResponse.json({ card: null });
  return NextResponse.json({ card: { id: pm.id, brand: pm.card.display_brand ?? pm.card.brand, last4: pm.card.last4 } });
}
