"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronLeft, CircleAlert, Eye, EyeOff, Lock, Pencil } from "lucide-react";
import { CounselorCard } from "@/components/CounselorCard";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/cn";
import {
  adultAges,
  childAges,
  denominations,
  directoryHref,
  matchCounselors,
  topicOptions,
  whoOptions,
  type Intake,
  type Topic,
  type Who,
} from "@/lib/prototype/intake";
import { proto, useProto } from "@/lib/prototype/store";
import type { Counselor } from "@/lib/types";

type Props = { counselors: Counselor[]; focusLabels: Record<string, string>; languages: string[] };

/** Only allow in-app paths as the return address. */
const safeNext = (n: string | null) => (n && n.startsWith("/") && !n.startsWith("//") ? n : null);

const STEPS = 5;

export function GetStarted(props: Props) {
  const s = useProto();
  const params = useSearchParams();
  const editing = params.get("edit") === "1";
  const [done, setDone] = useState(false);

  if (!s) return <div className="h-80 animate-pulse rounded-xl bg-cream-200" aria-busy="true" />;
  if (s.intake && (!editing || done)) return <Results {...props} intake={s.intake} />;
  return (
    <div className="mx-auto w-full max-w-[680px]">
      <Questions languages={props.languages} initial={s.intake} onDone={() => setDone(true)} />
    </div>
  );
}

// Questions ------------------------------------------------------------------

type Draft = Omit<Intake, "completedIso">;

const blank: Draft = {
  who: "individual",
  ageRange: "",
  topics: [],
  cultureConsidered: false,
  cultureNote: "",
  language: "English",
  denomination: "",
  shareWithCounselor: true,
};

