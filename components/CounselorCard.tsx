import Link from "next/link";
import { Award, Check } from "lucide-react";
import { NextOpening } from "@/components/LocalTime";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { InsuranceBadge } from "@/components/InsuranceBadge";
import { Tilt } from "@/components/Tilt";
import { MemberFee } from "@/components/prototype/MemberFee";
import { cn } from "@/lib/cn";
import type { Counselor } from "@/lib/types";

type CounselorCardProps = {
  counselor: Counselor;
  nextOpening: Date | null;
  /** Focus-area slug → label. */
  focusLabels: Record<string, string>;
  /** On the matches page: why this counselor fits, and whether they're the best fit. */
  fit?: { reasons: string[]; best?: boolean };
};

export function CounselorCard({ counselor: c, nextOpening, focusLabels, fit }: CounselorCardProps) {
  const profile = `/counselors/${c.slug}`;
  const tags = [...c.focusAreas.slice(0, 2).map((s) => focusLabels[s] ?? s), c.church?.denomination].filter(
    (t): t is string => Boolean(t),
  );

  return (
    <Tilt
      className={cn(
        "flex flex-col gap-3.5 rounded-[24px] bg-white p-5 shadow-card md:gap-4 md:rounded-xl md:p-[26px]",
        fit?.best ? "border-2 border-peach-500" : "border border-border-warm",
      )}
    >
      {fit?.best && (
        <span className="label-overline -mb-1 flex items-center gap-1.5 text-peach-800!">
          <Award size={16} strokeWidth={1.8} aria-hidden="true" />
          Best fit for you
        </span>
      )}
      <div className="flex items-center gap-3.5 md:gap-4">
        <div data-tilt-depth className="flex-none">
          <Avatar name={c.name} src={c.avatarUrl} tint={c.avatarTint} size={76} />
        </div>
        <div className="flex min-w-0 flex-col gap-[3px]">
          <h3 className="m-0 font-display text-[21px] leading-7 md:text-[22px]">
            <Link href={profile} className="text-slate-900! no-underline hover:underline">
              {c.name}
            </Link>
          </h3>
          <span className="text-[13px] leading-5 text-slate-600 md:text-sm">
            {c.title}
            {c.church && ` · ${c.church.name}`}
          </span>
          {nextOpening && (
            <span className="flex items-center gap-1.5 text-[13px] leading-5 font-semibold text-sage-700">
              <span aria-hidden="true" className="size-2 flex-none rounded-full bg-sage-700" />
              <NextOpening iso={nextOpening.toISOString()} fallbackTimeZone={c.timeZone} />
            </span>
          )}
        </div>
      </div>

      {c.badges.length > 0 && (
        <ul className="m-0 flex list-none flex-wrap gap-1.5 p-0" aria-label="Credentials">
          {c.badges.slice(0, 3).map((b) => (
            <li key={b}>
              <Badge className="px-2.5! py-1! text-[12.5px]">{b}</Badge>
            </li>
          ))}
          {c.insurance.length > 0 && (
            <li>
              <InsuranceBadge className="px-2.5! py-1! text-[12.5px]" />
            </li>
          )}
        </ul>
      )}

      <p className="m-0 text-[15px] leading-[1.6]">{c.summary}</p>

      {fit && fit.reasons.length > 0 && (
        <div className="flex flex-col gap-1.5 rounded-md bg-sage-100/60 px-4 py-3">
          <span className="text-[13px] font-semibold text-sage-700">Why {c.preferredName} fits what you shared</span>
          <ul className="m-0 flex list-none flex-col gap-1 p-0 text-sm leading-5">
            {fit.reasons.map((r) => (
              <li key={r} className="flex gap-2">
                <Check size={16} strokeWidth={2} className="mt-0.5 flex-none text-sage-700" aria-hidden="true" />
                {r}
              </li>
            ))}
          </ul>
        </div>
      )}

      <ul className="m-0 hidden list-none flex-wrap gap-1.5 p-0 md:flex" aria-label="Focus areas">
        {tags.map((t) => (
          <li key={t}>
            <Badge variant="tag">{t}</Badge>
          </li>
        ))}
      </ul>

      <MemberFee churchSlug={c.church?.slug ?? null} />

      <Button variant="primary" size="lg" href={profile} className="mt-auto w-full">
        Book a call<span className="sr-only"> with {c.preferredName}</span>
      </Button>
      <Button variant="link" href={`/messages/${c.slug}`} className="self-center text-sm">
        Message first
      </Button>
    </Tilt>
  );
}
