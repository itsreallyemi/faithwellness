import { NextResponse, type NextRequest } from "next/server";
import { BOOKING_SELECT } from "@/lib/bookings";
import { cardBelongsTo, chargeBooking, customerFor } from "@/lib/server/payments";
import { adminDb } from "@/lib/server/secrets";
import { stripeConfigured } from "@/lib/server/stripe";
import { supabaseServer } from "@/lib/supabase/server";

/** The member's card was declined: charge the session again, with the card they've just chosen. */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!stripeConfigured) return NextResponse.json({ error: "not-configured" }, { status: 503 });
  const { id } = await params;
  const { paymentMethodId } = (await request.json().catch(() => ({}))) as {
    paymentMethodId?: string;
  };
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "signed-out" }, { status: 401 });

  const db = adminDb();
  const { data: b } = await db.from("bookings").select("client_id, status, payment_status").eq("id", id).maybeSingle();
  if (!b || b.client_id !== user.id) return NextResponse.json({ error: "not-found" }, { status: 404 });
  if (b.status !== "confirmed" || b.payment_status !== "failed") return NextResponse.json({ error: "not-failed" }, { status: 409 });

  const customer = await customerFor(user.id, user.email ?? "");
  if (!paymentMethodId || !(await cardBelongsTo(paymentMethodId, customer).catch(() => false))) {
    return NextResponse.json({ error: "card-needed" }, { status: 400 });
  }
  await db
    .from("bookings")
    .update({
      payment_status: "card_saved",
      payment_method_id: paymentMethodId,
      payment_error: "",
    })
    .eq("id", id)
    .eq("payment_status", "failed");
  const result = await chargeBooking(id);
  const { data: booking } = await db.from("bookings").select(BOOKING_SELECT).eq("id", id).maybeSingle();
  if (result === "failed") return NextResponse.json({ error: "card-declined", booking }, { status: 402 });
  return NextResponse.json({ ok: true, booking });
}
