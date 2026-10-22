import type { Counselor } from "@/lib/types";

/** The bits of a counselor the prototype's client pages need. */
export type CounselorLite = Pick<
  Counselor,
  "slug" | "name" | "preferredName" | "title" | "avatarUrl" | "avatarTint" | "badges" | "insurance" | "timeZone" | "fee30Cents" | "fee60Cents"
> & { churchName: string | null; churchSlug: string | null };

export function toLite(c: Counselor): CounselorLite {
  return {
    slug: c.slug,
    name: c.name,
    preferredName: c.preferredName,
    title: c.title,
    avatarUrl: c.avatarUrl,
    avatarTint: c.avatarTint,
    badges: c.badges,
    insurance: c.insurance,
    timeZone: c.timeZone,
    fee30Cents: c.fee30Cents,
    fee60Cents: c.fee60Cents,
    churchName: c.church?.name ?? null,
    churchSlug: c.church?.slug ?? null,
  };
}
