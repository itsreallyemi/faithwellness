"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { CalendarPlus, CircleCheck, HandHeart, Mail, MessageCircle, ShieldCheck, Video } from "lucide-react";
import { joinMeet, rescheduleHref } from "@/components/prototype/BookingCard";
import { RequireSignIn } from "@/components/prototype/RequireSignIn";
import { useViewerTimeZone } from "@/components/LocalTime";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { formatFee } from "@/lib/format";
import { downloadIcs } from "@/lib/prototype/ics";
import { counselorLocal, formatSession } from "@/lib/prototype/format";
import type { CounselorLite } from "@/lib/prototype/lite";
import { agreedFeeCents, proto, type ProtoBooking } from "@/lib/prototype/store";
import { cancelReal } from "@/lib/supabase/bookings";
import { zoneCity } from "@/lib/time";

export function SessionView({ id, counselors }: { id: string; counselors: CounselorLite[] }) {
  return (
    <RequireSignIn>
      {({ bookings, user }) => {
        const b = bookings.find((x) => x.id === id);
        const c = b && counselors.find((x) => x.slug === b.slug);
        if (!b || !c) {
          return (
            <Card className="flex flex-col items-start gap-4">
              <h1 className="m-0 font-display text-[28px]">We couldn&rsquo;t find that session</h1>
              <Button href="/sessions">See my sessions</Button>
            </Card>
          );
        }
        return <Detail booking={b} counselor={c} email={user.email} />;
      }}
    </RequireSignIn>
  );
}

