import Link from "next/link";

/** The church, door and cross mark. Same drawing as public/brand/mark.svg and app/icon.svg. */
export function LogoMark({ size = 32, reversed = false }: { size?: number; reversed?: boolean }) {
  const building = reversed ? "#FAF7F2" : "#2D3748";
  const door = reversed ? "#2D3748" : "#FAF7F2";
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" aria-hidden="true">
      <path d="M22 108 V68 L60 38 L98 68 V108 Z" fill={building} stroke={building} strokeWidth="16" strokeLinejoin="round" />
      <path d="M49 116 V93 a11 11 0 0 1 22 0 V116 Z" fill={door} />
      <rect x="54" y="2" width="12" height="34" rx="6" fill="#FF7A59" />
      <rect x="45" y="10" width="30" height="11" rx="5.5" fill="#FF7A59" />
    </svg>
  );
}

export function Logo({ href = "/" }: { href?: string }) {
  return (
    <Link href={href} className="flex min-h-11 items-center gap-2.5 text-slate-900! no-underline">
      <LogoMark />
      <span className="font-display text-[21px] font-semibold!">FaithWellness</span>
    </Link>
  );
}
