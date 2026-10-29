"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { CalendarDays, Lock, Pencil, Plus, Trash2, Video, X } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { FilterChip } from "@/components/ui/FilterChip";
import { cn } from "@/lib/cn";
import { clock, QUARTER_HOURS, WEEK_ORDER, WEEKDAYS } from "@/lib/prototype/portal";
import type { AvailabilityRule } from "@/lib/types";
import { usePortal } from "../PortalShell";
import { field, PageHeader, Panel, smallButton } from "../ui";
import { ServicesSettings } from "./ServicesSettings";

type Tab = "scheduling" | "bio" | "fees" | "services" | "notifications";
const tabs: { id: Tab; label: string }[] = [
  { id: "scheduling", label: "Scheduling & calendar" },
  { id: "bio", label: "Bio" },
  { id: "fees", label: "Fees" },
  { id: "services", label: "Services" },
  { id: "notifications", label: "Notifications" },
];

export function SettingsView() {
  const { real } = usePortal();
  // Links like /portal/settings?tab=bio#focus (from the go-live checklist) open that tab and scroll to the section.
  const params = useSearchParams();
  // "profile" was the old name for the Bio tab.
  const asked = params.get("tab") === "profile" ? "bio" : params.get("tab");
  const wanted = tabs.find((t) => t.id === asked)?.id;
  const [tab, setTab] = useState<Tab>(wanted ?? "scheduling");
  useEffect(() => {
    if (wanted) setTab(wanted);
  }, [wanted, params]);
  useEffect(() => {
    const id = window.location.hash.slice(1);
    if (id) document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [tab, params]);
  return (
    <>
      <PageHeader title="Settings" sub="How clients book you, and when." aside={<TimeZone />} />
      <p className="m-0 rounded-md border border-dashed border-peach-400 bg-peach-50 px-4 py-3 text-sm text-peach-800">
        {real
          ? "Your profile, focus areas, fees and weekly hours save to your public profile. Google Calendar, days off and notifications are still a preview and stay in this browser."
          : "Prototype: changes are saved in this browser and used across your portal. Your public profile picks them up once the real database is connected."}
      </p>
      <div role="tablist" aria-label="Settings" className="flex flex-wrap gap-1 border-b border-border-warm">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              "-mb-px min-h-12 cursor-pointer border-b-2 border-transparent px-4 text-[15px] text-slate-600",
              tab === t.id && "border-peach-500 font-semibold text-slate-900",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>
      {tab === "scheduling" && (
        <div className="grid items-start gap-6 lg:grid-cols-2">
          <Calendar />
          <div className="flex flex-col gap-6">
            <SessionLengths />
            <WeeklyHours />
            <DaysOff />
          </div>
        </div>
      )}
      {tab === "bio" && <Profile />}
      {tab === "fees" && <Fees />}
      {tab === "services" && <ServicesSettings />}
      {tab === "notifications" && <Notifications />}
    </>
  );
}

function TimeZone() {
  const { settings, save } = usePortal();
  const [editing, setEditing] = useState(false);
  const zones = typeof Intl.supportedValuesOf === "function" ? Intl.supportedValuesOf("timeZone") : [settings.timeZone];
  if (editing) {
    return (
      <label className="flex flex-wrap items-center gap-2 text-sm">
        <span className="font-semibold">Your time zone</span>
        <select
          autoFocus
          value={settings.timeZone}
          onChange={(e) => {
            save({ timeZone: e.target.value }, "Time zone updated");
            setEditing(false);
          }}
          onBlur={() => setEditing(false)}
          className="min-h-11 rounded-md border border-border bg-white px-3 text-[15px]"
        >
          {zones.map((z) => (
            <option key={z} value={z}>
              {z.replace(/_/g, " ")}
            </option>
          ))}
        </select>
      </label>
    );
  }
  return (
    <span className="text-sm text-slate-600">
      Your time zone: <b className="text-slate-900">{settings.timeZone.replace(/_/g, " ")}</b> ·{" "}
      <button type="button" onClick={() => setEditing(true)} className="min-h-11 cursor-pointer font-semibold text-peach-700">
        change
      </button>
    </span>
  );
}

function Calendar() {
  const { settings, save } = usePortal();
  const g = settings.google;
  const [connecting, setConnecting] = useState(false);

  const connect = () => {
    // PROTOTYPE ONLY: stands in for Google's sign-in and permission screens.
    setConnecting(true);
    setTimeout(() => {
      save({ google: { ...g, connected: true } }, "Google Calendar connected");
      setConnecting(false);
    }, 1200);
  };

  return (
    <Panel id="calendar" title="Calendar & video" intro="Connect once. We check your calendar for conflicts and add Meet links.">
      <div className="flex flex-wrap items-center gap-3.5 rounded-lg border border-border p-4">
        <span className="flex size-11 flex-none items-center justify-center rounded-md bg-cream-200">
          <CalendarDays size={22} strokeWidth={1.8} aria-hidden="true" />
        </span>
        <span className="flex min-w-0 flex-[1_1_160px] flex-col">
          <b className="text-[15px]">Google Calendar</b>
          <span className="truncate text-[13px] text-slate-600">{g.connected ? g.email : "Needed before clients can book you"}</span>
        </span>
        {g.connected ? (
          <Badge>Connected</Badge>
        ) : (
          <Button onClick={connect} disabled={connecting} className={smallButton}>
            {connecting ? "Connecting…" : "Connect"}
          </Button>
        )}

        {!g.connected && (
          <span className="basis-full text-[13px] text-slate-600">
            You&rsquo;ll sign in with Google. FaithWellness never sees your password, and calendar events only say
            &ldquo;FaithWellness session.&rdquo;
          </span>
        )}

        {g.connected && (
          <div className="flex basis-full flex-col gap-2.5 border-t border-border pt-3">
            <fieldset className="m-0 flex flex-col gap-1 border-0 p-0">
              <legend className="mb-1 p-0 text-[13px] font-semibold">Check these calendars for conflicts</legend>
              {g.calendars.map((cal) => (
                <label key={cal} className="flex min-h-11 items-center gap-2.5 text-[15px]">
                  <input
                    type="checkbox"
                    checked={g.check.includes(cal)}
                    onChange={(e) =>
                      save({ google: { ...g, check: e.target.checked ? [...g.check, cal] : g.check.filter((c) => c !== cal) } })
                    }
                    className="size-5 accent-peach-700"
                  />
                  {cal}
                </label>
              ))}
              {g.check.length === 0 && (
                <span className="text-[13px] text-peach-800">Choose at least one, or clients could book over your commitments.</span>
              )}
            </fieldset>
            <label className="flex flex-col gap-1.5 text-[13px] font-semibold">
              Add sessions to
              <select
                value={g.writeTo}
                onChange={(e) => save({ google: { ...g, writeTo: e.target.value } }, "Saved")}
                className={`${field} min-h-11 text-[15px] font-normal`}
              >
                {g.calendars.map((cal) => (
                  <option key={cal}>{cal}</option>
                ))}
              </select>
            </label>
            <button
              type="button"
              onClick={() => save({ google: { ...g, connected: false } }, "Google Calendar disconnected")}
              className="min-h-11 cursor-pointer self-start text-sm font-semibold text-peach-700"
            >
              Disconnect Google Calendar
            </button>
          </div>
        )}
      </div>

      <label className="flex items-center gap-3.5 rounded-lg border border-border p-4">
        <span className="flex size-11 flex-none items-center justify-center rounded-md bg-cream-200">
          <Video size={22} strokeWidth={1.8} aria-hidden="true" />
        </span>
        <span className="flex min-w-0 flex-1 flex-col">
          <b className="text-[15px]">Auto-add Google Meet</b>
          <span className="text-[13px] text-slate-600">A private room on every confirmed session</span>
        </span>
        <input
          type="checkbox"
          checked={g.autoMeet}
          onChange={(e) => save({ google: { ...g, autoMeet: e.target.checked } }, e.target.checked ? "Meet links on" : "Meet links off")}
          className="size-5 flex-none accent-peach-700"
        />
      </label>
    </Panel>
  );
}

const dollars = (cents: number) => String(Math.round(cents / 100));

/** Which session lengths clients can book. Fees are on the Fees tab. */
function SessionLengths() {
  const { settings, save } = usePortal();
  const [draft, setDraft] = useState({ offers30: settings.offers30, offers60: settings.offers60 });
  const [error, setError] = useState("");
  const changed = draft.offers30 !== settings.offers30 || draft.offers60 !== settings.offers60;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft.offers30 && !draft.offers60) return setError("Offer at least one session length, or clients can’t book you.");
    setError("");
    save(draft, "Session lengths saved");
  };

  return (
    <Panel id="session-lengths" title="Session lengths">
      <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
        <div className="grid gap-3 sm:grid-cols-2">
          {([30, 60] as const).map((d) => {
            const key = d === 30 ? "offers30" : "offers60";
            return (
              <label
                key={d}
                className={cn("flex min-h-16 cursor-pointer items-center justify-between gap-2 rounded-lg border border-border p-4", !draft[key] && "bg-cream")}
              >
                <span className="flex flex-col">
                  <b className="text-base">{d} min</b>
                  <span className="text-[13px] text-slate-600">{d === 30 ? "Shorter check-in" : "Full session"}</span>
                </span>
                <input
                  type="checkbox"
                  checked={draft[key]}
                  onChange={(e) => setDraft({ ...draft, [key]: e.target.checked })}
                  aria-label={`Offer ${d} minute sessions`}
                  className="size-5 accent-peach-700"
                />
              </label>
            );
          })}
        </div>
        <div className="flex items-center gap-3 rounded-md bg-cream px-4 py-3.5">
          <Lock size={20} strokeWidth={1.8} className="flex-none" aria-hidden="true" />
          <span className="flex flex-col">
            <b className="text-sm">15-minute rest after every session</b>
            <span className="text-[13px] text-slate-600">Required for all counselors. Added to your calendar after each session.</span>
          </span>
        </div>
        {error && (
          <p role="alert" className="m-0 text-sm text-peach-800">
            {error}
          </p>
        )}
        <Button type="submit" className="self-start" disabled={!changed}>
          Save session lengths
        </Button>
      </form>
    </Panel>
  );
}