function Detail({ booking: b, counselor: c, email }: { booking: ProtoBooking; counselor: CounselorLite; email: string }) {
  const isNew = useSearchParams().get("new") === "1";
  const tz = useViewerTimeZone(c.timeZone);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [canceling, setCanceling] = useState(false);
  const start = new Date(b.startIso);
  const canceled = b.status === "canceled";
  const local = counselorLocal(start, tz, c.timeZone, c.preferredName);
  const lateCancel = start.getTime() - Date.now() < 24 * 3600_000;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        {isNew && !canceled && (
          <span className="flex size-14 items-center justify-center rounded-lg bg-sage-100">
            <CircleCheck size={28} strokeWidth={1.8} className="text-sage-700" aria-hidden="true" />
          </span>
        )}
        <h1 className="m-0 font-display text-[34px] leading-[1.1] md:text-[44px]">
          {canceled ? "Session canceled" : isNew ? "You’re booked" : `Session with ${c.preferredName}`}
        </h1>
        {isNew && !canceled && (
          <p className="m-0 max-w-[640px] text-lg leading-[1.55] text-slate-600">
            {c.preferredName} has your session on their calendar. We&rsquo;ve emailed the details to {email}.
          </p>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <Card as="section" aria-label="Session details" className="flex flex-col gap-5">
          <div className="flex items-center gap-3.5">
            <Avatar name={c.name} src={c.avatarUrl} tint={c.avatarTint} size={64} />
            <div className="flex min-w-0 flex-col">
              <Link href={`/counselors/${c.slug}`} className="font-display text-xl text-slate-900! no-underline hover:underline">
                {c.name}
              </Link>
              <span className="text-sm text-slate-600">
                {c.title}
                {c.churchName && ` · ${c.churchName}`}
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-1 rounded-md bg-peach-50 p-4">
            <b className={`font-display text-2xl leading-8 font-medium! ${canceled ? "line-through" : ""}`}>
              {formatSession(start, b.duration, tz)}
            </b>
            <span className="text-[13px] text-slate-600">Your time ({zoneCity(tz)})</span>
            {local && <span className="text-[13px] text-slate-600">{local}</span>}
          </div>

          <dl className="m-0 grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-[15px]">
            <dt className="text-slate-600">Length</dt>
            <dd className="m-0">{b.duration} min</dd>
            <dt className="text-slate-600">Where</dt>
            <dd className="m-0 break-all">Google Meet · {b.meetUrl.replace("https://", "")}</dd>
            <dt className="text-slate-600">{b.insurance ? "Payment" : "Fee"}</dt>
            <dd className="m-0">
              {b.insurance
                ? `Insurance · ${b.insurance.provider}`
                : b.memberCare
                  ? `Free, ${c.churchName} member care`
                  : feeSummary(b, c.preferredName)}
            </dd>
          </dl>

          {b.insurance && !canceled && <InsuranceStatus booking={b} counselor={c} />}
          {b.priceRequest && !canceled && <PriceRequestStatus booking={b} counselor={c} />}

          {!canceled && (
            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <Button size="lg" onClick={() => joinMeet(b)}>
                <Video size={18} strokeWidth={1.8} aria-hidden="true" /> Join Google Meet
              </Button>
              <Button
                variant="secondary"
                size="lg"
                onClick={() => downloadIcs({ id: b.id, start, minutes: b.duration, meetUrl: b.meetUrl })}
              >
                <CalendarPlus size={18} strokeWidth={1.8} aria-hidden="true" /> Add to calendar
              </Button>
            </div>
          )}

          <div className="flex flex-wrap gap-x-2 border-t border-divider pt-4">
            <Button variant="link" href={`/messages/${c.slug}`}>
              Message {c.preferredName}
            </Button>
            {canceled ? (
              <Button variant="link" href={`/counselors/${c.slug}?duration=${b.duration}#book`}>
                Book a new time
              </Button>
            ) : (
              <>
                <Button variant="link" href={rescheduleHref(b)}>
                  Reschedule
                </Button>
                <Button variant="link" onClick={() => setConfirmCancel(true)} aria-expanded={confirmCancel}>
                  Cancel session
                </Button>
              </>
            )}
          </div>

          {confirmCancel && !canceled && (
            <div role="alertdialog" aria-label="Cancel this session?" className="flex flex-col gap-3 rounded-md border border-border p-4">
              <b>Cancel this session?</b>
              <p className="m-0 text-sm text-slate-600">
                {b.memberCare
                  ? lateCancel
                    ? `It starts in less than 24 hours. Please let ${c.preferredName} know if you can.`
                    : "It’s more than 24 hours away."
                  : lateCancel
                    ? `It starts in less than 24 hours, so ${c.preferredName} may still ask for the fee.`
                    : "It’s more than 24 hours away, so there’s no charge."}{" "}
                {c.preferredName} will see a note in your messages.
              </p>
              <div className="flex flex-wrap gap-3">
                <Button
                  variant="secondary"
                  disabled={canceling}
                  onClick={async () => {
                    if (!b.real) return proto.cancel(b.id);
                    // Real sessions: the server removes the Google event, and Google emails the update.
                    setCanceling(true);
                    const ok = await cancelReal(b.id, "Session canceled.");
                    setCanceling(false);
                    if (!ok) proto.toast("That didn’t cancel. Please try again.");
                  }}
                >
                  {canceling ? "Canceling…" : "Yes, cancel it"}
                </Button>
                <Button variant="link" onClick={() => setConfirmCancel(false)}>
                  Keep my session
                </Button>
              </div>
            </div>
          )}
        </Card>

        {!canceled && (
          <Card as="section" aria-label="What happens next" padding="compact" className="flex flex-col gap-4 self-start">
            <h2 className="m-0 font-display text-[22px]">What happens next</h2>
            <ul className="m-0 flex list-none flex-col gap-4 p-0 text-[15px] leading-normal">
              <li className="flex gap-3">
                <Mail size={20} strokeWidth={1.8} className="mt-0.5 flex-none text-peach-700" aria-hidden="true" />
                <span>A confirmation email with your Meet link, and a reminder 24 hours before.</span>
              </li>
              <li className="flex gap-3">
                <MessageCircle size={20} strokeWidth={1.8} className="mt-0.5 flex-none text-peach-700" aria-hidden="true" />
                <span>
                  The session is in your <Link href={`/messages/${c.slug}`}>messages with {c.preferredName}</Link>, so you can
                  ask questions before you meet.
                </span>
              </li>
              <li className="flex gap-3">
                <Video size={20} strokeWidth={1.8} className="mt-0.5 flex-none text-peach-700" aria-hidden="true" />
                <span>Join from this page or the message thread a few minutes early. Find a quiet, private spot.</span>
              </li>
            </ul>
          </Card>
        )}
      </div>
    </div>
  );
}

const insuranceCopy = {
  pending: {
    title: "Insurance: checking your coverage",
    body: (name: string) =>
      `${name} is verifying your plan and will tell you about any copay before the session. You don’t need to do anything yet.`,
  },
  verified: {
    title: "Insurance: coverage confirmed",
    body: (name: string) => `${name} will bill your insurer directly after the session. Any copay is arranged with ${name}.`,
  },
  "not-covered": {
    title: "Insurance: not covered",
    body: (name: string) =>
      `${name} couldn’t bill this plan for the session. You can pay the usual fee, message ${name} about other options, or cancel at no cost.`,
  },
} as const;

function InsuranceStatus({ booking: b, counselor: c }: { booking: ProtoBooking; counselor: CounselorLite }) {
  const ins = b.insurance!;
  const copy = insuranceCopy[ins.status];
  const tone = {
    pending: "border-peach-200 bg-peach-50",
    verified: "border-sage-700/30 bg-sage-100",
    "not-covered": "border-border bg-cream",
  }[ins.status];

  return (
    <div className={`flex flex-col gap-3 rounded-md border p-4 ${tone}`}>
      <b className="flex items-center gap-2">
        <ShieldCheck size={18} strokeWidth={1.8} aria-hidden="true" />
        {copy.title}
      </b>
      <p className="m-0 text-[15px] leading-normal">{copy.body(c.preferredName)}</p>
      <dl className="m-0 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm text-slate-600">
        <dt>Plan</dt>
        <dd className="m-0">{ins.provider}</dd>
        <dt>Member ID</dt>
        <dd className="m-0">ending {ins.memberIdLast4}</dd>
        <dt>Group</dt>
        <dd className="m-0">{ins.groupNumber}</dd>
      </dl>
      {ins.status === "not-covered" && (
        <Button variant="link" href={`/messages/${c.slug}`} className="self-start px-0! text-sm">
          Message {c.preferredName}
        </Button>
      )}
      {/* PROTOTYPE ONLY: play the counselor's side. Real sessions are answered from the counselor's portal. */}
      {!b.real && (
      <div className="flex flex-col gap-2 rounded-md border border-dashed border-peach-400 bg-white/70 px-3 py-2.5 text-sm text-peach-800">
        <span>Prototype: act as {c.preferredName} verifying coverage.</span>
        <div className="flex flex-wrap gap-2">
          <Button className="min-h-10! text-sm" onClick={() => proto.setInsuranceStatus(b.id, "verified")}>
            Coverage confirmed
          </Button>
          <Button variant="secondary" className="min-h-10! text-sm" onClick={() => proto.setInsuranceStatus(b.id, "not-covered")}>
            Not covered
          </Button>
        </div>
      </div>
      )}
    </div>
  );
}

/** The fee line for a booking the client has made. Only the client and counselor ever see it. */
export function feeSummary(b: ProtoBooking, name: string) {
  const pr = b.priceRequest;
  if (b.feeCents === 0) return "Free";
  if (!pr) return `${formatFee(b.feeCents)}, paid to ${name} directly`;
  const offer = pr.offeredCents === 0 ? "free" : formatFee(pr.offeredCents);
  if (pr.status === "accepted") return `${formatFee(agreedFeeCents(b))}, agreed with ${name}`;
  if (pr.status === "declined") return `${formatFee(b.feeCents)}, ${name}’s usual fee`;
  return `${formatFee(b.feeCents)} usual · you offered ${offer}`;
}

const offerCopy = {
  pending: {
    title: "Price request: waiting for a reply",
    body: (name: string) =>
      `${name} will reply in your messages before the session. Your time is held either way, and you can cancel at no cost if it doesn’t work out.`,
  },
  accepted: {
    title: "Price request: accepted",
    body: (name: string) => `${name} agreed to your offer. Pay ${name} the agreed amount directly.`,
  },
  declined: {
    title: "Price request: not possible this time",
    body: (name: string) =>
      `${name} couldn’t lower the fee for this session. You can keep it at the usual fee, message ${name} about other options, or cancel at no cost.`,
  },
} as const;

function PriceRequestStatus({ booking: b, counselor: c }: { booking: ProtoBooking; counselor: CounselorLite }) {
  const pr = b.priceRequest!;
  const copy = offerCopy[pr.status];
  const tone = {
    pending: "border-peach-200 bg-peach-50",
    accepted: "border-sage-700/30 bg-sage-100",
    declined: "border-border bg-cream",
  }[pr.status];

  return (
    <div className={`flex flex-col gap-3 rounded-md border p-4 ${tone}`}>
      <b className="flex items-center gap-2">
        <HandHeart size={18} strokeWidth={1.8} aria-hidden="true" />
        {copy.title}
      </b>
      <p className="m-0 text-[15px] leading-normal">{copy.body(c.preferredName)}</p>
      <dl className="m-0 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm text-slate-600">
        <dt>Usual fee</dt>
        <dd className="m-0">{formatFee(b.feeCents)}</dd>
        <dt>Your offer</dt>
        <dd className="m-0">{pr.offeredCents === 0 ? "Asked for free" : formatFee(pr.offeredCents)}</dd>
      </dl>
      {pr.status !== "accepted" && (
        <Button variant="link" href={`/messages/${c.slug}`} className="self-start px-0! text-sm">
          Message {c.preferredName}
        </Button>
      )}
      {/* PROTOTYPE ONLY: play the counselor's side. Real sessions are answered from the counselor's portal. */}
      {!b.real && (
      <div className="flex flex-col gap-2 rounded-md border border-dashed border-peach-400 bg-white/70 px-3 py-2.5 text-sm text-peach-800">
        <span>Prototype: act as {c.preferredName} answering the request.</span>
        <div className="flex flex-wrap gap-2">
          <Button className="min-h-10! text-sm" onClick={() => proto.setPriceRequestStatus(b.id, "accepted")}>
            Accept offer
          </Button>
          <Button variant="secondary" className="min-h-10! text-sm" onClick={() => proto.setPriceRequestStatus(b.id, "declined")}>
            Can&rsquo;t lower it
          </Button>
        </div>
      </div>
      )}
    </div>
  );
}
