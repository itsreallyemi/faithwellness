import type { Metadata } from "next";
import { Suspense } from "react";
import { accreditingBodies } from "@/lib/accreditation";
import { AdminView } from "./AdminView";

export const metadata: Metadata = { title: "Admin", robots: { index: false } };

export default function AdminPage() {
  return (
    <main className="mx-auto flex w-full max-w-[1280px] flex-col gap-8 px-4 py-10 md:px-8 md:py-14">
      <Suspense>
        <AdminView bodies={accreditingBodies.map(({ slug, name }) => ({ slug, name }))} />
      </Suspense>
    </main>
  );
}
