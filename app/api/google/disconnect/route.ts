import { NextResponse } from "next/server";
import { disconnect } from "@/lib/server/google";
import { calendarConfigured } from "@/lib/server/secrets";
import { supabaseServer } from "@/lib/supabase/server";

/** "Disconnect" in portal settings: revokes access at Google and removes the connection. */
export async function POST() {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false }, { status: 401 });
  if (!calendarConfigured) return NextResponse.json({ ok: false }, { status: 503 });
  await disconnect(user.id);
  return NextResponse.json({ ok: true });
}
