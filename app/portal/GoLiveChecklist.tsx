"use client";

import Link from "next/link";
import { Check, ChevronRight, CircleCheck } from "lucide-react";
import { cn } from "@/lib/cn";
import { GO_LIVE_ITEMS, type GoLiveItem } from "@/lib/supabase/own-counselor";
import { usePortal } from "./PortalShell";

const steps: Record<GoLiveItem, { label: string; todo: string; href: string }> = {
  introduction: {
    label: "Introduce yourself",
    todo: "A short summary and a few paragraphs about you.",
    href: "/portal/settings?tab=bio#profile",
  },
  focus: { label: "Choose focus areas", todo: "What you help with, for the directory filters.", href: "/portal/settings?tab=bio#focus" },
  fees: { label: "Set your fees", todo: "A fee for each session length you offer.", href: "/portal/settings?tab=fees#fees" },
  hours: { label: "Set weekly hours", todo: "When clients can book you.", href: "/portal/settings?tab=scheduling#hours" },
};

/**
 * The steps before a real counselor's profile goes live. The database publishes it on its own once
 * nothing is missing (see 0006_counselor_go_live.sql), so this only shows progress and where to go next.
 */
export function GoLiveChecklist({ className }: { className?: string }) {
  const { real, live, missing, counselor } = usePortal();
  if (!real) return null;

  if (live) {
    return (
      <section aria-label="Your profile is live" className={cn("flex flex-col gap-2 rounded-lg bg-sage-100 p-4", className)}>
        <span className="flex items-center gap-2 text-[15px] font-semibold text-sage-700">
          <CircleCheck size={18} strokeWidth={2} aria-hidden="true" />
          You&rsquo;re live
        </span>
        <span className="text-sm text-sage-700">Clients can find and book you.</span>
        <Link href={`/counselors/${counselor.slug}`} className="inline-flex min-h-11 items-center text-sm font-semibold">
          View your public profile
        </Link>
      </section>
    );
  }

  const done = GO_LIVE_ITEMS.filter((k) => !missing.includes(k)).length;
  const next = GO_LIVE_ITEMS.find((k) => missing.includes(k));

  return (
    <section aria-labelledby="go-live" className={cn("flex flex-col gap-3 rounded-lg border border-border-warm bg-cream p-4", className)}>
      <div className="flex flex-col gap-1">
        <h2 id="go-live" className="m-0 text-[15px] font-semibold">
          Get ready to go live
        </h2>
        <span className="text-[13px] leading-snug text-slate-600">
          {done} of {GO_LIVE_ITEMS.length} done. Your profile goes live on its own when all are ticked.
        </span>
        <div className="mt-1 h-1.5 overflow-hidden rounded-pill bg-border" aria-hidden="true">
          <div className="h-full rounded-pill bg-sage-700" style={{ width: `${(done / GO_LIVE_ITEMS.length) * 100}%` }} />
        </div>
      </div>
      <ol className="m-0 flex list-none flex-col gap-0.5 p-0">
        {GO_LIVE_ITEMS.map((k) => {
          const complete = !missing.includes(k);
          const step = steps[k];
          return (
            <li key={k}>
              <Link
                href={step.href}
                aria-current={k === next ? "step" : undefined}
                className={cn(
                  "flex min-h-11 items-start gap-2.5 rounded-md px-2 py-2 text-slate-900! no-underline hover:bg-white",
                  k === next && "bg-white",
                )}
              >
                <span
                  className={cn(
                    "mt-0.5 flex size-5 flex-none items-center justify-center rounded-full border-2",
                    complete ? "border-sage-700 bg-sage-700 text-white" : k === next ? "border-peach-500" : "border-border bg-white",
                  )}
                >
                  {complete && <Check size={12} strokeWidth={3.2} aria-hidden="true" />}
                </span>
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className={cn("text-sm leading-5", complete ? "text-slate-600 line-through decoration-slate-400" : "font-semibold")}>
                    {step.label}
                    <span className="sr-only">{complete ? " (done)" : " (to do)"}</span>
                  </span>
                  {k === next && <span className="text-[13px] leading-snug text-slate-600">{step.todo}</span>}
                </span>
                {!complete && <ChevronRight size={16} strokeWidth={1.8} className="mt-0.5 flex-none text-slate-500" aria-hidden="true" />}
              </Link>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
