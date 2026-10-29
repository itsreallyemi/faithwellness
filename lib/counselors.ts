import "server-only";
import { cache } from "react";
import { createClient } from "@supabase/supabase-js";
import seed from "@/supabase/seed-data.json";
import type { Counselor, FocusArea, ServiceType } from "@/lib/types";
import { COUNSELOR_SELECT, fromRow, type CounselorRow } from "@/lib/counselor-row";

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

/** Services counselors can offer beyond sessions, in display order. Empty without Supabase. */
export const getServiceTypes = cache(async (): Promise<ServiceType[]> => {
  if (!usingSupabase) return [];
  const { data, error } = await db().from("service_types").select("slug, label").order("sort");
  if (error) throw error;
  return data;
});

export const getCounselors = cache(async (): Promise<Counselor[]> => {
  if (!usingSupabase) return seed.counselors.map(fromSeed);

  const { data, error } = await db()
    .from("counselors")
    .select(COUNSELOR_SELECT)
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
    services: [],
    free30: c.offers30 && c.fee30Cents === 0,
    free60: c.offers60 && c.fee60Cents === 0,
    serviceArea: church?.city ?? "",
    travel: "none",
    travelMiles: null,
    travelFee: "none",
    travelFeeCents: 0,
    credentials: c.credentials.map((cr: { label: string; issuer?: string; year?: number }) => ({
      label: cr.label,
      issuer: cr.issuer ?? null,
      year: cr.year ?? null,
    })),
  };
}
