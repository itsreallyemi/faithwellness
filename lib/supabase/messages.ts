"use client";

// Real messages (public.threads and public.messages). Members' threads are mapped to the prototype's
// per-counselor thread shape so the existing Messages page can show them; counselors load theirs per client.

import { proto, type ProtoMessage } from "@/lib/prototype/store";
import { notify, supabaseBrowser } from "./client";

type MessageRow = { id: string; sender_id: string | null; kind: "text" | "system"; body: string; booking_id: string | null; created_at: string };

export type ThreadRow = {
  id: string;
  counselor_id: string;
  client_id: string;
  client_name: string;
  last_message_at: string;
  client_read_at: string | null;
  counselor_read_at: string | null;
  counselor: { slug: string } | null;
  messages: MessageRow[];
};

const THREAD_SELECT =
  "id, counselor_id, client_id, client_name, last_message_at, client_read_at, counselor_read_at, counselor:counselors(slug), messages(id, sender_id, kind, body, booking_id, created_at)";

/** One thread's messages, from the point of view of `side`. */
export function toProtoMessages(t: ThreadRow, side: "client" | "counselor"): ProtoMessage[] {
  const mine = side === "client" ? t.client_id : t.counselor_id;
  return [...t.messages]
    .sort((a, b) => a.created_at.localeCompare(b.created_at))
    .map((m) => ({
      id: m.id,
      from: m.kind === "system" ? "system" : m.sender_id === mine ? side : side === "client" ? "counselor" : "client",
      body: m.body,
      at: m.created_at,
      bookingId: m.booking_id ?? undefined,
    }));
}

export async function loadThreads(userId: string, side: "client" | "counselor"): Promise<ThreadRow[]> {
  const { data } = await supabaseBrowser()
    .from("threads")
    .select(THREAD_SELECT)
    .eq(side === "client" ? "client_id" : "counselor_id", userId)
    .order("last_message_at", { ascending: false });
  return (data as ThreadRow[] | null) ?? [];
}

/** A member's thread ids, by counselor slug (filled by syncClientThreads). */
const clientThreadIds = new Map<string, string>();
export const clientThreadId = (slug: string) => clientThreadIds.get(slug);

/** Loads a member's threads into the prototype store (keyed by counselor slug). */
export async function syncClientThreads(userId: string) {
  const threads = await loadThreads(userId, "client");
  clientThreadIds.clear();
  for (const t of threads) if (t.counselor) clientThreadIds.set(t.counselor.slug, t.id);
  proto.syncRealThreads(Object.fromEntries(threads.filter((t) => t.counselor).map((t) => [t.counselor!.slug, toProtoMessages(t, "client")])));
  return threads;
}

/** A member messages a (real) counselor. Returns false if it didn't send. */
export async function sendToCounselor(slug: string, body: string): Promise<boolean> {
  const sb = supabaseBrowser();
  const { data: threadId, error } = await sb.rpc("thread_with", { p_counselor_slug: slug });
  if (error || !threadId) return false;
  const sent = await sendInThread(threadId as string, body);
  const { data: me } = await sb.auth.getUser();
  if (sent && me.user) await syncClientThreads(me.user.id);
  return sent;
}

/** Sends in an existing thread (either side). The server emails the other person if they're away. */
export async function sendInThread(threadId: string, body: string): Promise<boolean> {
  const { data, error } = await supabaseBrowser().rpc("send_message", { p_thread: threadId, p_body: body }).single();
  if (error || !data) return false;
  notify("message-sent", (data as { id: string }).id);
  return true;
}

export async function markThreadRead(threadId: string) {
  await supabaseBrowser().rpc("mark_thread_read", { p_thread: threadId });
}

/** Calls `onChange` whenever a message arrives in one of the signed-in person's threads. Returns a stop function. */
export function watchMessages(onChange: () => void) {
  const sb = supabaseBrowser();
  const channel = sb
    .channel(`messages-${Math.random().toString(36).slice(2)}`)
    .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, onChange)
    .subscribe();
  return () => {
    sb.removeChannel(channel);
  };
}
