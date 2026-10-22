"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { proto, useProto, type ProtoState } from "@/lib/prototype/store";

/** Renders children with the signed-in state, or sends the visitor to /sign-in and back. */
export function RequireSignIn({ children }: { children: (s: ProtoState & { user: NonNullable<ProtoState["user"]> }) => React.ReactNode }) {
  const s = useProto();
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams().toString();
  const signedOut = s !== null && !s.user;

  useEffect(() => {
    if (!signedOut) return;
    if (proto.signedOutOnPurpose) {
      // The header is already taking them to the directory. Skip this one redirect.
      proto.signedOutOnPurpose = false;
      return;
    }
    router.replace(`/sign-in?next=${encodeURIComponent(pathname + (search ? `?${search}` : ""))}`);
  }, [signedOut, router, pathname, search]);

  if (!s?.user) {
    return (
      <div className="mx-auto max-w-[1280px] px-4 py-14 md:px-8" aria-busy="true">
        <div className="h-40 animate-pulse rounded-xl bg-cream-200" />
      </div>
    );
  }
  return <>{children(s as ProtoState & { user: NonNullable<ProtoState["user"]> })}</>;
}
