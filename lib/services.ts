import { formatFee } from "@/lib/format";
import type { Counselor, CounselorService } from "@/lib/types";

/** "$240", "From $350", "Honorarium · $300 suggested", "Honorarium" or "Ask for pricing". */
export function servicePrice(s: Pick<CounselorService, "pricing" | "priceCents">) {
  switch (s.pricing) {
    case "fixed":
      return formatFee(s.priceCents);
    case "from":
      return `From ${formatFee(s.priceCents)}`;
    case "honorarium":
      return s.priceCents > 0 ? `Honorarium · ${formatFee(s.priceCents)} suggested` : "Honorarium";
    default:
      return "Ask for pricing";
  }
}

export const pricingOptions: { value: CounselorService["pricing"]; label: string }[] = [
  { value: "fixed", label: "Set fee" },
  { value: "from", label: "Starting at" },
  { value: "honorarium", label: "Honorarium (suggested gift)" },
  { value: "ask", label: "Ask for pricing" },
];

export type ServiceRequestStatus = "new" | "accepted" | "declined" | "withdrawn";

/** A row of public.service_requests. */
export type ServiceRequest = {
  id: string;
  counselor_id: string;
  client_id: string;
  service_name: string;
  client_name: string;
  client_email: string;
  preferred_date: string | null;
  flexible: boolean;
  location: string;
  details: string;
  status: ServiceRequestStatus;
  counselor_reply: string;
  created_at: string;
  responded_at: string | null;
};

export const requestStatusLabel: Record<ServiceRequestStatus, string> = {
  new: "Waiting for a reply",
  accepted: "Accepted",
  declined: "Declined",
  withdrawn: "Withdrawn",
};

/** "Sat, Jun 13, 2026 · flexible" or "Dates flexible". */
export function requestWhen(r: Pick<ServiceRequest, "preferred_date" | "flexible">) {
  const date = r.preferred_date
    ? new Date(`${r.preferred_date}T12:00:00`).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" })
    : null;
  if (date) return r.flexible ? `${date} · flexible` : date;
  return r.flexible ? "Dates flexible" : "No date yet";
}

/** "Based in Pasadena, CA · Travels up to 50 miles · Travel fee $50", leaving out what isn't set. */
export function travelSummary(c: Pick<Counselor, "serviceArea" | "travel" | "travelMiles" | "travelFee" | "travelFeeCents">) {
  const parts = [c.serviceArea.trim() && `Based in ${c.serviceArea.trim()}`];
  if (c.travel === "anywhere") parts.push("Travels anywhere");
  else if (c.travel === "radius" && c.travelMiles) parts.push(`Travels up to ${c.travelMiles} miles`);
  if (c.travel !== "none") {
    if (c.travelFee === "fixed" && c.travelFeeCents) parts.push(`Travel fee ${formatFee(c.travelFeeCents)}`);
    else if (c.travelFee === "per_mile" && c.travelFeeCents) parts.push(`Travel fee $${(c.travelFeeCents / 100).toFixed(2)} per mile`);
    else if (c.travelFee === "ask") parts.push("Ask about travel costs");
    else parts.push("No travel fee");
  }
  return parts.filter(Boolean).join(" · ");
}

export const travelOptions: { value: Counselor["travel"]; label: string }[] = [
  { value: "none", label: "I don't travel" },
  { value: "radius", label: "I travel up to a set distance" },
  { value: "anywhere", label: "I travel anywhere" },
];

export const travelFeeOptions: { value: Counselor["travelFee"]; label: string }[] = [
  { value: "none", label: "No travel fee" },
  { value: "fixed", label: "Set travel fee" },
  { value: "per_mile", label: "Per mile" },
  { value: "ask", label: "Ask about travel costs" },
];
