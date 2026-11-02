import { after, NextResponse, type NextRequest } from "next/server";
import { sessionRefunded } from "@/lib/server/notify";
import { refundBooking } from "@/lib/server/payments";
import { adminDb } from "@/lib/server/secrets";
import { stripeConfigured } from "@/lib/server/stripe";
import { supabaseServer } from "@/lib/supabase/server";

/** Refunds a paid session in full. Only its counselor or a FaithWellness admin can. */
export async function POST(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!stripeConfigured) return NextResponse.json({ error: "not-configured" }, { status: 503 });
  const { id } = await params;
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "signed-out" }, { status: 401 });

  const db = adminDb();
  const [{ data: b }, { data: me }] = await Promise.all([
    db.from("bookings").select("counselor_id, payment_status").eq("id", id).maybeSingle(),
    db.from("profiles").select("role").eq("id", user.id).maybeSingle(),
  ]);
  if (!b || (b.counselor_id !== user.id && me?.role !== "admin")) return NextResponse.json({ error: "not-found" }, { status: 404 });
  if (b.payment_status !== "charged") return NextResponse.json({ error: "not-paid" }, { status: 409 });

  if (!(await refundBooking(id))) return NextResponse.json({ error: "failed" }, { status: 502 });
  await db.from("session_problems").update({ status: "refunded", resolved_at: new Date().toISOString() }).eq("booking_id", id).eq("status", "open");
  after(() => sessionRefunded(id));
  return NextResponse.json({ ok: true });
}
