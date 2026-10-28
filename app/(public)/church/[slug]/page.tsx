import type { Metadata } from "next";
import { notFound } from "next/navigation";
import seed from "@/supabase/seed-data.json";
import { getCounselors } from "@/lib/counselors";
import { memberCareChurch } from "@/lib/prototype/member-care";
import { ChurchAdminView, type AdminCounselor } from "./ChurchAdminView";

export const metadata: Metadata = { title: "Church admin", robots: { index: false } };

type Props = { params: Promise<{ slug: string }> };

export default async function ChurchAdminPage({ params }: Props) {
  const [{ slug }, counselors] = await Promise.all([params, getCounselors()]);
  const church = counselors.find((c) => c.church?.slug === slug)?.church ?? seed.churches.find((ch) => ch.slug === slug);
  if (!church) notFound();

  const ours: AdminCounselor[] = counselors
    .filter((c) => c.church?.slug === slug)
    .map((c) => ({ slug: c.slug, name: c.name, title: c.title, avatarUrl: c.avatarUrl, avatarTint: c.avatarTint }));

  return (
    <main className="mx-auto flex w-full max-w-[960px] flex-col gap-6 px-4 py-8 md:py-12">
      <ChurchAdminView
        church={church}
        counselors={ours}
        code={memberCareChurch(slug)?.code ?? null}
        churches={seed.churches.map((ch) => ({ slug: ch.slug, name: ch.name }))}
      />
    </main>
  );
}