function Questions({ languages, initial, onDone }: { languages: string[]; initial: Intake | null; onDone: () => void }) {
  const params = useSearchParams();
  const router = useRouter();
  const next = safeNext(params.get("next"));
  const [step, setStep] = useState(0);
  const [d, setD] = useState<Draft & { whoChosen: boolean; cultureChosen: boolean }>(
    initial ? { ...initial, whoChosen: true, cultureChosen: true } : { ...blank, whoChosen: false, cultureChosen: false },
  );
  const [error, setError] = useState("");
  const heading = useRef<HTMLHeadingElement>(null);
  const first = useRef(true);

  // Move focus to each new question so screen reader and keyboard users land in the right place.
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    heading.current?.focus();
  }, [step]);

  const set = (patch: Partial<typeof d>) => {
    setD((x) => ({ ...x, ...patch }));
    setError("");
  };

  const ages = d.who === "child" ? childAges : adultAges;
  const valid = [
    d.whoChosen,
    Boolean(d.ageRange) && ages.includes(d.ageRange),
    d.topics.length > 0,
    d.cultureChosen,
    Boolean(d.denomination),
  ][step];
  const errors = [
    "Choose who the care is for.",
    "Choose an age range.",
    "Choose at least one, or the closest fit.",
    "Choose yes or no.",
    "Choose a denomination, or No preference.",
  ];

  const forward = () => {
    if (!valid) return setError(errors[step]);
    if (step < STEPS - 1) return setStep(step + 1);
    const { whoChosen: _w, cultureChosen: _c, ...rest } = d;
    proto.saveIntake({ ...rest, cultureNote: rest.cultureConsidered ? rest.cultureNote.trim() : "", completedIso: new Date().toISOString() });
    onDone();
    router.replace(`/get-started${next ? `?next=${encodeURIComponent(next)}` : ""}`, { scroll: true });
  };

  const titles = [
    "Who is the counseling for?",
    d.who === "child" ? "How old is your child?" : "How old are you?",
    d.who === "child" ? "What would you like to talk about for your child?" : "What would you like to talk to someone about?",
    "Would you like your culture to be considered?",
    "What denomination are you?",
  ];

  return (
    <Card as="section" aria-labelledby="q-title" className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between text-sm text-slate-600">
          <span>
            Question {step + 1} of {STEPS}
          </span>
          {next && (
            <Link href={next} className="inline-flex min-h-11 items-center font-semibold">
              Skip for now
            </Link>
          )}
        </div>
        <div className="h-1.5 overflow-hidden rounded-pill bg-cream-200" aria-hidden="true">
          <div className="h-full rounded-pill bg-peach-500 transition-[width]" style={{ width: `${((step + 1) / STEPS) * 100}%` }} />
        </div>
      </div>

      <form
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          forward();
        }}
        className="flex flex-col gap-6"
      >
        <fieldset className="m-0 flex flex-col gap-4 border-0 p-0" aria-describedby={error ? "q-error" : undefined}>
          <legend className="p-0">
            <h1 id="q-title" ref={heading} tabIndex={-1} className="m-0 font-display text-[30px] leading-[1.15] outline-none md:text-[36px]">
              {titles[step]}
            </h1>
          </legend>

          {step === 0 && (
            <div className="grid gap-3 sm:grid-cols-2">
              {whoOptions.map((o) => (
                <Choice
                  key={o.value}
                  type="radio"
                  name="who"
                  checked={d.whoChosen && d.who === o.value}
                  onChange={() => set({ who: o.value as Who, whoChosen: true, ageRange: "" })}
                  label={o.label}
                  hint={o.hint}
                />
              ))}
            </div>
          )}

          {step === 1 && (
            <>
              {d.who === "couple" && <p className="m-0 text-slate-600">Just yours is fine. Your partner can add theirs later.</p>}
              {d.who === "family" && <p className="m-0 text-slate-600">Yours, as the person booking.</p>}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {ages.map((a) => (
                  <Choice key={a} type="radio" name="age" checked={d.ageRange === a} onChange={() => set({ ageRange: a })} label={a} />
                ))}
              </div>
              {d.ageRange === "Under 18" && (
                <Notice>
                  Because you&rsquo;re under 18, a parent or guardian needs to agree before your first session. You can
                  still look around and message a counselor.
                </Notice>
              )}
            </>
          )}

          {step === 2 && (
            <>
              <p className="m-0 text-slate-600">Choose as many as you like. You can share more with your counselor later.</p>
              <div className="grid gap-3 sm:grid-cols-2">
                {topicOptions.map((o) => (
                  <Choice
                    key={o.value}
                    type="checkbox"
                    name="topics"
                    checked={d.topics.includes(o.value)}
                    onChange={(on) => set({ topics: on ? [...d.topics, o.value as Topic] : d.topics.filter((t) => t !== o.value) })}
                    label={o.label}
                  />
                ))}
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <p className="m-0 text-slate-600">
                For example your heritage, language, or traditions that shape how your family talks about faith and
                hard things.
              </p>
              <div className="grid grid-cols-2 gap-3">
                <Choice type="radio" name="culture" checked={d.cultureChosen && d.cultureConsidered} onChange={() => set({ cultureConsidered: true, cultureChosen: true })} label="Yes" />
                <Choice type="radio" name="culture" checked={d.cultureChosen && !d.cultureConsidered} onChange={() => set({ cultureConsidered: false, cultureChosen: true })} label="No" />
              </div>
              {d.cultureChosen && d.cultureConsidered && (
                <div className="flex flex-col gap-4 rounded-lg bg-cream p-4">
                  <div className="flex flex-col gap-2">
                    <label htmlFor="q-culture" className="font-semibold">
                      Tell us a little about your culture <span className="font-normal text-slate-600">(optional)</span>
                    </label>
                    <textarea
                      id="q-culture"
                      rows={3}
                      value={d.cultureNote}
                      onChange={(e) => set({ cultureNote: e.target.value })}
                      placeholder="e.g. Nigerian, first generation in the US"
                      className="resize-y rounded-md border border-border bg-white px-4 py-3 text-base leading-[1.6]"
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label htmlFor="q-language" className="font-semibold">
                      Preferred language for sessions
                    </label>
                    <select
                      id="q-language"
                      value={d.language}
                      onChange={(e) => set({ language: e.target.value })}
                      className="min-h-12 rounded-md border border-border bg-white px-4 text-base"
                    >
                      {languages.map((l) => (
                        <option key={l}>{l}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
            </>
          )}

          {step === 4 && (
            <>
              <p className="m-0 text-slate-600">We&rsquo;ll show counselors from your tradition first. You can still see everyone.</p>
              <div className="grid gap-2 sm:grid-cols-2">
                {denominations.map((den) => (
                  <Choice key={den} type="radio" name="denomination" checked={d.denomination === den} onChange={() => set({ denomination: den })} label={den} compact />
                ))}
              </div>
              <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-border p-4 text-[15px] leading-normal">
                <input
                  type="checkbox"
                  checked={d.shareWithCounselor}
                  onChange={(e) => set({ shareWithCounselor: e.target.checked })}
                  className="mt-0.5 size-5 flex-none accent-peach-700"
                />
                <span>
                  <b>Share my answers with counselors I book or message</b>
                  <span className="block text-slate-600">So you don&rsquo;t have to repeat yourself. Never shared with your church.</span>
                </span>
              </label>
            </>
          )}
        </fieldset>

        {error && (
          <p id="q-error" role="alert" className="m-0 text-sm text-peach-700">
            {error}
          </p>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3">
          {step > 0 ? (
            <Button variant="link" className="px-0!" onClick={() => setStep(step - 1)}>
              <ChevronLeft size={16} strokeWidth={1.8} aria-hidden="true" />
              Back
            </Button>
          ) : (
            <span />
          )}
          <Button type="submit" size="lg">
            {step < STEPS - 1 ? "Continue" : "See my matches"}
          </Button>
        </div>
      </form>

      <p className="m-0 flex gap-2 text-[13px] leading-normal text-slate-600">
        <Lock size={15} strokeWidth={1.8} className="mt-0.5 flex-none" aria-hidden="true" />
        Your answers stay private. They help us suggest counselors, and you can change them at any time.
      </p>
    </Card>
  );
}

function Choice({
  type,
  name,
  checked,
  onChange,
  label,
  hint,
  compact = false,
}: {
  type: "radio" | "checkbox";
  name: string;
  checked: boolean;
  onChange: (on: boolean) => void;
  label: string;
  hint?: string;
  compact?: boolean;
}) {
  return (
    <label
      className={cn(
        "relative flex cursor-pointer items-center gap-3 rounded-lg border bg-white px-4 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-peach-700",
        compact ? "min-h-12" : "min-h-16 py-3",
        checked ? "border-2 border-peach-500 bg-peach-50" : "border-border hover:border-peach-400",
      )}
    >
      <input type={type} name={name} checked={checked} onChange={(e) => onChange(e.target.checked)} className="sr-only" />
      <span
        aria-hidden="true"
        className={cn(
          "flex size-5 flex-none items-center justify-center border-[1.5px]",
          type === "radio" ? "rounded-full" : "rounded-[6px]",
          checked ? "border-peach-700 bg-peach-700 text-white" : "border-slate-500 bg-white",
        )}
      >
        {checked && <Check size={13} strokeWidth={3} />}
      </span>
      <span className="flex flex-col">
        <span className="text-base font-semibold">{label}</span>
        {hint && <span className="text-sm text-slate-600">{hint}</span>}
      </span>
    </label>
  );
}

function Notice({ children }: { children: React.ReactNode }) {
  return (
    <p className="m-0 flex gap-2.5 rounded-md bg-peach-50 px-4 py-3 text-[15px] leading-normal">
      <CircleAlert size={20} strokeWidth={1.8} className="mt-0.5 flex-none text-peach-700" aria-hidden="true" />
      <span>{children}</span>
    </p>
  );
}

// Results ----------------------------------------------------------------------

function Results({ counselors, focusLabels, intake }: Props & { intake: Intake }) {
  const params = useSearchParams();
  const next = safeNext(params.get("next"));

  const { matches, childFallback } = useMemo(() => {
    const direct = matchCounselors(counselors, intake, focusLabels);
    // No sample counselor works with children yet, so suggest family counselors instead.
    if (intake.who === "child" && !direct.some((m) => m.reasons.includes("Works with children"))) {
      return { matches: matchCounselors(counselors, { ...intake, who: "family" }, focusLabels), childFallback: true };
    }
    return { matches: direct, childFallback: false };
  }, [counselors, intake, focusLabels]);

  const top = matches.slice(0, 3);
  const who = whoOptions.find((o) => o.value === intake.who)?.label;
  const summary = [
    who,
    intake.ageRange,
    ...intake.topics.map((t) => topicOptions.find((o) => o.value === t)?.label),
    intake.cultureConsidered ? (intake.language !== "English" ? `Culture considered · ${intake.language}` : "Culture considered") : null,
    intake.denomination,
  ].filter(Boolean);

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-4">
        <span className="label-overline text-peach-700!">Your matches</span>
        <h1 className="m-0 font-display text-[34px] leading-[1.1] md:text-[44px]">Counselors who fit what you shared</h1>
        <ul className="m-0 flex list-none flex-wrap gap-2 p-0" aria-label="Your answers">
          {summary.map((s) => (
            <li key={s} className="rounded-pill bg-cream-200 px-3 py-1 text-sm">
              {s}
            </li>
          ))}
          <li>
            <Link href={`/get-started?edit=1${next ? `&next=${encodeURIComponent(next)}` : ""}`} className="inline-flex min-h-8 items-center gap-1 px-1 text-sm font-semibold">
              <Pencil size={14} strokeWidth={1.8} aria-hidden="true" />
              Edit answers
            </Link>
          </li>
        </ul>
        <div className="flex items-start gap-2 text-[15px] text-slate-600">
          {intake.shareWithCounselor ? (
            <Eye size={18} strokeWidth={1.8} className="mt-[13px] flex-none text-sage-700" aria-hidden="true" />
          ) : (
            <EyeOff size={18} strokeWidth={1.8} className="mt-[13px] flex-none" aria-hidden="true" />
          )}
          <p className="m-0 flex flex-wrap items-center gap-x-2">
            <span className="py-2.5">
              {intake.shareWithCounselor
                ? "Shared with counselors you book or message. Never with your church."
                : "Private. Counselors won’t see your answers."}
            </span>
            <Button variant="link" className="px-0! text-[15px]" onClick={() => proto.setIntakeSharing(!intake.shareWithCounselor)}>
              {intake.shareWithCounselor ? "Stop sharing" : "Share with my counselors"}
            </Button>
          </p>
        </div>
        {next && (
          <div>
            <Button href={next} size="lg">
              Continue where you left off
            </Button>
          </div>
        )}
      </div>

      {childFallback && (
        <Notice>
          None of our counselors list work with children yet. These counselors work with families, and can talk with you
          about your child.
        </Notice>
      )}
      {intake.topics.includes("addiction") && (
        <Notice>
          No counselor lists addiction yet, so we&rsquo;ve matched on your other answers. A counselor can still help you
          find specialist support.
        </Notice>
      )}
      {intake.ageRange === "Under 18" && <Notice>A parent or guardian needs to agree before your first session.</Notice>}

      {top.length > 0 ? (
        <ul className="m-0 grid list-none grid-cols-[repeat(auto-fill,minmax(min(100%,340px),1fr))] gap-6 p-0">
          {top.map((m, i) => (
            <li key={m.counselor.slug} className="flex flex-col">
              <CounselorCard
                counselor={m.counselor}
                nextOpening={null}
                focusLabels={focusLabels}
                fit={{ reasons: m.reasons, best: i === 0 }}
              />
            </li>
          ))}
        </ul>
      ) : (
        <Card className="flex flex-col items-start gap-3">
          <h2 className="m-0 font-display text-[22px]">No close matches yet</h2>
          <p className="m-0 text-slate-600">Every counselor is still worth a look, or try changing your answers.</p>
        </Card>
      )}

      <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center">
        <Button href={directoryHref(intake)} variant="secondary" size="lg">
          See more counselors
        </Button>
        <span className="text-sm text-slate-600">Filtered by what you&rsquo;d like to talk about.</span>
      </div>
    </div>
  );
}
