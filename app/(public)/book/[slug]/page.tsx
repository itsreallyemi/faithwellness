import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Button } from "@/components/ui/Button";
import { CrisisNotice } from "@/components/ui/CrisisNotice";
import { getCounselor } from "@/lib/counselors";
import { toLite } from "@/lib/prototype/lite";
import { ConfirmBooking } from "./ConfirmBooking";

export const metadata: Metadata = { title: "Confirm your session" };

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function BookPage({ params, searchParams }: Props) {
  const [{ slug }, q] = await Promise.all([params, searchParams]);
  const c = await getCounselor(slug);
  if (!c) notFound();

  const start = typeof q.start === "string" ? q.start : "";
  const valid = !Number.isNaN(Date.parse(start));
  const duration = q.duration === "30" ? 30 : 60;
  const reschedule = typeof q.reschedule === "string" ? q.reschedule : null;

  return (
    <main className="mx-auto flex max-w-[1080px] flex-col gap-6 px-4 py-6 md:px-8 md:py-10">
      {valid ? (
        <Suspense>
          <ConfirmBooking counselor={toLite(c)} startIso={new Date(start).toISOString()} duration={duration} reschedule={reschedule} />
        </Suspense>
      ) : (
        <div className="flex flex-col items-start gap-4">
          <h1 className="m-0 font-display text-[34px]">Pick a time first</h1>
          <Button href={`/counselors/${c.slug}#book`}>See {c.preferredName}&rsquo;s times</Button>
        </div>
      )}
      <CrisisNotice />
    </main>
  );
}
