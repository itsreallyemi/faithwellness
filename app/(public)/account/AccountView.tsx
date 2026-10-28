"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { CalendarDays, ChevronRight, Eye, EyeOff, MessageCircle, Trash2 } from "lucide-react";
import { useDeviceTimeZone, useViewerTimeZone } from "@/components/LocalTime";
import { MemberBadge } from "@/components/prototype/MemberBadge";
import { RequireSignIn } from "@/components/prototype/RequireSignIn";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { intakeRows } from "@/lib/prototype/intake";
import { formatSession } from "@/lib/prototype/format";
import { isUpForRenewal, membershipStatus, proto, type ProtoState, type ProtoUser } from "@/lib/prototype/store";
import { authEnabled, supabaseBrowser } from "@/lib/supabase/client";
import { zoneCity } from "@/lib/time";

type SignedIn = ProtoState & { user: ProtoUser };

export function AccountView() {
  return <RequireSignIn>{(s) => <Account s={s} />}</RequireSignIn>;
}

function Account({ s }: { s: SignedIn }) {
  return (
    <div className="flex flex-col gap-6">
      <header className="flex items-center gap-4">
        <Avatar name={s.user.name} size={72} tint="#F3EEE6" />
        <div className="flex min-w-0 flex-col">
          <h1 className="m-0 font-display text-[32px] leading-[1.1] md:text-[40px]">{s.user.name}</h1>
          <span className="truncate text-slate-600">{s.user.email}</span>
        </div>
      </header>

      <Details user={s.user} />
      <Sessions s={s} />
      <Memberships s={s} />
      <Answers s={s} />
      <DeleteAccount s={s} />
    </div>
  );
}

function Section({ id, title, action, children }: { id: string; title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <Card as="section" aria-labelledby={id} padding="compact" className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id={id} className="m-0 font-display text-[24px] leading-8">
          {title}
        </h2>
        {action}
      </div>
      {children}
    </Card>
  );
}

const field = "min-h-12 w-full rounded-md border border-border bg-cream px-4 text-base aria-invalid:border-peach-700";

// Details ----------------------------------------------------------------------

const DEVICE = "device";

function Details({ user }: { user: ProtoUser }) {
  const device = useDeviceTimeZone();
  const zones = useMemo(() => {
    try {
      return Intl.supportedValuesOf("timeZone");
    } catch {
      return [];
    }
  }, []);
  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email);
  const [zone, setZone] = useState(user.timeZone ?? DEVICE);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const effective = zone === DEVICE ? (device ?? "UTC") : zone;
  const now = new Date().toLocaleTimeString("en-US", { timeZone: effective, hour: "numeric", minute: "2-digit" });
  const dirty = name !== user.name || email !== user.email || zone !== (user.timeZone ?? DEVICE);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const next: Record<string, string> = {};
    if (!name.trim()) next.name = "Add the name you’d like to go by.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) next.email = "Enter an email address like name@example.com.";
    setErrors(next);
    if (Object.keys(next).length) return;
    const emailChanged = email.trim() !== user.email;
    const timeZone = zone === DEVICE ? undefined : zone;

    if (!authEnabled) {
      proto.updateUser({ name: name.trim(), email: email.trim(), timeZone });
      proto.toast(
        emailChanged
          ? `Saved. In the real app we’d send a link to ${email.trim()} to confirm it first.`
          : "Your details are saved.",
      );
      return;
    }

    const sb = supabaseBrowser();
    const { data } = await sb.auth.getUser();
    if (!data.user) return proto.toast("You’ve been signed out. Sign in again to save.");
    const { error } = await sb.from("profiles").update({ full_name: name.trim(), time_zone: effective }).eq("id", data.user.id);
    if (error) return proto.toast("We couldn’t save your details. Please try again.");
    // The email only changes once the new address is confirmed from the link Supabase sends.
    proto.updateUser({ name: name.trim(), timeZone });
    if (!emailChanged) return proto.toast("Your details are saved.");
    const change = await sb.auth.updateUser(
      { email: email.trim() },
      { emailRedirectTo: `${location.origin}/auth/callback?next=/account` },
    );
    setEmail(user.email);
    proto.toast(
      change.error
        ? "Your name is saved, but we couldn’t start the email change. Please try again."
        : `Saved. To finish changing your email, open the link we sent to ${email.trim()}.`,
    );
  };

  const err = (k: string) =>
    errors[k] ? (
      <p id={`ac-${k}-error`} className="m-0 text-sm text-peach-700">
        {errors[k]}
      </p>
    ) : null;
  const a11y = (k: string) => ({ "aria-invalid": Boolean(errors[k]), "aria-describedby": errors[k] ? `ac-${k}-error` : undefined });

  return (
    <Section id="details" title="Your details">
      <form noValidate onSubmit={save} className="flex flex-col gap-5">
        <div className="flex flex-col gap-2">
          <label htmlFor="ac-name" className="font-semibold">
            Name
          </label>
          <input id="ac-name" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} className={field} {...a11y("name")} />
          <span className="text-[13px] text-slate-600">Your counselors see this name. A first name is fine.</span>
          {err("name")}
        </div>
        <div className="flex flex-col gap-2">
          <label htmlFor="ac-email" className="font-semibold">
            Email
          </label>
          <input id="ac-email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className={field} {...a11y("email")} />
          <span className="text-[13px] text-slate-600">Where sign-in links, confirmations and reminders go.</span>
          {err("email")}
        </div>
        <div className="flex flex-col gap-2">
          <label htmlFor="ac-zone" className="font-semibold">
            Time zone
          </label>
          <select id="ac-zone" value={zone} onChange={(e) => setZone(e.target.value)} className={field} aria-describedby="ac-zone-hint">
            <option value={DEVICE}>Use this device&rsquo;s time zone{device ? ` (${zoneCity(device)})` : ""}</option>
            {zones.map((z) => (
              <option key={z} value={z}>
                {z.replaceAll("_", " ")}
              </option>
            ))}
          </select>
          <span id="ac-zone-hint" className="text-[13px] text-slate-600" suppressHydrationWarning>
            Session times are shown in {zoneCity(effective)} time. It&rsquo;s {now} there now.
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" disabled={!dirty}>
            Save changes
          </Button>
          {dirty && (
            <Button
              variant="link"
              onClick={() => {
                setName(user.name);
                setEmail(user.email);
                setZone(user.timeZone ?? DEVICE);
                setErrors({});
              }}
            >
              Cancel
            </Button>
          )}
        </div>
      </form>
    </Section>
  );
}

