"use client";

// PROTOTYPE ONLY. Fake account, bookings and messages kept in this browser's localStorage.
// Replaced by Supabase Auth, the bookings table and Realtime messaging in Phases 3, 6 and 7.

import { useSyncExternalStore } from "react";
import type { Duration } from "@/lib/types";
import type { Intake } from "@/lib/prototype/intake";

const KEY = "fw-prototype-v1";

export type ProtoUser = {
  name: string;
  email: string;
  /** IANA zone the client chose. Unset means "use this device's time zone". */
  timeZone?: string;
};

export type ProtoBooking = {
  id: string;
  slug: string;
  startIso: string;
  duration: Duration;
  feeCents: number;
  status: "confirmed" | "canceled";
  meetUrl: string;
  note: string;
  createdIso: string;
  rescheduledFrom?: string;
  /** Booked free through the client's church member care. */
  memberCare?: boolean;
  /** Set when the client chose to use insurance. The counselor verifies it and bills the insurer directly. */
  insurance?: ProtoInsurance;
};

export type ProtoInsurance = {
  provider: string;
  /** Only the last four characters are kept in the prototype. The real app encrypts the full ID. */
  memberIdLast4: string;
  groupNumber: string;
  status: "pending" | "verified" | "not-covered";
};

/**
 * A church membership. The member requests it with the church's code or link, and the church
 * approves it. The church can end it later, since people join, leave and stop qualifying over time.
 */
export type ProtoMembership = {
  churchSlug: string;
  churchName: string;
  status: "pending" | "verified" | "declined" | "ended";
  requestedIso: string;
  /** When the current status was set. */
  updatedIso: string;
  /** Approved memberships last a year unless the church re-confirms them. */
  expiresIso?: string;
};

/** Days before expiry that a membership counts as up for renewal. */
export const RENEWAL_WINDOW_DAYS = 30;
const DAY = 86_400_000;
const YEAR = 365 * DAY;

/** The status a member actually has right now, including lapsed approvals. */
export function membershipStatus(m: ProtoMembership, now = Date.now()): ProtoMembership["status"] | "expired" {
  if (m.status === "verified" && m.expiresIso && new Date(m.expiresIso).getTime() <= now) return "expired";
  return m.status;
}

/** True when an approved membership expires within the renewal window. */
export function isUpForRenewal(m: ProtoMembership, now = Date.now()) {
  return membershipStatus(m, now) === "verified" && Boolean(m.expiresIso) && new Date(m.expiresIso!).getTime() - now <= RENEWAL_WINDOW_DAYS * DAY;
}

export type ProtoMessage = {
  id: string;
  from: "client" | "counselor" | "system";
  body: string;
  at: string;
  bookingId?: string;
};

export type ProtoState = {
  user: ProtoUser | null;
  memberships: ProtoMembership[];
  /** Onboarding answers. Kept even when signed out, so a visitor can answer before creating an account. */
  intake: Intake | null;
  bookings: ProtoBooking[];
  threads: Record<string, ProtoMessage[]>;
  toast: string | null;
};

const EMPTY: ProtoState = { user: null, memberships: [], intake: null, bookings: [], threads: {}, toast: null };

let state: ProtoState | null = null;
const listeners = new Set<() => void>();

function load(): ProtoState {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return EMPTY;
    const { membership, ...saved } = JSON.parse(raw);
    // Earlier prototype versions stored a single `membership`.
    // Earlier versions stored instant, status-less memberships; treat those as approved.
    const memberships = (saved.memberships ?? (membership ? [membership] : [])).map(
      (m: Partial<ProtoMembership> & { verifiedIso?: string }) => {
        const full = { status: "verified", requestedIso: m.verifiedIso, updatedIso: m.verifiedIso, ...m } as ProtoMembership;
        // Approvals saved before expiry existed get a year from when they were approved.
        if (full.status === "verified" && !full.expiresIso) {
          full.expiresIso = new Date(new Date(full.updatedIso).getTime() + YEAR).toISOString();
        }
        return full;
      },
    );
    return { ...EMPTY, ...saved, memberships, toast: null };
  } catch {
    return EMPTY;
  }
}

function get() {
  if (!state) state = load();
  return state;
}

