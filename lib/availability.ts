// Which session start times a counselor can actually offer: their weekly hours, minus anything busy in their
// Google Calendar (and FaithWellness bookings), with the mandatory 15-minute rest on either side of every busy
// block. See docs/booking-engine.md. Pure functions, so they can be tested without Google.
//
// Relative imports (not "@/lib/…") so `node --test` can run lib/availability.test.ts directly.

import { zonedDate, zonedTimeToUtc } from "./time.ts";
import type { AvailabilityRule, Duration } from "./types.ts";

/** Mandatory rest after every session. Cannot be disabled. */
export const REST_MINUTES = 15;
/** Starts snap to :00 and :30 in the counselor's time zone, so clients see a short, readable list. */
const GRID_MINUTES = 30;
const MINUTE = 60_000;

export type Busy = { start: Date; end: Date };

/**
 * A slot is open unless some busy block comes within the rest buffer of it:
 *   conflict ⇔ busy.start < slot.end + 15m && busy.end + 15m > slot.start
 */
export function conflicts(slotStart: Date, duration: number, busy: Busy[]) {
  const start = slotStart.getTime();
  const end = start + duration * MINUTE;
  const rest = REST_MINUTES * MINUTE;
  return busy.some((b) => b.start.getTime() < end + rest && b.end.getTime() + rest > start);
}

/**
 * Open start times from `from` for `days` days, soonest first. Candidates come from each weekly-hours window
 * in the counselor's zone on a 30-minute grid; the session must end inside the window; nothing sooner than
 * `leadMinutes` from now; and no conflict with `busy`.
 */
export function openSlots(
  rules: AvailabilityRule[],
  timeZone: string,
  duration: Duration,
  busy: Busy[],
  { from = new Date(), days = 21, leadMinutes = 120 }: { from?: Date; days?: number; leadMinutes?: number } = {},
): Date[] {
  const earliest = from.getTime() + leadMinutes * MINUTE;
  const today = zonedDate(from, timeZone);
  const slots: Date[] = [];

  for (let i = 0; i < days; i++) {
    const d = new Date(Date.UTC(today.year, today.month - 1, today.day + i));
    const [year, month, day, weekday] = [d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate(), d.getUTCDay()];
    for (const rule of rules) {
      if (rule.weekday !== weekday) continue;
      const end = toMinutes(rule.end);
      for (let t = Math.ceil(toMinutes(rule.start) / GRID_MINUTES) * GRID_MINUTES; t + duration <= end; t += GRID_MINUTES) {
        const slot = zonedTimeToUtc(year, month, day, Math.floor(t / 60), t % 60, timeZone);
        if (slot.getTime() >= earliest && !conflicts(slot, duration, busy)) slots.push(slot);
      }
    }
  }
  return slots.sort((a, b) => a.getTime() - b.getTime());
}

function toMinutes(hhmm: string) {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}
