import { NextResponse, type NextRequest } from "next/server";
import { cancelBooking } from "@/lib/server/bookings";
import { adminDb, calendarConfigured } from "@/lib/server/secrets";
import { supabaseServer } from "@/lib/supabase/server";

/** Cancels a real booking, by its client or its counselor. Removes the Google events; Google emails the client. */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!calendarConfigured) return NextResponse.json({ error: "not-configured" }, { status: 503 });
  const { id } = await params;
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "signed-out" }, { status: 401 });

  const { data: b } = await adminDb().from("bookings").select("client_id, counselor_id").eq("id", id).maybeSingle();
  const by = b?.client_id === user.id ? "client" : b?.counselor_id === user.id ? "counselor" : null;
  if (!by) return NextResponse.json({ error: "not-found" }, { status: 404 });

  const { reason } = (await request.json().catch(() => ({}))) as { reason?: string };
  const booking = await cancelBooking(id, by, (reason ?? "").slice(0, 500));
  if (!booking) return NextResponse.json({ error: "not-cancelable" }, { status: 409 });
  return NextResponse.json({ booking });
}
