"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Copy, EyeOff, Search, UserPlus } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/cn";
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
import { authEnabled, ownChurch, supabaseBrowser, useAccountKind, useAuthState } from "@/lib/supabase/client";
import type { Church } from "@/lib/types";
import { AccreditationEditor } from "./AccreditationEditor";

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

export function ChurchAdminView(props: Props) {
  const auth = useAuthState();
  const kind = useAccountKind();
  if (!authEnabled) return <PrototypeChurchAdmin {...props} />;
  if (auth === "loading") return <div aria-busy="true" className="h-96 animate-pulse rounded-xl bg-cream-200" />;
  if (kind === "church" && ownChurch?.slug === props.church.slug) return <RealChurchAdmin {...props} />;
  return (
    <Card className="flex flex-col items-start gap-4">
      <span className="label-overline">Church admin</span>
      <h1 className="m-0 font-display text-[30px] leading-[1.1]">{props.church.name}</h1>
      <p className="m-0 text-slate-600">
        This page is only for {props.church.name}&rsquo;s admins.{" "}
        {auth === "signed-out" ? "Sign in with your church admin account to see it." : "Your account isn’t one of them."}
      </p>
      <div className="flex flex-wrap gap-3">
        {auth === "signed-out" && <Button href={`/sign-in?next=${encodeURIComponent(`/church/${props.church.slug}`)}`}>Sign in</Button>}
        <Button href="/for-churches" variant="secondary">
          Bring your church to FaithWellness
        </Button>
      </div>
    </Card>
  );
}

function Header({ church }: { church: Church }) {
  return (
    <header className="flex flex-col gap-2">
      <span className="label-overline">Church admin</span>
      <h1 className="m-0 font-display text-[32px] leading-[1.1] md:text-[40px]">{church.name}</h1>
      <span className="text-slate-600">
        {church.city} · {church.denomination}
      </span>
    </header>
  );
}

