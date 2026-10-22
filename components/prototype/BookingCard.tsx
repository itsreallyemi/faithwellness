"use client";

import Link from "next/link";
import { useViewerTimeZone } from "@/components/LocalTime";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import { downloadIcs } from "@/lib/prototype/ics";
import { counselorLocal, formatSession } from "@/lib/prototype/format";
import type { CounselorLite } from "@/lib/prototype/lite";
import { proto, type ProtoBooking } from "@/lib/prototype/store";
import { zoneCity } from "@/lib/time";

export function joinMeet() {
  proto.toast("Prototype: in the real app this opens Google Meet when the session starts.");
}

export function rescheduleHref(b: ProtoBooking) {
  return `/counselors/${b.slug}?duration=${b.duration}&reschedule=${b.id}#book`;
}

/** The "Session confirmed" card posted into the message thread. */
export function BookingCard({ booking: b, counselor: c, className }: { booking: ProtoBooking; counselor: CounselorLite; className?: string }) {
  const tz = useViewerTimeZone(c.timeZone);
  const start = new Date(b.startIso);
  const canceled = b.status === "canceled";
  const local = counselorLocal(start, tz, c.timeZone, c.preferredName);

  return (
    <div
      className={cn(
        "flex w-full max-w-[440px] flex-col gap-2.5 self-center rounded-[20px] border p-4 md:rounded-[22px] md:p-[18px]",
        canceled ? "border-border bg-cream" : "border-peach-200 bg-peach-50",
        className,
      )}
    >
      <span className={cn("label-overline", canceled ? "text-slate-500!" : "text-peach-800!")}>
        {canceled ? "Session canceled" : "Session confirmed"}
      </span>
      <Link href={`/sessions/${b.id}`} className={cn("font-display text-lg leading-6 text-slate-900! no-underline hover:underline md:text-xl", canceled && "line-through")}>
        {formatSession(start, b.duration, tz)}
      </Link>
      <span className="text-[13px] leading-5 text-slate-600">
        Your time ({zoneCity(tz)}){local && ` · ${local}`} · {b.duration} min · Video
        {b.memberCare && " · Free for members"}
        {b.insurance && ` · Insurance (${b.insurance.provider})`}
      </span>
      {!canceled && (
        <div className="flex flex-wrap items-center gap-x-1 gap-y-2">
          <Button onClick={joinMeet} className="text-sm">
            Join Google Meet
          </Button>
          <Button
            variant="link"
            className="text-sm"
            onClick={() => downloadIcs({ id: b.id, start, minutes: b.duration, meetUrl: b.meetUrl })}
          >
            Add to calendar
          </Button>
          <Button variant="link" href={rescheduleHref(b)} className="text-sm">
            Reschedule
          </Button>
        </div>
      )}
    </div>
  );
}
