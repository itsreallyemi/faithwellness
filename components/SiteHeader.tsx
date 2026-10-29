"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Menu, X } from "lucide-react";
import { signOutEverywhere } from "@/components/AuthSync";
import { MemberBadge } from "@/components/prototype/MemberBadge";
import { Button } from "@/components/ui/Button";
import { initialsFor } from "@/components/ui/Avatar";
import { Logo } from "@/components/ui/Logo";
import { cn } from "@/lib/cn";
import { membershipStatus, useProto } from "@/lib/prototype/store";
import { useAccountKind } from "@/lib/supabase/client";

type NavLink = { href: string; label: string; match: (p: string) => boolean };

const find: NavLink = {
  href: "/counselors",
  label: "Find a counselor",
  match: (p) => p === "/" || p.startsWith("/counselors"),
};
const publicLinks: NavLink[] = [
  find,
  { href: "/for-churches", label: "For churches", match: (p) => p.startsWith("/for-churches") },
  { href: "/for-counselors", label: "For counselors", match: (p) => p.startsWith("/for-counselors") },
];
const clientLinks: NavLink[] = [
  find,
  { href: "/sessions", label: "My sessions", match: (p) => p.startsWith("/sessions") || p.startsWith("/book") },
  { href: "/messages", label: "Messages", match: (p) => p.startsWith("/messages") },
];

export function SiteHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const s = useProto();
  const user = s?.user ?? null;
  // "Your answers and matches" is for clients only.
  const isClient = useAccountKind() === "client";
  const [open, setOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const accountRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    setOpen(false);
    setAccountOpen(false);
  }, [pathname]);
  useEffect(() => {
    if (!accountOpen) return;
    const close = (e: MouseEvent) => !accountRef.current?.contains(e.target as Node) && setAccountOpen(false);
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, [accountOpen]);

  const links = user ? clientLinks : publicLinks;
  const signOut = async () => {
    await signOutEverywhere();
    router.push("/counselors");
  };

  return (
    <header className="border-b border-border-warm bg-cream">
      <nav aria-label="Main" className="mx-auto flex max-w-[1280px] items-center gap-8 px-4 py-2 md:px-8 md:py-4">
        <Logo href="/counselors" />
        <ul className="m-0 hidden list-none gap-6 p-0 text-[15px] font-medium md:flex">
          {links.map((l) => {
            const active = l.match(pathname);
            return (
              <li key={l.href}>
                <Link
                  href={l.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "inline-flex min-h-11 items-center border-b-2 text-slate-900! no-underline",
                    active ? "border-peach-500 font-semibold" : "border-transparent hover:border-peach-200",
                  )}
                >
                  {l.label}
                </Link>
              </li>
            );
          })}
        </ul>

        <div className="ml-auto hidden items-center gap-3 md:flex">
          {user ? (
            <div ref={accountRef} className="relative">
              <button
                type="button"
                aria-expanded={accountOpen}
                aria-label={`Your account (${user.name})`}
                onClick={() => setAccountOpen((o) => !o)}
                className="flex size-11 cursor-pointer items-center justify-center rounded-md bg-cream-200 text-sm font-bold"
              >
                {initialsFor(user.name)}
              </button>
              {accountOpen && (
                <div className="absolute top-full right-0 z-20 mt-2 w-64 rounded-lg border border-border-warm bg-white p-2 shadow-raised">
                  <div className="flex flex-col gap-2 px-3 py-2">
                    <span>
                      <b className="block text-[15px]">{user.name}</b>
                      <span className="text-[13px] text-slate-600">{user.email}</span>
                    </span>
                    {s?.memberships.filter((m) => membershipStatus(m) === "verified").map((m) => <MemberBadge key={m.churchSlug} churchName={m.churchName} className="self-start" />)}
                  </div>
                  <Link
                    href="/account"
                    className="flex min-h-11 w-full items-center rounded-sm px-3 text-[15px] font-semibold text-slate-900! no-underline hover:bg-cream"
                  >
                    Your profile
                  </Link>
                  <Link
                    href="/membership"
                    className="flex min-h-11 w-full items-center rounded-sm px-3 text-[15px] text-slate-900! no-underline hover:bg-cream"
                  >
                    Church memberships
                  </Link>
                  {isClient && (
                    <Link
                      href="/get-started"
                      className="flex min-h-11 w-full items-center rounded-sm px-3 text-[15px] text-slate-900! no-underline hover:bg-cream"
                    >
                      Your answers and matches
                    </Link>
                  )}
                  <button
                    type="button"
                    onClick={signOut}
                    className="flex min-h-11 w-full cursor-pointer items-center rounded-sm px-3 text-left text-[15px] hover:bg-cream"
                  >
                    Sign out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <>
              <Link href="/sign-in" className="inline-flex min-h-11 items-center px-2 font-semibold text-slate-900! no-underline">
                Sign in
              </Link>
              <Button variant="secondary" href="/for-counselors">
                Join as a counselor
              </Button>
            </>
          )}
        </div>

        <button
          type="button"
          className="ml-auto flex size-11 cursor-pointer items-center justify-center rounded-md md:hidden"
          aria-expanded={open}
          aria-controls="mobile-menu"
          aria-label={open ? "Close menu" : "Open menu"}
          onClick={() => setOpen((o) => !o)}
        >
          {open ? <X size={22} strokeWidth={1.8} /> : <Menu size={22} strokeWidth={1.8} />}
        </button>
      </nav>

      {open && (
        <div id="mobile-menu" className="border-t border-border-warm px-4 pt-2 pb-4 md:hidden">
          {user && (
            <div className="flex flex-col gap-2 border-b border-divider py-3">
              <span>
                <b className="block text-[15px]">{user.name}</b>
                <span className="text-[13px] text-slate-600">{user.email}</span>
              </span>
              {s?.memberships.filter((m) => membershipStatus(m) === "verified").map((m) => <MemberBadge key={m.churchSlug} churchName={m.churchName} className="self-start" />)}
            </div>
          )}
          <ul className="m-0 flex list-none flex-col p-0">
            {[
              ...links,
              ...(user
                ? [
                    { href: "/account", label: "Your profile", match: (p: string) => p.startsWith("/account") },
                    { href: "/membership", label: "Church memberships", match: (p: string) => p.startsWith("/membership") },
                    ...(isClient
                      ? [{ href: "/get-started", label: "Your answers and matches", match: (p: string) => p.startsWith("/get-started") }]
                      : []),
                  ]
                : [{ href: "/sign-in", label: "Sign in", match: () => false }]),
            ].map((l) => (
              <li key={l.href}>
                <Link
                  href={l.href}
                  aria-current={l.match(pathname) ? "page" : undefined}
                  className="flex min-h-12 items-center border-b border-divider text-base font-medium text-slate-900! no-underline"
                >
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
          {user ? (
            <button type="button" onClick={signOut} className="mt-2 flex min-h-12 cursor-pointer items-center text-base font-semibold text-peach-700">
              Sign out
            </button>
          ) : (
            <Button variant="secondary" href="/for-counselors" className="mt-4 w-full">
              Join as a counselor
            </Button>
          )}
        </div>
      )}
    </header>
  );
}