function summary(rules: AvailabilityRule[]) {
  return rules.map((r) => `${clock(r.start)} – ${clock(r.end)}`).join(" · ");
}

function WeeklyHours() {
  const { settings, save } = usePortal();
  const [editing, setEditing] = useState<number | null>(null);

  return (
    <Panel id="hours" title="Weekly hours" intro="Clients can only book inside these hours, in your time zone.">
      <ul className="m-0 flex list-none flex-col divide-y divide-border p-0">
        {WEEK_ORDER.map((day) => {
          const rules = settings.hours.filter((r) => r.weekday === day).sort((a, b) => a.start.localeCompare(b.start));
          return (
            <li key={day} className="py-1">
              {editing === day ? (
                <DayEditor
                  day={day}
                  initial={rules}
                  onCancel={() => setEditing(null)}
                  onSave={(next) => {
                    save({ hours: [...settings.hours.filter((r) => r.weekday !== day), ...next] }, `${WEEKDAYS[day]} hours saved`);
                    setEditing(null);
                  }}
                />
              ) : (
                <div className="flex min-h-12 items-center gap-3">
                  <b className="w-12 flex-none text-sm">{WEEKDAYS[day].slice(0, 3)}</b>
                  <span className={cn("flex-1 text-sm", rules.length === 0 && "text-slate-600")}>
                    {rules.length ? summary(rules) : "Unavailable"}
                  </span>
                  <button
                    type="button"
                    onClick={() => setEditing(day)}
                    aria-label={`Edit ${WEEKDAYS[day]}`}
                    className="flex size-11 flex-none cursor-pointer items-center justify-center rounded-md text-peach-700 hover:bg-cream"
                  >
                    <Pencil size={18} strokeWidth={1.8} aria-hidden="true" />
                  </button>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </Panel>
  );
}

function DayEditor({
  day,
  initial,
  onSave,
  onCancel,
}: {
  day: number;
  initial: AvailabilityRule[];
  onSave: (rules: AvailabilityRule[]) => void;
  onCancel: () => void;
}) {
  const [ranges, setRanges] = useState(initial.map((r) => ({ start: r.start, end: r.end })));
  const [error, setError] = useState("");
  const set = (i: number, patch: Partial<{ start: string; end: string }>) => setRanges(ranges.map((r, j) => (j === i ? { ...r, ...patch } : r)));

  const submit = () => {
    const sorted = [...ranges].sort((a, b) => a.start.localeCompare(b.start));
    if (sorted.some((r) => r.end <= r.start)) return setError("Each end time needs to be after its start time.");
    if (sorted.some((r, i) => i > 0 && r.start < sorted[i - 1].end)) return setError("These hours overlap. Adjust them so they don’t.");
    if (sorted.some((r) => minutes(r.end) - minutes(r.start) < 30)) return setError("Each block needs at least 30 minutes for a session.");
    onSave(sorted.map((r) => ({ weekday: day, ...r })));
  };

  return (
    <div className="flex flex-col gap-3 rounded-md bg-cream p-4">
      <b className="text-[15px]">{WEEKDAYS[day]}</b>
      {ranges.length === 0 && <span className="text-sm text-slate-600">Unavailable. Add hours to open this day.</span>}
      {ranges.map((r, i) => (
        <div key={i} className="flex flex-wrap items-center gap-2">
          <TimeSelect label={`Start ${i + 1}`} value={r.start} onChange={(v) => set(i, { start: v })} />
          <span aria-hidden="true">–</span>
          <TimeSelect label={`End ${i + 1}`} value={r.end} onChange={(v) => set(i, { end: v })} />
          <button
            type="button"
            onClick={() => setRanges(ranges.filter((_, j) => j !== i))}
            aria-label={`Remove ${clock(r.start)} to ${clock(r.end)}`}
            className="flex size-11 cursor-pointer items-center justify-center rounded-md text-slate-600 hover:bg-white"
          >
            <X size={18} strokeWidth={1.8} aria-hidden="true" />
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() => setRanges([...ranges, ranges.length ? { start: "13:00", end: "17:00" } : { start: "09:00", end: "17:00" }])}
        className="flex min-h-11 cursor-pointer items-center gap-1.5 self-start text-sm font-semibold text-peach-700"
      >
        <Plus size={16} strokeWidth={1.8} aria-hidden="true" />
        Add hours
      </button>
      {error && (
        <p role="alert" className="m-0 text-sm text-peach-800">
          {error}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        <Button className={smallButton} onClick={submit}>
          Save {WEEKDAYS[day]}
        </Button>
        <Button variant="secondary" className={smallButton} onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  );
}

const minutes = (hhmm: string) => Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3));

function TimeSelect({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label>
      <span className="sr-only">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="min-h-11 rounded-md border border-border bg-white px-3 text-[15px]"
      >
        {QUARTER_HOURS.map((t) => (
          <option key={t} value={t}>
            {clock(t)}
          </option>
        ))}
      </select>
    </label>
  );
}

function DaysOff() {
  const { settings, save } = usePortal();
  const [date, setDate] = useState("");
  const today = new Date().toLocaleDateString("en-CA", { timeZone: settings.timeZone });
  const upcoming = settings.daysOff.filter((d) => d >= today).sort();
  const pretty = (d: string) =>
    new Date(`${d}T12:00:00Z`).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });

  const add = (e: React.FormEvent) => {
    e.preventDefault();
    if (!date || settings.daysOff.includes(date)) return;
    save({ daysOff: [...settings.daysOff, date] }, `${pretty(date)} marked as a day off`);
    setDate("");
  };

  return (
    <Panel id="days-off" title="Days off" intro="Holidays, retreats or sick days. Clients can’t book you on these dates.">
      {upcoming.length > 0 && (
        <ul className="m-0 flex list-none flex-col divide-y divide-border p-0">
          {upcoming.map((d) => (
            <li key={d} className="flex min-h-12 items-center justify-between gap-3">
              <span className="text-[15px]">{pretty(d)}</span>
              <button
                type="button"
                onClick={() => save({ daysOff: settings.daysOff.filter((x) => x !== d) }, "Day off removed")}
                aria-label={`Remove ${pretty(d)}`}
                className="flex size-11 cursor-pointer items-center justify-center rounded-md text-slate-600 hover:bg-cream"
              >
                <Trash2 size={18} strokeWidth={1.8} aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}
      <form onSubmit={add} className="flex flex-wrap items-end gap-2">
        <label className="flex flex-col gap-1.5 text-[13px] font-semibold">
          Date
          <input type="date" min={today} value={date} onChange={(e) => setDate(e.target.value)} className={`${field} min-h-11 font-normal`} />
        </label>
        <Button type="submit" variant="secondary" className={smallButton} disabled={!date}>
          Add day off
        </Button>
      </form>
    </Panel>
  );
}

function Profile() {
  const { counselor, settings, save, real, live } = usePortal();
  const [draft, setDraft] = useState({ title: settings.title, summary: settings.summary, about: settings.about });
  const SUMMARY_MAX = 160;
  const tooLong = draft.summary.length > SUMMARY_MAX;

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[1.5fr_1fr]">
      <Panel
        id="profile"
        title="Your bio"
        action={
          live && (
            <Link href={`/counselors/${counselor.slug}`} className="text-sm font-semibold">
              View public profile
            </Link>
          )
        }
      >
        {real && (
          <div id="photo" className="flex scroll-mt-6 items-center gap-4 rounded-md bg-cream p-4">
            <Avatar name={counselor.name} src={counselor.avatarUrl} tint={counselor.avatarTint} size={64} />
            <div className="flex flex-col gap-0.5 text-sm">
              <b className="text-[15px]">Photo</b>
              <span className="text-slate-600">
                {counselor.avatarUrl ? "Shown on your profile and card. " : "Optional. Without one, your initials show instead. "}
                <Link href="/account" className="font-semibold">
                  {counselor.avatarUrl ? "Change it on your account page" : "Add one on your account page"}
                </Link>
              </span>
            </div>
          </div>
        )}
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (tooLong || !draft.title.trim()) return;
            save({ ...draft, title: draft.title.trim(), summary: draft.summary.trim(), about: draft.about.trim() }, "Profile saved");
          }}
        >
          <label className="flex flex-col gap-1.5 text-sm font-semibold">
            Title
            <input
              value={draft.title}
              onChange={(e) => setDraft({ ...draft, title: e.target.value })}
              aria-invalid={!draft.title.trim() || undefined}
              className={`${field} font-normal`}
            />
            <span className="font-normal text-slate-600">For example &ldquo;Pastoral Counselor&rdquo; or &ldquo;Marriage &amp; Family Therapist.&rdquo;</span>
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-semibold">
            Short summary
            <textarea
              rows={3}
              value={draft.summary}
              onChange={(e) => setDraft({ ...draft, summary: e.target.value })}
              aria-invalid={tooLong || undefined}
              className={`${field} py-3 font-normal`}
            />
            <span className={cn("font-normal", tooLong ? "text-peach-800" : "text-slate-600")}>
              Shown on your card in the directory. {draft.summary.length}/{SUMMARY_MAX} characters.
            </span>
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-semibold">
            About you
            <textarea
              rows={8}
              value={draft.about}
              onChange={(e) => setDraft({ ...draft, about: e.target.value })}
              className={`${field} py-3 font-normal`}
            />
            <span className="font-normal text-slate-600">Leave a blank line between paragraphs.</span>
          </label>
          <Button type="submit" className="self-start">
            Save profile
          </Button>
        </form>
      </Panel>

      <div className="flex flex-col gap-6">
        {real && <FocusAreas />}
      </div>
    </div>
  );
}

/** Session fees, sliding scale and insurance. Which lengths are offered is set under Scheduling. */
function Fees() {
  const { counselor, settings, save } = usePortal();
  const [fees, setFees] = useState({ 30: dollars(settings.fee30Cents), 60: dollars(settings.fee60Cents) });
  const [free, setFree] = useState({ 30: settings.free30, 60: settings.free60 });
  const [error, setError] = useState("");
  const offered = { 30: settings.offers30, 60: settings.offers60 };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const missing = ([30, 60] as const).filter((d) => offered[d] && !free[d] && !(Number(fees[d]) > 0));
    if (missing.length) return setError(`Add a fee for ${missing.map((d) => `${d}-minute`).join(" and ")} sessions, or choose Free.`);
    if ([fees[30], fees[60]].some((f) => Number(f) > 1000)) return setError("Fees can be up to $1,000.");
    setError("");
    save(
      {
        free30: free[30],
        free60: free[60],
        fee30Cents: free[30] ? 0 : (Number(fees[30]) || 0) * 100,
        fee60Cents: free[60] ? 0 : (Number(fees[60]) || 0) * 100,
      },
      "Fees saved",
    );
  };

  return (
    <div className="grid items-start gap-6 lg:grid-cols-2">
      <Panel id="fees" title="Session fees" intro="Clients see your fee only when they book, never in the directory.">
        <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
          <div className="grid gap-3 sm:grid-cols-2">
            {([30, 60] as const).map((d) => (
              <fieldset key={d} className={cn("m-0 flex flex-col gap-2.5 rounded-lg border border-border p-4", !offered[d] && "bg-cream")}>
                <legend className="sr-only">{d}-minute sessions</legend>
                <b className="text-base" aria-hidden="true">
                  {d} min
                </b>
                {offered[d] ? (
                  <>
                    <div role="radiogroup" aria-label={`${d}-minute sessions`} className="grid grid-cols-2 rounded-pill bg-cream-200 p-1">
                      {([false, true] as const).map((isFree) => (
                        <button
                          key={String(isFree)}
                          type="button"
                          role="radio"
                          aria-checked={free[d] === isFree}
                          onClick={() => {
                            setFree({ ...free, [d]: isFree });
                            setError("");
                          }}
                          className={cn(
                            "min-h-10 cursor-pointer rounded-pill text-sm",
                            free[d] === isFree && "bg-white font-semibold shadow-[0_1px_3px_rgba(45,55,72,.12)]",
                          )}
                        >
                          {isFree ? "Free" : "Fee"}
                        </button>
                      ))}
                    </div>
                    {free[d] ? (
                      <span className="text-[13px] text-slate-600">Clients book this session at no cost.</span>
                    ) : (
                      <span className="relative">
                        <span className="absolute top-1/2 left-4 -translate-y-1/2 text-base text-slate-600">$</span>
                        <input
                          inputMode="numeric"
                          value={fees[d]}
                          onChange={(e) => {
                            setFees({ ...fees, [d]: e.target.value.replace(/[^\d]/g, "") });
                            setError("");
                          }}
                          aria-label={`Fee for ${d} minute sessions`}
                          className={`${field} pl-8 text-slate-900`}
                        />
                      </span>
                    )}
                  </>
                ) : (
                  <span className="text-[13px] text-slate-600">
                    Not offered. Turn it on under <span className="font-semibold">Scheduling &amp; calendar</span>.
                  </span>
                )}
              </fieldset>
            ))}
          </div>
          {error && (
            <p role="alert" className="m-0 text-sm text-peach-800">
              {error}
            </p>
          )}
          <Button type="submit" className="self-start">
            Save fees
          </Button>
        </form>
      </Panel>
      <div className="flex flex-col gap-6">
        <Panel id="sliding-scale" title="Sliding scale">
          <label className="flex items-start gap-3 rounded-md bg-cream p-4">
            <input
              type="checkbox"
              checked={settings.slidingScale}
              onChange={(e) => save({ slidingScale: e.target.checked }, e.target.checked ? "Sliding scale on" : "Sliding scale off")}
              className="mt-0.5 size-5 flex-none accent-peach-700"
            />
            <span className="flex flex-col gap-0.5">
              <b className="text-[15px]">Offer a sliding scale</b>
              <span className="text-sm text-slate-600">
                Clients see &ldquo;Ask for a sliding-scale price&rdquo; when booking. Anyone can still offer what they can pay, and you
                choose whether to accept.
              </span>
            </span>
          </label>
        </Panel>
        {counselor.insurance.length > 0 && (
          <Panel id="insurance" title="Insurance you accept">
            <ul className="m-0 flex list-none flex-wrap gap-2 p-0">
              {counselor.insurance.map((p) => (
                <li key={p}>
                  <Badge variant="tag">{p}</Badge>
                </li>
              ))}
            </ul>
            <span className="text-sm text-slate-600">You verify coverage and bill the insurer yourself. FaithWellness doesn&rsquo;t file claims.</span>
          </Panel>
        )}
      </div>
    </div>
  );
}

/** What clients can filter the directory by. Real counselors only; samples keep their seeded areas. */
function FocusAreas() {
  const { counselor, focusAreas, saveFocus } = usePortal();
  const [picked, setPicked] = useState<string[]>(counselor.focusAreas);
  const changed = [...picked].sort().join() !== [...counselor.focusAreas].sort().join();
  return (
    <Panel id="focus" title="Focus areas" intro="Choose what you help with. Clients filter the directory by these.">
      <div className="flex flex-wrap gap-2" role="group" aria-label="Focus areas">
        {focusAreas.map((a) => (
          <FilterChip
            key={a.slug}
            selected={picked.includes(a.slug)}
            onChange={(on) => setPicked((p) => (on ? [...p, a.slug] : p.filter((x) => x !== a.slug)))}
          >
            {a.label}
          </FilterChip>
        ))}
      </div>
      <Button className="self-start" disabled={!changed || picked.length === 0} onClick={() => saveFocus(picked)}>
        Save focus areas
      </Button>
      {picked.length === 0 && <span className="text-sm text-slate-600">Choose at least one.</span>}
    </Panel>
  );
}

function Notifications() {
  const { settings, save } = usePortal();
  const n = settings.notifications;
  const items: { key: keyof typeof n; title: string; body: string }[] = [
    { key: "newBooking", title: "New bookings", body: "When a client books, including price offers and insurance requests." },
    { key: "cancellation", title: "Cancellations and changes", body: "When a client cancels or reschedules." },
    { key: "messages", title: "New messages", body: "An email with the client’s first name only, never the message itself." },
    { key: "dailySummary", title: "Morning summary", body: "Each morning, the day’s sessions and anything waiting for a reply." },
  ];
  return (
    <Panel id="notifications" title="Email notifications" intro={`Sent to ${settings.google.email}.`} className="max-w-[720px]">
      <ul className="m-0 flex list-none flex-col divide-y divide-border p-0">
        {items.map((it) => (
          <li key={it.key}>
            <label className="flex min-h-16 items-center gap-4 py-3">
              <span className="flex flex-1 flex-col gap-0.5">
                <b className="text-[15px]">{it.title}</b>
                <span className="text-sm text-slate-600">{it.body}</span>
              </span>
              <input
                type="checkbox"
                checked={n[it.key]}
                onChange={(e) => save({ notifications: { ...n, [it.key]: e.target.checked } }, "Saved")}
                className="size-5 flex-none accent-peach-700"
              />
            </label>
          </li>
        ))}
      </ul>
      <span className="text-[13px] text-slate-600">Session reminders to clients are always sent and can&rsquo;t be turned off.</span>
    </Panel>
  );
}
