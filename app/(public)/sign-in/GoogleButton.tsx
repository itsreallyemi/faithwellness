"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { supabaseBrowser } from "@/lib/supabase/client";
import { GoogleMark } from "./shared";

const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
// hl=en keeps the button in English, like the rest of the site, whatever the browser language.
const SCRIPT = "https://accounts.google.com/gsi/client?hl=en";

type GoogleId = {
  initialize: (o: { client_id: string; callback: (r: { credential: string }) => void; nonce: string; use_fedcm_for_prompt?: boolean }) => void;
  renderButton: (el: HTMLElement, o: Record<string, string | number>) => void;
};
declare global {
  interface Window {
    google?: { accounts: { id: GoogleId } };
  }
}

/** Loads Google's sign-in script once per page. */
let scriptPromise: Promise<void> | null = null;
function loadScript() {
  return (scriptPromise ??= new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = SCRIPT;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => {
      scriptPromise = null;
      reject(new Error("Google sign-in script didn't load"));
    };
    document.head.appendChild(s);
  }));
}

/** Google checks the hashed nonce; Supabase checks the raw one, so a stolen token can't be replayed. */
async function makeNonce() {
  const raw = btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(32))));
  const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(raw));
  return { raw, hashed: [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, "0")).join("") };
}

/**
 * Google's own button, which signs in straight from our domain so Google's screen names FaithWellness
 * instead of the Supabase address. Falls back to the redirect button if the client ID isn't set or
 * Google's script is blocked.
 */
export function GoogleButton({ next, onSignedIn, onError }: { next: string; onSignedIn: () => void; onError: (message: string) => void }) {
  const slot = useRef<HTMLDivElement>(null);
  const [mode, setMode] = useState<"loading" | "google" | "fallback">(clientId ? "loading" : "fallback");

  useEffect(() => {
    if (!clientId) return;
    let cancelled = false;
    (async () => {
      try {
        const [nonce] = await Promise.all([makeNonce(), loadScript()]);
        const id = window.google?.accounts.id;
        if (cancelled || !id || !slot.current) return;
        id.initialize({
          client_id: clientId,
          nonce: nonce.hashed,
          use_fedcm_for_prompt: true,
          callback: async ({ credential }) => {
            const { error } = await supabaseBrowser().auth.signInWithIdToken({ provider: "google", token: credential, nonce: nonce.raw });
            if (error) onError("We couldn’t sign you in with Google. Please try again, or use your email.");
            else onSignedIn();
          },
        });
        id.renderButton(slot.current, {
          type: "standard",
          theme: "outline",
          size: "large",
          shape: "pill",
          text: "continue_with",
          logo_alignment: "center",
          // Match the site's language rather than the visitor's browser.
          locale: "en",
          width: Math.min(400, Math.round(slot.current.getBoundingClientRect().width)),
        });
        setMode("google");
      } catch {
        if (!cancelled) setMode("fallback");
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (mode === "fallback") {
    return (
      <Button
        variant="secondary"
        size="lg"
        className="w-full"
        onClick={() =>
          supabaseBrowser().auth.signInWithOAuth({
            provider: "google",
            options: { redirectTo: `${location.origin}/auth/callback?next=${encodeURIComponent(next)}` },
          })
        }
      >
        <GoogleMark />
        Continue with Google
      </Button>
    );
  }

  // Google draws its button into this slot. Same height as our large buttons while it loads.
  return (
    <div className="flex min-h-[52px] w-full items-center justify-center">
      <div ref={slot} className="w-full max-w-[400px] [&>div]:mx-auto" aria-busy={mode === "loading"} />
    </div>
  );
}
