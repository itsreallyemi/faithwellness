import type { Metadata } from "next";
import Link from "next/link";
import {
  BadgeCheck,
  CalendarCheck,
  ChevronRight,
  Clock,
  Coffee,
  HeartHandshake,
  Lock,
  MessageCircle,
  Sprout,
  UsersRound,
  Video,
} from "lucide-react";
import { CounselorCard } from "@/components/CounselorCard";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { accreditingBodies } from "@/lib/accreditation";
import { getCounselors, getFocusAreas } from "@/lib/counselors";
import { filterCounselors, parseFilters } from "@/lib/directory";
import { ApplyForm } from "./ApplyForm";

export const metadata: Metadata = {
  title: "For counselors",
  description:
    "Offer video sessions to people who share your faith. Booking, Meet links and rest between sessions are handled for you.",
};

const relationships = [
  {
    icon: Sprout,
    title: "The same counselor, every time",
    body: "Clients book again with you, and your whole story together lives in one private thread.",
  },
  {
    icon: MessageCircle,
    title: "Stay close between sessions",
    body: "Check in after a hard week, share a verse, or answer a question before it becomes a worry.",
  },
  {
    icon: UsersRound,
    title: "Care for couples and families",
    body: "Partners can join the same call, so you can help a whole household find its way back to each other.",
  },
];

// Sample quotes from the fictional demo counselors. Replace with real ones before launch.
const stories = [
  {
    slug: "ruth-okafor",
    quote:
      "I used to only meet people who had already walked through our church doors. Now I sit with couples I would never have met, and the conversations are just as sacred.",
  },
  {
    slug: "james-whitfield",
    quote:
      "After my wife died I promised God I would never let someone grieve alone if I could help it. This lets me keep that promise beyond our own congregation.",
  },
  {
    slug: "sarah-park",
    quote:
      "Many of the people I see were hurt by a church. Finding a counselor who shares their faith and lets them set the pace is often their first step toward home.",
  },
];

const reasons = [
  {
    icon: HeartHandshake,
    title: "People who share your faith find you",
    body: "Clients search by focus, tradition and church, so the people who reach out are looking for care like yours.",
  },
  {
    icon: CalendarCheck,
    title: "Booking is handled",
    body: "Connect Google Calendar once. Clients only see times you’re truly free.",
  },
  {
    icon: Coffee,
    title: "Rest is built in",
    body: "Every session is followed by a 15-minute break that can’t be booked over, by anyone.",
  },
  {
    icon: Lock,
    title: "Private by design",
    body: "Calendar events just say “FaithWellness session.” Messages stay between you and your client.",
  },
];

const steps = [
  { title: "Apply", body: "Tell us who you are and which church or denomination accredits you." },
  { title: "We confirm your accreditation", body: "We check with your church or denomination, and verify any state license." },
  { title: "Build your profile", body: "Your story, how you bring faith into care, focus areas and fees." },
  { title: "Connect Google Calendar", body: "So clients can’t book over your other commitments, and each session gets a Meet link." },
  { title: "Set your hours", body: "Choose your weekly hours and whether you offer 30 or 60 minute sessions." },
  { title: "Go live", body: "Your profile appears in the directory and clients can book." },
];

const tools = [
  { icon: Clock, title: "Availability and session types", body: "Weekly hours, 30 and 60 minute sessions, and time off." },
  { icon: Video, title: "Google Meet links", body: "A private Meet room is created for every confirmed session." },
  { icon: MessageCircle, title: "Private messaging", body: "Answer questions before a first session and follow up after." },
  { icon: CalendarCheck, title: "Upcoming sessions", body: "One list of who’s next, shown in your time zone and theirs." },
];

const faqs = [
  {
    q: "My church isn’t listed. Can I still join?",
    a: "Yes. Ask your church or denomination to publish its requirements on FaithWellness. Until then we can’t confirm an accreditation, so your profile can’t go live.",
  },
  {
    q: "I’m licensed but not accredited by a church.",
    a: "FaithWellness is for counselors who serve through a church or denomination, so you’ll need their accreditation too. Your license appears on your profile alongside it.",
  },
  {
    q: "What does it cost to join?",
    a: "To be decided before launch. FaithWellness doesn’t take session payments yet. You arrange fees directly with clients.",
  },
  {
    q: "I’m a licensed clinician. Can clients use insurance?",
    a: "Yes. List the plans you accept on your profile and clients can choose “Use insurance” when they book, adding their plan, member ID and group number. You verify their coverage and bill the insurer through your own practice. FaithWellness doesn’t file claims.",
  },
  {
    q: "Can I pause my listing?",
    a: "Yes. Hide your profile at any time from your settings. Booked sessions stay booked.",
  },
];

