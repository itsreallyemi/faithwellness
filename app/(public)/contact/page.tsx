import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight, Church, Mail, UserRound } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { CrisisNotice } from "@/components/ui/CrisisNotice";
import { contactEmail } from "@/lib/site";

export const metadata: Metadata = {
  title: "Contact",
  description: "Questions about FaithWellness, your account or your privacy? Email us.",
};

const topics = [
  "Questions about using FaithWellness or booking a session",
  "Help with your account or signing in",
  "Privacy requests, such as a copy of your information or deleting it",
  "Something on the site that isn’t working",
];

const elsewhere = [
  {
    icon: UserRound,
    title: "Counselors and life coaches",
    body: "Apply to be listed, or read how accreditation works.",
    href: "/for-counselors",
  },
  {
    icon: Church,
    title: "Churches and denominations",
    body: "Offer member care, or list your accreditation standard.",
    href: "/for-churches",
  },
];

export default function ContactPage() {
  return (
    <main className="mx-auto flex w-full max-w-[760px] flex-col gap-10 px-4 py-10 md:px-8 md:py-14">
      <header className="flex flex-col gap-4">
        <span className="label-overline text-peach-700!">Contact</span>
        <h1 className="m-0 font-display text-[36px] leading-[1.08] tracking-[-0.01em] md:text-[48px]">
          We&rsquo;re glad to help
        </h1>
        <p className="m-0 text-lg leading-[1.55] text-slate-600">
          Email us and a person from FaithWellness will reply. For anything about your sessions, your counselor is
          usually the quickest to answer. You can <Link href="/messages">message them</Link> any time.
        </p>
      </header>

      <CrisisNotice />

      <Card className="flex flex-col gap-5">
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <span className="flex size-12 flex-none items-center justify-center rounded-md bg-peach-100">
              <Mail size={22} strokeWidth={1.8} className="text-peach-700" aria-hidden="true" />
            </span>
            <h2 className="m-0 text-lg leading-6 font-semibold">Email</h2>
          </div>
          {/* Full card width, and allowed to wrap after the @, so the address never splits mid-word on phones. */}
          <a href={`mailto:${contactEmail}`} className="text-lg font-semibold">
            {contactEmail.split("@")[0]}@<wbr />
            {contactEmail.split("@")[1]}
          </a>
        </div>
        <div className="flex flex-col gap-2">
          <p className="m-0 text-[15px] text-slate-600">Write to us about:</p>
          <ul className="m-0 list-disc pl-5 text-[15px] leading-[1.6] [&_li+li]:mt-1.5">
            {topics.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
        </div>
        <p className="m-0 text-sm leading-normal text-slate-600">
          Please don&rsquo;t include details about your health or counseling in an email. Your counselor is the right
          person for those, through Messages.
        </p>
        <div>
          <Button href={`mailto:${contactEmail}`} size="lg">
            Email FaithWellness
          </Button>
        </div>
      </Card>

      <section aria-labelledby="elsewhere" className="flex flex-col gap-4">
        <h2 id="elsewhere" className="m-0 font-display text-[24px] leading-[30px]">
          Joining FaithWellness?
        </h2>
        <ul className="m-0 grid list-none gap-4 p-0 md:grid-cols-2">
          {elsewhere.map((e) => (
            <li key={e.href}>
              <Link
                href={e.href}
                className="flex h-full items-start gap-3 rounded-[24px] border border-border-warm bg-white p-5 text-slate-900! no-underline shadow-card transition-shadow hover:shadow-raised md:rounded-xl"
              >
                <span className="flex size-11 flex-none items-center justify-center rounded-md bg-peach-100">
                  <e.icon size={20} strokeWidth={1.8} className="text-peach-700" aria-hidden="true" />
                </span>
                <span className="flex min-w-0 flex-1 flex-col gap-1">
                  <b className="text-base">{e.title}</b>
                  <span className="text-[15px] leading-normal text-slate-600">{e.body}</span>
                </span>
                <ChevronRight size={20} strokeWidth={1.8} className="mt-0.5 flex-none text-slate-500" aria-hidden="true" />
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
