"use client";

import { memo } from "react";
import { CheckIcon, XIcon } from "lucide-react";
import { cn } from "@/lib/utils";

// ============================================================================
// FactorPill
// ============================================================================

interface FactorPillProps {
  label: string;
  matched: boolean;
  detail?: string;
}

export const FactorPill = memo(function FactorPill({
  label,
  matched,
  detail,
}: FactorPillProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium",
        matched
          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
          : "bg-muted text-muted-foreground"
      )}
    >
      {matched ? (
        <CheckIcon className="size-2.5" />
      ) : (
        <XIcon className="size-2.5" />
      )}
      {label}
      {detail && (
        <span className={cn(
          "opacity-70",
          matched ? "text-emerald-600 dark:text-emerald-300" : ""
        )}>
          · {detail}
        </span>
      )}
    </span>
  );
});