export default async function ForCounselorsPage() {
  const [all, focusAreas] = await Promise.all([getCounselors(), getFocusAreas()]);
  const sample = filterCounselors(all, parseFilters({})).find((c) => c.slug === "ruth-okafor");
  const focusLabels = Object.fromEntries(focusAreas.map((a) => [a.slug, a.label]));

  return (
    <main className="flex w-full flex-col">
      {/* Hero */}
      <section className="mx-auto flex w-full max-w-[1280px] flex-col gap-5 px-4 pt-10 pb-12 md:px-8 md:pt-16 md:pb-16">
        <span className="label-overline text-peach-700!">For counselors</span>
        <h1 className="m-0 max-w-[900px] font-display text-[38px] leading-[1.06] tracking-[-0.01em] md:text-[58px]">
          Your counseling is ministry. Bring it to the people who need it.
        </h1>
        <p className="m-0 max-w-[680px] text-lg leading-[1.55] text-slate-600">
          Join pastors, lay counselors and Christian clinicians who see every session as a chance to show the love of
          God. We connect you with people looking for care rooted in faith, and take care of the scheduling so you can
          be fully present with them.
        </p>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button href="#apply" size="lg">
            Apply to join
          </Button>
          <Button href="/accreditation" variant="secondary" size="lg">
            See accreditation requirements
          </Button>
        </div>
        <p className="m-0 text-[15px] text-slate-600">
          Already on FaithWellness? <Link href="/portal" className="font-semibold">Sign in to your portal</Link>
        </p>
      </section>

      {/* Counseling as ministry */}
      <section aria-labelledby="calling" className="border-y border-border-warm bg-white">
        <div className="mx-auto grid w-full max-w-[1280px] gap-10 px-4 py-14 md:px-8 md:py-20 lg:grid-cols-[1.1fr_1fr] lg:items-center lg:gap-16">
          <div className="flex flex-col gap-5">
            <span className="label-overline">Why this matters</span>
            <h2 id="calling" className="m-0 font-display text-[30px] leading-[1.15] md:text-[40px]">
              So many people are carrying something alone
            </h2>
            <p className="m-0 text-[17px] leading-[1.7]">
              A marriage under strain. Grief that never had room. Hurt from a church that should have been safe. Many
              people want help that honors their faith, but don&rsquo;t know where to find it, or feel they can&rsquo;t ask
              their own pastor.
            </p>
            <p className="m-0 text-[17px] leading-[1.7]">
              You already know how to sit with someone in a hard season and point them gently to hope. FaithWellness
              opens that ministry to people beyond your church walls, while keeping you rooted in the church that
              accredits and supports you.
            </p>
          </div>
          <figure className="m-0 flex flex-col gap-4 rounded-xl bg-peach-50 p-7 md:p-10">
            <blockquote className="m-0 font-display text-[26px] leading-[1.35] italic md:text-[32px]">
              &ldquo;Carry each other&rsquo;s burdens, and in this way you will fulfill the law of Christ.&rdquo;
            </blockquote>
            <figcaption className="text-sm text-slate-600">Galatians 6:2</figcaption>
          </figure>
        </div>
      </section>

      {/* Relationships */}
      <section aria-labelledby="relationships" className="mx-auto flex w-full max-w-[1280px] flex-col gap-8 px-4 py-14 md:px-8 md:py-20">
        <div className="flex max-w-[720px] flex-col gap-3">
          <span className="label-overline">Relationships, not appointments</span>
          <h2 id="relationships" className="m-0 font-display text-[30px] leading-[1.15] md:text-[40px]">
            Walk with people through a whole season
          </h2>
          <p className="m-0 text-[17px] leading-[1.6] text-slate-600">
            Healing rarely happens in one hour. FaithWellness is built for care that grows over time.
          </p>
        </div>
        <ul className="m-0 grid list-none gap-4 p-0 md:grid-cols-3 md:gap-6">
          {relationships.map((r) => (
            <li key={r.title}>
              <Card padding="compact" className="flex h-full flex-col gap-3">
                <span className="flex size-11 items-center justify-center rounded-md bg-sage-100">
                  <r.icon size={22} strokeWidth={1.8} className="text-sage-700" aria-hidden="true" />
                </span>
                <h3 className="m-0 text-lg leading-6 font-semibold">{r.title}</h3>
                <p className="m-0 text-[15px] leading-[1.6] text-slate-600">{r.body}</p>
              </Card>
            </li>
          ))}
        </ul>
      </section>

      {/* Stories */}
      <section aria-labelledby="stories" className="bg-cream-200/60">
        <div className="mx-auto flex w-full max-w-[1280px] flex-col gap-8 px-4 py-14 md:px-8 md:py-20">
          <div className="flex flex-col gap-2">
            <h2 id="stories" className="m-0 font-display text-[30px] leading-[1.15] md:text-[40px]">
              In their words
            </h2>
            <p className="m-0 text-sm text-slate-600">Prototype: sample quotes from the fictional counselors in this demo.</p>
          </div>
          <ul className="m-0 grid list-none gap-4 p-0 md:grid-cols-3 md:gap-6">
            {stories.map((s) => {
              const c = all.find((x) => x.slug === s.slug);
              if (!c) return null;
              return (
                <li key={s.slug}>
                  <Card padding="compact" className="flex h-full">
                    <figure className="m-0 flex flex-1 flex-col gap-5">
                    <blockquote className="m-0 flex-1 text-[17px] leading-[1.65]">&ldquo;{s.quote}&rdquo;</blockquote>
                    <figcaption className="flex items-center gap-3">
                      <Avatar name={c.name} src={c.avatarUrl} tint={c.avatarTint} size={52} />
                      <span className="flex flex-col">
                        <b className="text-[15px]">{c.name}</b>
                        <span className="text-[13px] text-slate-600">
                          {c.title}
                          {c.church && ` · ${c.church.name}`}
                        </span>
                      </span>
                    </figcaption>
                    </figure>
                  </Card>
                </li>
              );
            })}
          </ul>
        </div>
      </section>

      {/* We handle the rest */}
      <section aria-labelledby="why" className="mx-auto flex w-full max-w-[1280px] flex-col gap-6 px-4 py-14 md:px-8 md:py-20">
        <div className="flex max-w-[720px] flex-col gap-3">
          <span className="label-overline">Less admin, more ministry</span>
          <h2 id="why" className="m-0 font-display text-[30px] leading-[1.15] md:text-[40px]">
            You care for people. We handle the rest.
          </h2>
        </div>
        <ul className="m-0 grid list-none gap-4 p-0 sm:grid-cols-2 md:gap-6 lg:grid-cols-4">
          {reasons.map((r) => (
            <li key={r.title}>
              <Card padding="compact" className="flex h-full flex-col gap-3">
                <span className="flex size-11 items-center justify-center rounded-md bg-peach-100">
                  <r.icon size={22} strokeWidth={1.8} className="text-peach-700" aria-hidden="true" />
                </span>
                <h3 className="m-0 text-lg leading-6 font-semibold">{r.title}</h3>
                <p className="m-0 text-[15px] leading-[1.6] text-slate-600">{r.body}</p>
              </Card>
            </li>
          ))}
        </ul>
      </section>

      {/* What you need */}
      <section aria-labelledby="need" className="border-y border-border-warm bg-white">
        <div className="mx-auto grid w-full max-w-[1280px] gap-8 px-4 py-14 md:px-8 md:py-20 lg:grid-cols-[1fr_1.2fr] lg:gap-14">
          <div className="flex flex-col gap-4">
            <h2 id="need" className="m-0 font-display text-[28px] leading-[34px] md:text-[34px] md:leading-[40px]">
              What you need
            </h2>
            <p className="m-0 text-[17px] leading-[1.6] text-slate-600">
              Churches and denominations accredit counselors, not FaithWellness. You need accreditation from one that
              has published its requirements here.
            </p>
            <div className="flex flex-col gap-2">
              <span className="label-overline">Accrediting churches and denominations</span>
              <ul className="m-0 flex list-none flex-wrap gap-2 p-0">
                {accreditingBodies.map((b) => (
                  <li key={b.slug}>
                    <Link
                      href={`/accreditation/${b.slug}`}
                      className="inline-flex min-h-11 items-center gap-1 rounded-pill border border-border bg-cream px-3.5 text-sm text-slate-900! no-underline hover:border-peach-400"
                    >
                      {b.name}
                      <ChevronRight size={14} strokeWidth={1.8} aria-hidden="true" />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <ul className="m-0 flex list-none flex-col gap-4 p-0">
            {[
              ["Accreditation", "From a church or denomination listed on FaithWellness. We confirm it with them."],
              ["A state license, if you’re a clinician", "LPC, LMFT, LCSW, PsyD and similar. Shown on your profile next to your accreditation."],
              ["Google Calendar", "So clients can’t book over your other commitments, and so we can add Meet links."],
              ["About 30 minutes", "To write your profile, set fees and choose your weekly hours."],
            ].map(([title, body]) => (
              <li key={title} className="flex gap-3.5">
                <BadgeCheck size={22} strokeWidth={1.8} className="mt-0.5 flex-none text-sage-700" aria-hidden="true" />
                <div className="flex flex-col gap-0.5">
                  <b className="text-base">{title}</b>
                  <span className="text-[15px] leading-[1.55] text-slate-600">{body}</span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* How joining works */}
      <section aria-labelledby="steps" className="mx-auto flex w-full max-w-[1280px] flex-col gap-6 px-4 py-14 md:px-8 md:py-20">
        <h2 id="steps" className="m-0 font-display text-[28px] leading-[34px]">
          How joining works
        </h2>
        <ol className="m-0 grid list-none gap-4 p-0 sm:grid-cols-2 md:gap-6 lg:grid-cols-3">
          {steps.map((s, i) => (
            <li key={s.title} className="flex gap-4 rounded-lg border border-border-warm bg-white p-5 shadow-card">
              <span className="flex size-10 flex-none items-center justify-center rounded-pill bg-peach-200 font-bold text-peach-800">
                {i + 1}
              </span>
              <div className="flex flex-col gap-1">
                <h3 className="m-0 text-base font-semibold">{s.title}</h3>
                <p className="m-0 text-[15px] leading-[1.55] text-slate-600">{s.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* Profile preview + tools */}
      <section aria-labelledby="profile" className="bg-peach-50">
        <div className="mx-auto grid w-full max-w-[1280px] gap-10 px-4 py-14 md:px-8 md:py-20 lg:grid-cols-[1fr_440px] lg:items-center lg:gap-16">
          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-3">
              <h2 id="profile" className="m-0 font-display text-[28px] leading-[34px] md:text-[34px] md:leading-[40px]">
                Your profile, and the tools behind it
              </h2>
              <p className="m-0 text-[17px] leading-[1.6] text-slate-600">
                Clients see your story, your credentials and when you&rsquo;re next free. You get everything you need to run
                sessions, in one place.
              </p>
            </div>
            <ul className="m-0 grid list-none gap-5 p-0 sm:grid-cols-2">
              {tools.map((t) => (
                <li key={t.title} className="flex gap-3">
                  <t.icon size={22} strokeWidth={1.8} className="mt-0.5 flex-none text-peach-700" aria-hidden="true" />
                  <div className="flex flex-col gap-0.5">
                    <b>{t.title}</b>
                    <span className="text-[15px] leading-[1.55] text-slate-600">{t.body}</span>
                  </div>
                </li>
              ))}
            </ul>
            <div className="flex flex-col gap-1 rounded-lg border border-peach-200 bg-white p-5">
              <b>You set your fees</b>
              <span className="text-[15px] leading-[1.55] text-slate-600">
                Offer 30 and 60 minute sessions at your own rates, free sessions for members, or a sliding scale.
                Your fees are never shown publicly. Clients see them only when they book, framed as supporting your
                counseling ministry. Anyone for whom the fee is a hardship can offer what they can pay, and you choose
                whether to accept.
              </span>
            </div>
          </div>
          {sample && (
            <figure className="m-0 flex flex-col gap-3">
              <CounselorCard counselor={sample} nextOpening={sample.nextOpening} focusLabels={focusLabels} />
              <figcaption className="text-center text-[13px] text-slate-600">How a profile appears in the directory</figcaption>
            </figure>
          )}
        </div>
      </section>

      {/* Closing call */}
      <section aria-labelledby="call" className="bg-slate-900 text-white">
        <div className="mx-auto flex w-full max-w-[1280px] flex-col items-start gap-6 px-4 py-16 md:px-8 md:py-24">
          <h2 id="call" className="m-0 max-w-[820px] font-display text-[32px] leading-[1.12] md:text-[48px]">
            Someone is praying for help right now. You could be part of the answer.
          </h2>
          <p className="m-0 max-w-[640px] text-lg leading-[1.6] text-white/85">
            &ldquo;Each of you should use whatever gift you have received to serve others.&rdquo;
            <span className="mt-1 block text-sm text-white/70">1 Peter 4:10</span>
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button href="#apply" size="lg">
              Apply to join
            </Button>
            <Link
              href="/accreditation"
              className="inline-flex min-h-[52px] items-center justify-center rounded-pill border-[1.5px] border-white px-7 font-semibold text-white! no-underline hover:bg-white/10"
            >
              See accreditation requirements
            </Link>
          </div>
        </div>
      </section>

      {/* FAQ + apply */}
      <section className="mx-auto grid w-full max-w-[1280px] gap-10 px-4 py-14 md:px-8 md:py-20 lg:grid-cols-[1fr_1fr] lg:gap-14">
        <div className="flex flex-col gap-4" aria-labelledby="faq">
          <h2 id="faq" className="m-0 font-display text-[28px] leading-[34px]">
            Questions
          </h2>
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
        <ApplyForm bodies={accreditingBodies.map(({ slug, name }) => ({ slug, name }))} />
      </section>
    </main>
  );
}
