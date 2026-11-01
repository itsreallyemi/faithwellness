"use client";

import { useEffect, useState } from "react";
import type { ChurchApplication } from "@/app/(public)/for-churches/RegisterForm";
import { Button } from "@/components/ui/Button";
import { shortDate } from "@/lib/applications";
import { authEnabled, ownChurch, supabaseBrowser, useAuthState } from "@/lib/supabase/client";
import { StepTracker, type Step, type StepState } from "./ApplicationProgress";

export type MyChurchApplication = { app: ChurchApplication | null; members: number };

/** The signed-in person's church registration, and how many members have joined once approved. null while loading. */
export function useMyChurchApplication(): MyChurchApplication | null {
  const auth = useAuthState();
  const [state, setState] = useState<MyChurchApplication | null>(null);
  useEffect(() => {
    if (!authEnabled || auth === "signed-out") return setState({ app: null, members: 0 });
    if (auth !== "signed-in") return;
    const sb = supabaseBrowser();
    (async () => {
      const { data } = await sb.from("church_applications").select("*").maybeSingle();
      const app = (data as ChurchApplication | null) ?? null;
      let members = 0;
      if (app?.status === "approved") {
        // Church admins can read their own church's member list (RLS), so this counts anyone who's asked to join.
        const { count } = await sb.from("church_memberships").select("id", { count: "exact", head: true });
        members = count ?? 0;
      }
      setState({ app, members });
    })();
  }, [auth]);
  return state;
}

/** Registration sent → confirming the church → approved → members joining. */
export function ChurchTracker({ app, members }: { app: ChurchApplication; members: number }) {
  const approved = app.status === "approved";
  const checkState: StepState = approved ? "done" : app.status === "submitted" ? "current" : "attention";
  const steps: Step[] = [
    { title: "Registration sent", detail: shortDate(app.submitted_at), state: "done" },
    {
      title: "Confirming your church",
      detail:
        app.status === "submitted"
          ? `We’re checking ${app.org_name} and that you can act for it. This usually takes a few days.`
          : app.status === "needs_info"
            ? "We need a little more information from you."
            : app.status === "declined"
              ? "We couldn’t approve this registration."
              : `Confirmed${app.reviewed_at ? ` ${shortDate(app.reviewed_at)}` : ""}`,
      state: checkState,
    },
    { title: "Approved", detail: approved ? "Your church dashboard is open." : "", state: approved ? "done" : "upcoming" },
  ];
  if (app.member_care) {
    steps.push({
      title: "Invite your members",
      detail: !approved
        ? ""
        : members > 0
          ? `${members} ${members === 1 ? "person has" : "people have"} asked to join.`
          : "Share your member code or link from your dashboard, so members can book free sessions.",
      state: !approved ? "upcoming" : members > 0 ? "done" : "current",
    });
  }
  return <StepTracker steps={steps} label="Registration progress" />;
}

/** Tracker plus the one thing to do next, for the account page. */
export function ChurchSummary({ app, members }: { app: ChurchApplication; members: number }) {
  const next =
    app.status === "approved"
      ? ownChurch
        ? { label: "Open your church dashboard", href: `/church/${ownChurch.slug}` }
        : null
      : app.status === "submitted"
        ? { label: "View our registration", href: "/for-churches#register" }
        : { label: app.status === "declined" ? "See details" : "Update our registration", href: "/for-churches#register" };
  return (
    <div className="flex flex-col gap-5">
      {(app.status === "needs_info" || app.status === "declined") && app.admin_note && (
        <p className="m-0 rounded-md border-l-4 border-peach-400 bg-cream px-4 py-3 text-[15px] whitespace-pre-line">{app.admin_note}</p>
      )}
      <ChurchTracker app={app} members={members} />
      {next && (
        <Button href={next.href} variant={app.status === "submitted" ? "secondary" : "primary"} className="self-start">
          {next.label}
        </Button>
      )}
    </div>
  );
}
