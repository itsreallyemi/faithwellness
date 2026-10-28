"use client";

import type { Session } from "@supabase/supabase-js";
import { useEffect } from "react";
import { authEnabled, setAuthState, setOwnCounselorSlug, supabaseBrowser } from "@/lib/supabase/client";
import { proto } from "@/lib/prototype/store";

/**
 * Bridges the real Supabase sign-in to the prototype pages, which still read the account from the
 * browser store. Signing in fills it from the person's profile; signing out (or an expired session) clears it.
 * Removed once bookings, messages and memberships move to the database.
 */
export function AuthSync() {
  useEffect(() => {
    if (!authEnabled) return;
    const sb = supabaseBrowser();
    let alive = true;

    const sync = async (session: Session | null) => {
      if (!alive) return;
      if (!session) {
        setOwnCounselorSlug(null);
        if (proto.snapshot().user) {
          proto.signOut();
          proto.signedOutOnPurpose = false;
        }
        setAuthState("signed-out");
        return;
      }

      const { id, email = "" } = session.user;
      const { data: profile } = await sb.from("profiles").select("full_name, role").eq("id", id).maybeSingle();
      const name = profile?.full_name?.trim() ?? "";
      const current = proto.snapshot().user;
      // A new account has no name yet. /sign-in asks for it before they continue.
      if (name && (current?.email !== email || current.name !== name)) {
        proto.signIn({ name, email, timeZone: current?.email === email ? current.timeZone : undefined });
      }

      if (profile?.role === "counselor") {
        const { data: counselor } = await sb.from("counselors").select("slug").eq("id", id).maybeSingle();
        setOwnCounselorSlug(counselor?.slug ?? null);
        if (counselor?.slug) proto.counselorSignIn(counselor.slug);
      } else {
        setOwnCounselorSlug(null);
      }
      if (alive) setAuthState("signed-in");
    };

    // Supabase asks that its own calls run outside this callback, hence the timeout.
    const { data } = sb.auth.onAuthStateChange((_event, session) => {
      setTimeout(() => sync(session), 0);
    });
    return () => {
      alive = false;
      data.subscription.unsubscribe();
    };
  }, []);

  return null;
}

/** Signs out of the real account (when there is one) and clears the browser's prototype account. */
export async function signOutEverywhere() {
  if (authEnabled) await supabaseBrowser().auth.signOut();
  setOwnCounselorSlug(null);
  proto.signOut();
}
