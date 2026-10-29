"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import { pricingOptions, servicePrice, travelFeeOptions, travelOptions, travelSummary } from "@/lib/services";
import type { ServiceDraft } from "@/lib/supabase/own-counselor";
import type { ServicePricing, Travel, TravelFee } from "@/lib/types";
import { usePortal } from "../PortalShell";
import { field, Panel } from "../ui";

type Row = ServiceDraft & { key: string; on: boolean; price: string };

const dollars = (cents: number) => (cents ? String(Math.round(cents / 100)) : "");

/** Services beyond sessions (weddings, funerals…). Clients send a request; the counselor replies from Requests. */
export function ServicesSettings() {
  const { counselor, serviceTypes, saveServices, real } = usePortal();
  const [rows, setRows] = useState<Row[]>(() => [
    ...serviceTypes.map((t) => {
      const mine = counselor.services.find((s) => s.slug === t.slug);
      return {
        key: t.slug,
        id: mine?.id,
        slug: t.slug,
        customName: "",
        on: Boolean(mine),
        pricing: mine?.pricing ?? ("ask" as ServicePricing),
        priceCents: mine?.priceCents ?? 0,
        price: dollars(mine?.priceCents ?? 0),
        note: mine?.note ?? "",
      };
    }),
    ...counselor.services
      .filter((s) => !s.slug)
      .map((s) => ({ key: s.id, id: s.id, slug: null, customName: s.name, on: true, pricing: s.pricing, priceCents: s.priceCents, price: dollars(s.priceCents), note: s.note })),
  ]);
  const [travel, setTravel] = useState<TravelForm>({
    serviceArea: counselor.serviceArea,
    travel: counselor.travel,
    miles: counselor.travelMiles ? String(counselor.travelMiles) : "",
    travelFee: counselor.travelFee,
    fee: counselor.travelFeeCents ? String(counselor.travelFeeCents / 100) : "",
  });
  const [error, setError] = useState("");

  if (!real) {
    return (
      <Panel id="services" title="Services">
        <p className="m-0 text-slate-600">Sample counselors keep their sample services. Approved counselors set theirs here.</p>
      </Panel>
    );
  }

  const set = (key: string, patch: Partial<Row>) => {
    setError("");
    setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  };
  const listed = rows.filter((r) => r.slug);
  const custom = rows.filter((r) => !r.slug);

  const save = () => {
    const chosen = rows.filter((r) => r.on);
    if (chosen.some((r) => !r.slug && !r.customName.trim())) return setError("Give each of your own services a name, or remove it.");
    if (chosen.some((r) => (r.pricing === "fixed" || r.pricing === "from") && !(Number(r.price) > 0)))
      return setError("Add a price for each service set to “Set fee” or “Starting at”.");
    if (chosen.length && !travel.serviceArea.trim()) return setError("Add where you’re based, so clients know where you serve.");
    if (travel.travel === "radius" && !(Number(travel.miles) > 0)) return setError("Add how many miles you’ll travel.");
    if (travel.travel !== "none" && (travel.travelFee === "fixed" || travel.travelFee === "per_mile") && !(Number(travel.fee) > 0))
      return setError("Add your travel fee, or choose another option.");
    saveServices(
      chosen.map((r) => ({ ...r, priceCents: Math.round((Number(r.price) || 0) * 100) })),
      {
        serviceArea: travel.serviceArea,
        travel: travel.travel,
        travelMiles: Number(travel.miles) || null,
        travelFee: travel.travelFee,
        travelFeeCents: Math.round((Number(travel.fee) || 0) * 100),
      },
    );
  };

  return (
    <Panel
      id="services"
      title="Services"
      intro="Beyond sessions: weddings, funerals and more. Clients send you a request with a date and details, and you reply from Requests. Optional, and not needed to go live."
    >
      <WhereYouServe
        travel={travel}
        setTravel={(patch) => {
          setError("");
          setTravel((t) => ({ ...t, ...patch }));
        }}
      />
      <h3 className="m-0 mt-2 text-lg font-semibold">What you offer</h3>
      <ul className="m-0 flex list-none flex-col gap-2 p-0">
        {listed.map((r) => (
          <li key={r.key} className={cn("rounded-md border px-4", r.on ? "border-peach-400 bg-peach-50" : "border-border bg-white")}>
            <label className="flex min-h-12 cursor-pointer items-center gap-3 text-[15px] font-semibold">
              <input type="checkbox" checked={r.on} onChange={(e) => set(r.key, { on: e.target.checked })} className="size-5 flex-none accent-peach-700" />
              {serviceTypes.find((t) => t.slug === r.slug)?.label}
              {r.on && <span className="ml-auto text-sm font-normal text-slate-600">{servicePrice({ pricing: r.pricing, priceCents: Math.round((Number(r.price) || 0) * 100) })}</span>}
            </label>
            {r.on && <Details row={r} set={set} />}
          </li>
        ))}
        {custom.map((r) => (
          <li key={r.key} className="rounded-md border border-peach-400 bg-peach-50 px-4 pt-3">
            <div className="flex items-end gap-2">
              <label className="flex flex-1 flex-col gap-1.5 text-sm font-semibold">
                Your own service
                <input value={r.customName} onChange={(e) => set(r.key, { customName: e.target.value })} placeholder="e.g. Quinceañera blessings" className={`${field} font-normal`} />
              </label>
              <button
                type="button"
                aria-label={`Remove ${r.customName || "this service"}`}
                onClick={() => setRows((rs) => rs.filter((x) => x.key !== r.key))}
                className="flex size-12 flex-none cursor-pointer items-center justify-center rounded-md text-slate-600 hover:bg-white"
              >
                <Trash2 size={18} strokeWidth={1.8} aria-hidden="true" />
              </button>
            </div>
            <Details row={r} set={set} />
          </li>
        ))}
      </ul>
      <button
        type="button"
        onClick={() =>
          setRows((rs) => [
            ...rs,
            { key: `new-${Date.now()}`, slug: null, customName: "", on: true, pricing: "ask", priceCents: 0, price: "", note: "" },
          ])
        }
        className="inline-flex min-h-11 cursor-pointer items-center gap-2 self-start text-sm font-semibold text-peach-700"
      >
        <Plus size={16} strokeWidth={2} aria-hidden="true" />
        Add your own service
      </button>
      {error && (
        <p role="alert" className="m-0 text-sm text-peach-700">
          {error}
        </p>
      )}
      <Button className="self-start" onClick={save}>
        Save services
      </Button>
    </Panel>
  );
}

