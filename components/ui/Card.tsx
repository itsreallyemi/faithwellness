import { cn } from "@/lib/cn";

type CardProps = React.HTMLAttributes<HTMLElement> & {
  as?: "div" | "article" | "section" | "aside";
  /** Inner padding: 24px on mobile and 32px from md up by default. */
  padding?: "default" | "compact" | "none";
};

const paddings = {
  default: "p-6 md:p-8",
  compact: "p-6 md:p-7",
  none: "",
};

/** White card: 24px radius on mobile, 28px from md up, warm border, soft shadow. */
export function Card({ as: Tag = "div", padding = "default", className, ...props }: CardProps) {
  return (
    <Tag
      className={cn(
        "rounded-[24px] border border-border-warm bg-white shadow-card md:rounded-xl",
        paddings[padding],
        className,
      )}
      {...props}
    />
  );
}
