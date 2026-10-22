import type { Metadata } from "next";
import { Suspense } from "react";
import { CrisisNotice } from "@/components/ui/CrisisNotice";
import { getCounselors } from "@/lib/counselors";
import { toLite } from "@/lib/prototype/lite";
import { SessionView } from "./SessionView";

export const metadata: Metadata = { title: "Your session" };

export default async function SessionPage({ params }: { params: Promise<{ id: string }> }) {
  const [{ id }, all] = await Promise.all([params, getCounselors()]);
  return (
    <main className="mx-auto flex max-w-[1080px] flex-col gap-6 px-4 py-8 md:px-8 md:py-12">
      <Suspense>
        <SessionView id={id} counselors={all.map(toLite)} />
      </Suspense>
      <CrisisNotice />
    </main>
  );
}
