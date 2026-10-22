"use client";

import { BadgeCheck } from "lucide-react";
import { formatFee } from "@/lib/format";
import { useIsMemberOf } from "@/lib/prototype/store";

/** The fees row on a counselor card. Shows "Free for members" to verified members of the counselor's church. */
export function MemberFee({ churchSlug, fee30Cents, fee60Cents }: { churchSlug: string | null; fee30Cents: number; fee60Cents: number }) {
  const member = useIsMemberOf(churchSlug);

  if (member) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-md bg-sage-100 px-3.5 py-3 text-sm md:px-4">
        <span className="flex items-center gap-1.5 font-semibold text-sage-700">
          <BadgeCheck size={16} strokeWidth={1.8} aria-hidden="true" />
          Free for members
        </span>
        <span className="text-slate-600">
          <span className="sr-only">Usual fees </span>
          <s>
            {formatFee(fee30Cents)} / 30 · {formatFee(fee60Cents)} / 60
          </s>
        </span>
      </div>
    );
  }
  return (
    <div className="flex items-center justify-between gap-3 rounded-md bg-cream px-3.5 py-3 text-sm md:px-4">
      <span className="text-slate-600">Fees</span>
      <span>
        <b>{formatFee(fee30Cents)}</b> / 30 · <b>{formatFee(fee60Cents)}</b> / 60 min
      </span>
    </div>
  );
}
