import { Button } from "@/components/ui/Button";
import { CrisisNotice } from "@/components/ui/CrisisNotice";

export function ComingSoon({ title, body }: { title: string; body: string }) {
  return (
    <main className="mx-auto flex max-w-[1280px] flex-col items-start gap-6 px-4 py-14 md:px-8">
      <h1 className="m-0 font-display text-[34px] leading-[1.08] md:text-[44px]">{title}</h1>
      <p className="m-0 max-w-[640px] text-lg leading-[1.55] text-slate-600">{body}</p>
      <Button href="/counselors">Find a counselor</Button>
      <CrisisNotice className="w-full" />
    </main>
  );
}
