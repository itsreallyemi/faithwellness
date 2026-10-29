"use client";

import type { Session } from "@supabase/supabase-js";
import { useEffect } from "react";
import { authEnabled, setAccountKind, setAuthState, setOwnAvatar, setOwnCounselorSlug, supabaseBrowser } from "@/lib/supabase/client";
import { proto } from "@/lib/prototype/store";
import { loadClientBookings } from "@/lib/supabase/bookings";

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
        // Real bookings belong to the account, not this browser.
        proto.syncRealBookings([]);
        setOwnCounselorSlug(null);
        setOwnAvatar(null);
        setAccountKind("client");
        if (proto.snapshot().user) {
          proto.signOut();
          proto.signedOutOnPurpose = false;
        }
        setAuthState("signed-out");
        return;
      }

      const { id, email = "" } = session.user;
      const { data: profile } = await sb.from("profiles").select("full_name, role, avatar_url").eq("id", id).maybeSingle();
      const name = profile?.full_name?.trim() ?? "";
      setOwnAvatar(profile?.avatar_url ?? null);
      const current = proto.snapshot().user;
      // A new account has no name yet. /sign-in asks for it before they continue.
      if (name && (current?.email !== email || current.name !== name)) {
        proto.signIn({ name, email, timeZone: current?.email === email ? current.timeZone : undefined });
      }

      // Counselors and applicants are "provider", admins "staff". Set before signed-in, so /sign-in knows where to send them.
      if (profile?.role === "admin") setAccountKind("staff");
      else if (profile?.role === "counselor") setAccountKind("provider");
      else {
        const { data: application } = await sb.from("counselor_applications").select("id").maybeSingle();
        setAccountKind(application ? "provider" : "client");
      }

      if (profile?.role === "counselor") {
        const { data: counselor } = await sb.from("counselors").select("slug").eq("id", id).maybeSingle();
        setOwnCounselorSlug(counselor?.slug ?? null);
        if (counselor?.slug) proto.counselorSignIn(counselor.slug);
      } else {
        setOwnCounselorSlug(null);
      }
      // Real bookings with counselors who have a connected calendar, shown alongside prototype ones.
      proto.syncRealBookings(await loadClientBookings(id));
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
  setAccountKind("client");
  setOwnAvatar(null);
  proto.signOut();
}
