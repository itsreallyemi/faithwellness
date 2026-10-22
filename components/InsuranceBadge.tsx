import { ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/cn";

/** Shown on licensed counselors who bill insurance through their own practice. */
export function InsuranceBadge({ className }: { className?: string }) {
  return (
    <Badge variant="accent" className={cn("whitespace-nowrap", className)}>
      <ShieldCheck size={15} strokeWidth={1.8} aria-hidden="true" />
      Insurance accepted
    </Badge>
  );
}
