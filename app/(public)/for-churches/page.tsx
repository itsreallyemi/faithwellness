import type { Metadata } from "next";
import Link from "next/link";
import {
  BadgeCheck,
  Building2,
  ChevronRight,
  EyeOff,
  Gift,
  KeyRound,
  Network,
  RefreshCw,
  ScrollText,
  ShieldCheck,
  UserCheck,
} from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { accreditingBodies } from "@/lib/accreditation";
import { getCounselors } from "@/lib/counselors";
import { RegisterForm } from "./RegisterForm";

export const metadata: Metadata = {
  title: "For churches",
  description:
    "Join the FaithWellness network, publish your accreditation program, and give your members free care from your own counselors.",
};

const pillars = [
  {
    icon: Network,
    title: "Join the network",
    body: "Stand alongside churches and denominations who believe care for the hurting is part of the gospel, not an extra.",
  },
  {
    icon: ScrollText,
    title: "Register your accreditation program",
    body: "Publish your standard for training, classes, ministry service, supervision, character and safeguarding. Your counselors carry your name.",
  },
  {
    icon: Gift,
    title: "Free care for your members",
    body: "Members book sessions with your counselors at no cost. A benefit only your congregation receives.",
  },
];

const accreditationPoints = [
  ["Your standard, your page", "Training, classes, ministry service, supervision, character and faith, safeguarding, renewal and how to apply, in your own words."],
  ["You accredit, we confirm", "You decide who is accredited. We check with you before any counselor’s profile goes live."],
  ["Manage your counselors", "Add newly accredited counselors, set renewal dates, and remove a badge when an accreditation lapses."],
  ["Recognized beyond your walls", "People choosing a counselor can read exactly what your accreditation means and trust it."],
];

const memberSteps = [
  { icon: KeyRound, title: "Invite your members", body: "Share a private member link or code from your bulletin, app or small groups." },
  { icon: UserCheck, title: "You approve each member", body: "They open your link or enter your code to ask for access. You confirm they’re a member in your church dashboard." },
  { icon: Gift, title: "Sessions are free", body: "Members see “Free for members” on your counselors’ times and book like anyone else, with no charge." },
  { icon: RefreshCw, title: "Re-confirm once a year", body: "People join, move on and stop qualifying, so memberships last a year. We remind you 30 days before; re-confirm with one click, or let it lapse. You can also end one at any time." },
];

const steps = [
  { title: "Register your church", body: "Tell us about your church or denomination and who will manage it." },
  { title: "Publish your accreditation program", body: "Add your requirements. We review them for clarity and publish your page." },
  { title: "Accredit your counselors", body: "Invite pastors, lay counselors and clinicians you’ve accredited to join." },
  { title: "Turn on member care", body: "Choose which counselors offer free sessions to members, and how many hours." },
  { title: "Invite your congregation", body: "Share your member link. Members book privately whenever they need to." },
];

const faqs = [
  {
    q: "Do we need our own accreditation program?",
    a: "To accredit counselors, yes. If you don’t have one yet, you can publish a simple first version and grow it, or work under your denomination’s standard.",
  },
  {
    q: "Is member care really free for members?",
    a: "Yes, for members you’ve approved. Your church decides how its counselors are supported, for example as staff, volunteers or with a care fund.",
  },
  {
    q: "What can our church see about members who book?",
    a: "You see who has asked for member access, so you can approve them. After that, only totals, such as how many member sessions took place this month. Never who booked, when, or anything said in a session or message.",
  },
  {
    q: "How long does a membership last?",
    a: "One year from when you approve it. Thirty days before, your dashboard lists who is due so you can re-confirm them. If you don’t, the membership expires and new sessions use the counselor’s usual fee.",
  },
  {
    q: "What happens when someone stops being a member?",
    a: "End their membership in your dashboard. New sessions use the counselor’s usual fee, and anything already booked stays free so no one is caught out mid-care.",
  },
  {
    q: "Can non-members book our counselors?",
    a: "Yes, if your counselors choose to. They pay the counselor’s usual fee, which helps your ministry reach people outside your church.",
  },
  {
    q: "Can a denomination register for all its churches?",
    a: "Yes. A denomination can publish one shared standard and let each member church nominate counselors and offer member care.",
  },
  {
    q: "What does it cost a church to join?",
    a: "To be decided before launch.",
  },
];

