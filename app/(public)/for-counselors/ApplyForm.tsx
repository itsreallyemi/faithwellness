"use client";

import { useState } from "react";
import { CircleAlert, CircleCheck, Clock } from "lucide-react";
import { ApplicationTracker, accreditorName, useMyApplication } from "@/components/ApplicationProgress";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/cn";
import { NOT_LISTED, roleKinds, shortDate, type Application } from "@/lib/applications";
import { useProto } from "@/lib/prototype/store";
import { contactEmail } from "@/lib/site";
import { authEnabled, supabaseBrowser, useAuthState } from "@/lib/supabase/client";

type Body = { slug: string; name: string };
type Fields = { name: string; email: string; role: string; body: string; church: string; license: string; note: string };

const field = "min-h-12 w-full rounded-md border border-border bg-cream px-4 text-base aria-invalid:border-peach-700";
const blank: Fields = { name: "", email: "", role: "", body: "", church: "", license: "", note: "" };

function validate(f: Fields, checkEmail: boolean) {
  const next: Record<string, string> = {};
  if (!f.name.trim()) next.name = "Add your name.";
  if (checkEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email.trim())) next.email = "Enter an email address like name@church.org.";
  if (!f.role) next.role = "Choose the option closest to your role.";
  if (!f.body) next.body = "Choose who accredits you.";
  if (f.body === NOT_LISTED && !f.church.trim()) next.church = "Tell us your church or denomination.";
  if (f.role === "clinician" && !f.license.trim()) next.license = "Add your license type and state.";
  return next;
}

export function ApplyForm({ bodies }: { bodies: Body[] }) {
  return authEnabled ? <RealApply bodies={bodies} /> : <PrototypeApply bodies={bodies} />;
}

/** Saves to Supabase. Applicants sign in first, so approval can switch on their portal on the same account. */
function RealApply({ bodies }: { bodies: Body[] }) {
  const auth = useAuthState();
  const s = useProto();
  const mine = useMyApplication();
  // Set after sending, so the new status shows straight away.
  const [sent, setSent] = useState<Application | null>(null);
  const [editing, setEditing] = useState(false);

  if (auth === "loading" || (auth === "signed-in" && mine === null)) {
    return <Card id="apply" aria-busy="true" className="h-96 scroll-mt-6 animate-pulse self-start bg-cream-200!" />;
  }

  if (auth === "signed-out") {
    return (
      <Card id="apply" as="section" aria-labelledby="apply-title" className="flex scroll-mt-6 flex-col gap-4 self-start">
        <h2 id="apply-title" className="m-0 font-display text-[28px] leading-[34px]">
          Apply to join
        </h2>
        <p className="m-0 text-[17px] leading-[1.6] text-slate-600">
          Sign in first, with the email you&rsquo;d like to use as a counselor. When you&rsquo;re approved, your counselor
          portal opens on that same account.
        </p>
        <Button href={`/sign-in?next=${encodeURIComponent("/for-counselors#apply")}`} size="lg" className="self-start">
          Sign in to apply
        </Button>
      </Card>
    );
  }

  const current = sent ?? mine?.app ?? null;
  const tracker = current && <ApplicationTracker app={current} live={Boolean(mine?.live) && !sent} />;

  if (current && !editing) {
    if (current.status === "approved") {
      return (
        <StatusCard tone="good" title={mine?.live ? "You’re live on FaithWellness" : "You’re approved"}>
          <p className="m-0">
            {mine?.live
              ? "Clients can now find and book you. Manage your sessions and settings in your portal."
              : "Welcome to FaithWellness. Your counselor portal is ready for you to set up your profile."}
          </p>
          {tracker}
          <Button href="/portal" size="lg" className="self-start">
            {mine?.live ? "Go to your portal" : "Set up your profile"}
          </Button>
        </StatusCard>
      );
    }
    if (current.status === "needs_info") {
      return (
        <StatusCard tone="attention" title="We need a little more information">
          <Quote>{current.admin_note}</Quote>
          {tracker}
          <Button size="lg" className="self-start" onClick={() => setEditing(true)}>
            Update my application
          </Button>
        </StatusCard>
      );
    }
    if (current.status === "declined") {
      return (
        <StatusCard tone="attention" title="We couldn’t approve your application">
          <Quote>{current.admin_note}</Quote>
          <p className="m-0">
            Questions? Email <a href={`mailto:${contactEmail}`}>{contactEmail}</a>.
          </p>
          {tracker}
          <Button variant="secondary" size="lg" className="self-start" onClick={() => setEditing(true)}>
            Apply again
          </Button>
        </StatusCard>
      );
    }
    return (
      <StatusCard tone="waiting" title="Application received">
        <p className="m-0">
          Sent {shortDate(current.submitted_at)}. We&rsquo;ll confirm your accreditation with {accreditorName(current)} and email you at{" "}
          <b className="text-slate-900">{current.email}</b> when there&rsquo;s news. You can check back here any time.
        </p>
        {tracker}
        <Button variant="link" className="self-start px-0!" onClick={() => setEditing(true)}>
          Edit my answers
        </Button>
      </StatusCard>
    );
  }

  const initial: Fields = current
    ? {
        name: current.full_name,
        email: current.email,
        role: current.role_kind,
        body: current.accrediting_body,
        church: current.church_name,
        license: current.license,
        note: current.note,
      }
    : { ...blank, name: s?.user?.name ?? "", email: s?.user?.email ?? "" };

  return (
    <ApplicationForm
      bodies={bodies}
      initial={initial}
      emailReadOnly
      submitLabel={current ? "Send updated application" : "Send application"}
      onCancel={current ? () => setEditing(false) : undefined}
      onSubmit={async (f) => {
        const { data, error } = await supabaseBrowser()
          .rpc("submit_counselor_application", {
            p_full_name: f.name.trim(),
            p_role_kind: f.role,
            p_accrediting_body: f.body,
            p_church_name: f.body === NOT_LISTED ? f.church.trim() : "",
            p_license: f.role === "clinician" ? f.license.trim() : "",
            p_note: f.note.trim(),
          })
          .single();
        if (error) return "We couldn’t send your application. Please try again.";
        setSent(data as Application);
        setEditing(false);
        return null;
      }}
    />
  );
}

