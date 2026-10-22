import "server-only";
import { cache } from "react";
import { createClient } from "@supabase/supabase-js";
import seed from "@/supabase/seed-data.json";
import type { Church, Counselor, FocusArea } from "@/lib/types";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/** True once Supabase keys are in .env.local. Until then the app reads supabase/seed-data.json. */
export const usingSupabase = Boolean(supabaseUrl && supabaseAnonKey);

export const getFocusAreas = cache(async (): Promise<FocusArea[]> => {
  if (!usingSupabase) return seed.focusAreas;
  const { data, error } = await db().from("focus_areas").select("slug, label, featured").order("sort");
  if (error) throw error;
  return data;
});

export const getCounselors = cache(async (): Promise<Counselor[]> => {
  if (!usingSupabase) return seed.counselors.map(fromSeed);

  const { data, error } = await db()
    .from("counselors")
    .select(
      `slug, preferred_name, title, years_ministry, languages, summary, about, approach, verse, verse_ref,
       help_with, badges, insurance_accepted, fee_30_cents, fee_60_cents, offers_30, offers_60, sliding_scale, free_for_members,
       fee_note, avatar_tint,
       profile:profiles!inner(full_name, avatar_url, time_zone),
       church:churches(slug, name, city, denomination),
       credentials(label, issuer, year, sort),
       focus:counselor_focus_areas(focus_area_slug),
       availability:availability_rules(weekday, start_time, end_time)`,
    )
    .eq("is_published", true);
  if (error) throw error;
  return (data as unknown as CounselorRow[]).map(fromRow);
});

export const getCounselor = cache(async (slug: string) => {
  return (await getCounselors()).find((c) => c.slug === slug) ?? null;
});

function db() {
  return createClient(supabaseUrl!, supabaseAnonKey!, { auth: { persistSession: false } });
}

type SeedCounselor = (typeof seed.counselors)[number];

function fromSeed(c: SeedCounselor): Counselor {
  const church = seed.churches.find((ch) => ch.slug === c.church) ?? null;
  return {
    ...c,
    church,
    verse: c.verse ?? null,
    verseRef: c.verseRef ?? null,
    feeNote: c.feeNote ?? null,
    avatarUrl: (c as { avatarUrl?: string }).avatarUrl ?? null,
    credentials: c.credentials.map((cr: { label: string; issuer?: string; year?: number }) => ({
      label: cr.label,
      issuer: cr.issuer ?? null,
      year: cr.year ?? null,
    })),
  };
}

type CounselorRow = {
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
  sliding_scale: boolean;
  free_for_members: boolean;
  fee_note: string | null;
  avatar_tint: string;
  profile: { full_name: string; avatar_url: string | null; time_zone: string };
  church: Church | null;
  credentials: { label: string; issuer: string | null; year: number | null; sort: number }[];
  focus: { focus_area_slug: string }[];
  availability: { weekday: number; start_time: string; end_time: string }[];
};

function fromRow(r: CounselorRow): Counselor {
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
  };
}
