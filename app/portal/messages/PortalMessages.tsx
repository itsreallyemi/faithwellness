"use client";

import { useEffect, useState } from "react";
import { ChevronLeft, Lock, Send } from "lucide-react";
import { SharedIntakeCard } from "@/components/prototype/SharedIntake";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/cn";
import { formatTime } from "@/lib/prototype/format";
import { proto, type ProtoMessage } from "@/lib/prototype/store";
import { markThreadRead, sendInThread, toProtoMessages } from "@/lib/supabase/messages";
import { usePortal } from "../PortalShell";
import { dayLabel, field, PageHeader } from "../ui";

/** real: a conversation saved in the database (a real counselor with a real client). */
type Thread = { id: string; name: string; messages: ProtoMessage[]; sample: boolean; real?: boolean };

/** Fictional conversations so the inbox isn't empty. They can't be replied to. */
function sampleThreads(preferredName: string): Thread[] {
  const ago = (hours: number) => new Date(Date.now() - hours * 3_600_000).toISOString();
  return [
    {
      id: "sample-samuel",
      name: "Samuel O.",
      sample: true,
      messages: [
        { id: "s1", from: "client", at: ago(30), body: "Thank you for Tuesday. Could we talk more about forgiveness next time?" },
        { id: "s2", from: "counselor", at: ago(28), body: "Of course. Take your time with the reading, and we’ll start there." },
      ],
    },
    {
      id: "sample-lydia",
      name: "Lydia P.",
      sample: true,
      messages: [
        {
          id: "l1",
          from: "client",
          at: ago(52),
          body: `Hi ${preferredName}, I booked a 30 minute first session. Is it okay if my sister joins for the first few minutes?`,
        },
        { id: "l2", from: "counselor", at: ago(50), body: "Yes, that’s fine. We can decide together how long she stays." },
      ],
    },
  ];
}

/** "Grace T." from "Grace Thompson": counselors see a first name and last initial. */
const short = (name: string) => {
  const [first, ...rest] = name.trim().split(/\s+/);
  return rest.length ? `${first} ${rest.at(-1)![0]}.` : first || "Client";
};

