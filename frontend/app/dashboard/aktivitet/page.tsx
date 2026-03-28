"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import {
  ActivityIcon,
  BarChart3Icon,
  ListIcon,
  LayersIcon,
  TrendingUpIcon,
  TrendingDownIcon,
  CheckCircle2Icon,
  AlertTriangleIcon,
  TargetIcon,
  SparklesIcon,
  DollarSignIcon,
  ClockIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import CiriLogo from "@/components/layout/ciri-logo";
import { PIPELINE_STATS, PIPELINE_HEALTH } from "./mock-data";
import dynamic from "next/dynamic";

const TabOversikt = dynamic(
  () =>
    import("./components/tab-oversikt").then((m) => ({
      default: m.TabOversikt,
    })),
  { ssr: false }
);
const TabBeslutninger = dynamic(
  () =>
    import("./components/tab-beslutninger").then((m) => ({
      default: m.TabBeslutninger,
    })),
  { ssr: false }
);
const TabBatcher = dynamic(
  () =>
    import("./components/tab-batcher").then((m) => ({
      default: m.TabBatcher,
    })),
  { ssr: false }
);
const TabInnsikt = dynamic(
  () =>
    import("./components/tab-innsikt").then((m) => ({
      default: m.TabInnsikt,
    })),
  { ssr: false }
);

// ── Animated counter hook ──────────────────────────────────
function useAnimatedValue(target: number, duration = 1200) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    let start: number | null = null;
    let raf: number;
    function step(ts: number) {
      if (!start) start = ts;
      const progress = Math.min((ts - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(eased * target));
      if (progress < 1) raf = requestAnimationFrame(step);
    }
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return value;
}

// ── Types ──────────────────────────────────────────────────
type TabId = "oversikt" | "beslutninger" | "batcher" | "innsikt";

interface SummaryCell {
  icon: typeof ActivityIcon;
  label: string;
  target: number;
  format: (n: number) => string;
  sub: string;
  valueColor: string;
  accentColor: string;
  trend?: number;
}

const SUMMARY_CELLS: SummaryCell[] = [
  {
    icon: ActivityIcon,
    label: "Behandlet",
    target: PIPELINE_STATS.totalTransactions,
    format: (n) => n.toLocaleString("nb-NO"),
    sub: "transaksjoner",
    valueColor: "text-foreground",
    accentColor: "var(--primary)",
    trend: 12,
  },
  {
    icon: CheckCircle2Icon,
    label: "Autopostert",
    target: PIPELINE_STATS.autoPosted,
    format: (n) => String(n),
    sub: `${PIPELINE_HEALTH.overallEfficiency}% av totalt`,
    valueColor: "text-emerald-600",
    accentColor: "#059669",
    trend: 8,
  },
  {
    icon: TargetIcon,
    label: "Snitt konfidens",
    target: 872,
    format: (n) => `${(n / 10).toFixed(1)}%`,
    sub: "gjennomsnitt",
    valueColor: "text-[var(--primary)]",
    accentColor: "var(--primary)",
    trend: 2.1,
  },
  {
    icon: AlertTriangleIcon,
    label: "Overstyringsrate",
    target: 11,
    format: (n) => `${(n / 10).toFixed(1)}%`,
    sub: `${PIPELINE_STATS.userOverrides} totalt`,
    valueColor: "text-amber-600",
    accentColor: "#d97706",
    trend: -0.3,
  },
  {
    icon: DollarSignIcon,
    label: "AI-kostnad",
    target: 235,
    format: (n) => `$${(n / 100).toFixed(2)}`,
    sub: `$${PIPELINE_HEALTH.costPerTransaction}/tx`,
    valueColor: "text-foreground",
    accentColor: "#64748b",
    trend: -5,
  },
];

// ── Animated summary cell ──────────────────────────────────
function SummaryCell({ cell, index }: { cell: SummaryCell; index: number }) {
  const animated = useAnimatedValue(cell.target, 1000 + index * 200);
  const Icon = cell.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.06 + index * 0.04, duration: 0.3 }}
      className="group relative bg-card px-4 py-3.5 transition-all duration-300"
    >
      {/* Hover accent line */}
      <div
        className="absolute inset-x-0 top-0 h-px opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{
          background: `linear-gradient(to right, transparent, ${cell.accentColor}50, transparent)`,
        }}
      />

      <div className="flex items-center gap-1.5">
        <Icon className="size-3 text-muted-foreground/50" />
        <p className="text-[12px] uppercase tracking-wider text-muted-foreground/50 font-semibold">
          {cell.label}
        </p>
      </div>
      <div className="flex items-baseline gap-2 mt-1">
        <p
          className={cn(
            "text-xl font-display font-bold tabular-nums leading-none",
            cell.valueColor
          )}
        >
          {cell.format(animated)}
        </p>
        {cell.trend != null && (
          <span
            className={cn(
              "text-[12px] font-semibold flex items-center gap-0.5",
              cell.trend > 0 ? "text-emerald-600" : "text-amber-600"
            )}
          >
            {cell.trend > 0 ? (
              <TrendingUpIcon className="size-2.5" />
            ) : (
              <TrendingDownIcon className="size-2.5" />
            )}
            {Math.abs(cell.trend)}%
          </span>
        )}
      </div>
      <p className="text-[12px] text-muted-foreground/60 mt-0.5">{cell.sub}</p>
    </motion.div>
  );
}

