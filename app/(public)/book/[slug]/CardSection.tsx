"use client";

import { Elements, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import { useEffect } from "react";
import { CreditCard } from "lucide-react";
import { formatFee } from "@/lib/format";

const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
const stripePromise = publishableKey ? loadStripe(publishableKey) : null;
export const paymentsEnabled = Boolean(stripePromise);

/** Saves the card (Stripe SetupIntent) and returns its id, or an error message for the member. */
export type SaveCard = () => Promise<{ paymentMethodId: string } | { error: string }>;

/**
 * The card form for a paid session. Nothing is charged now: the card is saved and charged 24 hours before the
 * session (or straight away when it's less than 24 hours away). The booking form calls the function it registers.
 */
export function CardSection({ amountCents, soon, register }: { amountCents: number; soon: boolean; register: (save: SaveCard | null) => void }) {
  if (!stripePromise) return null;
  return (
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
      <Card amountCents={amountCents} soon={soon} register={register} />
    </Elements>
  );
}

function Card({ amountCents, soon, register }: { amountCents: number; soon: boolean; register: (save: SaveCard | null) => void }) {
  const stripe = useStripe();
  const elements = useElements();

  useEffect(() => {
    if (!stripe || !elements) return register(null);
    register(async () => {
      const { error: invalid } = await elements.submit();
      if (invalid) return { error: invalid.message ?? "Check your card details." };
      const res = await fetch("/api/stripe/setup-intent", { method: "POST" });
      const { clientSecret } = (await res.json()) as { clientSecret?: string };
      if (!clientSecret) return { error: "We couldn’t reach our payment provider. Please try again." };
      const { error, setupIntent } = await stripe.confirmSetup({
        elements,
        clientSecret,
        redirect: "if_required",
        confirmParams: { return_url: window.location.href },
      });
      if (error || !setupIntent?.payment_method) return { error: error?.message ?? "Your card couldn’t be saved. Please try another card." };
      const pm = setupIntent.payment_method;
      return { paymentMethodId: typeof pm === "string" ? pm : pm.id };
    });
    return () => register(null);
  }, [stripe, elements, register]);

  return (
    <fieldset className="m-0 flex flex-col gap-3 border-0 p-0">
      <legend className="mb-1 flex items-center gap-2 p-0 font-semibold">
        <CreditCard size={18} strokeWidth={1.8} aria-hidden="true" />
        Card
      </legend>
      <PaymentElement options={{ layout: "tabs" }} />
      <p className="m-0 text-[13px] leading-normal text-slate-600">
        {soon
          ? `Your card is charged ${formatFee(amountCents)} now, since the session is less than 24 hours away.`
          : `Nothing is charged now. Your card is charged ${formatFee(amountCents)} 24 hours before your session. Cancel before then and you won’t be charged.`}{" "}
        Payments are handled by Stripe. FaithWellness never sees your full card number.
      </p>
    </fieldset>
  );
}
