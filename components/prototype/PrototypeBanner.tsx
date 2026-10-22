"use client";

import { useRouter } from "next/navigation";
import { proto, useProto } from "@/lib/prototype/store";

export function PrototypeBanner() {
  const router = useRouter();
  const s = useProto();

  return (
    <>
      <div className="bg-slate-900 text-[13px] leading-5 text-white">
        <div className="mx-auto flex max-w-[1280px] flex-wrap items-center gap-x-3 gap-y-1 px-4 py-1.5 md:px-8">
          <span>
            <b>Prototype.</b> Sample counselors and fake data. Nothing is booked, sent or stored outside this browser.
          </span>
          <button
            type="button"
            className="ml-auto min-h-8 cursor-pointer font-semibold text-peach-200 underline-offset-2 hover:underline"
            onClick={() => {
              proto.reset();
              router.push("/counselors");
            }}
          >
            Reset prototype
          </button>
        </div>
      </div>
      <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-24 z-50 flex justify-center px-4 lg:bottom-6">
        {s?.toast && (
          <p className="m-0 max-w-md rounded-md bg-slate-900 px-4 py-3 text-sm text-white shadow-raised">{s.toast}</p>
        )}
      </div>
    </>
  );
}
