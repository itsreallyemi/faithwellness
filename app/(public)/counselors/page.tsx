import type { Metadata } from "next";
import Link from "next/link";
import { CounselorCard } from "@/components/CounselorCard";
import {
  ClearFiltersButton,
  DirectoryProvider,
  FilterPanel,
  MobileFilterBar,
  ResultsHeader,
  SearchBar,
} from "@/components/directory/DirectoryControls";
import { CrisisNotice } from "@/components/ui/CrisisNotice";
import { getCounselors, getFocusAreas } from "@/lib/counselors";
import { denominationCounts, filterCounselors, parseFilters } from "@/lib/directory";

export const metadata: Metadata = {
  title: "Find a counselor",
  description:
    "Pastoral and Christian counselors from churches you know. Video sessions, 30 or 60 minutes, booked in a few taps.",
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function DirectoryPage({ searchParams }: { searchParams: SearchParams }) {
  const [all, focusAreas, params] = await Promise.all([getCounselors(), getFocusAreas(), searchParams]);
  const filters = parseFilters(params);
  const results = filterCounselors(all, filters);
  const focusLabels = Object.fromEntries(focusAreas.map((a) => [a.slug, a.label]));
  const churches = [...new Map(all.flatMap((c) => (c.church ? [[c.church.slug, c.church]] : []))).values()]
    .map(({ slug, name }) => ({ slug, name }))
    .sort((a, b) => a.name.localeCompare(b.name));

  return (
    <DirectoryProvider
      filters={filters}
      resultCount={results.length}
      facets={{ focusAreas, denominations: denominationCounts(all), churches }}
    >
      <header className="mx-auto flex max-w-[1280px] flex-col gap-3.5 px-4 pt-6 pb-4 md:gap-5 md:px-8 md:pt-14 md:pb-10">
        <h1 className="m-0 max-w-[820px] font-display text-[34px] leading-[1.08] tracking-[-0.01em] md:text-[clamp(36px,4.4vw,60px)] md:leading-[1.05]">
          Find a counselor who understands your faith.
        </h1>
        <p className="m-0 hidden max-w-[640px] text-lg leading-[1.55] text-slate-600 md:block">
          Pastoral and Christian counselors from churches you know. Video sessions, 30 or 60 minutes, booked in a
          few taps.
        </p>
        <SearchBar />
        <p className="m-0 text-[15px] text-slate-600">
          Not sure where to start?{" "}
          <Link href="/get-started" className="inline-flex min-h-11 items-center font-semibold">
            Answer five short questions
          </Link>{" "}
          and we&rsquo;ll suggest counselors who fit.
        </p>
      </header>

      <main className="mx-auto flex max-w-[1280px] flex-col gap-4 px-4 pb-[72px] md:flex-row md:items-start md:gap-8 md:px-8">
        <MobileFilterBar />

        <aside
          aria-label="Filter counselors"
          className="hidden w-[300px] flex-none rounded-xl border border-border-warm bg-white p-6 shadow-card md:block lg:w-[320px]"
        >
          <FilterPanel />
        </aside>

        <section aria-label="Results" className="flex min-w-0 flex-1 flex-col gap-4 md:gap-5">
          <ResultsHeader />

          {results.length > 0 ? (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,340px),1fr))] gap-4 md:gap-6">
              {results.map((c) => (
                <CounselorCard key={c.slug} counselor={c} nextOpening={c.nextOpening} focusLabels={focusLabels} />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-start gap-4 rounded-xl border border-border-warm bg-white p-6 shadow-card md:p-8">
              <h3 className="m-0 font-display text-[22px]">No counselors match those filters</h3>
              <p className="m-0 text-slate-600">Try removing a filter or two, or search for something broader.</p>
              <ClearFiltersButton />
            </div>
          )}

          <CrisisNotice />
        </section>
      </main>
    </DirectoryProvider>
  );
}
