"use client";

import { memo } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { ReconciliationStatus } from "../types";

// ============================================================================
// StatusDot
// ============================================================================

interface StatusDotProps {
  status: ReconciliationStatus;
}

const statusConfigs: Record<ReconciliationStatus, { cls: string; label: string }> = {
  matched: { cls: "bg-emerald-500", label: "Avstemt" },
  suggested: { cls: "bg-[var(--primary)]", label: "Foreslått" },
  unmatched: { cls: "bg-muted-foreground/30", label: "Uavstemt" },
  ignored: { cls: "bg-muted-foreground/15", label: "Ignorert" },
};

export const StatusDot = memo(function StatusDot({ status }: StatusDotProps) {
  const config = statusConfigs[status] ?? statusConfigs.unmatched;

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className={cn("inline-block size-2 rounded-full shrink-0", config.cls)} />
        </TooltipTrigger>
        <TooltipContent side="top" className="text-xs">{config.label}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
});
