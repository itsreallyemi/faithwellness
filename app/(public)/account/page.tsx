import type { Metadata } from "next";
import { Suspense } from "react";
import { CrisisNotice } from "@/components/ui/CrisisNotice";
import { AccountView } from "./AccountView";

export const metadata: Metadata = { title: "Your profile" };

export default function AccountPage() {
  return (
    <main className="mx-auto flex w-full max-w-[720px] flex-col gap-6 px-4 py-8 md:py-12">
      <Suspense>
        <AccountView />
      </Suspense>
      <CrisisNotice />
    </main>
  );
}
