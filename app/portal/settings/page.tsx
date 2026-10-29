import type { Metadata } from "next";
import { Suspense } from "react";
import { SettingsView } from "./SettingsView";

export const metadata: Metadata = { title: "Settings" };

export default function PortalSettingsPage() {
  return (
    <Suspense>
      <SettingsView />
    </Suspense>
  );
}