export default async function ForChurchesPage() {
  const all = await getCounselors();
  const ruth = all.find((c) => c.slug === "ruth-okafor");
  const james = all.find((c) => c.slug === "james-whitfield");

  return (
    <main className="flex w-full flex-col">
      {/* Hero */}
      <section className="mx-auto flex w-full max-w-[1280px] flex-col gap-5 px-4 pt-10 pb-12 md:px-8 md:pt-16 md:pb-16">
        <span className="label-overline text-peach-700!">For churches and denominations</span>
        <h1 className="m-0 max-w-[920px] font-display text-[38px] leading-[1.06] tracking-[-0.01em] md:text-[58px]">
          Care for your people beyond Sunday morning.
        </h1>
        <p className="m-0 max-w-[700px] text-lg leading-[1.55] text-slate-600">
          Join a network of churches who share the work of caring for the hurting. Register your accreditation program,
          send your counselors out with your blessing, and give your members free sessions with people they can trust.
        </p>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button href="#register" size="lg">
            Register your church
          </Button>
          <Button href="/accreditation" variant="secondary" size="lg">
            See how accreditation works
          </Button>
        </div>
      </section>

      {/* Three pillars */}
      <section aria-label="What joining means" className="mx-auto w-full max-w-[1280px] px-4 pb-14 md:px-8 md:pb-20">
        <ul className="m-0 grid list-none gap-4 p-0 md:grid-cols-3 md:gap-6">
          {pillars.map((p) => (
            <li key={p.title}>
              <Card padding="compact" className="flex h-full flex-col gap-3">
                <span className="flex size-11 items-center justify-center rounded-md bg-peach-100">
                  <p.icon size={22} strokeWidth={1.8} className="text-peach-700" aria-hidden="true" />
                </span>
                <h2 className="m-0 text-lg leading-6 font-semibold">{p.title}</h2>
                <p className="m-0 text-[15px] leading-[1.6] text-slate-600">{p.body}</p>
              </Card>
            </li>
          ))}
        </ul>
      </section>

      {/* Why */}
      <section aria-labelledby="why" className="border-y border-border-warm bg-white">
        <div className="mx-auto grid w-full max-w-[1280px] gap-10 px-4 py-14 md:px-8 md:py-20 lg:grid-cols-[1.1fr_1fr] lg:items-center lg:gap-16">
          <div className="flex flex-col gap-5">
            <span className="label-overline">Why it matters</span>
            <h2 id="why" className="m-0 font-display text-[30px] leading-[1.15] md:text-[40px]">
              Your pastors can&rsquo;t carry every burden alone
            </h2>
            <p className="m-0 text-[17px] leading-[1.7]">
              Every congregation holds marriages under strain, grief that lingers, and wounds people are afraid to name.
              Many members never ask for help because the waiting list is long, the cost is high, or it feels too close
              to home to tell their own pastor.
            </p>
            <p className="m-0 text-[17px] leading-[1.7]">
              FaithWellness lets your church say yes to them. Your accredited counselors become available by private
              video, free for your members, so no one in your family of faith has to struggle in silence.
            </p>
          </div>
          <figure className="m-0 flex flex-col gap-4 rounded-xl bg-peach-50 p-7 md:p-10">
            <blockquote className="m-0 font-display text-[26px] leading-[1.35] italic md:text-[32px]">
              &ldquo;Therefore encourage one another and build each other up, just as in fact you are doing.&rdquo;
            </blockquote>
            <figcaption className="text-sm text-slate-600">1 Thessalonians 5:11</figcaption>
          </figure>
        </div>
      </section>

      {/* Accreditation program */}
      <section aria-labelledby="program" className="mx-auto grid w-full max-w-[1280px] grid-cols-[minmax(0,1fr)] gap-10 px-4 py-14 md:px-8 md:py-20 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-16">
        <div className="flex flex-col gap-5">
          <span className="label-overline">Register your accreditation program</span>
          <h2 id="program" className="m-0 font-display text-[30px] leading-[1.15] md:text-[40px]">
            Your counselors go out under your name
          </h2>
          <p className="m-0 text-[17px] leading-[1.6] text-slate-600">
            FaithWellness doesn&rsquo;t accredit anyone. Churches and denominations do. Your program gets its own public
            page, so everyone can see what your accreditation stands for.
          </p>
          <ul className="m-0 flex list-none flex-col gap-4 p-0">
            {accreditationPoints.map(([title, body]) => (
              <li key={title} className="flex gap-3.5">
                <BadgeCheck size={22} strokeWidth={1.8} className="mt-0.5 flex-none text-sage-700" aria-hidden="true" />
                <div className="flex flex-col gap-0.5">
                  <b>{title}</b>
                  <span className="text-[15px] leading-[1.55] text-slate-600">{body}</span>
                </div>
              </li>
            ))}
          </ul>
        </div>
        <div className="flex flex-col gap-3">
          <span className="label-overline">Programs already published</span>
          <ul className="m-0 flex list-none flex-col gap-3 p-0">
            {accreditingBodies.map((b) => (
              <li key={b.slug}>
                <Link
                  href={`/accreditation/${b.slug}`}
                  className="flex items-center gap-4 rounded-lg border border-border-warm bg-white p-4 text-slate-900! no-underline shadow-card hover:shadow-raised"
                >
                  <span className="flex size-11 flex-none items-center justify-center rounded-md bg-cream-200">
                    <Building2 size={20} strokeWidth={1.8} aria-hidden="true" />
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col">
                    <b className="text-[15px]">{b.name}</b>
                    <span className="truncate text-[13px] text-slate-600">{b.credentialName}</span>
                  </span>
                  <ChevronRight size={18} strokeWidth={1.8} className="flex-none text-slate-500" aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ul>
          <p className="m-0 text-[13px] text-slate-600">Prototype: these are fictional sample programs.</p>
        </div>
      </section>

      {/* Member care */}
      <section aria-labelledby="members" className="bg-sage-100/60">
        <div className="mx-auto grid w-full max-w-[1280px] gap-10 px-4 py-14 md:px-8 md:py-20 lg:grid-cols-[1fr_420px] lg:items-center lg:gap-16">
          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-3">
              <span className="label-overline text-sage-700!">Members only</span>
              <h2 id="members" className="m-0 font-display text-[30px] leading-[1.15] md:text-[40px]">
                Free care, as a gift to your congregation
              </h2>
              <p className="m-0 text-[17px] leading-[1.6] text-slate-600">
                Your members book your counselors through FaithWellness at no cost. It&rsquo;s a benefit of belonging to
                your church family, and a simple way to show them they&rsquo;re cared for.
              </p>
            </div>
            <ol className="m-0 flex list-none flex-col gap-4 p-0">
              {memberSteps.map((s, i) => (
                <li key={s.title} className="flex gap-4">
                  <span className="flex size-10 flex-none items-center justify-center rounded-pill bg-white font-bold text-sage-700">
                    {i + 1}
                  </span>
                  <div className="flex flex-col gap-0.5">
                    <b>{s.title}</b>
                    <span className="text-[15px] leading-[1.55] text-slate-600">{s.body}</span>
                  </div>
                </li>
              ))}
            </ol>
            <div className="flex flex-col gap-2 rounded-md border border-dashed border-peach-400 bg-peach-50 px-4 py-3 text-sm text-peach-800">
              <span>Prototype: try it as a member of Grace Fellowship.</span>
              <Link href="/join/grace-fellowship?code=GRACE2026" className="inline-flex min-h-11 items-center self-start font-semibold">
                Open a sample member link
              </Link>
            </div>
            <div className="flex gap-3 rounded-lg bg-white p-5">
              <EyeOff size={22} strokeWidth={1.8} className="mt-0.5 flex-none text-sage-700" aria-hidden="true" />
              <div className="flex flex-col gap-0.5">
                <b>Private, even from the church</b>
                <span className="text-[15px] leading-[1.55] text-slate-600">
                  You see who your members are so you can approve them. You never see who booked, when, or what was
                  shared. Only totals.
                </span>
              </div>
            </div>
          </div>

          {/* What a member sees */}
          <figure className="m-0 flex flex-col gap-3">
            <Card className="flex flex-col gap-4">
              <div className="flex items-center justify-between gap-3">
                <span className="label-overline">Grace Fellowship member care</span>
                <Badge className="flex-none whitespace-nowrap">Verified member</Badge>
              </div>
              <p className="m-0 font-display text-xl leading-7">Book free with your church&rsquo;s counselors</p>
              <ul className="m-0 flex list-none flex-col gap-3 p-0">
                {[ruth, james].filter(Boolean).map((c) => (
                  <li key={c!.slug} className="flex items-center gap-3 rounded-md border border-border p-3">
                    <Avatar name={c!.name} src={c!.avatarUrl} tint={c!.avatarTint} size={48} />
                    <span className="flex min-w-0 flex-1 flex-col">
                      <b className="truncate text-[15px]">{c!.name}</b>
                      <span className="truncate text-[13px] text-slate-600">{c!.title}</span>
                    </span>
                    <span className="flex flex-col items-end">
                      <span className="text-[13px] text-slate-500 line-through">${Math.round(c!.fee60Cents / 100)}</span>
                      <b className="text-sm text-sage-700">Free</b>
                    </span>
                  </li>
                ))}
              </ul>
              <span className="text-[13px] text-slate-600">60 min sessions · Google Meet · booked privately</span>
            </Card>
            <figcaption className="text-center text-[13px] text-slate-600">What a verified member sees</figcaption>
          </figure>
        </div>
      </section>

      {/* Steps */}
      <section aria-labelledby="steps" className="mx-auto flex w-full max-w-[1280px] flex-col gap-6 px-4 py-14 md:px-8 md:py-20">
        <h2 id="steps" className="m-0 font-display text-[30px] leading-[1.15] md:text-[40px]">
          How your church joins
        </h2>
        <ol className="m-0 grid list-none gap-4 p-0 sm:grid-cols-2 md:gap-6 lg:grid-cols-5">
          {steps.map((s, i) => (
            <li key={s.title} className="flex flex-col gap-3 rounded-lg border border-border-warm bg-white p-5 shadow-card">
              <span className="flex size-10 items-center justify-center rounded-pill bg-peach-200 font-bold text-peach-800">{i + 1}</span>
              <h3 className="m-0 text-base font-semibold">{s.title}</h3>
              <p className="m-0 text-[15px] leading-[1.55] text-slate-600">{s.body}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* Pastor quote + denominations */}
      <section className="border-y border-border-warm bg-white">
        <div className="mx-auto grid w-full max-w-[1280px] gap-8 px-4 py-14 md:px-8 md:py-20 lg:grid-cols-2 lg:gap-14">
          {james && (
            <figure className="m-0 flex flex-col gap-5">
              <blockquote className="m-0 font-display text-[24px] leading-[1.4] md:text-[28px]">
                &ldquo;Our members used to wait weeks to see someone. Now a widow in our congregation can talk to someone
                who prays with her the same week, and it costs her nothing.&rdquo;
              </blockquote>
              <figcaption className="flex items-center gap-3">
                <Avatar name={james.name} src={james.avatarUrl} tint={james.avatarTint} size={52} />
                <span className="flex flex-col">
                  <b className="text-[15px]">{james.name}</b>
                  <span className="text-[13px] text-slate-600">Care Pastor · Grace Fellowship (sample quote)</span>
                </span>
              </figcaption>
            </figure>
          )}
          <div className="flex flex-col gap-4 rounded-xl bg-cream p-7">
            <span className="flex size-11 items-center justify-center rounded-md bg-white">
              <ShieldCheck size={22} strokeWidth={1.8} className="text-peach-700" aria-hidden="true" />
            </span>
            <h2 className="m-0 font-display text-2xl leading-8">For denominations</h2>
            <p className="m-0 text-[15px] leading-[1.6] text-slate-600">
              Publish one accreditation standard for every church in your fellowship. Each church nominates its own
              counselors and chooses whether to offer member care, while your standard keeps care consistent.
            </p>
            <Link href="/accreditation/coastal-presbytery" className="inline-flex min-h-11 items-center gap-1 self-start font-semibold">
              See a sample denomination page
              <ChevronRight size={16} strokeWidth={1.8} aria-hidden="true" />
            </Link>
          </div>
        </div>
      </section>

      {/* Closing call */}
      <section aria-labelledby="call" className="bg-slate-900 text-white">
        <div className="mx-auto flex w-full max-w-[1280px] flex-col items-start gap-6 px-4 py-16 md:px-8 md:py-24">
          <h2 id="call" className="m-0 max-w-[860px] font-display text-[32px] leading-[1.12] md:text-[48px]">
            Let your church be the place people find help.
          </h2>
          <p className="m-0 max-w-[640px] text-lg leading-[1.6] text-white/85">
            Join the network, publish your standard, and open your doors a little wider for the people God has
            entrusted to you.
          </p>
          <Button href="#register" size="lg">
            Register your church
          </Button>
        </div>
      </section>

      {/* FAQ + register */}
      <section className="mx-auto grid w-full max-w-[1280px] gap-10 px-4 py-14 md:px-8 md:py-20 lg:grid-cols-2 lg:gap-14">
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
        <RegisterForm />
      </section>
    </main>
  );
}
