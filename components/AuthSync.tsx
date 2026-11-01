"use client";

import type { Session } from "@supabase/supabase-js";
import { useEffect } from "react";
import {
  authEnabled,
  setAccountKind,
  setAuthState,
  setIntakeSettled,
  setOwnAvatar,
  setOwnChurch,
  setOwnCounselorSlug,
  supabaseBrowser,
} from "@/lib/supabase/client";
import { loadIntake, saveIntakeRemote } from "@/lib/supabase/intake";
import { syncClientThreads, watchMessages } from "@/lib/supabase/messages";
import { loadMemberships } from "@/lib/supabase/memberships";
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
    // Who's signed in, and the answers last saved for them, so edits to the questions save to the account.
    let userId: string | null = null;
    let stopMessages: (() => void) | null = null;
    let lastSavedIntake = "";
    const stopWatching = proto.subscribe(() => {
      const intake = proto.snapshot().intake;
      if (!userId || !intake || JSON.stringify(intake) === lastSavedIntake) return;
      lastSavedIntake = JSON.stringify(intake);
      setIntakeSettled(true);
      void saveIntakeRemote(intake);
    });

    const sync = async (session: Session | null) => {
      if (!alive) return;
      if (!session) {
        // Real bookings belong to the account, not this browser.
        proto.syncRealBookings([]);
        setIntakeSettled(false);
        userId = null;
        stopMessages?.();
        stopMessages = null;
        proto.syncRealThreads({});
        lastSavedIntake = "";
        setOwnCounselorSlug(null);
        setOwnChurch(null);
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

      // Counselors and applicants are "provider", admins "staff", church admins "church". Set before signed-in, so
      // /sign-in knows where to send them.
      const { data: church } = await sb.rpc("my_church").maybeSingle();
      setOwnChurch(church ? { slug: (church as { slug: string }).slug, name: (church as { name: string }).name } : null);
      if (profile?.role === "admin") setAccountKind("staff");
      else if (profile?.role === "counselor") setAccountKind("provider");
      else if (church) setAccountKind("church");
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
      // Their answers to the questions live on the account, so a new sign-in doesn't ask again.
      const intake = await loadIntake(id);
      if (intake?.answers) {
        lastSavedIntake = JSON.stringify(intake.answers);
        proto.saveIntake(intake.answers);
      } else if (!intake && proto.snapshot().intake) {
        // Answered in this browser before answers were saved to accounts: keep them.
        await saveIntakeRemote(proto.snapshot().intake);
      }
      setIntakeSettled(Boolean(intake || proto.snapshot().intake));
      userId = id;

      // Real conversations with real counselors, kept up to date as messages arrive.
      await syncClientThreads(id);
      stopMessages?.();
      stopMessages = watchMessages(() => {
        if (userId) void syncClientThreads(userId);
      });

      // Church memberships from the database (for member care and the member badge).
      proto.syncMemberships(await loadMemberships(id));

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
      stopWatching();
      stopMessages?.();
      data.subscription.unsubscribe();
    };
  }, []);

  return null;
}

/** Signs out of the real account (when there is one) and clears the browser's prototype account. */
export async function signOutEverywhere() {
  if (authEnabled) await supabaseBrowser().auth.signOut();
  setOwnCounselorSlug(null);
  setOwnChurch(null);
  setAccountKind("client");
  setOwnAvatar(null);
  proto.signOut();
}
