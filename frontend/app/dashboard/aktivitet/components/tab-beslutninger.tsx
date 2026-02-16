"use client";

import { useState } from "react";
import { motion, AnimatePresence, LayoutGroup } from "framer-motion";
import { cn } from "@/lib/utils";
import { CHART_COLORS } from "../chart-theme";
import {
  RECENT_DECISIONS,
  type Decision,
  type DecisionOutcome,
} from "../mock-data";
import {
  CheckCircle2Icon,
  AlertTriangleIcon,
  EyeIcon,
  MinusCircleIcon,
  RefreshCwIcon,
  ChevronDownIcon,
  SparklesIcon,
  ShieldCheckIcon,
  FilterIcon,
} from "lucide-react";

// ── Outcome configuration ────────────────────────────────

const outcomeConfig: Record<
  DecisionOutcome,
  { label: string; color: string; icon: typeof CheckCircle2Icon }
> = {
  auto_posted: {
    label: "Auto",
    color: CHART_COLORS.emerald,
    icon: CheckCircle2Icon,
  },
  suggested: {
    label: "Foreslatt",
    color: CHART_COLORS.blue,
    icon: EyeIcon,
  },
  flagged: {
    label: "Flagget",
    color: CHART_COLORS.amber,
    icon: AlertTriangleIcon,
  },
  ignored: {
    label: "Ignorert",
    color: CHART_COLORS.slate,
    icon: MinusCircleIcon,
  },
  overridden: {
    label: "Overstyrt",
    color: CHART_COLORS.purple,
    icon: RefreshCwIcon,
  },
};

// ── Filter chip definitions ──────────────────────────────

type FilterKey = DecisionOutcome | "all";

interface FilterChipDef {
  key: FilterKey;
  label: string;
  dotColor?: string;
}

const filterChips: FilterChipDef[] = [
  { key: "all", label: "Alle" },
  { key: "auto_posted", label: "Autopostert", dotColor: CHART_COLORS.emerald },
  { key: "suggested", label: "Foreslatt", dotColor: CHART_COLORS.blue },
  { key: "flagged", label: "Flagget", dotColor: CHART_COLORS.amber },
  { key: "ignored", label: "Ignorert", dotColor: CHART_COLORS.slate },
  { key: "overridden", label: "Overstyrt", dotColor: CHART_COLORS.purple },
];

// ── Helpers ──────────────────────────────────────────────

function countByOutcome(outcome: DecisionOutcome): number {
  return RECENT_DECISIONS.filter((d) => d.outcome === outcome).length;
}

function formatAmount(amount: number): string {
  const abs = Math.abs(amount);
  return `kr ${abs.toLocaleString("nb-NO")}`;
}

function confidenceColor(score: number): string {
  if (score >= 0.8) return CHART_COLORS.emerald;
  if (score >= 0.6) return CHART_COLORS.amber;
  return CHART_COLORS.red;
}

function clusterFitLabel(fit: "HIGH" | "PARTIAL" | "NONE"): {
  text: string;
  color: string;
} {
  switch (fit) {
    case "HIGH":
      return { text: "Hoy", color: CHART_COLORS.emerald };
    case "PARTIAL":
      return { text: "Delvis", color: CHART_COLORS.amber };
    case "NONE":
      return { text: "Ingen", color: CHART_COLORS.red };
  }
}

// ── Mini radial gauge ────────────────────────────────────

function MiniGauge({ value, color }: { value: number; color: string }) {
  const r = 7;
  const circ = 2 * Math.PI * r;
  return (
    <div className="flex items-center gap-1.5">
      <svg width="20" height="20" className="-rotate-90">
        <circle
          cx="10"
          cy="10"
          r={r}
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          className="text-muted/30"
        />
        <circle
          cx="10"
          cy="10"
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={circ * (1 - value)}
        />
      </svg>
      <span
        className="text-[12px] font-display font-medium tabular-nums"
        style={{ color }}
      >
        {Math.round(value * 100)}%
      </span>
    </div>
  );
}

