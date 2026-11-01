"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { FilterChip } from "@/components/ui/FilterChip";
import { cn } from "@/lib/cn";
import { notify, supabaseBrowser } from "@/lib/supabase/client";
import type { ChurchApplication } from "../for-churches/RegisterForm";

type Status = ChurchApplication["status"];
const tabs: Status[] = ["submitted", "needs_info", "approved", "declined"];
const statusLabel: Record<Status, string> = { submitted: "To review", needs_info: "Waiting on them", approved: "Approved", declined: "Declined" };
const programLabel = { yes: "Has an accreditation program", building: "Building an accreditation program", no: "No accreditation program yet" };
const shortDate = (iso: string) => new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

/** FaithWellness admins review church registrations. Approving creates the church and makes the applicant its admin. */
export function ChurchApplications() {
  const [apps, setApps] = useState<ChurchApplication[] | null>(null);
  const [tab, setTab] = useState<Status>("submitted");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    supabaseBrowser()
      .from("church_applications")
      .select("*")
      .order("submitted_at", { ascending: false })
      .then(({ data }) => setApps((data as ChurchApplication[] | null) ?? []));
  }, []);

  const counts = useMemo(() => Object.fromEntries(tabs.map((t) => [t, apps?.filter((a) => a.status === t).length ?? 0])), [apps]);
  if (!apps) return <div className="h-96 animate-pulse rounded-xl bg-cream-200" aria-busy="true" />;
  const shown = apps.filter((a) => a.status === tab);
  const selected = apps.find((a) => a.id === selectedId) ?? null;

  return (
    <>
      <div className="flex flex-wrap gap-2" role="group" aria-label="Show church registrations">
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
                      <b className="truncate text-[15px]">{a.org_name}</b>
                      <span className="truncate text-[13px] text-slate-600">
                        {a.city} · {a.contact_name}
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
          <Review key={selected.id} app={selected} onSaved={(u) => setApps((list) => list?.map((a) => (a.id === u.id ? u : a)) ?? null)} />
        ) : (
          <Card className="hidden text-slate-600 lg:block">Choose a registration to review it.</Card>
        )}
      </div>
    </>
  );
}

function Review({ app, onSaved }: { app: ChurchApplication; onSaved: (a: ChurchApplication) => void }) {
  const [message, setMessage] = useState(app.status === "approved" ? "" : app.admin_note);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const decide = async (decision: "approved" | "needs_info" | "declined") => {
    if (decision !== "approved" && !message.trim()) return setError("Add a message so they know what to do next.");
    setError("");
    setSaving(true);
    const { data, error } = await supabaseBrowser()
      .rpc("review_church_application", { p_id: app.id, p_decision: decision, p_note: decision === "approved" ? "" : message.trim() })
      .single();
    setSaving(false);
    if (error) return setError("That didn’t save. Please try again.");
    notify("church-application-decided", app.id);
    onSaved(data as ChurchApplication);
  };

  return (
    <Card as="section" aria-label={`Registration from ${app.org_name}`} className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h2 className="m-0 font-display text-[26px] leading-8">{app.org_name}</h2>
        <span className="text-slate-600">
          {app.kind === "church" ? "Church" : "Denomination or network"} · {statusLabel[app.status]}
        </span>
      </div>
      <dl className="m-0 grid grid-cols-[minmax(0,10rem)_minmax(0,1fr)] gap-x-4 gap-y-2.5 text-[15px]">
        <dt className="font-semibold text-slate-600">City</dt>
        <dd className="m-0">{app.city}</dd>
        <dt className="font-semibold text-slate-600">Tradition</dt>
        <dd className="m-0">{app.tradition || "Not given"}</dd>
        <dt className="font-semibold text-slate-600">Contact</dt>
        <dd className="m-0">
          {app.contact_name}
          {app.contact_role && `, ${app.contact_role}`}
        </dd>
        <dt className="font-semibold text-slate-600">Email</dt>
        <dd className="m-0 break-all">
          <a href={`mailto:${app.email}`}>{app.email}</a>
        </dd>
        <dt className="font-semibold text-slate-600">Accreditation</dt>
        <dd className="m-0">{programLabel[app.program]}</dd>
        <dt className="font-semibold text-slate-600">Member Benefits</dt>
        <dd className="m-0">{app.member_care ? "Wants to offer free sessions to members" : "Not for now"}</dd>
        <dt className="font-semibold text-slate-600">Sent</dt>
        <dd className="m-0">{shortDate(app.submitted_at)}</dd>
      </dl>

      {app.status === "approved" ? (
        <p className="m-0 rounded-md bg-sage-100 px-4 py-3 text-[15px] text-sage-700">
          Approved. {app.contact_name} manages {app.org_name}&rsquo;s dashboard.
        </p>
      ) : (
        <div className="flex flex-col gap-4 border-t border-border-warm pt-5">
          <p className="m-0 text-[15px] text-slate-600">
            Check it&rsquo;s a real church and that {app.contact_name} can act for it (for example, call the church office).
            Approving creates the church, {app.member_care ? "turns on Member Benefits with a starting member code, " : ""}and
            opens its dashboard for {app.email}.
          </p>
          <label className="flex flex-col gap-1.5 text-sm font-semibold">
            <span>
              Message to them <span className="font-normal text-slate-600">(needed to ask for more info or decline)</span>
            </span>
            <textarea
              rows={3}
              value={message}
              onChange={(e) => {
                setMessage(e.target.value);
                setError("");
              }}
              className="w-full rounded-md border border-border bg-cream px-4 py-3 text-base font-normal"
            />
          </label>
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
    </Card>
  );
}
