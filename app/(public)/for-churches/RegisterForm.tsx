"use client";

import { useEffect, useState } from "react";
import { CircleCheck, Clock } from "lucide-react";
import { ChurchTracker, useMyChurchApplication } from "@/components/ChurchProgress";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/cn";
import { useProto } from "@/lib/prototype/store";
import { authEnabled, ownChurch, supabaseBrowser, useAuthState } from "@/lib/supabase/client";

const kinds = [
  { value: "church", label: "A church" },
  { value: "denomination", label: "A denomination or network" },
];

const programs = [
  { value: "yes", label: "Yes, we accredit counselors" },
  { value: "building", label: "We’re building one" },
  { value: "no", label: "Not yet" },
];

const field = "min-h-12 w-full rounded-md border border-border bg-cream px-4 text-base aria-invalid:border-peach-700";

export type ChurchApplication = {
  id: string;
  kind: "church" | "denomination";
  org_name: string;
  city: string;
  tradition: string;
  contact_name: string;
  contact_role: string;
  email: string;
  program: "yes" | "building" | "no";
  member_care: boolean;
  status: "submitted" | "needs_info" | "approved" | "declined";
  admin_note: string;
  church_id: string | null;
  submitted_at: string;
  reviewed_at: string | null;
};

type Fields = { kind: string; org: string; city: string; tradition: string; contact: string; role: string; email: string; program: string; memberCare: boolean };

/** With real accounts, registering is an application FaithWellness reviews; approval creates the church account. */
export function RegisterForm() {
  return authEnabled ? <RealRegister /> : <PrototypeRegister />;
}

function RealRegister() {
  const auth = useAuthState();
  const s = useProto();
  const [app, setApp] = useState<ChurchApplication | null | "loading">("loading");
  const [editing, setEditing] = useState(false);
  // How many members have joined, for the tracker's last step.
  const members = useMyChurchApplication()?.members ?? 0;

  useEffect(() => {
    if (auth === "signed-out") return setApp(null);
    if (auth !== "signed-in") return;
    supabaseBrowser()
      .from("church_applications")
      .select("*")
      .maybeSingle()
      .then(({ data }) => setApp((data as ChurchApplication | null) ?? null));
  }, [auth]);

  if (auth === "loading" || app === "loading") {
    return <Card id="register" aria-busy="true" className="h-96 scroll-mt-6 animate-pulse self-start bg-cream-200!" />;
  }
  if (auth === "signed-out") {
    return (
      <Card id="register" as="section" aria-labelledby="register-title" className="flex scroll-mt-6 flex-col gap-4 self-start">
        <h2 id="register-title" className="m-0 font-display text-[28px] leading-[34px]">
          Register your church
        </h2>
        <p className="m-0 text-[17px] leading-[1.6] text-slate-600">
          Sign in first, with the email of the person who&rsquo;ll manage your church on FaithWellness. Once we approve your
          church, its dashboard opens on that account.
        </p>
        <Button href={`/sign-in?next=${encodeURIComponent("/for-churches#register")}`} size="lg" className="self-start">
          Sign in to register
        </Button>
      </Card>
    );
  }

  if (app && !editing) {
    const org = app.org_name;
    const tracker = <ChurchTracker app={app} members={members} />;
    const card = (title: string, children: React.ReactNode, good = false) => (
      <Card id="register" as="section" aria-label={title} className="flex scroll-mt-6 flex-col gap-4 self-start">
        <span className={cn("flex size-14 items-center justify-center rounded-lg", good ? "bg-sage-100" : "bg-peach-100")}>
          {good ? (
            <CircleCheck size={28} strokeWidth={1.8} className="text-sage-700" aria-hidden="true" />
          ) : (
            <Clock size={28} strokeWidth={1.8} className="text-peach-700" aria-hidden="true" />
          )}
        </span>
        <h2 className="m-0 font-display text-[28px] leading-[34px]">{title}</h2>
        {children}
      </Card>
    );
    if (app.status === "approved") {
      return card(
        `${org} is on FaithWellness`,
        <>
          <p className="m-0 text-[17px] leading-[1.6] text-slate-600">
            Your church dashboard is ready: approve members, share your member code, and see your counselors.
          </p>
          {tracker}
          {ownChurch && (
            <Button href={`/church/${ownChurch.slug}`} size="lg" className="self-start">
              Open your church dashboard
            </Button>
          )}
        </>,
        true,
      );
    }
    if (app.status === "needs_info" || app.status === "declined") {
      return card(
        app.status === "needs_info" ? "We need a little more information" : "We couldn’t approve this registration",
        <>
          {app.admin_note && <p className="m-0 rounded-md border-l-4 border-peach-400 bg-cream px-4 py-3 text-[15px] whitespace-pre-line">{app.admin_note}</p>}
          {tracker}
          <Button size="lg" className="self-start" onClick={() => setEditing(true)}>
            {app.status === "needs_info" ? "Update our registration" : "Register again"}
          </Button>
        </>,
      );
    }
    return card(
      `Thank you, ${org}`,
      <>
        <p className="m-0 text-[17px] leading-[1.6] text-slate-600">
          We&rsquo;ve received your registration and will review it within a few days. We&rsquo;ll email {app.email} when
          your church dashboard is ready. You can check back here any time.
        </p>
        {tracker}
        <Button variant="link" className="self-start px-0!" onClick={() => setEditing(true)}>
          Edit our answers
        </Button>
      </>,
    );
  }

  const initial: Fields = app
    ? {
        kind: app.kind,
        org: app.org_name,
        city: app.city,
        tradition: app.tradition,
        contact: app.contact_name,
        role: app.contact_role,
        email: app.email,
        program: app.program,
        memberCare: app.member_care,
      }
    : { ...blank, contact: s?.user?.name ?? "", email: s?.user?.email ?? "" };

  return (
    <RegisterFields
      initial={initial}
      emailReadOnly
      submitLabel={app ? "Send updated registration" : "Register"}
      onSubmit={async (f) => {
        const { data, error } = await supabaseBrowser()
          .rpc("submit_church_application", {
            p_kind: f.kind,
            p_org_name: f.org,
            p_city: f.city,
            p_tradition: f.tradition,
            p_contact_name: f.contact,
            p_contact_role: f.role,
            p_program: f.program,
            p_member_care: f.memberCare,
          })
          .single();
        if (error) return "We couldn’t send your registration. Please try again.";
        setApp(data as ChurchApplication);
        setEditing(false);
        return null;
      }}
    />
  );
}

