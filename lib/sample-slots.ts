import { zonedDate, zonedTimeToUtc } from "@/lib/time";
import type { AvailabilityRule, Duration } from "@/lib/types";

/** Mandatory rest after every session. Cannot be disabled. */
export const REST_BUFFER_MINUTES = 15;

/**
 * Placeholder slots from a counselor's weekly hours only: back-to-back sessions with the
 * 15-minute rest between them, starts snapped to the quarter hour.
 *
 * Phase 6 replaces this with lib/availability.ts, which also removes Google Calendar busy
 * blocks and existing bookings.
 */
export function sampleSlots(
  rules: AvailabilityRule[],
  timeZone: string,
  duration: Duration,
  { from = new Date(), days = 14, leadMinutes = 120 }: { from?: Date; days?: number; leadMinutes?: number } = {},
): Date[] {
  const earliest = from.getTime() + leadMinutes * 60_000;
  const today = zonedDate(from, timeZone);
  const slots: Date[] = [];

  for (let i = 0; i < days; i++) {
    const d = new Date(Date.UTC(today.year, today.month - 1, today.day + i));
    const [year, month, day, weekday] = [d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate(), d.getUTCDay()];

    for (const rule of rules) {
      if (rule.weekday !== weekday) continue;
      const end = toMinutes(rule.end);
      let t = Math.ceil(toMinutes(rule.start) / 15) * 15;
      while (t + duration <= end) {
        const slot = zonedTimeToUtc(year, month, day, Math.floor(t / 60), t % 60, timeZone);
        if (slot.getTime() >= earliest) slots.push(slot);
        t = Math.ceil((t + duration + REST_BUFFER_MINUTES) / 15) * 15;
      }
    }
  }
  return slots.sort((a, b) => a.getTime() - b.getTime());
}

function toMinutes(hhmm: string) {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}
