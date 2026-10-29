"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { CalendarDays, CircleAlert, CircleCheck } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { proto } from "@/lib/prototype/store";
import { disconnectCalendar, saveCalendarChoices } from "@/lib/supabase/own-counselor";
import { usePortal } from "../PortalShell";
import { field, Panel } from "../ui";

/** What happened on the way back from Google (the ?calendar= value set by /api/google/callback). */
const outcomes: Record<string, { good: boolean; text: string }> = {
  connected: { good: true, text: "Google Calendar connected." },
  canceled: { good: false, text: "Connecting was canceled. Try again whenever you’re ready." },
  "missing-permission": {
    good: false,
    text: "Google didn’t give FaithWellness all the calendar permissions it needs. Connect again and leave every box ticked on Google’s screen.",
  },
  expired: { good: false, text: "That took too long or was opened in another browser. Please try again." },
  failed: { good: false, text: "Something went wrong connecting to Google. Please try again." },
  "not-configured": { good: false, text: "Calendar connections aren’t switched on for this site yet." },
  "not-counselor": { good: false, text: "Only approved counselors can connect a calendar." },
};

/** Real counselors: connect Google Calendar, choose calendars, or disconnect. */
export function CalendarSettings() {
  const { calendar, reload, ownId } = usePortal();
  const params = useSearchParams();
  const outcome = outcomes[params.get("calendar") ?? ""];
  const [check, setCheck] = useState<string[]>(calendar?.checkCalendars ?? []);
  const [write, setWrite] = useState(calendar?.writeCalendar ?? "");
  const [busy, setBusy] = useState(false);
  const [confirmDisconnect, setConfirmDisconnect] = useState(false);
  // Also as a pop-up message, so it's noticed even when the Calendar box is off screen.
  useEffect(() => {
    if (outcome) proto.toast(outcome.text);
  }, [outcome]);
  const changed = calendar && (write !== calendar.writeCalendar || [...check].sort().join() !== [...calendar.checkCalendars].sort().join());

  // A plain link, not client-side navigation: this leaves the site for Google's permission screen.
  const connectLink = (label: string) => (
    <a
      href="/api/google/connect"
      className="inline-flex min-h-11 items-center justify-center gap-2 self-start rounded-pill bg-peach-500 px-5 text-[15px] font-bold text-slate-900! no-underline hover:bg-peach-400"
    >
      {label}
    </a>
  );

  return (
    <Panel id="calendar" title="Calendar & video" intro="Clients only see times you’re free, and each session gets a Google Meet link.">
      {outcome && (
        <p
          role="status"
          className={`m-0 flex items-start gap-2 rounded-md px-4 py-3 text-sm ${outcome.good ? "bg-sage-100 text-sage-700" : "bg-peach-50 text-peach-800"}`}
        >
          {outcome.good ? <CircleCheck size={18} className="flex-none" aria-hidden="true" /> : <CircleAlert size={18} className="flex-none" aria-hidden="true" />}
          {outcome.text}
        </p>
      )}

      {!calendar ? (
        <div className="flex flex-col gap-3 rounded-lg border border-border p-4">
          <div className="flex items-center gap-3">
            <span className="flex size-11 flex-none items-center justify-center rounded-md bg-cream-200">
              <CalendarDays size={22} strokeWidth={1.8} aria-hidden="true" />
            </span>
            <span className="flex flex-col">
              <b>Google Calendar</b>
              <span className="text-sm text-slate-600">Needed before your profile goes live.</span>
            </span>
          </div>
          <ul className="m-0 flex flex-col gap-1 pl-5 text-sm leading-normal text-slate-600">
            <li>FaithWellness checks when you&rsquo;re busy, never what your other events are about.</li>
            <li>Sessions are added as &ldquo;FaithWellness session&rdquo;, with a Meet link and a 15-minute rest block after.</li>
            <li>You can disconnect any time.</li>
          </ul>
          {connectLink("Connect Google Calendar")}
        </div>
      ) : calendar.status === "needs_reconnect" ? (
        <div className="flex flex-col gap-3 rounded-lg border border-peach-400 bg-peach-50 p-4">
          <b className="text-peach-800">Your Google Calendar needs reconnecting</b>
          <span className="text-sm text-peach-800">
            Google stopped letting FaithWellness see {calendar.googleEmail}. Until you reconnect, clients can&rsquo;t book you.
          </span>
          {connectLink("Reconnect Google Calendar")}
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3 rounded-lg border border-border p-4">
            <span className="flex size-11 flex-none items-center justify-center rounded-md bg-sage-100">
              <CalendarDays size={22} strokeWidth={1.8} className="text-sage-700" aria-hidden="true" />
            </span>
            <span className="flex min-w-0 flex-col">
              <b>Connected</b>
              <span className="truncate text-sm text-slate-600">{calendar.googleEmail}</span>
            </span>
          </div>

          <fieldset className="m-0 flex flex-col gap-2 border-0 p-0">
            <legend className="mb-1 p-0 text-sm font-semibold">Check these calendars for conflicts</legend>
            {calendar.calendars.map((c) => (
              <label key={c.id} className="flex min-h-11 cursor-pointer items-center gap-3 text-[15px]">
                <input
                  type="checkbox"
                  checked={check.includes(c.id)}
                  onChange={(e) => setCheck((list) => (e.target.checked ? [...list, c.id] : list.filter((x) => x !== c.id)))}
                  className="size-5 flex-none accent-peach-700"
                />
                {c.name}
                {c.primary && <span className="text-[13px] text-slate-500">(main)</span>}
              </label>
            ))}
          </fieldset>

          <label className="flex flex-col gap-1.5 text-sm font-semibold">
            Add sessions to
            <select value={write} onChange={(e) => setWrite(e.target.value)} className={`${field} font-normal`}>
              {calendar.calendars.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>

          <div className="flex flex-wrap items-center gap-4">
            <Button
              disabled={!changed || busy || check.length === 0}
              onClick={async () => {
                setBusy(true);
                const ok = ownId ? await saveCalendarChoices(ownId, check, write) : false;
                setBusy(false);
                proto.toast(ok ? "Calendar choices saved" : "That didn’t save. Please try again.");
                reload();
              }}
            >
              Save calendar choices
            </Button>
            {!confirmDisconnect ? (
              <button type="button" onClick={() => setConfirmDisconnect(true)} className="min-h-11 cursor-pointer text-sm font-semibold text-slate-600">
                Disconnect
              </button>
            ) : (
              <span className="flex flex-wrap items-center gap-3 text-sm">
                <span className="text-peach-800">Disconnecting takes you out of the directory until you reconnect.</span>
                <button
                  type="button"
                  disabled={busy}
                  onClick={async () => {
                    setBusy(true);
                    const ok = await disconnectCalendar();
                    setBusy(false);
                    setConfirmDisconnect(false);
                    proto.toast(ok ? "Google Calendar disconnected" : "That didn’t work. Please try again.");
                    reload();
                  }}
                  className="min-h-11 cursor-pointer font-semibold text-peach-700"
                >
                  Disconnect
                </button>
                <button type="button" onClick={() => setConfirmDisconnect(false)} className="min-h-11 cursor-pointer text-slate-600">
                  Keep connected
                </button>
              </span>
            )}
          </div>
          {check.length === 0 && <span className="text-sm text-peach-800">Check at least one calendar for conflicts.</span>}
        </div>
      )}
    </Panel>
  );
}
