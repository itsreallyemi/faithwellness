"use client";

// The client's answers to the "find a counselor" questions, saved to their account (public.client_intakes).

import type { Intake } from "@/lib/prototype/intake";
import { supabaseBrowser } from "./client";

export async function loadIntake(userId: string): Promise<{ answers: Intake | null; skipped: boolean } | null> {
  const { data } = await supabaseBrowser().from("client_intakes").select("answers, skipped").eq("user_id", userId).maybeSingle();
  return data ? { answers: (data.answers as Intake | null) ?? null, skipped: data.skipped } : null;
}

/** Saves answers (or, with null, that they skipped for now). Quietly does nothing when signed out. */
export async function saveIntakeRemote(answers: Intake | null) {
  const sb = supabaseBrowser();
  const { data } = await sb.auth.getUser();
  if (!data.user) return;
  await sb
    .from("client_intakes")
    .upsert({ user_id: data.user.id, answers, skipped: !answers, updated_at: new Date().toISOString() });
}
