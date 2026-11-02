import { NextResponse, type NextRequest } from "next/server";
import { chargeDueBookings } from "@/lib/server/payments";
import { stripeConfigured } from "@/lib/server/stripe";

/**
 * Charges saved cards for sessions starting within 24 hours. Called hourly by a Supabase pg_cron job (Vercel's
 * free plan only runs its own crons daily), with CRON_SECRET as a bearer token so nobody else can trigger it.
 */
export async function POST(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) return NextResponse.json({ ok: false }, { status: 401 });
  if (!stripeConfigured) return NextResponse.json({ ok: false, error: "not-configured" }, { status: 503 });
  return NextResponse.json({ ok: true, ...(await chargeDueBookings()) });
}
