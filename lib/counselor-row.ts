// How a counselor row from Supabase becomes a Counselor. Shared by the server directory (lib/counselors.ts)
// and the portal, which loads a counselor's own profile in the browser before it's published.

import type { Church, Counselor, ServicePricing, Travel, TravelFee } from "@/lib/types";

export const COUNSELOR_SELECT = `slug, preferred_name, title, years_ministry, languages, summary, about, approach, verse, verse_ref,
       help_with, badges, insurance_accepted, fee_30_cents, fee_60_cents, offers_30, offers_60, free_30, free_60, sliding_scale, free_for_members,
       fee_note, avatar_tint, service_area, travel, travel_miles, travel_fee, travel_fee_cents,
       profile:profiles!inner(full_name, avatar_url, time_zone),
       church:churches(slug, name, city, denomination),
       credentials(label, issuer, year, sort),
       focus:counselor_focus_areas(focus_area_slug),
       availability:availability_rules(weekday, start_time, end_time),
       services:counselor_services(id, service_slug, custom_name, pricing, price_cents, note, sort, type:service_types(label))`;

export type CounselorRow = {
  slug: string;
  preferred_name: string;
  title: string;
  years_ministry: number | null;
  languages: string[];
  summary: string;
  about: string;
  approach: string;
  verse: string | null;
  verse_ref: string | null;
  help_with: string[];
  badges: string[];
  insurance_accepted: string[];
  fee_30_cents: number;
  fee_60_cents: number;
  offers_30: boolean;
  offers_60: boolean;
  free_30: boolean;
  free_60: boolean;
  sliding_scale: boolean;
  free_for_members: boolean;
  fee_note: string | null;
  avatar_tint: string;
  service_area: string;
  travel: Travel;
  travel_miles: number | null;
  travel_fee: TravelFee;
  travel_fee_cents: number;
  profile: { full_name: string; avatar_url: string | null; time_zone: string };
  church: Church | null;
  credentials: { label: string; issuer: string | null; year: number | null; sort: number }[];
  focus: { focus_area_slug: string }[];
  availability: { weekday: number; start_time: string; end_time: string }[];
  services: {
    id: string;
    service_slug: string | null;
    custom_name: string;
    pricing: ServicePricing;
    price_cents: number;
    note: string;
    sort: number;
    type: { label: string } | null;
  }[];
};

export function fromRow(r: CounselorRow): Counselor {
  return {
    slug: r.slug,
    name: r.profile.full_name,
    preferredName: r.preferred_name,
    title: r.title,
    church: r.church,
    yearsMinistry: r.years_ministry,
    languages: r.languages,
    summary: r.summary,
    about: r.about.split(/\n\s*\n/).filter(Boolean),
    approach: r.approach,
    verse: r.verse,
    verseRef: r.verse_ref,
    focusAreas: r.focus.map((f) => f.focus_area_slug),
    helpWith: r.help_with,
    badges: r.badges,
    insurance: r.insurance_accepted,
    credentials: [...r.credentials].sort((a, b) => a.sort - b.sort),
    fee30Cents: r.fee_30_cents,
    fee60Cents: r.fee_60_cents,
    offers30: r.offers_30,
    offers60: r.offers_60,
    free30: r.free_30,
    free60: r.free_60,
    slidingScale: r.sliding_scale,
    freeForMembers: r.free_for_members,
    feeNote: r.fee_note,
    avatarUrl: r.profile.avatar_url,
    avatarTint: r.avatar_tint,
    timeZone: r.profile.time_zone,
    availability: r.availability.map((a) => ({
      weekday: a.weekday,
      start: a.start_time.slice(0, 5),
      end: a.end_time.slice(0, 5),
    })),
    serviceArea: r.service_area,
    travel: r.travel,
    travelMiles: r.travel_miles,
    travelFee: r.travel_fee,
    travelFeeCents: r.travel_fee_cents,
    services: [...(r.services ?? [])]
      .sort((a, b) => a.sort - b.sort)
      .map((s) => ({ id: s.id, slug: s.service_slug, name: s.type?.label ?? s.custom_name, pricing: s.pricing, priceCents: s.price_cents, note: s.note })),
  };
}
