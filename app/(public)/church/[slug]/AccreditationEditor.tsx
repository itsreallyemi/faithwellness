"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { proto } from "@/lib/prototype/store";
import { supabaseBrowser } from "@/lib/supabase/client";

/** One group of requirements while editing: its items are one per line. */
type Group = { key: number; title: string; items: string };

type Saved = {
  accreditation_summary: string;
  credential_name: string;
  accredited_by: string;
  requirements: { title: string; items: string[] }[] | null;
  renewal: string;
  how_to_apply: string;
};

/** Suggested headings for a church starting from nothing. Empty groups aren't saved. */
const STARTER = ["Training", "Classes", "Ministry service", "Supervision", "Character and faith", "Safeguarding"];

const field = "w-full rounded-md border border-border bg-white px-4 text-base font-normal";
const label = "flex flex-col gap-1.5 text-sm font-semibold";
const hint = "text-[13px] font-normal text-slate-600";

let nextKey = 0;
const group = (title: string, items: string[] = []): Group => ({ key: nextKey++, title, items: items.join("\n") });

/**
 * What the church's counselors had to do to be accredited. Published on /accreditation/[slug] once it has a
 * credential name and at least one requirement.
 */
export function AccreditationEditor({ churchSlug }: { churchSlug: string }) {
  const [loaded, setLoaded] = useState(false);
  const [credential, setCredential] = useState("");
  const [accreditedBy, setAccreditedBy] = useState("");
  const [summary, setSummary] = useState("");
  const [groups, setGroups] = useState<Group[]>([]);
  const [renewal, setRenewal] = useState("");
  const [howToApply, setHowToApply] = useState("");
  const [published, setPublished] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    supabaseBrowser()
      .from("churches")
      .select("accreditation_summary, credential_name, accredited_by, requirements, renewal, how_to_apply")
      .eq("slug", churchSlug)
      .maybeSingle()
      .then(({ data }) => {
        const d = data as Saved | null;
        const reqs = d?.requirements ?? [];
        setCredential(d?.credential_name ?? "");
        setAccreditedBy(d?.accredited_by ?? "");
        setSummary(d?.accreditation_summary ?? "");
        setGroups(reqs.length ? reqs.map((g) => group(g.title, g.items)) : STARTER.map((t) => group(t)));
        setRenewal(d?.renewal ?? "");
        setHowToApply(d?.how_to_apply ?? "");
        setPublished(Boolean(d?.credential_name) && reqs.length > 0);
        setLoaded(true);
      });
  }, [churchSlug]);

  if (!loaded) return <div aria-hidden="true" className="h-40 rounded-md bg-cream-200" />;

  const update = (key: number, patch: Partial<Group>) => setGroups((gs) => gs.map((g) => (g.key === key ? { ...g, ...patch } : g)));

  const save = async () => {
    const requirements = groups
      .map((g) => ({ title: g.title.trim(), items: g.items.split("\n").map((i) => i.trim()).filter(Boolean) }))
      .filter((g) => g.title && g.items.length);
    if (!credential.trim()) return setError("Add the name of your accreditation, for example “Care Team Counselor”.");
    if (!requirements.length) return setError("Add at least one requirement under a heading.");
    setSaving(true);
    setError("");
    const { error } = await supabaseBrowser().rpc("save_church_accreditation", {
      p_church_slug: churchSlug,
      p_summary: summary,
      p_credential_name: credential,
      p_accredited_by: accreditedBy,
      p_requirements: requirements,
      p_renewal: renewal,
      p_how_to_apply: howToApply,
    });
    setSaving(false);
    if (error) return setError("That didn’t save. Please try again.");
    setPublished(true);
    proto.toast("Requirements saved. Your public page updates within a minute.");
  };

  return (
    <div className="flex flex-col gap-5">
      {published && (
        <p className="m-0 text-[15px]">
          <span className="font-semibold text-sage-700">Published.</span>{" "}
          <Link href={`/accreditation/${churchSlug}`} className="font-semibold">
            View your public page
          </Link>
        </p>
      )}

      <label className={label}>
        Name of the accreditation
        <span className={hint}>What your counselors are called once accredited, for example &ldquo;Care Team Counselor&rdquo;.</span>
        <input value={credential} onChange={(e) => setCredential(e.target.value)} maxLength={120} className={`${field} min-h-12`} />
      </label>

      <label className={label}>
        Accredited through (optional)
        <span className={hint}>If your denomination or presbytery accredits your counselors, name it. Leave blank if your church does.</span>
        <input value={accreditedBy} onChange={(e) => setAccreditedBy(e.target.value)} maxLength={120} className={`${field} min-h-12`} />
      </label>

      <label className={label}>
        Short summary
        <span className={hint}>One or two sentences about who you accredit and how.</span>
        <textarea rows={2} value={summary} onChange={(e) => setSummary(e.target.value)} maxLength={400} className={`${field} py-3`} />
      </label>

      <fieldset className="m-0 flex flex-col gap-4 border-0 p-0">
        <legend className="mb-1 p-0 text-sm font-semibold">
          Requirements
          <span className={`${hint} mt-1 block`}>Group them under headings. Put one requirement on each line. Headings left empty aren&rsquo;t shown.</span>
        </legend>
        {groups.map((g, i) => (
          <div key={g.key} className="flex flex-col gap-2 rounded-md border border-border-warm bg-cream p-4">
            <div className="flex items-end gap-2">
              <label className={`${label} flex-1`}>
                Heading
                <input
                  value={g.title}
                  onChange={(e) => update(g.key, { title: e.target.value })}
                  maxLength={80}
                  className={`${field} min-h-11`}
                  aria-label={`Heading ${i + 1}`}
                />
              </label>
              <Button
                variant="link"
                className="min-h-11! px-3! text-sm"
                aria-label={`Remove ${g.title || "this heading"}`}
                onClick={() => setGroups((gs) => gs.filter((x) => x.key !== g.key))}
              >
                <Trash2 size={18} strokeWidth={1.8} aria-hidden="true" />
              </Button>
            </div>
            <label className={label}>
              <span className="sr-only">Requirements under {g.title || "this heading"}, one per line</span>
              <textarea
                rows={3}
                value={g.items}
                onChange={(e) => update(g.key, { items: e.target.value })}
                placeholder={"For example:\n40 hours of pastoral care training"}
                className={`${field} py-3`}
              />
            </label>
          </div>
        ))}
        {groups.length < 12 && (
          <Button variant="secondary" className="self-start" onClick={() => setGroups((gs) => [...gs, group("")])}>
            <Plus size={18} strokeWidth={1.8} aria-hidden="true" />
            Add a heading
          </Button>
        )}
      </fieldset>

      <label className={label}>
        Renewal (optional)
        <span className={hint}>How often accreditation is renewed, and what that takes.</span>
        <input value={renewal} onChange={(e) => setRenewal(e.target.value)} maxLength={400} className={`${field} min-h-12`} />
      </label>

      <label className={label}>
        How counselors apply (optional)
        <input value={howToApply} onChange={(e) => setHowToApply(e.target.value)} maxLength={400} className={`${field} min-h-12`} />
      </label>

      {error && (
        <p role="alert" className="m-0 text-sm text-peach-800">
          {error}
        </p>
      )}
      <Button className="self-start" disabled={saving} onClick={save}>
        {saving ? "Saving…" : published ? "Save changes" : "Publish requirements"}
      </Button>
    </div>
  );
}
