import { sampleSlots } from "@/lib/sample-slots";
import type { Counselor, Duration } from "@/lib/types";

export type SortKey = "soonest" | "experience";

export type DirectoryFilters = {
  q: string;
  focus: string[];
  denom: string[];
  church: string[];
  sliding: boolean;
  members: boolean;
  length: Duration;
  week: boolean;
  sort: SortKey;
};


type Params = Record<string, string | string[] | undefined>;

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";
const list = (v: string | string[] | undefined) => one(v).split(",").filter(Boolean);

export function parseFilters(params: Params): DirectoryFilters {
  const sort = one(params.sort);
  return {
    q: one(params.q).trim(),
    focus: list(params.focus),
    denom: list(params.denom),
    church: list(params.church),
    sliding: one(params.sliding) === "1",
    members: one(params.members) === "1",
    length: one(params.length) === "30" ? 30 : 60,
    week: one(params.when) === "week",
    sort: sort === "experience" ? "experience" : "soonest",
  };
}

/** Inverse of parseFilters, dropping defaults so URLs stay short. */
export function filtersToQuery(f: DirectoryFilters) {
  const p = new URLSearchParams();
  if (f.q) p.set("q", f.q);
  if (f.focus.length) p.set("focus", f.focus.join(","));
  if (f.denom.length) p.set("denom", f.denom.join(","));
  if (f.church.length) p.set("church", f.church.join(","));
  if (f.sliding) p.set("sliding", "1");
  if (f.members) p.set("members", "1");
  if (f.length === 30) p.set("length", "30");
  if (f.week) p.set("when", "week");
  if (f.sort !== "soonest") p.set("sort", f.sort);
  return p.toString();
}

/** How many filters are on, for the mobile "Filters · N" button. Search and sort don't count. */
export function activeFilterCount(f: DirectoryFilters) {
  return (
    f.focus.length +
    f.denom.length +
    f.church.length +
    (f.sliding ? 1 : 0) +
    (f.members ? 1 : 0) +
    (f.length === 30 ? 1 : 0) +
    (f.week ? 1 : 0)
  );
}

export type DirectoryResult = Counselor & { nextOpening: Date | null };

export function filterCounselors(all: Counselor[], f: DirectoryFilters, now = new Date()): DirectoryResult[] {
  const q = f.q.toLowerCase();
  const weekEnd = now.getTime() + 7 * 24 * 3600_000;

  const results = all
    .map((c) => ({ ...c, nextOpening: sampleSlots(c.availability, c.timeZone, f.length, { from: now })[0] ?? null }))
    .filter((c) => {
      if (f.length === 30 ? !c.offers30 : !c.offers60) return false;
      if (f.focus.length && !f.focus.some((s) => c.focusAreas.includes(s))) return false;
      if (f.denom.length && !f.denom.includes(c.church?.denomination ?? "")) return false;
      if (f.church.length && !f.church.includes(c.church?.slug ?? "")) return false;
      if (f.sliding && !c.slidingScale) return false;
      if (f.members && !c.freeForMembers) return false;
      if (f.week && !(c.nextOpening && c.nextOpening.getTime() <= weekEnd)) return false;
      if (q) {
        const haystack = [
          c.name,
          c.title,
          c.summary,
          c.church?.name,
          c.church?.denomination,
          ...c.focusAreas,
          ...c.helpWith,
        ]
          .join(" ")
          .toLowerCase();
        if (!q.split(/\s+/).every((word) => haystack.includes(word))) return false;
      }
      return true;
    });

  const never = Number.MAX_SAFE_INTEGER;
  return results.sort((a, b) => {
    if (f.sort === "experience") return (b.yearsMinistry ?? 0) - (a.yearsMinistry ?? 0);
    return (a.nextOpening?.getTime() ?? never) - (b.nextOpening?.getTime() ?? never);
  });
}

/** Denominations with how many counselors are in each, most common first. */
export function denominationCounts(all: Counselor[]) {
  const counts = new Map<string, number>();
  for (const c of all) {
    const d = c.church?.denomination;
    if (d) counts.set(d, (counts.get(d) ?? 0) + 1);
  }
  return [...counts].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}
