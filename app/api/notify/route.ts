import { after, NextResponse, type NextRequest } from "next/server";
import { applicationDecided, churchApplicationDecided, serviceAnswered, serviceRequested } from "@/lib/server/notify";
import { adminDb } from "@/lib/server/secrets";
import { supabaseServer } from "@/lib/supabase/server";

type Kind = "service-requested" | "service-answered" | "application-decided" | "church-application-decided";

/**
 * Called by the browser right after something it saved through Supabase (a service request, a reply, an
 * application review), so the right person gets an email. Only the person who made the change can trigger it.
 */
export async function POST(request: NextRequest) {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false }, { status: 401 });

  const { kind, id } = (await request.json().catch(() => ({}))) as { kind?: Kind; id?: string };
  if (!id) return NextResponse.json({ ok: false }, { status: 400 });
  const db = adminDb();

  if (kind === "service-requested" || kind === "service-answered") {
    const { data: r } = await db.from("service_requests").select("client_id, counselor_id").eq("id", id).maybeSingle();
    const allowed = kind === "service-requested" ? r?.client_id === user.id : r?.counselor_id === user.id;
    if (!allowed) return NextResponse.json({ ok: false }, { status: 404 });
    after(() => (kind === "service-requested" ? serviceRequested(id) : serviceAnswered(id)));
  } else if (kind === "application-decided" || kind === "church-application-decided") {
    const { data: me } = await db.from("profiles").select("role").eq("id", user.id).maybeSingle();
    if (me?.role !== "admin") return NextResponse.json({ ok: false }, { status: 403 });
    after(() => (kind === "application-decided" ? applicationDecided(id) : churchApplicationDecided(id)));
  } else {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
