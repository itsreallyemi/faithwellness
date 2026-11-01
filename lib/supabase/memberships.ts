"use client";

// Real church memberships (public.church_memberships), mapped to the prototype's membership shape so the
// existing membership pages, badges and booking panel keep working.

import { proto, type ProtoMembership } from "@/lib/prototype/store";
import { supabaseBrowser } from "./client";

type Row = {
  status: ProtoMembership["status"];
  requested_at: string;
  updated_at: string;
  expires_at: string | null;
  church: { slug: string; name: string } | null;
};

export async function loadMemberships(userId: string): Promise<ProtoMembership[]> {
  const { data } = await supabaseBrowser()
    .from("church_memberships")
    .select("status, requested_at, updated_at, expires_at, church:churches(slug, name)")
    .eq("user_id", userId);
  return ((data as Row[] | null) ?? [])
    .filter((r) => r.church)
    .map((r) => ({
      churchSlug: r.church!.slug,
      churchName: r.church!.name,
      status: r.status,
      requestedIso: r.requested_at,
      updatedIso: r.updated_at,
      expiresIso: r.expires_at ?? undefined,
    }));
}

async function refresh() {
  const { data } = await supabaseBrowser().auth.getUser();
  if (data.user) proto.syncMemberships(await loadMemberships(data.user.id));
}

/** Sends a membership request with the church's code. Returns an error message, or null when sent. */
export async function requestMembershipReal(churchSlug: string, code: string): Promise<string | null> {
  const { error } = await supabaseBrowser().rpc("request_membership", { p_church_slug: churchSlug, p_code: code });
  if (error) return error.message.includes("wrong-code") ? "wrong-code" : "We couldn’t send your request. Please try again.";
  await refresh();
  return null;
}

export async function leaveMembershipReal(churchSlug: string): Promise<boolean> {
  const { error } = await supabaseBrowser().rpc("leave_membership", { p_church_slug: churchSlug });
  if (!error) await refresh();
  return !error;
}

export async function memberCareChurchList(): Promise<{ slug: string; name: string }[]> {
  const { data } = await supabaseBrowser().rpc("member_care_churches");
  return (data as { slug: string; name: string }[] | null) ?? [];
}
