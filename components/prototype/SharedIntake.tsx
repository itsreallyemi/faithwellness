"use client";

import Link from "next/link";
import { Eye, EyeOff, Lock } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import { intakeRows, type Intake } from "@/lib/prototype/intake";
import { proto, useProto } from "@/lib/prototype/store";

/**
 * What a counselor sees about a client who shared their onboarding answers.
 * The counselor portal (Phase 4) reuses this; in the prototype clients see it as a preview.
 */
export function SharedIntakeCard({ intake, clientName, className }: { intake: Intake; clientName: string; className?: string }) {
  return (
    <section aria-label={`About ${clientName}`} className={cn("flex flex-col gap-3 rounded-lg border border-border-warm bg-white p-5", className)}>
      <div className="flex flex-col gap-0.5">
        <span className="label-overline">Shared by {clientName}</span>
        <span className="text-[13px] text-slate-600">From their FaithWellness onboarding answers</span>
      </div>
      <dl className="m-0 grid grid-cols-1 gap-x-4 gap-y-2.5 text-[15px] sm:grid-cols-[auto_1fr]">
        {intakeRows(intake).map(([label, value]) => (
          <div key={label} className="contents">
            <dt className="text-slate-600">{label}</dt>
            <dd className="m-0 -mt-2 sm:mt-0">{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

/**
 * Tells the client whether a counselor can see their answers, with a preview and an on/off control.
 * `compact` is a single line for tight spaces such as under the message composer.
 */
export function IntakeSharingNote({ counselorName, compact = false }: { counselorName: string; compact?: boolean }) {
  const s = useProto();
  const intake = s?.intake;
  if (!s?.user) return null;

  if (!intake) {
    if (compact) return null;
    return (
      <p className="m-0 text-[13px] leading-normal text-slate-600">
        <Link href="/get-started?edit=1" className="font-semibold">
          Answer five short questions
        </Link>{" "}
        so {counselorName} knows a little about you before you meet.
      </p>
    );
  }

  if (compact) {
    return (
      <span className="inline-flex flex-wrap items-center gap-x-1.5">
        {intake.shareWithCounselor ? `${counselorName} can see your onboarding answers.` : `Your onboarding answers are private.`}
        <Link href="/get-started" className="font-semibold">
          Manage
        </Link>
      </span>
    );
  }

  return (
    <div className="flex flex-col gap-3 rounded-md bg-cream p-4">
      <p className="m-0 flex gap-2.5 text-[15px] leading-normal">
        {intake.shareWithCounselor ? (
          <Eye size={20} strokeWidth={1.8} className="mt-0.5 flex-none text-sage-700" aria-hidden="true" />
        ) : (
          <EyeOff size={20} strokeWidth={1.8} className="mt-0.5 flex-none text-slate-600" aria-hidden="true" />
        )}
        <span>
          {intake.shareWithCounselor
            ? `${counselorName} will see your onboarding answers, so you don’t have to start from the beginning.`
            : `Your onboarding answers stay private. ${counselorName} won’t see them.`}
        </span>
      </p>
      {intake.shareWithCounselor && (
        <details className="group">
          <summary className="inline-flex min-h-11 cursor-pointer list-none items-center text-sm font-semibold text-peach-700 [&::-webkit-details-marker]:hidden">
            Preview what {counselorName} sees
          </summary>
          <SharedIntakeCard intake={intake} clientName={s.user.name.split(" ")[0]} className="mt-1" />
        </details>
      )}
      <div className="flex flex-wrap items-center gap-x-4">
        <Button variant="link" className="px-0! text-sm" onClick={() => proto.setIntakeSharing(!intake.shareWithCounselor)}>
          {intake.shareWithCounselor ? "Stop sharing my answers" : "Share my answers"}
        </Button>
        <Link href="/get-started?edit=1" className="inline-flex min-h-11 items-center text-sm font-semibold">
          Edit answers
        </Link>
      </div>
      <p className="m-0 flex gap-2 text-[13px] text-slate-600">
        <Lock size={14} strokeWidth={1.8} className="mt-0.5 flex-none" aria-hidden="true" />
        Only counselors you book or message. Never your church.
      </p>
    </div>
  );
}
