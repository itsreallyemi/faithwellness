"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ChevronRight, Mail } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { FilterChip } from "@/components/ui/FilterChip";
import { cn } from "@/lib/cn";
import { NOT_LISTED, roleLabel, shortDate, statusLabel, type Application, type ApplicationStatus } from "@/lib/applications";
import { contactEmail } from "@/lib/site";
import { authEnabled, supabaseBrowser, useAuthState } from "@/lib/supabase/client";

type Body = { slug: string; name: string };

const tabs: ApplicationStatus[] = ["submitted", "needs_info", "approved", "declined"];
const textarea = "min-h-24 w-full resize-y rounded-md border border-border bg-cream px-4 py-3 text-base leading-[1.6] aria-invalid:border-peach-700";

/** FaithWellness staff only. The database also refuses these reads and actions for anyone who isn't an admin. */
export function AdminView({ bodies }: { bodies: Body[] }) {
  const auth = useAuthState();
  const [admin, setAdmin] = useState<boolean | null>(null);
  const [apps, setApps] = useState<Application[] | null>(null);
  const [tab, setTab] = useState<ApplicationStatus>("submitted");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    if (auth !== "signed-in") return;
    const sb = supabaseBrowser();
    sb.rpc("is_admin").then(({ data }) => {
      setAdmin(Boolean(data));
      if (!data) return;
      sb.from("counselor_applications")
        .select("*")
        .order("submitted_at", { ascending: false })
        .then(({ data: rows }) => setApps((rows as Application[] | null) ?? []));
    });
  }, [auth]);

  const counts = useMemo(() => Object.fromEntries(tabs.map((t) => [t, apps?.filter((a) => a.status === t).length ?? 0])), [apps]);
  const shown = apps?.filter((a) => a.status === tab) ?? [];
  const selected = apps?.find((a) => a.id === selectedId) ?? null;
  const bodyName = (a: Application) =>
    a.accrediting_body === NOT_LISTED ? `${a.church_name} (not listed)` : (bodies.find((b) => b.slug === a.accrediting_body)?.name ?? a.accrediting_body);

  if (!authEnabled) return <Note title="Admin">Sign-in isn&rsquo;t set up in this copy of the site.</Note>;
  if (auth === "loading" || (auth === "signed-in" && (admin === null || (admin && apps === null)))) {
    return <div className="h-96 animate-pulse rounded-xl bg-cream-200" aria-busy="true" />;
  }
  if (auth === "signed-out") {
    return (
      <Note title="FaithWellness admin">
        <p className="m-0">Sign in with your FaithWellness admin account.</p>
        <Button href="/sign-in?next=/admin" size="lg" className="self-start">
          Sign in
        </Button>
      </Note>
    );
  }
  if (!admin) return <Note title="FaithWellness admin">This page is for FaithWellness staff. Your account doesn&rsquo;t have access.</Note>;

  return (
    <>
      <header className="flex flex-col gap-3">
        <span className="label-overline text-peach-700!">FaithWellness admin</span>
        <h1 className="m-0 font-display text-[32px] leading-[1.1] md:text-[40px]">Counselor applications</h1>
        <p className="m-0 max-w-[720px] text-slate-600">
          Confirm each accreditation with the church or denomination before approving. Approving opens the counselor&rsquo;s
          portal. Their profile goes live once they&rsquo;ve completed it.
        </p>
      </header>

      <div className="flex flex-wrap gap-2" role="group" aria-label="Show applications">
        {tabs.map((t) => (
          <FilterChip
            key={t}
            selected={tab === t}
            onChange={() => {
              setTab(t);
              setSelectedId(null);
            }}
          >
            {statusLabel[t]} ({counts[t]})
          </FilterChip>
        ))}
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <Card padding="none" className="overflow-hidden">
          {shown.length === 0 ? (
            <p className="m-0 p-6 text-slate-600">Nothing here right now.</p>
          ) : (
            <ul className="m-0 list-none p-0">
              {shown.map((a) => (
                <li key={a.id} className="border-b border-border-warm last:border-b-0">
                  <button
                    type="button"
                    onClick={() => setSelectedId(a.id)}
                    aria-current={a.id === selectedId ? "true" : undefined}
                    className={cn(
                      "flex min-h-16 w-full cursor-pointer items-center gap-3 px-5 py-3 text-left hover:bg-cream",
                      a.id === selectedId && "bg-peach-50 hover:bg-peach-50",
                    )}
                  >
                    <span className="flex min-w-0 flex-1 flex-col">
                      <b className="truncate text-[15px]">{a.full_name}</b>
                      <span className="truncate text-[13px] text-slate-600">
                        {roleLabel(a.role_kind)} · {bodyName(a)}
                      </span>
                    </span>
                    <span className="flex-none text-[13px] text-slate-600">{shortDate(a.submitted_at)}</span>
                    <ChevronRight size={18} strokeWidth={1.8} className="flex-none text-slate-500" aria-hidden="true" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {selected ? (
          <Review
            key={selected.id}
            app={selected}
            bodyName={bodyName(selected)}
            bodySlug={selected.accrediting_body === NOT_LISTED ? null : selected.accrediting_body}
            onSaved={(updated) => setApps((list) => list?.map((a) => (a.id === updated.id ? updated : a)) ?? null)}
          />
        ) : (
          <Card className="hidden text-slate-600 lg:block">Choose an application to review it.</Card>
        )}
      </div>
    </>
  );
}

function Review({
  app,
  bodyName,
  bodySlug,
  onSaved,
}: {
  app: Application;
  bodyName: string;
  bodySlug: string | null;
  onSaved: (a: Application) => void;
}) {
  const [confirmed, setConfirmed] = useState(app.accreditation_confirmed);
  const [howConfirmed, setHowConfirmed] = useState(app.confirmation_note);
  const [message, setMessage] = useState(app.status === "approved" ? "" : app.admin_note);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [justDecided, setJustDecided] = useState<ApplicationStatus | null>(null);

  const decide = async (decision: "approved" | "needs_info" | "declined") => {
    if (decision === "approved" && !confirmed) return setError("Tick the box once you’ve confirmed the accreditation.");
    if (decision !== "approved" && !message.trim()) return setError("Add a message so the applicant knows what to do next.");
    setError("");
    setSaving(true);
    const { data, error } = await supabaseBrowser()
      .rpc("review_counselor_application", {
        p_id: app.id,
        p_decision: decision,
        p_admin_note: decision === "approved" ? "" : message.trim(),
        p_confirmed: confirmed,
        p_confirmation_note: howConfirmed.trim(),
      })
      .single();
    setSaving(false);
    if (error) return setError("That didn’t save. Please try again.");
    setJustDecided(decision);
    onSaved(data as Application);
  };

  const firstName = app.full_name.trim().split(" ")[0];
  const reviewable = app.status !== "approved";
  const emailDraft = draftEmail(justDecided ?? app.status, firstName, message.trim());

  return (
    <Card as="section" aria-label={`Application from ${app.full_name}`} className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h2 className="m-0 font-display text-[26px] leading-[32px]">{app.full_name}</h2>
          <a href={`mailto:${app.email}`} className="text-[15px] break-all">
            {app.email}
          </a>
        </div>
        <Badge variant={app.status === "approved" ? "credential" : app.status === "submitted" ? "accent" : "tag"}>
          {statusLabel[app.status]}
        </Badge>
      </div>

      <dl className="m-0 grid gap-x-6 gap-y-3 text-[15px] sm:grid-cols-[max-content_1fr]">
        <Row label="Role">{roleLabel(app.role_kind)}</Row>
        {app.license && <Row label="License">{app.license}</Row>}
        <Row label="Accredited by">
          {bodySlug ? <Link href={`/accreditation/${bodySlug}`}>{bodyName}</Link> : bodyName}
        </Row>
        <Row label="Applied">{shortDate(app.submitted_at)}</Row>
        {app.note && <Row label="Their note">{app.note}</Row>}
        {app.reviewed_at && <Row label="Last reviewed">{shortDate(app.reviewed_at)}</Row>}
      </dl>

      {app.status === "approved" && !justDecided ? (
        <div className="flex flex-col gap-2 rounded-md bg-sage-100 px-4 py-3 text-[15px] text-sage-700">
          <b>Approved. Their counselor portal is open.</b>
          <span>Their profile goes live on its own once they&rsquo;ve completed it.</span>
          {app.confirmation_note && <span>How it was confirmed: {app.confirmation_note}</span>}
        </div>
      ) : null}

      {reviewable && (
        <div className="flex flex-col gap-5 border-t border-border-warm pt-5">
          <h3 className="m-0 text-lg font-semibold">Your review</h3>
          <label className="flex cursor-pointer items-start gap-3 text-[15px]">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(e) => {
                setConfirmed(e.target.checked);
                setError("");
              }}
              className="mt-1 size-[18px] flex-none accent-peach-700"
            />
            <span>
              I confirmed this accreditation with <b>{bodyName}</b>
              {app.license ? ", and checked their license" : ""}.
            </span>
          </label>
          <div className="flex flex-col gap-2">
            <label htmlFor="how" className="font-semibold">
              How you confirmed it <span className="font-normal text-slate-600">(for your records)</span>
            </label>
            <textarea
              id="how"
              value={howConfirmed}
              onChange={(e) => setHowConfirmed(e.target.value)}
              placeholder="e.g. Called Pastor James at Grace Fellowship on Oct 29."
              className={textarea}
            />
          </div>
          <div className="flex flex-col gap-2">
            <label htmlFor="msg" className="font-semibold">
              Message to the applicant <span className="font-normal text-slate-600">(needed to ask for more or decline)</span>
            </label>
            <textarea
              id="msg"
              value={message}
              onChange={(e) => {
                setMessage(e.target.value);
                setError("");
              }}
              placeholder="They see this on their application. e.g. Please add the year you were accredited."
              className={textarea}
            />
          </div>
          {error && (
            <p role="alert" className="m-0 text-sm text-peach-700">
              {error}
            </p>
          )}
          <div className="flex flex-wrap gap-3">
            <Button size="lg" disabled={saving} onClick={() => decide("approved")}>
              Approve
            </Button>
            <Button variant="secondary" size="lg" disabled={saving} onClick={() => decide("needs_info")}>
              Ask for more info
            </Button>
            <Button variant="link" disabled={saving} onClick={() => decide("declined")} className="min-h-[52px]">
              Decline
            </Button>
          </div>
        </div>
      )}

      {justDecided && (
        <div className="flex flex-col gap-3 rounded-md border border-border-warm bg-cream px-4 py-4 text-[15px]">
          <b>Saved: {statusLabel[justDecided].toLowerCase()}.</b>
          <span className="text-slate-600">
            FaithWellness doesn&rsquo;t send emails automatically yet. Let {firstName} know from {contactEmail}:
          </span>
          <Button
            variant="secondary"
            href={`mailto:${app.email}?subject=${encodeURIComponent(emailDraft.subject)}&body=${encodeURIComponent(emailDraft.body)}`}
            className="self-start"
          >
            <Mail size={18} strokeWidth={1.8} aria-hidden="true" />
            Email {firstName}
          </Button>
        </div>
      )}
    </Card>
  );
}

function draftEmail(status: ApplicationStatus, firstName: string, message: string) {
  const site = "https://www.faithwellnesscounseling.com";
  if (status === "approved")
    return {
      subject: "You're approved on FaithWellness",
      body: `Hi ${firstName},\n\nGood news: we've confirmed your accreditation and approved your application.\n\nSign in at ${site}/portal with this email address to set up your profile, hours and fees. Your profile goes live as soon as it's complete.\n\nWelcome to FaithWellness,\nThe FaithWellness team`,
    };
  if (status === "needs_info")
    return {
      subject: "A question about your FaithWellness application",
      body: `Hi ${firstName},\n\nThank you for applying to FaithWellness. Before we can finish reviewing your application, we need a little more information:\n\n${message}\n\nYou can update your application at ${site}/for-counselors#apply.\n\nThank you,\nThe FaithWellness team`,
    };
  return {
    subject: "Your FaithWellness application",
    body: `Hi ${firstName},\n\nThank you for applying to FaithWellness. We're not able to approve your application at this time.\n\n${message}\n\nIf you have questions, just reply to this email.\n\nThe FaithWellness team`,
  };
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <>
      <dt className="font-semibold text-slate-600">{label}</dt>
      <dd className="m-0 whitespace-pre-line">{children}</dd>
    </>
  );
}

function Note({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card className="mx-auto flex w-full max-w-[560px] flex-col gap-4">
      <h1 className="m-0 font-display text-[30px] leading-[1.1]">{title}</h1>
      <div className="flex flex-col gap-4 text-slate-600">{children}</div>
    </Card>
  );
}
