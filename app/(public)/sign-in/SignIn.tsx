"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Mail } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { proto, useProto } from "@/lib/prototype/store";
import { authEnabled } from "@/lib/supabase/client";
import { RealSignIn } from "./RealSignIn";
import { GoogleMark, safeNext } from "./shared";

export function SignIn() {
  return authEnabled ? <RealSignIn /> : <PrototypeSignIn />;
}

type Step = "choose" | "sent" | "name";


function PrototypeSignIn() {
  const router = useRouter();
  const next = safeNext(useSearchParams().get("next"));
  const s = useProto();
  const [step, setStep] = useState<Step>("choose");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");

  const finish = (user: { name: string; email: string }) => {
    proto.signIn(user);
    // First time here: a few onboarding questions, then back to where they were going.
    router.push(s?.intake ? next : `/get-started?next=${encodeURIComponent(next)}`);
  };

  const booking = next.startsWith("/book/");
  const messaging = next.startsWith("/messages/");
  const reason = booking
    ? "Sign in to confirm your session. We’ll send your confirmation and Meet link here."
    : messaging
      ? "Sign in to send a message. Replies arrive here and by email."
      : "Book sessions, message your counselor and keep track of upcoming sessions.";

  if (s?.user && step === "choose") {
    return (
      <Card className="flex flex-col gap-4">
        <h1 className="m-0 font-display text-[28px] leading-[34px]">You&rsquo;re signed in</h1>
        <p className="m-0 text-slate-600">
          as <b className="text-slate-900">{s.user.name}</b> ({s.user.email})
        </p>
        <Button href={next} size="lg">
          Continue
        </Button>
      </Card>
    );
  }

  return (
    <Card className="flex flex-col gap-6">
      {step === "choose" && (
        <>
          <div className="flex flex-col gap-2">
            <h1 className="m-0 font-display text-[34px] leading-[1.1]">Welcome</h1>
            <p className="m-0 text-slate-600">{reason}</p>
          </div>
          <Button
            variant="secondary"
            size="lg"
            className="w-full"
            onClick={() => finish({ name: "Grace Thompson", email: "grace.thompson@example.com" })}
          >
            <GoogleMark />
            Continue with Google
          </Button>
          <div className="flex items-center gap-3 text-[13px] text-slate-500" aria-hidden="true">
            <span className="h-px flex-1 bg-divider" />
            or
            <span className="h-px flex-1 bg-divider" />
          </div>
          <form
            noValidate
            className="flex flex-col gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
                setError("Enter an email address like name@example.com.");
                return;
              }
              setError("");
              setStep("sent");
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
              className="min-h-12 rounded-md border border-border bg-cream px-4 text-base aria-invalid:border-peach-700"
            />
            {error && (
              <p id="email-error" className="m-0 text-sm text-peach-700">
                {error}
              </p>
            )}
            <Button type="submit" size="lg" className="w-full">
              Email me a sign-in link
            </Button>
          </form>
          <p className="m-0 text-[13px] leading-normal text-slate-600">
            No password needed. By continuing you agree to the Terms and Privacy Policy. Your conversations are private
            between you and your counselor.
          </p>
        </>
      )}

      {step === "sent" && (
        <>
          <div className="flex size-14 items-center justify-center rounded-lg bg-peach-100">
            <Mail size={26} strokeWidth={1.8} className="text-peach-700" aria-hidden="true" />
          </div>
          <div className="flex flex-col gap-2">
            <h1 className="m-0 font-display text-[30px] leading-[1.1]">Check your email</h1>
            <p className="m-0 text-slate-600">
              We sent a sign-in link to <b className="text-slate-900">{email.trim()}</b>. It works for 1 hour.
            </p>
          </div>
          <div className="flex flex-col gap-2 rounded-md border border-dashed border-peach-400 bg-peach-50 p-4">
            <span className="text-[13px] text-peach-800">Prototype: no email is sent. Pretend you opened the link.</span>
            <Button onClick={() => setStep("name")}>Open the sign-in link</Button>
          </div>
          <button
            type="button"
            onClick={() => setStep("choose")}
            className="min-h-11 cursor-pointer self-start text-sm font-semibold text-peach-700"
          >
            Use a different email
          </button>
        </>
      )}

      {step === "name" && (
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (!name.trim()) return setError("Add the name you’d like to go by.");
            finish({ name: name.trim(), email: email.trim() });
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
            className="min-h-12 rounded-md border border-border bg-cream px-4 text-base"
            autoFocus
          />
          {error && <p className="m-0 text-sm text-peach-700">{error}</p>}
          <Button type="submit" size="lg">
            Continue
          </Button>
        </form>
      )}
    </Card>
  );
}
