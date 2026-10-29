// PROTOTYPE ONLY. The counselor portal's settings and sample sessions, kept in this browser.
// In the real app settings live on the counselors, availability_rules, time_off and integrations
// tables, and sessions come from bookings (RLS: a counselor reads only their own).

import type { AvailabilityRule, Counselor, Duration } from "@/lib/types";

export type PortalGoogle = {
  connected: boolean;
  email: string;
  /** Every calendar on the account, by name. */
  calendars: string[];
  /** Calendars checked for conflicts. */
  check: string[];
  /** The calendar sessions and rest blocks are written to. */
  writeTo: string;
  autoMeet: boolean;
};

export type PortalNotifications = { newBooking: boolean; cancellation: boolean; messages: boolean; dailySummary: boolean };

export type PortalSettings = {
  timeZone: string;
  title: string;
  summary: string;
  about: string;
  offers30: boolean;
  offers60: boolean;
  fee30Cents: number;
  fee60Cents: number;
  free30: boolean;
  free60: boolean;
  slidingScale: boolean;
  hours: AvailabilityRule[];
  /** "YYYY-MM-DD" dates in the counselor's time zone. */
  daysOff: string[];
  google: PortalGoogle;
  notifications: PortalNotifications;
  /** Sample sessions the counselor canceled. */
  canceledSamples: string[];
};

export function defaultSettings(c: Counselor): PortalSettings {
  const first = c.preferredName.toLowerCase();
  const domain = c.church ? `${c.church.slug.replace(/-/g, "")}.org` : "example.org";
  const calendars = [`${c.preferredName} — personal`, c.church ? `${c.church.name} — staff` : `${c.preferredName} — practice`];
  return {
    timeZone: c.timeZone,
    title: c.title,
    summary: c.summary,
    about: c.about.join("\n\n"),
    offers30: c.offers30,
    offers60: c.offers60,
    fee30Cents: c.fee30Cents,
    fee60Cents: c.fee60Cents,
    free30: c.free30,
    free60: c.free60,
    slidingScale: c.slidingScale,
    hours: c.availability,
    daysOff: [],
    google: { connected: false, email: `${first}@${domain}`, calendars, check: calendars, writeTo: calendars[0], autoMeet: true },
    notifications: { newBooking: true, cancellation: true, messages: true, dailySummary: false },
    canceledSamples: [],
  };
}

export type PortalSession = {
  id: string;
  clientName: string;
  clientTimeZone: string;
  startIso: string;
  duration: Duration;
  status: "confirmed" | "canceled";
  firstSession: boolean;
  /** How the session is paid for, in a few words. */
  payment: string;
  meetUrl: string;
  /** Set for the prototype client's own bookings, which the counselor can act on. */
  bookingId?: string;
};

const DAY = 86_400_000;

const sampleClients = [
  { name: "Anna & Mark L.", tz: "Asia/Tokyo" },
  { name: "Samuel O.", tz: "America/Chicago" },
  { name: "Lydia P.", tz: "America/Los_Angeles" },
  { name: "Joel M.", tz: "America/New_York" },
  { name: "Priscilla A.", tz: "America/Los_Angeles" },
  { name: "Thomas R.", tz: "America/Denver" },
];

/** Fictional sessions so the portal has something to show. Same ones every time for the same counselor. */
export function sampleSessions(c: Counselor, settings: PortalSettings, now = Date.now()): PortalSession[] {
  const plan: { days: number; hour: number; client: number; duration: Duration; first?: boolean; payment: string }[] = [
    { days: 0, hour: 16, client: 0, duration: 60, payment: fee(settings, 60) },
    { days: 2, hour: 10, client: 1, duration: 60, payment: "Offer $40 · accepted" },
    { days: 2, hour: 11, client: 2, duration: 30, first: true, payment: fee(settings, 30) },
    { days: 5, hour: 13, client: 3, duration: 60, payment: c.insurance[0] ? `Insurance · ${c.insurance[0]}` : fee(settings, 60) },
    { days: 9, hour: 9, client: 4, duration: 60, payment: fee(settings, 60) },
    { days: -3, hour: 15, client: 0, duration: 60, payment: fee(settings, 60) },
    { days: -6, hour: 10, client: 5, duration: 30, first: true, payment: fee(settings, 30) },
    { days: -13, hour: 14, client: 1, duration: 60, payment: "Offer $40 · accepted" },
  ];
  return plan.map((p, i) => {
    const start = new Date(now + p.days * DAY);
    start.setUTCHours(p.hour + utcShift(c.timeZone, start), p.days === 0 ? 15 : 0, 0, 0);
    const id = `${c.slug}-sample-${i}`;
    const client = sampleClients[p.client];
    return {
      id,
      clientName: client.name,
      clientTimeZone: client.tz,
      startIso: start.toISOString(),
      duration: p.duration,
      status: settings.canceledSamples.includes(id) ? "canceled" : "confirmed",
      firstSession: Boolean(p.first),
      payment: p.payment,
      meetUrl: `https://meet.google.com/smp-${c.slug.slice(0, 4)}-${i}`,
    };
  });
}

function fee(s: PortalSettings, d: Duration) {
  return `$${((d === 30 ? s.fee30Cents : s.fee60Cents) / 100).toFixed(0)}`;
}

/** Hours to add to a counselor-local hour to get UTC on that date. */
function utcShift(timeZone: string, date: Date) {
  const local = Number(new Intl.DateTimeFormat("en-US", { timeZone, hour: "numeric", hourCycle: "h23" }).format(date));
  return (date.getUTCHours() - local + 24) % 24;
}

export const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
/** Monday first, the way most people read a work week. */
export const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];

/** "9:00 AM" from "09:00". */
export function clock(hhmm: string) {
  const [h, m] = hhmm.split(":").map(Number);
  const suffix = h >= 12 ? "PM" : "AM";
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${suffix}`;
}

/** Every quarter hour of the day as "HH:MM", for the hours pickers. */
export const QUARTER_HOURS = Array.from({ length: 96 }, (_, i) => `${String(Math.floor(i / 4)).padStart(2, "0")}:${String((i % 4) * 15).padStart(2, "0")}`);
