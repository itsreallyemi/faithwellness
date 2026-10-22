import type { Metadata } from "next";
import { Suspense } from "react";
import { CrisisNotice } from "@/components/ui/CrisisNotice";
import { JoinView } from "./JoinView";

export const metadata: Metadata = { title: "Member care" };

type Props = {
  params: Promise<{ church: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function JoinPage({ params, searchParams }: Props) {
  const [{ church }, q] = await Promise.all([params, searchParams]);
  return (
    <main className="mx-auto flex w-full max-w-[560px] flex-col gap-6 px-4 py-10 md:py-14">
      <Suspense>
        <JoinView churchSlug={church} code={typeof q.code === "string" ? q.code : ""} />
      </Suspense>
      <CrisisNotice />
    </main>
  );
}
