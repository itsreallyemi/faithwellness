import type { Metadata } from "next";
import { CircleAlert } from "lucide-react";
import { CounselorCard } from "@/components/CounselorCard";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { CrisisNotice } from "@/components/ui/CrisisNotice";
import { Logo } from "@/components/ui/Logo";
import { getCounselors, getFocusAreas } from "@/lib/counselors";
import { filterCounselors, parseFilters } from "@/lib/directory";
import { ChipDemo } from "./ChipDemo";

export const metadata: Metadata = { title: "Style guide" };

const peach = [
  ["peach-50", "#FFF4EF"],
  ["peach-100", "#FFE9DF"],
  ["peach-200", "#FFD8C8"],
  ["peach-400", "#FF9C7F"],
  ["peach-500", "#FF7A59"],
  ["peach-700", "#B34A2A"],
  ["peach-800", "#8A3A20"],
];
const neutrals = [
  ["cream", "#FAF7F2"],
  ["cream-200", "#F3EEE6"],
  ["border", "#E2E8F0"],
  ["slate-500", "#5A6476"],
  ["slate-900", "#2D3748"],
  ["sage-700", "#2F6B4F"],
  ["sage-100", "#E3F1E8"],
];

function Swatches({ colors }: { colors: string[][] }) {
  return (
    <div className="grid grid-cols-4 gap-2.5 sm:grid-cols-7">
      {colors.map(([name, hex]) => (
        <div key={name} className="flex flex-col gap-1.5">
          <div className="h-16 rounded-md border border-black/5" style={{ background: hex }} />
          <b className="text-xs">{name}</b>
          <span className="text-xs text-slate-600">{hex}</span>
        </div>
      ))}
    </div>
  );
}

function Section({ title, note, children }: { title: string; note?: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="m-0 font-display text-[28px] leading-[34px]">{title}</h2>
        {note && <span className="text-[13px] text-slate-500">{note}</span>}
      </div>
      {children}
    </section>
  );
}

