// PROTOTYPE ONLY. Churches that offer free member care, with their sample member codes.
// In the real app each church sets its code in its dashboard. A valid code or member link sends a
// membership request; the church approves it, and can end it later when someone no longer qualifies.
// Approvals last a year unless the church re-confirms them.

export type MemberCareChurch = { slug: string; name: string; code: string };

export const memberCareChurches: MemberCareChurch[] = [
  { slug: "grace-fellowship", name: "Grace Fellowship", code: "GRACE2026" },
  { slug: "hope-community", name: "Hope Community Church", code: "HOPE2026" },
];

export function memberCareChurch(slug: string | null | undefined) {
  return slug ? (memberCareChurches.find((c) => c.slug === slug) ?? null) : null;
}

/** Case- and space-insensitive code check. */
export function codeMatches(church: MemberCareChurch, code: string) {
  return code.replace(/\s+/g, "").toUpperCase() === church.code;
}
