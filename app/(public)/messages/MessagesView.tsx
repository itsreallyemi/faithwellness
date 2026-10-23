"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight, Lock, Send, Video } from "lucide-react";
import { BookingCard, joinMeet } from "@/components/prototype/BookingCard";
import { RequireSignIn } from "@/components/prototype/RequireSignIn";
import { IntakeSharingNote } from "@/components/prototype/SharedIntake";
import { useViewerTimeZone } from "@/components/LocalTime";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import { formatDay, formatSession, formatTime } from "@/lib/prototype/format";
import type { CounselorLite } from "@/lib/prototype/lite";
import { feeSummary } from "../sessions/[id]/SessionView";
import { proto, type ProtoBooking, type ProtoMessage, type ProtoState } from "@/lib/prototype/store";
import { zonedDate } from "@/lib/time";

type Props = { counselors: CounselorLite[]; activeSlug: string | null };

export function MessagesView(props: Props) {
  return <RequireSignIn>{(s) => <Inbox {...props} state={s} />}</RequireSignIn>;
}

function nextSession(bookings: ProtoBooking[], slug: string) {
  const now = Date.now();
  return bookings
    .filter((b) => b.slug === slug && b.status === "confirmed" && new Date(b.startIso).getTime() + b.duration * 60_000 > now)
    .sort((a, b) => a.startIso.localeCompare(b.startIso))[0];
}

function Inbox({ counselors, activeSlug, state }: Props & { state: ProtoState }) {
  const active = counselors.find((c) => c.slug === activeSlug) ?? null;

  return (
    <div className="mx-auto w-full max-w-[1440px] md:px-7 md:py-5">
      <div className="md:grid md:h-[calc(100dvh-150px)] md:min-h-[560px] md:grid-cols-[280px_minmax(0,1fr)] md:gap-5 xl:grid-cols-[300px_minmax(0,1fr)_300px]">
        <ConversationList counselors={counselors} state={state} activeSlug={activeSlug} className={cn(active && "hidden md:flex")} />
        {active ? (
          <>
            <Thread counselor={active} state={state} />
            <Context counselor={active} state={state} />
          </>
        ) : (
          <div className="hidden items-center justify-center rounded-xl border border-border-warm bg-white text-slate-600 shadow-card md:flex xl:col-span-2">
            Choose a conversation
          </div>
        )}
      </div>
    </div>
  );
}

// Conversation list --------------------------------------------------------------

