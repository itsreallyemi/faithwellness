import type { Metadata } from "next";
import { Suspense } from "react";
import { CrisisNotice } from "@/components/ui/CrisisNotice";
import { SignIn } from "./SignIn";

export const metadata: Metadata = { title: "Sign in" };

export default function Page() {
  return (
    <main className="mx-auto flex max-w-[480px] flex-col gap-6 px-4 py-10 md:py-16">
      <Suspense>
        <SignIn />
      </Suspense>
      <CrisisNotice />
    </main>
  );
}
