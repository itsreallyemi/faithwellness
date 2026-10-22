"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { CalendarClock, CircleAlert, Clock, EyeOff, Gift } from "lucide-react";
import { MemberBadge } from "@/components/prototype/MemberBadge";
import { RequireSignIn } from "@/components/prototype/RequireSignIn";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { codeMatches, memberCareChurch, memberCareChurches } from "@/lib/prototype/member-care";
import { isUpForRenewal, membershipStatus, proto, type ProtoMembership } from "@/lib/prototype/store";

/** Only allow in-app paths as the return address. */
const safeNext = (n: string | null) => (n && n.startsWith("/") && !n.startsWith("//") ? n : null);

const longDate = (iso: string) => new Date(iso).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

export function MembershipView() {
  return (
    <RequireSignIn>
      {({ memberships }) => {
        const available = memberCareChurches.filter((c) => !memberships.some((m) => m.churchSlug === c.slug));
        return (
          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-2">
              <h1 className="m-0 font-display text-[32px] leading-[1.1] md:text-[40px]">Church memberships</h1>
              <p className="m-0 text-slate-600">
                If a church you belong to offers member care, sessions with its counselors are free once the church
                approves you. You can add every church you&rsquo;re part of.
              </p>
            </div>
            {memberships.length > 0 && (
              <ul className="m-0 flex list-none flex-col gap-4 p-0" aria-label="Your memberships">
                {memberships.map((m) => (
                  <li key={m.churchSlug}>
                    <MembershipCard membership={m} />
                  </li>
                ))}
              </ul>
            )}
            {available.length > 0 ? (
              <CodeForm churches={available} first={memberships.length === 0} />
            ) : (
              <p className="m-0 text-sm text-slate-600">You&rsquo;ve added every church that offers member care in this prototype.</p>
            )}
            <PrivacyNote />
          </div>
        );
      }}
    </RequireSignIn>
  );
}

type Status = ReturnType<typeof membershipStatus>;

function StatusBadge({ status, renewal }: { status: Status; renewal: boolean }) {
  if (status === "verified" && renewal)
    return (
      <Badge variant="accent" className="whitespace-nowrap">
        <CalendarClock size={15} strokeWidth={1.8} aria-hidden="true" />
        Renewal due
      </Badge>
    );
  if (status === "verified") return <MemberBadge />;
  if (status === "pending")
    return (
      <Badge variant="accent" className="whitespace-nowrap">
        <Clock size={15} strokeWidth={1.8} aria-hidden="true" />
        Waiting for approval
      </Badge>
    );
  return (
    <Badge variant="tag" className="rounded-pill! px-3! py-[5px]! font-semibold whitespace-nowrap">
      {status === "declined" ? "Not approved" : status === "expired" ? "Expired" : "Membership ended"}
    </Badge>
  );
}

