import type { Metadata } from "next";
import { Suspense } from "react";
import { CrisisNotice } from "@/components/ui/CrisisNotice";
import { MembershipView } from "./MembershipView";

export const metadata: Metadata = { title: "Church memberships" };

export default function MembershipPage() {
  return (
    <main className="mx-auto flex w-full max-w-[560px] flex-col gap-6 px-4 py-10 md:py-14">
      <Suspense>
        <MembershipView />
      </Suspense>
      <CrisisNotice />
    </main>
  );
}
