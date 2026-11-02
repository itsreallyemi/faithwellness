"use client";

import { useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { CircleCheck, Landmark } from "lucide-react";
import { proto } from "@/lib/prototype/store";
import { usePortal } from "../PortalShell";
import { Panel } from "../ui";

/** What happened on the way back from Stripe (the ?payouts= value). */
const outcomes: Record<string, string> = {
  ready: "Payouts are set up.",
  incomplete: "Stripe still needs a few details before you can be paid. Continue where you left off.",
  failed: "Something went wrong reaching Stripe. Please try again.",
  "not-configured": "Payments aren’t switched on for this site yet.",
};

/** A plain link: this leaves the site for Stripe. */
function StripeLink({ href, children, secondary = false }: { href: string; children: React.ReactNode; secondary?: boolean }) {
  return (
    <a
      href={href}
      className={
        secondary
          ? "inline-flex min-h-11 items-center justify-center self-start rounded-pill border-[1.5px] border-slate-900 px-5 text-[15px] font-semibold text-slate-900! no-underline hover:bg-white"
          : "inline-flex min-h-11 items-center justify-center self-start rounded-pill bg-peach-500 px-5 text-[15px] font-bold text-slate-900! no-underline hover:bg-peach-400"
      }
    >
      {children}
    </a>
  );
}

/** Real counselors connect a bank account through Stripe to be paid for sessions. */
export function PayoutsPanel() {
  const { payouts, counselor } = usePortal();
  const outcome = outcomes[useSearchParams().get("payouts") ?? ""];
  useEffect(() => {
    if (outcome) proto.toast(outcome);
  }, [outcome]);

  return (
    <Panel id="payouts" title="Payouts" intro="Members pay by card when they book. Your share is paid to your bank account through Stripe.">
      {payouts.ready ? (
        <div className="flex flex-col gap-3">
          <span className="flex items-center gap-2 text-[15px] font-semibold text-sage-700">
            <CircleCheck size={18} strokeWidth={2} aria-hidden="true" />
            Payouts are on
          </span>
          <StripeLink href="/api/stripe/dashboard?for=counselor" secondary>
            View payouts in Stripe
          </StripeLink>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <span className="flex items-start gap-2 text-sm text-slate-600">
            <Landmark size={18} strokeWidth={1.8} className="mt-0.5 flex-none" aria-hidden="true" />
            Stripe asks for your name, date of birth, the last four digits of your SSN and your bank details. FaithWellness
            never sees your bank or tax details.
          </span>
          <StripeLink href="/api/stripe/connect?for=counselor">{payouts.started ? "Finish setting up payouts" : "Set up payouts"}</StripeLink>
        </div>
      )}
      <p className="m-0 rounded-md bg-cream px-4 py-3 text-[13px] leading-normal text-slate-600">
        From each paid session, FaithWellness keeps 10%{counselor.church ? ` and ${counselor.church.name} receives 8%` : ""}. Stripe&rsquo;s
        card fee (about 2.9% + 30¢) comes out of your share. Free and Member Benefits sessions aren&rsquo;t charged.
      </p>
    </Panel>
  );
}