function ConversationList({
  counselors,
  state,
  activeSlug,
  className,
}: {
  counselors: CounselorLite[];
  state: ProtoState;
  activeSlug: string | null;
  className?: string;
}) {
  const [query, setQuery] = useState("");
  const tz = useViewerTimeZone("America/Los_Angeles");
  const threads = useMemo(() => {
    const slugs = new Set(Object.keys(state.threads).filter((s) => state.threads[s].length > 0));
    if (activeSlug) slugs.add(activeSlug);
    return [...slugs]
      .map((slug) => ({ c: counselors.find((x) => x.slug === slug), last: state.threads[slug]?.at(-1) }))
      .filter((t): t is { c: CounselorLite; last: ProtoMessage | undefined } => Boolean(t.c))
      .sort((a, b) => (b.last?.at ?? "9").localeCompare(a.last?.at ?? "9"));
  }, [state.threads, counselors, activeSlug]);
  const shown = threads.filter((t) => t.c.name.toLowerCase().includes(query.trim().toLowerCase()));

  return (
    <aside
      aria-label="Conversations"
      className={cn(
        "flex flex-col gap-2.5 px-4 py-5 md:overflow-y-auto md:rounded-xl md:border md:border-border-warm md:bg-white md:p-[18px] md:shadow-card",
        className,
      )}
    >
      <h1 className="m-0 px-1.5 pb-1.5 font-display text-[28px] md:text-[26px]">Messages</h1>
      {threads.length > 0 ? (
        <>
          <label htmlFor="msg-search" className="sr-only">
            Search messages
          </label>
          <input
            id="msg-search"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search"
            className="min-h-11 rounded-md border border-border bg-cream px-3.5 text-sm"
          />
          <ul className="m-0 flex list-none flex-col gap-1 p-0">
            {shown.map(({ c, last }) => (
              <li key={c.slug}>
                <Link
                  href={`/messages/${c.slug}`}
                  aria-current={c.slug === activeSlug ? "true" : undefined}
                  className={cn(
                    "flex items-center gap-3 rounded-[18px] p-3 text-slate-900! no-underline",
                    c.slug === activeSlug ? "bg-peach-50" : "hover:bg-cream",
                  )}
                >
                  <Avatar name={c.name} src={c.avatarUrl} tint={c.avatarTint} size={48} className="outline-0" />
                  <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <div className="flex justify-between gap-2">
                      <b className="truncate text-sm">{c.name}</b>
                      {last && <span className="flex-none text-xs text-slate-600">{shortWhen(new Date(last.at), tz)}</span>}
                    </div>
                    <span className="truncate text-[13px] text-slate-600">{preview(last)}</span>
                  </div>
                  <ChevronRight size={18} strokeWidth={1.8} className="flex-none text-slate-500 md:hidden" aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <div className="flex flex-col items-start gap-3 px-1.5">
          <p className="m-0 text-slate-600">
            No messages yet. Find a counselor and say hello. Most reply within a day.
          </p>
          <Button href="/counselors">Find a counselor</Button>
        </div>
      )}
    </aside>
  );
}

function preview(m?: ProtoMessage) {
  if (!m) return "New conversation";
  if (m.from === "system") return m.body;
  return m.from === "client" ? `You: ${m.body}` : m.body;
}

function shortWhen(d: Date, tz: string) {
  const a = zonedDate(d, tz);
  const b = zonedDate(new Date(), tz);
  if (a.year === b.year && a.month === b.month && a.day === b.day) return formatTime(d, tz);
  return d.toLocaleDateString("en-US", { timeZone: tz, month: "short", day: "numeric" });
}

// Thread -------------------------------------------------------------------------------

function Thread({ counselor: c, state }: { counselor: CounselorLite; state: ProtoState }) {
  const tz = useViewerTimeZone(c.timeZone);
  const messages = state.threads[c.slug] ?? [];
  const upcoming = nextSession(state.bookings, c.slug);
  const [draft, setDraft] = useState("");
  const scroller = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: "smooth" });
  }, [messages.length]);

  const send = () => {
    if (!draft.trim()) return;
    proto.send(c.slug, draft.trim());
    setDraft("");
  };

  let lastDay = "";

  return (
    <section
      aria-label={`Conversation with ${c.name}`}
      className="flex h-[calc(100dvh-150px)] min-h-[440px] flex-col bg-white md:h-auto md:min-h-0 md:rounded-xl md:border md:border-border-warm md:shadow-card"
    >
      <header className="flex items-center gap-2.5 border-b border-divider py-2.5 pr-3 pl-1 md:gap-3 md:px-6 md:py-[18px]">
        <Link href="/messages" aria-label="Back to messages" className="flex size-11 items-center justify-center text-slate-900! md:hidden">
          <ChevronLeft size={22} strokeWidth={1.8} aria-hidden="true" />
        </Link>
        <Avatar name={c.name} src={c.avatarUrl} tint={c.avatarTint} size={44} className="outline-0" />
        <div className="flex min-w-0 flex-1 flex-col">
          <b className="truncate text-[15px] md:text-base">{c.name}</b>
          <span className="text-xs text-slate-600 md:text-[13px]">Usually replies within a day</span>
        </div>
        <Button variant="secondary" href={`/counselors/${c.slug}#book`} className="text-sm max-sm:hidden!">
          {upcoming ? "Book again" : "Book a session"}
        </Button>
        {upcoming && (
          <Link href={`/sessions/${upcoming.id}`} aria-label="Session details" className="flex size-11 items-center justify-center text-slate-900! sm:hidden">
            <CalendarDays size={22} strokeWidth={1.8} aria-hidden="true" />
          </Link>
        )}
      </header>

      {upcoming && (
        <Link
          href={`/sessions/${upcoming.id}`}
          className="mx-3 mt-3 flex items-center gap-2.5 rounded-[18px] border border-peach-200 bg-peach-50 px-3.5 py-3 text-slate-900! no-underline xl:hidden"
        >
          <Video size={20} strokeWidth={1.8} className="flex-none text-peach-700" aria-hidden="true" />
          <span className="flex-1 text-[13px] leading-snug">
            <b>{formatSession(new Date(upcoming.startIso), upcoming.duration, tz)}</b>
            <br />
            {upcoming.duration} min · Meet link ready
          </span>
          <span className="text-[13px] font-bold text-peach-700">Details</span>
        </Link>
      )}

      <div ref={scroller} className="relative flex flex-1 flex-col gap-3 overflow-y-auto px-3 py-4 md:gap-4 md:p-6">
        {messages.length === 0 && (
          <div className="m-auto flex max-w-sm flex-col items-center gap-3 text-center">
            <Avatar name={c.name} src={c.avatarUrl} tint={c.avatarTint} size={72} />
            <b className="font-display text-xl font-medium!">Start a conversation with {c.preferredName}</b>
            <p className="m-0 text-sm text-slate-600">
              Say hello and share as much or as little as you like. You can ask about fees, timing or whether
              {" "}{c.preferredName} is a good fit before you book.
            </p>
          </div>
        )}
        {messages.map((m) => {
          const day = formatDay(new Date(m.at), tz);
          const separator = day !== lastDay;
          lastDay = day;
          return (
            <div key={m.id} className="contents">
              {separator && (
                <div className="self-center rounded-pill bg-cream px-3 py-1 text-xs text-slate-600">{relativeDay(new Date(m.at), tz)}</div>
              )}
              <MessageItem message={m} counselor={c} bookings={state.bookings} tz={tz} />
            </div>
          );
        })}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
        className="flex items-end gap-2 border-t border-divider px-3 pt-2.5 pb-3 md:gap-2.5 md:px-5 md:py-4"
      >
        <label htmlFor="msg" className="sr-only">
          Message
        </label>
        <textarea
          id="msg"
          rows={1}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault();
              send();
            }
          }}
          placeholder={`Message ${c.preferredName}…`}
          className="max-h-40 min-h-11 min-w-0 flex-1 resize-none rounded-[20px] border border-border bg-cream px-4 py-2.5 text-base leading-6 [field-sizing:content]"
        />
        <Button type="submit" aria-label="Send" className="size-11 flex-none px-0! md:w-auto md:px-[22px]!" disabled={!draft.trim()}>
          <Send size={18} strokeWidth={1.8} className="md:hidden" aria-hidden="true" />
          <span className="hidden md:inline">Send</span>
        </Button>
      </form>
      <p className="m-0 flex items-start gap-1.5 px-4 pb-4 text-xs leading-normal text-slate-600 md:px-6">
        <Lock size={14} strokeWidth={1.8} className="mt-px flex-none" aria-hidden="true" />
        <span>
          Private between you and {c.preferredName}. Not for emergencies — call or text 988 (US).{" "}
          <IntakeSharingNote counselorName={c.preferredName} compact />
        </span>
      </p>
    </section>
  );
}

