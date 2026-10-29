"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { CalendarDays, House, Inbox, LogOut, MessageCircle, Settings, UserRound } from "lucide-react";
import { ApplicationSummary, useMyApplication } from "@/components/ApplicationProgress";
import { signOutEverywhere } from "@/components/AuthSync";
import { useDeviceTimeZone } from "@/components/LocalTime";
import { PrototypeBanner } from "@/components/prototype/PrototypeBanner";
import { GoLiveChecklist } from "./GoLiveChecklist";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Logo } from "@/components/ui/Logo";
import { cn } from "@/lib/cn";
import { defaultSettings, sampleSessions, type PortalSession, type PortalSettings } from "@/lib/prototype/portal";
import { agreedFeeCents, proto, useProto, type ProtoBooking, type ProtoState } from "@/lib/prototype/store";
import { formatFee } from "@/lib/format";
import { contactEmail } from "@/lib/site";
import { authEnabled, ownCounselorSlug, useAuthState } from "@/lib/supabase/client";
import {
  loadOwnCounselor,
  saveFocusAreas,
  saveServices,
  saveSettings,
  type GoLiveItem,
  type OwnCounselor,
  type CalendarConnection,
  type ServiceDraft,
  type TravelDraft,
} from "@/lib/supabase/own-counselor";
import type { Counselor, FocusArea, ServiceType } from "@/lib/types";

type Portal = {
  s: ProtoState;
  counselor: Counselor;
  settings: PortalSettings;
  save: (patch: Partial<PortalSettings>, message?: string) => void;
  /** Sample sessions plus the prototype client's own bookings, soonest first. */
  sessions: PortalSession[];
  /** Messages from the prototype client that the counselor hasn't answered yet. */
  unread: number;
  /** A real approved counselor (not a prototype sample): profile, fees and hours save to the database. */
  real: boolean;
  /** Real counselors: whether they're in the directory, and what's left before they are. */
  live: boolean;
  missing: GoLiveItem[];
  focusAreas: FocusArea[];
  /** Resolves true once saved. */
  saveFocus: (slugs: string[]) => Promise<boolean>;
  serviceTypes: ServiceType[];
  saveServices: (next: ServiceDraft[], travel: TravelDraft) => void;
  /** Service requests waiting for a reply (real counselors). */
  newRequests: number;
  /** Reload the counselor's own profile, checklist and request count. */
  reload: () => void;
  /** Real counselors' Google Calendar connection; null until they connect. */
  calendar: CalendarConnection | null;
  /** Real counselors' account id; null for prototype samples. */
  ownId: string | null;
};

const PortalContext = createContext<Portal | null>(null);

export function usePortal() {
  const p = useContext(PortalContext);
  if (!p) throw new Error("usePortal must be used inside the portal");
  return p;
}

const nav = [
  { href: "/portal", label: "Home", icon: House },
  { href: "/portal/sessions", label: "Sessions", icon: CalendarDays },
  { href: "/portal/requests", label: "Requests", icon: Inbox },
  { href: "/portal/messages", label: "Messages", icon: MessageCircle },
  { href: "/portal/settings", label: "Settings", icon: Settings },
];

