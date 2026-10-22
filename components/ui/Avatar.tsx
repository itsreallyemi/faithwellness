import { cn } from "@/lib/cn";

type AvatarProps = {
  name: string;
  src?: string | null;
  /** Edge length in px. */
  size?: number;
  /** Background behind the initials. */
  tint?: string;
  className?: string;
};

export function initialsFor(name: string) {
  // Drop honorifics and post-nominals so "Rev. Ruth Okafor, M.Div." → "RO".
  const words = name
    .split(",")[0]
    .split(/\s+/)
    .filter((w) => w && !/^(rev|dr|pastor|mr|mrs|ms|fr)\.?$/i.test(w));
  const first = words[0]?.[0] ?? "";
  const last = words.length > 1 ? words[words.length - 1][0] : "";
  return (first + last).toUpperCase();
}

/** Rounded-square headshot (radius ≈ 30% of size) with a white border and initials fallback. */
export function Avatar({ name, src, size = 80, tint = "#FFE9DF", className }: AvatarProps) {
  const border = Math.min(6, Math.max(3, Math.round(size / 28)));
  const style: React.CSSProperties = {
    width: size,
    height: size,
    borderRadius: Math.round(size * 0.3),
    borderWidth: border,
    background: tint,
  };

  return (
    <div
      className={cn(
        "flex flex-none items-center justify-center overflow-hidden border-white outline outline-1 outline-peach-200",
        className,
      )}
      style={style}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={name} className="h-full w-full object-cover" />
      ) : (
        <span
          className="font-display text-peach-800"
          style={{ fontSize: Math.round(size * 0.36), lineHeight: 1 }}
          aria-hidden="true"
        >
          {initialsFor(name)}
        </span>
      )}
    </div>
  );
}
