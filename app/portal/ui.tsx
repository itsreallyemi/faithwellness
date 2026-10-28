"use client";

import { Card } from "@/components/ui/Card";
import { formatDay, formatTime } from "@/lib/prototype/format";
import { zonedDate } from "@/lib/time";

export function PageHeader({ title, sub, aside }: { title: string; sub?: string; aside?: React.ReactNode }) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-3">
      <div className="flex flex-col gap-1.5">
        <h1 className="m-0 font-display text-[32px] leading-[1.1] md:text-[40px]">{title}</h1>
        {sub && <span className="text-[15px] text-slate-600">{sub}</span>}
      </div>
      {aside}
    </header>
  );
}

export function Panel({
  id,
  title,
  intro,
  action,
  className,
  children,
}: {
  id: string;
  title: string;
  intro?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Card as="section" aria-labelledby={id} padding="compact" className={`flex flex-col gap-4 ${className ?? ""}`}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div className="flex flex-col gap-1">
          <h2 id={id} className="m-0 font-display text-[24px] leading-8">
            {title}
          </h2>
          {intro && <span className="text-sm leading-normal text-slate-600">{intro}</span>}
        </div>
        {action}
      </div>
      {children}
    </Card>
  );
}

/** "Today", "Tomorrow", "Yesterday" or "Tue, Oct 27", in the counselor's time zone. */
export function dayLabel(d: Date, timeZone: string, now = new Date()) {
  const a = zonedDate(d, timeZone);
  const b = zonedDate(now, timeZone);
  const diff = Math.round((Date.UTC(a.year, a.month - 1, a.day) - Date.UTC(b.year, b.month - 1, b.day)) / 86_400_000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  if (diff === -1) return "Yesterday";
  return formatDay(d, timeZone);
}

/** "Today, 4:15 PM" */
export function when(iso: string, timeZone: string) {
  const d = new Date(iso);
  return `${dayLabel(d, timeZone)}, ${formatTime(d, timeZone)}`;
}

/** "Thu 8:15 AM for the client (Tokyo)", or null when they share the counselor's zone. */
export function clientLocal(iso: string, counselorTz: string, clientTz: string) {
  const d = new Date(iso);
  if (formatTime(d, counselorTz) === formatTime(d, clientTz) && formatDay(d, counselorTz) === formatDay(d, clientTz)) return null;
  const day = d.toLocaleDateString("en-US", { timeZone: clientTz, weekday: "short" });
  return `client: ${day} ${formatTime(d, clientTz)}`;
}

export const field = "min-h-12 w-full rounded-md border border-border bg-cream px-4 text-base aria-invalid:border-peach-700";
export const smallButton = "min-h-11! px-4! text-sm";
