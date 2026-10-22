import { BadgeCheck } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/cn";

export function MemberBadge({ churchName, className }: { churchName?: string; className?: string }) {
  return (
    <Badge className={cn("whitespace-nowrap", className)}>
      <BadgeCheck size={15} strokeWidth={1.8} aria-hidden="true" />
      {churchName ? `${churchName} member` : "Verified member"}
    </Badge>
  );
}
