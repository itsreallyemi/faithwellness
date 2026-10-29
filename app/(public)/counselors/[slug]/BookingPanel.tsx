"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Clock, Gift } from "lucide-react";
import { useViewerTimeZone } from "@/components/LocalTime";
import { MemberBadge } from "@/components/prototype/MemberBadge";
import { memberCareChurch } from "@/lib/prototype/member-care";
import { membershipStatus, useIsMemberOf, useMembership } from "@/lib/prototype/store";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import { zoneCity, zonedDate } from "@/lib/time";
import type { AvailabilityRule, Duration } from "@/lib/types";

type BookingPanelProps = {
  slug: string;
  preferredName: string;
  fee30Cents: number;
  fee60Cents: number;
  offers30: boolean;
  offers60: boolean;
  slidingScale: boolean;
  timeZone: string;
  availability: AvailabilityRule[];
  initialDuration: Duration;
  /** Booking id being moved to a new time, if rescheduling. */
  reschedule: string | null;
  churchSlug: string | null;
  insurance: string[];
};

const DAYS_SHOWN = 5;

export function BookingPanel(p: BookingPanelProps) {
  const lengths = ([30, 60] as const).filter((n) => (n === 30 ? p.offers30 : p.offers60));
  const [len, setLen] = useState<Duration>(lengths.includes(p.initialDuration) ? p.initialDuration : lengths[0]);
  const [dayIdx, setDayIdx] = useState(0);
  const [slotIdx, setSlotIdx] = useState<number | null>(null);
  const router = useRouter();
  const viewerTz = useViewerTimeZone(p.timeZone);
  const memberChurch = memberCareChurch(p.churchSlug);
  const member = useIsMemberOf(p.churchSlug);
  const membership = useMembership(p.churchSlug);
  const pending = membership?.status === "pending";
  const expired = membership ? membershipStatus(membership) === "expired" : false;
  // Prices stay private; the counselor shares their fee with the client directly.
  const feeLabel = member ? <span className="font-semibold text-sage-700">Free for members</span> : "Fee shared privately";

  // Open times come from the server: weekly hours minus Google Calendar busy times (see /api/availability).
  // null while loading. "unavailable" means Google couldn't confirm their calendar, so nothing is offered.
  const [slots, setSlots] = useState<Date[] | null>(null);
  const [unavailable, setUnavailable] = useState(false);
  useEffect(() => {
    let current = true;
    setSlots(null);
    fetch(`/api/availability?slug=${encodeURIComponent(p.slug)}&duration=${len}`)
      .then((r) => r.json())
      .then((d: { slots?: string[]; unavailable?: boolean }) => {
        if (!current) return;
        setSlots((d.slots ?? []).map((iso) => new Date(iso)));
        setUnavailable(Boolean(d.unavailable));
      })
      .catch(() => {
        if (!current) return;
        setSlots([]);
        setUnavailable(true);
      });
    return () => {
      current = false;
    };
  }, [p.slug, len]);

  const days = useMemo(() => {
    if (!slots) return [];
    const byDay = new Map<string, Date[]>();
    for (const s of slots) {
      const d = zonedDate(s, viewerTz);
      const key = `${d.year}-${d.month}-${d.day}`;
      byDay.set(key, [...(byDay.get(key) ?? []), s]);
    }
    return [...byDay.values()].slice(0, DAYS_SHOWN);
  }, [slots, viewerTz]);

  const day = days[dayIdx] ?? [];
  const slot = slotIdx !== null ? day[slotIdx] : undefined;

  const fmt = (d: Date, o: Intl.DateTimeFormatOptions) => d.toLocaleString("en-US", { timeZone: viewerTz, ...o });

  const pickLength = (n: Duration) => {
    setLen(n);
    setDayIdx(0);
    setSlotIdx(null);
  };

  return (
    <aside
      id="book"
      aria-label="Book a session"
      className="flex scroll-mt-6 flex-col gap-5 rounded-[24px] border border-border-warm bg-white p-6 shadow-raised md:rounded-xl md:p-7"
    >
      <div className="flex flex-col gap-1">
        <h2 className="m-0 font-display text-[26px] leading-8">Book a session</h2>
        <span className="text-sm text-slate-600" suppressHydrationWarning>
          Video via Google Meet · times shown in your zone ({zoneCity(viewerTz)})
        </span>
      </div>

      {memberChurch &&
        (member ? (
          <div className="flex flex-col gap-1.5 rounded-md bg-sage-100 px-4 py-3">
            <MemberBadge churchName={memberChurch.name} className="self-start bg-white!" />
            <span className="text-sm leading-normal">
              Sessions with {p.preferredName} are free for you through {memberChurch.name}&rsquo;s member care.
            </span>
          </div>
        ) : expired ? (
          <Link
            href="/membership"
            className="flex items-center gap-2.5 rounded-md border border-border bg-cream px-4 py-3 text-sm leading-snug text-slate-900! no-underline"
          >
            <Clock size={18} strokeWidth={1.8} className="flex-none text-slate-600" aria-hidden="true" />
            <span>
              Your {memberChurch.name} membership <b>needs re-confirming</b>. Request again to book with {p.preferredName}{" "}
              for free.
            </span>
          </Link>
        ) : pending ? (
          <Link
            href="/membership"
            className="flex items-center gap-2.5 rounded-md border border-peach-200 bg-peach-50 px-4 py-3 text-sm leading-snug text-slate-900! no-underline"
          >
            <Clock size={18} strokeWidth={1.8} className="flex-none text-peach-700" aria-hidden="true" />
            <span>
              Your {memberChurch.name} membership is <b>waiting for approval</b>. Once approved, sessions with{" "}
              {p.preferredName} are free.
            </span>
          </Link>
        ) : (
          <Link
            href={`/membership?church=${memberChurch.slug}&next=${encodeURIComponent(`/counselors/${p.slug}#book`)}`}
            className="flex items-center gap-2.5 rounded-md border border-sage-700/30 bg-sage-100/60 px-4 py-3 text-sm leading-snug text-slate-900! no-underline hover:bg-sage-100"
          >
            <Gift size={18} strokeWidth={1.8} className="flex-none text-sage-700" aria-hidden="true" />
            <span>
              Member of {memberChurch.name}? <b className="text-sage-700">Request member access</b> to book free.
            </span>
          </Link>
        ))}

      <div role="radiogroup" aria-label="Session length" className="grid grid-cols-2 gap-2.5">
        {lengths.map((n) => (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={len === n}
            onClick={() => pickLength(n)}
            className={cn(
              "min-h-11 cursor-pointer rounded-[18px] p-3.5 text-center",
              len === n ? "border-2 border-peach-500 bg-peach-50" : "border border-border bg-white hover:border-peach-400",
            )}
          >
            <span className="block text-base font-bold">{n} min</span>
            <span className="mt-0.5 block text-sm text-slate-600">{n === 30 ? "Shorter check-in" : "Full session"}</span>
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-2.5">
        <span className="label-overline">Choose a day</span>
        {!slots ? (
          <div className="grid grid-cols-5 gap-2" aria-hidden="true">
            {Array.from({ length: DAYS_SHOWN }, (_, i) => (
              <div key={i} className="h-14 animate-pulse rounded-md bg-cream-200" />
            ))}
          </div>
        ) : unavailable ? (
          <p className="m-0 text-sm text-slate-600">
            Online booking with {p.preferredName} is paused for a moment. Send them a message to find a time.
          </p>
        ) : days.length === 0 ? (
          <p className="m-0 text-sm text-slate-600">No openings in the next three weeks. Send {p.preferredName} a message.</p>
        ) : (
          <div className="grid grid-cols-5 gap-2">
            {days.map((d, i) => (
              <button
                key={d[0].toISOString()}
                type="button"
                aria-pressed={dayIdx === i}
                aria-label={fmt(d[0], { weekday: "long", month: "long", day: "numeric" })}
                onClick={() => {
                  setDayIdx(i);
                  setSlotIdx(null);
                }}
                className={cn(
                  "min-h-14 cursor-pointer rounded-md py-2",
                  dayIdx === i ? "bg-slate-900 text-white" : "border border-border bg-white hover:border-peach-400",
                )}
              >
                <span className="block text-xs">{fmt(d[0], { weekday: "short" })}</span>
                <span className="block text-lg font-bold">{fmt(d[0], { day: "numeric" })}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {day.length > 0 && (
        <div className="flex flex-col gap-2.5">
          <span className="label-overline">Available times</span>
          <div className="grid grid-cols-3 gap-2">
            {day.map((s, i) => (
              <button
                key={s.toISOString()}
                type="button"
                aria-pressed={slotIdx === i}
                onClick={() => setSlotIdx(i)}
                className={cn(
                  "min-h-11 cursor-pointer rounded-pill px-1.5 text-sm font-semibold",
                  slotIdx === i ? "border-2 border-peach-500 bg-peach-50" : "border border-border bg-white hover:border-peach-400",
                )}
              >
                {fmt(s, { hour: "numeric", minute: "2-digit" })}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex items-center justify-between gap-3 rounded-md bg-cream px-4 py-3.5 text-sm">
        <span>
          {slot
            ? `${fmt(slot, { weekday: "short", month: "short", day: "numeric" })} · ${fmt(slot, { hour: "numeric", minute: "2-digit" })} · ${len} min`
            : "Pick a time"}
        </span>
        <b className="text-right text-sm">{feeLabel}</b>
      </div>

      <Button
        size="lg"
        className="min-h-14 text-base"
        disabled={!slot}
        onClick={() => {
          if (!slot) return;
          const q = new URLSearchParams({ start: slot.toISOString(), duration: String(len) });
          if (p.reschedule) q.set("reschedule", p.reschedule);
          router.push(`/book/${p.slug}?${q}`);
        }}
      >
        {p.reschedule ? "Continue with new time" : "Continue to confirm"}
      </Button>
      <Button variant="secondary" href={`/messages/${p.slug}`} className="min-h-12">
        Message {p.preferredName} first
      </Button>
      <p className="m-0 text-center text-xs leading-normal text-slate-600">
        {p.insurance.length > 0 && !member && "Insurance accepted. Add your plan on the next step. "}
        {!member && `${p.preferredName} will share the fee with you before your first session${p.slidingScale ? ", and offers a sliding scale" : ""}. `}
        Free cancellation up to 24 hours before.
      </p>
    </aside>
  );
}