// ── Main page ──────────────────────────────────────────────
export default function AktivitetPage() {
  const [activeTab, setActiveTab] = useState<TabId>("oversikt");

  const tabs: { id: TabId; label: string; icon: typeof ListIcon }[] = [
    { id: "oversikt", label: "Oversikt", icon: BarChart3Icon },
    { id: "beslutninger", label: "Beslutninger", icon: ListIcon },
    { id: "batcher", label: "Batcher", icon: LayersIcon },
    { id: "innsikt", label: "Innsikt", icon: TrendingUpIcon },
  ];

  return (
    <div className="relative min-h-screen">
      {/* ── Atmospheric background ────────────────────────── */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 left-1/4 h-80 w-[500px] rounded-full bg-[var(--primary)]/[0.03] blur-[120px]" />
        <div className="absolute -top-24 right-1/4 h-60 w-80 rounded-full bg-emerald-500/[0.025] blur-[100px]" />
        <div className="absolute top-1/3 -right-20 h-64 w-64 rounded-full bg-[var(--secondary)]/[0.02] blur-[80px]" />
      </div>

      <div className="relative mx-auto max-w-[1200px] space-y-5 pb-12">
        {/* ── Header ──────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-end justify-between"
        >
          <div>
            <h1 className="font-display text-2xl font-bold tracking-tight">
              Aktivitetsmonitor
            </h1>
            <p className="text-[13px] text-muted-foreground mt-0.5">
              Sanntidsoversikt over Ciris AI-drevne posteringspipeline
            </p>
          </div>
          <div className="flex items-center gap-3">
            {/* Live pulse */}
            <div className="flex items-center gap-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-3 py-1">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
              </span>
              <span className="text-xs font-medium text-emerald-600">
                Sanntid
              </span>
            </div>
            <Badge
              variant="secondary"
              className="border-[var(--primary)]/20 bg-[var(--primary)]/10 text-[var(--primary)]"
            >
              <SparklesIcon className="mr-1 size-3" />
              Pipeline aktiv
            </Badge>
          </div>
        </motion.div>

        {/* ── Summary strip ───────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.04 }}
          className="grid grid-cols-5 gap-px rounded-2xl border border-border/60 bg-border/60 overflow-hidden shadow-sm shadow-black/[0.03]"
        >
          {SUMMARY_CELLS.map((cell, i) => (
            <SummaryCell key={i} cell={cell} index={i} />
          ))}
        </motion.div>

        {/* ── Ciri AI status banner ───────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 }}
          className="flex items-center gap-4 rounded-2xl border border-[var(--primary)]/15 bg-gradient-to-r from-[var(--primary)]/[0.04] via-transparent to-[var(--primary)]/[0.02] px-5 py-3.5"
        >
          <div className="relative shrink-0">
            <CiriLogo size="sm" animated intensity="subtle" />
            <span className="absolute -bottom-0.5 -right-0.5 flex size-2.5">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex size-2.5 rounded-full bg-green-500" />
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] leading-snug">
              <span className="font-medium">
                Ciri behandlet 7 transaksjoner i dag
              </span>{" "}
              — 6 autopostert, 1 flagget for gjennomgang.{" "}
              <span className="text-muted-foreground">
                Neste batch kjører i morgen kl. 06:00.
              </span>
            </p>
          </div>
          <div className="flex items-center gap-5 shrink-0 text-[13px] tabular-nums text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <CheckCircle2Icon className="size-3 text-emerald-500" />
              <span>
                <strong className="text-foreground">6</strong> auto
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <AlertTriangleIcon className="size-3 text-amber-500" />
              <span>
                <strong className="text-foreground">1</strong> flagget
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <ClockIcon className="size-3" />
              <span>14t til batch</span>
            </div>
          </div>
        </motion.div>

        {/* ── Pill-style tab navigation ───────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.12 }}
          className="flex items-center gap-0.5 p-1 rounded-xl bg-muted/40 border border-border/50 w-fit"
        >
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "relative flex items-center gap-1.5 px-4 py-2 text-[13px] font-medium rounded-lg transition-all duration-200",
                  isActive
                    ? "text-foreground"
                    : "text-muted-foreground hover:text-foreground/80"
                )}
              >
                {isActive && (
                  <motion.div
                    layoutId="aktivitet-pill"
                    className="absolute inset-0 rounded-lg bg-card shadow-sm border border-border/60"
                    transition={{
                      type: "spring",
                      stiffness: 500,
                      damping: 30,
                    }}
                  />
                )}
                <span className="relative flex items-center gap-1.5">
                  <Icon className="size-3.5" />
                  {tab.label}
                </span>
              </button>
            );
          })}
        </motion.div>

        {/* ── Tab content ─────────────────────────────────── */}
        <div className="min-h-[400px]">
          {activeTab === "oversikt" && (
            <motion.div
              key="oversikt"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
            >
              <TabOversikt />
            </motion.div>
          )}
          {activeTab === "beslutninger" && (
            <motion.div
              key="beslutninger"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
            >
              <TabBeslutninger />
            </motion.div>
          )}
          {activeTab === "batcher" && (
            <motion.div
              key="batcher"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
            >
              <TabBatcher />
            </motion.div>
          )}
          {activeTab === "innsikt" && (
            <motion.div
              key="innsikt"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
            >
              <TabInnsikt />
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}