function set(fn: (s: ProtoState) => ProtoState) {
  state = fn(get());
  try {
    localStorage.setItem(KEY, JSON.stringify({ ...state, toast: null }));
  } catch {
    // Private mode or storage blocked: keep working in memory.
  }
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const onStorage = (e: StorageEvent) => {
    if (e.key !== KEY) return;
    state = load();
    listener();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

/** null while rendering on the server and during hydration; the stored state after that. */
export function useProto(): ProtoState | null {
  return useSyncExternalStore(subscribe, get, () => null);
}

/** The signed-in client's membership with this church, whatever its status. */
export function useMembership(churchSlug: string | null | undefined) {
  const s = useProto();
  return (churchSlug && s?.user && s.memberships.find((m) => m.churchSlug === churchSlug)) || null;
}

/** True when the church has approved the signed-in client and the approval hasn't expired. Only then are sessions free. */
export function useIsMemberOf(churchSlug: string | null | undefined) {
  const m = useMembership(churchSlug);
  return Boolean(m && membershipStatus(m) === "verified");
}

const id = () => Math.random().toString(36).slice(2, 10);
const now = () => new Date().toISOString();
const letters = (n: number) => Array.from({ length: n }, () => "abcdefghijkmnopqrstuvwxyz"[Math.floor(Math.random() * 25)]).join("");

function push(slug: string, msg: Omit<ProtoMessage, "id" | "at">) {
  set((s) => ({ ...s, threads: { ...s.threads, [slug]: [...(s.threads[slug] ?? []), { ...msg, id: id(), at: now() }] } }));
}

function setStatus(churchSlug: string, status: ProtoMembership["status"]) {
  set((s) => ({
    ...s,
    memberships: s.memberships.map((m) =>
      m.churchSlug === churchSlug
        ? {
            ...m,
            status,
            updatedIso: now(),
            expiresIso: status === "verified" ? new Date(Date.now() + YEAR).toISOString() : undefined,
          }
        : m,
    ),
  }));
}

let toastTimer: ReturnType<typeof setTimeout> | undefined;

export const proto = {
  /** Set by signOut so pages that need an account don't bounce to /sign-in on the way out. */
  signedOutOnPurpose: false,
  signIn(user: ProtoUser) {
    proto.signedOutOnPurpose = false;
    set((s) => ({ ...s, user }));
  },
  signOut() {
    proto.signedOutOnPurpose = true;
    set((s) => ({ ...s, user: null, memberships: [], intake: null }));
  },
  /**
   * Asks a church to approve membership (after a valid code or link). A person can belong to
   * several churches. Re-requesting after a decline or an ended membership starts over as pending.
   */
  requestMembership(churchSlug: string, churchName: string) {
    set((s) => {
      const existing = s.memberships.find((m) => m.churchSlug === churchSlug);
      const status = existing && membershipStatus(existing);
      if (status === "pending" || status === "verified") return s;
      const fresh: ProtoMembership = { churchSlug, churchName, status: "pending", requestedIso: now(), updatedIso: now() };
      return { ...s, memberships: [...s.memberships.filter((m) => m.churchSlug !== churchSlug), fresh] };
    });
  },
  /** Removes the membership or request entirely (the member's own choice). */
  /** Turns sharing onboarding answers with counselors on or off. Off hides them from every counselor. */
  setIntakeSharing(on: boolean) {
    set((s) => (s.intake ? { ...s, intake: { ...s.intake, shareWithCounselor: on } } : s));
  },
  saveIntake(intake: Intake) {
    set((s) => ({ ...s, intake }));
  },
  leaveMembership(churchSlug: string) {
    set((s) => ({ ...s, memberships: s.memberships.filter((m) => m.churchSlug !== churchSlug) }));
  },
  /** Stand-ins for what the church does in its dashboard. */
  church: {
    approve: (churchSlug: string) => setStatus(churchSlug, "verified"),
    /** Re-confirming is the same as approving again: another year from today. */
    reconfirm: (churchSlug: string) => setStatus(churchSlug, "verified"),
    decline: (churchSlug: string) => setStatus(churchSlug, "declined"),
    end: (churchSlug: string) => setStatus(churchSlug, "ended"),
  },
  /** PROTOTYPE ONLY: move a membership's expiry so renewal can be tried without waiting a year. */
  setDaysUntilExpiry(churchSlug: string, days: number) {
    set((s) => ({
      ...s,
      memberships: s.memberships.map((m) =>
        m.churchSlug === churchSlug ? { ...m, expiresIso: new Date(Date.now() + days * DAY).toISOString() } : m,
      ),
    }));
  },
  /** PROTOTYPE ONLY: fills My sessions with past, upcoming and canceled examples. */
  addSampleSessions(slugs: string[]) {
    const at = (days: number, hour: number) => {
      const d = new Date(Date.now() + days * DAY);
      d.setUTCHours(hour, 0, 0, 0);
      return d.toISOString();
    };
    const [a = "ruth-okafor", b = "sarah-park", c = "james-whitfield"] = slugs;
    const make = (slug: string, startIso: string, status: ProtoBooking["status"], feeCents: number, memberCare = false): ProtoBooking => ({
      id: id(),
      slug,
      startIso,
      duration: 60,
      feeCents,
      status,
      meetUrl: `https://meet.google.com/${letters(3)}-${letters(4)}-${letters(3)}`,
      note: "",
      createdIso: now(),
      memberCare,
    });
    set((s) => ({
      ...s,
      bookings: [
        ...s.bookings,
        make(a, at(6, 17), "confirmed", 0, true),
        make(b, at(20, 16), "confirmed", 7500),
        make(a, at(-14, 17), "confirmed", 0, true),
        make(a, at(-35, 18), "confirmed", 8000),
        make(c, at(-9, 21), "canceled", 3000),
      ],
    }));
  },
  updateUser(patch: Partial<ProtoUser>) {
    set((s) => (s.user ? { ...s, user: { ...s.user, ...patch } } : s));
  },
  /**
   * Deletes the account and everything tied to it on this device. In the real app this also
   * cancels upcoming sessions, tells those counselors, and removes the client's messages and answers.
   */
  deleteAccount() {
    proto.signedOutOnPurpose = true;
    set(() => EMPTY);
  },
  reset() {
    set(() => EMPTY);
  },
  toast(message: string) {
    set((s) => ({ ...s, toast: message }));
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => set((s) => ({ ...s, toast: null })), 3500);
  },

  send(slug: string, body: string) {
    const hadReply = (get().threads[slug] ?? []).some((m) => m.from === "counselor");
    push(slug, { from: "client", body });
    if (!hadReply) {
      setTimeout(
        () =>
          push(slug, {
            from: "counselor",
            body: "Thank you for reaching out. I’ve read your message and I’ll reply properly within a day.",
          }),
        1500,
      );
    }
  },

  book(b: Pick<ProtoBooking, "slug" | "startIso" | "duration" | "feeCents" | "note" | "rescheduledFrom" | "memberCare" | "insurance">) {
    const booking: ProtoBooking = {
      ...b,
      id: id(),
      status: "confirmed",
      meetUrl: `https://meet.google.com/${letters(3)}-${letters(4)}-${letters(3)}`,
      createdIso: now(),
    };
    if (b.rescheduledFrom) proto.cancel(b.rescheduledFrom, "Rescheduled to a new time.");
    set((s) => ({ ...s, bookings: [...s.bookings, booking] }));
    if (b.note.trim()) push(b.slug, { from: "client", body: b.note.trim() });
    push(b.slug, { from: "system", body: "Session confirmed", bookingId: booking.id });
    setTimeout(
      () =>
        push(b.slug, {
          from: "counselor",
          body: "Your Meet link is ready. Find a quiet spot where you can talk freely — see you then.",
        }),
      1500,
    );
    return booking.id;
  },

  /** Stand-in for the counselor confirming (or not) the client's coverage. */
  setInsuranceStatus(bookingId: string, status: ProtoInsurance["status"]) {
    set((s) => ({
      ...s,
      bookings: s.bookings.map((b) => (b.id === bookingId && b.insurance ? { ...b, insurance: { ...b.insurance, status } } : b)),
    }));
  },
  cancel(bookingId: string, reason = "Session canceled.") {
    const booking = get().bookings.find((b) => b.id === bookingId);
    if (!booking || booking.status === "canceled") return;
    set((s) => ({
      ...s,
      bookings: s.bookings.map((b) => (b.id === bookingId ? { ...b, status: "canceled" } : b)),
    }));
    push(booking.slug, { from: "system", body: reason, bookingId });
  },
};