function Details({ row: r, set }: { row: Row; set: (key: string, patch: Partial<Row>) => void }) {
  const needsPrice = r.pricing === "fixed" || r.pricing === "from";
  return (
    <div className="grid gap-3 pb-4 sm:grid-cols-2">
      <label className="flex flex-col gap-1.5 text-sm font-semibold">
        Pricing
        <select value={r.pricing} onChange={(e) => set(r.key, { pricing: e.target.value as ServicePricing })} className={`${field} font-normal`}>
          {pricingOptions.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </label>
      {r.pricing !== "ask" && (
        <label className="flex flex-col gap-1.5 text-sm font-semibold">
          {r.pricing === "honorarium" ? (
            <span>
              Suggested amount <span className="font-normal text-slate-600">(optional)</span>
            </span>
          ) : (
            "Price"
          )}
          <span className={`${field} flex items-center gap-1 font-normal`}>
            $
            <input
              inputMode="numeric"
              value={r.price}
              onChange={(e) => set(r.key, { price: e.target.value.replace(/[^\d]/g, "") })}
              aria-invalid={(needsPrice && !(Number(r.price) > 0)) || undefined}
              className="w-full bg-transparent outline-none"
            />
          </span>
        </label>
      )}
      <label className="flex flex-col gap-1.5 text-sm font-semibold sm:col-span-2">
        <span>
          Note for clients <span className="font-normal text-slate-600">(optional)</span>
        </span>
        <input
          value={r.note}
          onChange={(e) => set(r.key, { note: e.target.value })}
          placeholder="e.g. Includes two planning meetings and the rehearsal."
          className={`${field} font-normal`}
        />
      </label>
    </div>
  );
}

type TravelForm = { serviceArea: string; travel: Travel; miles: string; travelFee: TravelFee; fee: string };

/** Base location and travel terms, shared by every in-person service. */
function WhereYouServe({ travel: t, setTravel }: { travel: TravelForm; setTravel: (patch: Partial<TravelForm>) => void }) {
  const needsFee = t.travelFee === "fixed" || t.travelFee === "per_mile";
  const preview = travelSummary({
    serviceArea: t.serviceArea,
    travel: t.travel,
    travelMiles: Number(t.miles) || null,
    travelFee: t.travelFee,
    travelFeeCents: Math.round((Number(t.fee) || 0) * 100),
  });
  return (
    <div className="flex flex-col gap-4 rounded-md bg-cream p-4">
      <h3 className="m-0 text-lg font-semibold">Where you serve</h3>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5 text-sm font-semibold">
          Based in
          <input
            value={t.serviceArea}
            onChange={(e) => setTravel({ serviceArea: e.target.value })}
            placeholder="e.g. Pasadena, CA"
            className={`${field} bg-white font-normal`}
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-semibold">
          Travel
          <select value={t.travel} onChange={(e) => setTravel({ travel: e.target.value as Travel })} className={`${field} bg-white font-normal`}>
            {travelOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        {t.travel === "radius" && (
          <label className="flex flex-col gap-1.5 text-sm font-semibold">
            How far
            <span className={`${field} flex items-center gap-2 bg-white font-normal`}>
              <input
                inputMode="numeric"
                value={t.miles}
                onChange={(e) => setTravel({ miles: e.target.value.replace(/[^\d]/g, "") })}
                aria-label="Miles you will travel"
                className="w-full bg-transparent outline-none"
              />
              miles
            </span>
          </label>
        )}
        {t.travel !== "none" && (
          <label className="flex flex-col gap-1.5 text-sm font-semibold">
            Travel fee
            <select value={t.travelFee} onChange={(e) => setTravel({ travelFee: e.target.value as TravelFee })} className={`${field} bg-white font-normal`}>
              {travelFeeOptions.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
        )}
        {t.travel !== "none" && needsFee && (
          <label className="flex flex-col gap-1.5 text-sm font-semibold">
            {t.travelFee === "per_mile" ? "Fee per mile" : "Travel fee amount"}
            <span className={`${field} flex items-center gap-1 bg-white font-normal`}>
              $
              <input
                inputMode="decimal"
                value={t.fee}
                onChange={(e) => setTravel({ fee: e.target.value.replace(/[^\d.]/g, "") })}
                aria-label={t.travelFee === "per_mile" ? "Travel fee per mile in dollars" : "Travel fee in dollars"}
                className="w-full bg-transparent outline-none"
              />
            </span>
          </label>
        )}
      </div>
      {preview && (
        <p className="m-0 text-sm text-slate-600">
          Clients see: <span className="text-slate-900">{preview}</span>
        </p>
      )}
    </div>
  );
}
