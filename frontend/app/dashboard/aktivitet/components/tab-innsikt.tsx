"use client";

import { useMemo } from "react";
import { AgCharts } from "ag-charts-react";
import type { AgChartOptions } from "ag-charts-community";
import { AllCommunityModule, ModuleRegistry } from "ag-charts-community";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import {
  BarChart3Icon,
  TrendingUpIcon,
  ClockIcon,
  WalletIcon,
  TargetIcon,
  CalendarIcon,
  LayersIcon,
  GaugeIcon,
  ZapIcon,
} from "lucide-react";
import {
  CONFIDENCE_DISTRIBUTION,
  CATEGORY_ACCURACY,
  AUTOMATION_TREND,
  RESPONSE_TIME_DIST,
  DAILY_VOLUME,
  ACCOUNT_DISTRIBUTION,
  PIPELINE_HEALTH,
} from "../mock-data";
import { ciriChartTheme, CHART_COLORS, CHART_PALETTE } from "../chart-theme";

ModuleRegistry.registerModules([AllCommunityModule]);

// ── Bucket color map for confidence distribution ────────
const bucketColors: Record<string, string> = {
  Lav: CHART_COLORS.red,
  Medium: CHART_COLORS.amber,
  "Høy": CHART_COLORS.primaryLight,
  "Svært høy": CHART_COLORS.primary,
};

// ── Response time bar colors (gradient from fast to slow) ──
const RESPONSE_BAR_COLORS = [
  CHART_COLORS.emerald,
  CHART_COLORS.primaryLight,
  CHART_COLORS.primary,
  CHART_COLORS.amber,
  CHART_COLORS.red,
  CHART_COLORS.red,
];

// ── P50 / P95 derivation from cumPct ───────────────────
function findPercentileBucket(
  data: { bucket: string; cumPct: number }[],
  pct: number
): string {
  for (const d of data) {
    if (d.cumPct >= pct) return d.bucket;
  }
  return data[data.length - 1].bucket;
}

// ── Animation variants ─────────────────────────────────
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.06,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] as const },
  },
};

const kpiVariants = {
  hidden: { opacity: 0, y: 8, scale: 0.97 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] as const },
  },
};

// ── KPI card data ──────────────────────────────────────
const KPI_CARDS = [
  {
    label: "Klyngedekning",
    value: `${PIPELINE_HEALTH.clusterCoverage}%`,
    accent: CHART_COLORS.primary,
    icon: LayersIcon,
  },
  {
    label: "Regelmatchrate",
    value: `${PIPELINE_HEALTH.ruleMatchRate}%`,
    accent: CHART_COLORS.blue,
    icon: ZapIcon,
  },
  {
    label: "Snitt svartid",
    value: `${(PIPELINE_HEALTH.avgResponseTime / 1000).toFixed(2)}s`,
    accent: CHART_COLORS.amber,
    icon: ClockIcon,
  },
  {
    label: "Aktive klynger",
    value: "8",
    accent: CHART_COLORS.purple,
    icon: GaugeIcon,
  },
];