function relativeDay(d: Date, tz: string) {
  const a = zonedDate(d, tz);
  const b = zonedDate(new Date(), tz);
  const diff = Math.round((Date.UTC(b.year, b.month - 1, b.day) - Date.UTC(a.year, a.month - 1, a.day)) / 86_400_000);
  return diff === 0 ? "Today" : diff === 1 ? "Yesterday" : formatDay(d, tz);
}

function MessageItem({ message: m, counselor, bookings, tz }: { message: ProtoMessage; counselor: CounselorLite; bookings: ProtoBooking[]; tz: string }) {
  if (m.from === "system") {
    const booking = bookings.find((b) => b.id === m.bookingId);
    if (booking && m.body === "Session confirmed") return <BookingCard booking={booking} counselor={counselor} />;
    return <p className="m-0 self-center text-center text-[13px] text-slate-600">{m.body}</p>;
  }
  const mine = m.from === "client";
  return (
    <div className={cn("flex max-w-[80%] flex-col gap-1 md:max-w-[70%]", mine ? "self-end items-end" : "self-start items-start")}>
      <div
        className={cn(
          "px-4 py-3 text-[15px] leading-[1.55] whitespace-pre-wrap",
          mine ? "rounded-[22px_22px_6px_22px] bg-peach-200" : "rounded-[22px_22px_22px_6px] bg-cream-200",
        )}
      >
        {m.body}
      </div>
      <span className="px-1.5 text-xs text-slate-600">
        <span className="sr-only">{mine ? "You" : counselor.preferredName}, </span>
        {formatTime(new Date(m.at), tz)}
      </span>
    </div>
  );
}

