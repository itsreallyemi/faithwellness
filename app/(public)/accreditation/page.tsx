import type { Metadata } from "next";
import Link from "next/link";
import { BookOpenCheck, ChevronRight, Church, ShieldCheck, Users } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { CrisisNotice } from "@/components/ui/CrisisNotice";
import { accreditingBodies, type AccreditingBody } from "@/lib/accreditation";
import { getCounselors } from "@/lib/counselors";

export const metadata: Metadata = {
  title: "Accreditation",
  description:
    "Counselors on FaithWellness are accredited by their church or denomination. See what each one requires.",
};

const steps = [
  {
    icon: Church,
    title: "A church or denomination sets the standard",
    body: "Each one decides the training, classes, ministry service, supervision, character and safeguarding its counselors need.",
  },
  {
    icon: BookOpenCheck,
    title: "The counselor meets it",
    body: "They complete the training and review, and the church or denomination accredits them.",
  },
  {
    icon: ShieldCheck,
    title: "We publish the requirements and check the accreditation",
    body: "FaithWellness lists each standard here and confirms the accreditation with the issuer before a profile goes live.",
  },
];

const faqs = [
  {
    q: "Does FaithWellness accredit counselors?",
    a: "No. Churches and denominations do. We publish their requirements so you can see what an accreditation means, and we confirm it with them.",
  },
  {
    q: "Is church accreditation the same as a state license?",
    a: "No. A state license (such as LPC, LMFT or PsyD) is separate. Licensed clinicians show their license on their profile as well as any church accreditation.",
  },
  {
    q: "Why do requirements differ between churches?",
    a: "Each tradition shapes care in its own way. Comparing them side by side helps you choose a counselor whose training fits what you need.",
  },
  {
    q: "What if an accreditation lapses?",
    a: "Each accreditation has a renewal date. If it isn’t renewed, the badge comes off the counselor’s profile.",
  },
];

export default async function AccreditationPage() {
  const counselors = await getCounselors();
  const countFor = (b: AccreditingBody) => counselors.filter((c) => c.church && b.churchSlugs.includes(c.church.slug)).length;
  const groups = [
    { title: "Denominations", bodies: accreditingBodies.filter((b) => b.kind === "denomination") },
    { title: "Churches", bodies: accreditingBodies.filter((b) => b.kind === "church") },
  ];

  return (
    <main className="mx-auto flex w-full max-w-[1280px] flex-col gap-12 px-4 py-10 md:gap-16 md:px-8 md:py-14">
      <header className="flex max-w-[820px] flex-col gap-4">
        <span className="label-overline text-peach-700!">Accreditation</span>
        <h1 className="m-0 font-display text-[36px] leading-[1.08] tracking-[-0.01em] md:text-[52px]">
          Accredited by the churches who know them
        </h1>
        <p className="m-0 text-lg leading-[1.55] text-slate-600">
          Every counselor on FaithWellness is accredited by their church or denomination, not by us. Here you can see
          exactly what each one requires, so a badge on a profile always means something you can check.
        </p>
        <p className="m-0 rounded-md border border-dashed border-peach-400 bg-peach-50 px-4 py-3 text-sm text-peach-800">
          Prototype: the churches, denominations and requirements below are fictional samples.
        </p>
      </header>

      <section aria-labelledby="how" className="flex flex-col gap-6">
        <h2 id="how" className="m-0 font-display text-[28px] leading-[34px]">
          How it works
        </h2>
        <ol className="m-0 grid list-none gap-4 p-0 md:grid-cols-3 md:gap-6">
          {steps.map((s, i) => (
            <li key={s.title}>
              <Card padding="compact" className="flex h-full flex-col gap-3">
                <div className="flex items-center gap-3">
                  <span className="flex size-11 items-center justify-center rounded-md bg-peach-100">
                    <s.icon size={22} strokeWidth={1.8} className="text-peach-700" aria-hidden="true" />
                  </span>
                  <span className="label-overline">Step {i + 1}</span>
                </div>
                <h3 className="m-0 text-lg leading-6 font-semibold">{s.title}</h3>
                <p className="m-0 text-[15px] leading-[1.6] text-slate-600">{s.body}</p>
              </Card>
            </li>
          ))}
        </ol>
      </section>

      {groups.map((g) => (
        <section key={g.title} aria-labelledby={`g-${g.title}`} className="flex flex-col gap-5">
          <h2 id={`g-${g.title}`} className="m-0 font-display text-[28px] leading-[34px]">
            {g.title}
          </h2>
          <ul className="m-0 grid list-none grid-cols-[repeat(auto-fill,minmax(min(100%,340px),1fr))] gap-4 p-0 md:gap-6">
            {g.bodies.map((b) => {
              const n = countFor(b);
              return (
                <li key={b.slug}>
                  <Link
                    href={`/accreditation/${b.slug}`}
                    className="flex h-full flex-col gap-3 rounded-[24px] border border-border-warm bg-white p-6 text-slate-900! no-underline shadow-card transition-shadow hover:shadow-raised md:rounded-xl"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex flex-col gap-0.5">
                        <span className="font-display text-[22px] leading-7">{b.name}</span>
                        <span className="text-sm text-slate-600">
                          {b.tradition} · {b.location}
                        </span>
                      </div>
                      <ChevronRight size={20} strokeWidth={1.8} className="mt-1 flex-none text-slate-500" aria-hidden="true" />
                    </div>
                    <p className="m-0 text-[15px] leading-[1.6]">{b.summary}</p>
                    <div className="mt-auto flex flex-wrap items-center gap-2 pt-1">
                      <Badge>{b.credentialName}</Badge>
                      <span className="flex items-center gap-1.5 text-[13px] text-slate-600">
                        <Users size={15} strokeWidth={1.8} aria-hidden="true" />
                        {n} {n === 1 ? "counselor" : "counselors"} listed
                      </span>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      ))}

      <section aria-labelledby="faq" className="grid gap-6 md:grid-cols-[1fr_1.4fr] md:gap-10">
        <div className="flex flex-col gap-3">
          <h2 id="faq" className="m-0 font-display text-[28px] leading-[34px]">
            Questions
          </h2>
          <p className="m-0 text-slate-600">Does your church or denomination accredit counselors?</p>
          <div>
            <Button variant="secondary" href="/for-churches">
              List your requirements
            </Button>
          </div>
        </div>
        <div className="flex flex-col gap-3">
          {faqs.map((f) => (
            <details key={f.q} className="group rounded-lg border border-border-warm bg-white px-5 shadow-card">
              <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 text-base font-semibold [&::-webkit-details-marker]:hidden">
                {f.q}
                <ChevronRight size={18} strokeWidth={1.8} className="flex-none transition-transform group-open:rotate-90" aria-hidden="true" />
              </summary>
              <p className="m-0 pb-5 text-[15px] leading-[1.6] text-slate-600">{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      <CrisisNotice />
    </main>
  );
}
