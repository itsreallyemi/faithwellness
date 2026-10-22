import Link from "next/link";
import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "link";
type Size = "md" | "lg";

const base =
  "inline-flex items-center justify-center gap-2 rounded-pill text-[15px] no-underline transition-[background-color,box-shadow,color] disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer";

// Primary is peach fill with slate text. Never white text on peach (2.6:1 fails AA).
const variants: Record<Variant, string> = {
  primary:
    "bg-peach-500 font-bold text-slate-900! hover:bg-peach-400 hover:text-slate-900! active:bg-peach-500",
  secondary:
    "border-[1.5px] border-slate-900 bg-white/0 font-semibold text-slate-900! hover:bg-white hover:text-slate-900!",
  link: "bg-transparent px-2! font-semibold text-peach-700! hover:text-peach-800! hover:underline",
};

const sizes: Record<Size, string> = {
  md: "min-h-11 px-5",
  lg: "min-h-[52px] px-7",
};

type CommonProps = {
  variant?: Variant;
  size?: Size;
  className?: string;
  children: React.ReactNode;
};

type ButtonAsButton = CommonProps &
  Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, keyof CommonProps> & { href?: undefined };
type ButtonAsLink = CommonProps &
  Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, keyof CommonProps> & { href: string };

export type ButtonProps = ButtonAsButton | ButtonAsLink;

/** Renders a real <button>, or a Next <Link> when `href` is given. */
export function Button({ variant = "primary", size = "md", className, ...props }: ButtonProps) {
  const classes = cn(base, variants[variant], sizes[size], className);

  if (props.href !== undefined) {
    const { href, ...rest } = props as ButtonAsLink;
    return <Link href={href} className={classes} {...rest} />;
  }
  const { type = "button", ...rest } = props as ButtonAsButton;
  return <button type={type} className={classes} {...rest} />;
}
