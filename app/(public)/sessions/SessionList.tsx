"use client";

import Link from "next/link";
import { useState } from "react";
import { CalendarPlus, ChevronRight, MessageCircle, Plus, RotateCcw, Video } from "lucide-react";
import { joinMeet, rescheduleHref } from "@/components/prototype/BookingCard";
import { RequireSignIn } from "@/components/prototype/RequireSignIn";
import { useViewerTimeZone } from "@/components/LocalTime";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/cn";
import { downloadIcs } from "@/lib/prototype/ics";
import { formatSession, formatTime } from "@/lib/prototype/format";
import type { CounselorLite } from "@/lib/prototype/lite";
import { feeSummary } from "./[id]/SessionView";
import { proto, type ProtoBooking } from "@/lib/prototype/store";
import { zoneCity } from "@/lib/time";

type Tab = "upcoming" | "past" | "canceled";

const endOf = (b: ProtoBooking) => new Date(b.startIso).getTime() + b.duration * 60_000;

/** Meet opens 10 minutes before a session starts. */
const JOIN_EARLY_MS = 10 * 60_000;

export function SessionList({ counselors }: { counselors: CounselorLite[] }) {
  return <RequireSignIn>{({ bookings }) => <Sessions bookings={bookings} counselors={counselors} />}</RequireSignIn>;
}

function Sessions({ bookings, counselors }: { bookings: ProtoBooking[]; counselors: CounselorLite[] }) {
  const tz = useViewerTimeZone("UTC");
  const [tab, setTab] = useState<Tab>("upcoming");
  const now = Date.now();
  const lists: Record<Tab, ProtoBooking[]> = {
    upcoming: bookings.filter((b) => b.status === "confirmed" && endOf(b) > now).sort((a, b) => a.startIso.localeCompare(b.startIso)),
    past: bookings.filter((b) => b.status === "confirmed" && endOf(b) <= now).sort((a, b) => b.startIso.localeCompare(a.startIso)),
    canceled: bookings.filter((b) => b.status === "canceled").sort((a, b) => b.startIso.localeCompare(a.startIso)),
  };
  const counselor = (slug: string) => counselors.find((c) => c.slug === slug);
  const next = lists.upcoming[0];
  const nextCounselor = next && counselor(next.slug);

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="m-0 font-display text-[34px] leading-[1.1] md:text-[44px]">My sessions</h1>
          <span className="text-sm text-slate-600" suppressHydrationWarning>
            Times shown in {zoneCity(tz)} time.{" "}
            <Link href="/account#details" className="font-semibold">
              Change
            </Link>
          </span>
        </div>
        <Button href="/counselors" variant="secondary">
          <Plus size={18} strokeWidth={1.8} aria-hidden="true" />
          Book a session
        </Button>
      </div>

      {next && nextCounselor && <NextSession booking={next} counselor={nextCounselor} tz={tz} />}

      {bookings.length === 0 ? (
        <Empty />
      ) : (
        <section aria-label="All sessions" className="flex flex-col gap-5">
          <div role="tablist" aria-label="Sessions" className="flex gap-1 self-start rounded-pill bg-cream-200 p-1">
            {(["upcoming", "past", "canceled"] as const).map((t) => (
              <button
                key={t}
                type="button"
                role="tab"
                id={`tab-${t}`}
                aria-selected={tab === t}
                aria-controls="sessions-panel"
                onClick={() => setTab(t)}
                className={cn(
                  "min-h-11 cursor-pointer rounded-pill px-4 text-sm capitalize",
                  tab === t ? "bg-white font-semibold shadow-[0_1px_3px_rgba(45,55,72,.12)]" : "text-slate-600",
                )}
              >
                {t} <span className="text-slate-500">({lists[t].length})</span>
              </button>
            ))}
          </div>

          <div id="sessions-panel" role="tabpanel" aria-labelledby={`tab-${tab}`}>
            {lists[tab].length === 0 ? (
              <p className="m-0 rounded-lg border border-dashed border-border bg-white px-5 py-6 text-slate-600">
                {
                  {
                    upcoming: "Nothing booked right now.",
                    past: "Sessions you’ve had will show here, so you can book again.",
                    canceled: "No canceled sessions.",
                  }[tab]
                }
              </p>
            ) : (
              <Grouped items={lists[tab]} tz={tz} counselor={counselor} tab={tab} />
            )}
          </div>
        </section>
      )}
    </div>
  );
}

