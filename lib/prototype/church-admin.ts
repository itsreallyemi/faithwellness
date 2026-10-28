// PROTOTYPE ONLY. Fictional members for each church's admin page, so the dashboard has something to
// manage. In the real app this list comes from the church_memberships table, readable only by that
// church's admins.

import type { ProtoRosterMember } from "@/lib/prototype/store";

const DAY = 86_400_000;

const names = [
  "Maria Lopez",
  "David Chen",
  "Hannah Brooks",
  "Samuel Adeyemi",
  "Grace Kim",
  "Jonathan Reyes",
  "Esther Williams",
  "Michael Okoro",
  "Rebecca Turner",
  "Daniel Nguyen",
  "Naomi Patel",
  "Caleb Johnson",
];

/** Days until expiry for approved members; negative means requested that many days ago. */
const shape: { status: ProtoRosterMember["status"]; days: number }[] = [
  { status: "pending", days: -1 },
  { status: "pending", days: -3 },
  { status: "verified", days: 12 },
  { status: "verified", days: 26 },
  { status: "verified", days: 140 },
  { status: "verified", days: 210 },
  { status: "verified", days: 275 },
  { status: "verified", days: 330 },
  { status: "ended", days: -60 },
];

function offset(slug: string) {
  return [...slug].reduce((n, ch) => n + ch.charCodeAt(0), 0) % names.length;
}

/** The church's starting member list. Same people every time for the same church. */
export function sampleRoster(churchSlug: string, now = Date.now()): ProtoRosterMember[] {
  const start = offset(churchSlug);
  return shape.map((m, i) => {
    const name = names[(start + i) % names.length];
    const iso = (days: number) => new Date(now + days * DAY).toISOString();
    const requested = m.status === "verified" ? iso(m.days - 365) : iso(m.days);
    return {
      id: `${churchSlug}-${i}`,
      name,
      email: `${name.toLowerCase().replace(/\s+/g, ".")}@example.com`,
      status: m.status,
      requestedIso: requested,
      updatedIso: requested,
      expiresIso: m.status === "verified" ? iso(m.days) : undefined,
    };
  });
}

/** A believable monthly total for the church's member sessions, before the prototype user's own. */
export function sampleSessionsThisMonth(churchSlug: string) {
  return 9 + (offset(churchSlug) % 7);
}
