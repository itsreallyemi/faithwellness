import "server-only";
import { adminDb } from "./secrets";

/** The member and counselor's thread, created if needed. Server only (service role). */
export async function threadFor(counselorId: string, clientId: string, clientName: string) {
  const db = adminDb();
  const { data } = await db
    .from("threads")
    .upsert({ counselor_id: counselorId, client_id: clientId, client_name: clientName }, { onConflict: "counselor_id,client_id" })
    .select("id")
    .single();
  return (data as { id: string } | null)?.id ?? null;
}

/**
 * Adds notes about a booking to the conversation: a system note, and optionally someone's own words as a
 * message from them (the client's note when booking, or the counselor's reason for canceling).
 */
export async function addBookingNotes(
  b: { id: string; counselor_id: string; client_id: string; client_name: string },
  system: string,
  words?: { from: "client" | "counselor"; text: string },
) {
  try {
    const threadId = await threadFor(b.counselor_id, b.client_id, b.client_name);
    if (!threadId) return;
    const rows = [
      ...(words?.text.trim()
        ? [{ thread_id: threadId, sender_id: words.from === "client" ? b.client_id : b.counselor_id, kind: "text", body: words.text.trim().slice(0, 4000) }]
        : []),
      { thread_id: threadId, sender_id: null, kind: "system", body: system, booking_id: b.id },
    ];
    const db = adminDb();
    await db.from("messages").insert(rows);
    await db.from("threads").update({ last_message_at: new Date().toISOString() }).eq("id", threadId);
  } catch (e) {
    console.error("Booking note", e instanceof Error ? e.message : e);
  }
}