// Sessions and messages ------------------------------------------------------------

function Sessions({ s }: { s: SignedIn }) {
  const tz = useViewerTimeZone("UTC");
  const now = Date.now();
  const upcoming = s.bookings
    .filter((b) => b.status === "confirmed" && new Date(b.startIso).getTime() + b.duration * 60_000 > now)
    .sort((a, b) => a.startIso.localeCompare(b.startIso));
  const threads = Object.values(s.threads).filter((t) => t.length > 0).length;

  return (
    <Section id="sessions" title="Sessions and messages">
      <ul className="m-0 flex list-none flex-col gap-2 p-0">
        <li>
          <Row href="/sessions" icon={<CalendarDays size={20} strokeWidth={1.8} aria-hidden="true" />}>
            <b>My sessions</b>
            <span className="text-sm text-slate-600">
              {upcoming.length
                ? `Next: ${formatSession(new Date(upcoming[0].startIso), upcoming[0].duration, tz)}`
                : "Nothing booked right now"}
            </span>
          </Row>
        </li>
        <li>
          <Row href="/messages" icon={<MessageCircle size={20} strokeWidth={1.8} aria-hidden="true" />}>
            <b>Messages</b>
            <span className="text-sm text-slate-600">
              {threads ? `${threads} ${threads === 1 ? "conversation" : "conversations"}` : "No conversations yet"}
            </span>
          </Row>
        </li>
      </ul>
    </Section>
  );
}

function Row({ href, icon, children }: { href: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <Link href={href} className="flex items-center gap-3.5 rounded-md border border-border p-3.5 text-slate-900! no-underline hover:bg-cream">
      <span className="flex size-10 flex-none items-center justify-center rounded-md bg-cream-200 text-slate-900">{icon}</span>
      <span className="flex min-w-0 flex-1 flex-col">{children}</span>
      <ChevronRight size={18} strokeWidth={1.8} className="flex-none text-slate-500" aria-hidden="true" />
    </Link>
  );
}

// Memberships --------------------------------------------------------------------

function Memberships({ s }: { s: SignedIn }) {
  return (
    <Section
      id="memberships"
      title="Church memberships"
      action={
        <Link href="/membership" className="inline-flex min-h-11 items-center text-sm font-semibold">
          Manage
        </Link>
      }
    >
      {s.memberships.length === 0 ? (
        <p className="m-0 text-slate-600">
          If your church offers member care, sessions with its counselors can be free.{" "}
          <Link href="/membership" className="font-semibold">
            Add your church
          </Link>
        </p>
      ) : (
        <ul className="m-0 flex list-none flex-col gap-2 p-0">
          {s.memberships.map((m) => {
            const status = membershipStatus(m);
            const label =
              status === "verified"
                ? isUpForRenewal(m)
                  ? "Renewal due"
                  : null
                : { pending: "Waiting for approval", declined: "Not approved", ended: "Membership ended", expired: "Expired" }[status];
            return (
              <li key={m.churchSlug} className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border p-3.5">
                <b>{m.churchName}</b>
                {label ? <Badge variant={status === "verified" || status === "pending" ? "accent" : "tag"}>{label}</Badge> : <MemberBadge />}
              </li>
            );
          })}
        </ul>
      )}
    </Section>
  );
}

// Onboarding answers -----------------------------------------------------------------

