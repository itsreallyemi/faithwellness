import "server-only";
import { cache } from "react";
import { createClient } from "@supabase/supabase-js";

// Churches accredit counselors; FaithWellness only publishes each church's requirements. Each church sets its own
// from its dashboard (public.churches). A church is listed once it has a credential name and some requirements.

export type RequirementGroup = { title: string; items: string[] };

export type AccreditingBody = {
  /** The church's slug. */
  slug: string;
  name: string;
  location: string;
  tradition: string;
  summary: string;
  /** The denomination or presbytery that accredits for the church, or "" when the church accredits its own. */
  accreditedBy: string;
  credentialName: string;
  requirements: RequirementGroup[];
  renewal: string;
  howToApply: string;
  /** ISO date of the last change, if known. */
  updated: string | null;
};

type Row = {
  slug: string;
  name: string;
  city: string;
  denomination: string;
  accreditation_summary: string;
  credential_name: string;
  accredited_by: string;
  requirements: RequirementGroup[] | null;
  renewal: string;
  how_to_apply: string;
  accreditation_updated_at: string | null;
};

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/** Churches that have published their accreditation requirements, by name. Empty without Supabase. */
export const getAccreditingBodies = cache(async (): Promise<AccreditingBody[]> => {
  if (!url || !anonKey) return [];
  const { data, error } = await createClient(url, anonKey, { auth: { persistSession: false } })
    .from("churches")
    .select("slug, name, city, denomination, accreditation_summary, credential_name, accredited_by, requirements, renewal, how_to_apply, accreditation_updated_at")
    .neq("credential_name", "")
    .order("name");
  if (error) throw error;
  return (data as Row[])
    .filter((r) => (r.requirements?.length ?? 0) > 0)
    .map((r) => ({
      slug: r.slug,
      name: r.name,
      location: r.city,
      tradition: r.denomination,
      summary: r.accreditation_summary,
      accreditedBy: r.accredited_by,
      credentialName: r.credential_name,
      requirements: r.requirements ?? [],
      renewal: r.renewal,
      howToApply: r.how_to_apply,
      updated: r.accreditation_updated_at,
    }));
});

export async function getAccreditingBody(slug: string) {
  return (await getAccreditingBodies()).find((b) => b.slug === slug) ?? null;
}
