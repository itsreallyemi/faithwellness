import type { Metadata } from "next";
import { Suspense } from "react";
import { getCounselors } from "@/lib/counselors";
import { toLite } from "@/lib/prototype/lite";
import { MessagesView } from "./MessagesView";

export const metadata: Metadata = { title: "Messages" };

export default async function MessagesPage() {
  const all = await getCounselors();
  return (
    <Suspense>
      <MessagesView counselors={all.map(toLite)} activeSlug={null} />
    </Suspense>
  );
}
