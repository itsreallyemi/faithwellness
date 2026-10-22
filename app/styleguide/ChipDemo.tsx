"use client";

import { useState } from "react";
import { FilterChip } from "@/components/ui/FilterChip";

const focusAreas = ["Marriage", "Trauma", "Abuse recovery", "Financial", "Grief & loss", "Anxiety", "Ministry burnout"];

export function ChipDemo() {
  const [selected, setSelected] = useState<string[]>(["Marriage", "Trauma"]);
  return (
    <div className="flex flex-wrap gap-2">
      {focusAreas.map((f) => (
        <FilterChip
          key={f}
          selected={selected.includes(f)}
          onChange={(on) => setSelected((s) => (on ? [...s, f] : s.filter((x) => x !== f)))}
        >
          {f}
        </FilterChip>
      ))}
    </div>
  );
}
