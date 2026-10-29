"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { useSyncExternalStore } from "react";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/** True once Supabase keys are set. Without them the app keeps its prototype sign-in. */
export const authEnabled = Boolean(url && key);

/** Shown only after Google is set up as a sign-in provider in Supabase. */
export const googleEnabled = process.env.NEXT_PUBLIC_AUTH_GOOGLE === "1";

let client: SupabaseClient | null = null;

export function supabaseBrowser() {
  if (!authEnabled) throw new Error("Supabase keys are missing from .env.local");
  return (client ??= createBrowserClient(url!, key!));
}

// Whether the browser knows yet if someone is signed in. Pages that need an account wait for this,
// so they don't bounce to /sign-in while the session is still loading.
type AuthState = "loading" | "signed-in" | "signed-out";
let authState: AuthState = authEnabled ? "loading" : "signed-out";
const listeners = new Set<() => void>();

export function setAuthState(next: AuthState) {
  if (next === authState) return;
  authState = next;
  listeners.forEach((l) => l());
}

/** The portal slug of the signed-in person, when their real account is an approved counselor. */
export let ownCounselorSlug: string | null = null;
export function setOwnCounselorSlug(slug: string | null) {
  ownCounselorSlug = slug;
}

export function useAuthState() {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => authState,
    () => (authEnabled ? "loading" : "signed-out"),
  );
}

/**
 * What kind of account is signed in. Only clients are walked through the "find a counselor" questions;
 * counselors (and people who've applied), FaithWellness staff and, later, church admins skip them.
 */
export type AccountKind = "client" | "provider" | "staff";
let accountKind: AccountKind = "client";
const kindListeners = new Set<() => void>();

export function setAccountKind(next: AccountKind) {
  if (next === accountKind) return;
  accountKind = next;
  kindListeners.forEach((l) => l());
}

export function useAccountKind() {
  return useSyncExternalStore(
    (l) => {
      kindListeners.add(l);
      return () => kindListeners.delete(l);
    },
    () => accountKind,
    () => "client" as AccountKind,
  );
}
