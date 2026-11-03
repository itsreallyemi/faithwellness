import type { Metadata } from "next";
import { Suspense } from "react";
import { getAccreditingBodies } from "@/lib/accreditation";
import { AdminView } from "../AdminView";

export const metadata: Metadata = { title: "Session problems", robots: { index: false } };

export default async function AdminProblemsPage() {
  const accreditingBodies = await getAccreditingBodies();
  return (
    <main className="mx-auto flex w-full max-w-[1280px] flex-col gap-8 px-4 py-10 md:px-8 md:py-14">
      <Suspense>
        <AdminView bodies={accreditingBodies.map(({ slug, name }) => ({ slug, name }))} section="problems" />
      </Suspense>
    </main>
  );
}
