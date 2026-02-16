"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FilterIcon,
  NetworkIcon,
  BrainCircuitIcon,
  CheckCircleIcon,
  AlertTriangleIcon,
  ChevronRightIcon,
  SparklesIcon,
  XIcon,
  ZapIcon,
  EyeIcon,
  ArrowRightIcon,
  ClockIcon,
  ShieldCheckIcon,
  TrendingUpIcon,
  LayersIcon,
  CircleDotIcon,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  PIPELINE_STATS,
  RECENT_DECISIONS,
  CLUSTER_STATS,
  BATCH_CALLS,
  type Decision,
} from "../mock-data";
import { CHART_COLORS } from "../chart-theme";

// ── Constants ──────────────────────────────────────────────

const SPRING = { type: "spring" as const, stiffness: 400, damping: 25 };
const SPRING_SOFT = { type: "spring" as const, stiffness: 300, damping: 30 };

const PHASE_CONFIG = [
  {
    id: 1,
    title: "Fase 1",
    subtitle: "Regelmotor",
    icon: FilterIcon,
    description:
      "Regelbasert filtrering av kjente mønstre. Dagligvare, strømming og private kjøp fanges opp og markeres automatisk som ignorert. Gjentakende forretningsutgifter matches direkte til riktig konto basert på leverandørnavn og beløpsmønster.",
    longDescription:
      "Regelmotoren er det første trinnet i pipelinen. Den kjører deterministiske regler definert av bruker og systemet. Regler kan ignorere private transaksjoner (Rema, Netflix, etc.), matche kjente leverandører direkte til konto (Malling & Co → 6300 Husleie), eller flagge uvanlige beløp for manuell gjennomgang. Regler har høyest prioritet og kjøres før maskinlæring.",
    color: CHART_COLORS.primary,
    lightColor: `${CHART_COLORS.primary}18`,
    statIn: PIPELINE_STATS.totalTransactions,
    statOut: PIPELINE_STATS.phase1Passed,
    statFiltered: PIPELINE_STATS.totalTransactions - PIPELINE_STATS.phase1Passed,
    filterLabel: "Ignorert/matchet via regler",
    passRate: Math.round(
      (PIPELINE_STATS.phase1Passed / PIPELINE_STATS.totalTransactions) * 100
    ),
    avgTime: "< 1ms",
    accuracy: "100%",
  },
  {
    id: 2,
    title: "Fase 2",
    subtitle: "Klyngeanalyse",
    icon: NetworkIcon,
    description:
      "Maskinlæring grupperer transaksjoner i klynger basert på leverandør, beløp og frekvens. Transaksjoner som passer godt i en sterk klynge får høy konfidens og kan automatisk bokføres.",
    longDescription:
      "Klyngeanalysen bruker usupervisert læring for å oppdage mønster i historiske posteringer. Hver klynge representerer en type utgift (f.eks. «IT / Programvare» eller «Bankgebyr»). Styrken til en klynge øker med flere konsistente datapunkter og synker ved brukeroverstyrelser. Nye transaksjoner scores mot alle aktive klynger for å finne best match.",
    color: CHART_COLORS.emerald,
    lightColor: `${CHART_COLORS.emerald}18`,
    statIn: PIPELINE_STATS.phase1Passed,
    statOut: PIPELINE_STATS.phase2Passed,
    statFiltered: PIPELINE_STATS.phase1Passed - PIPELINE_STATS.phase2Passed,
    filterLabel: "Foreslått til bruker (lav klyngetilhørighet)",
    passRate: Math.round(
      (PIPELINE_STATS.phase2Passed / PIPELINE_STATS.phase1Passed) * 100
    ),
    avgTime: "~12ms",
    accuracy: "89%",
  },
  {
    id: 3,
    title: "Fase 3",
    subtitle: "AI-verifisering",
    icon: BrainCircuitIcon,
    description:
      "Claude Opus gjennomgår hvert kontoforslag, verifiserer beløp mot historikk, og sjekker kontekst. Godkjenner korrekte posteringer eller flagger avvik med begrunnelse.",
    longDescription:
      "AI-verifiseringen er det siste kvalitetssikringstrinnet. Claude analyserer hele konteksten: leverandørhistorikk, beløpsutvikling, kontoplanens semantikk, og eventuelle anomalier. Transaksjoner behandles i batch (typisk 4–8 per kjøring) for kostnadseffektivitet. AI-en gir skriftlig begrunnelse for hvert vedtak, som gjør beslutningene sporbare og revisjonsklare.",
    color: CHART_COLORS.blue,
    lightColor: `${CHART_COLORS.blue}18`,
    statIn: PIPELINE_STATS.phase3Queued,
    statOut: PIPELINE_STATS.phase3Approved,
    statFiltered: PIPELINE_STATS.phase3Flagged,
    filterLabel: "Flagget for manuell gjennomgang",
    passRate: Math.round(
      (PIPELINE_STATS.phase3Approved / PIPELINE_STATS.phase3Queued) * 100
    ),
    avgTime: "~2.3s",
    accuracy: "94.7%",
  },
];

