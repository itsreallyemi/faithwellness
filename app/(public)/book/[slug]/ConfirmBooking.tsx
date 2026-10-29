"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ChevronLeft, Lock, Video } from "lucide-react";
import { useViewerTimeZone } from "@/components/LocalTime";
import { MemberBadge } from "@/components/prototype/MemberBadge";
import { RequireSignIn } from "@/components/prototype/RequireSignIn";
import { IntakeSharingNote } from "@/components/prototype/SharedIntake";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/cn";
import { formatFee } from "@/lib/format";
import { counselorLocal, formatSession } from "@/lib/prototype/format";
import type { CounselorLite } from "@/lib/prototype/lite";
import { proto, useIsMemberOf } from "@/lib/prototype/store";
import { bookReal } from "@/lib/supabase/bookings";
import { zoneCity } from "@/lib/time";
import type { Duration } from "@/lib/types";

const OTHER = "other";
const insField = "min-h-12 w-full rounded-md border border-border bg-white px-4 text-base aria-invalid:border-peach-700";

type Props = {
  counselor: CounselorLite;
  startIso: string;
  duration: Duration;
  reschedule: string | null;
  /** Book for real through /api/bookings (counselor has a connected calendar), not just in this browser. */
  real: boolean;
};

export function ConfirmBooking(props: Props) {
  return <RequireSignIn>{({ user, bookings }) => <Form {...props} user={user} rescheduling={bookings.find((b) => b.id === props.reschedule)} />}</RequireSignIn>;
}

