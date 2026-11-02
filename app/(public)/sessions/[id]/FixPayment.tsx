"use client";

import { useCallback, useRef, useState } from "react";
import { CircleAlert } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { toProtoBooking, type BookingRow } from "@/lib/bookings";
import { formatFee } from "@/lib/format";
import { proto } from "@/lib/prototype/store";
import { CardSection, type SaveCard } from "../../book/[slug]/CardSection";

/** The member's saved card was declined when it was charged: pay with another card so the session goes ahead. */
export function FixPayment({ bookingId, amountCents, counselorName }: { bookingId: string; amountCents: number; counselorName: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const saveCard = useRef<SaveCard | null>(null);
  const register = useCallback((fn: SaveCard | null) => {
    saveCard.current = fn;
  }, []);

  const pay = async () => {
    setBusy(true);
    setError("");
    const saved = saveCard.current ? await saveCard.current() : { error: "The card form is still loading. Please try again." };
    if ("error" in saved) {
      setBusy(false);
      return setError(saved.error);
    }
    try {
      const res = await fetch(`/api/bookings/${bookingId}/pay`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentMethodId: saved.paymentMethodId }),
      });
      const data = (await res.json()) as {
        booking?: BookingRow;
        error?: string;
      };
      if (data.booking) proto.saveRealBooking(toProtoBooking(data.booking));
      if (res.ok) proto.toast(`Paid ${formatFee(amountCents)}. Thank you.`);
      else
        setError(data.error === "card-declined" ? "That card was declined too. Please try another card." : "Something went wrong. Please try again.");
    } catch {
      setError("Something went wrong. Please try again.");
    }
    setBusy(false);
  };

  return (
    <div className="flex flex-col gap-4 rounded-md border border-peach-400 bg-peach-50 p-4">
      <div className="flex flex-col gap-1">
        <b className="flex items-center gap-2 text-[17px]">
          <CircleAlert size={18} strokeWidth={1.8} className="text-peach-700" aria-hidden="true" />
          Your payment didn&rsquo;t go through
        </b>
        <span className="text-[15px] text-slate-600">
          Your card was declined for this session. Add another card so your time with {counselorName} can go ahead.
        </span>
      </div>
      <CardSection amountCents={amountCents} soon register={register} newOnly />
      {error && (
        <p role="alert" className="m-0 text-sm text-peach-800">
          {error}
        </p>
      )}
      <Button className="self-start" disabled={busy} onClick={pay}>
        {busy ? "Paying…" : `Pay ${formatFee(amountCents)}`}
      </Button>
    </div>
  );
}
