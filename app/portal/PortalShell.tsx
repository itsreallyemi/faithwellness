"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { createContext, useContext, useMemo } from "react";
import { CalendarDays, House, LogOut, MessageCircle, Settings, UserRound } from "lucide-react";
import { signOutEverywhere } from "@/components/AuthSync";
import { useDeviceTimeZone } from "@/components/LocalTime";
import { PrototypeBanner } from "@/components/prototype/PrototypeBanner";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Logo } from "@/components/ui/Logo";
import { cn } from "@/lib/cn";
import { defaultSettings, sampleSessions, type PortalSession, type PortalSettings } from "@/lib/prototype/portal";
import { agreedFeeCents, proto, useProto, type ProtoBooking, type ProtoState } from "@/lib/prototype/store";
import { formatFee } from "@/lib/format";
import { authEnabled, ownCounselorSlug, useAuthState } from "@/lib/supabase/client";
import type { Counselor } from "@/lib/types";

type Portal = {
  s: ProtoState;
  counselor: Counselor;
  settings: PortalSettings;
  save: (patch: Partial<PortalSettings>, message?: string) => void;
  /** Sample sessions plus the prototype client's own bookings, soonest first. */
  sessions: PortalSession[];
  /** Messages from the prototype client that the counselor hasn't answered yet. */
  unread: number;
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
  { href: "/portal/messages", label: "Messages", icon: MessageCircle },
  { href: "/portal/settings", label: "Settings", icon: Settings },
];

export function PortalShell({ counselors, children }: { counselors: Counselor[]; children: React.ReactNode }) {
  const s = useProto();
  const device = useDeviceTimeZone();
  const counselor = s?.counselorSlug ? (counselors.find((c) => c.slug === s.counselorSlug) ?? null) : null;

  const portal = useMemo<Portal | null>(() => {
    if (!s || !counselor) return null;
    const settings = s.portal[counselor.slug] ?? defaultSettings(counselor);
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
        if (message) proto.toast(message);
      },
      sessions: [...sampleSessions(counselor, settings), ...yours].sort((a, b) => a.startIso.localeCompare(b.startIso)),
      unread: thread.slice(lastCounselor + 1).filter((m) => m.from === "client").length,
    };
  }, [s, counselor, device]);

  if (!s) return <div aria-busy="true" className="min-h-dvh bg-cream"><PrototypeBanner /></div>;
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
  const { counselor, unread } = usePortal();
  const active = useActive();
  return (
    <nav
      aria-label="Counselor portal"
      className="sticky top-0 hidden h-dvh w-[264px] flex-none flex-col gap-1.5 border-r border-border-warm bg-white px-5 py-6 lg:flex"
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
        </Link>
      ))}
      <Link
        href={`/counselors/${counselor.slug}`}
        className="flex min-h-11 items-center gap-3 rounded-md px-3.5 text-[15px] text-slate-900! no-underline hover:bg-cream"
      >
        <UserRound size={19} strokeWidth={1.8} aria-hidden="true" />
        Public profile
      </Link>
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
  const { unread } = usePortal();
  const active = useActive();
  return (
    <nav
      aria-label="Counselor portal"
      className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-4 border-t border-border-warm bg-white pb-[env(safe-area-inset-bottom)] lg:hidden"
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
        </Link>
      ))}
    </nav>
  );
}

function Count({ n }: { n: number }) {
  return (
    <span className="rounded-pill bg-peach-500 px-2 py-0.5 text-xs font-bold text-slate-900">
      {n}
      <span className="sr-only"> unread</span>
    </span>
  );
}

/** Counselors sign in with the same email link as clients. The sample picker is for exploring the prototype. */
function SignIn({ counselors }: { counselors: Counselor[] }) {
  const s = useProto();
  const auth = useAuthState();
  return (
    <main className="flex flex-1 justify-center bg-cream px-4 py-10 md:py-16">
      <div className="flex w-full max-w-[560px] flex-col gap-6">
        <Logo href="/for-counselors" />
        <div className="flex flex-col gap-2">
          <h1 className="m-0 font-display text-[32px] leading-[1.1] md:text-[40px]">Counselor sign in</h1>
          <p className="m-0 text-slate-600">Manage your sessions, hours, fees and calendar.</p>
        </div>
        {authEnabled &&
          (auth === "signed-in" && s?.user && ownCounselorSlug ? (
            // Approved, but their profile isn't in the directory yet, so the portal has nothing to load.
            <Card padding="compact" className="flex flex-col gap-2">
              <b>Welcome, {s.user.name}. You&rsquo;re approved.</b>
              <span className="text-[15px] text-slate-600">
                Setting up your profile, hours and fees here is the next step, and it&rsquo;s nearly ready. We&rsquo;ll
                email you as soon as you can start.
              </span>
            </Card>
          ) : auth === "signed-in" && s?.user ? (
            <Card padding="compact" className="flex flex-col gap-2">
              <b>
                You&rsquo;re signed in as {s.user.name} ({s.user.email})
              </b>
              <span className="text-[15px] text-slate-600">
                This account isn&rsquo;t set up as a counselor yet. <Link href="/for-counselors#apply">Apply to join</Link>, or
                check your application there. Once FaithWellness approves it, your portal opens here.
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
