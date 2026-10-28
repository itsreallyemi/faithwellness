import type { Metadata } from "next";
import { getCounselors } from "@/lib/counselors";
import { PortalShell } from "./PortalShell";

export const metadata: Metadata = { title: { default: "Counselor portal", template: "%s — FaithWellness" }, robots: { index: false } };

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  return <PortalShell counselors={await getCounselors()}>{children}</PortalShell>;
}
