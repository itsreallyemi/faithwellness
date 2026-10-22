"use client";

import { useState } from "react";
import { CircleCheck } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/cn";

const kinds = [
  { value: "church", label: "A church" },
  { value: "denomination", label: "A denomination or network" },
];

const programs = [
  { value: "yes", label: "Yes, we accredit counselors" },
  { value: "building", label: "We’re building one" },
  { value: "no", label: "Not yet" },
];

const field = "min-h-12 w-full rounded-md border border-border bg-cream px-4 text-base aria-invalid:border-peach-700";

/** PROTOTYPE ONLY: validates and shows the confirmation, but sends nothing. */
export function RegisterForm() {
  const [f, setF] = useState({
    kind: "church",
    org: "",
    city: "",
    tradition: "",
    contact: "",
    role: "",
    email: "",
    program: "",
    memberCare: true,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [sent, setSent] = useState(false);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const v = e.target.type === "checkbox" ? (e.target as HTMLInputElement).checked : e.target.value;
    setF((s) => ({ ...s, [k]: v }));
    setErrors((s) => ({ ...s, [k]: "" }));
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const next: Record<string, string> = {};
    if (!f.org.trim()) next.org = `Add your ${f.kind === "church" ? "church" : "denomination"}’s name.`;
    if (!f.city.trim()) next.city = "Add a city and state, or region.";
    if (!f.contact.trim()) next.contact = "Add the name of the person managing this.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email.trim())) next.email = "Enter an email address like pastor@church.org.";
    if (!f.program) next.program = "Choose the closest option.";
    setErrors(next);
    if (Object.keys(next).length === 0) setSent(true);
  };

  const err = (k: string) =>
    errors[k] ? (
      <p id={`rg-${k}-error`} className="m-0 text-sm text-peach-700">
        {errors[k]}
      </p>
    ) : null;
  const a11y = (k: string) => ({ "aria-invalid": Boolean(errors[k]), "aria-describedby": errors[k] ? `rg-${k}-error` : undefined });

  if (sent) {
    const org = f.org.trim();
    return (
      <Card id="register" as="section" aria-label="Registration sent" className="flex scroll-mt-6 flex-col gap-4 self-start">
        <span className="flex size-14 items-center justify-center rounded-lg bg-sage-100">
          <CircleCheck size={28} strokeWidth={1.8} className="text-sage-700" aria-hidden="true" />
        </span>
        <h2 className="m-0 font-display text-[28px] leading-[34px]">Welcome to the network, {org}</h2>
        <p className="m-0 text-[17px] leading-[1.6] text-slate-600">
          We&rsquo;ll email {f.email.trim()} within a few days to set up your {f.kind === "church" ? "church" : "denomination"}&rsquo;s account.
          {f.program === "yes"
            ? " Next you’ll add your accreditation requirements so we can publish your page."
            : " We’ll share a simple template to help you put your accreditation program into words."}
          {f.memberCare && " Then you can turn on free member care for your congregation."}
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
    <Card id="register" as="section" aria-labelledby="register-title" className="flex scroll-mt-6 flex-col gap-6 self-start">
      <div className="flex flex-col gap-2">
        <h2 id="register-title" className="m-0 font-display text-[28px] leading-[34px]">
          Register your church
        </h2>
        <p className="m-0 text-slate-600">A few details to start. We&rsquo;ll help with the rest.</p>
      </div>

      <form noValidate onSubmit={submit} className="flex flex-col gap-5">
        <fieldset className="m-0 flex flex-col gap-2 border-0 p-0">
          <legend className="mb-2 p-0 font-semibold">You&rsquo;re registering</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {kinds.map((k) => (
              <label
                key={k.value}
                className={cn(
                  "flex min-h-12 cursor-pointer items-center gap-2.5 rounded-md border px-3.5 text-[15px]",
                  f.kind === k.value ? "border-2 border-peach-500 bg-peach-50" : "border-border bg-white",
                )}
              >
                <input type="radio" name="kind" value={k.value} checked={f.kind === k.value} onChange={set("kind")} className="size-[18px] accent-peach-700" />
                {k.label}
              </label>
            ))}
          </div>
        </fieldset>

        <div className="flex flex-col gap-2">
          <label htmlFor="rg-org" className="font-semibold">
            {f.kind === "church" ? "Church name" : "Denomination or network name"}
          </label>
          <input id="rg-org" value={f.org} onChange={set("org")} autoComplete="organization" className={field} {...a11y("org")} />
          {err("org")}
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <label htmlFor="rg-city" className="font-semibold">
              City and state
            </label>
            <input id="rg-city" value={f.city} onChange={set("city")} placeholder="e.g. Pasadena, CA" className={field} {...a11y("city")} />
            {err("city")}
          </div>
          <div className="flex flex-col gap-2">
            <label htmlFor="rg-tradition" className="font-semibold">
              Tradition <span className="font-normal text-slate-600">(optional)</span>
            </label>
            <input id="rg-tradition" value={f.tradition} onChange={set("tradition")} placeholder="e.g. Baptist" className={field} />
          </div>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <label htmlFor="rg-contact" className="font-semibold">
              Your name
            </label>
            <input id="rg-contact" value={f.contact} onChange={set("contact")} autoComplete="name" className={field} {...a11y("contact")} />
            {err("contact")}
          </div>
          <div className="flex flex-col gap-2">
            <label htmlFor="rg-role" className="font-semibold">
              Your role <span className="font-normal text-slate-600">(optional)</span>
            </label>
            <input id="rg-role" value={f.role} onChange={set("role")} placeholder="e.g. Care pastor" className={field} />
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="rg-email" className="font-semibold">
            Email
          </label>
          <input id="rg-email" type="email" autoComplete="email" value={f.email} onChange={set("email")} className={field} {...a11y("email")} />
          {err("email")}
        </div>

        <fieldset className="m-0 flex flex-col gap-2 border-0 p-0" {...a11y("program")}>
          <legend className="mb-2 p-0 font-semibold">Do you have an accreditation program?</legend>
          <div className="flex flex-col gap-2">
            {programs.map((p) => (
              <label
                key={p.value}
                className={cn(
                  "flex min-h-12 cursor-pointer items-center gap-2.5 rounded-md border px-3.5 text-[15px]",
                  f.program === p.value ? "border-2 border-peach-500 bg-peach-50" : "border-border bg-white",
                )}
              >
                <input type="radio" name="program" value={p.value} checked={f.program === p.value} onChange={set("program")} className="size-[18px] accent-peach-700" />
                {p.label}
              </label>
            ))}
          </div>
          {err("program")}
        </fieldset>

        <label className="flex cursor-pointer items-start gap-3 text-[15px] leading-normal">
          <input type="checkbox" checked={f.memberCare} onChange={set("memberCare")} className="mt-0.5 size-5 flex-none accent-peach-700" />
          <span>We&rsquo;d like to offer free sessions to our members</span>
        </label>

        <Button type="submit" size="lg" className="min-h-14 text-base">
          Register
        </Button>
      </form>
    </Card>
  );
}
