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
import { homeFor, ownChurch, ownCounselorSlug, useAccountKind, useOwnAvatar } from "@/lib/supabase/client";

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
/** Counselors work in their portal. */
const counselorLinks: NavLink[] = [
  { href: "/portal", label: "Dashboard", match: (p) => p === "/portal" },
  { href: "/portal/sessions", label: "Sessions", match: (p) => p.startsWith("/portal/sessions") },
  { href: "/portal/messages", label: "Messages", match: (p) => p.startsWith("/portal/messages") },
  { href: "/portal/settings", label: "Settings", match: (p) => p.startsWith("/portal/settings") },
];
const churchLinks = (slug: string): NavLink[] => [
  { href: `/church/${slug}`, label: "Dashboard", match: (p) => p === `/church/${slug}` },
  { href: `/church/${slug}#requests`, label: "Member requests", match: () => false },
  { href: `/counselors?church=${slug}`, label: "Our counselors", match: (p) => p.startsWith("/counselors") },
];
const staffLinks: NavLink[] = [
  { href: "/admin", label: "Counselors", match: (p) => p === "/admin" },
  { href: "/admin/churches", label: "Churches", match: (p) => p.startsWith("/admin/churches") },
  { href: "/admin/problems", label: "Problems", match: (p) => p.startsWith("/admin/problems") },
  { href: "/counselors", label: "Directory", match: (p) => p === "/" || p.startsWith("/counselors") },
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
  const kind = useAccountKind();
  const avatar = useOwnAvatar();
  // "Your answers and matches" is for clients only.
  const isClient = kind === "client";
  // Counselors (and applicants) get a way back to their portal; FaithWellness staff to admin.
  const workspace =
    kind === "provider"
      ? { href: "/portal", label: "Counselor portal" }
      : kind === "staff"
        ? { href: "/admin", label: "Admin dashboard" }
        : kind === "church" && ownChurch
          ? { href: `/church/${ownChurch.slug}`, label: "Church dashboard" }
          : null;
  // Who's signed in, at a glance. Applicants are "provider" too but have no counselor profile yet.
  // (Church admins get "Church" once church accounts are real.)
  const role =
    kind === "staff" ? "Admin" : kind === "church" ? "Church" : kind === "provider" ? (ownCounselorSlug ? "Counselor" : "Applicant") : "Member";
  // Each role has its own colour, so it's clear at a glance who's signed in.
  const roleColor = {
    Member: "bg-peach-100 text-peach-800",
    Counselor: "bg-sage-100 text-sage-700",
    Applicant: "bg-cream-200 text-slate-900",
    Church: "bg-[#E8EEF8] text-[#2B4A7A]",
    Admin: "bg-slate-900 text-white",
  }[role];
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

  // Each kind of account gets its own top links: members browse, counselors, churches and staff work.
  const links: NavLink[] = !user
    ? publicLinks
    : kind === "provider" && ownCounselorSlug
      ? counselorLinks
      : kind === "church" && ownChurch
        ? churchLinks(ownChurch.slug)
        : kind === "staff"
          ? staffLinks
          : clientLinks;
  // Account menu items (desktop dropdown and phone menu). The workspace link comes first.
  const accountLinks: { href: string; label: string; match: (p: string) => boolean; strong?: boolean }[] = [
    ...(workspace ? [{ ...workspace, match: (p: string) => p.startsWith(workspace.href), strong: true }] : []),
    ...(kind === "provider" && ownCounselorSlug
      ? [{ href: `/counselors/${ownCounselorSlug}`, label: "View my public profile", match: (p: string) => p === `/counselors/${ownCounselorSlug}` }]
      : []),
    { href: "/account", label: "Your profile", match: (p: string) => p.startsWith("/account"), strong: true },
    { href: "/membership", label: "Church memberships", match: (p: string) => p.startsWith("/membership") },
    ...(isClient ? [{ href: "/get-started", label: "Your answers and matches", match: (p: string) => p.startsWith("/get-started") }] : []),
  ];
  const signOut = async () => {
    await signOutEverywhere();
    router.push("/counselors");
  };

  return (
    <header className="border-b border-border-warm bg-cream">
      <nav aria-label="Main" className="mx-auto flex max-w-[1280px] items-center gap-8 px-4 py-2 md:px-8 md:py-4">
        <Logo href={user ? homeFor(kind) : "/counselors"} />
        <ul className="m-0 hidden list-none gap-6 p-0 text-[15px] font-medium md:flex">
          {links.map((l) => {
            const active = l.match(pathname);
            return (
              <li key={l.href}>
                <Link
                  href={l.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "inline-flex min-h-11 items-center border-b-[3px] no-underline",
                    active ? "border-peach-500 font-bold text-peach-700!" : "border-transparent text-slate-900! hover:border-peach-200",
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
            <>
              <div ref={accountRef} className="relative">
                {/* One pill: who they are (role) and their photo. It opens the account menu, which links to their portal. */}
                <button
                  type="button"
                  aria-expanded={accountOpen}
                  aria-label={`Your account: ${user.name}, ${role}`}
                  onClick={() => setAccountOpen((o) => !o)}
                  className={cn("flex min-h-11 cursor-pointer items-center gap-2 rounded-pill py-1 pr-4 pl-1 hover:brightness-95", roleColor)}
                >
                  <span className="flex size-9 flex-none items-center justify-center overflow-hidden rounded-full bg-cream-200 text-sm font-bold text-slate-900 ring-2 ring-white">
                    {avatar ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={avatar} alt="" className="h-full w-full object-cover" />
                    ) : (
                      initialsFor(user.name)
                    )}
                  </span>
                  <span className="text-[15px] font-semibold">{role}</span>
                </button>
                {accountOpen && (
                  <div className="absolute top-full right-0 z-20 mt-2 w-64 rounded-lg border border-border-warm bg-white p-2 shadow-raised">
                    <div className="mb-1 flex flex-col items-start gap-2 border-b border-divider px-3 pt-2 pb-3">
                      <b className="block text-[15px]">{user.name}</b>
                      {s?.memberships.filter((m) => membershipStatus(m) === "verified").map((m) => <MemberBadge key={m.churchSlug} churchName={m.churchName} />)}
                    </div>
                    {accountLinks.map((l) => {
                      const active = l.match(pathname);
                      return (
                        <Link
                          key={l.href}
                          href={l.href}
                          aria-current={active ? "page" : undefined}
                          className={cn(
                            "flex min-h-11 w-full items-center rounded-sm border-r-[3px] px-3 text-[15px] no-underline",
                            active
                              ? "border-peach-500 bg-peach-50 font-bold text-peach-700!"
                              : "border-transparent text-slate-900! hover:bg-cream",
                            l.strong && !active && "font-semibold",
                          )}
                        >
                          {l.label}
                        </Link>
                      );
                    })}
                    <button
                      type="button"
                      onClick={signOut}
                      className="flex min-h-11 w-full cursor-pointer items-center rounded-sm border-r-[3px] border-transparent px-3 text-left text-[15px] hover:bg-cream"
                    >
                      Sign out
                    </button>
                  </div>
                )}
              </div>
            </>
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
                <b className="block text-[15px]">
                  {user.name} <span className="font-normal text-slate-600">· {role}</span>
                </b>
                <span className="text-[13px] text-slate-600">{user.email}</span>
              </span>
              {s?.memberships.filter((m) => membershipStatus(m) === "verified").map((m) => <MemberBadge key={m.churchSlug} churchName={m.churchName} className="self-start" />)}
            </div>
          )}
          <ul className="m-0 flex list-none flex-col p-0">
            {[
              ...links,
              ...(user
                ? accountLinks
                : [{ href: "/sign-in", label: "Sign in", match: () => false }]),
            ].map((l) => (
              <li key={l.href}>
                <Link
                  href={l.href}
                  aria-current={l.match(pathname) ? "page" : undefined}
                  className={cn(
                    "flex min-h-12 items-center border-r-[3px] border-b border-b-divider px-3 text-base no-underline",
                    l.match(pathname) ? "border-r-peach-500 bg-peach-50 font-bold text-peach-700!" : "border-r-transparent font-medium text-slate-900!",
                  )}
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
