import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { InsuranceBadge } from "@/components/InsuranceBadge";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { CrisisNotice } from "@/components/ui/CrisisNotice";
import { getCounselor, getFocusAreas } from "@/lib/counselors";
import { cn } from "@/lib/cn";
import { BookingPanel } from "./BookingPanel";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const c = await getCounselor((await params).slug);
  if (!c) return {};
  return {
    title: c.name,
    description: `${c.title}${c.church ? ` at ${c.church.name}` : ""}. ${c.summary}`,
  };
}

const shortDenomination = (d: string) => (d === "Non-denominational" ? "Non-denom." : d);

export default async function ProfilePage({ params, searchParams }: Props) {
  const [{ slug }, query] = await Promise.all([params, searchParams]);
  const [c, focusAreas] = await Promise.all([getCounselor(slug), getFocusAreas()]);
  if (!c) notFound();

  const firstFocus = focusAreas.find((a) => a.slug === c.focusAreas[0]);
  const duration = query.duration === "30" ? 30 : 60;
  const stats = [
    c.yearsMinistry !== null && { value: `${c.yearsMinistry} yrs`, label: "in ministry" },
    c.languages.length > 0 && { value: c.languages.join(", "), label: "languages" },
    c.church && { value: shortDenomination(c.church.denomination), label: "tradition" },
    { value: "Video", label: "Google Meet" },
  ].filter((s): s is { value: string; label: string } => Boolean(s));

  return (
    <>
      <nav aria-label="Breadcrumb" className="mx-auto max-w-[1280px] px-4 pt-4 text-sm text-slate-600 md:px-8 md:pt-5">
        <ol className="m-0 flex list-none flex-wrap items-center gap-x-1.5 p-0">
          <li>
            <Link href="/counselors" className="inline-flex min-h-11 items-center font-semibold">
              <ChevronLeft size={16} strokeWidth={1.8} aria-hidden="true" />
              All counselors
            </Link>
          </li>
          {firstFocus && (
            <li className="hidden items-center gap-1.5 sm:flex">
              <span aria-hidden="true">/</span>
              <Link href={`/counselors?focus=${firstFocus.slug}`} className="text-slate-600!">
                {firstFocus.label}
              </Link>
            </li>
          )}
          <li className="hidden items-center gap-1.5 sm:flex">
            <span aria-hidden="true">/</span>
            <span aria-current="page">{c.name}</span>
          </li>
        </ol>
      </nav>

      <main className="mx-auto flex max-w-[1280px] flex-col gap-6 px-4 pt-2 pb-28 md:pt-6 md:pb-20 lg:flex-row lg:items-start lg:gap-10 lg:px-8">
        <div className="flex min-w-0 flex-1 flex-col gap-6 md:gap-7">
          {/* Hero */}
          <Card as="section" padding="none" className="overflow-hidden">
            <div className="h-20 bg-peach-100 md:h-[120px]" />
            <div className="-mt-16 flex flex-wrap items-end gap-4 px-5 pb-6 md:-mt-[72px] md:gap-6 md:px-9 md:pb-8">
              <Avatar
                name={c.name}
                src={c.avatarUrl}
                tint="#FFD8C8"
                size={168}
                className="size-[120px]! rounded-[36px]! shadow-[0_8px_24px_rgba(45,55,72,.10)] outline-0 md:size-[168px]! md:rounded-[48px]!"
              />
              <div className="flex min-w-0 flex-[1_1_320px] flex-col gap-2 pb-1.5">
                <h1 className="m-0 font-display text-[34px] leading-[1.05] md:text-[44px]">{c.name}</h1>
                <span className="text-base font-semibold md:text-[17px]">
                  {c.title}
                  {c.church && ` · ${c.church.name}, ${c.church.city.split(",")[0]}`}
                </span>
                <ul className="m-0 flex list-none flex-wrap gap-2 p-0" aria-label="Credentials">
                  {c.badges.map((b) => (
                    <li key={b}>
                      <Badge>{b}</Badge>
                    </li>
                  ))}
                  {c.insurance.length > 0 && (
                    <li>
                      <InsuranceBadge />
                    </li>
                  )}
                </ul>
              </div>
            </div>
            <dl className="m-0 grid grid-cols-2 border-t border-divider md:grid-cols-4">
              {stats.map((s, i) => (
                <div
                  key={s.label}
                  className={cn(
                    "flex flex-col-reverse items-center gap-0.5 px-3 py-4 text-center md:py-[18px]",
                    i % 2 === 0 && "border-r border-divider",
                    i < 2 && "border-b border-divider md:border-b-0",
                    i === 1 && "md:border-r",
                  )}
                >
                  <dt className="text-[13px] text-slate-600">{s.label}</dt>
                  <dd className="m-0 text-lg font-bold md:text-xl">{s.value}</dd>
                </div>
              ))}
            </dl>
          </Card>

          {/* About */}
          <Card as="section" className="flex flex-col gap-7 md:p-9!">
            <div className="flex flex-col gap-2.5">
              <h2 className="m-0 font-display text-[28px] leading-[34px]">About me</h2>
              {c.about.map((para) => (
                <p key={para.slice(0, 32)} className="m-0 text-base leading-[1.7] md:text-[17px]">
                  {para}
                </p>
              ))}
            </div>
            {c.approach && (
              <div className="flex flex-col gap-2.5">
                <h2 className="m-0 font-display text-[28px] leading-[34px]">How I bring faith into care</h2>
                <p className="m-0 text-base leading-[1.7] md:text-[17px]">{c.approach}</p>
              </div>
            )}
            {c.verse && (
              <figure className="m-0 rounded-lg bg-peach-50 px-5 py-5 md:px-[26px] md:py-[22px]">
                <blockquote className="m-0 font-display text-xl leading-[1.45] italic md:text-[22px]">
                  &ldquo;{c.verse}&rdquo;
                </blockquote>
                {c.verseRef && (
                  <figcaption className="mt-2 text-[13px] text-slate-600">
                    {c.verseRef} — the verse {c.preferredName} returns to most
                  </figcaption>
                )}
              </figure>
            )}
            <div className="flex flex-col gap-3">
              <h2 className="m-0 font-display text-[28px] leading-[34px]">I can help with</h2>
              <ul className="m-0 flex list-none flex-wrap gap-2 p-0">
                {c.helpWith.map((t, i) => (
                  <li
                    key={t}
                    className={cn(
                      "rounded-pill px-3.5 py-2 text-sm",
                      i < 3 ? "bg-peach-200 font-semibold text-peach-800" : "bg-cream-200",
                    )}
                  >
                    {t}
                  </li>
                ))}
              </ul>
            </div>
          </Card>

          <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,300px),1fr))] gap-6 md:gap-7">
            {c.credentials.length > 0 && (
              <Card as="section" padding="compact" className="flex flex-col gap-3.5">
                <h2 className="m-0 font-display text-[22px]">Training &amp; credentials</h2>
                <ul className="m-0 flex list-none flex-col gap-3.5 p-0">
                  {c.credentials.map((cr) => (
                    <li key={cr.label} className="flex flex-col gap-0.5 text-[15px]">
                      <b>{cr.label}</b>
                      {(cr.issuer || cr.year) && (
                        <span className="text-sm text-slate-600">{[cr.issuer, cr.year].filter(Boolean).join(", ")}</span>
                      )}
                    </li>
                  ))}
                </ul>
              </Card>
            )}
            <Card as="section" padding="compact" className="flex flex-col gap-3">
              <h2 className="m-0 font-display text-[22px]">What a first session looks like</h2>
              <ol className="m-0 flex flex-col gap-1.5 pl-5 text-[15px] leading-[1.6]">
                <li>A short welcome and prayer, if you&rsquo;d like one.</li>
                <li>You share what brought you here — at your pace.</li>
                <li>Together we name one hope for our time and agree on next steps.</li>
              </ol>
              <span className="text-[13px] text-slate-600">
                Everything you share stays confidential, within the limits of the law.
              </span>
            </Card>
          </div>

          {c.insurance.length > 0 && (
            <Card as="section" aria-labelledby="insurance" padding="compact" className="flex flex-col gap-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 id="insurance" className="m-0 font-display text-[22px]">
                  Insurance
                </h2>
                <InsuranceBadge />
              </div>
              <p className="m-0 text-[15px] leading-[1.6]">
                {c.preferredName} is a licensed mental health professional who bills insurance through a private practice,
                not through FaithWellness. Plans accepted:
              </p>
              <ul className="m-0 flex list-none flex-wrap gap-2 p-0" aria-label="Insurance plans accepted">
                {c.insurance.map((plan) => (
                  <li key={plan} className="rounded-pill bg-cream-200 px-3.5 py-1.5 text-sm">
                    {plan}
                  </li>
                ))}
              </ul>
              <ol className="m-0 flex flex-col gap-1.5 pl-5 text-[15px] leading-[1.6] text-slate-600">
                <li>When you book, choose &ldquo;Use insurance&rdquo; and add your plan, member ID and group number.</li>
                <li>{c.preferredName} checks your coverage before your first session and tells you about any copay.</li>
                <li>
                  {c.preferredName} bills your insurer directly. If your plan doesn&rsquo;t cover it, you can pay the usual fee or
                  cancel at no cost.
                </li>
              </ol>
            </Card>
          )}

          <CrisisNotice />
        </div>

        <div className="w-full lg:sticky lg:top-6 lg:w-[400px] lg:flex-none">
          <BookingPanel
            slug={c.slug}
            preferredName={c.preferredName}
            fee30Cents={c.fee30Cents}
            fee60Cents={c.fee60Cents}
            offers30={c.offers30}
            offers60={c.offers60}
            slidingScale={c.slidingScale}
            timeZone={c.timeZone}
            availability={c.availability}
            initialDuration={duration}
            reschedule={typeof query.reschedule === "string" ? query.reschedule : null}
            churchSlug={c.church?.slug ?? null}
            insurance={c.insurance}
          />
        </div>
      </main>

      {/* Mobile: keep booking one tap away. */}
      <div className="fixed inset-x-0 bottom-0 z-10 border-t border-border-warm bg-white/95 px-4 py-3 backdrop-blur lg:hidden">
        <Button href="#book" size="lg" className="w-full">
          Book a session with {c.preferredName}
        </Button>
      </div>
    </>
  );
}
