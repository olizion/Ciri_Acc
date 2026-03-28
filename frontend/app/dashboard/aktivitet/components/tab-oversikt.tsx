"use client";

import { useMemo } from "react";
import { AgCharts } from "ag-charts-react";
import type { AgChartOptions } from "ag-charts-community";
import { AllCommunityModule, ModuleRegistry } from "ag-charts-community";
import { motion } from "framer-motion";
import {
  LayersIcon,
  BrainCircuitIcon,
  ArrowRightIcon,
  CheckCircle2Icon,
  AlertTriangleIcon,
  ShieldCheckIcon,
  ActivityIcon,
  PieChartIcon,
  UserIcon,
  SparklesIcon,
  ZapIcon,
  FilterIcon,
  TargetIcon,
  TrendingUpIcon,
} from "lucide-react";
import {
  PIPELINE_STATS,
  PIPELINE_HEALTH,
  PHASE_FUNNEL,
  OUTCOME_DISTRIBUTION,
  ACTIVITY_TIMELINE,
} from "../mock-data";
import type { ActivityEvent } from "../mock-data";
import { ciriChartTheme, CHART_COLORS } from "../chart-theme";

ModuleRegistry.registerModules([AllCommunityModule]);

// ── Radial Gauge ─────────────────────────────────────────
function RadialGauge({
  value,
  max,
  color,
  size = 120,
  strokeWidth = 8,
}: {
  value: number;
  max: number;
  color: string;
  size?: number;
  strokeWidth?: number;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const pct = value / max;
  const dashOffset = circumference * (1 - pct);

  return (
    <svg width={size} height={size} className="transform -rotate-90">
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        className="text-muted/30"
      />
      <motion.circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={circumference}
        initial={{ strokeDashoffset: circumference }}
        animate={{ strokeDashoffset: dashOffset }}
        transition={{ duration: 1.5, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
      />
    </svg>
  );
}

// ── Animated counter ─────────────────────────────────────
function AnimatedNumber({
  value,
  suffix = "",
  decimals = 0,
  className,
}: {
  value: number;
  suffix?: string;
  decimals?: number;
  className?: string;
}) {
  return (
    <motion.span
      className={className}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.6 }}
    >
      {value.toFixed(decimals)}
      {suffix}
    </motion.span>
  );
}

// ── Phase pipeline icons ─────────────────────────────────
const PHASE_ICONS = [LayersIcon, FilterIcon, TargetIcon, CheckCircle2Icon];
const PHASE_COLORS = [
  CHART_COLORS.slate,
  CHART_COLORS.blue,
  CHART_COLORS.primary,
  CHART_COLORS.emerald,
];

// ── Metric mini-card data ────────────────────────────────
interface MetricCard {
  label: string;
  value: string;
  pct: number;
  color: string;
  icon: typeof CheckCircle2Icon;
  subtitle: string;
}

const METRIC_CARDS: MetricCard[] = [
  {
    label: "Autopostert",
    value: "461",
    pct: 37,
    color: CHART_COLORS.emerald,
    icon: CheckCircle2Icon,
    subtitle: "av 1 247 trans.",
  },
  {
    label: "Foreslatt",
    value: "258",
    pct: 21,
    color: CHART_COLORS.blue,
    icon: SparklesIcon,
    subtitle: "venter bruker",
  },
  {
    label: "Regelfiltrert",
    value: "355",
    pct: 28,
    color: CHART_COLORS.primary,
    icon: ShieldCheckIcon,
    subtitle: "ignorert via regler",
  },
  {
    label: "Flagget",
    value: "26",
    pct: 2,
    color: CHART_COLORS.amber,
    icon: AlertTriangleIcon,
    subtitle: "trenger gjennomgang",
  },
  {
    label: "Overstyrt",
    value: "14",
    pct: 1,
    color: CHART_COLORS.purple,
    icon: UserIcon,
    subtitle: "bruker endret konto",
  },
  {
    label: "AI godkj.rate",
    value: "94.7%",
    pct: 95,
    color: CHART_COLORS.emerald,
    icon: BrainCircuitIcon,
    subtitle: "Fase 3 presisjon",
  },
];

// ── Event type colors ────────────────────────────────────
const EVENT_TYPE_COLORS: Record<ActivityEvent["type"], string> = {
  batch_complete: CHART_COLORS.primary,
  rule_fired: CHART_COLORS.amber,
  user_override: CHART_COLORS.purple,
  cluster_update: CHART_COLORS.blue,
  bilag_posted: CHART_COLORS.emerald,
  match_suggested: "#ea580c",
  surveillance_sweep: CHART_COLORS.slate,
  batch_scheduled: CHART_COLORS.slate,
  mva_deadline: CHART_COLORS.red,
};

// ── Time formatter ───────────────────────────────────────
function formatTimeAgo(timestamp: string): string {
  const diff = Date.now() - new Date(timestamp).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m siden`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}t siden`;
  const days = Math.floor(hours / 24);
  return `${days}d siden`;
}

// ── Gauge card config ────────────────────────────────────
const GAUGE_CARDS = [
  {
    label: "Automatiseringsgrad",
    value: PIPELINE_HEALTH.overallEfficiency,
    max: 100,
    color: CHART_COLORS.emerald,
    subtitle: "autopostert",
    detail: `${PIPELINE_STATS.autoPosted} av ${PIPELINE_STATS.totalTransactions.toLocaleString("nb-NO")} transaksjoner`,
    icon: ZapIcon,
  },
  {
    label: "AI-noyaktighet",
    value: PIPELINE_HEALTH.aiApprovalRate,
    max: 100,
    color: CHART_COLORS.primary,
    subtitle: "godkjenningsrate",
    detail: `${PIPELINE_STATS.phase3Approved} av ${PIPELINE_STATS.phase3Queued} i Fase 3`,
    icon: BrainCircuitIcon,
  },
  {
    label: "Snitt konfidens",
    value: PIPELINE_HEALTH.avgConfidence,
    max: 100,
    color: CHART_COLORS.blue,
    subtitle: "gjennomsnittlig score",
    detail: `${PIPELINE_HEALTH.clusterCoverage}% klyngedekning`,
    icon: TrendingUpIcon,
  },
];

// ── Component ────────────────────────────────────────────
export function TabOversikt() {
  const total = PIPELINE_STATS.totalTransactions;

  // Phase conversion rates
  const phaseRates = [
    100,
    (PIPELINE_STATS.phase1Passed / total) * 100,
    (PIPELINE_STATS.phase2Passed / PIPELINE_STATS.phase1Passed) * 100,
    (PIPELINE_STATS.phase3Approved / PIPELINE_STATS.phase3Queued) * 100,
  ];

  // ── Outcome donut chart ────────────────────────────────
  const outcomeTotal = OUTCOME_DISTRIBUTION.reduce(
    (sum, d) => sum + d.value,
    0
  );
  const OUTCOME_FILLS = [
    CHART_COLORS.emerald,
    CHART_COLORS.blue,
    CHART_COLORS.primary,
    CHART_COLORS.amber,
    CHART_COLORS.purple,
  ];

  const outcomeOptions = useMemo(
    () =>
      ({
        theme: ciriChartTheme,
        height: 280,
        data: OUTCOME_DISTRIBUTION,
        series: [
          {
            type: "donut" as const,
            angleKey: "value",
            calloutLabelKey: "name",
            innerRadiusRatio: 0.65,
            fills: OUTCOME_FILLS,
            strokes: OUTCOME_FILLS,
            strokeWidth: 0,
            calloutLabel: {
              fontSize: 10,
              color: "#64748b",
            },
            sectorLabel: {
              formatter: ({ value }: { value: number }) =>
                `${((value / outcomeTotal) * 100).toFixed(0)}%`,
              fontSize: 10,
              color: "#ffffff",
            },
            innerLabels: [
              {
                text: outcomeTotal.toLocaleString("nb-NO"),
                fontSize: 24,
                fontWeight: "bold" as const,
                fontFamily: "'Hedvig Letters Serif', serif",
                color: "#1e293b",
              },
              {
                text: "totalt",
                fontSize: 11,
                color: "#64748b",
                spacing: 2,
              },
            ],
            tooltip: {
              renderer: ({
                datum,
              }: {
                datum: Record<string, unknown>;
              }) => ({
                content: `${datum.name}: ${(datum.value as number).toLocaleString("nb-NO")} (${(((datum.value as number) / outcomeTotal) * 100).toFixed(1)}%)`,
              }),
            },
          },
        ],
      }) as unknown as AgChartOptions,
    [outcomeTotal]
  );

  // ── Recent events (non-planned, first 7) ────────────────
  const recentEvents = ACTIVITY_TIMELINE.filter((e) => !e.planned).slice(0, 7);

  return (
    <div className="space-y-5">
      {/* ═══ Section 1: Hero KPI Gauges ═══════════════════════ */}
      <div className="grid grid-cols-3 gap-4">
        {GAUGE_CARDS.map((gauge, i) => {
          const Icon = gauge.icon;
          return (
            <motion.div
              key={gauge.label}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.45,
                delay: i * 0.08,
                ease: [0.22, 1, 0.36, 1],
              }}
              className="rounded-2xl border border-border/60 bg-card overflow-hidden shadow-sm shadow-black/[0.03]"
            >
              {/* Card header */}
              <div className="px-5 py-3.5 border-b bg-gradient-to-r from-muted/30 to-transparent flex items-center gap-2.5">
                <div
                  className="flex h-7 w-7 items-center justify-center rounded-lg"
                  style={{ backgroundColor: `${gauge.color}12` }}
                >
                  <Icon
                    className="size-3.5"
                    style={{ color: gauge.color }}
                  />
                </div>
                <span className="text-[12px] uppercase tracking-wider text-muted-foreground/50 font-semibold">
                  {gauge.label}
                </span>
              </div>

              {/* Gauge body */}
              <div className="px-5 py-5 flex flex-col items-center">
                {/* Radial ring with centered text overlay */}
                <div className="relative flex items-center justify-center">
                  <RadialGauge
                    value={gauge.value}
                    max={gauge.max}
                    color={gauge.color}
                    size={130}
                    strokeWidth={10}
                  />
                  {/* Percentage overlay — positioned on top, upright */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <AnimatedNumber
                      value={gauge.value}
                      suffix="%"
                      decimals={1}
                      className="text-2xl font-display font-bold tabular-nums"
                    />
                    <span className="text-[13px] text-muted-foreground/60 mt-0.5">
                      {gauge.subtitle}
                    </span>
                  </div>
                </div>

                {/* Detail line + mini progress */}
                <div className="w-full mt-4 space-y-2">
                  <p className="text-[13px] text-muted-foreground text-center">
                    {gauge.detail}
                  </p>
                  <div className="h-1.5 rounded-full bg-muted/40 overflow-hidden">
                    <motion.div
                      initial={{ scaleX: 0 }}
                      animate={{ scaleX: 1 }}
                      transition={{
                        delay: 0.5 + i * 0.1,
                        duration: 0.8,
                        ease: [0.22, 1, 0.36, 1],
                      }}
                      className="h-full rounded-full origin-left"
                      style={{
                        width: `${gauge.value}%`,
                        background: `linear-gradient(90deg, ${gauge.color}80, ${gauge.color})`,
                      }}
                    />
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[13px] text-muted-foreground/40 tabular-nums">
                      0%
                    </span>
                    <span
                      className="text-[13px] font-semibold tabular-nums"
                      style={{ color: gauge.color }}
                    >
                      {gauge.value.toFixed(1)}%
                    </span>
                    <span className="text-[13px] text-muted-foreground/40 tabular-nums">
                      100%
                    </span>
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* ═══ Section 2: Pipeline Phase Flow ═══════════════════ */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.25 }}
        className="rounded-2xl border border-border/60 bg-card overflow-hidden shadow-sm shadow-black/[0.03]"
      >
        <div className="px-5 py-3.5 border-b bg-gradient-to-r from-muted/30 to-transparent flex items-center gap-2.5">
          <div
            className="flex h-7 w-7 items-center justify-center rounded-lg"
            style={{ backgroundColor: `${CHART_COLORS.primary}12` }}
          >
            <LayersIcon
              className="size-3.5"
              style={{ color: CHART_COLORS.primary }}
            />
          </div>
          <span className="text-sm font-semibold">Pipeline-gjennomstromning</span>
          <span className="ml-auto text-[12px] text-muted-foreground/50 tabular-nums">
            {total.toLocaleString("nb-NO")} transaksjoner totalt
          </span>
        </div>

        <div className="px-5 py-5">
          {/* Horizontal phase flow */}
          <div className="flex items-center gap-0">
            {PHASE_FUNNEL.map((phase, i) => {
              const PhaseIcon = PHASE_ICONS[i];
              const convRate = phaseRates[i];
              const isLast = i === PHASE_FUNNEL.length - 1;

              return (
                <div key={phase.phase} className="flex items-center flex-1 min-w-0">
                  {/* Phase node card */}
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    whileHover={{ scale: 1.03 }}
                    transition={{
                      duration: 0.35,
                      delay: 0.3 + i * 0.1,
                      ease: [0.22, 1, 0.36, 1],
                    }}
                    className="flex-1 rounded-xl border border-border/40 bg-gradient-to-br from-card to-muted/10 p-3.5 min-w-0"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <div
                        className="flex h-6 w-6 items-center justify-center rounded-md shrink-0"
                        style={{ backgroundColor: `${PHASE_COLORS[i]}15` }}
                      >
                        <PhaseIcon
                          className="size-3"
                          style={{ color: PHASE_COLORS[i] }}
                        />
                      </div>
                      <span className="text-[12px] text-muted-foreground/60 font-medium truncate">
                        {phase.phase}
                      </span>
                    </div>

                    <div className="flex items-baseline gap-1.5">
                      <span className="text-lg font-display font-bold tabular-nums">
                        {phase.count.toLocaleString("nb-NO")}
                      </span>
                      {i > 0 && (
                        <span
                          className="text-[12px] font-semibold tabular-nums"
                          style={{ color: PHASE_COLORS[i] }}
                        >
                          {convRate.toFixed(0)}%
                        </span>
                      )}
                    </div>

                    {/* Mini progress bar */}
                    <div className="h-1 rounded-full bg-muted/40 overflow-hidden mt-2">
                      <motion.div
                        initial={{ scaleX: 0 }}
                        animate={{ scaleX: 1 }}
                        transition={{
                          delay: 0.4 + i * 0.12,
                          duration: 0.6,
                          ease: "easeOut",
                        }}
                        className="h-full rounded-full origin-left"
                        style={{
                          width: `${(phase.count / total) * 100}%`,
                          backgroundColor: PHASE_COLORS[i],
                        }}
                      />
                    </div>
                  </motion.div>

                  {/* Connector arrow (except after last) */}
                  {!isLast && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.5 + i * 0.1, duration: 0.3 }}
                      className="flex items-center px-1.5 shrink-0"
                    >
                      <div className="w-4 border-t border-dashed border-border/60" />
                      <ArrowRightIcon className="size-3 text-muted-foreground/40 -ml-0.5" />
                    </motion.div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Summary strip */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8, duration: 0.4 }}
            className="mt-4 pt-3 border-t border-border/40 flex items-center justify-between"
          >
            <div className="flex items-center gap-4">
              {PHASE_FUNNEL.slice(1).map((phase, i) => (
                <div key={phase.phase} className="flex items-center gap-1.5">
                  <div
                    className="size-1.5 rounded-full"
                    style={{ backgroundColor: PHASE_COLORS[i + 1] }}
                  />
                  <span className="text-[12px] text-muted-foreground">
                    {phase.phase.split(" ")[0]}{" "}
                    <span className="font-semibold tabular-nums">
                      {phaseRates[i + 1].toFixed(1)}%
                    </span>
                  </span>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2Icon className="size-3" style={{ color: CHART_COLORS.emerald }} />
              <span className="text-[13px] font-medium">
                <span className="font-display font-bold tabular-nums" style={{ color: CHART_COLORS.emerald }}>
                  {PIPELINE_STATS.autoPosted}
                </span>
                <span className="text-muted-foreground ml-1">bokfort</span>
              </span>
            </div>
          </motion.div>
        </div>
      </motion.div>

      {/* ═══ Section 3: 6 Metric Mini-Cards ═══════════════════ */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.35 }}
        className="grid grid-cols-3 lg:grid-cols-6 gap-3"
      >
        {METRIC_CARDS.map((card, i) => {
          const Icon = card.icon;
          return (
            <motion.div
              key={card.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              whileHover={{ scale: 1.02 }}
              transition={{ delay: 0.4 + i * 0.04, duration: 0.3 }}
              className="rounded-2xl border border-border/60 bg-gradient-to-br from-card to-muted/10 overflow-hidden shadow-sm shadow-black/[0.03] cursor-default"
              style={{ borderLeftColor: card.color, borderLeftWidth: 3 }}
            >
              <div className="p-3.5">
                {/* Icon + label row */}
                <div className="flex items-center gap-1.5 mb-2">
                  <div
                    className="flex h-5 w-5 items-center justify-center rounded-md shrink-0"
                    style={{ backgroundColor: `${card.color}12` }}
                  >
                    <Icon
                      className="size-2.5"
                      style={{ color: card.color }}
                    />
                  </div>
                  <span className="text-[12px] uppercase tracking-wider text-muted-foreground/50 font-semibold truncate">
                    {card.label}
                  </span>
                </div>

                {/* Value */}
                <p className="text-xl font-display font-bold tabular-nums leading-none mb-1">
                  {card.value}
                </p>
                <p className="text-[12px] text-muted-foreground/50 mb-2.5">
                  {card.subtitle}
                </p>

                {/* Gradient progress bar */}
                <div className="h-1.5 rounded-full bg-muted/40 overflow-hidden">
                  <motion.div
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: 1 }}
                    transition={{
                      delay: 0.5 + i * 0.06,
                      duration: 0.6,
                      ease: [0.22, 1, 0.36, 1],
                    }}
                    className="h-full rounded-full origin-left"
                    style={{
                      width: `${card.pct}%`,
                      background: `linear-gradient(90deg, ${card.color}60, ${card.color})`,
                    }}
                  />
                </div>
              </div>
            </motion.div>
          );
        })}
      </motion.div>

      {/* ═══ Section 4: Outcome Donut + Activity Feed ═════════ */}
      <div className="flex gap-4">
        {/* Left: Outcome donut */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.45 }}
          className="flex-1 rounded-2xl border border-border/60 bg-card overflow-hidden shadow-sm shadow-black/[0.03]"
        >
          <div className="px-5 py-3.5 border-b bg-gradient-to-r from-muted/30 to-transparent flex items-center gap-2.5">
            <div
              className="flex h-7 w-7 items-center justify-center rounded-lg"
              style={{ backgroundColor: `${CHART_COLORS.secondary}12` }}
            >
              <PieChartIcon
                className="size-3.5"
                style={{ color: CHART_COLORS.secondary }}
              />
            </div>
            <span className="text-sm font-semibold">Utfallsfordeling</span>
          </div>
          <div className="p-3">
            <AgCharts options={outcomeOptions} />
          </div>
        </motion.div>

        {/* Right: Activity feed with timeline */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.5 }}
          className="w-[380px] rounded-2xl border border-border/60 bg-card overflow-hidden shadow-sm shadow-black/[0.03] shrink-0 flex flex-col"
        >
          <div className="px-5 py-3.5 border-b bg-gradient-to-r from-muted/30 to-transparent flex items-center gap-2.5">
            <div
              className="flex h-7 w-7 items-center justify-center rounded-lg"
              style={{ backgroundColor: `${CHART_COLORS.slate}12` }}
            >
              <ActivityIcon
                className="size-3.5"
                style={{ color: CHART_COLORS.slate }}
              />
            </div>
            <span className="text-sm font-semibold">Siste hendelser</span>
            <span className="ml-auto text-[12px] text-muted-foreground/40 tabular-nums">
              siste 7 dager
            </span>
          </div>

          <div className="px-4 py-2 flex-1 overflow-hidden">
            {recentEvents.map((event, i) => {
              const dotColor = EVENT_TYPE_COLORS[event.type];
              const isLast = i === recentEvents.length - 1;

              return (
                <motion.div
                  key={event.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.55 + i * 0.05, duration: 0.3 }}
                  className="relative flex items-start gap-3 py-2.5 group"
                >
                  {/* Timeline connector line */}
                  {!isLast && (
                    <div
                      className="absolute left-[9px] top-[22px] bottom-0 w-px"
                      style={{
                        background: `linear-gradient(to bottom, ${dotColor}40, ${dotColor}10)`,
                      }}
                    />
                  )}

                  {/* Timeline dot */}
                  <div
                    className="relative z-10 mt-1.5 size-[18px] rounded-full border-2 border-background flex items-center justify-center shrink-0"
                    style={{ backgroundColor: `${dotColor}20` }}
                  >
                    <div
                      className="size-2 rounded-full"
                      style={{ backgroundColor: dotColor }}
                    />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium leading-tight truncate group-hover:text-foreground transition-colors">
                      {event.title}
                    </p>
                    <p className="text-[13px] text-muted-foreground/50 mt-0.5 truncate">
                      {event.description.length > 60
                        ? event.description.slice(0, 60) + "..."
                        : event.description}
                    </p>
                    <p className="text-[12px] tabular-nums text-muted-foreground/40 mt-1">
                      {formatTimeAgo(event.timestamp)}
                    </p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