/** PROTOTYPE ONLY (no Supabase keys): validates and shows the confirmation, but sends nothing. */
function PrototypeApply({ bodies }: { bodies: Body[] }) {
  const [sent, setSent] = useState<Fields | null>(null);
  if (sent) {
    const bodyName = bodies.find((b) => b.slug === sent.body)?.name;
    return (
      <StatusCard tone="good" title={`Thank you, ${sent.name.trim().split(" ")[0]}`}>
        <p className="m-0">
          {sent.body === NOT_LISTED
            ? `We’ll contact ${sent.church.trim()} about publishing their accreditation requirements, and email you at ${sent.email.trim()} when they’re listed.`
            : `We’ll confirm your accreditation with ${bodyName} and email you at ${sent.email.trim()} with a link to set up your profile. This usually takes a few days.`}
        </p>
        <p className="m-0 rounded-md border border-dashed border-peach-400 bg-peach-50 px-4 py-3 text-sm text-peach-800">
          Prototype: nothing was sent or saved.
        </p>
        <Button variant="link" onClick={() => setSent(null)} className="self-start px-0!">
          Edit my answers
        </Button>
      </StatusCard>
    );
  }
  return (
    <ApplicationForm
      bodies={bodies}
      initial={blank}
      submitLabel="Send application"
      onSubmit={async (f) => {
        setSent(f);
        return null;
      }}
    />
  );
}

function StatusCard({ tone, title, children }: { tone: "good" | "waiting" | "attention"; title: string; children: React.ReactNode }) {
  const Icon = { good: CircleCheck, waiting: Clock, attention: CircleAlert }[tone];
  return (
    <Card id="apply" as="section" aria-label={title} className="flex scroll-mt-6 flex-col gap-4 self-start">
      <span className={cn("flex size-14 items-center justify-center rounded-lg", tone === "good" ? "bg-sage-100" : "bg-peach-100")}>
        <Icon size={28} strokeWidth={1.8} className={tone === "good" ? "text-sage-700" : "text-peach-700"} aria-hidden="true" />
      </span>
      <h2 className="m-0 font-display text-[28px] leading-[34px]">{title}</h2>
      <div className="flex flex-col gap-4 text-[17px] leading-[1.6] text-slate-600">{children}</div>
    </Card>
  );
}

function Quote({ children }: { children: React.ReactNode }) {
  return <p className="m-0 rounded-md border-l-4 border-peach-400 bg-cream px-4 py-3 whitespace-pre-line text-slate-900">{children}</p>;
}

