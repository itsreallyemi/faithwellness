// Run with: npm test
import assert from "node:assert/strict";
import { test } from "node:test";
import { openSlots } from "./availability.ts";
import { zonedTimeToUtc } from "./time.ts";

const LA = "America/Los_Angeles";
const at = (y: number, mo: number, d: number, h: number, mi = 0, tz = LA) => zonedTimeToUtc(y, mo, d, h, mi, tz);
/** "HH:MM" of each slot in Los Angeles, for readable assertions. */
const times = (slots: Date[]) =>
  slots.map((s) => s.toLocaleTimeString("en-US", { timeZone: LA, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }));

// Tuesday, Nov 3 2026, 9:00–12:00 in Los Angeles. Looked at from the Sunday before, so lead time never matters.
const tuesdayMorning = [{ weekday: 2, start: "09:00", end: "12:00" }];
const sunday = at(2026, 11, 1, 8);
const onTuesday = (slots: Date[]) => slots.filter((s) => s.getTime() >= at(2026, 11, 3, 0).getTime() && s.getTime() < at(2026, 11, 4, 0).getTime());

test("a 60-minute busy block 9:00–10:00 blocks the 10:00 start; the next open start is 10:30", () => {
  const busy = [{ start: at(2026, 11, 3, 9), end: at(2026, 11, 3, 10) }];
  const t = times(onTuesday(openSlots(tuesdayMorning, LA, 30, busy, { from: sunday, days: 3 })));
  assert.ok(!t.includes("10:00"));
  assert.equal(t[0], "10:30");
});

test("a 30-minute slot squeezed between two sessions with under 15 minutes either side is rejected", () => {
  // Busy 9:00–10:00 and 10:45–11:45 leaves 10:00–10:45: with 15-minute rests, nothing fits.
  const busy = [
    { start: at(2026, 11, 3, 9), end: at(2026, 11, 3, 10) },
    { start: at(2026, 11, 3, 10, 45), end: at(2026, 11, 3, 11, 45) },
  ];
  const t = times(onTuesday(openSlots(tuesdayMorning, LA, 30, busy, { from: sunday, days: 3 })));
  assert.deepEqual(t, []);
});

test("sessions must fit inside weekly hours", () => {
  const t = times(onTuesday(openSlots(tuesdayMorning, LA, 60, [], { from: sunday, days: 3 })));
  assert.equal(t[0], "09:00");
  assert.equal(t.at(-1), "11:00"); // 11:30 would end at 12:30, after hours close
});

test("days without weekly hours offer nothing", () => {
  const slots = openSlots(tuesdayMorning, LA, 30, [], { from: sunday, days: 2 }); // Sunday and Monday only
  assert.equal(slots.length, 0);
});

test("nothing sooner than the lead time", () => {
  const from = at(2026, 11, 3, 9, 30); // Tuesday 9:30, two-hour lead → 11:30 earliest
  const t = times(openSlots(tuesdayMorning, LA, 30, [], { from, days: 1 }));
  assert.deepEqual(t, ["11:30"]);
});

test("slots stay at the same local time across the DST change (US clocks go back Nov 1, 2026)", () => {
  const mondays = [{ weekday: 1, start: "10:00", end: "10:30" }];
  const slots = openSlots(mondays, LA, 30, [], { from: at(2026, 10, 25, 8), days: 9 }); // Mondays Oct 26 and Nov 2
  assert.deepEqual(times(slots), ["10:00", "10:00"]);
  // 10:00 PDT is 17:00 UTC; 10:00 PST is 18:00 UTC.
  assert.deepEqual(
    slots.map((s) => s.getUTCHours()),
    [17, 18],
  );
});

test("Los Angeles counselor, Tokyo client: 6:00 PM Monday PDT is 10:00 AM Tuesday in Tokyo", () => {
  const mondayEvening = [{ weekday: 1, start: "18:00", end: "18:30" }];
  const [slot] = openSlots(mondayEvening, LA, 30, [], { from: at(2026, 10, 18, 8), days: 2 }); // Monday Oct 19, PDT
  const tokyo = slot.toLocaleString("en-US", { timeZone: "Asia/Tokyo", weekday: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
  assert.equal(tokyo, "Tue 10:00");
});

test("starts are on the hour and half hour only", () => {
  const t = times(onTuesday(openSlots(tuesdayMorning, LA, 30, [], { from: sunday, days: 3 })));
  assert.deepEqual(t, ["09:00", "09:30", "10:00", "10:30", "11:00", "11:30"]);
});

test("a busy block ending at 10:15 pushes the next start to 10:30 (15-minute rest)", () => {
  const busy = [{ start: at(2026, 11, 3, 9), end: at(2026, 11, 3, 10, 15) }];
  const t = times(onTuesday(openSlots(tuesdayMorning, LA, 30, busy, { from: sunday, days: 3 })));
  assert.equal(t[0], "10:30");
});
