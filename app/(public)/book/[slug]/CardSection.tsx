"use client";

import { Elements, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import { useEffect, useState } from "react";
import { CreditCard } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { formatFee } from "@/lib/format";

const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
const stripePromise = publishableKey ? loadStripe(publishableKey) : null;
export const paymentsEnabled = Boolean(stripePromise);

/** Saves the card (Stripe SetupIntent) and returns its id, or an error message for the member. */
export type SaveCard = () => Promise<{ paymentMethodId: string } | { error: string }>;

type SavedCard = { id: string; brand: string; last4: string };

const TRY_AGAIN = "We couldn’t reach our payment provider. Please check your connection and try again.";

/** Gives up on a payment step that hangs, so the booking button never spins forever. */
function withTimeout<T>(p: Promise<T>, ms = 30_000): Promise<T> {
  return Promise.race([p, new Promise<T>((_, reject) => setTimeout(() => reject(new Error("timeout")), ms))]);
}

const brandName = (b: string) => b.replace(/_/g, " ").replace(/\b\w/g, (ch) => ch.toUpperCase());

/**
 * The card for a paid session. Nothing is charged now: the card is saved and charged 24 hours before the
 * session (or straight away when it's less than 24 hours away). Members who've paid before can reuse their
 * saved card. The booking form calls the function this registers.
 */
export function CardSection({ amountCents, soon, register }: { amountCents: number; soon: boolean; register: (save: SaveCard | null) => void }) {
  // undefined while checking for a saved card, null when there isn't one (or they chose a different card).
  const [saved, setSaved] = useState<SavedCard | null | undefined>(undefined);
  useEffect(() => {
    fetch("/api/stripe/saved-card")
      .then((r) => r.json())
      .then(({ card }: { card: SavedCard | null }) => setSaved(card))
      .catch(() => setSaved(null));
  }, []);
  useEffect(() => {
    if (!saved) return;
    register(async () => ({ paymentMethodId: saved.id }));
    return () => register(null);
  }, [saved, register]);

  if (!stripePromise) return null;
  return (
    <fieldset className="m-0 flex flex-col gap-3 border-0 p-0">
      <legend className="mb-1 flex items-center gap-2 p-0 font-semibold">
        <CreditCard size={18} strokeWidth={1.8} aria-hidden="true" />
        Card
      </legend>
      {saved === undefined ? (
        <p className="m-0 text-[15px] text-slate-600">Loading…</p>
      ) : saved ? (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border bg-white px-4 py-3">
          <span className="text-[15px]">
            <b>{brandName(saved.brand)}</b> ending {saved.last4}
          </span>
          <Button variant="link" className="min-h-11! px-0! text-sm" onClick={() => setSaved(null)}>
            Use a different card
          </Button>
        </div>
      ) : (
        <Elements
          stripe={stripePromise}
          options={{
            mode: "setup",
            currency: "usd",
            appearance: {
              theme: "stripe",
              variables: { colorPrimary: "#B34A2A", colorText: "#2D3748", borderRadius: "10px", fontFamily: "Plus Jakarta Sans, system-ui, sans-serif" },
            },
            fonts: [{ cssSrc: "https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600&display=swap" }],
          }}
        >
          <NewCard register={register} />
        </Elements>
      )}
      <p className="m-0 text-[13px] leading-normal text-slate-600">
        {soon
          ? `Your card is charged ${formatFee(amountCents)} now, since the session is less than 24 hours away.`
          : `Nothing is charged now. Your card is charged ${formatFee(amountCents)} 24 hours before your session. Cancel before then and you won’t be charged.`}{" "}
        Payments are handled by Stripe. FaithWellness never sees your full card number.
      </p>
    </fieldset>
  );
}

function NewCard({ register }: { register: (save: SaveCard | null) => void }) {
  const stripe = useStripe();
  const elements = useElements();
  const [state, setState] = useState<"loading" | "ready" | "failed">("loading");
  useEffect(() => {
    if (state !== "loading") return;
    const t = setTimeout(() => setState("failed"), 20_000);
    return () => clearTimeout(t);
  }, [state]);

  useEffect(() => {
    if (!stripe || !elements || state !== "ready") return register(null);
    register(async () => {
      try {
        const { error: invalid } = await withTimeout(elements.submit());
        if (invalid) return { error: invalid.message ?? "Check your card details." };
        const res = await withTimeout(fetch("/api/stripe/setup-intent", { method: "POST" }));
        const { clientSecret } = (await res.json().catch(() => ({}))) as { clientSecret?: string };
        if (!clientSecret) return { error: TRY_AGAIN };
        const { error, setupIntent } = await withTimeout(
          stripe.confirmSetup({ elements, clientSecret, redirect: "if_required", confirmParams: { return_url: window.location.href } }),
        );
        if (error || !setupIntent?.payment_method) return { error: error?.message ?? "Your card couldn’t be saved. Please try another card." };
        const pm = setupIntent.payment_method;
        return { paymentMethodId: typeof pm === "string" ? pm : pm.id };
      } catch {
        return { error: TRY_AGAIN };
      }
    });
    return () => register(null);
  }, [stripe, elements, state, register]);

  return (
    <>
      {state === "loading" && <p className="m-0 text-[15px] text-slate-600">Loading the card form…</p>}
      {state === "failed" ? (
        <p role="alert" className="m-0 rounded-md bg-peach-50 px-4 py-3 text-sm text-peach-800">
          The card form didn&rsquo;t load. Please refresh the page. If it still doesn&rsquo;t appear, try turning off ad or privacy blockers for this site.
        </p>
      ) : (
        <PaymentElement options={{ layout: "tabs" }} onReady={() => setState("ready")} onLoadError={() => setState("failed")} />
      )}
    </>
  );
}