export default async function StyleguidePage() {
  const [all, focusAreas] = await Promise.all([getCounselors(), getFocusAreas()]);
  const counselors = filterCounselors(all, parseFilters({}));
  const focusLabels = Object.fromEntries(focusAreas.map((a) => [a.slug, a.label]));
  return (
    <div className="mx-auto flex max-w-[1280px] flex-col gap-14 px-4 py-10 sm:px-8 md:py-[72px]">
      <header className="flex flex-col gap-2.5">
        <Logo />
        <h1 className="m-0 font-display text-[40px] leading-[1.05] tracking-[-0.01em] md:text-[56px]">
          Design system &amp; core components
        </h1>
        <p className="m-0 max-w-[720px] text-[17px] leading-[1.55] text-slate-600">
          Warm, quiet, trustworthy. Generous space, large rounded cards and a serif voice for moments of care;
          a clean sans for everything you act on.
        </p>
      </header>

      <div className="grid gap-8 lg:grid-cols-[1.35fr_1fr]">
        <Card className="flex flex-col gap-5">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="m-0 font-display text-[26px]">Color</h2>
            <span className="text-[13px] text-slate-500">Contrast checked against WCAG AA</span>
          </div>
          <span className="label-overline">Peach — primary</span>
          <Swatches colors={peach} />
          <span className="label-overline">Neutrals &amp; semantic</span>
          <Swatches colors={neutrals} />
          <div className="grid gap-3 text-[13px] leading-normal sm:grid-cols-3">
            <div className="rounded-md bg-peach-50 p-3.5">
              <b>Primary button</b>
              <br />
              peach-500 fill, slate-900 label · 4.7:1
            </div>
            <div className="rounded-md bg-peach-50 p-3.5">
              <b>Links &amp; active text</b>
              <br />
              peach-700 on cream · 5.0:1
            </div>
            <div className="rounded-md bg-peach-50 p-3.5">
              <b>Never</b>
              <br />
              white text on peach-500 · 2.6:1 fails
            </div>
          </div>
        </Card>

        <Card className="flex flex-col gap-3.5">
          <h2 className="m-0 mb-1 font-display text-[26px]">Typography</h2>
          {[
            [<span key="d" className="font-display text-[44px] leading-[48px]">Find steady care</span>, "Display · Fraunces 500 · 44/48"],
            [<span key="h2" className="font-display text-[28px] leading-[34px]">Counselor profile</span>, "H2 · Fraunces 500 · 28/34"],
            [<span key="h3" className="text-xl leading-7 font-semibold">Upcoming sessions</span>, "H3 · Jakarta 600 · 20/28"],
            [<span key="b">Body copy reads at 16 on 26.</span>, "Body · Jakarta 400 · 16/26"],
            [<span key="l" className="label-overline">Overline label</span>, "Label · Jakarta 700 · 12 / +8%"],
          ].map(([sample, label], i, all) => (
            <div
              key={label as string}
              className={`flex flex-wrap items-baseline justify-between gap-2 ${i < all.length - 1 ? "border-b border-divider pb-2.5" : ""}`}
            >
              {sample}
              <span className="text-xs text-slate-500">{label}</span>
            </div>
          ))}
        </Card>
      </div>

      <Section title="Buttons" note="Peach fill always takes slate text · min height 44px">
        <Card className="flex flex-wrap items-center gap-3">
          <Button>Search</Button>
          <Button size="lg">Book 60 min</Button>
          <Button variant="secondary">Join as a counselor</Button>
          <Button variant="secondary" size="lg">Book 30 min</Button>
          <Button variant="link">Send a message first</Button>
          <Button disabled>Disabled</Button>
        </Card>
      </Section>

      <Section title="Badges & filter chips">
        <Card className="flex flex-col gap-6">
          <div className="flex flex-col gap-2.5">
            <span className="label-overline">Credentials</span>
            <div className="flex flex-wrap gap-2">
              <Badge>AACC Certified</Badge>
              <Badge>M.Div.</Badge>
              <Badge>Trauma-informed</Badge>
              <Badge>Connected</Badge>
            </div>
          </div>
          <div className="flex flex-col gap-2.5">
            <span className="label-overline">Tags</span>
            <div className="flex flex-wrap gap-1.5">
              <Badge variant="tag">Marriage</Badge>
              <Badge variant="tag">Trauma</Badge>
              <Badge variant="tag">Non-denominational</Badge>
            </div>
          </div>
          <div className="flex flex-col gap-2.5">
            <span className="label-overline">Counseling focus (toggle them)</span>
            <ChipDemo />
          </div>
        </Card>
      </Section>

      <Section title="Avatars" note="Rounded square, radius ≈ 30% · initials until a photo is uploaded">
        <Card className="flex flex-wrap items-end gap-6">
          <Avatar name="Rev. Ruth Okafor" size={120} />
          <Avatar name="Daniela Mercado, LMFT" size={88} tint="#F3EEE6" />
          <Avatar name="Sarah Park, LPC" size={64} tint="#E3F1E8" />
          <Avatar name="Pastor James Whitfield" size={44} tint="#FFD8C8" />
        </Card>
      </Section>

      <Section title="Counselor cards" note="Directory results grid">
        <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,360px),1fr))] gap-6">
          {counselors.map((c) => (
            <CounselorCard key={c.slug} counselor={c} nextOpening={c.nextOpening} focusLabels={focusLabels} />
          ))}
        </div>
      </Section>

      <Section title="Notices">
        <CrisisNotice />
        <div className="flex items-start gap-2.5 rounded-md bg-peach-50 px-3.5 py-3 text-[13px] leading-normal">
          <CircleAlert size={18} strokeWidth={1.8} className="mt-px flex-none text-peach-700" aria-hidden="true" />
          <span>A 15-minute rest buffer is always added after each session. It can&rsquo;t be turned off.</span>
        </div>
      </Section>
    </div>
  );
}
