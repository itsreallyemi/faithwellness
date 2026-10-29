"use client";

import Link from "next/link";
import { CalendarX2, HandHeart, MessageCircle, ShieldCheck, Video } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { formatFee } from "@/lib/format";
import { formatSession, formatTime } from "@/lib/prototype/format";
import { proto, type ProtoBooking } from "@/lib/prototype/store";
import { GoLiveChecklist } from "./GoLiveChecklist";
import { usePortal } from "./PortalShell";
import { clientLocal, dayLabel, PageHeader, Panel, smallButton, when } from "./ui";

const REST = 15 * 60_000;

export function HomeView() {
  const { counselor, settings, sessions, real, calendar } = usePortal();
  // Real counselors use their actual Google connection; prototype samples use the pretend one.
  const calendarConnected = real ? calendar?.status === "connected" : settings.google.connected;
  const tz = settings.timeZone;
  const now = Date.now();
  const upcoming = sessions.filter((x) => x.status === "confirmed" && new Date(x.startIso).getTime() + x.duration * 60_000 > now);
  const [next, ...later] = upcoming;
  const week = upcoming.filter((x) => new Date(x.startIso).getTime() < now + 7 * 86_400_000);
  const hour = Number(new Intl.DateTimeFormat("en-US", { timeZone: tz, hour: "numeric", hourCycle: "h23" }).format(new Date()));
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <>
      <PageHeader
        title={`${greeting}, ${counselor.preferredName}`}
        sub={new Date().toLocaleDateString("en-US", { timeZone: tz, weekday: "long", month: "long", day: "numeric" })}
      />

      {/* On phones the sidebar is hidden, so the go-live checklist sits here. */}
      <GoLiveChecklist className="bg-white! lg:hidden" />

      {!calendarConnected && (
        <Card padding="compact" className="flex flex-col gap-3 border-peach-400! bg-peach-50! sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-1">
            <b className="text-[17px]">Connect Google Calendar</b>
            <span className="text-[15px] text-slate-600">
              Until it&rsquo;s connected, FaithWellness can&rsquo;t check your other commitments or create Meet links.
            </span>
          </div>
          <Button href="/portal/settings?tab=scheduling#calendar" className="flex-none">
            Connect now
          </Button>
        </Card>
      )}

      <NeedsReply />

      <div className="grid items-start gap-6 lg:grid-cols-[1.4fr_1fr]">
        <Panel id="next" title="Next session">
          {next ? (
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1">
                <span className="font-display text-[26px] leading-8">{when(next.startIso, tz)}</span>
                <span className="text-[15px]">
                  <b>{next.clientName}</b> · {next.duration} min{next.firstSession && " · first session"}
                </span>
                <span className="text-sm text-slate-600">
                  {[
                    clientLocal(next.startIso, tz, next.clientTimeZone),
                    `rest until ${formatTime(new Date(new Date(next.startIso).getTime() + next.duration * 60_000 + REST), tz)}`,
                    next.payment,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </span>
              </div>
              <div className="flex flex-wrap gap-2.5">
                {(next.real ? next.meetUrl : settings.google.connected && settings.google.autoMeet) ? (
                  <Button href={next.meetUrl} target="_blank" rel="noreferrer">
                    <Video size={18} strokeWidth={1.8} aria-hidden="true" />
                    Join Meet
                  </Button>
                ) : (
                  <span className="flex min-h-11 items-center text-sm text-slate-600">Meet link appears once Google is connected</span>
                )}
                <Button href="/portal/messages" variant="secondary">
                  <MessageCircle size={18} strokeWidth={1.8} aria-hidden="true" />
                  Message
                </Button>
              </div>
            </div>
          ) : (
            <p className="m-0 text-[15px] text-slate-600">No sessions booked yet.</p>
          )}
        </Panel>

        <Panel id="week" title="Next 7 days">
          <ul className="m-0 grid list-none grid-cols-3 gap-3 p-0">
            <Stat value={week.length} label={week.length === 1 ? "session" : "sessions"} />
            <Stat value={Math.round((week.reduce((n, x) => n + x.duration, 0) / 60) * 10) / 10} label="hours" />
            <Stat value={week.filter((x) => x.firstSession).length} label="new clients" />
          </ul>
        </Panel>
      </div>

      <Panel
        id="coming-up"
        title="Coming up"
        action={
          <Link href="/portal/sessions" className="text-sm font-semibold">
            View all
          </Link>
        }
      >
        {later.length === 0 ? (
          <p className="m-0 text-[15px] text-slate-600">Nothing else booked yet.</p>
        ) : (
          <ul className="m-0 flex list-none flex-col divide-y divide-border p-0">
            {later.slice(0, 5).map((x) => (
              <li key={x.id} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 py-3 first:pt-0 last:pb-0">
                <span className="flex flex-col">
                  <b className="text-[15px]">
                    {dayLabel(new Date(x.startIso), tz)}, {formatTime(new Date(x.startIso), tz)}
                  </b>
                  <span className="text-[13px] text-slate-600">{clientLocal(x.startIso, tz, x.clientTimeZone) ?? "same time zone"}</span>
                </span>
                <span className="text-[15px]">
                  {x.clientName} · {x.duration} min
                  {x.firstSession && <span className="text-slate-600"> · first session</span>}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </>
  );
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <li className="flex flex-col gap-1 rounded-md bg-cream p-3.5">
      <span className="font-display text-[28px] leading-none">{value}</span>
      <span className="text-[13px] text-slate-600">{label}</span>
    </li>
  );
}

/** Price offers, insurance checks and unanswered messages from clients. */
function NeedsReply() {
  const { s, counselor, settings, unread } = usePortal();
  const tz = settings.timeZone;
  const client = s.user?.name.split(" ")[0] ?? "Your client";
  const open = s.bookings.filter(
    (b) => b.slug === counselor.slug && b.status === "confirmed" && new Date(b.startIso).getTime() > Date.now(),
  );
  const offers = open.filter((b) => b.priceRequest?.status === "pending");
  const insurance = open.filter((b) => b.insurance?.status === "pending");
  if (offers.length + insurance.length + unread === 0) return null;

  const date = (b: ProtoBooking) => `${dayLabel(new Date(b.startIso), tz)} at ${formatTime(new Date(b.startIso), tz)}`;
  // Messages go to the client, so they use the client's time zone, not the counselor's.
  const clientTz = s.user?.timeZone ?? Intl.DateTimeFormat().resolvedOptions().timeZone;
  const theirDate = (b: ProtoBooking) => formatSession(new Date(b.startIso), b.duration, clientTz);
  const usual = (b: ProtoBooking) => formatFee(b.feeCents);

  return (
    <Panel id="needs-reply" title="Needs your reply" className="border-peach-400!">
      <ul className="m-0 flex list-none flex-col divide-y divide-border p-0">
        {offers.map((b) => {
          const pr = b.priceRequest!;
          const offer = pr.offeredCents === 0 ? "asked to meet for free" : `offered ${formatFee(pr.offeredCents)}`;
          return (
            <Item key={`offer-${b.id}`} icon={HandHeart}>
              <span className="text-[15px]">
                <b>{client}</b> {offer} for {date(b)} ({b.duration} min, usual {usual(b)}).
              </span>
              {pr.note && <q className="text-[15px] text-slate-600 italic">{pr.note}</q>}
              <div className="flex flex-wrap gap-2">
                <Button
                  className={smallButton}
                  onClick={() => {
                    proto.setPriceRequestStatus(b.id, "accepted");
                    proto.counselorSend(
                      counselor.slug,
                      pr.offeredCents === 0
                        ? `I’m glad to meet with you at no cost on ${theirDate(b)}.`
                        : `I’m glad to accept your offer of ${formatFee(pr.offeredCents)} for our session on ${theirDate(b)}.`,
                    );
                    proto.toast("Offer accepted. Your client has been told.");
                  }}
                >
                  Accept offer
                </Button>
                <Button
                  variant="secondary"
                  className={smallButton}
                  onClick={() => {
                    proto.setPriceRequestStatus(b.id, "declined");
                    proto.counselorSend(
                      counselor.slug,
                      `I’m not able to lower the fee for this session, but I’d still love to meet. Let me know if you’d like to talk about other options.`,
                    );
                    proto.toast("Reply sent. Your client can keep or cancel the session.");
                  }}
                >
                  Can&rsquo;t lower it
                </Button>
              </div>
            </Item>
          );
        })}
        {insurance.map((b) => (
          <Item key={`ins-${b.id}`} icon={ShieldCheck}>
            <span className="text-[15px]">
              <b>{client}</b> wants to use <b>{b.insurance!.provider}</b> for {date(b)}. Member ID ends in {b.insurance!.memberIdLast4}
              {b.insurance!.groupNumber && `, group ${b.insurance!.groupNumber}`}.
            </span>
            <div className="flex flex-wrap gap-2">
              <Button
                className={smallButton}
                onClick={() => {
                  proto.setInsuranceStatus(b.id, "verified");
                  proto.toast("Coverage marked as verified.");
                }}
              >
                Coverage verified
              </Button>
              <Button
                variant="secondary"
                className={smallButton}
                onClick={() => {
                  proto.setInsuranceStatus(b.id, "not-covered");
                  proto.toast("Marked as not covered. Your client will see the usual fee.");
                }}
              >
                Not covered
              </Button>
            </div>
          </Item>
        ))}
        {unread > 0 && (
          <Item icon={MessageCircle}>
            <span className="text-[15px]">
              <b>{client}</b> sent you {unread === 1 ? "a message" : `${unread} messages`}.
            </span>
            <Button href="/portal/messages" variant="secondary" className={`${smallButton} self-start`}>
              Reply
            </Button>
          </Item>
        )}
      </ul>
    </Panel>
  );
}

function Item({ icon: Icon, children }: { icon: typeof CalendarX2; children: React.ReactNode }) {
  return (
    <li className="flex gap-3 py-4 first:pt-0 last:pb-0">
      <Icon size={20} strokeWidth={1.8} className="mt-0.5 flex-none text-peach-700" aria-hidden="true" />
      <div className="flex min-w-0 flex-col gap-2.5">{children}</div>
    </li>
  );
}
