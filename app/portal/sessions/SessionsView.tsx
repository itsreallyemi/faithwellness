"use client";

import { useState } from "react";
import { Video } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/cn";
import { formatSession, formatTime } from "@/lib/prototype/format";
import type { PortalSession } from "@/lib/prototype/portal";
import { toProtoBooking } from "@/lib/bookings";
import { formatFee } from "@/lib/format";
import { proto, type ProtoBooking } from "@/lib/prototype/store";
import { supabaseBrowser } from "@/lib/supabase/client";
import { cancelReal } from "@/lib/supabase/bookings";
import { usePortal } from "../PortalShell";
import { clientLocal, dayLabel, field, PageHeader, smallButton } from "../ui";

type Tab = "upcoming" | "past" | "canceled";

export function SessionsView() {
  const { sessions, settings } = usePortal();
  const [tab, setTab] = useState<Tab>("upcoming");
  const now = Date.now();
  const ends = (x: PortalSession) => new Date(x.startIso).getTime() + x.duration * 60_000;
  const lists: Record<Tab, PortalSession[]> = {
    upcoming: sessions.filter((x) => x.status === "confirmed" && ends(x) > now),
    past: sessions.filter((x) => x.status === "confirmed" && ends(x) <= now).reverse(),
    canceled: sessions.filter((x) => x.status === "canceled"),
  };
  const shown = lists[tab];

  return (
    <>
      <PageHeader title="Sessions" sub={`Times in your time zone, ${settings.timeZone.replace(/_/g, " ")}.`} />

      <div role="tablist" aria-label="Sessions" className="flex gap-1 border-b border-border-warm">
        {(["upcoming", "past", "canceled"] as const).map((t) => (
          <button
            key={t}
            type="button"
            role="tab"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            className={cn(
              "-mb-px min-h-12 cursor-pointer border-b-2 border-transparent px-3 text-[15px] whitespace-nowrap text-slate-600 capitalize sm:px-4",
              tab === t && "border-peach-500 font-semibold text-slate-900",
            )}
          >
            {t} <span className="text-slate-600">({lists[t].length})</span>
          </button>
        ))}
      </div>

      {shown.length === 0 ? (
        <p className="m-0 rounded-md bg-white px-5 py-4 text-[15px] text-slate-600">
          {{ upcoming: "No upcoming sessions.", past: "No past sessions yet.", canceled: "No canceled sessions." }[tab]}
        </p>
      ) : (
        <ul className="m-0 flex list-none flex-col gap-3 p-0">
          {shown.map((x) => (
            <li key={x.id}>
              <SessionRow session={x} upcoming={tab === "upcoming"} />
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

function SessionRow({ session: x, upcoming }: { session: PortalSession; upcoming: boolean }) {
  const { counselor, settings, save, reload } = usePortal();
  const tz = settings.timeZone;
  const [canceling, setCanceling] = useState(false);
  const [note, setNote] = useState("");
  const start = new Date(x.startIso);
  const meet = x.real ? Boolean(x.meetUrl) : settings.google.connected && settings.google.autoMeet;

  const cancel = async () => {
    const day = formatSession(start, x.duration, x.clientTimeZone);
    if (x.real && x.bookingId) {
      // Removes the Google event; Google emails the client that it's canceled.
      const ok = await cancelReal(x.bookingId, note.trim() || `${counselor.preferredName} canceled the session on ${day}.`);
      setCanceling(false);
      if (!ok) return proto.toast("That didn’t cancel. Please try again.");
      reload();
      return proto.toast(`Session canceled. ${x.clientName} has been told by email.`);
    }
    if (x.bookingId) {
      proto.cancel(x.bookingId, `${counselor.preferredName} canceled the session on ${day}.`);
      if (note.trim()) proto.counselorSend(counselor.slug, note.trim());
    } else {
      save({ canceledSamples: [...settings.canceledSamples, x.id] });
    }
    proto.toast(`Session canceled. ${x.clientName} has been told.`);
    setCanceling(false);
  };

  return (
    <Card padding="none" className="flex flex-col gap-4 p-5 md:grid md:grid-cols-[1.2fr_1fr_1fr_auto] md:items-center md:gap-5">
      <div className="flex flex-col">
        <b className="text-[16px]">
          {dayLabel(start, tz)}, {formatTime(start, tz)}
        </b>
        <span className="text-[13px] text-slate-600">{clientLocal(x.startIso, tz, x.clientTimeZone) ?? "same time zone"}</span>
      </div>
      <div className="flex flex-col">
        <span className="text-[15px]">
          <b>{x.clientName}</b> · {x.duration} min
        </span>
        <span className="text-[13px] text-slate-600">{x.firstSession ? "First session" : "Returning client"}</span>
      </div>
      <span className="text-sm text-slate-600">{x.payment}</span>
      <div className="flex flex-wrap gap-2 md:justify-end">
        {upcoming && meet && (
          <Button href={x.meetUrl} target="_blank" rel="noreferrer" className={smallButton}>
            <Video size={16} strokeWidth={1.8} aria-hidden="true" />
            Join
          </Button>
        )}
        <Button href="/portal/messages" variant="secondary" className={smallButton}>
          Message
        </Button>
        {upcoming && !canceling && (
          <Button variant="link" className={smallButton} onClick={() => setCanceling(true)}>
            Cancel
          </Button>
        )}
      </div>

      {upcoming && !canceling && x.bookingId && <PendingAnswer bookingId={x.bookingId} real={Boolean(x.real)} clientName={x.clientName} />}

      {canceling && (
        <div className="flex flex-col gap-3 rounded-md bg-cream p-4 md:col-span-4">
          <b className="text-[15px]">Cancel this session with {x.clientName}?</b>
          <span className="text-sm text-slate-600">
            They&rsquo;ll get a message and an email, and the time opens up again. The event and rest block are removed from your
            calendar.
          </span>
          <label className="flex flex-col gap-1.5 text-sm font-semibold">
            Note to {x.clientName} (optional)
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              className={`${field} py-3 font-normal`}
              placeholder="For example, offer another time that works for you."
            />
          </label>
          <div className="flex flex-wrap gap-2">
            <Button className={smallButton} onClick={cancel}>
              Cancel session
            </Button>
            <Button variant="secondary" className={smallButton} onClick={() => setCanceling(false)}>
              Keep it
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}

/**
 * A price offer or insurance check on this session that's waiting for the counselor, answered right here.
 * Real bookings save through the database; prototype ones change this browser only.
 */
function PendingAnswer({ bookingId, real, clientName }: { bookingId: string; real: boolean; clientName: string }) {
  const { s, ownBookings, reload } = usePortal();
  const [busy, setBusy] = useState(false);
  const row = real ? ownBookings.find((r) => r.id === bookingId) : null;
  const b: ProtoBooking | undefined = row ? toProtoBooking(row) : s.bookings.find((x) => x.id === bookingId);
  const offer = b?.priceRequest?.status === "pending" ? b.priceRequest : null;
  const insurance = b?.insurance?.status === "pending" ? b.insurance : null;
  if (!b || (!offer && !insurance)) return null;

  const answer = async (kind: "offer" | "insurance", yes: boolean) => {
    const done =
      kind === "offer"
        ? yes
          ? `Offer accepted. ${clientName} will see it on their session page.`
          : `Reply saved. ${clientName} can keep the session at the usual fee or cancel.`
        : yes
          ? "Coverage marked as verified."
          : `Marked as not covered. ${clientName} will see the usual fee.`;
    if (!real) {
      if (kind === "offer") proto.setPriceRequestStatus(b.id, yes ? "accepted" : "declined");
      else proto.setInsuranceStatus(b.id, yes ? "verified" : "not-covered");
      return proto.toast(done);
    }
    setBusy(true);
    const { error } =
      kind === "offer"
        ? await supabaseBrowser().rpc("answer_price_offer", { p_id: b.id, p_accept: yes })
        : await supabaseBrowser().rpc("answer_insurance", { p_id: b.id, p_covered: yes });
    setBusy(false);
    proto.toast(error ? "That didn’t save. Please try again." : done);
    reload();
  };

  const reply = (
    <Button href="/portal/messages" variant="link" className={smallButton}>
      Reply
    </Button>
  );

  return (
    <div className="flex flex-col gap-3 rounded-md border border-peach-400 bg-peach-50 p-4 md:col-span-4">
      {offer && (
        <div className="flex flex-col gap-2.5">
          <span className="text-[15px]">
            <b>{clientName}</b>{" "}
            {offer.offeredCents === 0 ? "asked to meet for free" : `offered ${formatFee(offer.offeredCents)}`}
            {b.feeCents > 0 && <> instead of your usual {formatFee(b.feeCents)}</>}.
          </span>
          {offer.note && <q className="text-[15px] text-slate-600 italic">{offer.note}</q>}
          <div className="flex flex-wrap gap-2">
            <Button className={smallButton} disabled={busy} onClick={() => answer("offer", true)}>
              Accept
            </Button>
            <Button variant="secondary" className={smallButton} disabled={busy} onClick={() => answer("offer", false)}>
              Decline
            </Button>
            {reply}
          </div>
        </div>
      )}
      {insurance && (
        <div className="flex flex-col gap-2.5">
          <span className="text-[15px]">
            <b>{clientName}</b> wants to use <b>{insurance.provider}</b>. Member ID ends in {insurance.memberIdLast4}
            {insurance.groupNumber && `, group ${insurance.groupNumber}`}.
          </span>
          <div className="flex flex-wrap gap-2">
            <Button className={smallButton} disabled={busy} onClick={() => answer("insurance", true)}>
              Coverage verified
            </Button>
            <Button variant="secondary" className={smallButton} disabled={busy} onClick={() => answer("insurance", false)}>
              Not covered
            </Button>
            {reply}
          </div>
        </div>
      )}
    </div>
  );
}