export function PortalShell({
  counselors,
  focusAreas,
  serviceTypes,
  children,
}: {
  counselors: Counselor[];
  focusAreas: FocusArea[];
  serviceTypes: ServiceType[];
  children: React.ReactNode;
}) {
  const s = useProto();
  const device = useDeviceTimeZone();
  const auth = useAuthState();

  // A real counselor's own profile comes from the database, published or not.
  const realSlug = authEnabled && auth === "signed-in" && ownCounselorSlug && s?.counselorSlug === ownCounselorSlug ? ownCounselorSlug : null;
  const [own, setOwn] = useState<OwnCounselor | null>(null);
  // Which slug finished loading (even if it failed), so a failed load falls through to the sign-in screen.
  const [ownTried, setOwnTried] = useState<string | null>(null);
  const reload = useCallback(() => {
    if (!realSlug) return;
    loadOwnCounselor(realSlug).then((loaded) => {
      setOwn(loaded);
      setOwnTried(realSlug);
    });
  }, [realSlug]);
  useEffect(reload, [reload]);
  const ownLoaded = own?.counselor.slug === realSlug ? own : null;

  const counselor = realSlug
    ? (ownLoaded?.counselor ?? null)
    : s?.counselorSlug
      ? (counselors.find((c) => c.slug === s.counselorSlug) ?? null)
      : null;

  const portal = useMemo<Portal | null>(() => {
    if (!s || !counselor) return null;
    const stored = s.portal[counselor.slug];
    // Real counselors: profile, fees and hours come from the database; calendar, notifications and days off
    // are still prototype and stay in this browser.
    const settings = ownLoaded
      ? {
          ...defaultSettings(counselor),
          ...(stored && { google: stored.google, notifications: stored.notifications, daysOff: stored.daysOff, canceledSamples: stored.canceledSamples }),
        }
      : (stored ?? defaultSettings(counselor));
    const mine = s.bookings.filter((b) => b.slug === counselor.slug);
    const firstId = [...mine].sort((a, b) => a.startIso.localeCompare(b.startIso))[0]?.id;
    const clientName = s.user ? shortName(s.user.name) : "Prototype client";
    const yours: PortalSession[] = mine.map((b) => ({
      id: b.id,
      clientName,
      clientTimeZone: s.user?.timeZone ?? device ?? counselor.timeZone,
      startIso: b.startIso,
      duration: b.duration,
      status: b.status,
      firstSession: b.id === firstId,
      payment: paymentLabel(b),
      meetUrl: b.meetUrl,
      bookingId: b.id,
    }));
    const thread = s.threads[counselor.slug] ?? [];
    const lastCounselor = thread.findLastIndex((m) => m.from === "counselor");
    return {
      s,
      counselor,
      settings,
      save: (patch, message) => {
        proto.savePortal(counselor.slug, settings, patch);
        if (!ownLoaded) {
          if (message) proto.toast(message);
          return;
        }
        saveSettings(ownLoaded.id, patch).then((ok) => {
          proto.toast(ok ? (message ?? "Saved") : "That didn’t save. Please try again.");
          reload();
        });
      },
      sessions: [...sampleSessions(counselor, settings), ...yours].sort((a, b) => a.startIso.localeCompare(b.startIso)),
      unread: thread.slice(lastCounselor + 1).filter((m) => m.from === "client").length,
      real: Boolean(ownLoaded),
      live: ownLoaded?.live ?? true,
      missing: ownLoaded?.missing ?? [],
      focusAreas,
      saveFocus: async (slugs) => {
        if (!ownLoaded) return false;
        const ok = await saveFocusAreas(ownLoaded.id, slugs);
        proto.toast(
          !ok
            ? "That didn’t save. Please try again."
            : slugs.length
              ? "Focus areas saved"
              : "Focus areas saved. Your profile is hidden until you choose at least one.",
        );
        reload();
        return ok;
      },
      newRequests: ownLoaded?.newRequests ?? 0,
      reload,
      calendar: ownLoaded?.calendar ?? null,
      ownId: ownLoaded?.id ?? null,
      serviceTypes,
      saveServices: (next, travel) => {
        if (!ownLoaded) return;
        saveServices(ownLoaded.id, counselor.services, next, travel).then((ok) => {
          proto.toast(ok ? "Services saved" : "That didn’t save. Please try again.");
          reload();
        });
      },
    };
  }, [s, counselor, device, ownLoaded, focusAreas, serviceTypes, reload]);

  if (!s || (realSlug && ownTried !== realSlug)) {
    return (
      <div aria-busy="true" className="min-h-dvh bg-cream">
        <PrototypeBanner />
      </div>
    );
  }
  if (!portal)
    return (
      <div className="flex min-h-dvh flex-col bg-cream">
        <PrototypeBanner />
        <SignIn counselors={counselors} />
      </div>
    );

  return (
    <PortalContext.Provider value={portal}>
      <div className="flex min-h-dvh bg-cream">
        <Sidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <PrototypeBanner />
          <main className="flex flex-1 flex-col gap-7 px-4 pt-6 pb-28 md:px-8 lg:px-12 lg:pt-10 lg:pb-16">
            <div className="mx-auto flex w-full max-w-[1180px] flex-col gap-7">{children}</div>
          </main>
        </div>
        <BottomTabs />
      </div>
    </PortalContext.Provider>
  );
}

