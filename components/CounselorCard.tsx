import Link from "next/link";
import { NextOpening } from "@/components/LocalTime";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { InsuranceBadge } from "@/components/InsuranceBadge";
import { MemberFee } from "@/components/prototype/MemberFee";
import type { Counselor } from "@/lib/types";

type CounselorCardProps = {
  counselor: Counselor;
  nextOpening: Date | null;
  /** Focus-area slug → label. */
  focusLabels: Record<string, string>;
};

export function CounselorCard({ counselor: c, nextOpening, focusLabels }: CounselorCardProps) {
  const profile = `/counselors/${c.slug}`;
  const tags = [...c.focusAreas.slice(0, 2).map((s) => focusLabels[s] ?? s), c.church?.denomination].filter(
    (t): t is string => Boolean(t),
  );

  return (
    <article className="flex flex-col gap-3.5 rounded-[24px] border border-border-warm bg-white p-5 shadow-card md:gap-4 md:rounded-xl md:p-[26px]">
      <div className="flex items-center gap-3.5 md:gap-4">
        <Avatar name={c.name} src={c.avatarUrl} tint={c.avatarTint} size={76} />
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

      <ul className="m-0 hidden list-none flex-wrap gap-1.5 p-0 md:flex" aria-label="Focus areas">
        {tags.map((t) => (
          <li key={t}>
            <Badge variant="tag">{t}</Badge>
          </li>
        ))}
      </ul>

      <MemberFee churchSlug={c.church?.slug ?? null} fee30Cents={c.fee30Cents} fee60Cents={c.fee60Cents} />

      <div className="mt-auto grid grid-cols-2 gap-2.5">
        {c.offers30 && (
          <Button variant="secondary" size="lg" href={`${profile}?duration=30`} className="px-3">
            <span className="sr-only md:not-sr-only">Book&nbsp;</span>30 min
          </Button>
        )}
        {c.offers60 && (
          <Button variant="primary" size="lg" href={`${profile}?duration=60`} className="col-start-2 px-3">
            <span className="sr-only md:not-sr-only">Book&nbsp;</span>60 min
          </Button>
        )}
      </div>
      <Button variant="link" href={`/messages/${c.slug}`} className="self-center text-sm">
        Message first
      </Button>
    </article>
  );
}