// ── Phase progress bar ───────────────────────────────────

function PhaseBar({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className="flex-1">
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-[11px] text-muted-foreground">{label}</span>
        <span
          className="text-[11px] font-medium font-display tabular-nums"
          style={{ color }}
        >
          {Math.round(value * 100)}%
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-muted/40">
        <motion.div
          className="h-full rounded-full"
          style={{
            background: `linear-gradient(90deg, ${color}cc, ${color})`,
          }}
          initial={{ width: 0 }}
          animate={{ width: `${value * 100}%` }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        />
      </div>
    </div>
  );
}

// ── Metadata chip ────────────────────────────────────────

function MetaChip({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color?: string;
}) {
  return (
    <div className="flex items-center gap-1.5 bg-card border border-border/50 rounded-lg px-3 py-1.5 shadow-sm">
      <span className="text-[10px] uppercase tracking-wider text-muted-foreground/50 font-semibold">
        {label}
      </span>
      <span
        className="text-[11px] font-medium"
        style={color ? { color } : undefined}
      >
        {value}
      </span>
    </div>
  );
}

// ── Column headers ───────────────────────────────────────

function ColumnHeaders() {
  return (
    <div className="grid grid-cols-[1fr_100px_120px_80px_80px_24px] items-center gap-2 px-5 py-2 border-b border-border/30">
      <span className="text-[10px] uppercase tracking-wider text-muted-foreground/50 font-semibold">
        Leverandor
      </span>
      <span className="text-[10px] uppercase tracking-wider text-muted-foreground/50 font-semibold text-right">
        Belop
      </span>
      <span className="text-[10px] uppercase tracking-wider text-muted-foreground/50 font-semibold">
        Konto
      </span>
      <span className="text-[10px] uppercase tracking-wider text-muted-foreground/50 font-semibold text-right">
        Konfidens
      </span>
      <span className="text-[10px] uppercase tracking-wider text-muted-foreground/50 font-semibold text-right">
        Utfall
      </span>
      <span />
    </div>
  );
}

// ── Main component ───────────────────────────────────────

export function TabBeslutninger() {
  const [activeFilter, setActiveFilter] = useState<FilterKey>("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filtered: Decision[] =
    activeFilter === "all"
      ? RECENT_DECISIONS
      : RECENT_DECISIONS.filter((d) => d.outcome === activeFilter);

  // Outcome counts for summary
  const outcomeCounts: Record<DecisionOutcome, number> = {
    auto_posted: 0,
    suggested: 0,
    flagged: 0,
    ignored: 0,
    overridden: 0,
  };
  for (const d of filtered) {
    outcomeCounts[d.outcome]++;
  }

  return (
    <div className="space-y-4">
      {/* ── Filter chips bar ─────────────────────────────── */}
      <LayoutGroup>
        <div className="flex flex-wrap gap-2">
          {filterChips.map((chip) => {
            const isActive = activeFilter === chip.key;
            const count =
              chip.key === "all"
                ? RECENT_DECISIONS.length
                : countByOutcome(chip.key);

            return (
              <motion.button
                key={chip.key}
                layout
                onClick={() => {
                  setActiveFilter(chip.key);
                  setExpandedId(null);
                }}
                className={cn(
                  "relative inline-flex items-center gap-1.5 rounded-full border border-border/50 px-3.5 py-1.5 text-[12px] font-medium transition-all duration-200",
                  isActive
                    ? "bg-card shadow-sm border-[var(--primary)]/30 text-[var(--primary)]"
                    : "bg-transparent hover:bg-muted/30"
                )}
                whileTap={{ scale: 0.97 }}
              >
                {/* Subtle glow ring on active */}
                {isActive && (
                  <motion.span
                    layoutId="filter-glow"
                    className="absolute inset-0 rounded-full ring-2 ring-[var(--primary)]/10"
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
                {chip.dotColor && (
                  <span
                    className="size-1.5 rounded-full shrink-0"
                    style={{ backgroundColor: chip.dotColor }}
                  />
                )}
                <span className="relative">{chip.label}</span>
                <span className="ml-0.5 opacity-50 tabular-nums relative">
                  ({count})
                </span>
              </motion.button>
            );
          })}
        </div>
      </LayoutGroup>

      {/* ── Decision table card ──────────────────────────── */}
      <div className="rounded-2xl border border-border/60 bg-card overflow-hidden shadow-sm shadow-black/[0.03]">
        {/* Card header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b bg-gradient-to-r from-muted/30 to-transparent">
          <div className="flex items-center gap-2">
            <FilterIcon className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-[13px] font-semibold">Beslutninger</span>
          </div>
          <span className="rounded-full bg-muted/50 px-2.5 py-0.5 text-[11px] font-medium tabular-nums text-muted-foreground">
            {filtered.length}
          </span>
        </div>

        {/* Column header row */}
        <ColumnHeaders />

        {/* Decision rows */}
        <div className="divide-y divide-border/30">
          {filtered.length === 0 && (
            <div className="px-5 py-10 text-center text-sm text-muted-foreground">
              Ingen beslutninger med dette filteret.
            </div>
          )}

          <AnimatePresence mode="popLayout">
            {filtered.map((decision, i) => {
              const config = outcomeConfig[decision.outcome];
              const OutcomeIcon = config.icon;
              const isExpanded = expandedId === decision.id;
              const confColor = confidenceColor(decision.confidenceScore);
              const clusterInfo = clusterFitLabel(decision.phase2ClusterFit);

              return (
                <motion.div
                  key={decision.id}
                  layout
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ delay: i * 0.025, duration: 0.25 }}
                >
                  {/* Row button */}
                  <button
                    onClick={() =>
                      setExpandedId(isExpanded ? null : decision.id)
                    }
                    className={cn(
                      "grid w-full grid-cols-[1fr_100px_120px_80px_80px_24px] items-center gap-2 py-3.5 px-5 text-left transition-all duration-150 hover:bg-muted/20 border-l-2",
                      isExpanded
                        ? "border-l-2"
                        : "border-l-transparent"
                    )}
                    style={{
                      borderLeftColor: isExpanded ? config.color : undefined,
                    }}
                    onMouseEnter={(e) => {
                      if (!isExpanded) {
                        e.currentTarget.style.borderLeftColor = config.color;
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isExpanded) {
                        e.currentTarget.style.borderLeftColor = "transparent";
                      }
                    }}
                  >
                    {/* Col 1: Merchant + description */}
                    <div className="min-w-0">
                      <p className="truncate text-[13px] font-medium">
                        {decision.merchantName}
                      </p>
                      <p className="truncate text-[11px] text-muted-foreground">
                        {decision.description}
                      </p>
                    </div>

                    {/* Col 2: Amount */}
                    <div className="text-right">
                      <span className="text-[13px] font-display font-bold tabular-nums">
                        {formatAmount(decision.amount)}
                      </span>
                    </div>

                    {/* Col 3: Account */}
                    <div className="min-w-0">
                      <p className="truncate text-[11px] font-medium">
                        {decision.account}
                      </p>
                      <p className="truncate text-[11px] text-muted-foreground">
                        {decision.accountLabel}
                      </p>
                    </div>

                    {/* Col 4: Confidence — Mini gauge */}
                    <div className="flex justify-end">
                      <MiniGauge
                        value={decision.confidenceScore}
                        color={confColor}
                      />
                    </div>

                    {/* Col 5: Outcome badge */}
                    <div className="flex justify-end">
                      <span
                        className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-semibold"
                        style={{
                          backgroundColor: `${config.color}12`,
                          color: config.color,
                        }}
                      >
                        <OutcomeIcon className="h-3 w-3" />
                        {config.label}
                      </span>
                    </div>

                    {/* Col 6: Chevron */}
                    <div className="flex justify-center">
                      <ChevronDownIcon
                        className={cn(
                          "h-4 w-4 text-muted-foreground/50 transition-transform duration-200",
                          isExpanded && "rotate-180"
                        )}
                      />
                    </div>
                  </button>

                  {/* ── Expanded detail ────────────────────── */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25, ease: "easeInOut" }}
                        className="overflow-hidden"
                      >
                        <div className="border-t border-border/30 bg-gradient-to-br from-muted/10 to-muted/5 px-5 py-5">
                          {/* Phase progress bars */}
                          <div className="mb-5 flex gap-5">
                            <PhaseBar
                              label="Fase 1 score"
                              value={decision.phase1Score}
                              color={confidenceColor(decision.phase1Score)}
                            />
                            <PhaseBar
                              label="Fase 2 klynge-fit"
                              value={
                                decision.phase2ClusterFit === "HIGH"
                                  ? 1.0
                                  : decision.phase2ClusterFit === "PARTIAL"
                                    ? 0.5
                                    : 0.0
                              }
                              color={clusterInfo.color}
                            />
                            <PhaseBar
                              label="Fase 3 AI-godkjenning"
                              value={
                                decision.phase3AiApproved === null
                                  ? 0
                                  : decision.phase3AiApproved
                                    ? 1.0
                                    : 0.0
                              }
                              color={
                                decision.phase3AiApproved === null
                                  ? CHART_COLORS.slate
                                  : decision.phase3AiApproved
                                    ? CHART_COLORS.emerald
                                    : CHART_COLORS.red
                              }
                            />
                          </div>

                          {/* Metadata chips */}
                          <div className="mb-4 flex flex-wrap gap-2">
                            <MetaChip
                              label="Tier"
                              value={`${decision.tier}`}
                            />
                            <MetaChip
                              label="Konto"
                              value={`${decision.account} ${decision.accountLabel}`}
                            />
                            <MetaChip
                              label="Klynge-fit"
                              value={clusterInfo.text}
                              color={clusterInfo.color}
                            />
                            <MetaChip
                              label="Konfidens"
                              value={`${Math.round(decision.confidenceScore * 100)}%`}
                              color={confColor}
                            />
                          </div>

                          {/* Rule name */}
                          {decision.ruleName && (
                            <div className="mb-4 flex items-center gap-1.5 text-[12px] text-muted-foreground">
                              <ShieldCheckIcon className="h-3.5 w-3.5" />
                              <span>
                                Regel:{" "}
                                <span className="font-medium">
                                  {decision.ruleName}
                                </span>
                              </span>
                            </div>
                          )}

                          {/* Ciri reasoning */}
                          {decision.ciriReasoning && (
                            <div className="rounded-2xl border border-[var(--primary)]/20 bg-gradient-to-br from-[var(--primary)]/[0.06] to-[var(--primary)]/[0.02] p-4">
                              <div className="mb-2 flex items-center gap-1.5">
                                <SparklesIcon className="h-3.5 w-3.5 text-[var(--primary)]" />
                                <span className="text-[12px] font-semibold text-[var(--primary)]">
                                  Ciris resonnement
                                </span>
                              </div>
                              <p className="text-[13px] leading-relaxed text-foreground/80">
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
          </AnimatePresence>
        </div>
      </div>

      {/* ── Bottom summary: Inline stats bar ───────────── */}
      <div className="rounded-xl bg-muted/20 border border-border/40 px-4 py-2.5">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
          <span>
            Totalt:{" "}
            <span className="font-display font-medium tabular-nums">
              {filtered.length} beslutninger
            </span>
          </span>
          <span className="text-border/60">|</span>
          {(
            [
              "auto_posted",
              "suggested",
              "flagged",
              "ignored",
              "overridden",
            ] as const
          ).map((outcome) => {
            const count = outcomeCounts[outcome];
            if (count === 0) return null;
            const config = outcomeConfig[outcome];
            return (
              <span
                key={outcome}
                className="inline-flex items-center gap-1.5"
              >
                <span
                  className="size-2 rounded-full shrink-0"
                  style={{ backgroundColor: config.color }}
                />
                <span className="tabular-nums font-medium">
                  {count} {config.label.toLowerCase()}
                </span>
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
}