function Answers({ s }: { s: SignedIn }) {
  const intake = s.intake;
  return (
    <Section
      id="answers"
      title="Your answers"
      action={
        intake && (
          <Link href="/get-started?edit=1" className="inline-flex min-h-11 items-center text-sm font-semibold">
            Edit answers
          </Link>
        )
      }
    >
      {!intake ? (
        <p className="m-0 text-slate-600">
          <Link href="/get-started" className="font-semibold">
            Answer five short questions
          </Link>{" "}
          and we&rsquo;ll suggest counselors who fit.
        </p>
      ) : (
        <>
          <dl className="m-0 grid grid-cols-1 gap-x-6 gap-y-1 text-[15px] sm:grid-cols-[auto_1fr] sm:gap-y-2.5">
            {intakeRows(intake).map(([label, value]) => (
              <div key={label} className="contents">
                <dt className="text-slate-600">{label.replace("Counseling for", "Who it’s for")}</dt>
                <dd className="m-0 mb-2 sm:mb-0">{label === "Counseling for" ? whoForYou(intake.who) : value}</dd>
              </div>
            ))}
          </dl>
          <div className="flex flex-col gap-2 rounded-md bg-cream p-4">
            <p className="m-0 flex gap-2.5 text-[15px] leading-normal">
              {intake.shareWithCounselor ? (
                <Eye size={20} strokeWidth={1.8} className="mt-0.5 flex-none text-sage-700" aria-hidden="true" />
              ) : (
                <EyeOff size={20} strokeWidth={1.8} className="mt-0.5 flex-none text-slate-600" aria-hidden="true" />
              )}
              {intake.shareWithCounselor
                ? "Shared with counselors you book or message. Never with your church."
                : "Private. Counselors don’t see these answers."}
            </p>
            <Button variant="link" className="self-start px-0! text-sm" onClick={() => proto.setIntakeSharing(!intake.shareWithCounselor)}>
              {intake.shareWithCounselor ? "Stop sharing" : "Share with my counselors"}
            </Button>
          </div>
          <Link href="/get-started" className="inline-flex min-h-11 items-center self-start font-semibold">
            See my matches
          </Link>
        </>
      )}
    </Section>
  );
}

function whoForYou(who: string) {
  return { individual: "Me", couple: "Us as a couple", family: "Our family", child: "My child" }[who] ?? who;
}

// Delete account ------------------------------------------------------------------

function DeleteAccount({ s }: { s: SignedIn }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const upcoming = s.bookings.filter((b) => b.status === "confirmed" && new Date(b.startIso).getTime() > Date.now()).length;

  return (
    <Card as="section" aria-labelledby="delete" padding="compact" className="flex flex-col gap-4 border-peach-200!">
      <h2 id="delete" className="m-0 font-display text-[24px] leading-8">
        Delete account
      </h2>
      <p className="m-0 text-[15px] leading-normal text-slate-600">
        Permanently remove your account, your answers, your church memberships and your messages.
      </p>
      {!open ? (
        <Button variant="secondary" className="self-start" onClick={() => setOpen(true)}>
          <Trash2 size={18} strokeWidth={1.8} aria-hidden="true" />
          Delete my account
        </Button>
      ) : (
        <div role="alertdialog" aria-labelledby="delete-confirm" className="flex flex-col gap-4 rounded-md border border-peach-400 bg-peach-50 p-4">
          <b id="delete-confirm">This can&rsquo;t be undone</b>
          <ul className="m-0 flex flex-col gap-1.5 pl-5 text-[15px] leading-normal">
            <li>
              {upcoming
                ? `Your ${upcoming} upcoming ${upcoming === 1 ? "session is" : "sessions are"} canceled, and the counselor is told.`
                : "You have no upcoming sessions."}
            </li>
            <li>Your messages, onboarding answers and church memberships are deleted.</li>
            <li>Counselors keep only the records the law requires them to keep about past sessions.</li>
          </ul>
          <div className="flex flex-col gap-2">
            <label htmlFor="ac-delete" className="font-semibold">
              Type DELETE to confirm
            </label>
            <input
              id="ac-delete"
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              autoComplete="off"
              autoCapitalize="characters"
              className="min-h-12 w-full max-w-xs rounded-md border border-border bg-white px-4 text-base"
            />
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button
              variant="secondary"
              disabled={typed.trim().toUpperCase() !== "DELETE"}
              onClick={async () => {
                if (authEnabled) {
                  const { error } = await supabaseBrowser().rpc("delete_my_account");
                  if (error) return proto.toast("We couldn’t delete your account. Please try again.");
                  await supabaseBrowser().auth.signOut();
                }
                proto.deleteAccount();
                router.push("/counselors");
                proto.toast("Your account has been deleted.");
              }}
            >
              Delete my account
            </Button>
            <Button
              variant="link"
              onClick={() => {
                setOpen(false);
                setTyped("");
              }}
            >
              Keep my account
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}