const blank: Fields = { kind: "church", org: "", city: "", tradition: "", contact: "", role: "", email: "", program: "", memberCare: true };

/** PROTOTYPE ONLY (no Supabase keys): validates and shows the confirmation, but sends nothing. */
function PrototypeRegister() {
  const [sentFields, setSentFields] = useState<Fields | null>(null);
  if (sentFields) {
    const f = sentFields;
    const org = f.org.trim();
    return (
      <Card id="register" as="section" aria-label="Registration sent" className="flex scroll-mt-6 flex-col gap-4 self-start">
        <span className="flex size-14 items-center justify-center rounded-lg bg-sage-100">
          <CircleCheck size={28} strokeWidth={1.8} className="text-sage-700" aria-hidden="true" />
        </span>
        <h2 className="m-0 font-display text-[28px] leading-[34px]">Welcome to the network, {org}</h2>
        <p className="m-0 text-[17px] leading-[1.6] text-slate-600">
          We&rsquo;ll email {f.email.trim()} within a few days to set up your {f.kind === "church" ? "church" : "denomination"}&rsquo;s account.
          {f.program === "yes"
            ? " Next you’ll add your accreditation requirements so we can publish your page."
            : " We’ll share a simple template to help you put your accreditation program into words."}
          {f.memberCare && " Then you can turn on free member care for your congregation."}
        </p>
        <p className="m-0 rounded-md border border-dashed border-peach-400 bg-peach-50 px-4 py-3 text-sm text-peach-800">
          Prototype: nothing was sent or saved.
        </p>
        <Button variant="link" onClick={() => setSentFields(null)} className="self-start px-0!">
          Edit my answers
        </Button>
      </Card>
    );
  }
  return (
    <RegisterFields
      initial={blank}
      submitLabel="Register"
      onSubmit={async (f) => {
        setSentFields(f);
        return null;
      }}
    />
  );
}

