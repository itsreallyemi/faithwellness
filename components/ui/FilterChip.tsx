"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/cn";

type FilterChipProps = Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "onChange"> & {
  selected: boolean;
  onChange?: (selected: boolean) => void;
};

/** Toggle chip for filters. A real <button> with aria-pressed. */
export function FilterChip({ selected, onChange, className, children, ...props }: FilterChipProps) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={() => onChange?.(!selected)}
      className={cn(
        "inline-flex min-h-11 cursor-pointer items-center gap-1.5 rounded-pill border px-3.5 text-sm transition-colors",
        selected
          ? "border-peach-500 bg-peach-200 font-semibold text-peach-800"
          : "border-border bg-white text-slate-900 hover:border-peach-400",
        className,
      )}
      {...props}
    >
      {children}
      {selected && <Check size={14} strokeWidth={2.4} aria-hidden="true" />}
    </button>
  );
}
