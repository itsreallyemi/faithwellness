import Link from "next/link";
import { LogoMark } from "@/components/ui/Logo";

const columns = [
  {
    title: "Find care",
    links: [
      { href: "/counselors", label: "Find a counselor" },
      { href: "/sessions", label: "My sessions" },
      { href: "/messages", label: "Messages" },
    ],
  },
  {
    title: "About",
    links: [
      { href: "/accreditation", label: "Accreditation" },
      { href: "/for-churches", label: "For churches" },
      { href: "/for-counselors", label: "For counselors" },
      { href: "/privacy", label: "Privacy" },
      { href: "/terms", label: "Terms" },
    ],
  },
  {
    title: "Support",
    links: [
      { href: "https://988lifeline.org", label: "Crisis support (988)" },
      { href: "/sign-in", label: "Sign in" },
      { href: "/portal", label: "Counselor sign in" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-border-warm bg-cream-200/60">
      <div className="mx-auto flex max-w-[1280px] flex-col gap-10 px-4 py-12 md:flex-row md:justify-between md:px-8">
        <div className="flex max-w-xs flex-col gap-3">
          <span className="flex items-center gap-2.5">
            <LogoMark size={28} />
            <span className="font-display text-[19px] font-semibold!">FaithWellness</span>
          </span>
          <p className="m-0 text-sm leading-normal text-slate-600">
            Counselors and life coaches with faith-based accreditation.
          </p>
        </div>
        <nav aria-label="Footer" className="grid grid-cols-2 gap-8 sm:grid-cols-3 md:gap-14">
          {columns.map((col) => (
            <div key={col.title} className="flex flex-col gap-1">
              <h2 className="label-overline m-0 mb-1">{col.title}</h2>
              <ul className="m-0 flex list-none flex-col p-0">
                {col.links.map((l) => (
                  <li key={l.href}>
                    <Link href={l.href} className="inline-flex min-h-11 items-center text-[15px] text-slate-900! no-underline hover:underline">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
      </div>
      <div className="border-t border-border-warm">
        <p className="mx-auto m-0 max-w-[1280px] px-4 py-5 text-[13px] leading-normal text-slate-600 md:px-8">
          © 2026 FaithWellness. FaithWellness isn&rsquo;t an emergency service. In the US, call or text 988, or call 911.
        </p>
      </div>
    </footer>
  );
}
