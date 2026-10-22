"use client";

import { useState } from "react";
import { CircleCheck } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/cn";

type Body = { slug: string; name: string };

const roles = [
  { value: "pastor", label: "Pastor or minister" },
  { value: "lay", label: "Lay counselor" },
  { value: "clinician", label: "Licensed clinician" },
];

const NOT_LISTED = "not-listed";

const field = "min-h-12 w-full rounded-md border border-border bg-cream px-4 text-base aria-invalid:border-peach-700";

/** PROTOTYPE ONLY: validates and shows the confirmation, but sends nothing. */
export function ApplyForm({ bodies }: { bodies: Body[] }) {
  const [f, setF] = useState({ name: "", email: "", role: "", body: "", church: "", license: "", note: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [sent, setSent] = useState(false);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setF((s) => ({ ...s, [k]: e.target.value }));
    setErrors((s) => ({ ...s, [k]: "" }));
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const next: Record<string, string> = {};
    if (!f.name.trim()) next.name = "Add your name.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email.trim())) next.email = "Enter an email address like name@church.org.";
    if (!f.role) next.role = "Choose the option closest to your role.";
    if (!f.body) next.body = "Choose who accredits you.";
    if (f.body === NOT_LISTED && !f.church.trim()) next.church = "Tell us your church or denomination.";
    if (f.role === "clinician" && !f.license.trim()) next.license = "Add your license type and state.";
    setErrors(next);
    if (Object.keys(next).length === 0) setSent(true);
  };

  const bodyName = bodies.find((b) => b.slug === f.body)?.name;
  const err = (k: string) =>
    errors[k] ? (
      <p id={`${k}-error`} className="m-0 text-sm text-peach-700">
        {errors[k]}
      </p>
    ) : null;
  const a11y = (k: string) => ({ "aria-invalid": Boolean(errors[k]), "aria-describedby": errors[k] ? `${k}-error` : undefined });

  if (sent) {
    return (
      <Card id="apply" as="section" aria-label="Application sent" className="flex scroll-mt-6 flex-col gap-4 self-start">
        <span className="flex size-14 items-center justify-center rounded-lg bg-sage-100">
          <CircleCheck size={28} strokeWidth={1.8} className="text-sage-700" aria-hidden="true" />
        </span>
        <h2 className="m-0 font-display text-[28px] leading-[34px]">Thank you, {f.name.trim().split(" ")[0]}</h2>
        <p className="m-0 text-[17px] leading-[1.6] text-slate-600">
          {f.body === NOT_LISTED
            ? `We’ll contact ${f.church.trim()} about publishing their accreditation requirements, and email you at ${f.email.trim()} when they’re listed.`
            : `We’ll confirm your accreditation with ${bodyName} and email you at ${f.email.trim()} with a link to set up your profile. This usually takes a few days.`}
        </p>
        <p className="m-0 rounded-md border border-dashed border-peach-400 bg-peach-50 px-4 py-3 text-sm text-peach-800">
          Prototype: nothing was sent or saved.
        </p>
        <Button variant="link" onClick={() => setSent(false)} className="self-start px-0!">
          Edit my answers
        </Button>
      </Card>
    );
  }

  return (
    <Card id="apply" as="section" aria-labelledby="apply-title" className="flex scroll-mt-6 flex-col gap-6 self-start">
      <div className="flex flex-col gap-2">
        <h2 id="apply-title" className="m-0 font-display text-[28px] leading-[34px]">
          Apply to join
        </h2>
        <p className="m-0 text-slate-600">It takes two minutes. We&rsquo;ll be in touch about next steps.</p>
      </div>

      <form noValidate onSubmit={submit} className="flex flex-col gap-5">
        <div className="flex flex-col gap-2">
          <label htmlFor="ap-name" className="font-semibold">
            Full name
          </label>
          <input id="ap-name" autoComplete="name" value={f.name} onChange={set("name")} className={field} {...a11y("name")} />
          {err("name")}
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="ap-email" className="font-semibold">
            Email
          </label>
          <input id="ap-email" type="email" autoComplete="email" value={f.email} onChange={set("email")} className={field} {...a11y("email")} />
          {err("email")}
        </div>

        <fieldset className="m-0 flex flex-col gap-2 border-0 p-0" {...a11y("role")}>
          <legend className="mb-2 p-0 font-semibold">Your role</legend>
          <div className="grid gap-2 sm:grid-cols-3">
            {roles.map((r) => (
              <label
                key={r.value}
                className={cn(
                  "flex min-h-12 cursor-pointer items-center gap-2.5 rounded-md border px-3.5 text-[15px]",
                  f.role === r.value ? "border-2 border-peach-500 bg-peach-50" : "border-border bg-white",
                )}
              >
                <input type="radio" name="role" value={r.value} checked={f.role === r.value} onChange={set("role")} className="size-[18px] accent-peach-700" />
                {r.label}
              </label>
            ))}
          </div>
          {err("role")}
        </fieldset>

        {f.role === "clinician" && (
          <div className="flex flex-col gap-2">
            <label htmlFor="ap-license" className="font-semibold">
              License type and state
            </label>
            <input id="ap-license" value={f.license} onChange={set("license")} placeholder="e.g. LMFT, California" className={field} {...a11y("license")} />
            {err("license")}
          </div>
        )}

        <div className="flex flex-col gap-2">
          <label htmlFor="ap-body" className="font-semibold">
            Who accredits you?
          </label>
          <select id="ap-body" value={f.body} onChange={set("body")} className={field} {...a11y("body")}>
            <option value="">Choose one</option>
            {bodies.map((b) => (
              <option key={b.slug} value={b.slug}>
                {b.name}
              </option>
            ))}
            <option value={NOT_LISTED}>Mine isn&rsquo;t listed</option>
          </select>
          {err("body")}
        </div>

        {f.body === NOT_LISTED && (
          <div className="flex flex-col gap-2">
            <label htmlFor="ap-church" className="font-semibold">
              Church or denomination name
            </label>
            <input id="ap-church" value={f.church} onChange={set("church")} className={field} {...a11y("church")} />
            <span className="text-[13px] text-slate-600">We&rsquo;ll invite them to publish their requirements.</span>
            {err("church")}
          </div>
        )}

        <div className="flex flex-col gap-2">
          <label htmlFor="ap-note" className="font-semibold">
            Anything else? <span className="font-normal text-slate-600">(optional)</span>
          </label>
          <textarea
            id="ap-note"
            rows={3}
            value={f.note}
            onChange={set("note")}
            placeholder="Who you serve, languages, anything we should know."
            className="resize-y rounded-md border border-border bg-cream px-4 py-3 text-base leading-[1.6]"
          />
        </div>

        <Button type="submit" size="lg" className="min-h-14 text-base">
          Send application
        </Button>
      </form>
    </Card>
  );
}
