import { NextResponse, type NextRequest } from "next/server";
import { sendSessionReminders } from "@/lib/server/notify";

/**
 * Run once a day by Vercel Cron (vercel.json). Vercel sends CRON_SECRET as a bearer token, so nobody else can
 * trigger it.
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  const reminded = await sendSessionReminders();
  return NextResponse.json({ ok: true, reminded });
}
