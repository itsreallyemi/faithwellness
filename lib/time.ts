// Small IANA time-zone helpers built on Intl, so no date library is needed.

const partsFormatters = new Map<string, Intl.DateTimeFormat>();

function partsIn(date: Date, timeZone: string) {
  let fmt = partsFormatters.get(timeZone);
  if (!fmt) {
    fmt = new Intl.DateTimeFormat("en-US", {
      timeZone,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
    partsFormatters.set(timeZone, fmt);
  }
  const get = (type: string) => Number(fmt.formatToParts(date).find((p) => p.type === type)!.value);
  return { year: get("year"), month: get("month"), day: get("day"), hour: get("hour"), minute: get("minute"), second: get("second") };
}

/** Offset of `timeZone` from UTC at `date`, in ms (e.g. -7h for Los Angeles in summer). */
function offsetMs(date: Date, timeZone: string) {
  const p = partsIn(date, timeZone);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return asUtc - Math.floor(date.getTime() / 1000) * 1000;
}

/** The UTC instant of a wall-clock time in `timeZone`. month is 1-12. */
export function zonedTimeToUtc(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  timeZone: string,
): Date {
  const guess = Date.UTC(year, month - 1, day, hour, minute);
  const first = offsetMs(new Date(guess), timeZone);
  const candidate = guess - first;
  // Re-check in case the guess and the answer sit on opposite sides of a DST change.
  const second = offsetMs(new Date(candidate), timeZone);
  return new Date(second === first ? candidate : guess - second);
}

/** Calendar date of `date` as seen in `timeZone`, plus its weekday (0 = Sunday). */
export function zonedDate(date: Date, timeZone: string) {
  const { year, month, day } = partsIn(date, timeZone);
  return { year, month, day, weekday: new Date(Date.UTC(year, month - 1, day)).getUTCDay() };
}

/** "Los Angeles" from "America/Los_Angeles". */
export function zoneCity(timeZone: string) {
  return timeZone.split("/").pop()!.replaceAll("_", " ");
}
