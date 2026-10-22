import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getCounselors } from "@/lib/counselors";
import { toLite } from "@/lib/prototype/lite";
import { MessagesView } from "../MessagesView";

export const metadata: Metadata = { title: "Messages" };

export default async function ThreadPage({ params }: { params: Promise<{ slug: string }> }) {
  const [{ slug }, all] = await Promise.all([params, getCounselors()]);
  if (!all.some((c) => c.slug === slug)) notFound();
  return (
    <Suspense>
      <MessagesView counselors={all.map(toLite)} activeSlug={slug} />
    </Suspense>
  );
}
