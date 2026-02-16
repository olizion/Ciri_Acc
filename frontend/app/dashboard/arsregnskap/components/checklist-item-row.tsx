"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  CheckCircle2Icon,
  AlertCircleIcon,
  ClockIcon,
  ChevronDownIcon,
  RefreshCwIcon,
  SparklesIcon
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import type { ChecklistItem } from "../types";

export function ChecklistItemRow({ item, index }: { item: ChecklistItem; index: number }) {
  const [isOpen, setIsOpen] = useState(false);

  const statusConfig = {
    complete: { icon: CheckCircle2Icon, color: "text-emerald-600", bg: "bg-emerald-100 dark:bg-emerald-900/30", border: "border-emerald-200 dark:border-emerald-800" },
    warning: { icon: AlertCircleIcon, color: "text-amber-600", bg: "bg-amber-100 dark:bg-amber-900/30", border: "border-amber-200 dark:border-amber-800" },
    pending: { icon: ClockIcon, color: "text-muted-foreground", bg: "bg-muted", border: "border-muted" },
    in_progress: { icon: RefreshCwIcon, color: "text-[var(--primary)]", bg: "bg-[var(--primary)]/10", border: "border-[var(--primary)]/30" }
  };

  const status = statusConfig[item.status as keyof typeof statusConfig] ?? statusConfig.pending;
  const StatusIcon = status.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
    >
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <div className={cn(
          "rounded-xl border transition-all",
          status.border,
          item.status === "in_progress" && "ring-2 ring-[var(--primary)]/20"
        )}>
          <CollapsibleTrigger asChild>
            <button className="flex w-full items-center gap-4 p-4 text-left hover:bg-muted/30 transition-colors rounded-xl">
              <div className={cn("flex size-10 shrink-0 items-center justify-center rounded-lg", status.bg)}>
                <StatusIcon className={cn("size-5", status.color, item.status === "in_progress" && "animate-spin")} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-medium">{item.name}</p>
                  {item.status === "in_progress" && (
                    <Badge variant="secondary" className="text-xs bg-[var(--primary)]/10 text-[var(--primary)]">
                      Pågår
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">{item.detail || item.description}</p>
              </div>
              {item.subItems && (
                <ChevronDownIcon className={cn(
                  "size-5 text-muted-foreground transition-transform",
                  isOpen && "rotate-180"
                )} />
              )}
            </button>
          </CollapsibleTrigger>
          {item.subItems && (
            <CollapsibleContent>
              <div className="border-t px-4 py-3 space-y-2">
                {item.subItems.map((sub, i) => (
                  <div key={i} className="flex items-center gap-3 text-sm">
                    {sub.complete ? (
                      <CheckCircle2Icon className="size-4 text-emerald-500" />
                    ) : (
                      <div className="size-4 rounded-full border-2 border-muted-foreground/30" />
                    )}
                    <span className={sub.complete ? "text-muted-foreground" : ""}>{sub.name}</span>
                  </div>
                ))}
                {item.canAutoFix && item.status !== "complete" && (
                  <Button size="sm" variant="outline" className="mt-3 w-full">
                    <SparklesIcon className="mr-2 size-4" />
                    La Ciri fullføre
                  </Button>
                )}
              </div>
            </CollapsibleContent>
          )}
        </div>
      </Collapsible>
    </motion.div>
  );
}
