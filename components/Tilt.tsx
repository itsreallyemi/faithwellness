"use client";

import { useRef } from "react";
import { cn } from "@/lib/cn";

/**
 * A card that leans gently toward the mouse and lifts. Children marked with `data-tilt-depth`
 * drift the other way for a little depth. Mouse only; keyboard focus gets a plain lift, and
 * prefers-reduced-motion turns the movement off (see .tilt in globals.css).
 */
export function Tilt({
  children,
  className,
  max = 4,
}: {
  children: React.ReactNode;
  className?: string;
  /** Largest lean, in degrees. */
  max?: number;
}) {
  const ref = useRef<HTMLElement>(null);
  const frame = useRef(0);

  const move = (e: React.PointerEvent<HTMLElement>) => {
    const el = ref.current;
    if (!el || e.pointerType !== "mouse") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => {
      el.style.setProperty("--rx", `${(-y * max).toFixed(2)}deg`);
      el.style.setProperty("--ry", `${(x * max).toFixed(2)}deg`);
      el.style.setProperty("--mx", x.toFixed(3));
      el.style.setProperty("--my", y.toFixed(3));
      el.dataset.tilting = "true";
    });
  };

  const leave = () => {
    const el = ref.current;
    if (!el) return;
    cancelAnimationFrame(frame.current);
    for (const v of ["--rx", "--ry", "--mx", "--my"]) el.style.removeProperty(v);
    delete el.dataset.tilting;
  };

  return (
    <article ref={ref} onPointerMove={move} onPointerLeave={leave} className={cn("tilt", className)}>
      {children}
    </article>
  );
}
