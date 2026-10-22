import type { Metadata } from "next";
import { Suspense } from "react";
import { CrisisNotice } from "@/components/ui/CrisisNotice";
import { getCounselors, getFocusAreas } from "@/lib/counselors";
import { GetStarted } from "./GetStarted";

export const metadata: Metadata = {
  title: "Find your counselor",
  description: "Answer five short questions and we’ll suggest counselors who fit.",
};

export default async function GetStartedPage() {
  const [counselors, focusAreas] = await Promise.all([getCounselors(), getFocusAreas()]);
  const focusLabels = Object.fromEntries(focusAreas.map((a) => [a.slug, a.label]));
  const languages = ["English", ...[...new Set(counselors.flatMap((c) => c.languages))].filter((l) => l !== "English").sort(), "Other"];

  return (
    <main className="mx-auto flex w-full max-w-[1080px] flex-col gap-8 px-4 py-8 md:px-8 md:py-12">
      <Suspense>
        <GetStarted counselors={counselors} focusLabels={focusLabels} languages={languages} />
      </Suspense>
      <CrisisNotice />
    </main>
  );
}
