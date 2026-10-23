"use client";

import { BadgeCheck, MessageCircle } from "lucide-react";
import { useIsMemberOf } from "@/lib/prototype/store";

/**
 * The fees row on a counselor card. Prices are never shown publicly: a counselor shares their
 * fee with a client privately. Verified members of the counselor's church see "Free for members".
 */
export function MemberFee({ churchSlug }: { churchSlug: string | null }) {
  const member = useIsMemberOf(churchSlug);

  if (member) {
    return (
      <div className="flex items-center gap-2 rounded-md bg-sage-100 px-3.5 py-3 text-sm font-semibold text-sage-700 md:px-4">
        <BadgeCheck size={16} strokeWidth={1.8} aria-hidden="true" />
        Free for members
      </div>
    );
  }
  return (
    <div className="flex items-center gap-2 rounded-md bg-cream px-3.5 py-3 text-sm text-slate-600 md:px-4">
      <MessageCircle size={16} strokeWidth={1.8} className="flex-none" aria-hidden="true" />
      Fees are shared privately when you connect
    </div>
  );
}
