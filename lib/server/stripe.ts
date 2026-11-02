import "server-only";
import Stripe from "stripe";
import { adminDb } from "./secrets";

// Stripe for payments. Test mode until live keys are added (keys starting sk_test_ never move real money).

export const stripeConfigured = Boolean(process.env.STRIPE_SECRET_KEY);

let client: Stripe | null = null;
export function stripe() {
  if (!process.env.STRIPE_SECRET_KEY) throw new Error("STRIPE_SECRET_KEY is missing");
  client ??= new Stripe(process.env.STRIPE_SECRET_KEY);
  return client;
}

/** Split of a paid session, in cents: FaithWellness 10%, the counselor's church 8%, the counselor the rest. */
export function splitFee(amountCents: number, hasChurch: boolean) {
  const platform = Math.round(amountCents * 0.1);
  const church = hasChurch ? Math.round(amountCents * 0.08) : 0;
  return { platform, church, counselorBeforeCardFee: amountCents - platform - church };
}

export type PayoutOwner = { kind: "counselor"; id: string } | { kind: "church"; id: string };

/** Who's asking: the signed-in counselor, or the church they administer. */
export async function payoutOwnerFor(userId: string, kind: "counselor" | "church"): Promise<PayoutOwner | null> {
  const db = adminDb();
  if (kind === "counselor") {
    const { data } = await db.from("counselors").select("id").eq("id", userId).maybeSingle();
    return data ? { kind, id: data.id } : null;
  }
  const { data } = await db.from("church_admins").select("church_id").eq("user_id", userId).order("created_at").limit(1).maybeSingle();
  return data ? { kind, id: data.church_id } : null;
}

const table = (o: PayoutOwner) => (o.kind === "counselor" ? "counselors" : "churches");

/**
 * The owner's Stripe account, created on first use with Stripe's Accounts v2 (required for new Connect platforms).
 * It's a "recipient": it receives transfers from FaithWellness, and FaithWellness handles fees and losses.
 */
export async function payoutAccount(owner: PayoutOwner, email: string) {
  const db = adminDb();
  const { data } = await db.from(table(owner)).select("stripe_account_id").eq("id", owner.id).maybeSingle();
  if (data?.stripe_account_id) return data.stripe_account_id as string;
  const account = await stripe().v2.core.accounts.create({
    contact_email: email || undefined,
    identity: { country: "US" },
    dashboard: "express",
    defaults: { responsibilities: { fees_collector: "application", losses_collector: "application" } },
    configuration: { recipient: { capabilities: { stripe_balance: { stripe_transfers: { requested: true } } } } },
    metadata: { faithwellness_kind: owner.kind, faithwellness_id: owner.id },
  });
  await db.from(table(owner)).update({ stripe_account_id: account.id }).eq("id", owner.id);
  return account.id;
}

/** A Stripe-hosted page where the counselor or church enters their details and bank account. */
export async function onboardingLink(account: string, origin: string, kind: PayoutOwner["kind"]) {
  const link = await stripe().v2.core.accountLinks.create({
    account,
    use_case: {
      type: "account_onboarding",
      account_onboarding: {
        refresh_url: `${origin}/api/stripe/connect?for=${kind}`,
        return_url: `${origin}/api/stripe/return?for=${kind}`,
      },
    },
  });
  return link.url;
}

/** Re-reads the account from Stripe and stores whether it can receive transfers. */
export async function refreshPayouts(owner: PayoutOwner) {
  const db = adminDb();
  const { data } = await db.from(table(owner)).select("stripe_account_id").eq("id", owner.id).maybeSingle();
  if (!data?.stripe_account_id) return false;
  const account = await stripe().v2.core.accounts.retrieve(data.stripe_account_id, { include: ["configuration.recipient"] });
  const ready = account.configuration?.recipient?.capabilities?.stripe_balance?.stripe_transfers?.status === "active";
  await db.from(table(owner)).update({ payouts_ready: ready }).eq("id", owner.id);
  return ready;
}

export async function stripeAccountId(owner: PayoutOwner) {
  const { data } = await adminDb().from(table(owner)).select("stripe_account_id").eq("id", owner.id).maybeSingle();
  return (data?.stripe_account_id as string | null) ?? null;
}

/** Where a counselor's or church's payout settings live, with a status to show there. */
export async function payoutsPage(origin: string, owner: PayoutOwner | null, status: string) {
  if (owner?.kind === "church") {
    const { data } = await adminDb().from("churches").select("slug").eq("id", owner.id).maybeSingle();
    return `${origin}/church/${data?.slug ?? ""}?payouts=${status}#payouts`;
  }
  return `${origin}/portal/settings?tab=fees&payouts=${status}#payouts`;
}
