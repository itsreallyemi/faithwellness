"use client";

import { usePathname, useRouter } from "next/navigation";
import { createContext, useContext, useEffect, useId, useRef, useState, useTransition } from "react";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { FilterChip } from "@/components/ui/FilterChip";
import { cn } from "@/lib/cn";
import {
  activeFilterCount,
  FEE_SLIDER_MAX,
  filtersToQuery,
  type DirectoryFilters,
  type SortKey,
} from "@/lib/directory";
import type { FocusArea } from "@/lib/types";

type Facets = {
  focusAreas: FocusArea[];
  denominations: { name: string; count: number }[];
  churches: { slug: string; name: string }[];
};

type DirectoryState = {
  filters: DirectoryFilters;
  update: (patch: Partial<DirectoryFilters>) => void;
  clear: () => void;
  pending: boolean;
  resultCount: number;
  facets: Facets;
};

const Ctx = createContext<DirectoryState | null>(null);
const useDirectory = () => useContext(Ctx)!;

const EMPTY: Omit<DirectoryFilters, "q" | "sort"> = {
  focus: [],
  denom: [],
  church: [],
  max: null,
  sliding: false,
  members: false,
  length: 60,
  week: false,
};

/** Holds filter state locally so controls respond instantly, and mirrors it into the URL. */
export function DirectoryProvider({
  filters: serverFilters,
  resultCount,
  facets,
  children,
}: {
  filters: DirectoryFilters;
  resultCount: number;
  facets: Facets;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();
  const [filters, setFilters] = useState(serverFilters);
  const serverKey = filtersToQuery(serverFilters);
  useEffect(() => setFilters(serverFilters), [serverKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const update = (patch: Partial<DirectoryFilters>) => {
    const next = { ...filters, ...patch };
    setFilters(next);
    const qs = filtersToQuery(next);
    startTransition(() => router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false }));
  };
  const clear = () => update(EMPTY);

  return (
    <Ctx.Provider value={{ filters, update, clear, pending, resultCount, facets }}>{children}</Ctx.Provider>
  );
}

// Search ---------------------------------------------------------------------

export function SearchBar() {
  const { filters, update } = useDirectory();
  const [q, setQ] = useState(filters.q);
  useEffect(() => setQ(filters.q), [filters.q]);
  const id = useId();

  return (
    <form
      role="search"
      onSubmit={(e) => {
        e.preventDefault();
        const when = new FormData(e.currentTarget).get("when");
        update({ q: q.trim(), ...(when !== null && { week: when === "week" }) });
      }}
      className="flex max-w-[880px] items-center gap-2.5 rounded-lg border border-border-warm bg-white py-1.5 pr-1.5 pl-4 shadow-card md:flex-wrap md:rounded-xl md:p-2.5"
    >
      <Search size={18} strokeWidth={1.8} className="flex-none text-slate-600 md:hidden" aria-hidden="true" />
      <label htmlFor={`${id}-q`} className="sr-only">
        What would you like help with?
      </label>
      <input
        id={`${id}-q`}
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="What would you like help with? e.g. marriage, grief"
        className="min-w-0 flex-1 bg-transparent py-2.5 text-base outline-none placeholder:text-slate-500 md:basis-80 md:px-[18px] md:py-3.5"
      />
      <label htmlFor={`${id}-when`} className="sr-only">
        Availability
      </label>
      <select
        id={`${id}-when`}
        name="when"
        defaultValue={filters.week ? "week" : "any"}
        key={String(filters.week)}
        className="hidden min-h-11 shrink basis-[200px] rounded-pill border border-border bg-cream px-4 text-[15px] md:block"
      >
        <option value="week">Available this week</option>
        <option value="any">Any time</option>
      </select>
      <Button type="submit" className="rounded-md! px-4 md:min-h-[50px] md:rounded-pill! md:px-7 md:text-base">
        Search
      </Button>
    </form>
  );
}

// Filter panel ---------------------------------------------------------------

const toggle = (xs: string[], x: string) => (xs.includes(x) ? xs.filter((y) => y !== x) : [...xs, x]);

function Group({ label, htmlFor, children }: { label: string; htmlFor?: string; children: React.ReactNode }) {
  const Tag = htmlFor ? "label" : "span";
  return (
    <div className="flex flex-col gap-2.5">
      <Tag htmlFor={htmlFor} className="label-overline">
        {label}
      </Tag>
      {children}
    </div>
  );
}

function Check({ checked, onChange, children }: { checked: boolean; onChange: (v: boolean) => void; children: React.ReactNode }) {
  return (
    <label className="flex min-h-11 cursor-pointer items-center gap-2.5 text-[15px]">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="size-[18px] flex-none accent-peach-700"
      />
      {children}
    </label>
  );
}

export function FilterPanel({ inSheet = false }: { inSheet?: boolean }) {
  const { filters: f, update, clear, facets } = useDirectory();
  const [showAllDenoms, setShowAllDenoms] = useState(false);
  const id = useId();
  const denoms = showAllDenoms ? facets.denominations : facets.denominations.slice(0, 4);
  const hiddenDenoms = facets.denominations.length - 4;

  return (
    <div className="flex flex-col gap-[22px]">
      <div className="flex items-center justify-between">
        {inSheet ? (
          <h2 className="m-0 font-display text-xl">Filters</h2>
        ) : (
          <h2 className="m-0 text-[17px] font-semibold">Filters</h2>
        )}
        <button type="button" onClick={clear} className="min-h-11 cursor-pointer text-sm font-semibold text-peach-700">
          Clear all
        </button>
      </div>

      <Group label="Counseling focus">
        <div className="flex flex-wrap gap-2">
          {facets.focusAreas
            .filter((a) => a.featured)
            .map((a) => (
              <FilterChip
                key={a.slug}
                selected={f.focus.includes(a.slug)}
                onChange={() => update({ focus: toggle(f.focus, a.slug) })}
              >
                {a.label}
              </FilterChip>
            ))}
        </div>
      </Group>

      <Group label="Denomination">
        <div className="flex flex-col">
          {denoms.map((d) => (
            <Check key={d.name} checked={f.denom.includes(d.name)} onChange={() => update({ denom: toggle(f.denom, d.name) })}>
              {d.name}
              <span className="ml-auto text-[13px] text-slate-500">{d.count}</span>
            </Check>
          ))}
        </div>
        {hiddenDenoms > 0 && (
          <button
            type="button"
            onClick={() => setShowAllDenoms((s) => !s)}
            className="min-h-8 cursor-pointer self-start text-sm font-semibold text-peach-700"
          >
            {showAllDenoms ? "Show fewer" : `Show ${hiddenDenoms} more`}
          </button>
        )}
      </Group>

      <ChurchFilter id={`${id}-church`} />

      <FeeFilter />

      <Group label="Session length">
        <div role="radiogroup" aria-label="Session length" className="grid grid-cols-2 rounded-pill bg-cream-200 p-1">
          {([30, 60] as const).map((n) => (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={f.length === n}
              onClick={() => update({ length: n })}
              className={cn(
                "min-h-11 cursor-pointer rounded-pill text-sm",
                f.length === n && "bg-white font-semibold shadow-[0_1px_3px_rgba(45,55,72,.12)]",
              )}
            >
              {n} min
            </button>
          ))}
        </div>
      </Group>
    </div>
  );
}

function ChurchFilter({ id }: { id: string }) {
  const { filters: f, update, facets } = useDirectory();
  const [query, setQuery] = useState("");
  const matches = query.trim()
    ? facets.churches
        .filter((c) => !f.church.includes(c.slug) && c.name.toLowerCase().includes(query.trim().toLowerCase()))
        .slice(0, 5)
    : [];

  return (
    <Group label="Church affiliation" htmlFor={id}>
      <input
        id={id}
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search churches"
        autoComplete="off"
        className="rounded-md border border-border bg-cream px-3.5 py-3 text-[15px]"
      />
      {matches.length > 0 && (
        <ul className="m-0 flex list-none flex-col rounded-md border border-border p-1" aria-label="Matching churches">
          {matches.map((c) => (
            <li key={c.slug}>
              <button
                type="button"
                className="flex min-h-11 w-full cursor-pointer items-center rounded-sm px-3 text-left text-[15px] hover:bg-cream"
                onClick={() => {
                  update({ church: [...f.church, c.slug] });
                  setQuery("");
                }}
              >
                {c.name}
              </button>
            </li>
          ))}
        </ul>
      )}
      {query.trim() && matches.length === 0 && <p className="m-0 text-sm text-slate-600">No churches match.</p>}
      {f.church.length > 0 && (
        <ul className="m-0 flex list-none flex-wrap gap-1.5 p-0">
          {f.church.map((slug) => {
            const name = facets.churches.find((c) => c.slug === slug)?.name ?? slug;
            return (
              <li key={slug}>
                <button
                  type="button"
                  onClick={() => update({ church: f.church.filter((s) => s !== slug) })}
                  aria-label={`Remove ${name}`}
                  className="inline-flex min-h-8 cursor-pointer items-center gap-1 rounded-sm bg-cream-200 px-2.5 text-[13px]"
                >
                  {name}
                  <X size={14} strokeWidth={1.8} aria-hidden="true" />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </Group>
  );
}

function FeeFilter() {
  const { filters: f, update } = useDirectory();
  const [value, setValue] = useState(f.max ?? FEE_SLIDER_MAX);
  useEffect(() => setValue(f.max ?? FEE_SLIDER_MAX), [f.max]);

  // Commit to the URL shortly after the thumb stops moving.
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const onChange = (v: number) => {
    setValue(v);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => update({ max: v >= FEE_SLIDER_MAX ? null : v }), 300);
  };
  const label = value >= FEE_SLIDER_MAX ? "Any fee" : value === 0 ? "Free only" : `Up to $${value}`;
  const id = useId();

  return (
    <Group label={`Session fee (${f.length} min)`} htmlFor={id}>
      <input
        id={id}
        type="range"
        min={0}
        max={FEE_SLIDER_MAX}
        step={10}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-valuetext={label}
        className="fee-range h-6 w-full cursor-pointer"
        style={{ "--fill": `${(value / FEE_SLIDER_MAX) * 100}%` } as React.CSSProperties}
      />
      <div className="flex justify-between text-[13px] text-slate-600">
        <span>Free</span>
        <span className="font-semibold text-slate-900">{label}</span>
        <span>${FEE_SLIDER_MAX}+</span>
      </div>
      <div className="flex flex-col">
        <Check checked={f.sliding} onChange={(v) => update({ sliding: v })}>
          Sliding scale offered
        </Check>
        <Check checked={f.members} onChange={(v) => update({ members: v })}>
          Free for church members
        </Check>
      </div>
    </Group>
  );
}

// Mobile bar + sheet ------------------------------------------------------------

export function MobileFilterBar() {
  const { filters: f, update, resultCount, facets } = useDirectory();
  const sheet = useRef<HTMLDialogElement>(null);
  const count = activeFilterCount(f);

  return (
    <div className="md:hidden">
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
        <button
          type="button"
          onClick={() => sheet.current?.showModal()}
          className="flex min-h-11 flex-none cursor-pointer items-center gap-1.5 rounded-pill border-[1.5px] border-slate-900 bg-white px-3.5 text-sm font-semibold"
        >
          <SlidersHorizontal size={16} strokeWidth={1.8} aria-hidden="true" />
          Filters{count > 0 && ` · ${count}`}
        </button>
        {facets.focusAreas
          .filter((a) => a.featured)
          .map((a) => (
            <FilterChip
              key={a.slug}
              selected={f.focus.includes(a.slug)}
              onChange={() => update({ focus: toggle(f.focus, a.slug) })}
              className="flex-none whitespace-nowrap"
            >
              {a.label}
            </FilterChip>
          ))}
      </div>

      <dialog
        ref={sheet}
        aria-label="Filters"
        onClick={(e) => e.target === sheet.current && sheet.current.close()}
        className="mx-0 mt-auto mb-0 max-h-[88dvh] w-full max-w-none rounded-t-xl bg-white p-0 text-slate-900 shadow-[0_-12px_32px_rgba(45,55,72,.12)] backdrop:bg-slate-900/40"
      >
        <div className="flex flex-col gap-4 px-4 pt-2.5 pb-6">
          <div className="h-[5px] w-10 self-center rounded-[3px] bg-border" aria-hidden="true" />
          <FilterPanel inSheet />
          <Button size="lg" className="sticky bottom-0 w-full" onClick={() => sheet.current?.close()}>
            Show {resultCount} {resultCount === 1 ? "counselor" : "counselors"}
          </Button>
        </div>
      </dialog>
    </div>
  );
}

// Results header ----------------------------------------------------------------

const sortLabels: Record<SortKey, string> = {
  soonest: "Soonest available",
  fee: "Fee: low to high",
  experience: "Most experienced",
};

export function ResultsHeader() {
  const { filters: f, update, resultCount, pending, facets } = useDirectory();
  const id = useId();
  const summary = [
    ...f.focus.map((s) => facets.focusAreas.find((a) => a.slug === s)?.label ?? s),
    ...f.denom,
    ...f.church.map((s) => facets.churches.find((c) => c.slug === s)?.name ?? s),
    f.max !== null && (f.max === 0 ? "free" : `up to $${f.max}`),
    f.sliding && "sliding scale",
    f.members && "free for members",
    f.length === 30 && "30 min",
    f.week && "this week",
    f.q && `“${f.q}”`,
  ].filter(Boolean);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex flex-col gap-1" aria-live="polite">
        <h2 className={cn("m-0 text-base font-bold md:font-display md:text-[28px] md:leading-[34px] md:font-medium", pending && "opacity-60")}>
          {resultCount} {resultCount === 1 ? "counselor" : "counselors"}
        </h2>
        {summary.length > 0 && <span className="hidden text-sm text-slate-600 md:block">{summary.join(" · ")}</span>}
      </div>
      <label htmlFor={id} className="flex items-center gap-2.5 text-sm text-slate-600">
        <span className="sr-only md:not-sr-only">Sort by</span>
        <select
          id={id}
          value={f.sort}
          onChange={(e) => update({ sort: e.target.value as SortKey })}
          className="min-h-11 rounded-pill border border-border bg-white px-3.5 text-sm text-slate-900"
        >
          {Object.entries(sortLabels).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}

export function ClearFiltersButton() {
  const { update } = useDirectory();
  return (
    <Button variant="secondary" onClick={() => update({ ...EMPTY, q: "" })}>
      Clear search and filters
    </Button>
  );
}
