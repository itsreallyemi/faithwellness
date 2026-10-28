"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Copy, EyeOff, Search, UserPlus } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { sampleRoster, sampleSessionsThisMonth } from "@/lib/prototype/church-admin";
import {
  isUpForRenewal,
  membershipStatus,
  proto,
  useProto,
  type ProtoMembership,
  type ProtoRosterMember,
  type ProtoState,
} from "@/lib/prototype/store";
import type { Church } from "@/lib/types";

export type AdminCounselor = { slug: string; name: string; title: string; avatarUrl: string | null; avatarTint: string };

type Props = {
  church: Church;
  counselors: AdminCounselor[];
  /** The church's member code, or null when it doesn't offer member care yet. */
  code: string | null;
  churches: { slug: string; name: string }[];
};

/** The prototype user's own request shows up on the list under this id. */
const YOU = "you";

const shortDate = (iso: string) => new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

export function ChurchAdminView({ church, counselors, code, churches }: Props) {
  const s = useProto();

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <span className="label-overline">Church admin</span>
        <h1 className="m-0 font-display text-[32px] leading-[1.1] md:text-[40px]">{church.name}</h1>
        <span className="text-slate-600">
          {church.city} · {church.denomination}
        </span>
      </header>

      <ChurchSwitcher current={church} churches={churches} />

      {!s ? (
        <div aria-hidden="true" className="h-64 rounded-xl bg-cream-200" />
      ) : code ? (
        <Dashboard s={s} church={church} code={code} />
      ) : (
        <NoMemberCare church={church} />
      )}

      <Counselors counselors={counselors} memberCare={Boolean(code)} />
    </div>
  );
}

