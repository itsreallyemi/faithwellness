// Builds an .ics file for "Add to calendar". Title stays generic for privacy.

const stamp = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");

export function downloadIcs({ id, start, minutes, meetUrl }: { id: string; start: Date; minutes: number; meetUrl: string }) {
  const end = new Date(start.getTime() + minutes * 60_000);
  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//FaithWellness//Prototype//EN",
    "BEGIN:VEVENT",
    `UID:${id}@faithwellness.prototype`,
    `DTSTAMP:${stamp(new Date())}`,
    `DTSTART:${stamp(start)}`,
    `DTEND:${stamp(end)}`,
    "SUMMARY:FaithWellness session",
    `LOCATION:${meetUrl}`,
    `DESCRIPTION:Join on Google Meet: ${meetUrl}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
  const url = URL.createObjectURL(new Blob([ics], { type: "text/calendar" }));
  const a = Object.assign(document.createElement("a"), { href: url, download: "faithwellness-session.ics" });
  a.click();
  URL.revokeObjectURL(url);
}
