"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BATCH_CALLS } from "../mock-data";
import type { BatchItem } from "../mock-data";
import {
  BrainCircuitIcon,
  CheckCircle2Icon,
  AlertTriangleIcon,
  ClockIcon,
  XIcon,
  ZapIcon,
  SparklesIcon,
  CoinsIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

export function BatchInspector() {
  const [selectedBatchId, setSelectedBatchId] = useState<string>(BATCH_CALLS[0].id);
  const [selectedItem, setSelectedItem] = useState<BatchItem | null>(null);

  const batch = BATCH_CALLS.find((b) => b.id === selectedBatchId)!;

  return (
    <Card className="overflow-hidden">
      {/* Header with batch selector */}
      <CardHeader className="border-b bg-gradient-to-r from-[var(--primary)]/5 to-transparent pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--primary)]/10">
              <BrainCircuitIcon className="h-4 w-4 text-[var(--primary)]" />
            </div>
            <div>
              <CardTitle className="text-sm font-medium">
                AI Batch-inspeksjon
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                Klikk på noder for å se Ciris detaljerte analyse
              </p>
            </div>
          </div>
          <Badge
            variant="secondary"
            className="border-[var(--primary)]/20 bg-[var(--primary)]/10 text-xs text-[var(--primary)]"
          >
            <SparklesIcon className="mr-1 h-3 w-3" />
            Claude Opus
          </Badge>
        </div>

        {/* Batch selector tabs */}
        <div className="mt-3 flex flex-wrap gap-2">
          {BATCH_CALLS.map((b) => {
            const isActive = selectedBatchId === b.id;
            return (
              <button
                key={b.id}
                onClick={() => {
                  setSelectedBatchId(b.id);
                  setSelectedItem(null);
                }}
                className={cn(
                  "rounded-lg px-3 py-1.5 text-xs font-medium transition-all duration-200",
                  isActive
                    ? "bg-[var(--primary)] text-white shadow-sm shadow-[var(--primary)]/25"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                )}
              >
                {new Date(b.timestamp).toLocaleDateString("nb-NO", {
                  day: "numeric",
                  month: "short",
                })}
                <span className="ml-1.5 opacity-70">
                  {b.totalItems} stk
                </span>
                {b.flagged > 0 && (
                  <span className="ml-1 inline-flex h-4 w-4 items-center justify-center rounded-full bg-amber-500/20 text-[9px] text-amber-600">
                    {b.flagged}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <div className="grid divide-x md:grid-cols-2">
          {/* Left: Interactive node grid */}
          <div className="p-6">
            {/* Batch summary */}
            <div className="mb-4 flex items-center justify-between text-xs text-muted-foreground">
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1">
                  <CheckCircle2Icon className="h-3 w-3 text-emerald-600" />
                  {batch.approved} godkjent
                </span>
                {batch.flagged > 0 && (
                  <span className="flex items-center gap-1">
                    <AlertTriangleIcon className="h-3 w-3 text-amber-600" />
                    {batch.flagged} flagget
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1">
                  <ClockIcon className="h-3 w-3" />
                  {(batch.durationMs / 1000).toFixed(1)}s
                </span>
                <span className="flex items-center gap-1">
                  <CoinsIcon className="h-3 w-3" />
                  kr {batch.tokenCost.toFixed(3)}
                </span>
              </div>
            </div>

            {/* Node grid */}
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
              {batch.items.map((item, i) => {
                const isApproved = item.outcome === "approved";
                const isSelected = selectedItem?.id === item.id;

                return (
                  <motion.button
                    key={item.id}
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{
                      delay: i * 0.06,
                      type: "spring",
                      stiffness: 400,
                      damping: 20,
                    }}
                    onClick={() =>
                      setSelectedItem(isSelected ? null : item)
                    }
                    className={cn(
                      "group relative flex flex-col items-center gap-2 rounded-xl p-3 transition-all duration-200",
                      isSelected
                        ? "bg-[var(--primary)]/10 ring-2 ring-[var(--primary)] shadow-sm"
                        : "hover:bg-muted/50"
                    )}
                  >
                    {/* Glowing orb */}
                    <div
                      className={cn(
                        "relative flex h-12 w-12 items-center justify-center rounded-full transition-all duration-300",
                        isApproved
                          ? "bg-emerald-500/10 text-emerald-600"
                          : "bg-amber-500/10 text-amber-600",
                        isSelected && "scale-110",
                        "group-hover:scale-105"
                      )}
                    >
                      {/* Pulse ring for flagged items */}
                      {!isApproved && (
                        <span className="absolute inset-0 animate-ping rounded-full bg-amber-500/20" />
                      )}
                      {isApproved ? (
                        <CheckCircle2Icon className="h-5 w-5" />
                      ) : (
                        <AlertTriangleIcon className="h-5 w-5" />
                      )}
                    </div>

                    {/* Label */}
                    <div className="w-full text-center">
                      <p className="max-w-[80px] truncate text-xs font-medium mx-auto">
                        {item.merchantName}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        kr{" "}
                        {Math.abs(item.amount).toLocaleString("nb-NO")}
                      </p>
                    </div>

                    {/* Confidence bar */}
                    <div className="h-1 w-full overflow-hidden rounded-full bg-muted">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{
                          width: `${item.confidenceScore * 100}%`,
                        }}
                        transition={{ delay: i * 0.06 + 0.3, duration: 0.4 }}
                        className={cn(
                          "h-full rounded-full",
                          isApproved ? "bg-emerald-500" : "bg-amber-500"
                        )}
                      />
                    </div>
                  </motion.button>
                );
              })}
            </div>
          </div>

          {/* Right: Detail panel */}
          <div className="p-6">
            <AnimatePresence mode="wait">
              {selectedItem ? (
                <motion.div
                  key={selectedItem.id}
                  initial={{ opacity: 0, x: 12 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -12 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-4"
                >
                  {/* Header */}
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-display text-lg font-semibold">
                        {selectedItem.merchantName}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {selectedItem.bilagNumber} · Konto{" "}
                        {selectedItem.account}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => setSelectedItem(null)}
                    >
                      <XIcon className="h-4 w-4" />
                    </Button>
                  </div>

                  {/* Metrics grid */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-lg bg-muted/50 p-3">
                      <p className="text-[10px] font-medium text-muted-foreground">
                        Beløp
                      </p>
                      <p className="font-display text-base font-bold">
                        kr{" "}
                        {Math.abs(selectedItem.amount).toLocaleString(
                          "nb-NO"
                        )}
                      </p>
                    </div>
                    <div className="rounded-lg bg-muted/50 p-3">
                      <p className="text-[10px] font-medium text-muted-foreground">
                        Konfidens
                      </p>
                      <p className="font-display text-base font-bold">
                        {(selectedItem.confidenceScore * 100).toFixed(0)}%
                      </p>
                    </div>
                    <div className="rounded-lg bg-muted/50 p-3">
                      <p className="text-[10px] font-medium text-muted-foreground">
                        Klynge
                      </p>
                      <p className="text-sm font-medium">
                        {selectedItem.clusterName}
                      </p>
                    </div>
                    <div className="rounded-lg bg-muted/50 p-3">
                      <p className="text-[10px] font-medium text-muted-foreground">
                        Klynge-fit
                      </p>
                      <Badge
                        variant={
                          selectedItem.clusterFit === "HIGH"
                            ? "default"
                            : selectedItem.clusterFit === "PARTIAL"
                              ? "secondary"
                              : "outline"
                        }
                        className="mt-0.5 text-[10px]"
                      >
                        {selectedItem.clusterFit}
                      </Badge>
                    </div>
                  </div>

                  {/* Ciri's reasoning — THE KEY FEATURE */}
                  <div className="rounded-xl border border-[var(--primary)]/20 bg-[var(--primary)]/5 p-4">
                    <div className="mb-2 flex items-center gap-2">
                      <SparklesIcon className="h-4 w-4 text-[var(--primary)]" />
                      <span className="text-sm font-medium text-[var(--primary)]">
                        Ciris analyse
                      </span>
                    </div>
                    <p className="text-sm leading-relaxed text-foreground/80">
                      {selectedItem.ciriReasoning}
                    </p>
                  </div>

                  {/* Outcome + meta */}
                  <div className="flex items-center gap-2">
                    <Badge
                      className={cn(
                        "text-xs",
                        selectedItem.outcome === "approved"
                          ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-600"
                          : "border-amber-500/20 bg-amber-500/10 text-amber-600"
                      )}
                    >
                      {selectedItem.outcome === "approved"
                        ? "Godkjent av AI"
                        : "Flagget for gjennomgang"}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      Tier {selectedItem.tier}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      · {selectedItem.accountLabel}
                    </span>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex h-full min-h-[280px] flex-col items-center justify-center py-12 text-center"
                >
                  <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-muted">
                    <ZapIcon className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Velg en transaksjon
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground/70">
                    Klikk på en node til venstre for å se
                    <br />
                    Ciris detaljerte analyse og begrunnelse
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