/** The registration form itself. onSubmit returns an error message, or null when it worked. */
function RegisterFields({
  initial,
  emailReadOnly = false,
  submitLabel,
  onSubmit,
}: {
  initial: Fields;
  emailReadOnly?: boolean;
  submitLabel: string;
  onSubmit: (f: Fields) => Promise<string | null>;
}) {
  const [f, setF] = useState<Fields>(initial);
  const [sending, setSending] = useState(false);
  const [formError, setFormError] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const set = (k: keyof Fields) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const v = e.target.type === "checkbox" ? (e.target as HTMLInputElement).checked : e.target.value;
    setF((s) => ({ ...s, [k]: v }));
    setErrors((s) => ({ ...s, [k]: "" }));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const next: Record<string, string> = {};
    if (!f.org.trim()) next.org = `Add your ${f.kind === "church" ? "church" : "denomination"}’s name.`;
    if (!f.city.trim()) next.city = "Add a city and state, or region.";
    if (!f.contact.trim()) next.contact = "Add the name of the person managing this.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email.trim())) next.email = "Enter an email address like pastor@church.org.";
    if (!f.program) next.program = "Choose the closest option.";
    setErrors(next);
    if (Object.keys(next).length) return;
    setSending(true);
    setFormError((await onSubmit(f)) ?? "");
    setSending(false);
  };

  const err = (k: string) =>
    errors[k] ? (
      <p id={`rg-${k}-error`} className="m-0 text-sm text-peach-700">
        {errors[k]}
      </p>
    ) : null;
  const a11y = (k: string) => ({ "aria-invalid": Boolean(errors[k]), "aria-describedby": errors[k] ? `rg-${k}-error` : undefined });

  return (
    <Card id="register" as="section" aria-labelledby="register-title" className="flex scroll-mt-6 flex-col gap-6 self-start">
      <div className="flex flex-col gap-2">
        <h2 id="register-title" className="m-0 font-display text-[28px] leading-[34px]">
          Register your church
        </h2>
        <p className="m-0 text-slate-600">A few details to start. We&rsquo;ll help with the rest.</p>
      </div>

      <form noValidate onSubmit={submit} className="flex flex-col gap-5">
        <fieldset className="m-0 flex flex-col gap-2 border-0 p-0">
          <legend className="mb-2 p-0 font-semibold">You&rsquo;re registering</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {kinds.map((k) => (
              <label
                key={k.value}
                className={cn(
                  "flex min-h-12 cursor-pointer items-center gap-2.5 rounded-md border px-3.5 text-[15px]",
                  f.kind === k.value ? "border-2 border-peach-500 bg-peach-50" : "border-border bg-white",
                )}
              >
                <input type="radio" name="kind" value={k.value} checked={f.kind === k.value} onChange={set("kind")} className="size-[18px] accent-peach-700" />
                {k.label}
              </label>
            ))}
          </div>
        </fieldset>

        <div className="flex flex-col gap-2">
          <label htmlFor="rg-org" className="font-semibold">
            {f.kind === "church" ? "Church name" : "Denomination or network name"}
          </label>
          <input id="rg-org" value={f.org} onChange={set("org")} autoComplete="organization" className={field} {...a11y("org")} />
          {err("org")}
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <label htmlFor="rg-city" className="font-semibold">
              City and state
            </label>
            <input id="rg-city" value={f.city} onChange={set("city")} placeholder="e.g. Pasadena, CA" className={field} {...a11y("city")} />
            {err("city")}
          </div>
          <div className="flex flex-col gap-2">
            <label htmlFor="rg-tradition" className="font-semibold">
              Tradition <span className="font-normal text-slate-600">(optional)</span>
            </label>
            <input id="rg-tradition" value={f.tradition} onChange={set("tradition")} placeholder="e.g. Baptist" className={field} />
          </div>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <label htmlFor="rg-contact" className="font-semibold">
              Your name
            </label>
            <input id="rg-contact" value={f.contact} onChange={set("contact")} autoComplete="name" className={field} {...a11y("contact")} />
            {err("contact")}
          </div>
          <div className="flex flex-col gap-2">
            <label htmlFor="rg-role" className="font-semibold">
              Your role <span className="font-normal text-slate-600">(optional)</span>
            </label>
            <input id="rg-role" value={f.role} onChange={set("role")} placeholder="e.g. Care pastor" className={field} />
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="rg-email" className="font-semibold">
            Email
          </label>
          <input
            id="rg-email"
            type="email"
            autoComplete="email"
            value={f.email}
            onChange={set("email")}
            readOnly={emailReadOnly}
            className={cn(field, emailReadOnly && "text-slate-600")}
            {...a11y("email")}
          />
          {emailReadOnly && <span className="text-[13px] text-slate-600">The email you signed in with. Your church dashboard opens on this account.</span>}
          {err("email")}
        </div>

        <fieldset className="m-0 flex flex-col gap-2 border-0 p-0" {...a11y("program")}>
          <legend className="mb-2 p-0 font-semibold">Do you have an accreditation program?</legend>
          <div className="flex flex-col gap-2">
            {programs.map((p) => (
              <label
                key={p.value}
                className={cn(
                  "flex min-h-12 cursor-pointer items-center gap-2.5 rounded-md border px-3.5 text-[15px]",
                  f.program === p.value ? "border-2 border-peach-500 bg-peach-50" : "border-border bg-white",
                )}
              >
                <input type="radio" name="program" value={p.value} checked={f.program === p.value} onChange={set("program")} className="size-[18px] accent-peach-700" />
                {p.label}
              </label>
            ))}
          </div>
          {err("program")}
        </fieldset>

        <label className="flex cursor-pointer items-start gap-3 text-[15px] leading-normal">
          <input type="checkbox" checked={f.memberCare} onChange={set("memberCare")} className="mt-0.5 size-5 flex-none accent-peach-700" />
          <span>We&rsquo;d like to offer free sessions to our members</span>
        </label>

        {formError && (
          <p role="alert" className="m-0 text-sm text-peach-700">
            {formError}
          </p>
        )}
        <Button type="submit" size="lg" className="min-h-14 text-base" disabled={sending}>
          {sending ? "Sending…" : submitLabel}
        </Button>
      </form>
    </Card>
  );
}
