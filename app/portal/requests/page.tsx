import type { Metadata } from "next";
import { RequestsView } from "./RequestsView";

export const metadata: Metadata = { title: "Requests" };

export default function PortalRequestsPage() {
  return <RequestsView />;
}
