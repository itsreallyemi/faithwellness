import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarClock, Check, ChevronLeft, ClipboardList } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { CrisisNotice } from "@/components/ui/CrisisNotice";
import { accreditingBodies, getAccreditingBody } from "@/lib/accreditation";
import { getCounselors } from "@/lib/counselors";

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return accreditingBodies.map((b) => ({ slug: b.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const b = getAccreditingBody((await params).slug);
  return b ? { title: `${b.name} accreditation`, description: b.summary } : {};
}

export default async function AccreditingBodyPage({ params }: Props) {
  const b = getAccreditingBody((await params).slug);
  if (!b) notFound();
  const counselors = (await getCounselors()).filter((c) => c.church && b.churchSlugs.includes(c.church.slug));
  const updated = new Date(`${b.updated}T12:00:00Z`).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

  return (
    <main className="mx-auto flex w-full max-w-[1080px] flex-col gap-8 px-4 py-6 md:px-8 md:py-10">
      <Link href="/accreditation" className="inline-flex min-h-11 items-center self-start text-sm font-semibold">
        <ChevronLeft size={16} strokeWidth={1.8} aria-hidden="true" />
        All accreditation
      </Link>

      <header className="flex flex-col gap-3">
        <span className="label-overline">{b.kind === "church" ? "Church" : "Denomination"} accreditation</span>
        <h1 className="m-0 font-display text-[36px] leading-[1.08] md:text-[48px]">{b.name}</h1>
        <span className="text-base text-slate-600">
          {b.tradition} · {b.location}
        </span>
        <p className="m-0 max-w-[720px] text-lg leading-[1.55]">{b.summary}</p>
        <div>
          <Badge>{b.credentialName}</Badge>
        </div>
      </header>

      <section aria-labelledby="req" className="flex flex-col gap-4">
          <h2 id="req" className="m-0 font-display text-[28px] leading-[34px]">
            Requirements
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {b.requirements.map((g) => (
              <Card key={g.title} as="section" padding="compact" className="flex flex-col gap-3">
                <h3 className="m-0 text-lg font-semibold">{g.title}</h3>
                <ul className="m-0 flex list-none flex-col gap-2.5 p-0">
                  {g.items.map((item) => (
                    <li key={item} className="flex gap-2.5 text-[15px] leading-[1.5]">
                      <Check size={18} strokeWidth={1.8} className="mt-0.5 flex-none text-sage-700" aria-hidden="true" />
                      {item}
                    </li>
                  ))}
                </ul>
              </Card>
            ))}
          </div>
          <p className="m-0 text-[13px] text-slate-600">
            Set by {b.name}. FaithWellness publishes these as provided. Last updated {updated}.
          </p>
      </section>

      <div className="grid gap-4 sm:grid-cols-2 md:gap-6">
        <Card as="section" aria-labelledby="renewal" padding="compact" className="flex gap-3.5">
          <CalendarClock size={22} strokeWidth={1.8} className="mt-1 flex-none text-peach-700" aria-hidden="true" />
          <div className="flex flex-col gap-1.5">
            <h2 id="renewal" className="m-0 font-display text-[22px] leading-7">
              Renewal
            </h2>
            <p className="m-0 text-[15px] leading-normal text-slate-600">{b.renewal}</p>
          </div>
        </Card>
        <Card as="section" aria-labelledby="apply" padding="compact" className="flex gap-3.5">
          <ClipboardList size={22} strokeWidth={1.8} className="mt-1 flex-none text-peach-700" aria-hidden="true" />
          <div className="flex flex-col gap-1.5">
            <h2 id="apply" className="m-0 font-display text-[22px] leading-7">
              How counselors apply
            </h2>
            <p className="m-0 text-[15px] leading-normal text-slate-600">{b.howToApply}</p>
          </div>
        </Card>
      </div>

      <section aria-labelledby="accredited" className="flex flex-col gap-4">
        <h2 id="accredited" className="m-0 font-display text-[28px] leading-[34px]">
          Accredited counselors on FaithWellness
        </h2>
        {counselors.length === 0 ? (
          <p className="m-0 text-slate-600">None listed yet.</p>
        ) : (
          <ul className="m-0 grid list-none grid-cols-[repeat(auto-fill,minmax(min(100%,300px),1fr))] gap-4 p-0">
            {counselors.map((c) => (
              <li key={c.slug}>
                <Link
                  href={`/counselors/${c.slug}`}
                  className="flex items-center gap-3.5 rounded-lg border border-border-warm bg-white p-4 text-slate-900! no-underline shadow-card hover:shadow-raised"
                >
                  <Avatar name={c.name} src={c.avatarUrl} tint={c.avatarTint} size={56} />
                  <span className="flex min-w-0 flex-col">
                    <b className="truncate text-base">{c.name}</b>
                    <span className="truncate text-sm text-slate-600">{c.title}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <CrisisNotice />
    </main>
  );
}