/** The real dashboard, for this church's signed-in admins. Members come from church_memberships. */
function RealChurchAdmin({ church, counselors }: Props) {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [codes, setCodes] = useState<MemberCode[]>([]);
  const [payoutsReady, setPayoutsReady] = useState(false);
  const [sessions, setSessions] = useState(0);

  const load = useCallback(async () => {
    const sb = supabaseBrowser();
    const [{ data: codeRows }, { data: members }, { data: count }, { data: ready }] = await Promise.all([
      sb.from("church_codes").select("id, code, label").order("created_at"),
      sb.from("church_memberships").select("id, status, member_name, member_email, requested_at, updated_at, expires_at").order("requested_at", { ascending: false }),
      sb.rpc("my_church_member_sessions_this_month"),
      sb.rpc("my_church_payouts_ready"),
    ]);
    setPayoutsReady(Boolean(ready));
    setCodes((codeRows as MemberCode[] | null) ?? []);
    setSessions((count as number | null) ?? 0);
    setRows(
      ((members as RealMember[] | null) ?? []).map((m) => ({
        id: m.id,
        name: m.member_name || "Member",
        email: m.member_email,
        status: m.status,
        requestedIso: m.requested_at,
        updatedIso: m.updated_at,
        expiresIso: m.expires_at ?? undefined,
      })),
    );
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  const set = async (row: Row, status: ProtoMembership["status"], message: string) => {
    const { error } = await supabaseBrowser().rpc("decide_membership", { p_id: row.id, p_status: status });
    proto.toast(error ? "That didn’t save. Please try again." : `${message}: ${row.name}`);
    load();
  };

  const manage: CodeActions = {
    add: async (code, label) => {
      const { error } = await supabaseBrowser().rpc("add_member_code", { p_code: code, p_label: label });
      if (error) return error.code === "23505" ? "That code is already in use. Try a different one." : "That didn’t save. Please try again.";
      await load();
      return null;
    },
    remove: async (id) => {
      const { error } = await supabaseBrowser().rpc("delete_member_code", { p_id: id });
      if (!error) await load();
      return !error;
    },
  };

  return (
    <div className="flex flex-col gap-6">
      <Header church={church} />
      {!rows ? (
        <div aria-hidden="true" className="h-64 rounded-xl bg-cream-200" />
      ) : codes.length > 0 ? (
        <DashboardBody rows={rows} set={set} sessionsThisMonth={sessions} church={church} codes={codes} manage={manage} />
      ) : (
        <NoMemberCare church={church} manage={manage} />
      )}
      <Counselors counselors={counselors} memberCare={codes.length > 0} />
      <Section
        id="accreditation"
        title="Accreditation requirements"
        intro="What your counselors had to do to be accredited by your church. FaithWellness publishes it on your accreditation page, so a badge on a profile means something people can check."
      >
        <AccreditationEditor churchSlug={church.slug} />
      </Section>
      <ChurchPayouts church={church} ready={payoutsReady} />
    </div>
  );
}

const payoutOutcomes: Record<string, string> = {
  ready: "Payouts are set up.",
  incomplete: "Stripe still needs a few details before your church can be paid. Continue where you left off.",
  failed: "Something went wrong reaching Stripe. Please try again.",
  "not-configured": "Payments aren’t switched on for this site yet.",
};

/** The church receives 8% of paid sessions with its counselors, through its own Stripe account. */
function ChurchPayouts({ church, ready }: { church: Church; ready: boolean }) {
  useEffect(() => {
    const outcome = payoutOutcomes[new URLSearchParams(window.location.search).get("payouts") ?? ""];
    if (outcome) proto.toast(outcome);
  }, []);
  const link = (href: string, label: string, primary: boolean) => (
    <a
      href={href}
      className={cn(
        "inline-flex min-h-11 items-center justify-center self-start rounded-pill px-5 text-[15px] no-underline",
        primary ? "bg-peach-500 font-bold text-slate-900! hover:bg-peach-400" : "border-[1.5px] border-slate-900 font-semibold text-slate-900! hover:bg-white",
      )}
    >
      {label}
    </a>
  );
  return (
    <Section
      id="payouts"
      title="Payouts"
      intro={`${church.name} receives 8% of every paid session with your counselors, paid to your bank account through Stripe.`}
    >
      {ready ? (
        <>
          <span className="text-[15px] font-semibold text-sage-700">Payouts are on</span>
          {link("/api/stripe/dashboard?for=church", "View payouts in Stripe", false)}
        </>
      ) : (
        <>
          <p className="m-0 text-[15px] leading-normal text-slate-600">
            Stripe asks for your church&rsquo;s details (such as its EIN) and bank account. FaithWellness never sees your bank
            details. Until it&rsquo;s set up, your share is kept for you.
          </p>
          {link("/api/stripe/connect?for=church", "Set up payouts", true)}
        </>
      )}
    </Section>
  );
}

type RealMember = {
  id: string;
  status: ProtoMembership["status"];
  member_name: string;
  member_email: string;
  requested_at: string;
  updated_at: string;
  expires_at: string | null;
};

/** PROTOTYPE ONLY (no Supabase keys): any church's page, with fictional members. */
function PrototypeChurchAdmin({ church, counselors, code, churches }: Props) {
  const s = useProto();

  return (
    <div className="flex flex-col gap-6">
      <Header church={church} />

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

  const yourSessions = s.bookings.filter(
    (b) => b.memberCare && b.status === "confirmed" && new Date(b.startIso).getMonth() === new Date().getMonth(),
  ).length;

  return (
    <DashboardBody
      rows={rows}
      set={set}
      sessionsThisMonth={sampleSessionsThisMonth(church.slug) + yourSessions}
      church={church}
      codes={[{ id: "sample", code, label: "" }]}
    />
  );
}

/** Totals, requests, renewals, members and the member code. Shared by the real and prototype dashboards. */
function DashboardBody({
  rows,
  set,
  sessionsThisMonth,
  church,
  codes,
  manage,
}: {
  rows: Row[];
  set: (row: Row, status: ProtoMembership["status"], message: string) => void;
  sessionsThisMonth: number;
  church: Church;
  codes: MemberCode[];
  /** Real churches add and delete codes; the prototype can't. */
  manage?: CodeActions;
}) {
  const status = (r: Row) => membershipStatus(r);
  const pending = rows.filter((r) => status(r) === "pending");
  const renewal = rows.filter((r) => isUpForRenewal(r) || status(r) === "expired");
  const members = rows.filter((r) => status(r) === "verified" && !isUpForRenewal(r));
  const past = rows.filter((r) => status(r) === "declined" || status(r) === "ended");

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
          <Stat label="Member sessions this month" value={sessionsThisMonth} />
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

      <MemberAccess church={church} codes={codes} manage={manage} />
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

type MemberCode = { id: string; code: string; label: string };
/** add returns an error message, or null when saved. */
type CodeActions = { add: (code: string, label: string) => Promise<string | null>; remove: (id: string) => Promise<boolean> };

async function copyText(text: string, what: string) {
  try {
    await navigator.clipboard.writeText(text);
    proto.toast(`${what} copied`);
  } catch {
    proto.toast(`Couldn’t copy. Select the ${what.toLowerCase()} and copy it instead.`);
  }
}

/** The church's member codes, each with its link. Real churches can add more and delete ones they don't want. */
function MemberAccess({ church, codes, manage }: { church: Church; codes: MemberCode[]; manage?: CodeActions }) {
  const [adding, setAdding] = useState(false);
  return (
    <Section
      id="access"
      title="Member access"
      intro="Share a code or link with members only, for example in a members’ newsletter or group chat. Each person still needs your approval."
    >
      <ul className="m-0 flex list-none flex-col gap-3 p-0">
        {codes.map((c) => (
          <li key={c.id}>
            <CodeRow church={church} code={c} canDelete={Boolean(manage)} last={codes.length === 1} onDelete={manage?.remove} />
          </li>
        ))}
      </ul>
      {manage &&
        (adding ? (
          <CodeForm
            submitLabel="Add code"
            note="Any of your codes works. You can delete a code later without affecting the others."
            onSave={async (code, label) => {
              const problem = await manage.add(code, label);
              if (!problem) {
                setAdding(false);
                proto.toast("Code added");
              }
              return problem;
            }}
            onCancel={() => setAdding(false)}
          />
        ) : (
          <Button variant="secondary" className={`${small} self-start`} onClick={() => setAdding(true)}>
            Add a code
          </Button>
        ))}
    </Section>
  );
}

function CodeRow({
  church,
  code: c,
  canDelete,
  last,
  onDelete,
}: {
  church: Church;
  code: MemberCode;
  canDelete: boolean;
  last: boolean;
  onDelete?: (id: string) => Promise<boolean>;
}) {
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const link = `${typeof window === "undefined" ? "" : window.location.origin}/join/${church.slug}?code=${c.code}`;
  return (
    <div className="flex flex-col gap-3 rounded-md bg-cream p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="font-mono text-[22px] font-semibold tracking-wider">{c.code}</span>
        {c.label && <span className="text-[13px] font-semibold text-slate-600">{c.label}</span>}
      </div>
      <span className="text-[13px] break-all text-slate-600">{link}</span>
      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" className={small} onClick={() => copyText(c.code, "Code")}>
          <Copy size={16} strokeWidth={1.8} aria-hidden="true" />
          Copy code
        </Button>
        <Button variant="secondary" className={small} onClick={() => copyText(link, "Link")}>
          <Copy size={16} strokeWidth={1.8} aria-hidden="true" />
          Copy link
        </Button>
        {canDelete && !confirming && (
          <Button variant="link" className={small} onClick={() => setConfirming(true)}>
            Delete
          </Button>
        )}
      </div>
      {confirming && onDelete && (
        <div role="alertdialog" aria-label={`Delete ${c.code}?`} className="flex flex-col gap-3 rounded-md border border-peach-400 bg-white p-4">
          <b className="text-[15px]">Delete {c.code}?</b>
          <span className="text-sm text-slate-600">
            This code and its link stop working straight away. Members you&rsquo;ve already approved stay approved.
            {last && " It’s your only code, so nobody new can ask to join until you add another."}
          </span>
          <div className="flex flex-wrap gap-2">
            <Button
              className={small}
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                const ok = await onDelete(c.id);
                setBusy(false);
                proto.toast(ok ? "Code deleted" : "That didn’t work. Please try again.");
                if (!ok) setConfirming(false);
              }}
            >
              Delete code
            </Button>
            <Button variant="link" className={small} onClick={() => setConfirming(false)}>
              Keep it
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

/** A new member code (6 to 20 letters or numbers) with an optional label. onSave returns an error message, or null when saved. */
function CodeForm({
  note,
  submitLabel,
  onSave,
  onCancel,
}: {
  note: string;
  submitLabel: string;
  onSave: (code: string, label: string) => Promise<string | null>;
  onCancel?: () => void;
}) {
  const [value, setValue] = useState("");
  const [label, setLabel] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const clean = value.replace(/\s+/g, "").toUpperCase();
  return (
    <form
      noValidate
      className="flex flex-col gap-3 rounded-md border border-border p-4"
      onSubmit={async (e) => {
        e.preventDefault();
        if (!/^[A-Z0-9]{6,20}$/.test(clean)) return setError("Use 6 to 20 letters or numbers, with no spaces or symbols.");
        setSaving(true);
        const problem = await onSave(clean, label.trim());
        setSaving(false);
        if (problem) setError(problem);
      }}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5 text-sm font-semibold">
          New code
          <input
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              setError("");
            }}
            autoComplete="off"
            autoCapitalize="characters"
            aria-invalid={Boolean(error) || undefined}
            placeholder="e.g. GRACEMEMBERS"
            className="min-h-12 rounded-md border border-border bg-cream px-4 font-mono text-base tracking-wider uppercase aria-invalid:border-peach-700"
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-semibold">
          <span>
            Label <span className="font-normal text-slate-600">(optional, only you see it)</span>
          </span>
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="e.g. Sunday bulletin"
            className="min-h-12 rounded-md border border-border bg-cream px-4 text-base"
          />
        </label>
      </div>
      <span className="text-[13px] text-slate-600">{note}</span>
      {error && (
        <p role="alert" className="m-0 text-sm text-peach-700">
          {error}
        </p>
      )}
      <div className="flex flex-wrap gap-3">
        <Button type="submit" className={small} disabled={saving}>
          {saving ? "Saving…" : submitLabel}
        </Button>
        {onCancel && (
          <Button variant="link" className={small} onClick={onCancel}>
            Cancel
          </Button>
        )}
      </div>
    </form>
  );
}

function NoMemberCare({ church, manage }: { church: Church; manage?: CodeActions }) {
  return (
    <Section id="member-care" title="Member Benefits aren’t set up yet">
      <p className="m-0 text-[15px] leading-normal">
        With Member Benefits, people in {church.name} can book your counselors for free once you approve them. Add a member code
        to share, and this page will list everyone who asks to join.
      </p>
      {manage ? (
        <CodeForm
          note="Choose something easy to share with members but hard to guess. You can add more codes later."
          submitLabel="Turn on Member Benefits"
          onSave={async (code, label) => {
            const problem = await manage.add(code, label);
            if (!problem) proto.toast("Member Benefits are on");
            return problem;
          }}
        />
      ) : (
        <Button href="/for-churches#register" className="self-start">
          Set up Member Benefits
        </Button>
      )}
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