function Form({
  counselor: c,
  startIso,
  duration,
  reschedule,
  real,
  user,
  rescheduling,
}: Props & { user: { name: string; email: string }; rescheduling?: { startIso: string } }) {
  const router = useRouter();
  const tz = useViewerTimeZone(c.timeZone);
  const [note, setNote] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [showError, setShowError] = useState(false);
  const [pending, setPending] = useState(false);
  const [bookError, setBookError] = useState("");

  const member = useIsMemberOf(c.churchSlug);
  const start = new Date(startIso);
  const usualFee = duration === 30 ? c.fee30Cents : c.fee60Cents;
  const fee = member ? 0 : usualFee;

  // Insurance: only licensed counselors who bill it, and not when the session is already free.
  const canUseInsurance = c.insurance.length > 0 && !member;
  const [payWith, setPayWith] = useState<"self" | "insurance">("self");
  const [plan, setPlan] = useState("");
  const [otherPlan, setOtherPlan] = useState("");
  const [memberId, setMemberId] = useState("");
  const [group, setGroup] = useState("");
  const [insErrors, setInsErrors] = useState<Record<string, string>>({});
  const usingInsurance = canUseInsurance && payWith === "insurance";
  const provider = plan === OTHER ? otherPlan.trim() : plan;

  // Price: shown only here, privately, when booking. A client can offer what they can pay.
  const showPrice = !member && !usingInsurance && usualFee > 0;
  const [hardship, setHardship] = useState(false);
  const [offer, setOffer] = useState("");
  const [cantPay, setCantPay] = useState(false);
  const [offerNote, setOfferNote] = useState("");
  const [offerError, setOfferError] = useState("");
  const offering = showPrice && hardship;
  const offerDollars = Number(offer.replace(/[$,\s]/g, ""));
  const offerValid = cantPay || (offer.trim() !== "" && Number.isFinite(offerDollars) && offerDollars >= 0 && offerDollars * 100 < usualFee);
  const offerProblem = () => {
    if (!offering || offerValid) return "";
    if (offer.trim() === "") return `Enter what you can pay, or tick “I can’t pay anything right now.”`;
    if (!Number.isFinite(offerDollars) || offerDollars < 0) return "Enter an amount in dollars, like 40.";
    return `That’s the full fee. Choose “Pay the full fee” instead, or enter a lower amount.`;
  };

  const insuranceProblems = () => {
    const e: Record<string, string> = {};
    if (!plan) e.plan = "Choose your insurance plan.";
    else if (plan === OTHER && !otherPlan.trim()) e.plan = "Type the name of your plan.";
    if (memberId.replace(/\s/g, "").length < 4) e.memberId = "Enter the member ID from your insurance card.";
    if (!group.trim()) e.group = "Enter the group number from your insurance card.";
    return e;
  };
  const local = counselorLocal(start, tz, c.timeZone, c.preferredName);
  const inPast = start.getTime() < Date.now();
  const back = `/counselors/${c.slug}?duration=${duration}${reschedule ? `&reschedule=${reschedule}` : ""}#book`;

  const confirm = (e: React.FormEvent) => {
    e.preventDefault();
    const problems = usingInsurance ? insuranceProblems() : {};
    setInsErrors(problems);
    if (Object.keys(problems).length) return;
    const op = offerProblem();
    setOfferError(op);
    if (op) return document.getElementById("offer-amount")?.focus();
    if (!agreed) return setShowError(true);
    setPending(true);
    setBookError("");
    if (real) {
      // The server re-checks the calendar, saves the booking and writes the Google event with its Meet link.
      bookReal({
        slug: c.slug,
        start: startIso,
        duration,
        note,
        memberCare: member,
        rescheduleOf: reschedule,
        offer: offering ? { cents: cantPay ? 0 : Math.round(offerDollars * 100), note: offerNote } : null,
        insurance: usingInsurance ? { provider, memberIdLast4: memberId.replace(/\s/g, "").slice(-4), group: group.trim() } : null,
      }).then((result) => {
        if ("error" in result) {
          setPending(false);
          setBookError(result.error);
          return;
        }
        router.push(`/sessions/${result.booking.id}?new=1`);
      });
      return;
    }
    // Prototype: stands in for the server booking.
    setTimeout(() => {
      const id = proto.book({
        slug: c.slug,
        startIso,
        duration,
        feeCents: fee,
        note,
        rescheduledFrom: reschedule ?? undefined,
        memberCare: member,
        insurance: usingInsurance
          ? {
              provider,
              memberIdLast4: memberId.replace(/\s/g, "").slice(-4),
              groupNumber: group.trim(),
              status: "pending",
            }
          : undefined,
        priceRequest: offering
          ? { offeredCents: cantPay ? 0 : Math.round(offerDollars * 100), note: offerNote, status: "pending" }
          : undefined,
      });
      router.push(`/sessions/${id}?new=1`);
    }, 1200);
  };

  if (inPast) {
    return (
      <Card className="flex flex-col items-start gap-4">
        <h1 className="m-0 font-display text-[28px]">That time has passed</h1>
        <p className="m-0 text-slate-600">Pick another time with {c.preferredName}.</p>
        <Button href={back}>Choose a new time</Button>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Link href={back} className="-ml-1 inline-flex min-h-11 items-center self-start text-sm font-semibold">
          <ChevronLeft size={16} strokeWidth={1.8} aria-hidden="true" />
          Change time
        </Link>
        <h1 className="m-0 font-display text-[34px] leading-[1.1] md:text-[40px]">
          {rescheduling ? "Confirm your new time" : "Confirm your session"}
        </h1>
        <p className="m-0 text-slate-600">
          Booking as <b className="text-slate-900">{user.name}</b> · {user.email}
        </p>
      </div>
    <div className="flex flex-col gap-6 lg:flex-row-reverse lg:items-start lg:gap-8">
      {/* Summary */}
      <Card as="section" aria-label="Session details" padding="compact" className="flex flex-col gap-4 lg:sticky lg:top-6 lg:w-[380px] lg:flex-none">
        <div className="flex items-center gap-3.5">
          <Avatar name={c.name} src={c.avatarUrl} tint={c.avatarTint} size={64} />
          <div className="flex min-w-0 flex-col">
            <b className="font-display text-xl font-medium!">{c.name}</b>
            <span className="text-sm text-slate-600">
              {c.title}
              {c.churchName && ` · ${c.churchName}`}
            </span>
          </div>
        </div>
        <div className="flex flex-col gap-1 rounded-md bg-peach-50 p-4">
          {rescheduling && (
            <span className="text-[13px] text-slate-600 line-through">
              {formatSession(new Date(rescheduling.startIso), duration, tz)}
            </span>
          )}
          <b className="font-display text-[22px] leading-7 font-medium!">{formatSession(start, duration, tz)}</b>
          <span className="text-[13px] text-slate-600">Your time ({zoneCity(tz)})</span>
          {local && <span className="text-[13px] text-slate-600">{local}</span>}
        </div>
        <dl className="m-0 grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-[15px]">
          <dt className="text-slate-600">Length</dt>
          <dd className="m-0 text-right">{duration} min</dd>
          <dt className="text-slate-600">Where</dt>
          <dd className="m-0 flex items-center justify-end gap-1.5">
            <Video size={16} strokeWidth={1.8} aria-hidden="true" /> Google Meet
          </dd>
          <dt className="text-slate-600">Fee</dt>
          <dd className="m-0 text-right font-semibold">
            {member ? (
              <span className="text-sage-700">Free for members</span>
            ) : usingInsurance ? (
              `Billed to ${provider || "insurance"}`
            ) : usualFee === 0 ? (
              "Free"
            ) : offering && offerValid ? (
              <>
                <s className="font-normal text-slate-500">{formatFee(usualFee)}</s>{" "}
                {cantPay ? "Asking for free" : `You offer ${formatFee(Math.round(offerDollars * 100))}`}
              </>
            ) : (
              formatFee(usualFee)
            )}
          </dd>
        </dl>
        {usingInsurance ? (
          <p className="m-0 text-[13px] leading-normal text-slate-600">
            {c.preferredName} checks your coverage before the session and bills your insurer directly. A copay may apply.
            If it isn&rsquo;t covered, you can pay {c.preferredName} directly or cancel at no cost.
          </p>
        ) : member ? (
          <div className="flex flex-col gap-1.5 rounded-md bg-sage-100 px-4 py-3">
            <MemberBadge churchName={c.churchName ?? undefined} className="self-start bg-white!" />
            <span className="text-[13px] leading-normal">
              Free through {c.churchName}&rsquo;s member care. Your church never sees who booked or what you talk about.
            </span>
          </div>
        ) : (
          <p className="m-0 text-[13px] leading-normal text-slate-600">
            Your session supports {c.preferredName}&rsquo;s counseling ministry. You pay {c.preferredName} directly;
            FaithWellness doesn&rsquo;t take payment.
          </p>
        )}
      </Card>

      {/* Form */}
      <Card as="section" aria-label="Your details" className="flex min-w-0 flex-1 flex-col gap-6">
        <form onSubmit={confirm} noValidate className="flex flex-col gap-6">
          {canUseInsurance && (
            <fieldset className="m-0 flex flex-col gap-4 border-0 p-0">
              <legend className="mb-1 p-0 text-[15px] font-semibold">How would you like to pay?</legend>
              <div className="grid gap-3 sm:grid-cols-2">
                {(
                  [
                    ["self", `Pay ${c.preferredName} directly`, `Fee agreed privately with ${c.preferredName}`],
                    ["insurance", "Use insurance", `${c.preferredName} bills your plan`],
                  ] as const
                ).map(([value, label, hint]) => (
                  <label
                    key={value}
                    className={cn(
                      "flex min-h-16 cursor-pointer items-center gap-3 rounded-lg border bg-white px-4 py-3",
                      payWith === value ? "border-2 border-peach-500 bg-peach-50" : "border-border hover:border-peach-400",
                    )}
                  >
                    <input
                      type="radio"
                      name="payWith"
                      value={value}
                      checked={payWith === value}
                      onChange={() => {
                        setPayWith(value);
                        setInsErrors({});
                      }}
                      className="size-[18px] flex-none accent-peach-700"
                    />
                    <span className="flex flex-col">
                      <span className="font-semibold">{label}</span>
                      <span className="text-sm text-slate-600">{hint}</span>
                    </span>
                  </label>
                ))}
              </div>

              {usingInsurance && (
                <div className="flex flex-col gap-4 rounded-lg bg-cream p-4 md:p-5">
                  <div className="flex flex-col gap-2">
                    <label htmlFor="ins-plan" className="font-semibold">
                      Insurance plan
                    </label>
                    <select
                      id="ins-plan"
                      value={plan}
                      onChange={(e) => {
                        setPlan(e.target.value);
                        setInsErrors((x) => ({ ...x, plan: "" }));
                      }}
                      aria-invalid={Boolean(insErrors.plan)}
                      aria-describedby={insErrors.plan ? "ins-plan-error" : undefined}
                      className={insField}
                    >
                      <option value="">Choose your plan</option>
                      {c.insurance.map((p) => (
                        <option key={p}>{p}</option>
                      ))}
                      <option value={OTHER}>Another plan</option>
                    </select>
                    {plan === OTHER && (
                      <>
                        <label htmlFor="ins-other" className="sr-only">
                          Name of your plan
                        </label>
                        <input
                          id="ins-other"
                          value={otherPlan}
                          onChange={(e) => setOtherPlan(e.target.value)}
                          placeholder="Name of your plan"
                          className={insField}
                        />
                        <span className="text-[13px] text-slate-600">
                          {c.preferredName} will check whether this plan can be billed. If not, you can pay the usual fee.
                        </span>
                      </>
                    )}
                    {insErrors.plan && (
                      <p id="ins-plan-error" className="m-0 text-sm text-peach-700">
                        {insErrors.plan}
                      </p>
                    )}
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="flex flex-col gap-2">
                      <label htmlFor="ins-id" className="font-semibold">
                        Member ID
                      </label>
                      <input
                        id="ins-id"
                        value={memberId}
                        onChange={(e) => {
                          setMemberId(e.target.value);
                          setInsErrors((x) => ({ ...x, memberId: "" }));
                        }}
                        autoComplete="off"
                        aria-invalid={Boolean(insErrors.memberId)}
                        aria-describedby={insErrors.memberId ? "ins-id-error" : undefined}
                        className={insField}
                      />
                      {insErrors.memberId && (
                        <p id="ins-id-error" className="m-0 text-sm text-peach-700">
                          {insErrors.memberId}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col gap-2">
                      <label htmlFor="ins-group" className="font-semibold">
                        Group number
                      </label>
                      <input
                        id="ins-group"
                        value={group}
                        onChange={(e) => {
                          setGroup(e.target.value);
                          setInsErrors((x) => ({ ...x, group: "" }));
                        }}
                        autoComplete="off"
                        aria-invalid={Boolean(insErrors.group)}
                        aria-describedby={insErrors.group ? "ins-group-error" : undefined}
                        className={insField}
                      />
                      {insErrors.group && (
                        <p id="ins-group-error" className="m-0 text-sm text-peach-700">
                          {insErrors.group}
                        </p>
                      )}
                    </div>
                  </div>
                  <p className="m-0 flex gap-2 text-[13px] leading-normal text-slate-600">
                    <Lock size={14} strokeWidth={1.8} className="mt-0.5 flex-none" aria-hidden="true" />
                    Both are on your insurance card. Only {c.preferredName} sees them, to verify your coverage. FaithWellness
                    doesn&rsquo;t file claims or take payment.
                  </p>
                </div>
              )}
            </fieldset>
          )}

          {showPrice && (
            <section aria-labelledby="cost-title" className="flex flex-col gap-3 rounded-lg border border-border-warm bg-cream p-4 md:p-5">
              <div className="flex items-baseline justify-between gap-3">
                <h2 id="cost-title" className="m-0 text-[15px] font-semibold">
                  Session fee
                </h2>
                <b className={cn("font-display text-[26px] leading-8 font-medium!", offering && "text-slate-500 line-through")}>
                  {formatFee(usualFee)}
                </b>
              </div>
              <p className="m-0 text-[15px] leading-normal">
                Your session supports {c.preferredName}&rsquo;s counseling ministry.
                {c.slidingScale && ` ${c.preferredName} offers a sliding scale.`}
              </p>

              {!offering ? (
                <Button
                  variant="link"
                  className="self-start px-0!"
                  aria-expanded={false}
                  aria-controls="offer-panel"
                  onClick={() => {
                    setHardship(true);
                    setTimeout(() => document.getElementById("offer-amount")?.focus(), 0);
                  }}
                >
                  {c.slidingScale ? "Ask for a sliding-scale price" : "This is more than I can pay"}
                </Button>
              ) : (
                <div id="offer-panel" className="flex flex-col gap-4 rounded-md border border-border bg-white p-4">
                  <p className="m-0 text-[15px] leading-normal">
                    That&rsquo;s okay. Tell {c.preferredName} what you can offer. {c.preferredName} will reply in your messages
                    before the session, and you can cancel at no cost if it doesn&rsquo;t work out.
                  </p>
                  <div className="flex flex-col gap-2">
                    <label htmlFor="offer-amount" className="font-semibold">
                      What can you pay for this session?
                    </label>
                    <div className="relative max-w-[200px]">
                      <span className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-slate-600" aria-hidden="true">
                        $
                      </span>
                      <input
                        id="offer-amount"
                        inputMode="decimal"
                        value={cantPay ? "" : offer}
                        disabled={cantPay}
                        onChange={(e) => {
                          setOffer(e.target.value);
                          setOfferError("");
                        }}
                        aria-invalid={Boolean(offerError)}
                        aria-describedby={offerError ? "offer-error" : undefined}
                        placeholder={String(Math.round(usualFee / 200))}
                        className="min-h-12 w-full rounded-md border border-border bg-cream pr-4 pl-8 text-base disabled:opacity-50 aria-invalid:border-peach-700"
                      />
                    </div>
                    <label className="flex min-h-11 cursor-pointer items-center gap-2.5 text-[15px]">
                      <input
                        type="checkbox"
                        checked={cantPay}
                        onChange={(e) => {
                          setCantPay(e.target.checked);
                          setOfferError("");
                        }}
                        className="size-[18px] flex-none accent-peach-700"
                      />
                      I can&rsquo;t pay anything right now
                    </label>
                    {offerError && (
                      <p id="offer-error" className="m-0 text-sm text-peach-700">
                        {offerError}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col gap-2">
                    <label htmlFor="offer-note" className="font-semibold">
                      Anything you&rsquo;d like {c.preferredName} to know? <span className="font-normal text-slate-600">(optional)</span>
                    </label>
                    <textarea
                      id="offer-note"
                      rows={3}
                      value={offerNote}
                      onChange={(e) => setOfferNote(e.target.value)}
                      placeholder="You don’t have to explain. A few words can help, like “I lost my job last month.”"
                      className="resize-y rounded-md border border-border bg-cream px-4 py-3 text-base leading-[1.6]"
                    />
                    <span className="flex items-center gap-1.5 text-[13px] text-slate-600">
                      <Lock size={14} strokeWidth={1.8} aria-hidden="true" />
                      Only {c.preferredName} sees this.
                    </span>
                  </div>
                  <Button
                    variant="link"
                    className="self-start px-0! text-sm"
                    onClick={() => {
                      setHardship(false);
                      setOffer("");
                      setCantPay(false);
                      setOfferNote("");
                      setOfferError("");
                    }}
                  >
                    Pay the full fee instead
                  </Button>
                </div>
              )}
            </section>
          )}

          <div className="flex flex-col gap-2">
            <label htmlFor="note" className="text-[15px] font-semibold">
              Anything {c.preferredName} should know before you meet? <span className="font-normal text-slate-600">(optional)</span>
            </label>
            <textarea
              id="note"
              rows={4}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="For example: my husband will join too, or what you’d like to talk about."
              className="resize-y rounded-md border border-border bg-cream px-4 py-3 text-base leading-[1.6]"
            />
            <span className="flex items-center gap-1.5 text-[13px] text-slate-600">
              <Lock size={14} strokeWidth={1.8} aria-hidden="true" />
              Only {c.preferredName} sees this. It&rsquo;s posted to your private message thread.
            </span>
          </div>

          <IntakeSharingNote counselorName={c.preferredName} />

          <div className="flex flex-col gap-1">
            <label className="flex cursor-pointer items-start gap-3 text-[15px] leading-normal">
              <input
                type="checkbox"
                checked={agreed}
                onChange={(e) => {
                  setAgreed(e.target.checked);
                  setShowError(false);
                }}
                aria-invalid={showError}
                aria-describedby={showError ? "agree-error" : undefined}
                className="mt-0.5 size-5 flex-none accent-peach-700"
              />
              <span>
                I understand sessions are free to cancel or reschedule up to 24 hours before, and that FaithWellness
                isn&rsquo;t an emergency service.
              </span>
            </label>
            {showError && (
              <p id="agree-error" className="m-0 pl-8 text-sm text-peach-700">
                Please tick the box to continue.
              </p>
            )}
          </div>

          {bookError && (
            <p role="alert" className="m-0 rounded-md bg-peach-50 px-4 py-3 text-sm text-peach-800">
              {bookError}{" "}
              <Link href={back} className="font-semibold">
                See other times
              </Link>
            </p>
          )}
          <Button type="submit" size="lg" className="min-h-14 text-base" disabled={pending}>
            {pending ? `Checking ${c.preferredName}’s calendar…` : rescheduling ? "Confirm new time" : "Confirm booking"}
          </Button>
        </form>
      </Card>
    </div>
    </div>
  );
}
