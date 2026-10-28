"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Mail } from "lucide-react";
import { signOutEverywhere } from "@/components/AuthSync";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { proto, useProto } from "@/lib/prototype/store";
import { googleEnabled, supabaseBrowser, useAuthState } from "@/lib/supabase/client";
import { GoogleMark, safeNext } from "./shared";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const field = "min-h-12 rounded-md border border-border bg-cream px-4 text-base aria-invalid:border-peach-700";

/** Sign-in with an emailed link (and Google, once it's set up), through Supabase Auth. */
export function RealSignIn() {
  const params = useSearchParams();
  const next = safeNext(params.get("next"));
  const welcome = params.get("welcome") === "1";
  const auth = useAuthState();
  const s = useProto();

  const [step, setStep] = useState<"choose" | "sent">("choose");
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(
    params.get("error") === "link" ? "That sign-in link has expired or was already used. Enter your email for a new one." : "",
  );

  // First visit goes through the questions; after that, straight to where they were going.
  const destination = s?.intake ? next : `/get-started?next=${encodeURIComponent(next)}`;
  // A full page load, so a stalled in-app navigation can never leave them on a loading screen.
  const finish = () => window.location.replace(destination);

  // Just back from the emailed link with a name on file: carry on to where they were going.
  useEffect(() => {
    if (welcome && auth === "signed-in" && s?.user) finish();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [welcome, auth, s?.user]);

  const sendLink = async (address: string) => {
    setSending(true);
    const { error } = await supabaseBrowser().auth.signInWithOtp({
      email: address,
      options: { emailRedirectTo: `${location.origin}/auth/callback?next=${encodeURIComponent(next)}` },
    });
    setSending(false);
    if (!error) return true;
    setError(
      error.status === 429 || /rate limit/i.test(error.message)
        ? "Too many sign-in emails were sent just now. Wait a few minutes, then try again."
        : "We couldn’t send the link. Check the address and try again.",
    );
    return false;
  };

  if (auth === "loading") {
    return <Card aria-busy="true" className="h-64 animate-pulse bg-cream-200!" />;
  }

  if (auth === "signed-in" && !s?.user) return <NameStep onDone={finish} />;

  if (auth === "signed-in" && s?.user) {
    return (
      <Card className="flex flex-col gap-4">
        <h1 className="m-0 font-display text-[28px] leading-[34px]">You&rsquo;re signed in</h1>
        <p className="m-0 text-slate-600">
          as <b className="text-slate-900">{s.user.name}</b> ({s.user.email})
        </p>
        <Button href={destination} size="lg">
          Continue
        </Button>
        <button
          type="button"
          onClick={() => signOutEverywhere()}
          className="min-h-11 cursor-pointer self-start text-sm font-semibold text-peach-700"
        >
          Sign in as someone else
        </button>
      </Card>
    );
  }

  const booking = next.startsWith("/book/");
  const messaging = next.startsWith("/messages/");
  const reason = booking
    ? "Sign in to confirm your session. We’ll send your confirmation and Meet link here."
    : messaging
      ? "Sign in to send a message. Replies arrive here and by email."
      : "Book sessions, message your counselor and keep track of upcoming sessions.";

  if (step === "sent") {
    return (
      <Card className="flex flex-col gap-6">
        <div className="flex size-14 items-center justify-center rounded-lg bg-peach-100">
          <Mail size={26} strokeWidth={1.8} className="text-peach-700" aria-hidden="true" />
        </div>
        <div className="flex flex-col gap-2">
          <h1 className="m-0 font-display text-[30px] leading-[1.1]">Check your email</h1>
          <p className="m-0 text-slate-600">
            We sent a sign-in link to <b className="text-slate-900">{email.trim()}</b>. It works for 1 hour.
          </p>
          <p className="m-0 text-slate-600">
            Open it on this device, in this browser. If it isn&rsquo;t there in a minute, check your spam folder.
          </p>
        </div>
        {error && (
          <p role="alert" className="m-0 text-sm text-peach-700">
            {error}
          </p>
        )}
        <div className="flex flex-wrap gap-x-5">
          <button
            type="button"
            disabled={sending}
            onClick={async () => {
              setError("");
              if (await sendLink(email.trim())) proto.toast("Sent again. Use the newest email.");
            }}
            className="min-h-11 cursor-pointer text-sm font-semibold text-peach-700 disabled:opacity-60"
          >
            {sending ? "Sending…" : "Send it again"}
          </button>
          <button
            type="button"
            onClick={() => {
              setError("");
              setStep("choose");
            }}
            className="min-h-11 cursor-pointer text-sm font-semibold text-peach-700"
          >
            Use a different email
          </button>
        </div>
      </Card>
    );
  }

  return (
    <Card className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="m-0 font-display text-[34px] leading-[1.1]">Welcome</h1>
        <p className="m-0 text-slate-600">{reason}</p>
      </div>
      {googleEnabled && (
        <>
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
          <div className="flex items-center gap-3 text-[13px] text-slate-500" aria-hidden="true">
            <span className="h-px flex-1 bg-divider" />
            or
            <span className="h-px flex-1 bg-divider" />
          </div>
        </>
      )}
      <form
        noValidate
        className="flex flex-col gap-3"
        onSubmit={async (e) => {
          e.preventDefault();
          if (!EMAIL.test(email.trim())) return setError("Enter an email address like name@example.com.");
          setError("");
          if (await sendLink(email.trim())) setStep("sent");
        }}
      >
        <label htmlFor="email" className="text-[15px] font-semibold">
          Email
        </label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? "email-error" : undefined}
          placeholder="you@example.com"
          className={field}
        />
        {error && (
          <p id="email-error" className="m-0 text-sm text-peach-700">
            {error}
          </p>
        )}
        <Button type="submit" size="lg" className="w-full" disabled={sending}>
          {sending ? "Sending…" : "Email me a sign-in link"}
        </Button>
      </form>
      <p className="m-0 text-[13px] leading-normal text-slate-600">
        No password needed. By continuing you agree to the Terms and Privacy Policy. Your conversations are private
        between you and your counselor.
      </p>
    </Card>
  );
}

/** First sign-in: the account exists but has no name yet. */
function NameStep({ onDone }: { onDone: () => void }) {
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  return (
    <Card>
      <form
        className="flex flex-col gap-4"
        onSubmit={async (e) => {
          e.preventDefault();
          if (!name.trim()) return setError("Add the name you’d like to go by.");
          setSaving(true);
          const sb = supabaseBrowser();
          const { data } = await sb.auth.getUser();
          const user = data.user;
          const { error } = user
            ? await sb.from("profiles").update({ full_name: name.trim() }).eq("id", user.id)
            : { error: new Error("signed out") };
          setSaving(false);
          if (error || !user) return setError("We couldn’t save your name. Please try again.");
          proto.signIn({ name: name.trim(), email: user.email ?? "" });
          onDone();
        }}
      >
        <div className="flex flex-col gap-2">
          <h1 className="m-0 font-display text-[30px] leading-[1.1]">What should we call you?</h1>
          <p className="m-0 text-slate-600">Your counselor sees this name. A first name is fine.</p>
        </div>
        <label htmlFor="name" className="sr-only">
          Your name
        </label>
        <input
          id="name"
          autoComplete="given-name"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            setError("");
          }}
          aria-invalid={Boolean(error)}
          placeholder="e.g. Grace"
          className={field}
          autoFocus
        />
        {error && <p className="m-0 text-sm text-peach-700">{error}</p>}
        <Button type="submit" size="lg" disabled={saving}>
          {saving ? "Saving…" : "Continue"}
        </Button>
      </form>
    </Card>
  );
}
