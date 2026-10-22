"use client";

import { useEffect } from "react";
import { CircleAlert, CircleCheck, Clock } from "lucide-react";
import { MemberBadge } from "@/components/prototype/MemberBadge";
import { RequireSignIn } from "@/components/prototype/RequireSignIn";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { codeMatches, memberCareChurch } from "@/lib/prototype/member-care";
import { membershipStatus, proto, type ProtoMembership } from "@/lib/prototype/store";

/** A church's member link: /join/grace-fellowship?code=GRACE2026. Sends a membership request. */
export function JoinView({ churchSlug, code }: { churchSlug: string; code: string }) {
  return <RequireSignIn>{({ memberships }) => <Join churchSlug={churchSlug} code={code} memberships={memberships} />}</RequireSignIn>;
}

function Join({ churchSlug, code, memberships }: { churchSlug: string; code: string; memberships: ProtoMembership[] }) {
  const church = memberCareChurch(churchSlug);
  const valid = Boolean(church && codeMatches(church, code));
  const current = memberships.find((m) => m.churchSlug === churchSlug);
  const status = current && membershipStatus(current);
  const active = status === "pending" || status === "verified";

  // A valid link sends a request, unless one is already open or approved.
  useEffect(() => {
    if (church && valid && !active) proto.requestMembership(church.slug, church.name);
  }, [church, valid, active]);

  if (!church || (!valid && !active)) {
    return (
      <Card className="flex flex-col items-start gap-4">
        <CircleAlert size={28} strokeWidth={1.8} className="text-peach-700" aria-hidden="true" />
        <h1 className="m-0 font-display text-[30px] leading-[1.1]">This member link doesn&rsquo;t work</h1>
        <p className="m-0 text-slate-600">
          It may have been copied incompletely or replaced by your church. You can enter your member code instead.
        </p>
        <Button href={`/membership${church ? `?church=${church.slug}` : ""}`}>Enter a member code</Button>
      </Card>
    );
  }

  if (status === "verified") {
    return (
      <Card className="flex flex-col gap-5">
        <span className="flex size-14 items-center justify-center rounded-lg bg-sage-100">
          <CircleCheck size={28} strokeWidth={1.8} className="text-sage-700" aria-hidden="true" />
        </span>
        <MemberBadge className="self-start" />
        <h1 className="m-0 font-display text-[32px] leading-[1.1] md:text-[40px]">You&rsquo;re a {church.name} member</h1>
        <p className="m-0 text-[17px] leading-[1.6] text-slate-600">
          Sessions with {church.name}&rsquo;s counselors are free for you. It&rsquo;s a gift from your church family.
        </p>
        <Button href={`/counselors?church=${church.slug}`} size="lg">
          See {church.name}&rsquo;s counselors
        </Button>
      </Card>
    );
  }

  return (
    <Card className="flex flex-col gap-5">
      <span className="flex size-14 items-center justify-center rounded-lg bg-peach-100">
        <Clock size={28} strokeWidth={1.8} className="text-peach-700" aria-hidden="true" />
      </span>
      <h1 className="m-0 font-display text-[32px] leading-[1.1] md:text-[40px]">Request sent to {church.name}</h1>
      <p className="m-0 text-[17px] leading-[1.6] text-slate-600">
        {church.name} will confirm you&rsquo;re a member, usually within a few days. We&rsquo;ll email you when they do,
        and sessions with their counselors become free.
      </p>
      <p className="m-0 text-[15px] text-slate-600">
        You can still book now at each counselor&rsquo;s usual fee, or message a counselor while you wait.
      </p>
      <div className="flex flex-col gap-3 sm:flex-row">
        <Button href={`/counselors?church=${church.slug}`} size="lg">
          See {church.name}&rsquo;s counselors
        </Button>
        <Button href="/membership" variant="secondary" size="lg">
          My memberships
        </Button>
      </div>
      <p className="m-0 text-[13px] text-slate-600">
        {church.name} sees your name and email to confirm you. It never sees whether you book or what you share.
      </p>
    </Card>
  );
}
