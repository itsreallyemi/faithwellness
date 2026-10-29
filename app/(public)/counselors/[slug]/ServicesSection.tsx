"use client";

import Link from "next/link";
import { useState } from "react";
import { CircleCheck, MapPin } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { servicePrice } from "@/lib/services";
import { authEnabled, ownCounselorSlug, supabaseBrowser, useAuthState } from "@/lib/supabase/client";
import type { CounselorService } from "@/lib/types";

const field = "min-h-12 w-full rounded-md border border-border bg-cream px-4 text-base aria-invalid:border-peach-700";

/** Weddings, funerals and other services. Clients send a request; the counselor replies from their portal. */
export function ServicesSection({
  slug,
  preferredName,
  services,
  travel,
  serviceArea,
}: {
  slug: string;
  preferredName: string;
  services: CounselorService[];
  /** "Based in Pasadena, CA · Travels up to 50 miles · Travel fee $50". */
  travel: string;
  serviceArea: string;
}) {
  const auth = useAuthState();
  const [open, setOpen] = useState<string | null>(null);
  const [sent, setSent] = useState<string | null>(null);
  if (!services.length) return null;
  const isSelf = ownCounselorSlug === slug;

  return (
    <Card as="section" id="services" aria-labelledby="services-title" className="flex scroll-mt-6 flex-col gap-5 md:p-9!">
      <div className="flex flex-col gap-1.5">
        <h2 id="services-title" className="m-0 font-display text-[28px] leading-[34px]">
          Other services
        </h2>
        <p className="m-0 text-[15px] text-slate-600">
          Send {preferredName} a request with your date and details. {preferredName} will reply to confirm, ask questions or
          suggest someone else.
        </p>
        {travel && (
          <p className="m-0 flex items-start gap-2 text-[15px]">
            <MapPin size={18} strokeWidth={1.8} className="mt-0.5 flex-none text-peach-700" aria-hidden="true" />
            {travel}
          </p>
        )}
      </div>
      <ul className="m-0 flex list-none flex-col p-0">
        {services.map((s) => (
          <li key={s.id} className="flex flex-col gap-3 border-t border-border-warm py-4 first:border-t-0 first:pt-0 last:pb-0">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <b className="text-[17px]">{s.name}</b>
                <span className="text-[15px] text-slate-600">{servicePrice(s)}</span>
                {s.note && <span className="text-sm leading-normal text-slate-600">{s.note}</span>}
              </div>
              {sent === s.id ? (
                <span className="flex min-h-11 items-center gap-1.5 text-sm font-semibold text-sage-700">
                  <CircleCheck size={18} strokeWidth={2} aria-hidden="true" />
                  Request sent
                </span>
              ) : !authEnabled || isSelf ? null : auth === "signed-in" ? (
                open !== s.id && (
                  <Button variant="secondary" className="flex-none self-start" onClick={() => setOpen(s.id)}>
                    Request
                  </Button>
                )
              ) : (
                <Button variant="secondary" className="flex-none self-start" href={`/sign-in?next=${encodeURIComponent(`/counselors/${slug}#services`)}`}>
                  Sign in to request
                </Button>
              )}
            </div>
            {open === s.id && auth === "signed-in" && (
              <RequestForm
                service={s}
                preferredName={preferredName}
                serviceArea={serviceArea}
                onCancel={() => setOpen(null)}
                onSent={() => {
                  setOpen(null);
                  setSent(s.id);
                }}
              />
            )}
            {sent === s.id && (
              <p className="m-0 rounded-md bg-sage-100 px-4 py-3 text-sm text-sage-700">
                {preferredName} will see it in their portal. Their reply appears on <Link href="/account#requests">your account page</Link>.
              </p>
            )}
          </li>
        ))}
      </ul>
    </Card>
  );
}

function RequestForm({
  service,
  preferredName,
  serviceArea,
  onCancel,
  onSent,
}: {
  service: CounselorService;
  preferredName: string;
  serviceArea: string;
  onCancel: () => void;
  onSent: () => void;
}) {
  const [date, setDate] = useState("");
  const [flexible, setFlexible] = useState(false);
  const [location, setLocation] = useState("");
  const [details, setDetails] = useState("");
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const today = new Date().toISOString().slice(0, 10);

  return (
    <form
      noValidate
      className="flex flex-col gap-4 rounded-md bg-cream p-4 md:p-5"
      aria-label={`Request: ${service.name}`}
      onSubmit={async (e) => {
        e.preventDefault();
        if (!details.trim()) return setError(`Tell ${preferredName} a little about what you need.`);
        setSending(true);
        const { error } = await supabaseBrowser().rpc("request_service", {
          p_service: service.id,
          p_date: date || null,
          p_flexible: flexible,
          p_location: location,
          p_details: details,
        });
        setSending(false);
        if (error) return setError("We couldn’t send your request. Please try again.");
        onSent();
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5 text-sm font-semibold">
          <span>
            Date <span className="font-normal text-slate-600">(if you have one)</span>
          </span>
          <input type="date" min={today} value={date} onChange={(e) => setDate(e.target.value)} className={`${field} font-normal`} />
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-semibold">
          <span>
            Where <span className="font-normal text-slate-600">(optional)</span>
          </span>
          <input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="City, church or venue" className={`${field} font-normal`} />
          {serviceArea && <span className="font-normal text-slate-600">{preferredName} is based in {serviceArea}.</span>}
        </label>
      </div>
      <label className="flex min-h-11 cursor-pointer items-center gap-3 text-[15px]">
        <input type="checkbox" checked={flexible} onChange={(e) => setFlexible(e.target.checked)} className="size-5 flex-none accent-peach-700" />
        My dates are flexible
      </label>
      <label className="flex flex-col gap-1.5 text-sm font-semibold">
        Details
        <textarea
          rows={4}
          value={details}
          onChange={(e) => {
            setDetails(e.target.value);
            setError("");
          }}
          aria-invalid={Boolean(error) || undefined}
          placeholder="Tell them about the occasion, who it’s for and anything they should know."
          className={`${field} py-3 font-normal`}
        />
      </label>
      <p className="m-0 text-[13px] leading-normal text-slate-600">
        We&rsquo;ll share your name and email with {preferredName} so they can reply.
      </p>
      {error && (
        <p role="alert" className="m-0 text-sm text-peach-700">
          {error}
        </p>
      )}
      <div className="flex flex-wrap items-center gap-4">
        <Button type="submit" disabled={sending}>
          {sending ? "Sending…" : "Send request"}
        </Button>
        <Button variant="link" onClick={onCancel} className="px-0!">
          Cancel
        </Button>
      </div>
    </form>
  );
}
