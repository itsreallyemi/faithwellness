import type { Metadata } from "next";
import { PortalMessages } from "./PortalMessages";

export const metadata: Metadata = { title: "Messages" };

export default function PortalMessagesPage() {
  return <PortalMessages />;
}
