"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { proto } from "@/lib/prototype/store";
import { notify, supabaseBrowser } from "@/lib/supabase/client";

type Report = {
  id: string;
  booking_id: string;
  reason: string;
  note: string;
  created_at: string;
  booking: {
    start_utc: string;
    client_name: string;
    amount_cents: number;
  } | null;
  counselor: { preferred_name: string } | null;
};

const reasonLabel: Record<string, string> = {
  no_show: "says the counselor didn’t join",
  technical: "had a video or connection problem",
  cut_short: "says the session was cut short",
  other: "reported a problem",
};

/**
 * Open reports of problems with paid sessions. Counselors see their own (RLS); FaithWellness admins see all.
 * Either can refund in full, or resolve without a refund with a message to the member.
 */
export function ProblemReports({
  admin = false,
  emptyText,
  wrap = (list) => list,
}: {
  admin?: boolean;
  emptyText?: string;
  wrap?: (list: React.ReactNode) => React.ReactNode;
}) {
  const [reports, setReports] = useState<Report[] | null>(null);
  const load = useCallback(() => {
    supabaseBrowser()
      .from("session_problems")
      .select(
        "id, booking_id, reason, note, created_at, booking:bookings(start_utc, client_name, amount_cents), counselor:counselors(preferred_name)",
      )
      .eq("status", "open")
      .order("created_at")
      .then(({ data }) =>
        setReports((data as unknown as Report[] | null) ?? []),
      );
  }, []);
  useEffect(load, [load]);

  if (!reports) return null;
  if (reports.length === 0)
    return emptyText ? <p className="m-0 text-slate-600">{emptyText}</p> : null;

  return wrap(
    <ul className="m-0 flex list-none flex-col gap-4 p-0">
      {reports.map((r) => (
        <li key={r.id}>
          <ReportItem report={r} admin={admin} onDone={load} />
        </li>
      ))}
    </ul>,
  );
}

function ReportItem({
  report: r,
  admin,
  onDone,
}: {
  report: Report;
  admin: boolean;
  onDone: () => void;
}) {
  const [replying, setReplying] = useState(false);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const client = r.booking?.client_name.trim().split(/\s+/)[0] || "A client";
  const when = r.booking
    ? new Date(r.booking.start_utc).toLocaleString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      })
    : "";
  const amount = `$${Math.round((r.booking?.amount_cents ?? 0) / 100)}`;

  const refund = async () => {
    setBusy(true);
    const res = await fetch(`/api/bookings/${r.booking_id}/refund`, {
      method: "POST",
    });
    setBusy(false);
    proto.toast(
      res.ok
        ? `Refunded ${amount}. ${client} has been emailed.`
        : "The refund didn’t go through. Please try again.",
    );
    if (res.ok) onDone();
  };

  const resolve = async () => {
    if (!message.trim())
      return setError(`Add a message so ${client} knows what happened.`);
    setBusy(true);
    const { error } = await supabaseBrowser().rpc("resolve_session_problem", {
      p_id: r.id,
      p_response: message.trim(),
    });
    setBusy(false);
    if (error) return setError("That didn’t save. Please try again.");
    notify("problem-resolved", r.id);
    proto.toast(`Reply sent to ${client}`);
    onDone();
  };

  return (
    <div className="flex flex-col gap-3 rounded-md border border-peach-400 bg-peach-50 p-4">
      <span className="text-[15px]">
        <b>{client}</b> {reasonLabel[r.reason] ?? "reported a problem"} for the
        session on {when}
        {admin && r.counselor && <> with {r.counselor.preferred_name}</>} (
        {amount} paid).
      </span>
      {r.note && <q className="text-[15px] text-slate-600 italic">{r.note}</q>}
      {replying ? (
        <div className="flex flex-col gap-2">
          <label className="flex flex-col gap-1.5 text-sm font-semibold">
            Message to {client}
            <textarea
              rows={3}
              value={message}
              onChange={(e) => {
                setMessage(e.target.value);
                setError("");
              }}
              placeholder="For example, explain what happened and offer another time."
              className="w-full rounded-md border border-border bg-white px-4 py-3 text-base font-normal"
            />
          </label>
          {error && (
            <p role="alert" className="m-0 text-sm text-peach-700">
              {error}
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            <Button
              className="min-h-11! px-4! text-sm"
              disabled={busy}
              onClick={resolve}
            >
              Send without refunding
            </Button>
            <Button
              variant="link"
              className="min-h-11! px-4! text-sm"
              onClick={() => setReplying(false)}
            >
              Back
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          <Button
            className="min-h-11! px-4! text-sm"
            disabled={busy}
            onClick={refund}
          >
            Refund {amount}
          </Button>
          <Button
            variant="secondary"
            className="min-h-11! px-4! text-sm"
            disabled={busy}
            onClick={() => setReplying(true)}
          >
            Resolve without refund
          </Button>
        </div>
      )}
    </div>
  );
}