// Next session --------------------------------------------------------------------

function relative(start: number, end: number, now = Date.now()) {
  if (now >= start && now < end) return "Happening now";
  const mins = Math.round((start - now) / 60_000);
  if (mins < 60) return `Starts in ${mins} min`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `Starts in ${hours} ${hours === 1 ? "hour" : "hours"}`;
  const days = Math.round(hours / 24);
  return `In ${days} ${days === 1 ? "day" : "days"}`;
}

function NextSession({ booking: b, counselor: c, tz }: { booking: ProtoBooking; counselor: CounselorLite; tz: string }) {
  const start = new Date(b.startIso);
  const open = Date.now() >= start.getTime() - JOIN_EARLY_MS;

  return (
    <Card as="section" aria-labelledby="next-title" className="flex flex-col gap-5 border-peach-200! bg-peach-50!">
      <div className="flex flex-wrap items-center gap-2">
        <span id="next-title" className="label-overline text-peach-800!">
          Next session
        </span>
        <span className="rounded-pill bg-white px-3 py-1 text-[13px] font-semibold" suppressHydrationWarning>
          {relative(start.getTime(), endOf(b))}
        </span>
      </div>
      <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-4">
          <Avatar name={c.name} src={c.avatarUrl} tint={c.avatarTint} size={72} />
          <div className="flex min-w-0 flex-col gap-1">
            <b className="font-display text-[24px] leading-8 font-medium! md:text-[28px]" suppressHydrationWarning>
              {formatSession(start, b.duration, tz)}
            </b>
            <span className="text-[15px] text-slate-600">
              with {c.name} · {b.duration} min · Google Meet
            </span>
            <span className="text-sm">{b.insurance ? <span className="text-slate-600">Insurance · {b.insurance.provider}</span> : b.memberCare ? <Badge>Free for members</Badge> : <span className="text-slate-600">{feeSummary(b, c.preferredName)}</span>}</span>
          </div>
        </div>
        <div className="flex flex-col gap-2 md:items-end">
          <Button size="lg" onClick={() => joinMeet(b)}>
            <Video size={18} strokeWidth={1.8} aria-hidden="true" />
            Join Google Meet
          </Button>
          {!open && <span className="text-[13px] text-slate-600">The room opens 10 minutes before.</span>}
        </div>
      </div>
      <div className="flex flex-wrap gap-x-5 gap-y-1 border-t border-peach-200 pt-3">
        <Button variant="link" className="px-0! text-sm" onClick={() => downloadIcs({ id: b.id, start, minutes: b.duration, meetUrl: b.meetUrl })}>
          <CalendarPlus size={16} strokeWidth={1.8} aria-hidden="true" />
          Add to calendar
        </Button>
        <Button variant="link" href={`/messages/${c.slug}`} className="px-0! text-sm">
          <MessageCircle size={16} strokeWidth={1.8} aria-hidden="true" />
          Message {c.preferredName}
        </Button>
        <Button variant="link" href={rescheduleHref(b)} className="px-0! text-sm">
          Reschedule
        </Button>
        <Button variant="link" href={`/sessions/${b.id}`} className="px-0! text-sm">
          Details or cancel
        </Button>
      </div>
    </Card>
  );
}

// Lists ----------------------------------------------------------------------------

