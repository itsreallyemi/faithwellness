import type { Metadata } from "next";
import { getCounselors, getFocusAreas, getServiceTypes } from "@/lib/counselors";
import { PortalShell } from "./PortalShell";

export const metadata: Metadata = { title: { default: "Counselor portal", template: "%s — FaithWellness" }, robots: { index: false } };

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const [counselors, focusAreas, serviceTypes] = await Promise.all([getCounselors(), getFocusAreas(), getServiceTypes()]);
  return (
    <PortalShell counselors={counselors} focusAreas={focusAreas} serviceTypes={serviceTypes}>
      {children}
    </PortalShell>
  );
}
