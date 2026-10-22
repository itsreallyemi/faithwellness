import { PrototypeBanner } from "@/components/prototype/PrototypeBanner";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <PrototypeBanner />
      <SiteHeader />
      {/* A block wrapper, so each page's mx-auto container fills the width instead of shrinking to fit. */}
      <div className="flex-1">{children}</div>
      <SiteFooter />
    </div>
  );
}