/** "Grace T." from "Grace Thompson". Counselors see first name and last initial. */
function shortName(full: string) {
  const [first, ...rest] = full.trim().split(/\s+/);
  return rest.length ? `${first} ${rest.at(-1)![0]}.` : first;
}

function paymentLabel(b: ProtoBooking) {
  if (b.memberCare) return "Member care · free";
  if (b.insurance) {
    const status = { pending: "to verify", verified: "verified", "not-covered": "not covered" }[b.insurance.status];
    return `Insurance · ${b.insurance.provider} · ${status}`;
  }
  if (b.priceRequest) {
    const offer = b.priceRequest.offeredCents === 0 ? "Asked for free" : `Offer ${formatFee(b.priceRequest.offeredCents)}`;
    const status = { pending: "needs reply", accepted: "accepted", declined: "usual fee" }[b.priceRequest.status];
    return `${offer} · ${status}`;
  }
  return formatFee(agreedFeeCents(b));
}

function useActive() {
  const pathname = usePathname();
  return (href: string) => (href === "/portal" ? pathname === "/portal" : pathname.startsWith(href));
}

function Sidebar() {
  const { counselor, unread, real, live, newRequests } = usePortal();
  const active = useActive();
  return (
    <nav
      aria-label="Counselor portal"
      className="sticky top-0 hidden h-dvh w-[264px] flex-none flex-col gap-1.5 overflow-y-auto border-r border-border-warm bg-white px-5 py-6 lg:flex"
    >
      <div className="px-2 pb-5">
        <Logo href="/portal" />
      </div>
      {nav.map(({ href, label, icon: Icon }) => (
        <Link
          key={href}
          href={href}
          aria-current={active(href) ? "page" : undefined}
          className={cn(
            "flex min-h-11 items-center gap-3 rounded-md px-3.5 text-[15px] text-slate-900! no-underline hover:bg-cream",
            active(href) && "bg-peach-100 font-semibold text-peach-800! hover:bg-peach-100",
          )}
        >
          <Icon size={19} strokeWidth={1.8} aria-hidden="true" />
          <span className="flex-1">{label}</span>
          {label === "Messages" && unread > 0 && <Count n={unread} />}
          {label === "Requests" && newRequests > 0 && <Count n={newRequests} label="new" />}
        </Link>
      ))}
      {(!real || live) && (
        <Link
          href={`/counselors/${counselor.slug}`}
          className="flex min-h-11 items-center gap-3 rounded-md px-3.5 text-[15px] text-slate-900! no-underline hover:bg-cream"
        >
          <UserRound size={19} strokeWidth={1.8} aria-hidden="true" />
          Public profile
        </Link>
      )}
      <GoLiveChecklist className="mt-4" />
      <div className="mt-auto flex items-center gap-3 border-t border-border px-2 pt-4">
        <Avatar name={counselor.name} src={counselor.avatarUrl} tint={counselor.avatarTint} size={40} />
        <div className="flex min-w-0 flex-1 flex-col">
          <b className="truncate text-sm">{counselor.name}</b>
          <span className="truncate text-xs text-slate-600">{counselor.church?.name ?? counselor.title}</span>
        </div>
        <button
          type="button"
          onClick={() => (ownCounselorSlug === counselor.slug ? signOutEverywhere() : proto.counselorSignOut())}
          aria-label="Sign out"
          title="Sign out"
          className="flex size-11 flex-none cursor-pointer items-center justify-center rounded-md text-slate-600 hover:bg-cream"
        >
          <LogOut size={18} strokeWidth={1.8} aria-hidden="true" />
        </button>
      </div>
    </nav>
  );
}

function BottomTabs() {
  const { unread, newRequests } = usePortal();
  const active = useActive();
  return (
    <nav
      aria-label="Counselor portal"
      className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-border-warm bg-white pb-[env(safe-area-inset-bottom)] lg:hidden"
    >
      {nav.map(({ href, label, icon: Icon }) => (
        <Link
          key={href}
          href={href}
          aria-current={active(href) ? "page" : undefined}
          className={cn(
            "relative flex min-h-16 flex-col items-center justify-center gap-1 text-xs text-slate-600! no-underline",
            active(href) && "font-semibold text-peach-800!",
          )}
        >
          <Icon size={22} strokeWidth={1.8} aria-hidden="true" />
          {label}
          {label === "Messages" && unread > 0 && (
            <span className="absolute top-2 left-1/2 ml-2">
              <Count n={unread} />
            </span>
          )}
          {label === "Requests" && newRequests > 0 && (
            <span className="absolute top-2 left-1/2 ml-2">
              <Count n={newRequests} label="new" />
            </span>
          )}
        </Link>
      ))}
    </nav>
  );
}