// ── Component ────────────────────────────────────────────
export function TabInnsikt() {
  const p50 = findPercentileBucket(RESPONSE_TIME_DIST, 50);
  const p95 = findPercentileBucket(RESPONSE_TIME_DIST, 95);

  // ── Chart 1: Confidence distribution bar chart ────────
  const confidenceOptions = useMemo(
    () =>
      ({
        theme: ciriChartTheme,
        height: 220,
        data: CONFIDENCE_DISTRIBUTION,
        series: [
          {
            type: "bar" as const,
            xKey: "range",
            yKey: "count",
            yName: "Antall",
            cornerRadius: 4,
            formatter: ({
              datum,
            }: {
              datum: Record<string, unknown>;
            }) => ({
              fill:
                bucketColors[datum.bucket as string] ?? CHART_COLORS.slate,
            }),
          },
        ],
        axes: [
          {
            type: "category" as const,
            position: "bottom" as const,
            label: { fontSize: 10 },
          },
          {
            type: "number" as const,
            position: "left" as const,
            label: { fontSize: 10 },
          },
        ],
        legend: { enabled: false },
      }) as unknown as AgChartOptions,
    []
  );

  // ── Chart 2: Automation trend combo chart ─────────────
  const automationOptions = useMemo(
    () =>
      ({
        theme: ciriChartTheme,
        height: 240,
        data: AUTOMATION_TREND,
        series: [
          {
            type: "bar" as const,
            xKey: "week",
            yKey: "autoPosted",
            yName: "Autopostert",
            stacked: true,
            fill: CHART_COLORS.emerald,
            stroke: CHART_COLORS.emerald,
            cornerRadius: 2,
          },
          {
            type: "bar" as const,
            xKey: "week",
            yKey: "suggested",
            yName: "Foreslått",
            stacked: true,
            fill: CHART_COLORS.blue,
            stroke: CHART_COLORS.blue,
            cornerRadius: 2,
          },
          {
            type: "bar" as const,
            xKey: "week",
            yKey: "flagged",
            yName: "Flagget",
            stacked: true,
            fill: CHART_COLORS.amber,
            stroke: CHART_COLORS.amber,
            cornerRadius: 2,
          },
          {
            type: "line" as const,
            xKey: "week",
            yKey: "autoRate",
            yName: "Autograd (%)",
            stroke: CHART_COLORS.primary,
            strokeWidth: 3,
            marker: {
              fill: CHART_COLORS.primary,
              stroke: "#ffffff",
              strokeWidth: 2,
              size: 7,
            },
          },
        ],
        axes: [
          {
            type: "category" as const,
            position: "bottom" as const,
            label: { fontSize: 10 },
          },
          {
            type: "number" as const,
            position: "left" as const,
            label: { fontSize: 10 },
            title: { text: "Antall", fontSize: 10 },
            keys: ["autoPosted", "suggested", "flagged"],
          },
          {
            type: "number" as const,
            position: "right" as const,
            label: {
              fontSize: 10,
              formatter: ({ value }: { value: number }) => `${value}%`,
            },
            title: { text: "Autograd", fontSize: 10 },
            keys: ["autoRate"],
            min: 0,
            max: 50,
          },
        ],
        legend: {
          position: "bottom" as const,
          item: { label: { fontSize: 10 } },
        },
      }) as unknown as AgChartOptions,
    []
  );

  // ── Chart 3: Response time distribution ───────────────
  const responseTimeOptions = useMemo(
    () =>
      ({
        theme: ciriChartTheme,
        height: 200,
        data: RESPONSE_TIME_DIST,
        series: [
          {
            type: "bar" as const,
            xKey: "bucket",
            yKey: "count",
            yName: "Antall",
            cornerRadius: 4,
            formatter: ({
              itemId,
            }: {
              itemId: string;
              datum: Record<string, unknown>;
            }) => ({
              fill:
                RESPONSE_BAR_COLORS[
                  Number(itemId) % RESPONSE_BAR_COLORS.length
                ] ?? CHART_COLORS.primary,
            }),
          },
        ],
        axes: [
          {
            type: "category" as const,
            position: "bottom" as const,
            label: { fontSize: 10 },
          },
          {
            type: "number" as const,
            position: "left" as const,
            label: { fontSize: 10 },
          },
        ],
        legend: { enabled: false },
      }) as unknown as AgChartOptions,
    []
  );

  // ── Chart 4: Daily volume grouped bars ────────────────
  const dailyVolumeOptions = useMemo(
    () =>
      ({
        theme: ciriChartTheme,
        height: 200,
        data: DAILY_VOLUME,
        series: [
          {
            type: "bar" as const,
            xKey: "day",
            yKey: "transactions",
            yName: "Transaksjoner",
            fill: CHART_COLORS.muted,
            stroke: CHART_COLORS.slate,
            cornerRadius: 3,
          },
          {
            type: "bar" as const,
            xKey: "day",
            yKey: "autoPosted",
            yName: "Autopostert",
            fill: CHART_COLORS.emerald,
            stroke: CHART_COLORS.emerald,
            cornerRadius: 3,
          },
        ],
        axes: [
          {
            type: "category" as const,
            position: "bottom" as const,
            label: { fontSize: 10 },
          },
          {
            type: "number" as const,
            position: "left" as const,
            label: { fontSize: 10 },
          },
        ],
        legend: {
          position: "bottom" as const,
          item: { label: { fontSize: 10 } },
        },
      }) as unknown as AgChartOptions,
    []
  );

  // ── Chart 5: Account distribution horizontal bars ─────
  const accountDistOptions = useMemo(
    () =>
      ({
        theme: ciriChartTheme,
        height: 220,
        data: [...ACCOUNT_DISTRIBUTION].sort((a, b) => a.amount - b.amount),
        series: [
          {
            type: "bar" as const,
            direction: "horizontal" as const,
            xKey: "account",
            yKey: "amount",
            yName: "Beløp",
            cornerRadius: 4,
            formatter: ({
              itemId,
            }: {
              itemId: string;
              datum: Record<string, unknown>;
            }) => ({
              fill:
                CHART_PALETTE[
                  Number(itemId) % CHART_PALETTE.length
                ] ?? CHART_COLORS.primary,
            }),
            label: {
              formatter: ({ value }: { value: number }) =>
                `kr ${Math.round(value / 1000)}k`,
              fontSize: 10,
              color: "#ffffff",
            },
          },
        ],
        axes: [
          {
            type: "category" as const,
            position: "left" as const,
            label: { fontSize: 10 },
          },
          {
            type: "number" as const,
            position: "bottom" as const,
            label: {
              fontSize: 10,
              formatter: ({ value }: { value: number }) =>
                `${Math.round(value / 1000)}k`,
            },
          },
        ],
        legend: { enabled: false },
      }) as unknown as AgChartOptions,
    []
  );

  return (
    <motion.div
      className="space-y-5"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* ── KPI Callout Cards ──────────────────────────────── */}
      <motion.div
        className="grid grid-cols-2 lg:grid-cols-4 gap-3"
        variants={containerVariants}
      >
        {KPI_CARDS.map((kpi, i) => {
          const Icon = kpi.icon;
          return (
            <motion.div
              key={kpi.label}
              variants={kpiVariants}
              className="relative rounded-2xl border border-border/60 bg-gradient-to-br from-card to-muted/10 p-4 shadow-sm shadow-black/[0.03] overflow-hidden"
            >
              {/* Top accent line */}
              <div
                className="absolute inset-x-0 top-0 h-[2px]"
                style={{
                  background: `linear-gradient(90deg, ${kpi.accent}, ${kpi.accent}40)`,
                }}
              />
              <div className="flex items-start justify-between">
                <div className="space-y-1.5">
                  <p className="text-2xl font-display font-bold tabular-nums tracking-tight">
                    {kpi.value}
                  </p>
                  <p className="text-[12px] uppercase tracking-wider text-muted-foreground/50 font-semibold">
                    {kpi.label}
                  </p>
                </div>
                <div
                  className="flex h-7 w-7 items-center justify-center rounded-lg"
                  style={{ backgroundColor: `${kpi.accent}12` }}
                >
                  <Icon
                    className="size-3.5"
                    style={{ color: kpi.accent }}
                  />
                </div>
              </div>
            </motion.div>
          );
        })}
      </motion.div>

      {/* ── Row 1: Confidence distribution + Category accuracy ── */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-5">
        {/* Confidence distribution */}
        <motion.div
          variants={itemVariants}
          className="rounded-2xl border border-border/60 bg-card overflow-hidden shadow-sm shadow-black/[0.03]"
        >
          <div className="px-5 py-3.5 border-b bg-gradient-to-r from-muted/30 to-transparent flex items-center gap-2">
            <div
              className="flex h-7 w-7 items-center justify-center rounded-lg"
              style={{ backgroundColor: `${CHART_COLORS.primary}12` }}
            >
              <BarChart3Icon
                className="size-3.5"
                style={{ color: CHART_COLORS.primary }}
              />
            </div>
            <span className="text-sm font-semibold">Konfidensfordeling</span>
          </div>
          <div className="p-3">
            <AgCharts options={confidenceOptions} />
          </div>
        </motion.div>

        {/* Category accuracy */}
        <motion.div
          variants={itemVariants}
          className="rounded-2xl border border-border/60 bg-card overflow-hidden shadow-sm shadow-black/[0.03]"
        >
          <div className="px-5 py-3.5 border-b bg-gradient-to-r from-muted/30 to-transparent flex items-center gap-2">
            <div
              className="flex h-7 w-7 items-center justify-center rounded-lg"
              style={{ backgroundColor: `${CHART_COLORS.emerald}12` }}
            >
              <TargetIcon
                className="size-3.5"
                style={{ color: CHART_COLORS.emerald }}
              />
            </div>
            <span className="text-sm font-semibold">Kontonoyaktighet</span>
          </div>
          <div className="px-4 py-3">
            {/* Header row */}
            <div className="grid grid-cols-[1fr_60px_60px] gap-2 mb-2 px-3">
              <span className="text-[12px] uppercase tracking-wider text-muted-foreground/50 font-semibold">
                Konto
              </span>
              <span className="text-[12px] uppercase tracking-wider text-muted-foreground/50 font-semibold text-right">
                Noyakt.
              </span>
              <span className="text-[12px] uppercase tracking-wider text-muted-foreground/50 font-semibold text-right">
                Totalt
              </span>
            </div>
            <div className="space-y-0.5">
              {CATEGORY_ACCURACY.map((cat, i) => {
                const accColor =
                  cat.accuracy >= 95
                    ? CHART_COLORS.emerald
                    : cat.accuracy >= 85
                      ? CHART_COLORS.amber
                      : CHART_COLORS.red;

                const barGradient =
                  cat.accuracy >= 95
                    ? "from-emerald-500 to-emerald-400"
                    : cat.accuracy >= 85
                      ? "from-amber-500 to-amber-400"
                      : "from-red-500 to-red-400";

                return (
                  <motion.div
                    key={cat.account}
                    initial={{ opacity: 0, x: 6 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.08 + i * 0.03, duration: 0.25 }}
                    className="group hover:bg-muted/20 transition-colors rounded-lg px-3 py-2"
                  >
                    <div className="grid grid-cols-[1fr_60px_60px] gap-2 items-center">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[13px] font-mono text-muted-foreground/70">
                            {cat.account}
                          </span>
                          <span className="text-[12px] font-medium truncate">
                            {cat.label}
                          </span>
                        </div>
                        <div className="mt-1 h-2 rounded-full overflow-hidden bg-muted/30">
                          <motion.div
                            initial={{ scaleX: 0 }}
                            animate={{ scaleX: 1 }}
                            transition={{
                              delay: 0.15 + i * 0.04,
                              duration: 0.5,
                              ease: "easeOut",
                            }}
                            className={cn(
                              "h-full rounded-full origin-left bg-gradient-to-r",
                              barGradient
                            )}
                            style={{ width: `${cat.accuracy}%` }}
                          />
                        </div>
                      </div>
                      <div className="text-right">
                        <span
                          className="text-[13px] font-display font-bold tabular-nums"
                          style={{ color: accColor }}
                        >
                          {cat.accuracy.toFixed(1)}%
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-[12px] tabular-nums text-muted-foreground">
                          {cat.total}
                        </span>
                        {cat.overridden > 0 && (
                          <span className="ml-1 inline-flex bg-amber-500/10 text-amber-600 rounded-full px-2 py-0.5 text-[12px] font-medium tabular-nums">
                            {cat.overridden}
                          </span>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </motion.div>
      </div>

      {/* ── Row 2: Automation trend (full width) ──────────── */}
      <motion.div
        variants={itemVariants}
        className="rounded-2xl border border-border/60 bg-card overflow-hidden shadow-sm shadow-black/[0.03]"
      >
        <div className="px-5 py-3.5 border-b bg-gradient-to-r from-muted/30 to-transparent flex items-center gap-2">
          <div
            className="flex h-7 w-7 items-center justify-center rounded-lg"
            style={{ backgroundColor: `${CHART_COLORS.blue}12` }}
          >
            <TrendingUpIcon
              className="size-3.5"
              style={{ color: CHART_COLORS.blue }}
            />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold">
              Automatiseringsgrad over tid
            </span>
            <span className="text-[13px] text-muted-foreground/60">
              Automatiseringsgraden har okt fra 28% til 42% over 7 uker
            </span>
          </div>
        </div>
        <div className="p-3">
          <AgCharts options={automationOptions} />
        </div>
      </motion.div>

      {/* ── Row 3: Response time + Daily volume ──────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-5">
        {/* Response time distribution */}
        <motion.div
          variants={itemVariants}
          className="rounded-2xl border border-border/60 bg-card overflow-hidden shadow-sm shadow-black/[0.03]"
        >
          <div className="px-5 py-3.5 border-b bg-gradient-to-r from-muted/30 to-transparent flex items-center gap-2">
            <div
              className="flex h-7 w-7 items-center justify-center rounded-lg"
              style={{ backgroundColor: `${CHART_COLORS.amber}12` }}
            >
              <ClockIcon
                className="size-3.5"
                style={{ color: CHART_COLORS.amber }}
              />
            </div>
            <span className="text-sm font-semibold">Svartidsfordeling</span>
          </div>
          <div className="p-3">
            <AgCharts options={responseTimeOptions} />
          </div>
          <div className="flex gap-3 px-5 pb-4">
            <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5">
              <span className="text-[12px] uppercase tracking-wider text-muted-foreground/50 font-semibold">
                P50
              </span>
              <p className="text-sm font-display font-bold text-emerald-600">
                {p50}
              </p>
            </div>
            <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 px-3 py-1.5">
              <span className="text-[12px] uppercase tracking-wider text-muted-foreground/50 font-semibold">
                P95
              </span>
              <p className="text-sm font-display font-bold text-amber-600">
                {p95}
              </p>
            </div>
          </div>
        </motion.div>

        {/* Daily volume */}
        <motion.div
          variants={itemVariants}
          className="rounded-2xl border border-border/60 bg-card overflow-hidden shadow-sm shadow-black/[0.03]"
        >
          <div className="px-5 py-3.5 border-b bg-gradient-to-r from-muted/30 to-transparent flex items-center gap-2">
            <div
              className="flex h-7 w-7 items-center justify-center rounded-lg"
              style={{ backgroundColor: `${CHART_COLORS.slate}12` }}
            >
              <CalendarIcon
                className="size-3.5"
                style={{ color: CHART_COLORS.slate }}
              />
            </div>
            <span className="text-sm font-semibold">Daglig volum</span>
          </div>
          <div className="p-3">
            <AgCharts options={dailyVolumeOptions} />
          </div>
        </motion.div>
      </div>

      {/* ── Row 4: Account distribution (full width) ─────── */}
      <motion.div
        variants={itemVariants}
        className="rounded-2xl border border-border/60 bg-card overflow-hidden shadow-sm shadow-black/[0.03]"
      >
        <div className="px-5 py-3.5 border-b bg-gradient-to-r from-muted/30 to-transparent flex items-center gap-2">
          <div
            className="flex h-7 w-7 items-center justify-center rounded-lg"
            style={{ backgroundColor: `${CHART_COLORS.purple}12` }}
          >
            <WalletIcon
              className="size-3.5"
              style={{ color: CHART_COLORS.purple }}
            />
          </div>
          <span className="text-sm font-semibold">Kontofordeling</span>
        </div>
        <div className="p-3">
          <AgCharts options={accountDistOptions} />
        </div>
      </motion.div>
    </motion.div>
  );
}