// Context column (desktop) --------------------------------------------------------------

function Context({ counselor: c, state }: { counselor: CounselorLite; state: ProtoState }) {
  const tz = useViewerTimeZone(c.timeZone);
  const upcoming = nextSession(state.bookings, c.slug);

  return (
    <aside aria-label="About your counselor" className="hidden flex-col gap-5 overflow-y-auto xl:flex">
      <div className="flex flex-col items-center gap-3 rounded-xl border border-border-warm bg-white p-6 text-center shadow-card">
        <Avatar name={c.name} src={c.avatarUrl} tint={c.avatarTint} size={96} />
        <b className="font-display text-[22px] leading-7 font-medium!">{c.name}</b>
        <span className="text-sm text-slate-600">
          {c.title}
          {c.churchName && ` · ${c.churchName}`}
        </span>
        <div className="flex flex-wrap justify-center gap-1.5">
          {c.badges.slice(0, 2).map((b) => (
            <Badge key={b} className="px-2.5! py-1! text-[12.5px]">
              {b}
            </Badge>
          ))}
        </div>
        <Link href={`/counselors/${c.slug}`} className="inline-flex min-h-11 items-center text-sm font-semibold">
          View profile
        </Link>
      </div>
      <div className="flex flex-col gap-2.5 rounded-xl border border-border-warm bg-white p-6 shadow-card">
        <span className="label-overline">Next session</span>
        {upcoming ? (
          <>
            <Link href={`/sessions/${upcoming.id}`} className="text-base font-bold text-slate-900! no-underline hover:underline">
              {formatDay(new Date(upcoming.startIso), tz)} · {formatTime(new Date(upcoming.startIso), tz)}
            </Link>
            <span className="text-[13px] text-slate-600">
              {upcoming.duration} min · Google Meet · {upcoming.insurance ? `Insurance · ${upcoming.insurance.provider}` : upcoming.memberCare ? "Free for members" : feeSummary(upcoming, c.preferredName)}
            </span>
            <Button onClick={joinMeet} className="mt-1 min-h-12">
              Join when it starts
            </Button>
          </>
        ) : (
          <>
            <span className="text-sm text-slate-600">Nothing booked with {c.preferredName} yet.</span>
            <Button href={`/counselors/${c.slug}#book`} className="mt-1 min-h-12">
              Book a session
            </Button>
          </>
        )}
      </div>
      <div className="flex flex-col gap-2.5 rounded-xl border border-border-warm bg-white p-5 shadow-card">
        <span className="label-overline">Your answers</span>
        <IntakeSharingNote counselorName={c.preferredName} />
      </div>
    </aside>
  );
}