function Count({ n, label = "unread" }: { n: number; label?: string }) {
  return (
    <span className="rounded-pill bg-peach-500 px-2 py-0.5 text-xs font-bold text-slate-900">
      {n}
      <span className="sr-only"> {label}</span>
    </span>
  );
}

/** Counselors sign in with the same email link as clients. The sample picker is for exploring the prototype. */
function SignIn({ counselors }: { counselors: Counselor[] }) {
  const s = useProto();
  const auth = useAuthState();
  const mine = useMyApplication();
  return (
    <main className="flex flex-1 justify-center bg-cream px-4 py-10 md:py-16">
      <div className="flex w-full max-w-[560px] flex-col gap-6">
        <Logo href="/for-counselors" />
        <div className="flex flex-col gap-2">
          <h1 className="m-0 font-display text-[32px] leading-[1.1] md:text-[40px]">Counselor sign in</h1>
          <p className="m-0 text-slate-600">Manage your sessions, hours, fees and calendar.</p>
        </div>
        {authEnabled &&
          (auth === "signed-in" && s?.user && mine?.app ? (
            <Card padding="compact" className="flex flex-col gap-4">
              <div className="flex flex-col gap-1">
                <b>
                  {mine.app.status === "approved" ? `Welcome, ${s.user.name}. You\u2019re approved.` : "Your counselor application"}
                </b>
                {mine.app.status === "approved" && (
                  <span className="text-[15px] text-slate-600">
                    We couldn&rsquo;t load your portal just now. Refresh the page, or email{" "}
                    <a href={`mailto:${contactEmail}`}>{contactEmail}</a> if it keeps happening.
                  </span>
                )}
              </div>
              <ApplicationSummary app={mine.app} live={mine.live} hideAction={mine.app.status === "approved"} />
            </Card>
          ) : auth === "signed-in" && s?.user ? (
            <Card padding="compact" className="flex flex-col gap-2">
              <b>
                You&rsquo;re signed in as {s.user.name} ({s.user.email})
              </b>
              <span className="text-[15px] text-slate-600">
                This account isn&rsquo;t set up as a counselor yet. <Link href="/for-counselors#apply">Apply to join</Link>{" "}
                first. Once FaithWellness approves you, your portal opens here.
              </span>
            </Card>
          ) : (
            <Card padding="compact" className="flex flex-col gap-3">
              <span className="text-[15px] text-slate-600">Sign in with the email address on your counselor account.</span>
              <Button href="/sign-in?next=/portal" size="lg">
                Email me a sign-in link
              </Button>
            </Card>
          ))}
        <Card padding="compact" className="flex flex-col gap-4">
          <p className="m-0 rounded-md border border-dashed border-peach-400 bg-peach-50 px-4 py-3 text-sm text-peach-800">
            Prototype: {authEnabled ? "or explore the portal as" : "choose"} a sample counselor. Nothing you change here
            reaches the real database.
          </p>
          <ul className="m-0 flex list-none flex-col gap-2 p-0">
            {counselors.map((c) => (
              <li key={c.slug}>
                <button
                  type="button"
                  onClick={() => proto.counselorSignIn(c.slug)}
                  className="flex min-h-16 w-full cursor-pointer items-center gap-3 rounded-md border border-border bg-white p-3 text-left hover:border-peach-400 hover:bg-peach-50"
                >
                  <Avatar name={c.name} src={c.avatarUrl} tint={c.avatarTint} size={48} />
                  <span className="flex min-w-0 flex-col">
                    <b className="truncate text-[15px]">{c.name}</b>
                    <span className="truncate text-[13px] text-slate-600">
                      {c.title}
                      {c.church && ` · ${c.church.name}`}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </Card>
        <p className="m-0 text-sm text-slate-600">
          Not on FaithWellness yet? <Link href="/for-counselors">Apply to join</Link>
        </p>
      </div>
    </main>
  );
}
