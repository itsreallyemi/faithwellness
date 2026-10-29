"use client";

import { useEffect, useState } from "react";
import { Check, CircleAlert } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import { accreditingBodies } from "@/lib/accreditation";
import { NOT_LISTED, shortDate, type Application } from "@/lib/applications";
import { authEnabled, supabaseBrowser, useAuthState } from "@/lib/supabase/client";

export type MyApplication = { app: Application | null; live: boolean };

/** The signed-in person's counselor application, and whether their profile is live yet. null while loading. */
export function useMyApplication(): MyApplication | null {
  const auth = useAuthState();
  const [state, setState] = useState<MyApplication | null>(null);
  useEffect(() => {
    if (!authEnabled || auth === "signed-out") return setState({ app: null, live: false });
    if (auth !== "signed-in") return;
    const sb = supabaseBrowser();
    (async () => {
      const { data } = await sb.from("counselor_applications").select("*").maybeSingle();
      const app = (data as Application | null) ?? null;
      let live = false;
      if (app?.status === "approved") {
        const { data: c } = await sb.from("counselors").select("is_published").eq("id", app.user_id).maybeSingle();
        live = Boolean(c?.is_published);
      }
      setState({ app, live });
    })();
  }, [auth]);
  return state;
}

export function accreditorName(app: Application) {
  return app.accrediting_body === NOT_LISTED
    ? app.church_name
    : (accreditingBodies.find((b) => b.slug === app.accrediting_body)?.name ?? app.church_name);
}

type StepState = "done" | "current" | "attention" | "upcoming";

/** Application sent → accreditation check → approved → profile setup → live, with where they are now. */
export function ApplicationTracker({ app, live }: MyApplication & { app: Application }) {
  const approved = app.status === "approved";
  const checkState: StepState = approved ? "done" : app.status === "submitted" ? "current" : "attention";
  const steps: { title: string; detail: string; state: StepState }[] = [
    { title: "Application sent", detail: shortDate(app.submitted_at), state: "done" },
    {
      title: "Accreditation check",
      detail:
        app.status === "submitted"
          ? `We’re confirming it with ${accreditorName(app)}. This usually takes a few days.`
          : app.status === "needs_info"
            ? "We need a little more information from you."
            : app.status === "declined"
              ? "We couldn’t approve this application."
              : `Confirmed${app.reviewed_at ? ` ${shortDate(app.reviewed_at)}` : ""}`,
      state: checkState,
    },
    { title: "Approved", detail: approved ? "Your counselor portal is open." : "", state: approved ? "done" : "upcoming" },
    {
      title: "Set up your profile",
      detail: approved && !live ? "Add your bio, focus areas, fees and hours in your portal." : "",
      state: live ? "done" : approved ? "current" : "upcoming",
    },
    { title: "Live on FaithWellness", detail: live ? "Clients can find and book you." : "", state: live ? "done" : "upcoming" },
  ];

  return (
    <ol className="m-0 flex list-none flex-col p-0" aria-label="Application progress">
      {steps.map((step, i) => (
        <li key={step.title} className="flex gap-3" aria-current={step.state === "current" || step.state === "attention" ? "step" : undefined}>
          <div className="flex flex-col items-center">
            <span
              className={cn(
                "flex size-7 flex-none items-center justify-center rounded-full border-2 text-[13px] font-bold",
                step.state === "done" && "border-sage-700 bg-sage-700 text-white",
                step.state === "current" && "border-peach-500 bg-peach-100 text-peach-800",
                step.state === "attention" && "border-peach-700 bg-peach-50 text-peach-700",
                step.state === "upcoming" && "border-border bg-white text-slate-500",
              )}
            >
              {step.state === "done" ? (
                <Check size={15} strokeWidth={3} aria-hidden="true" />
              ) : step.state === "attention" ? (
                <CircleAlert size={16} strokeWidth={2.2} aria-hidden="true" />
              ) : (
                i + 1
              )}
            </span>
            {i < steps.length - 1 && <span className={cn("w-0.5 flex-1", step.state === "done" ? "bg-sage-700" : "bg-border")} aria-hidden="true" />}
          </div>
          <div className={cn("flex flex-col pb-5", i === steps.length - 1 && "pb-0")}>
            <span className={cn("text-[15px] leading-7 font-semibold", step.state === "upcoming" ? "text-slate-500" : "text-slate-900")}>
              {step.title}
              <span className="sr-only">
                {{ done: " (done)", current: " (in progress)", attention: " (needs attention)", upcoming: " (not yet)" }[step.state]}
              </span>
            </span>
            {step.detail && <span className="text-sm leading-normal text-slate-600">{step.detail}</span>}
          </div>
        </li>
      ))}
    </ol>
  );
}

/** Tracker plus the one thing to do next. Used on the account page and the portal sign-in screen. */
export function ApplicationSummary({ app, live, hideAction = false }: MyApplication & { app: Application; hideAction?: boolean }) {
  const next =
    app.status === "needs_info" || app.status === "declined"
      ? { label: app.status === "declined" ? "See details" : "Update my application", href: "/for-counselors#apply" }
      : app.status === "approved"
        ? { label: live ? "Go to your portal" : "Set up your profile", href: "/portal" }
        : { label: "View my application", href: "/for-counselors#apply" };
  return (
    <div className="flex flex-col gap-5">
      {(app.status === "needs_info" || app.status === "declined") && app.admin_note && (
        <p className="m-0 rounded-md border-l-4 border-peach-400 bg-cream px-4 py-3 text-[15px] whitespace-pre-line">{app.admin_note}</p>
      )}
      <ApplicationTracker app={app} live={live} />
      {!hideAction && (
        <Button href={next.href} variant={app.status === "submitted" ? "secondary" : "primary"} className="self-start">
          {next.label}
        </Button>
      )}
    </div>
  );
}
