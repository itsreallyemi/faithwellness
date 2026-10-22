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
  slidingScale: boolean;
  freeForMembers: boolean;
  feeNote: string | null;
  avatarUrl: string | null;
  avatarTint: string;
  timeZone: string;
  availability: AvailabilityRule[];
};

export type Duration = 30 | 60;