function Grouped({
  items,
  tz,
  counselor,
  tab,
}: {
  items: ProtoBooking[];
  tz: string;
  counselor: (slug: string) => CounselorLite | undefined;
  tab: Tab;
}) {
  const groups = new Map<string, ProtoBooking[]>();
  for (const b of items) {
    const key = new Date(b.startIso).toLocaleDateString("en-US", { timeZone: tz, month: "long", year: "numeric" });
    groups.set(key, [...(groups.get(key) ?? []), b]);
  }
  return (
    <div className="flex flex-col gap-6">
      {[...groups].map(([month, list]) => (
        <section key={month} aria-label={month} className="flex flex-col gap-3">
          <h2 className="label-overline m-0">{month}</h2>
          <ul className="m-0 flex list-none flex-col gap-3 p-0">
            {list.map((b) => {
              const c = counselor(b.slug);
              return c ? <Row key={b.id} booking={b} counselor={c} tz={tz} tab={tab} /> : null;
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}

function Row({ booking: b, counselor: c, tz, tab }: { booking: ProtoBooking; counselor: CounselorLite; tz: string; tab: Tab }) {
  const start = new Date(b.startIso);
  const end = new Date(endOf(b));
  const dow = start.toLocaleDateString("en-US", { timeZone: tz, weekday: "short" });
  const day = start.toLocaleDateString("en-US", { timeZone: tz, day: "numeric" });

  return (
    <li className="flex flex-col gap-3 rounded-lg border border-border-warm bg-white p-4 shadow-card sm:flex-row sm:items-center sm:gap-4">
      <Link href={`/sessions/${b.id}`} className="flex min-w-0 flex-1 items-center gap-4 text-slate-900! no-underline">
        <span
          className={cn(
            "flex w-14 flex-none flex-col items-center rounded-md py-2",
            tab === "canceled" ? "bg-cream-200 text-slate-600" : "bg-peach-100",
          )}
          aria-hidden="true"
        >
          <span className="text-xs">{dow}</span>
          <span className="text-xl leading-6 font-bold">{day}</span>
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <b className={cn("text-base", tab === "canceled" && "line-through")} suppressHydrationWarning>
            {formatTime(start, tz)} – {formatTime(end, tz)}
          </b>
          <span className="flex items-center gap-2 text-sm text-slate-600">
            <Avatar name={c.name} src={c.avatarUrl} tint={c.avatarTint} size={24} className="border-[2px]! outline-0" />
            <span className="truncate">
              {c.name} · {b.duration} min
            </span>
          </span>
          <span className="flex flex-wrap gap-1.5 pt-1">
            {b.memberCare && <Badge className="px-2.5! py-0.5! text-xs">Free for members</Badge>}
            {b.insurance && <Badge variant="accent" className="px-2.5! py-0.5! text-xs">Insurance</Badge>}
            {b.rescheduledFrom && <Badge variant="tag" className="text-xs">Rescheduled</Badge>}
            {tab === "canceled" && <Badge variant="tag" className="text-xs">Canceled</Badge>}
          </span>
        </span>
        <ChevronRight size={18} strokeWidth={1.8} className="flex-none text-slate-500 sm:hidden" aria-hidden="true" />
      </Link>
      <div className="flex flex-wrap gap-2 sm:flex-none sm:justify-end">
        {tab === "upcoming" && (
          <>
            <Button variant="secondary" href={rescheduleHref(b)} className="min-h-11 text-sm">
              Reschedule
            </Button>
            <Button variant="link" href={`/sessions/${b.id}`} className="text-sm max-sm:hidden!">
              Details
            </Button>
          </>
        )}
        {tab === "past" && (
          <>
            <Button variant="secondary" href={`/counselors/${c.slug}?duration=${b.duration}#book`} className="min-h-11 text-sm">
              <RotateCcw size={16} strokeWidth={1.8} aria-hidden="true" />
              Book again
            </Button>
            <Button variant="link" href={`/messages/${c.slug}`} className="text-sm">
              Message
            </Button>
          </>
        )}
        {tab === "canceled" && (
          <Button variant="secondary" href={`/counselors/${c.slug}?duration=${b.duration}#book`} className="min-h-11 text-sm">
            Book a new time
          </Button>
        )}
      </div>
    </li>
  );
}

function Empty() {
  return (
    <Card className="flex flex-col items-start gap-4">
      <h2 className="m-0 font-display text-[24px]">No sessions yet</h2>
      <p className="m-0 text-slate-600">
        When you book a session it shows up here, with its Google Meet link and a way to add it to your calendar.
      </p>
      <div className="flex flex-wrap gap-3">
        <Button href="/counselors">Find a counselor</Button>
        <Button href="/get-started" variant="secondary">
          Help me choose
        </Button>
      </div>
      <div className="flex flex-col gap-2 rounded-md border border-dashed border-peach-400 bg-peach-50 px-4 py-3 text-sm text-peach-800">
        <span>Prototype: fill this page with past, upcoming and canceled examples.</span>
        <Button
          variant="link"
          className="self-start px-0! text-sm"
          onClick={() => proto.addSampleSessions(["ruth-okafor", "sarah-park", "james-whitfield"])}
        >
          Add sample sessions
        </Button>
      </div>
    </Card>
  );
}