function MembershipCard({ membership: m }: { membership: ProtoMembership }) {
  const [confirmLeave, setConfirmLeave] = useState(false);
  const status = membershipStatus(m);
  const renewal = isUpForRenewal(m);
  const when = longDate(m.updatedIso);
  const expires = m.expiresIso ? longDate(m.expiresIso) : "";
  const subtitle = {
    pending: `Requested ${longDate(m.requestedIso)}`,
    verified: `Approved ${when} · renews by ${expires}`,
    expired: `Expired ${expires}`,
    declined: `Reviewed ${when}`,
    ended: `Ended ${when}`,
  }[status];

  return (
    <Card padding="compact" className="flex flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-0.5">
          <h2 className="m-0 font-display text-2xl leading-8">{m.churchName}</h2>
          <span className="text-sm text-slate-600">{subtitle}</span>
        </div>
        <StatusBadge status={status} renewal={renewal} />
      </div>

      {status === "verified" && (
        <p className="m-0 flex gap-2.5 text-[15px] leading-normal">
          <Gift size={20} strokeWidth={1.8} className="mt-0.5 flex-none text-sage-700" aria-hidden="true" />
          <span>
            Sessions with {m.churchName}&rsquo;s counselors are free. Look for <b>Free for members</b>.
            {renewal &&
              ` ${m.churchName} re-confirms members every year, and yours is due by ${expires}. Sessions stay free until then. Nothing to do unless they ask.`}
          </span>
        </p>
      )}
      {status === "expired" && (
        <p className="m-0 flex gap-2.5 text-[15px] leading-normal">
          <CircleAlert size={20} strokeWidth={1.8} className="mt-0.5 flex-none text-slate-600" aria-hidden="true" />
          <span>
            {m.churchName} didn&rsquo;t re-confirm your membership this year, so new sessions use the usual fee. Sessions
            you&rsquo;d already booked stay free. If you&rsquo;re still a member, request again.
          </span>
        </p>
      )}
      {status === "pending" && (
        <p className="m-0 flex gap-2.5 text-[15px] leading-normal">
          <Clock size={20} strokeWidth={1.8} className="mt-0.5 flex-none text-peach-700" aria-hidden="true" />
          <span>
            {m.churchName} will confirm you&rsquo;re a member. We&rsquo;ll email you when they do. Until then, sessions use
            each counselor&rsquo;s usual fee.
          </span>
        </p>
      )}
      {status === "declined" && (
        <p className="m-0 flex gap-2.5 text-[15px] leading-normal">
          <CircleAlert size={20} strokeWidth={1.8} className="mt-0.5 flex-none text-slate-600" aria-hidden="true" />
          <span>
            {m.churchName} couldn&rsquo;t confirm your membership. If you think that&rsquo;s a mistake, contact the church
            office, then request again.
          </span>
        </p>
      )}
      {status === "ended" && (
        <p className="m-0 flex gap-2.5 text-[15px] leading-normal">
          <CircleAlert size={20} strokeWidth={1.8} className="mt-0.5 flex-none text-slate-600" aria-hidden="true" />
          <span>
            {m.churchName} ended your membership, so new sessions use the usual fee. Sessions you&rsquo;d already booked
            stay free.
          </span>
        </p>
      )}

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
        {status === "verified" && (
          <Link href={`/counselors?church=${m.churchSlug}`} className="inline-flex min-h-11 items-center font-semibold">
            See {m.churchName}&rsquo;s counselors
          </Link>
        )}
        {(status === "declined" || status === "ended" || status === "expired") && (
          <Button
            variant="link"
            className="px-0!"
            onClick={() => {
              proto.requestMembership(m.churchSlug, m.churchName);
              proto.toast(`Request sent to ${m.churchName}.`);
            }}
          >
            Request again
          </Button>
        )}
        {!confirmLeave && (
          <Button variant="link" className="px-0! text-slate-600!" onClick={() => setConfirmLeave(true)}>
            {status === "pending" ? "Cancel request" : "Remove"}
          </Button>
        )}
      </div>

      {confirmLeave && (
        <div className="flex flex-col gap-3 rounded-md border border-border p-4">
          <b>{status === "pending" ? `Cancel your request to ${m.churchName}?` : `Remove ${m.churchName}?`}</b>
          {status === "verified" && (
            <p className="m-0 text-sm text-slate-600">
              Sessions you&rsquo;ve already booked stay free. New sessions with their counselors will use the usual fee.
            </p>
          )}
          <div className="flex flex-wrap gap-3">
            <Button variant="secondary" onClick={() => proto.leaveMembership(m.churchSlug)}>
              {status === "pending" ? "Cancel request" : "Remove membership"}
            </Button>
            <Button variant="link" onClick={() => setConfirmLeave(false)}>
              Keep it
            </Button>
          </div>
        </div>
      )}

      <ChurchControls membership={m} />
    </Card>
  );
}