/** PROTOTYPE ONLY: in the real app an admin signs in and sees only their own church. */
function ChurchSwitcher({ current, churches }: { current: Church; churches: Props["churches"] }) {
  const router = useRouter();
  return (
    <div className="flex flex-col gap-2 rounded-md border border-dashed border-peach-400 bg-peach-50 px-4 py-3 text-sm text-peach-800">
      <span>
        Prototype: you&rsquo;re seeing {current.name}&rsquo;s admin page. In the real app, only that church&rsquo;s admins
        can sign in to it. The members listed are fictional.
      </span>
      <label className="flex flex-wrap items-center gap-2">
        <span className="font-semibold">Switch church</span>
        <select
          value={current.slug}
          onChange={(e) => router.push(`/church/${e.target.value}`)}
          className="min-h-11 rounded-md border border-border bg-white px-3 text-[15px] text-slate-900"
        >
          {churches.map((c) => (
            <option key={c.slug} value={c.slug}>
              {c.name}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}

type Row = ProtoRosterMember & { you?: boolean };

function Dashboard({ s, church, code }: { s: ProtoState; church: Church; code: string }) {
  const roster = s.rosters[church.slug] ?? sampleRoster(church.slug);
  const mine = s.user ? s.memberships.find((m) => m.churchSlug === church.slug) : undefined;
  const rows: Row[] = [
    ...(mine && s.user ? [{ ...mine, id: YOU, name: s.user.name, email: s.user.email, you: true }] : []),
    ...roster,
  ];

  const set = (row: Row, status: ProtoMembership["status"], message: string) => {
    if (row.you) {
      const actions = { verified: proto.church.approve, declined: proto.church.decline, ended: proto.church.end, pending: () => {} };
      actions[status](church.slug);
    } else {
      proto.setRosterStatus(church.slug, roster, row.id, status);
    }
    proto.toast(`${message}: ${row.name}`);
  };

  const status = (r: Row) => membershipStatus(r);
  const pending = rows.filter((r) => status(r) === "pending");
  const renewal = rows.filter((r) => isUpForRenewal(r) || status(r) === "expired");
  const members = rows.filter((r) => status(r) === "verified" && !isUpForRenewal(r));
  const past = rows.filter((r) => status(r) === "declined" || status(r) === "ended");

  const yourSessions = s.bookings.filter(
    (b) => b.memberCare && b.status === "confirmed" && new Date(b.startIso).getMonth() === new Date().getMonth(),
  ).length;

  return (
    <>
      <section aria-labelledby="totals" className="flex flex-col gap-3">
        <h2 id="totals" className="sr-only">
          At a glance
        </h2>
        <ul className="m-0 grid list-none grid-cols-2 gap-3 p-0 md:grid-cols-4">
          <Stat label="Approved members" value={members.length + renewal.filter((r) => status(r) === "verified").length} />
          <Stat label="Waiting for you" value={pending.length} highlight={pending.length > 0} />
          <Stat label="Due for renewal" value={renewal.length} highlight={renewal.length > 0} />
          <Stat label="Member sessions this month" value={sampleSessionsThisMonth(church.slug) + yourSessions} />
        </ul>
        <p className="m-0 flex items-start gap-2 text-sm text-slate-600">
          <EyeOff size={18} strokeWidth={1.8} className="mt-0.5 flex-none text-sage-700" aria-hidden="true" />
          Totals only. You never see who booked, when, or anything said in a session or message.
        </p>
      </section>

      <Section
        id="requests"
        title="Member requests"
        intro="People who used your member code or link. Approve the ones you know are part of your church."
      >
        {pending.length === 0 ? (
          <Empty>No one is waiting for approval.</Empty>
        ) : (
          <People>
            {pending.map((r) => (
              <Person key={r.id} row={r} detail={`Asked ${shortDate(r.requestedIso)}`}>
                <Button className={small} onClick={() => set(r, "verified", "Approved")}>
                  Approve
                </Button>
                <Button variant="secondary" className={small} onClick={() => set(r, "declined", "Declined")}>
                  Decline
                </Button>
              </Person>
            ))}
          </People>
        )}
      </Section>

      <Section
        id="renewal"
        title="Due for renewal"
        intro="Approvals last a year. Re-confirm members who still belong, or end it for anyone who has left."
      >
        {renewal.length === 0 ? (
          <Empty>No one is due in the next 30 days.</Empty>
        ) : (
          <People>
            {renewal.map((r) => (
              <Person
                key={r.id}
                row={r}
                detail={status(r) === "expired" ? `Expired ${shortDate(r.expiresIso!)}` : `Expires ${shortDate(r.expiresIso!)}`}
              >
                <Button className={small} onClick={() => set(r, "verified", "Re-confirmed")}>
                  Re-confirm
                </Button>
                <Button variant="secondary" className={small} onClick={() => set(r, "ended", "Membership ended")}>
                  End
                </Button>
              </Person>
            ))}
          </People>
        )}
      </Section>

      <Members members={members} past={past} onEnd={(r) => set(r, "ended", "Membership ended")} onRestore={(r) => set(r, "verified", "Approved")} />

      <MemberAccess church={church} code={code} />
    </>
  );
}

const small = "min-h-11! px-4! text-sm";

function Stat({ label, value, highlight }: { label: string; value: number; highlight?: boolean }) {
  return (
    <li className={`flex flex-col gap-1 rounded-lg border p-4 ${highlight ? "border-peach-400 bg-peach-50" : "border-border-warm bg-white"}`}>
      <span className="font-display text-[32px] leading-none">{value}</span>
      <span className="text-[13px] leading-5 text-slate-600">{label}</span>
    </li>
  );
}

function Section({ id, title, intro, children }: { id: string; title: string; intro?: string; children: React.ReactNode }) {
  return (
    <Card as="section" aria-labelledby={id} padding="compact" className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2 id={id} className="m-0 font-display text-[24px] leading-8">
          {title}
        </h2>
        {intro && <p className="m-0 text-[15px] leading-normal text-slate-600">{intro}</p>}
      </div>
      {children}
    </Card>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="m-0 rounded-md bg-cream px-4 py-3 text-[15px] text-slate-600">{children}</p>;
}

function People({ children }: { children: React.ReactNode }) {
  return <ul className="m-0 flex list-none flex-col divide-y divide-border p-0">{children}</ul>;
}

function Person({ row, detail, children }: { row: Row; detail: string; children: React.ReactNode }) {
  return (
    <li className="flex flex-col gap-3 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-center gap-3">
        <Avatar name={row.name} size={44} tint="#F3EEE6" />
        <div className="flex min-w-0 flex-col">
          <b className="flex flex-wrap items-center gap-2 text-[15px]">
            {row.name}
            {row.you && <Badge variant="accent" className="px-2! py-0.5! text-xs">You</Badge>}
          </b>
          <span className="truncate text-[13px] text-slate-600">{row.email}</span>
          <span className="text-[13px] font-semibold text-slate-600">{detail}</span>
        </div>
      </div>
      <div className="flex flex-none flex-wrap gap-2">{children}</div>
    </li>
  );
}

function Members({
  members,
  past,
  onEnd,
  onRestore,
}: {
  members: Row[];
  past: Row[];
  onEnd: (r: Row) => void;
  onRestore: (r: Row) => void;
}) {
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const shown = q ? members.filter((r) => `${r.name} ${r.email}`.toLowerCase().includes(q)) : members;

  return (
    <Section id="members" title="Members" intro="Approved members can book your church's counselors for free.">
      {members.length > 4 && (
        <label className="relative block">
          <span className="sr-only">Search members</span>
          <Search size={18} strokeWidth={1.8} className="absolute top-1/2 left-4 -translate-y-1/2 text-slate-600" aria-hidden="true" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name or email"
            className="min-h-12 w-full rounded-md border border-border bg-cream pr-4 pl-11 text-base"
          />
        </label>
      )}
      {shown.length === 0 ? (
        <Empty>{q ? "No members match that search." : "No approved members yet."}</Empty>
      ) : (
        <People>
          {shown.map((r) => (
            <Person key={r.id} row={r} detail={`Approved until ${shortDate(r.expiresIso!)}`}>
              <Button variant="secondary" className={small} onClick={() => onEnd(r)}>
                End membership
              </Button>
            </Person>
          ))}
        </People>
      )}
      {past.length > 0 && (
        <details className="group rounded-md border border-border">
          <summary className="flex min-h-12 cursor-pointer items-center px-4 text-[15px] font-semibold">
            Past and declined ({past.length})
          </summary>
          <div className="px-4 pb-4">
            <People>
              {past.map((r) => (
                <Person
                  key={r.id}
                  row={r}
                  detail={`${r.status === "declined" ? "Declined" : "Ended"} ${shortDate(r.updatedIso)}`}
                >
                  <Button variant="secondary" className={small} onClick={() => onRestore(r)}>
                    Approve again
                  </Button>
                </Person>
              ))}
            </People>
          </div>
        </details>
      )}
    </Section>
  );
}

function MemberAccess({ church, code }: { church: Church; code: string }) {
  const link = `${typeof window === "undefined" ? "" : window.location.origin}/join/${church.slug}?code=${code}`;
  const copy = async (text: string, what: string) => {
    try {
      await navigator.clipboard.writeText(text);
      proto.toast(`${what} copied`);
    } catch {
      proto.toast(`Couldn’t copy. Select the ${what.toLowerCase()} and copy it instead.`);
    }
  };

  return (
    <Section
      id="access"
      title="Member access"
      intro="Share your code or link with members only, for example in a members’ newsletter or group chat. Each person still needs your approval."
    >
      <div className="grid gap-3 md:grid-cols-[auto_1fr]">
        <div className="flex flex-col gap-2 rounded-md bg-cream p-4">
          <span className="text-[13px] font-semibold text-slate-600">Member code</span>
          <span className="font-mono text-[22px] font-semibold tracking-wider">{code}</span>
          <Button variant="secondary" className={`${small} self-start`} onClick={() => copy(code, "Code")}>
            <Copy size={16} strokeWidth={1.8} aria-hidden="true" />
            Copy code
          </Button>
        </div>
        <div className="flex min-w-0 flex-col gap-2 rounded-md bg-cream p-4">
          <span className="text-[13px] font-semibold text-slate-600">Member link</span>
          <span className="text-[15px] break-all">{link}</span>
          <Button variant="secondary" className={`${small} self-start`} onClick={() => copy(link, "Link")}>
            <Copy size={16} strokeWidth={1.8} aria-hidden="true" />
            Copy link
          </Button>
        </div>
      </div>
    </Section>
  );
}

function NoMemberCare({ church }: { church: Church }) {
  return (
    <Section id="member-care" title="Member care isn’t set up yet">
      <p className="m-0 text-[15px] leading-normal">
        With member care, people in {church.name} can book your counselors for free once you approve them. You&rsquo;ll get a
        member code and link to share, and this page will list everyone who asks to join.
      </p>
      <Button href="/for-churches#register" className="self-start">
        Set up member care
      </Button>
    </Section>
  );
}

function Counselors({ counselors, memberCare }: { counselors: AdminCounselor[]; memberCare: boolean }) {
  return (
    <Section id="counselors" title="Your counselors" intro="Counselors listed on FaithWellness under your church.">
      {counselors.length === 0 ? (
        <Empty>No counselors are listed under your church yet.</Empty>
      ) : (
        <People>
          {counselors.map((c) => (
            <li key={c.slug} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
              <Avatar name={c.name} src={c.avatarUrl} tint={c.avatarTint} size={52} />
              <div className="flex min-w-0 flex-1 flex-col">
                <Link href={`/counselors/${c.slug}`} className="font-semibold text-slate-900! no-underline hover:underline">
                  {c.name}
                </Link>
                <span className="truncate text-[13px] text-slate-600">{c.title}</span>
                {memberCare && <Badge className="mt-1.5 self-start px-2.5! py-0.5! text-xs sm:hidden!">Free for members</Badge>}
              </div>
              {memberCare && <Badge className="hidden! flex-none sm:inline-flex!">Free for members</Badge>}
            </li>
          ))}
        </People>
      )}
      <Link href="/for-counselors" className="inline-flex min-h-11 items-center gap-2 self-start font-semibold">
        <UserPlus size={18} strokeWidth={1.8} aria-hidden="true" />
        Invite a counselor to apply
      </Link>
    </Section>
  );
}
