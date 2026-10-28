import type { Metadata } from "next";
import { SessionsView } from "./SessionsView";

export const metadata: Metadata = { title: "Sessions" };

export default function PortalSessionsPage() {
  return <SessionsView />;
}
