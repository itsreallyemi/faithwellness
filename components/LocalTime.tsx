"use client";

import { useEffect, useState } from "react";
import { useProto } from "@/lib/prototype/store";
import { zonedDate } from "@/lib/time";

/** This device's IANA zone, or null until the browser has rendered. */
export function useDeviceTimeZone() {
  const [tz, setTz] = useState<string | null>(null);
  useEffect(() => setTz(Intl.DateTimeFormat().resolvedOptions().timeZone), []);
  return tz;
}

/**
 * The zone to show times in: the one the signed-in client chose on their profile, else this
 * device's, else `fallback` during server render and the first client render.
 */
export function useViewerTimeZone(fallback: string) {
  const device = useDeviceTimeZone();
  const chosen = useProto()?.user?.timeZone;
  return chosen ?? device ?? fallback;
}

/** "today 4:15 PM", "tomorrow 9:00 AM" or "Tue 10:00 AM", in the viewer's time zone. */
export function formatOpening(date: Date, timeZone: string, now = new Date()) {
  const time = date.toLocaleTimeString("en-US", { timeZone, hour: "numeric", minute: "2-digit" });
  const d = zonedDate(date, timeZone);
  const today = zonedDate(now, timeZone);
  const dayDiff = Math.round(
    (Date.UTC(d.year, d.month - 1, d.day) - Date.UTC(today.year, today.month - 1, today.day)) / 86_400_000,
  );
  if (dayDiff === 0) return `today ${time}`;
  if (dayDiff === 1) return `tomorrow ${time}`;
  const dow = date.toLocaleDateString("en-US", { timeZone, weekday: "short" });
  return dayDiff < 7 ? `${dow} ${time}` : `${date.toLocaleDateString("en-US", { timeZone, month: "short", day: "numeric" })} ${time}`;
}

export function NextOpening({ iso, fallbackTimeZone }: { iso: string; fallbackTimeZone: string }) {
  const tz = useViewerTimeZone(fallbackTimeZone);
  return (
    <time dateTime={iso} suppressHydrationWarning>
      Next opening {formatOpening(new Date(iso), tz)}
    </time>
  );
}
