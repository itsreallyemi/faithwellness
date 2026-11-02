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
export type AccountKind = "client" | "provider" | "staff" | "church";

/** The church a church admin manages (from public.my_church), or null. Set at sign-in, before signed-in. */
export let ownChurch: { slug: string; name: string } | null = null;
export function setOwnChurch(church: { slug: string; name: string } | null) {
  ownChurch = church;
}
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

/** The signed-in person's profile photo (profiles.avatar_url), for the header and account page. */
let ownAvatar: string | null = null;
const avatarListeners = new Set<() => void>();

export function setOwnAvatar(url: string | null) {
  if (url === ownAvatar) return;
  ownAvatar = url;
  avatarListeners.forEach((l) => l());
}

export function useOwnAvatar() {
  return useSyncExternalStore(
    (l) => {
      avatarListeners.add(l);
      return () => avatarListeners.delete(l);
    },
    () => ownAvatar,
    () => null,
  );
}

/** Asks the server to email whoever should hear about a change just saved. Fire and forget. */
export function notify(
  kind: "service-requested" | "service-answered" | "application-decided" | "church-application-decided" | "message-sent" | "problem-reported" | "problem-resolved",
  id: string,
) {
  fetch("/api/notify", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ kind, id }) }).catch(() => {});
}

/** True once the signed-in client has answered or skipped the questions (saved to their account). */
let intakeSettled = false;
const intakeListeners = new Set<() => void>();

export function setIntakeSettled(next: boolean) {
  if (next === intakeSettled) return;
  intakeSettled = next;
  intakeListeners.forEach((l) => l());
}

export function useIntakeSettled() {
  return useSyncExternalStore(
    (l) => {
      intakeListeners.add(l);
      return () => intakeListeners.delete(l);
    },
    () => intakeSettled,
    () => false,
  );
}

/** Where each kind of account lands: after signing in (with nowhere particular to go) and from the logo. */
export function homeFor(kind: AccountKind) {
  if (kind === "staff") return "/admin";
  if (kind === "church" && ownChurch) return `/church/${ownChurch.slug}`;
  if (kind === "provider") return ownCounselorSlug ? "/portal" : "/for-counselors#apply";
  return "/counselors";
}