const OUTCOME_COLORS: Record<string, string> = {
  approved: CHART_COLORS.emerald,
  auto_posted: CHART_COLORS.emerald,
  flagged: CHART_COLORS.amber,
  suggested: CHART_COLORS.blue,
  ignored: CHART_COLORS.slate,
  overridden: CHART_COLORS.purple,
};

const OUTCOME_LABELS: Record<string, string> = {
  auto_posted: "Autopostert",
  approved: "Godkjent",
  flagged: "Flagget",
  suggested: "Foreslått",
  ignored: "Ignorert",
  overridden: "Overstyrt",
};

// ── Helpers ────────────────────────────────────────────────

const LATEST_BATCH = BATCH_CALLS[0];

function getPhaseForDecision(d: Decision): 1 | 2 | 3 {
  if (d.outcome === "ignored") return 1;
  if (d.phase3AiApproved !== null) return 3;
  if (d.phase2ClusterFit !== "NONE") return 2;
  return 1;
}

// ── Component ──────────────────────────────────────────────

export function PipelineSchema() {
  const [activePhase, setActivePhase] = useState<number | null>(null);
  const [selectedDecision, setSelectedDecision] = useState<Decision | null>(
    null
  );

  const getFillPercent = (phaseIdx: number) => {
    const cfg = PHASE_CONFIG[phaseIdx];
    return Math.round((cfg.statOut / cfg.statIn) * 100);
  };

  const getPhaseDecisions = (phaseId: number) => {
    return RECENT_DECISIONS.filter((d) => {
      if (phaseId === 1) return d.outcome === "ignored";
      if (phaseId === 2)
        return d.phase2ClusterFit !== "NONE" && d.outcome !== "ignored";
      return d.phase3AiApproved !== null;
    }).slice(0, 5);
  };

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[var(--primary)]/10">
              <ZapIcon className="h-4 w-4 text-[var(--primary)]" />
            </div>
            <div>
              <CardTitle className="text-base font-semibold">
                Sanntids pipelineoversikt
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                {PIPELINE_STATS.totalTransactions.toLocaleString("nb-NO")}{" "}
                transaksjoner gjennom 3-fase AI-behandlingspipeline
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <motion.div
              animate={{ scale: [1, 1.3, 1] }}
              transition={{
                repeat: Infinity,
                duration: 2,
                ease: "easeInOut",
              }}
              className="h-2 w-2 rounded-full bg-emerald-500"
            />
            <span className="text-xs font-medium text-emerald-600">
              Pipeline aktiv
            </span>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-5 px-3 pb-5 sm:px-5">
        {/* ════════════════════════════════════════════════════════
            ROW 1: Phase Cards — the main pipeline visualization
           ════════════════════════════════════════════════════════ */}
        <div className="grid grid-cols-[60px_1fr_1fr_1fr_60px] items-stretch gap-2 sm:gap-3">
          {/* ── Input funnel ── */}
          <div className="flex flex-col items-center justify-center">
            <motion.div
              animate={{ y: [0, -4, 0] }}
              transition={{
                repeat: Infinity,
                duration: 2.5,
                ease: "easeInOut",
              }}
              className="flex h-11 w-11 items-center justify-center rounded-full border border-slate-200/60 bg-white shadow-sm"
            >
              <ArrowRightIcon className="h-4 w-4 text-slate-400" />
            </motion.div>
            <span className="mt-2 text-center text-xs font-semibold tabular-nums text-muted-foreground leading-tight">
              {PIPELINE_STATS.totalTransactions.toLocaleString("nb-NO")}
            </span>
            <span className="text-[10px] text-muted-foreground">
              transaksjoner
            </span>
          </div>

          {/* ── Phase 1, 2, 3 ── */}
          {PHASE_CONFIG.map((phase, idx) => {
            const Icon = phase.icon;
            const fill = getFillPercent(idx);
            const isActive = activePhase === phase.id;
            return (
              <motion.div
                key={phase.id}
                layout
                onClick={() =>
                  setActivePhase(isActive ? null : phase.id)
                }
                className="group relative cursor-pointer"
                whileHover={{ scale: 1.005 }}
                whileTap={{ scale: 0.995 }}
              >
                {/* Glass card */}
                <div
                  className="relative h-full overflow-hidden rounded-xl border transition-all duration-300"
                  style={{
                    borderColor: isActive
                      ? `${phase.color}40`
                      : "rgba(0,0,0,0.06)",
                    backgroundColor: isActive
                      ? phase.lightColor
                      : "rgba(255,255,255,0.7)",
                  }}
                >
                  {/* Top highlight line */}
                  <div
                    className="absolute inset-x-0 top-0 h-px"
                    style={{
                      background: `linear-gradient(to right, transparent, ${phase.color}30, transparent)`,
                    }}
                  />

                  <div className="relative p-3 sm:p-4">
                    {/* Phase header */}
                    <div className="flex items-center gap-2">
                      <div
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                        style={{
                          backgroundColor: `${phase.color}15`,
                        }}
                      >
                        <Icon
                          className="h-4 w-4"
                          style={{ color: phase.color }}
                        />
                      </div>
                      <div className="min-w-0">
                        <p
                          className="text-xs font-bold tracking-wider uppercase"
                          style={{ color: phase.color }}
                        >
                          {phase.title}
                        </p>
                        <p className="truncate text-sm font-medium text-foreground">
                          {phase.subtitle}
                        </p>
                      </div>
                    </div>

                    {/* Description */}
                    <p className="mt-2.5 text-xs leading-relaxed text-muted-foreground line-clamp-3">
                      {phase.description}
                    </p>

                    {/* Fill level bar */}
                    <div className="mt-3">
                      <div className="mb-1 flex items-center justify-between">
                        <span className="text-xs font-medium text-muted-foreground">
                          Gjennomstrømning
                        </span>
                        <span
                          className="text-sm font-bold tabular-nums"
                          style={{ color: phase.color }}
                        >
                          {fill}%
                        </span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                        <motion.div
                          className="h-full rounded-full"
                          style={{ backgroundColor: phase.color }}
                          initial={{ width: 0 }}
                          animate={{ width: `${fill}%` }}
                          transition={{
                            duration: 1.2,
                            delay: idx * 0.2,
                            ease: [0.22, 1, 0.36, 1],
                          }}
                        />
                      </div>
                    </div>

                    {/* Stats grid */}
                    <div className="mt-3 grid grid-cols-2 gap-1.5">
                      <div className="rounded-lg bg-white/60 px-2.5 py-2">
                        <p className="text-xs text-muted-foreground">
                          Inn
                        </p>
                        <p className="text-base font-bold tabular-nums text-foreground">
                          {phase.statIn.toLocaleString("nb-NO")}
                        </p>
                      </div>
                      <div className="rounded-lg bg-white/60 px-2.5 py-2">
                        <p className="text-xs text-muted-foreground">
                          Videre
                        </p>
                        <p
                          className="text-base font-bold tabular-nums"
                          style={{ color: phase.color }}
                        >
                          {phase.statOut.toLocaleString("nb-NO")}
                        </p>
                      </div>
                    </div>

                    {/* Performance metrics row */}
                    <div className="mt-2.5 flex items-center gap-3">
                      <div className="flex items-center gap-1">
                        <ClockIcon className="h-3 w-3 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">
                          {phase.avgTime}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <ShieldCheckIcon className="h-3 w-3 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">
                          {phase.accuracy} nøyaktighet
                        </span>
                      </div>
                    </div>

                    {/* Filtered / diverted count */}
                    <div className="mt-2 flex items-center gap-1">
                      <AlertTriangleIcon className="h-3 w-3 text-amber-500/70" />
                      <span className="text-xs text-muted-foreground">
                        {phase.statFiltered.toLocaleString("nb-NO")}{" "}
                        {phase.filterLabel.toLowerCase()}
                      </span>
                    </div>

                    {/* Expand hint */}
                    <div className="mt-2.5 flex items-center gap-1 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                      <EyeIcon className="h-3 w-3 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">
                        {isActive
                          ? "Klikk for å lukke"
                          : "Klikk for detaljer"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Phase connector chevron */}
                {idx < 2 && (
                  <div className="absolute top-1/2 -right-2 z-30 -translate-y-1/2 sm:-right-2.5">
                    <motion.div
                      animate={{
                        x: [0, 4, 0],
                        opacity: [0.3, 0.7, 0.3],
                      }}
                      transition={{
                        repeat: Infinity,
                        duration: 1.5,
                        ease: "easeInOut",
                      }}
                    >
                      <ChevronRightIcon className="h-4 w-4 text-slate-300" />
                    </motion.div>
                  </div>
                )}
              </motion.div>
            );
          })}

          {/* ── Output destinations ── */}
          <div className="flex flex-col items-center justify-center gap-3">
            {[
              {
                label: "Bokført",
                count: PIPELINE_STATS.autoPosted,
                color: CHART_COLORS.emerald,
                icon: CheckCircleIcon,
              },
              {
                label: "Flagget",
                count: PIPELINE_STATS.phase3Flagged,
                color: CHART_COLORS.amber,
                icon: AlertTriangleIcon,
              },
              {
                label: "Foreslått",
                count: PIPELINE_STATS.suggestedToUser,
                color: CHART_COLORS.blue,
                icon: CircleDotIcon,
              },
            ].map((out, i) => (
              <motion.div
                key={out.label}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 + i * 0.1, ...SPRING_SOFT }}
                className="flex flex-col items-center"
              >
                <div
                  className="flex h-9 w-9 items-center justify-center rounded-full border shadow-sm"
                  style={{
                    borderColor: `${out.color}30`,
                    backgroundColor: `${out.color}10`,
                  }}
                >
                  <out.icon
                    className="h-3.5 w-3.5"
                    style={{ color: out.color }}
                  />
                </div>
                <span
                  className="mt-0.5 text-xs font-bold tabular-nums"
                  style={{ color: out.color }}
                >
                  {out.count.toLocaleString("nb-NO")}
                </span>
                <span className="text-[10px] text-muted-foreground">
                  {out.label}
                </span>
              </motion.div>
            ))}
          </div>
        </div>

        {/* ── Expanded Phase Detail Panel ── */}
        <AnimatePresence mode="wait">
          {activePhase && (
            <motion.div
              key={activePhase}
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={SPRING}
              className="overflow-hidden"
            >
              <div className="overflow-hidden rounded-xl border border-slate-100">
                {/* Top highlight */}
                <div
                  className="h-px"
                  style={{
                    background: `linear-gradient(to right, transparent, ${PHASE_CONFIG[activePhase - 1].color}30, transparent)`,
                  }}
                />
                <div className="bg-gradient-to-br from-white to-slate-50/50 p-4 sm:p-5">
                  {/* Phase info header */}
                  <div className="mb-3 flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <div
                        className="flex h-7 w-7 items-center justify-center rounded-lg"
                        style={{
                          backgroundColor: `${PHASE_CONFIG[activePhase - 1].color}15`,
                        }}
                      >
                        <SparklesIcon
                          className="h-3.5 w-3.5"
                          style={{
                            color: PHASE_CONFIG[activePhase - 1].color,
                          }}
                        />
                      </div>
                      <span className="text-sm font-semibold">
                        {PHASE_CONFIG[activePhase - 1].title}:{" "}
                        {PHASE_CONFIG[activePhase - 1].subtitle}
                      </span>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setActivePhase(null);
                      }}
                      className="rounded-md p-1 transition-colors hover:bg-slate-100"
                    >
                      <XIcon className="h-4 w-4 text-muted-foreground" />
                    </button>
                  </div>

                  <p className="mb-4 max-w-2xl text-sm leading-relaxed text-muted-foreground">
                    {PHASE_CONFIG[activePhase - 1].longDescription}
                  </p>

                  {/* Phase-specific content */}
                  {activePhase === 1 && (
                    <div className="space-y-3">
                      <p className="text-xs font-bold tracking-wider text-muted-foreground uppercase">
                        Aktive regler ({PIPELINE_STATS.rulesApplied} treff
                        totalt)
                      </p>
                      <div className="grid gap-2 sm:grid-cols-2">
                        {[
                          {
                            rule: "Ignorer dagligvare (Rema, Kiwi, Coop)",
                            hits: 156,
                          },
                          {
                            rule: "Ignorer streaming (Netflix, HBO, Disney+)",
                            hits: 48,
                          },
                          {
                            rule: "Match husleie → 6300 Husleie",
                            hits: 24,
                          },
                          {
                            rule: "Match IT-abonnement → 6540 IT-kostnader",
                            hits: 89,
                          },
                          {
                            rule: "Ignorer privatutlegg (Circle K, Shell)",
                            hits: 22,
                          },
                          {
                            rule: "Match forsikring → 7500 Forsikring",
                            hits: 16,
                          },
                        ].map((r, i) => (
                          <motion.div
                            key={r.rule}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.05, ...SPRING }}
                            className="flex items-center justify-between gap-2 rounded-lg border border-slate-100 bg-white px-3 py-2.5"
                          >
                            <div className="flex items-center gap-2">
                              <FilterIcon className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                              <span className="text-xs text-foreground">
                                {r.rule}
                              </span>
                            </div>
                            <span className="shrink-0 text-xs font-semibold tabular-nums text-muted-foreground">
                              {r.hits}x
                            </span>
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  )}

                  {activePhase === 2 && (
                    <div className="space-y-3">
                      <p className="text-xs font-bold tracking-wider text-muted-foreground uppercase">
                        Aktive klynger ({CLUSTER_STATS.length} totalt)
                      </p>
                      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                        {CLUSTER_STATS.slice(0, 8).map((cluster, i) => (
                          <motion.div
                            key={cluster.account}
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: i * 0.05, ...SPRING }}
                            className="rounded-lg border border-slate-100 bg-white p-3"
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-semibold">
                                {cluster.label}
                              </span>
                              <span
                                className="rounded-full px-1.5 py-0.5 text-[10px] font-bold"
                                style={{
                                  backgroundColor:
                                    cluster.strengthLevel === "STRONG"
                                      ? `${CHART_COLORS.emerald}15`
                                      : cluster.strengthLevel === "GROWING"
                                        ? `${CHART_COLORS.amber}15`
                                        : `${CHART_COLORS.red}15`,
                                  color:
                                    cluster.strengthLevel === "STRONG"
                                      ? CHART_COLORS.emerald
                                      : cluster.strengthLevel === "GROWING"
                                        ? CHART_COLORS.amber
                                        : CHART_COLORS.red,
                                }}
                              >
                                {cluster.strengthLevel}
                              </span>
                            </div>
                            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
                              <motion.div
                                className="h-full rounded-full"
                                style={{
                                  backgroundColor:
                                    cluster.strengthLevel === "STRONG"
                                      ? CHART_COLORS.emerald
                                      : cluster.strengthLevel === "GROWING"
                                        ? CHART_COLORS.amber
                                        : CHART_COLORS.red,
                                }}
                                initial={{ width: 0 }}
                                animate={{
                                  width: `${cluster.strength * 100}%`,
                                }}
                                transition={{
                                  duration: 0.8,
                                  delay: i * 0.08,
                                }}
                              />
                            </div>
                            <div className="mt-1.5 flex items-center justify-between">
                              <p className="text-xs text-muted-foreground">
                                {cluster.dataPoints} datapunkter
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {cluster.distinctMerchants} leverandører
                              </p>
                            </div>
                            <p className="mt-0.5 text-xs text-muted-foreground">
                              Konto: {cluster.account} · Overstyring:{" "}
                              {(cluster.overrideRate * 100).toFixed(0)}%
                            </p>
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  )}

                  {activePhase === 3 && (
                    <div className="space-y-3">
                      <p className="text-xs font-bold tracking-wider text-muted-foreground uppercase">
                        Siste AI-verifiseringer
                      </p>
                      <div className="space-y-1.5">
                        {getPhaseDecisions(3).map((d, i) => (
                          <motion.button
                            key={d.id}
                            initial={{ opacity: 0, x: -8 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.05, ...SPRING }}
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedDecision(d);
                            }}
                            className="flex w-full items-center gap-3 rounded-lg border border-slate-100 bg-white px-3 py-2.5 text-left transition-colors hover:border-slate-200 hover:bg-slate-50/50"
                          >
                            <div
                              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full"
                              style={{
                                backgroundColor: d.phase3AiApproved
                                  ? `${CHART_COLORS.emerald}15`
                                  : `${CHART_COLORS.amber}15`,
                              }}
                            >
                              {d.phase3AiApproved ? (
                                <CheckCircleIcon className="h-3.5 w-3.5 text-emerald-600" />
                              ) : (
                                <AlertTriangleIcon className="h-3.5 w-3.5 text-amber-600" />
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-medium">
                                {d.merchantName}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                kr{" "}
                                {Math.abs(d.amount).toLocaleString(
                                  "nb-NO"
                                )}{" "}
                                → {d.account} {d.accountLabel}
                              </p>
                            </div>
                            <span
                              className="shrink-0 text-xs font-bold tabular-nums"
                              style={{
                                color:
                                  d.confidenceScore > 0.8
                                    ? CHART_COLORS.emerald
                                    : d.confidenceScore > 0.6
                                      ? CHART_COLORS.amber
                                      : CHART_COLORS.red,
                              }}
                            >
                              {(d.confidenceScore * 100).toFixed(0)}%
                            </span>
                          </motion.button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ════════════════════════════════════════════════════════
            ROW 2: Transaction Flow + Outcome Summary
           ════════════════════════════════════════════════════════ */}
        <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
          {/* ── Left: Recent Transaction Flow ── */}
          <div className="relative overflow-hidden rounded-xl border border-slate-100">
            {/* Top highlight */}
            <div
              className="h-px"
              style={{
                background: `linear-gradient(to right, transparent, ${CHART_COLORS.primary}30, transparent)`,
              }}
            />
            <div className="bg-gradient-to-br from-white to-slate-50/30 p-4 sm:p-5">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div
                    className="flex h-7 w-7 items-center justify-center rounded-lg"
                    style={{
                      backgroundColor: `${CHART_COLORS.primary}15`,
                    }}
                  >
                    <LayersIcon
                      className="h-3.5 w-3.5"
                      style={{ color: CHART_COLORS.primary }}
                    />
                  </div>
                  <span className="text-sm font-semibold">
                    Siste batch — transaksjonsflyt
                  </span>
                </div>
                <span className="text-xs text-muted-foreground">
                  {new Date(LATEST_BATCH.timestamp).toLocaleDateString(
                    "nb-NO",
                    {
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    }
                  )}
                </span>
              </div>

              {/* Transaction flow table */}
              <div className="space-y-1">
                {/* Header */}
                <div className="grid grid-cols-[1fr_80px_80px_80px_70px] gap-2 px-2 py-1.5">
                  <span className="text-xs font-bold tracking-wider text-muted-foreground uppercase">
                    Transaksjon
                  </span>
                  <span className="text-center text-xs font-bold tracking-wider text-muted-foreground uppercase">
                    Fase 1
                  </span>
                  <span className="text-center text-xs font-bold tracking-wider text-muted-foreground uppercase">
                    Fase 2
                  </span>
                  <span className="text-center text-xs font-bold tracking-wider text-muted-foreground uppercase">
                    Fase 3
                  </span>
                  <span className="text-right text-xs font-bold tracking-wider text-muted-foreground uppercase">
                    Resultat
                  </span>
                </div>

                {/* Rows */}
                {LATEST_BATCH.items.map((item, i) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.06, ...SPRING }}
                    className="grid grid-cols-[1fr_80px_80px_80px_70px] items-center gap-2 rounded-lg px-2 py-2 transition-colors hover:bg-slate-50/80"
                  >
                    {/* Transaction info */}
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {item.merchantName}
                      </p>
                      <p className="text-xs tabular-nums text-muted-foreground">
                        kr{" "}
                        {Math.abs(item.amount).toLocaleString("nb-NO")}{" "}
                        → {item.account}
                      </p>
                    </div>

                    {/* Phase 1: Rule score */}
                    <div className="flex flex-col items-center">
                      <div className="h-1.5 w-full max-w-[48px] overflow-hidden rounded-full bg-slate-100">
                        <motion.div
                          className="h-full rounded-full"
                          style={{
                            backgroundColor: CHART_COLORS.primary,
                          }}
                          initial={{ width: 0 }}
                          animate={{
                            width: `${item.confidenceScore * 100}%`,
                          }}
                          transition={{
                            duration: 0.6,
                            delay: 0.3 + i * 0.06,
                          }}
                        />
                      </div>
                      <span className="mt-0.5 text-[10px] text-muted-foreground">
                        {item.tier === 1 ? "Regel-match" : "Videre"}
                      </span>
                    </div>

                    {/* Phase 2: Cluster fit */}
                    <div className="flex flex-col items-center">
                      <span
                        className="rounded-full px-1.5 py-0.5 text-[10px] font-bold"
                        style={{
                          backgroundColor:
                            item.clusterFit === "HIGH"
                              ? `${CHART_COLORS.emerald}15`
                              : item.clusterFit === "PARTIAL"
                                ? `${CHART_COLORS.amber}15`
                                : `${CHART_COLORS.slate}15`,
                          color:
                            item.clusterFit === "HIGH"
                              ? CHART_COLORS.emerald
                              : item.clusterFit === "PARTIAL"
                                ? CHART_COLORS.amber
                                : CHART_COLORS.slate,
                        }}
                      >
                        {item.clusterFit}
                      </span>
                      <span className="mt-0.5 text-[10px] text-muted-foreground">
                        {item.clusterName === "—"
                          ? "Ingen"
                          : item.clusterName}
                      </span>
                    </div>

                    {/* Phase 3: AI verdict */}
                    <div className="flex flex-col items-center">
                      <span
                        className="text-xs font-bold tabular-nums"
                        style={{
                          color:
                            item.confidenceScore > 0.8
                              ? CHART_COLORS.emerald
                              : item.confidenceScore > 0.6
                                ? CHART_COLORS.amber
                                : CHART_COLORS.red,
                        }}
                      >
                        {(item.confidenceScore * 100).toFixed(0)}%
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        konfidens
                      </span>
                    </div>

                    {/* Outcome badge */}
                    <div className="flex justify-end">
                      <span
                        className="rounded-full px-2 py-0.5 text-xs font-bold"
                        style={{
                          backgroundColor: `${OUTCOME_COLORS[item.outcome] ?? CHART_COLORS.slate}15`,
                          color:
                            OUTCOME_COLORS[item.outcome] ??
                            CHART_COLORS.slate,
                        }}
                      >
                        {item.outcome === "approved"
                          ? "Godkjent"
                          : "Flagget"}
                      </span>
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Batch summary */}
              <div className="mt-3 flex items-center gap-4 border-t border-slate-100 pt-3">
                <span className="text-xs text-muted-foreground">
                  <strong className="text-foreground">
                    {LATEST_BATCH.totalItems}
                  </strong>{" "}
                  transaksjoner
                </span>
                <span className="text-xs text-muted-foreground">
                  <strong className="text-emerald-600">
                    {LATEST_BATCH.approved}
                  </strong>{" "}
                  godkjent
                </span>
                <span className="text-xs text-muted-foreground">
                  <strong className="text-amber-600">
                    {LATEST_BATCH.flagged}
                  </strong>{" "}
                  flagget
                </span>
                <span className="text-xs text-muted-foreground">
                  {(LATEST_BATCH.durationMs / 1000).toFixed(1)}s · $
                  {LATEST_BATCH.tokenCost.toFixed(3)}
                </span>
              </div>
            </div>
          </div>

          {/* ── Right: Outcome Summary + Recent Decisions ── */}
          <div className="space-y-4">
            {/* Outcome breakdown */}
            <div className="relative overflow-hidden rounded-xl border border-slate-100">
              <div
                className="h-px"
                style={{
                  background: `linear-gradient(to right, transparent, ${CHART_COLORS.emerald}30, transparent)`,
                }}
              />
              <div className="bg-gradient-to-br from-white to-slate-50/30 p-4 sm:p-5">
                <div className="mb-4 flex items-center gap-2">
                  <div
                    className="flex h-7 w-7 items-center justify-center rounded-lg"
                    style={{
                      backgroundColor: `${CHART_COLORS.emerald}15`,
                    }}
                  >
                    <TrendingUpIcon
                      className="h-3.5 w-3.5"
                      style={{ color: CHART_COLORS.emerald }}
                    />
                  </div>
                  <span className="text-sm font-semibold">
                    Utfallsoversikt
                  </span>
                </div>

                <div className="space-y-3">
                  {[
                    {
                      label: "Autopostert",
                      count: PIPELINE_STATS.autoPosted,
                      total: PIPELINE_STATS.totalTransactions,
                      color: CHART_COLORS.emerald,
                      desc: "Bokført uten manuell inngripen",
                    },
                    {
                      label: "Foreslått til bruker",
                      count: PIPELINE_STATS.suggestedToUser,
                      total: PIPELINE_STATS.totalTransactions,
                      color: CHART_COLORS.blue,
                      desc: "Venter på brukerens vurdering",
                    },
                    {
                      label: "Regelfiltrert",
                      count: PIPELINE_STATS.rulesApplied,
                      total: PIPELINE_STATS.totalTransactions,
                      color: CHART_COLORS.primary,
                      desc: "Ignorert eller matchet av regler",
                    },
                    {
                      label: "Flagget av AI",
                      count: PIPELINE_STATS.phase3Flagged,
                      total: PIPELINE_STATS.totalTransactions,
                      color: CHART_COLORS.amber,
                      desc: "AI identifiserte avvik",
                    },
                    {
                      label: "Overstyrt av bruker",
                      count: PIPELINE_STATS.userOverrides,
                      total: PIPELINE_STATS.totalTransactions,
                      color: CHART_COLORS.purple,
                      desc: "Bruker endret Ciris forslag",
                    },
                  ].map((item, i) => {
                    const pct = Math.round(
                      (item.count / item.total) * 100
                    );
                    return (
                      <motion.div
                        key={item.label}
                        initial={{ opacity: 0, x: 8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.06, ...SPRING }}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium text-foreground">
                            {item.label}
                          </span>
                          <span
                            className="text-xs font-bold tabular-nums"
                            style={{ color: item.color }}
                          >
                            {item.count.toLocaleString("nb-NO")} ({pct}
                            %)
                          </span>
                        </div>
                        <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100">
                          <motion.div
                            className="h-full rounded-full"
                            style={{ backgroundColor: item.color }}
                            initial={{ width: 0 }}
                            animate={{ width: `${pct}%` }}
                            transition={{
                              duration: 0.8,
                              delay: 0.2 + i * 0.08,
                            }}
                          />
                        </div>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {item.desc}
                        </p>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Recent decisions mini-feed */}
            <div className="relative overflow-hidden rounded-xl border border-slate-100">
              <div
                className="h-px"
                style={{
                  background: `linear-gradient(to right, transparent, ${CHART_COLORS.blue}30, transparent)`,
                }}
              />
              <div className="bg-gradient-to-br from-white to-slate-50/30 p-4 sm:p-5">
                <div className="mb-4 flex items-center gap-2">
                  <div
                    className="flex h-7 w-7 items-center justify-center rounded-lg"
                    style={{
                      backgroundColor: `${CHART_COLORS.blue}15`,
                    }}
                  >
                    <SparklesIcon
                      className="h-3.5 w-3.5"
                      style={{ color: CHART_COLORS.blue }}
                    />
                  </div>
                  <span className="text-sm font-semibold">
                    Siste beslutninger
                  </span>
                </div>
                <div className="space-y-1.5">
                  {RECENT_DECISIONS.slice(0, 6).map((d, i) => (
                    <motion.button
                      key={d.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.04 }}
                      onClick={() => setSelectedDecision(d)}
                      className="flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left transition-colors hover:bg-slate-50"
                    >
                      <div
                        className="h-2 w-2 shrink-0 rounded-full"
                        style={{
                          backgroundColor:
                            OUTCOME_COLORS[d.outcome] ??
                            CHART_COLORS.slate,
                        }}
                      />
                      <span className="min-w-0 flex-1 truncate text-sm text-foreground">
                        {d.merchantName}
                      </span>
                      <span className="shrink-0 text-xs font-medium tabular-nums text-muted-foreground">
                        kr {Math.abs(d.amount).toLocaleString("nb-NO")}
                      </span>
                      <span
                        className="shrink-0 text-xs font-bold"
                        style={{
                          color:
                            OUTCOME_COLORS[d.outcome] ??
                            CHART_COLORS.slate,
                        }}
                      >
                        {OUTCOME_LABELS[d.outcome] ?? d.outcome}
                      </span>
                    </motion.button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Decision Detail Overlay ── */}
        <AnimatePresence>
          {selectedDecision && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm"
              onClick={() => setSelectedDecision(null)}
            >
              <motion.div
                initial={{ scale: 0.92, y: 24 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.92, y: 24 }}
                transition={SPRING}
                onClick={(e) => e.stopPropagation()}
                className="mx-4 w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
              >
                {/* Header */}
                <div className="border-b border-slate-100 px-5 py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <BrainCircuitIcon className="h-4 w-4 text-[var(--primary)]" />
                      <span className="text-sm font-semibold">
                        Ciri-beslutning
                      </span>
                    </div>
                    <button
                      onClick={() => setSelectedDecision(null)}
                      className="rounded-md p-1 transition-colors hover:bg-slate-100"
                    >
                      <XIcon className="h-4 w-4 text-muted-foreground" />
                    </button>
                  </div>
                </div>

                <div className="space-y-4 p-5">
                  {/* Transaction info */}
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold">
                        {selectedDecision.merchantName}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {selectedDecision.description}
                      </p>
                    </div>
                    <p className="text-lg font-bold tabular-nums">
                      kr{" "}
                      {Math.abs(selectedDecision.amount).toLocaleString(
                        "nb-NO"
                      )}
                    </p>
                  </div>

                  {/* Pipeline path visualization */}
                  <div>
                    <p className="mb-2 text-xs font-bold tracking-wider text-muted-foreground uppercase">
                      Pipeline-bane
                    </p>
                    <div className="flex items-center gap-1">
                      {[
                        {
                          label: "Fase 1 — Regler",
                          score: selectedDecision.phase1Score,
                          color: CHART_COLORS.primary,
                        },
                        {
                          label: "Fase 2 — Klynge",
                          score:
                            selectedDecision.phase2ClusterFit === "HIGH"
                              ? 0.9
                              : selectedDecision.phase2ClusterFit ===
                                  "PARTIAL"
                                ? 0.6
                                : 0.2,
                          color: CHART_COLORS.emerald,
                        },
                        {
                          label: "Fase 3 — AI",
                          score: selectedDecision.phase3AiApproved
                            ? 1
                            : selectedDecision.phase3AiApproved === false
                              ? 0.3
                              : 0,
                          color: CHART_COLORS.blue,
                        },
                      ].map((step, i) => (
                        <div
                          key={step.label}
                          className="flex flex-1 items-center gap-1"
                        >
                          <div className="flex-1">
                            <p className="text-xs text-muted-foreground">
                              {step.label}
                            </p>
                            <div className="mt-0.5 h-2 overflow-hidden rounded-full bg-slate-100">
                              <motion.div
                                className="h-full rounded-full"
                                style={{
                                  backgroundColor: step.color,
                                }}
                                initial={{ width: 0 }}
                                animate={{
                                  width: `${step.score * 100}%`,
                                }}
                                transition={{
                                  duration: 0.6,
                                  delay: i * 0.15,
                                }}
                              />
                            </div>
                            <p
                              className="mt-0.5 text-xs font-bold tabular-nums"
                              style={{ color: step.color }}
                            >
                              {(step.score * 100).toFixed(0)}%
                            </p>
                          </div>
                          {i < 2 && (
                            <ChevronRightIcon className="mt-2 h-3 w-3 shrink-0 text-slate-300" />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Metadata chips */}
                  <div className="flex flex-wrap gap-1.5">
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium">
                      Konto: {selectedDecision.account}{" "}
                      {selectedDecision.accountLabel}
                    </span>
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium">
                      Tier {selectedDecision.tier}
                    </span>
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium">
                      Klynge: {selectedDecision.phase2ClusterFit}
                    </span>
                    <span
                      className="rounded-full px-2.5 py-1 text-xs font-bold"
                      style={{
                        backgroundColor:
                          selectedDecision.confidenceScore > 0.8
                            ? `${CHART_COLORS.emerald}15`
                            : `${CHART_COLORS.amber}15`,
                        color:
                          selectedDecision.confidenceScore > 0.8
                            ? CHART_COLORS.emerald
                            : CHART_COLORS.amber,
                      }}
                    >
                      Konfidens:{" "}
                      {(selectedDecision.confidenceScore * 100).toFixed(
                        0
                      )}
                      %
                    </span>
                    <span
                      className="rounded-full px-2.5 py-1 text-xs font-bold"
                      style={{
                        backgroundColor: `${OUTCOME_COLORS[selectedDecision.outcome] ?? CHART_COLORS.slate}15`,
                        color:
                          OUTCOME_COLORS[selectedDecision.outcome] ??
                          CHART_COLORS.slate,
                      }}
                    >
                      {OUTCOME_LABELS[selectedDecision.outcome] ??
                        selectedDecision.outcome}
                    </span>
                  </div>

                  {/* AI reasoning */}
                  {selectedDecision.ciriReasoning && (
                    <div className="rounded-xl border border-[var(--primary)]/10 bg-[var(--primary)]/5 p-4">
                      <div className="mb-2 flex items-center gap-1.5">
                        <SparklesIcon className="h-3.5 w-3.5 text-[var(--primary)]" />
                        <span className="text-xs font-bold text-[var(--primary)]">
                          Ciris resonnement
                        </span>
                      </div>
                      <p className="text-sm leading-relaxed text-foreground/80">
                        {selectedDecision.ciriReasoning}
                      </p>
                    </div>
                  )}

                  {/* Phase the decision was handled at */}
                  <p className="text-xs text-muted-foreground">
                    Behandlet i{" "}
                    <strong>
                      {
                        PHASE_CONFIG[
                          getPhaseForDecision(selectedDecision) - 1
                        ].title
                      }
                    </strong>{" "}
                    (
                    {
                      PHASE_CONFIG[
                        getPhaseForDecision(selectedDecision) - 1
                      ].subtitle
                    }
                    ) ·{" "}
                    {new Date(
                      selectedDecision.timestamp
                    ).toLocaleDateString("nb-NO", {
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
}