/** PROTOTYPE ONLY: lets you play the church's part from the member's page. */
function ChurchControls({ membership: m }: { membership: ProtoMembership }) {
  const status = membershipStatus(m);
  if (status === "declined" || status === "ended") return null;
  const small = "min-h-10! text-sm";
  return (
    <div className="flex flex-col gap-3 rounded-md border border-dashed border-peach-400 bg-peach-50 px-4 py-3 text-sm text-peach-800">
      <span>Prototype: act as {m.churchName} in its dashboard.</span>
      <div className="flex flex-wrap gap-2">
        {status === "pending" && (
          <>
            <Button className={small} onClick={() => proto.church.approve(m.churchSlug)}>
              Approve member
            </Button>
            <Button variant="secondary" className={small} onClick={() => proto.church.decline(m.churchSlug)}>
              Decline
            </Button>
          </>
        )}
        {(status === "verified" || status === "expired") && (
          <Button className={small} onClick={() => proto.church.reconfirm(m.churchSlug)}>
            Re-confirm for another year
          </Button>
        )}
        {status === "verified" && (
          <Button variant="secondary" className={small} onClick={() => proto.church.end(m.churchSlug)}>
            End membership
          </Button>
        )}
      </div>
      {status === "verified" && (
        <>
          <span>Skip ahead in time:</span>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" className={small} onClick={() => proto.setDaysUntilExpiry(m.churchSlug, 14)}>
              2 weeks before renewal
            </Button>
            <Button variant="secondary" className={small} onClick={() => proto.setDaysUntilExpiry(m.churchSlug, -1)}>
              Let it expire
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

function CodeForm({ churches, first }: { churches: typeof memberCareChurches; first: boolean }) {
  const router = useRouter();
  const params = useSearchParams();
  const next = safeNext(params.get("next"));
  const preset = memberCareChurch(params.get("church"));
  const [church, setChurch] = useState(preset && churches.includes(preset) ? preset.slug : "");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const c = memberCareChurch(church);
    if (!c) return setError("Choose your church.");
    if (!codeMatches(c, code)) return setError(`That code doesn’t match ${c.name}. Ask your church office for your member code.`);
    proto.requestMembership(c.slug, c.name);
    proto.toast(`Request sent. ${c.name} will confirm you’re a member.`);
    setChurch("");
    setCode("");
    if (next) router.push(next);
  };

  return (
    <Card as="section" aria-labelledby="add-church" className="flex flex-col gap-5">
      <h2 id="add-church" className="m-0 font-display text-[22px] leading-7">
        {first ? "Add your church" : "Add another church"}
      </h2>
      <form noValidate onSubmit={submit} className="flex flex-col gap-5">
        <div className="flex flex-col gap-2">
          <label htmlFor="mb-church" className="font-semibold">
            Church
          </label>
          <select
            id="mb-church"
            value={church}
            onChange={(e) => {
              setChurch(e.target.value);
              setError("");
            }}
            className="min-h-12 rounded-md border border-border bg-cream px-4 text-base"
          >
            <option value="">Choose a church</option>
            {churches.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-2">
          <label htmlFor="mb-code" className="font-semibold">
            Member code
          </label>
          <input
            id="mb-code"
            value={code}
            onChange={(e) => {
              setCode(e.target.value);
              setError("");
            }}
            autoComplete="off"
            autoCapitalize="characters"
            aria-invalid={Boolean(error)}
            aria-describedby={error ? "mb-error" : "mb-hint"}
            className="min-h-12 rounded-md border border-border bg-cream px-4 text-base tracking-wide uppercase aria-invalid:border-peach-700"
          />
          <span id="mb-hint" className="text-[13px] text-slate-600">
            Usually in your bulletin, church app or welcome email. Or open the member link your church shared.
          </span>
          {error && (
            <p id="mb-error" className="m-0 text-sm text-peach-700">
              {error}
            </p>
          )}
        </div>
        <Button type="submit" size="lg">
          Request member access
        </Button>
        <p className="m-0 text-[13px] text-slate-600">The church confirms you&rsquo;re a member before sessions become free.</p>
      </form>
      <div className="flex flex-col gap-1 rounded-md border border-dashed border-peach-400 bg-peach-50 px-4 py-3 text-sm text-peach-800">
        <span>Prototype sample codes:</span>
        {memberCareChurches.map((c) => (
          <span key={c.slug}>
            {c.name}: <b>{c.code}</b>
          </span>
        ))}
      </div>
    </Card>
  );
}

function PrivacyNote() {
  return (
    <p className="m-0 flex gap-2.5 text-[13px] leading-normal text-slate-600">
      <EyeOff size={16} strokeWidth={1.8} className="mt-0.5 flex-none" aria-hidden="true" />
      A church sees your name and email so it can confirm you&rsquo;re a member. It never sees whether you book, when, or
      what you share, and never which other churches you belong to.
    </p>
  );
}
