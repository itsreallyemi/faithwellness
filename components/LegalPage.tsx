import { CrisisNotice } from "@/components/ui/CrisisNotice";
import { legalUpdated } from "@/lib/site";

export type LegalSection = { title: string; body: React.ReactNode };

/** Shared layout for /privacy and /terms: a heading, an intro, then numbered sections. */
export function LegalPage({ overline, title, intro, sections }: { overline: string; title: string; intro: React.ReactNode; sections: LegalSection[] }) {
  return (
    <main className="mx-auto flex w-full max-w-[760px] flex-col gap-10 px-4 py-10 md:px-8 md:py-14">
      <header className="flex flex-col gap-4">
        <span className="label-overline text-peach-700!">{overline}</span>
        <h1 className="m-0 font-display text-[36px] leading-[1.08] tracking-[-0.01em] md:text-[48px]">{title}</h1>
        <p className="m-0 text-sm text-slate-600">Last updated {legalUpdated}</p>
        <div className="flex flex-col gap-3 text-lg leading-[1.55] text-slate-600">{intro}</div>
      </header>
      <ol className="m-0 flex list-none flex-col gap-9 p-0">
        {sections.map((s, i) => (
          <li key={s.title} className="flex flex-col gap-3">
            <h2 className="m-0 font-display text-[24px] leading-[30px]">
              {i + 1}. {s.title}
            </h2>
            <div className="flex flex-col gap-3 text-base leading-[1.65] [&_ul]:m-0 [&_ul]:list-disc [&_li+li]:mt-2 [&_ul]:pl-5 [&_li]:pl-1 [&_p]:m-0">
              {s.body}
            </div>
          </li>
        ))}
      </ol>
      <CrisisNotice />
    </main>
  );
}
