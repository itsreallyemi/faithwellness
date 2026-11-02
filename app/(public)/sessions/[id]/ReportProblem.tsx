"use client";

import { useEffect, useState } from "react";
import { CircleAlert, CircleCheck } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { notify, supabaseBrowser } from "@/lib/supabase/client";

type Problem = { id: string; reason: string; note: string; status: "open" | "refunded" | "resolved"; response: string };

const reasons = [
  { value: "no_show", label: "The counselor didn’t join" },
  { value: "technical", label: "A video or connection problem" },
  { value: "cut_short", label: "The session was cut short" },
  { value: "other", label: "Something else" },
];

/** For a paid session that has started: tell FaithWellness and the counselor something went wrong. */
export function ReportProblem({ bookingId, counselorName, refunded }: { bookingId: string; counselorName: string; refunded: boolean }) {
  const [problem, setProblem] = useState<Problem | null | undefined>(undefined);
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    supabaseBrowser()
      .from("session_problems")
      .select("id, reason, note, status, response")
      .eq("booking_id", bookingId)
      .maybeSingle()
      .then(({ data }) => setProblem((data as Problem | null) ?? null));
  }, [bookingId]);

  if (problem === undefined) return null;

  if (refunded || problem?.status === "refunded") {
    return (
      <p className="m-0 flex items-start gap-2 rounded-md bg-sage-100 px-4 py-3 text-[15px] text-sage-700">
        <CircleCheck size={18} strokeWidth={2} className="mt-0.5 flex-none" aria-hidden="true" />
        This session was refunded. It usually reaches your card in 5 to 10 days.
      </p>
    );
  }

  if (problem) {
    return (
      <div className="flex flex-col gap-2 rounded-md bg-cream px-4 py-3 text-[15px]">
        <b className="flex items-center gap-2">
          <CircleAlert size={18} strokeWidth={1.8} className="text-peach-700" aria-hidden="true" />
          {problem.status === "open" ? "Problem reported" : "Problem looked at"}
        </b>
        {problem.status === "open" ? (
          <span className="text-slate-600">
            {counselorName} and FaithWellness have been told. You&rsquo;ll get an email when it&rsquo;s sorted out.
          </span>
        ) : (
          <span className="whitespace-pre-line text-slate-600">{problem.response}</span>
        )}
      </div>
    );
  }

  if (!open) {
    return (
      <Button variant="link" className="self-start px-0! text-slate-600!" onClick={() => setOpen(true)}>
        Something went wrong with this session? Report a problem
      </Button>
    );
  }

  return (
    <form
      noValidate
      className="flex flex-col gap-4 rounded-md border border-border p-4"
      onSubmit={async (e) => {
        e.preventDefault();
        if (!reason) return setError("Choose what happened.");
        setSending(true);
        const { data, error } = await supabaseBrowser()
          .rpc("report_session_problem", { p_booking: bookingId, p_reason: reason, p_note: note })
          .single();
        setSending(false);
        if (error) return setError("We couldn’t send your report. Please try again.");
        notify("problem-reported", (data as Problem).id);
        setProblem(data as Problem);
      }}
    >
      <fieldset className="m-0 flex flex-col gap-2 border-0 p-0">
        <legend className="mb-1 p-0 font-semibold">What happened?</legend>
        {reasons.map((r) => (
          <label key={r.value} className="flex min-h-11 cursor-pointer items-center gap-3 text-[15px]">
            <input
              type="radio"
              name="reason"
              value={r.value}
              checked={reason === r.value}
              onChange={() => {
                setReason(r.value);
                setError("");
              }}
              className="size-[18px] accent-peach-700"
            />
            {r.label}
          </label>
        ))}
      </fieldset>
      <label className="flex flex-col gap-1.5 text-sm font-semibold">
        <span>
          Anything else? <span className="font-normal text-slate-600">(optional)</span>
        </span>
        <textarea
          rows={3}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          className="w-full rounded-md border border-border bg-cream px-4 py-3 text-base font-normal"
        />
      </label>
      <p className="m-0 text-[13px] text-slate-600">
        {counselorName} and FaithWellness will see this. If the session didn&rsquo;t happen as booked, you&rsquo;ll be refunded.
      </p>
      {error && (
        <p role="alert" className="m-0 text-sm text-peach-700">
          {error}
        </p>
      )}
      <div className="flex flex-wrap gap-3">
        <Button type="submit" disabled={sending}>
          {sending ? "Sending…" : "Send report"}
        </Button>
        <Button variant="link" onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
