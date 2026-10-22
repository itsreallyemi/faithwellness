import { zoneCity } from "@/lib/time";

/** "Tue, Oct 27" */
export function formatDay(d: Date, timeZone: string) {
  return d.toLocaleDateString("en-US", { timeZone, weekday: "short", month: "short", day: "numeric" });
}

/** "10:00 AM" */
export function formatTime(d: Date, timeZone: string) {
  return d.toLocaleTimeString("en-US", { timeZone, hour: "numeric", minute: "2-digit" });
}

/** "Tue, Oct 27 · 10:00–11:00 AM" */
export function formatSession(start: Date, minutes: number, timeZone: string) {
  const end = new Date(start.getTime() + minutes * 60_000);
  const s = formatTime(start, timeZone);
  const e = formatTime(end, timeZone);
  const sameHalf = s.slice(-2) === e.slice(-2);
  return `${formatDay(start, timeZone)} · ${sameHalf ? s.slice(0, -3) : s}–${e}`;
}

/** "Mon 6:00 PM for Ruth (Los Angeles)", or null when both are in the same zone. */
export function counselorLocal(start: Date, viewerTz: string, counselorTz: string, preferredName: string) {
  if (formatTime(start, viewerTz) === formatTime(start, counselorTz) && formatDay(start, viewerTz) === formatDay(start, counselorTz)) {
    return null;
  }
  const day = start.toLocaleDateString("en-US", { timeZone: counselorTz, weekday: "short" });
  return `${day} ${formatTime(start, counselorTz)} for ${preferredName} (${zoneCity(counselorTz)})`;
}