function ApplicationForm({
  bodies,
  initial,
  emailReadOnly = false,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  bodies: Body[];
  initial: Fields;
  emailReadOnly?: boolean;
  submitLabel: string;
  /** Returns an error message, or null when it worked. */
  onSubmit: (f: Fields) => Promise<string | null>;
  onCancel?: () => void;
}) {
  const [f, setF] = useState(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [sending, setSending] = useState(false);
  const [formError, setFormError] = useState("");
  const set = (k: keyof Fields) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setF((s) => ({ ...s, [k]: e.target.value }));
    setErrors((s) => ({ ...s, [k]: "" }));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const next = validate(f, !emailReadOnly);
    setErrors(next);
    if (Object.keys(next).length > 0) return;
    setSending(true);
    setFormError((await onSubmit(f)) ?? "");
    setSending(false);
  };

  const err = (k: string) =>
    errors[k] ? (
      <p id={`${k}-error`} className="m-0 text-sm text-peach-700">
        {errors[k]}
      </p>
    ) : null;
  const a11y = (k: string) => ({ "aria-invalid": Boolean(errors[k]), "aria-describedby": errors[k] ? `${k}-error` : undefined });

  return (
    <Card id="apply" as="section" aria-labelledby="apply-title" className="flex scroll-mt-6 flex-col gap-6 self-start">
      <div className="flex flex-col gap-2">
        <h2 id="apply-title" className="m-0 font-display text-[28px] leading-[34px]">
          Apply to join
        </h2>
        <p className="m-0 text-slate-600">It takes two minutes. We&rsquo;ll be in touch about next steps.</p>
      </div>

      <form noValidate onSubmit={submit} className="flex flex-col gap-5">
        <div className="flex flex-col gap-2">
          <label htmlFor="ap-name" className="font-semibold">
            Full name
          </label>
          <input id="ap-name" autoComplete="name" value={f.name} onChange={set("name")} className={field} {...a11y("name")} />
          {err("name")}
        </div>

        {emailReadOnly ? (
          <p className="m-0 text-[15px] text-slate-600">
            We&rsquo;ll reply to <b className="text-slate-900">{f.email}</b>, the email you signed in with.
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            <label htmlFor="ap-email" className="font-semibold">
              Email
            </label>
            <input id="ap-email" type="email" autoComplete="email" value={f.email} onChange={set("email")} className={field} {...a11y("email")} />
            {err("email")}
          </div>
        )}

        <fieldset className="m-0 flex flex-col gap-2 border-0 p-0" {...a11y("role")}>
          <legend className="mb-2 p-0 font-semibold">Your role</legend>
          <div className="grid gap-2 sm:grid-cols-3">
            {roleKinds.map((r) => (
              <label
                key={r.value}
                className={cn(
                  "flex min-h-12 cursor-pointer items-center gap-2.5 rounded-md border px-3.5 text-[15px]",
                  f.role === r.value ? "border-2 border-peach-500 bg-peach-50" : "border-border bg-white",
                )}
              >
                <input type="radio" name="role" value={r.value} checked={f.role === r.value} onChange={set("role")} className="size-[18px] accent-peach-700" />
                {r.label}
              </label>
            ))}
          </div>
          {err("role")}
        </fieldset>

        {f.role === "clinician" && (
          <div className="flex flex-col gap-2">
            <label htmlFor="ap-license" className="font-semibold">
              License type and state
            </label>
            <input id="ap-license" value={f.license} onChange={set("license")} placeholder="e.g. LMFT, California" className={field} {...a11y("license")} />
            {err("license")}
          </div>
        )}

        <div className="flex flex-col gap-2">
          <label htmlFor="ap-body" className="font-semibold">
            Who accredits you?
          </label>
          <select id="ap-body" value={f.body} onChange={set("body")} className={field} {...a11y("body")}>
            <option value="">Choose one</option>
            {bodies.map((b) => (
              <option key={b.slug} value={b.slug}>
                {b.name}
              </option>
            ))}
            <option value={NOT_LISTED}>Mine isn&rsquo;t listed</option>
          </select>
          {err("body")}
        </div>

        {f.body === NOT_LISTED && (
          <div className="flex flex-col gap-2">
            <label htmlFor="ap-church" className="font-semibold">
              Church or denomination name
            </label>
            <input id="ap-church" value={f.church} onChange={set("church")} className={field} {...a11y("church")} />
            <span className="text-[13px] text-slate-600">We&rsquo;ll invite them to publish their requirements.</span>
            {err("church")}
          </div>
        )}

        <div className="flex flex-col gap-2">
          <label htmlFor="ap-note" className="font-semibold">
            Anything else? <span className="font-normal text-slate-600">(optional)</span>
          </label>
          <textarea
            id="ap-note"
            rows={3}
            value={f.note}
            onChange={set("note")}
            placeholder="Who you serve, languages, anything we should know."
            className="resize-y rounded-md border border-border bg-cream px-4 py-3 text-base leading-[1.6]"
          />
        </div>

        {formError && (
          <p role="alert" className="m-0 text-sm text-peach-700">
            {formError}
          </p>
        )}
        <div className="flex flex-wrap items-center gap-4">
          <Button type="submit" size="lg" className="min-h-14 text-base" disabled={sending}>
            {sending ? "Sending…" : submitLabel}
          </Button>
          {onCancel && (
            <Button variant="link" onClick={onCancel} className="px-0!">
              Cancel
            </Button>
          )}
        </div>
      </form>
    </Card>
  );
}
