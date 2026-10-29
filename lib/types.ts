export type FocusArea = { slug: string; label: string; featured: boolean };

export type Church = { slug: string; name: string; city: string; denomination: string };

export type Credential = { label: string; issuer?: string | null; year?: number | null };

/** Weekly hours in the counselor's own time zone. weekday: 0 = Sunday. "HH:MM" 24h. */
export type AvailabilityRule = { weekday: number; start: string; end: string };

export type Counselor = {
  slug: string;
  name: string;
  preferredName: string;
  title: string;
  church: Church | null;
  yearsMinistry: number | null;
  languages: string[];
  summary: string;
  about: string[];
  approach: string;
  verse: string | null;
  verseRef: string | null;
  focusAreas: string[];
  helpWith: string[];
  badges: string[];
  /** Insurance plans the counselor bills directly (licensed clinicians only). Empty = self-pay. */
  insurance: string[];
  credentials: Credential[];
  fee30Cents: number;
  fee60Cents: number;
  offers30: boolean;
  offers60: boolean;
  /** The counselor chose to offer this length for free (a $0 fee on its own means "not set yet"). */
  free30: boolean;
  free60: boolean;
  slidingScale: boolean;
  freeForMembers: boolean;
  feeNote: string | null;
  avatarUrl: string | null;
  avatarTint: string;
  timeZone: string;
  availability: AvailabilityRule[];
  services: CounselorService[];
  /** Where they are for in-person services, e.g. "Pasadena, CA". */
  serviceArea: string;
  travel: Travel;
  /** Set when travel is "radius". */
  travelMiles: number | null;
  travelFee: TravelFee;
  travelFeeCents: number;
};

/** One of the services in public.service_types (weddings, funerals…). */
export type ServiceType = { slug: string; label: string };

/** How far a counselor goes for in-person services. */
export type Travel = "none" | "radius" | "anywhere";
export type TravelFee = "none" | "fixed" | "per_mile" | "ask";

export type ServicePricing = "fixed" | "from" | "honorarium" | "ask";

/** A service a counselor offers beyond sessions. Clients request these rather than booking a time. */
export type CounselorService = {
  id: string;
  /** null for the counselor's own "Other" services. */
  slug: string | null;
  name: string;
  pricing: ServicePricing;
  priceCents: number;
  note: string;
};

export type Duration = 30 | 60;
