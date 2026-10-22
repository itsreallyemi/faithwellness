import { cn } from "@/lib/cn";

type Variant = "credential" | "tag" | "accent";

const variants: Record<Variant, string> = {
  // Certifications, "Connected" and other success states.
  credential: "rounded-pill bg-sage-100 px-3 py-[5px] text-[13px] font-semibold text-sage-700",
  // Focus areas and denominations.
  tag: "rounded-sm bg-cream-200 px-2.5 py-1 text-[13px] text-slate-900",
  accent: "rounded-pill bg-peach-200 px-3 py-[5px] text-[13px] font-semibold text-peach-800",
};

export function Badge({
  variant = "credential",
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { variant?: Variant }) {
  return (
    <span
      className={cn("inline-flex items-center gap-1.5 leading-5", variants[variant], className)}
      {...props}
    />
  );
}
