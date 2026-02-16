"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RECENT_DECISIONS } from "../mock-data";
import type { DecisionOutcome } from "../mock-data";
import { CHART_COLORS } from "../chart-theme";
import { cn } from "@/lib/utils";
import {
  CheckCircle2Icon,
  AlertTriangleIcon,
  EyeIcon,
  MinusCircleIcon,
  RefreshCwIcon,
  ChevronDownIcon,
  SparklesIcon,
  ListIcon,
  ShieldCheckIcon,
} from "lucide-react";

const outcomeConfig: Record<
  DecisionOutcome,
  { label: string; icon: typeof CheckCircle2Icon; color: string }
> = {
  auto_posted: {
    label: "Autopostert",
    icon: CheckCircle2Icon,
    color: "text-emerald-600",
  },
  suggested: {
    label: "Foreslått",
    icon: EyeIcon,
    color: "text-blue-600",
  },
  flagged: {
    label: "Flagget",
    icon: AlertTriangleIcon,
    color: "text-amber-600",
  },
  ignored: {
    label: "Ignorert",
    icon: MinusCircleIcon,
    color: "text-muted-foreground",
  },
  overridden: {
    label: "Overstyrt",
    icon: RefreshCwIcon,
    color: "text-purple-600",
  },
};

export function DecisionFeed() {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <Card className="overflow-hidden">
      {/* Top highlight */}
      <div
        className="h-px"
        style={{
          background: `linear-gradient(to right, transparent, ${CHART_COLORS.blue}30, transparent)`,
        }}
      />

      <div className="px-4 pt-4 pb-3 sm:px-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div
              className="flex h-7 w-7 items-center justify-center rounded-lg"
              style={{ backgroundColor: `${CHART_COLORS.blue}15` }}
            >
              <ListIcon
                className="h-3.5 w-3.5"
                style={{ color: CHART_COLORS.blue }}
              />
            </div>
            <span className="text-sm font-semibold">
              Siste beslutninger
            </span>
          </div>
          <Badge variant="outline" className="text-xs">
            {RECENT_DECISIONS.length} siste
          </Badge>
        </div>
      </div>

      <CardContent className="p-0">
        <div className="divide-y divide-slate-100">
          {RECENT_DECISIONS.map((decision, i) => {
            const config = outcomeConfig[decision.outcome];
            const Icon = config.icon;
            const isExpanded = expandedId === decision.id;

            return (
              <motion.div
                key={decision.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: i * 0.03 }}
              >
                <button
                  onClick={() =>
                    setExpandedId(isExpanded ? null : decision.id)
                  }
                  className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-slate-50/50 sm:px-5"
                >
                  <Icon
                    className={cn("h-4 w-4 shrink-0", config.color)}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-sm font-medium">
                        {decision.merchantName}
                      </span>
                      <Badge
                        variant="outline"
                        className="shrink-0 text-xs"
                      >
                        {config.label}
                      </Badge>
                    </div>
                    <p className="truncate text-xs text-muted-foreground">
                      {decision.description}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-sm font-medium tabular-nums">
                      kr{" "}
                      {Math.abs(decision.amount).toLocaleString("nb-NO")}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(decision.timestamp).toLocaleDateString(
                        "nb-NO",
                        { day: "numeric", month: "short" }
                      )}
                    </p>
                  </div>
                  <ChevronDownIcon
                    className={cn(
                      "h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200",
                      isExpanded && "rotate-180"
                    )}
                  />
                </button>

                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="border-t border-slate-100 bg-gradient-to-br from-white to-slate-50/50 px-4 py-3 sm:px-5">
                        {/* Phase details */}
                        <div className="grid grid-cols-4 gap-3 text-xs">
                          <div>
                            <p className="text-muted-foreground">
                              Fase 1 score
                            </p>
                            <p className="font-semibold">
                              {(decision.phase1Score * 100).toFixed(0)}%
                            </p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">
                              Klynge-fit
                            </p>
                            <p className="font-semibold">
                              {decision.phase2ClusterFit}
                            </p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">
                              AI godkjent
                            </p>
                            <p className="font-semibold">
                              {decision.phase3AiApproved === null
                                ? "—"
                                : decision.phase3AiApproved
                                  ? "Ja"
                                  : "Nei"}
                            </p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Konto</p>
                            <p className="font-semibold">
                              {decision.account} {decision.accountLabel}
                            </p>
                          </div>
                        </div>

                        {decision.ruleName && (
                          <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                            <ShieldCheckIcon className="h-3.5 w-3.5" />
                            <span>Regel: {decision.ruleName}</span>
                          </div>
                        )}

                        {decision.ciriReasoning && (
                          <div className="mt-3 rounded-xl border border-[var(--primary)]/15 bg-[var(--primary)]/5 p-3">
                            <div className="mb-1.5 flex items-center gap-1.5">
                              <SparklesIcon className="h-3.5 w-3.5 text-[var(--primary)]" />
                              <span className="text-xs font-semibold text-[var(--primary)]">
                                Ciris resonnement
                              </span>
                            </div>
                            <p className="text-sm leading-relaxed text-foreground/80">
                              {decision.ciriReasoning}
                            </p>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
