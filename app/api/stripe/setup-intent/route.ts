import { NextResponse } from "next/server";
import { customerFor } from "@/lib/server/payments";
import { stripe, stripeConfigured } from "@/lib/server/stripe";
import { supabaseServer } from "@/lib/supabase/server";

/** Starts saving a card for the signed-in member (charged later, 24 hours before their session). */
export async function POST() {
  if (!stripeConfigured) return NextResponse.json({ error: "not-configured" }, { status: 503 });
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "signed-out" }, { status: 401 });
  const customer = await customerFor(user.id, user.email ?? "");
  const intent = await stripe().setupIntents.create({ customer, usage: "off_session" });
  return NextResponse.json({ clientSecret: intent.client_secret });
}
