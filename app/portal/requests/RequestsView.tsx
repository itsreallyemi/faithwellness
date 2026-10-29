"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CalendarDays, Mail, MapPin } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { shortDate } from "@/lib/applications";
import { proto } from "@/lib/prototype/store";
import { requestStatusLabel, requestWhen, type ServiceRequest } from "@/lib/services";
import { supabaseBrowser } from "@/lib/supabase/client";
import { usePortal } from "../PortalShell";
import { field, PageHeader, Panel } from "../ui";

/** Service requests (weddings, funerals…) sent from the counselor's public profile. */
export function RequestsView() {
  const { real, counselor, reload } = usePortal();
  const [requests, setRequests] = useState<ServiceRequest[] | null>(null);

  useEffect(() => {
    if (!real) return;
    (async () => {
      const sb = supabaseBrowser();
      const { data: me } = await sb.auth.getUser();
      const { data } = await sb
        .from("service_requests")
        .select("*")
        .eq("counselor_id", me.user?.id ?? "")
        .order("created_at", { ascending: false });
      setRequests((data as ServiceRequest[] | null) ?? []);
    })();
  }, [real]);

  const header = <PageHeader title="Requests" sub="Weddings, funerals and other services clients ask you for." />;

  if (!real) {
    return (
      <>
        {header}
        <Card className="text-slate-600">Requests from clients appear here for approved counselors.</Card>
      </>
    );
  }
  if (!requests) return header;

  const waiting = requests.filter((r) => r.status === "new");
  const answered = requests.filter((r) => r.status !== "new");
  const replaced = (r: ServiceRequest) => {
    setRequests((list) => list?.map((x) => (x.id === r.id ? r : x)) ?? null);
    reload();
  };

  return (
    <>
      {header}
      {counselor.services.length === 0 && (
        <Card padding="compact" className="flex flex-col gap-2 text-[15px]">
          <b>You haven&rsquo;t listed any services yet.</b>
          <span className="text-slate-600">
            Add weddings, funerals or your own services in <Link href="/portal/settings?tab=services#services">Settings → Services</Link>, and
            clients can request them from your profile.
          </span>
        </Card>
      )}
      <Panel id="waiting" title={`Needs your reply (${waiting.length})`}>
        {waiting.length === 0 ? (
          <p className="m-0 text-slate-600">You&rsquo;re all caught up.</p>
        ) : (
          <ul className="m-0 flex list-none flex-col gap-4 p-0">
            {waiting.map((r) => (
              <li key={r.id}>
                <RequestCard request={r}>
                  <Reply request={r} onDone={replaced} />
                </RequestCard>
              </li>
            ))}
          </ul>
        )}
      </Panel>
      {answered.length > 0 && (
        <Panel id="answered" title="Answered">
          <ul className="m-0 flex list-none flex-col gap-4 p-0">
            {answered.map((r) => (
              <li key={r.id}>
                <RequestCard request={r}>
                  {r.counselor_reply && (
                    <p className="m-0 rounded-md border-l-4 border-border bg-white px-4 py-3 text-[15px] whitespace-pre-line">
                      <span className="block text-[13px] font-semibold text-slate-600">Your reply</span>
                      {r.counselor_reply}
                    </p>
                  )}
                </RequestCard>
              </li>
            ))}
          </ul>
        </Panel>
      )}
    </>
  );
}

function RequestCard({ request: r, children }: { request: ServiceRequest; children?: React.ReactNode }) {
  return (
    <article className="flex flex-col gap-3 rounded-md border border-border-warm bg-cream p-4 md:p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex flex-col gap-0.5">
          <b className="text-[17px]">{r.service_name}</b>
          <span className="text-sm text-slate-600">
            From {r.client_name} · sent {shortDate(r.created_at)}
          </span>
        </div>
        <Badge variant={r.status === "new" ? "accent" : r.status === "accepted" ? "credential" : "tag"}>{requestStatusLabel[r.status]}</Badge>
      </div>
      <ul className="m-0 flex list-none flex-col gap-1.5 p-0 text-[15px]">
        <li className="flex items-center gap-2">
          <CalendarDays size={16} strokeWidth={1.8} className="flex-none text-slate-500" aria-hidden="true" />
          {requestWhen(r)}
        </li>
        {r.location && (
          <li className="flex items-center gap-2">
            <MapPin size={16} strokeWidth={1.8} className="flex-none text-slate-500" aria-hidden="true" />
            {r.location}
          </li>
        )}
        <li className="flex items-center gap-2">
          <Mail size={16} strokeWidth={1.8} className="flex-none text-slate-500" aria-hidden="true" />
          <a href={`mailto:${r.client_email}?subject=${encodeURIComponent(`Your request: ${r.service_name}`)}`} className="break-all">
            {r.client_email}
          </a>
        </li>
      </ul>
      <p className="m-0 rounded-md bg-white px-4 py-3 text-[15px] leading-[1.6] whitespace-pre-line">{r.details}</p>
      {children}
    </article>
  );
}

function Reply({ request, onDone }: { request: ServiceRequest; onDone: (r: ServiceRequest) => void }) {
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const respond = async (status: "accepted" | "declined") => {
    if (!message.trim()) return setError("Add a short message. They see it on their account page.");
    setSaving(true);
    const { data, error } = await supabaseBrowser()
      .rpc("respond_to_service_request", { p_id: request.id, p_status: status, p_reply: message })
      .single();
    setSaving(false);
    if (error) return setError("That didn’t send. Please try again.");
    proto.toast(status === "accepted" ? "Request accepted" : "Request declined");
    onDone(data as ServiceRequest);
  };

  return (
    <div className="flex flex-col gap-3">
      <label className="flex flex-col gap-1.5 text-sm font-semibold">
        Your reply
        <textarea
          rows={3}
          value={message}
          onChange={(e) => {
            setMessage(e.target.value);
            setError("");
          }}
          aria-invalid={Boolean(error) || undefined}
          placeholder="e.g. I’d be honored. Let’s set up a call this week to talk through the service."
          className={`${field} py-3 font-normal`}
        />
      </label>
      {error && (
        <p role="alert" className="m-0 text-sm text-peach-700">
          {error}
        </p>
      )}
      <div className="flex flex-wrap gap-3">
        <Button disabled={saving} onClick={() => respond("accepted")}>
          Accept
        </Button>
        <Button variant="secondary" disabled={saving} onClick={() => respond("declined")}>
          Decline
        </Button>
      </div>
    </div>
  );
}
