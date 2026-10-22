import { cn } from "@/lib/cn";

/** Required on every client-facing page. */
export function CrisisNotice({ className }: { className?: string }) {
  return (
    <aside
      aria-label="Crisis support"
      className={cn(
        "flex flex-wrap items-center justify-between gap-3 rounded-lg bg-peach-50 px-5 py-4 text-sm leading-normal md:px-[22px] md:py-[18px]",
        className,
      )}
    >
      <p className="m-0">
        <b>In crisis or in danger?</b> FaithWellness isn&rsquo;t an emergency service. In the US, call or
        text <a href="tel:988">988</a>, or call <a href="tel:911">911</a>.
      </p>
      <a href="https://988lifeline.org" className="inline-flex min-h-11 items-center font-semibold">
        More support options
      </a>
    </aside>
  );
}