export function PortalMessages() {
  const { s, counselor, real, realThreads } = usePortal();
  const yours: Thread[] =
    s.user || (s.threads[counselor.slug]?.length ?? 0) > 0
      ? [{ id: "you", name: s.user?.name ?? "Prototype client", messages: s.threads[counselor.slug] ?? [], sample: false }]
      : [];
  // Real counselors see only their real conversations; prototype samples keep the demo inbox.
  const threads: Thread[] = real
    ? realThreads.map((t) => ({ id: t.id, name: short(t.client_name), messages: toProtoMessages(t, "counselor"), sample: false, real: true }))
    : [...yours, ...sampleThreads(counselor.preferredName)];
  const [openId, setOpenId] = useState<string | null>(null);
  const open = threads.find((t) => t.id === openId) ?? null;

  return (
    <>
      <PageHeader title="Messages" sub="Only you and your client can read these." />
      <div className="grid items-start gap-5 lg:grid-cols-[320px_1fr]">
        <Card padding="none" className={cn("overflow-hidden", open && "hidden lg:block")}>
          <ul className="m-0 flex list-none flex-col divide-y divide-border p-0" aria-label="Conversations">
            {threads.length === 0 && (
              <li className="p-5 text-[15px] text-slate-600">No messages yet. When a client writes to you, it appears here.</li>
            )}
            {threads.map((t) => {
              const last = t.messages.filter((m) => m.from !== "system").at(-1);
              return (
                <li key={t.id}>
                  <button
                    type="button"
                    onClick={() => setOpenId(t.id)}
                    aria-current={t.id === open?.id ? "true" : undefined}
                    className={cn(
                      "flex min-h-[72px] w-full cursor-pointer items-center gap-3 px-4 py-3 text-left hover:bg-cream",
                      t.id === open?.id && "bg-peach-50",
                    )}
                  >
                    <Avatar name={t.name} size={44} tint="#F3EEE6" />
                    <span className="flex min-w-0 flex-1 flex-col">
                      <b className="flex items-center gap-2 text-[15px]">
                        {t.name}
                        {t.sample && <span className="text-xs font-normal text-slate-600">sample</span>}
                      </b>
                      <span className="truncate text-[13px] text-slate-600">
                        {last ? `${last.from === "counselor" ? "You: " : ""}${last.body}` : "No messages yet"}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </Card>

        {open ? (
          <Conversation thread={open} onBack={() => setOpenId(null)} />
        ) : (
          <Card padding="compact" className="hidden text-[15px] text-slate-600 lg:block">
            Choose a conversation.
          </Card>
        )}
      </div>
    </>
  );
}

function Conversation({ thread, onBack }: { thread: Thread; onBack: () => void }) {
  const { s, counselor, settings, reloadThreads } = usePortal();
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const tz = settings.timeZone;
  const intake = !thread.sample && !thread.real && s.intake?.shareWithCounselor ? s.intake : null;

  // Opening a real conversation marks it read.
  useEffect(() => {
    if (thread.real) markThreadRead(thread.id).then(reloadThreads);
  }, [thread.real, thread.id, thread.messages.length, reloadThreads]);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    const body = draft.trim();
    if (!body || sending) return;
    if (!thread.real) {
      proto.counselorSend(counselor.slug, body);
      return setDraft("");
    }
    setSending(true);
    const ok = await sendInThread(thread.id, body);
    setSending(false);
    if (!ok) return proto.toast("Your message didn’t send. Please try again.");
    setDraft("");
    reloadThreads();
  };

  return (
    <div className="flex flex-col gap-4">
      <Card padding="compact" className="flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onBack}
            aria-label="Back to conversations"
            className="-ml-2 flex size-11 cursor-pointer items-center justify-center rounded-md hover:bg-cream lg:hidden"
          >
            <ChevronLeft size={22} strokeWidth={1.8} aria-hidden="true" />
          </button>
          <h2 className="m-0 font-display text-[24px] leading-8">{thread.name}</h2>
        </div>

        <ol className="m-0 flex list-none flex-col gap-3 p-0">
          {thread.messages.length === 0 && <li className="text-[15px] text-slate-600">No messages yet.</li>}
          {thread.messages.map((m) =>
            m.from === "system" ? (
              <li key={m.id} className="self-center rounded-pill bg-cream px-3 py-1.5 text-center text-[13px] text-slate-600">
                {m.body}
              </li>
            ) : (
              <li
                key={m.id}
                className={cn(
                  "flex max-w-[85%] flex-col gap-1 rounded-lg px-4 py-3 text-[15px] leading-normal",
                  m.from === "counselor" ? "self-end bg-peach-100" : "self-start bg-cream",
                )}
              >
                {m.body}
                <span className="text-xs text-slate-600">
                  {dayLabel(new Date(m.at), tz)}, {formatTime(new Date(m.at), tz)}
                </span>
              </li>
            ),
          )}
        </ol>

        {thread.sample ? (
          <p className="m-0 rounded-md bg-cream px-4 py-3 text-sm text-slate-600">
            Prototype: this is a sample conversation. Book or message {counselor.preferredName} as a client to try a real one.
          </p>
        ) : (
          <form onSubmit={send} className="flex flex-col gap-2">
            <label htmlFor="reply" className="sr-only">
              Reply to {thread.name}
            </label>
            <textarea
              id="reply"
              rows={3}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder={`Write to ${thread.name.split(" ")[0]}`}
              className={`${field} py-3`}
            />
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="flex items-center gap-1.5 text-[13px] text-slate-600">
                <Lock size={14} strokeWidth={1.8} aria-hidden="true" />
                Private between you and {thread.name.split(" ")[0]}
              </span>
              <Button type="submit" disabled={!draft.trim() || sending}>
                <Send size={16} strokeWidth={1.8} aria-hidden="true" />
                Send
              </Button>
            </div>
          </form>
        )}
      </Card>
      {intake && <SharedIntakeCard intake={intake} clientName={thread.name.split(" ")[0]} />}
    </div>
  );
}
