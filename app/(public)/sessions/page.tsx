import type { Metadata } from "next";
import { Suspense } from "react";
import { CrisisNotice } from "@/components/ui/CrisisNotice";
import { getCounselors } from "@/lib/counselors";
import { toLite } from "@/lib/prototype/lite";
import { SessionList } from "./SessionList";

export const metadata: Metadata = { title: "My sessions" };

export default async function SessionsPage() {
  const all = await getCounselors();
  return (
    <main className="mx-auto flex w-full max-w-[1080px] flex-col gap-8 px-4 py-8 md:px-8 md:py-12">
      <Suspense>
        <SessionList counselors={all.map(toLite)} />
      </Suspense>
      <CrisisNotice />
    </main>
  );
}
