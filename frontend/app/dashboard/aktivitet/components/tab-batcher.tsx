"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AgCharts } from "ag-charts-react";
import type { AgChartOptions } from "ag-charts-community";
import { AllCommunityModule, ModuleRegistry } from "ag-charts-community";
import {
  LayersIcon,
  CheckCircle2Icon,
  AlertTriangleIcon,
  ClockIcon,
  DollarSignIcon,
  ChevronDownIcon,
  SparklesIcon,
  BrainCircuitIcon,
  ZapIcon,
  ActivityIcon,
  TrendingUpIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  BATCH_CALLS,
  BATCH_HISTORY,
  CIRI_MODEL_USAGE,
  type BatchCall,
} from "../mock-data";
import { ciriChartTheme, CHART_COLORS } from "../chart-theme";

ModuleRegistry.registerModules([AllCommunityModule]);

// ── Helpers ────────────────────────────────────────────────

function formatDate(timestamp: string) {
  return new Date(timestamp).toLocaleDateString("nb-NO", {
    day: "numeric",
    month: "short",
  });
}

function formatTime(timestamp: string) {
  return new Date(timestamp).toLocaleTimeString("nb-NO", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function statusDotColor(status: BatchCall["status"]) {
  switch (status) {
    case "completed":
      return "bg-emerald-500";
    case "partial":
      return "bg-amber-500";
    case "rejected":
      return "bg-red-500";
  }
}

function statusBadge(status: BatchCall["status"]) {
  switch (status) {
    case "completed":
      return {
        label: "Fullfort",
        cls: "bg-emerald-500/10 text-emerald-700 border-emerald-500/20",
      };
    case "partial":
      return {
        label: "Delvis",
        cls: "bg-amber-500/10 text-amber-700 border-amber-500/20",
      };
    case "rejected":
      return {
        label: "Avvist",
        cls: "bg-red-500/10 text-red-700 border-red-500/20",
      };
  }
}

function clusterFitBadge(fit: "HIGH" | "PARTIAL" | "NONE") {
  switch (fit) {
    case "HIGH":
      return "border-emerald-500/20 bg-emerald-500/10 text-emerald-700";
    case "PARTIAL":
      return "border-amber-500/20 bg-amber-500/10 text-amber-700";
    case "NONE":
      return "border-red-500/20 bg-red-500/10 text-red-700";
  }
}

const MODEL_COLORS = [
  CHART_COLORS.primaryLight,
  CHART_COLORS.secondary,
  CHART_COLORS.primary,
];

// ── Component ──────────────────────────────────────────────

export function TabBatcher() {
  const [expandedBatchId, setExpandedBatchId] = useState<string | null>(null);

  // ── Donut chart: model usage ──
  const donutOptions = useMemo(() => {
    const totalCalls = CIRI_MODEL_USAGE.reduce((s, m) => s + m.calls, 0);

    return {
      theme: ciriChartTheme,
      height: 200,
      data: CIRI_MODEL_USAGE.map((m) => ({ model: m.model, calls: m.calls })),
      series: [
        {
          type: "donut" as const,
          angleKey: "calls",
          calloutLabelKey: "model",
          innerRadiusRatio: 0.65,
          fills: MODEL_COLORS,
          strokes: MODEL_COLORS,
          innerLabels: [
            {
              text: String(totalCalls),
              fontSize: 20,
              fontWeight: "bold" as const,
              fontFamily: "'Outfit', sans-serif",
              color: "#1e293b",
            },
            {
              text: "kall",
              fontSize: 11,
              color: "#94a3b8",
            },
          ],
          calloutLabel: { fontSize: 10 },
          tooltip: {
            renderer: ({
              datum,
            }: {
              datum: Record<string, unknown>;
            }) => ({
              content: `${datum.model}: ${datum.calls} kall`,
            }),
          },
        },
      ],
      legend: { enabled: false },
    };
  }, []);

  // ── Combo chart: batch trend ──
  const trendOptions = useMemo(
    () => ({
      theme: ciriChartTheme,
      height: 260,
      data: BATCH_HISTORY,
      series: [
        {
          type: "bar" as const,
          xKey: "date",
          yKey: "approved",
          yName: "Godkjent",
          stacked: true,
          fill: CHART_COLORS.emerald,
          stroke: CHART_COLORS.emerald,
          cornerRadius: 4,
        },
        {
          type: "bar" as const,
          xKey: "date",
          yKey: "flagged",
          yName: "Flagget",
          stacked: true,
          fill: CHART_COLORS.amber,
          stroke: CHART_COLORS.amber,
          cornerRadius: 4,
        },
        {
          type: "line" as const,
          xKey: "date",
          yKey: "approvalRate",
          yName: "Godkjenningsrate (%)",
          stroke: CHART_COLORS.emerald,
          strokeWidth: 2.5,
          marker: {
            fill: CHART_COLORS.emerald,
            stroke: "#ffffff",
            strokeWidth: 2,
            size: 6,
          },
          tooltip: {
            renderer: ({
              datum,
            }: {
              datum: Record<string, unknown>;
            }) => ({
              content: `Godkjenningsrate: ${datum.approvalRate}%`,
            }),
          },
        },
      ],
      axes: [
        {
          type: "category" as const,
          position: "bottom" as const,
          label: { fontSize: 10, color: "#94a3b8" },
        },
        {
          type: "number" as const,
          position: "left" as const,
          label: { fontSize: 10, color: "#94a3b8" },
          title: { text: "Antall", fontSize: 10, color: "#94a3b8" },
          keys: ["approved", "flagged"],
        },
        {
          type: "number" as const,
          position: "right" as const,
          label: {
            fontSize: 10,
            color: "#94a3b8",
            formatter: ({ value }: { value: number }) => `${value}%`,
          },
          title: { text: "Rate", fontSize: 10, color: "#94a3b8" },
          keys: ["approvalRate"],
          min: 0,
          max: 100,
        },
      ],
      legend: {
        position: "bottom" as const,
        item: { label: { fontSize: 10 } },
      },
    }),
    []
  );

  // ── Derived cost stats ──
  const totalModelCost = CIRI_MODEL_USAGE.reduce(
    (s, m) => s + m.totalCost,
    0
  );
  const totalModelCalls = CIRI_MODEL_USAGE.reduce((s, m) => s + m.calls, 0);
  const lastBatchCost = BATCH_CALLS[0].tokenCost;

  return (
    <div className="space-y-5">
      {/* ── Section 1: Batch timeline + Model usage ── */}
      <div className="flex gap-5">
        {/* Left: Batch timeline */}
        <div className="flex-1 rounded-2xl border border-border/60 bg-card overflow-hidden shadow-sm shadow-black/[0.03]">
          {/* Card header */}
          <div className="px-5 py-3.5 border-b bg-gradient-to-r from-muted/30 to-transparent flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div
                className="flex h-7 w-7 items-center justify-center rounded-lg"
                style={{ backgroundColor: `${CHART_COLORS.primary}12` }}
              >
                <LayersIcon
                  className="size-3.5"
                  style={{ color: CHART_COLORS.primary }}
                />
              </div>
              <span className="text-sm font-semibold">Batch-historikk</span>
            </div>
            <span className="inline-flex items-center rounded-full bg-muted/60 px-2.5 py-0.5 text-[10px] font-semibold text-muted-foreground tabular-nums">
              {BATCH_CALLS.length} batcher
            </span>
          </div>

          {/* Timeline batch rows */}
          <div className="px-5 py-4">
            <div className="relative">
              {/* Vertical connector line */}
              <div className="absolute left-[23px] top-8 bottom-8 w-px bg-gradient-to-b from-emerald-400/40 via-border to-border/30" />

              <div className="space-y-1">
                {BATCH_CALLS.map((batch, i) => {
                  const isExpanded = expandedBatchId === batch.id;
                  const approvalRate =
                    batch.totalItems > 0
                      ? Math.round(
                          (batch.approved / batch.totalItems) * 100
                        )
                      : 0;
                  const badge = statusBadge(batch.status);

                  return (
                    <motion.div
                      key={batch.id}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{
                        delay: i * 0.08,
                        duration: 0.3,
                        ease: "easeOut",
                      }}
                      className="relative flex gap-4 py-0.5"
                    >
                      {/* Status node */}
                      <div className="relative z-10 flex size-[46px] shrink-0 items-center justify-center rounded-xl border-2 border-background bg-card shadow-sm">
                        <div
                          className={cn(
                            "size-3 rounded-full",
                            statusDotColor(batch.status)
                          )}
                        />
                      </div>

                      {/* Batch content card */}
                      <div className="flex-1 rounded-2xl border border-border/60 bg-card overflow-hidden shadow-sm shadow-black/[0.03] transition-all duration-200 hover:shadow-md hover:shadow-black/[0.05]">
                        <button
                          onClick={() =>
                            setExpandedBatchId(isExpanded ? null : batch.id)
                          }
                          className="w-full text-left"
                        >
                          {/* Header row */}
                          <div className="px-4 py-3 flex items-center gap-3">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="text-sm font-semibold">
                                {formatDate(batch.timestamp)}
                              </span>
                              <span className="text-[10px] text-muted-foreground/50">
                                {formatTime(batch.timestamp)}
                              </span>
                            </div>
                            <span
                              className={cn(
                                "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold shrink-0",
                                badge.cls
                              )}
                            >
                              {badge.label}
                            </span>
                            <span className="text-[10px] text-muted-foreground/60 shrink-0 tabular-nums">
                              {batch.totalItems} elementer
                            </span>
                            <div className="flex-1" />
                            <ChevronDownIcon
                              className={cn(
                                "size-4 text-muted-foreground/40 shrink-0 transition-transform duration-200",
                                isExpanded && "rotate-180"
                              )}
                            />
                          </div>

                          {/* Stats row */}
                          <div className="px-4 pb-3 flex items-center gap-4">
                            <span className="flex items-center gap-1 text-xs text-emerald-600 font-medium">
                              <CheckCircle2Icon className="size-3" />
                              {batch.approved} godkjent
                            </span>
                            {batch.flagged > 0 && (
                              <span className="flex items-center gap-1 text-xs text-amber-600 font-medium">
                                <AlertTriangleIcon className="size-3" />
                                {batch.flagged} flagget
                              </span>
                            )}
                            <span className="flex items-center gap-1 text-xs text-muted-foreground">
                              <ClockIcon className="size-3" />
                              {(batch.durationMs / 1000).toFixed(1)}s
                            </span>
                            <span className="flex items-center gap-1 text-xs text-muted-foreground font-display tabular-nums">
                              <DollarSignIcon className="size-3" />
                              {batch.tokenCost.toFixed(3)}
                            </span>

                            {/* Mini progress bar */}
                            <div className="flex items-center gap-2 ml-auto">
                              <span className="text-[10px] font-display font-bold tabular-nums text-muted-foreground/60">
                                {approvalRate}%
                              </span>
                              <div className="w-20 h-1.5 rounded-full bg-muted/80 overflow-hidden">
                                <motion.div
                                  initial={{ width: 0 }}
                                  animate={{
                                    width: `${approvalRate}%`,
                                  }}
                                  transition={{
                                    delay: 0.3 + i * 0.08,
                                    duration: 0.6,
                                    ease: "easeOut",
                                  }}
                                  className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400"
                                />
                              </div>
                            </div>
                          </div>
                        </button>

                        {/* Expanded items */}
                        <AnimatePresence>
                          {isExpanded && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{
                                duration: 0.25,
                                ease: "easeInOut",
                              }}
                              className="overflow-hidden"
                            >
                              <div className="px-4 pb-4 pt-1 space-y-2 border-t border-border/40">
                                {batch.items.map((item, itemIdx) => {
                                  const isApproved =
                                    item.outcome === "approved";
                                  return (
                                    <motion.div
                                      key={item.id}
                                      initial={{ opacity: 0, y: 4 }}
                                      animate={{ opacity: 1, y: 0 }}
                                      transition={{
                                        delay: itemIdx * 0.04,
                                        duration: 0.2,
                                      }}
                                      className="rounded-xl border border-border/40 bg-gradient-to-br from-muted/20 to-transparent p-3.5"
                                    >
                                      <div className="flex items-center gap-3 flex-wrap">
                                        {/* Merchant + amount */}
                                        <span className="text-sm font-semibold">
                                          {item.merchantName}
                                        </span>
                                        <span className="text-sm font-display font-bold tabular-nums">
                                          kr{" "}
                                          {Math.abs(
                                            item.amount
                                          ).toLocaleString("nb-NO")}
                                        </span>

                                        {/* Account */}
                                        <span className="text-[11px] text-muted-foreground/60">
                                          {item.account}{" "}
                                          {item.accountLabel}
                                        </span>

                                        {/* Confidence */}
                                        <span className="text-[11px] font-display tabular-nums text-muted-foreground/50">
                                          {(
                                            item.confidenceScore * 100
                                          ).toFixed(0)}
                                          %
                                        </span>

                                        {/* Cluster fit badge */}
                                        <span
                                          className={cn(
                                            "inline-flex items-center rounded-full border px-1.5 py-0.5 text-[10px] font-semibold",
                                            clusterFitBadge(
                                              item.clusterFit
                                            )
                                          )}
                                        >
                                          {item.clusterFit}
                                        </span>

                                        {/* Outcome badge */}
                                        <span
                                          className={cn(
                                            "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold",
                                            isApproved
                                              ? "bg-emerald-500/10 text-emerald-700"
                                              : "bg-amber-500/10 text-amber-700"
                                          )}
                                        >
                                          {isApproved
                                            ? "Godkjent"
                                            : "Flagget"}
                                        </span>
                                      </div>

                                      {/* Ciri reasoning */}
                                      {item.ciriReasoning && (
                                        <div className="mt-2.5 rounded-xl bg-[var(--primary)]/5 border border-[var(--primary)]/10 px-3.5 py-2.5">
                                          <div className="flex items-center gap-1.5 mb-1">
                                            <SparklesIcon className="size-3 text-[var(--primary)]" />
                                            <span className="text-[10px] font-semibold text-[var(--primary)]">
                                              Ciris analyse
                                            </span>
                                          </div>
                                          <p className="text-xs leading-relaxed text-foreground/70">
                                            {item.ciriReasoning}
                                          </p>
                                        </div>
                                      )}
                                    </motion.div>
                                  );
                                })}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Right: Model usage donut + stat cards */}
        <div className="w-[320px] shrink-0 space-y-5">
          {/* Donut card */}
          <div className="rounded-2xl border border-border/60 bg-card overflow-hidden shadow-sm shadow-black/[0.03]">
            {/* Card header */}
            <div className="px-5 py-3.5 border-b bg-gradient-to-r from-muted/30 to-transparent flex items-center gap-2.5">
              <div
                className="flex h-7 w-7 items-center justify-center rounded-lg"
                style={{ backgroundColor: `${CHART_COLORS.secondary}12` }}
              >
                <BrainCircuitIcon
                  className="size-3.5"
                  style={{ color: CHART_COLORS.secondary }}
                />
              </div>
              <span className="text-sm font-semibold">Modellbruk</span>
            </div>

            {/* Donut chart */}
            <div className="px-3 pt-3">
              <AgCharts
                options={donutOptions as unknown as AgChartOptions}
              />
            </div>
          </div>

          {/* Model stat cards */}
          <div className="space-y-2.5">
            {CIRI_MODEL_USAGE.map((m, idx) => {
              const color = MODEL_COLORS[idx];
              const callPct =
                totalModelCalls > 0
                  ? Math.round((m.calls / totalModelCalls) * 100)
                  : 0;

              return (
                <motion.div
                  key={m.model}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    delay: 0.2 + idx * 0.1,
                    duration: 0.3,
                    ease: "easeOut",
                  }}
                  whileHover={{ scale: 1.01 }}
                  className="relative rounded-2xl border border-border/60 bg-gradient-to-br from-card to-muted/10 overflow-hidden shadow-sm shadow-black/[0.03] transition-shadow duration-200 hover:shadow-md hover:shadow-black/[0.05]"
                >
                  {/* Colored accent bar at top */}
                  <div
                    className="h-[3px] w-full"
                    style={{
                      background: `linear-gradient(90deg, ${color}, ${color}60)`,
                    }}
                  />

                  <div className="px-4 py-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-semibold">{m.model}</span>
                      <span
                        className="text-[10px] font-semibold tabular-nums rounded-full px-2 py-0.5"
                        style={{
                          backgroundColor: `${color}14`,
                          color: color,
                        }}
                      >
                        {callPct}%
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
                      <div>
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground/50 font-semibold">
                          Kall
                        </p>
                        <p className="text-sm font-display font-bold tabular-nums">
                          {m.calls}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground/50 font-semibold">
                          Snittid
                        </p>
                        <p className="text-sm font-display font-bold tabular-nums">
                          {m.avgDurationMs >= 1000
                            ? `${(m.avgDurationMs / 1000).toFixed(1)}s`
                            : `${m.avgDurationMs}ms`}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground/50 font-semibold">
                          Kostnad
                        </p>
                        <p className="text-sm font-display font-bold tabular-nums">
                          ${m.totalCost.toFixed(3)}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground/50 font-semibold">
                          Presisjon
                        </p>
                        <p className="text-sm font-display font-bold tabular-nums">
                          {m.accuracy}%
                        </p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Section 2: Batch trend chart ── */}
      <div className="rounded-2xl border border-border/60 bg-card overflow-hidden shadow-sm shadow-black/[0.03]">
        <div className="px-5 py-3.5 border-b bg-gradient-to-r from-muted/30 to-transparent flex items-center gap-2.5">
          <div
            className="flex h-7 w-7 items-center justify-center rounded-lg"
            style={{ backgroundColor: `${CHART_COLORS.emerald}12` }}
          >
            <TrendingUpIcon
              className="size-3.5"
              style={{ color: CHART_COLORS.emerald }}
            />
          </div>
          <span className="text-sm font-semibold">
            Godkjenningsrate per batch
          </span>
        </div>
        <div className="p-4">
          <AgCharts
            options={trendOptions as unknown as AgChartOptions}
          />
        </div>
      </div>

      {/* ── Section 3: Cost overview ── */}
      <div className="rounded-2xl border border-border/60 bg-card overflow-hidden shadow-sm shadow-black/[0.03]">
        <div className="px-5 py-3.5 border-b bg-gradient-to-r from-muted/30 to-transparent flex items-center gap-2.5">
          <div
            className="flex h-7 w-7 items-center justify-center rounded-lg"
            style={{ backgroundColor: `${CHART_COLORS.amber}12` }}
          >
            <DollarSignIcon
              className="size-3.5"
              style={{ color: CHART_COLORS.amber }}
            />
          </div>
          <span className="text-sm font-semibold">Kostnadsoversikt</span>
        </div>

        <div className="p-5 space-y-5">
          {/* Gradient stat cards */}
          <div className="grid grid-cols-3 gap-4">
            {[
              {
                label: "Totalkostnad",
                value: `$${totalModelCost.toFixed(2)}`,
                accent: CHART_COLORS.primary,
                icon: DollarSignIcon,
              },
              {
                label: "Per transaksjon",
                value: "$0.0019",
                accent: CHART_COLORS.emerald,
                icon: ZapIcon,
              },
              {
                label: "Siste batch",
                value: `$${lastBatchCost.toFixed(3)}`,
                accent: CHART_COLORS.secondary,
                icon: ActivityIcon,
              },
            ].map((stat, idx) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  delay: 0.1 + idx * 0.08,
                  duration: 0.3,
                  ease: "easeOut",
                }}
                className="relative rounded-2xl border border-border/60 bg-gradient-to-br from-card to-muted/10 overflow-hidden shadow-sm shadow-black/[0.03]"
              >
                {/* Colored top accent line */}
                <div
                  className="h-[3px] w-full"
                  style={{
                    background: `linear-gradient(90deg, ${stat.accent}, ${stat.accent}40)`,
                  }}
                />
                <div className="px-4 py-3.5">
                  <div className="flex items-center justify-between mb-1.5">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground/50 font-semibold">
                      {stat.label}
                    </p>
                    <div
                      className="flex h-6 w-6 items-center justify-center rounded-md"
                      style={{
                        backgroundColor: `${stat.accent}12`,
                      }}
                    >
                      <stat.icon
                        className="size-3"
                        style={{ color: stat.accent }}
                      />
                    </div>
                  </div>
                  <p className="text-xl font-display font-bold tabular-nums leading-none">
                    {stat.value}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Per-model cost breakdown with gradient bars */}
          <div className="space-y-3.5">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground/50 font-semibold">
              Fordeling per modell
            </p>
            {CIRI_MODEL_USAGE.map((m, idx) => {
              const color = MODEL_COLORS[idx];
              const proportion =
                totalModelCost > 0
                  ? (m.totalCost / totalModelCost) * 100
                  : 0;

              return (
                <div key={m.model} className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2.5">
                      <span
                        className="size-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: color }}
                      />
                      <span className="font-semibold">{m.model}</span>
                      <span className="text-muted-foreground/60 font-display tabular-nums">
                        ${m.totalCost.toFixed(3)}
                      </span>
                    </div>
                    <span className="text-muted-foreground/50 text-[11px]">
                      {m.calls} kall,{" "}
                      {m.avgDurationMs >= 1000
                        ? `${(m.avgDurationMs / 1000).toFixed(1)}s`
                        : `${m.avgDurationMs}ms`}{" "}
                      snitt
                    </span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-muted/50 overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${proportion}%` }}
                      transition={{
                        delay: 0.3 + idx * 0.12,
                        duration: 0.6,
                        ease: "easeOut",
                      }}
                      className="h-full rounded-full"
                      style={{
                        background: `linear-gradient(90deg, ${color}, ${color}90)`,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
