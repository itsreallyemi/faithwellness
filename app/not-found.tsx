import type { Metadata } from "next";
import { Compass } from "lucide-react";
import { PrototypeBanner } from "@/components/prototype/PrototypeBanner";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { Button } from "@/components/ui/Button";
import { CrisisNotice } from "@/components/ui/CrisisNotice";

export const metadata: Metadata = { title: "Page not found" };

/** Shown for any address that doesn't exist, with the same header and footer as the public pages. */
export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col">
      <PrototypeBanner />
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-[640px] flex-1 flex-col gap-8 px-4 py-14 md:px-8 md:py-20">
        <div className="flex flex-col items-start gap-5">
          <span className="flex size-14 items-center justify-center rounded-lg bg-peach-100">
            <Compass size={26} strokeWidth={1.8} className="text-peach-700" aria-hidden="true" />
          </span>
          <h1 className="m-0 font-display text-[36px] leading-[1.08] tracking-[-0.01em] md:text-[48px]">
            We couldn&rsquo;t find that page
          </h1>
          <p className="m-0 text-lg leading-[1.55] text-slate-600">
            The link may be out of date, or the address may have a typo. Here are some places to go from here.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button href="/counselors" size="lg">
              Find a counselor
            </Button>
            <Button href="/contact" variant="secondary" size="lg">
              Contact us
            </Button>
          </div>
        </div>
        <CrisisNotice />
      </main>
      <SiteFooter />
    </div>
  );
}
