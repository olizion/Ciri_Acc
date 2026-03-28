"use client";

import { useState, useCallback, useMemo } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DownloadIcon,
  SparklesIcon,
  BrainCircuitIcon,
  TrendingUpIcon,
  TrendingDownIcon,
  ReceiptIcon,
  CalendarIcon,
  CheckCircle2Icon,
  SendIcon,
  ClockIcon,
  FileTextIcon,
  ShieldCheckIcon,
  ChevronRightIcon,
  ListIcon,
  BarChart3Icon,
  HistoryIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import dynamic from "next/dynamic";
import LearnMoreDocs from "@/components/learn-more-docs";
import CiriLogo from "@/components/layout/ciri-logo";
import { useCiriActionListener } from "@/lib/ciri-actions";
import { Dialog, DialogTrigger } from "@/components/ui/dialog";
import { mvaTerminer } from "./data/mva-terminer";
import { ciriTimeline } from "./data/ciri-timeline";
import { statusConfig } from "./constants";
import {
  IncomeDetailsCard,
  ExpenseDetailsCard,
  MVAPreviewDialog,
  TerminDetailDialog,
} from "./components";
import type { MVATermin } from "./types";

const SAFTExportDialog = dynamic(
  () =>
    import("@/components/saft-export-dialog").then((m) => ({
      default: m.SAFTExportDialog,
    })),
  { ssr: false }
);

// ============================================================================
// HELPERS
// ============================================================================

function krFmt(n: number) {
  return Math.abs(n).toLocaleString("nb-NO");
}

type TabId = "oversikt" | "inntekter" | "kostnader" | "historikk";

// ============================================================================
// MAIN PAGE
// ============================================================================

export default function MVAPage() {
  const [activeTab, setActiveTab] = useState<TabId>("oversikt");
  const [autonomyMode, setAutonomyMode] = useState<
    "assistant" | "autonomous"
  >("autonomous");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [selectedTermin, setSelectedTermin] = useState<MVATermin | null>(null);
  const [terminDialogOpen, setTerminDialogOpen] = useState(false);

  useCiriActionListener(
    "forhandsvis-mva",
    useCallback(() => setPreviewOpen(true), [])
  );

  const currentTermin = mvaTerminer.find((t) => t.status === "ready");
  const totalUtgaende = mvaTerminer.reduce((acc, t) => acc + t.utgaende, 0);
  const totalInngaende = mvaTerminer.reduce((acc, t) => acc + t.inngaende, 0);
  const totalNetto = totalUtgaende - totalInngaende;
  const submittedCount = mvaTerminer.filter(
    (t) => t.status === "submitted"
  ).length;

  const daysUntilDeadline = useMemo(() => {
    if (!currentTermin?.deadline) return null;
    const deadline = new Date(currentTermin.deadline);
    const now = new Date();
    return Math.ceil(
      (deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );
  }, [currentTermin]);

  const handleTerminClick = useCallback((termin: MVATermin) => {
    setSelectedTermin(termin);
    setTerminDialogOpen(true);
  }, []);

  const completedSteps = ciriTimeline.filter(
    (e) => e.type === "completed"
  ).length;
  const totalSteps = ciriTimeline.length;

  const tabs: { id: TabId; label: string; icon: typeof ListIcon }[] = [
    { id: "oversikt", label: "Oversikt", icon: BarChart3Icon },
    { id: "inntekter", label: "Inntekter", icon: TrendingUpIcon },
    { id: "kostnader", label: "Kostnader", icon: TrendingDownIcon },
    { id: "historikk", label: "Historikk", icon: HistoryIcon },
  ];

  return (
    <div className="mx-auto max-w-[1200px] space-y-5 pb-12">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-end justify-between"
      >
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight">
            MVA-oppgaver
          </h1>
          <p className="text-[13px] text-muted-foreground mt-0.5">
            Administrer og send MVA-meldinger til Altinn
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Autonomy toggle */}
          <div className="flex items-center gap-0.5 p-0.5 rounded-lg bg-muted/60">
            <Button
              variant={autonomyMode === "assistant" ? "default" : "ghost"}
              size="sm"
              className="h-7 text-xs gap-1.5"
              onClick={() => setAutonomyMode("assistant")}
            >
              <SparklesIcon className="size-3" />
              Assistent
            </Button>
            <Button
              variant={autonomyMode === "autonomous" ? "default" : "ghost"}
              size="sm"
              className="h-7 text-xs gap-1.5"
              onClick={() => setAutonomyMode("autonomous")}
            >
              <BrainCircuitIcon className="size-3" />
              Autonom
            </Button>
          </div>
          <div className="w-px h-5 bg-border" />
          <SAFTExportDialog>
            <Button variant="outline" size="sm" className="h-8 text-xs">
              <DownloadIcon className="size-3 mr-1.5" />
              SAF-T
            </Button>
          </SAFTExportDialog>
        </div>
      </motion.div>

      {/* Summary strip */}
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.04 }}
        className="relative grid grid-cols-5 gap-px rounded-xl border bg-border overflow-hidden"
      >
        <div className="bg-card px-4 py-3">
          <div className="flex items-center gap-1.5">
            <TrendingUpIcon className="size-3 text-rose-500" />
            <p className="text-[12px] uppercase tracking-wider text-muted-foreground/60 font-semibold">
              Utgående MVA
            </p>
          </div>
          <p className="text-lg font-display font-bold tabular-nums mt-0.5 leading-none">
            {krFmt(currentTermin?.utgaende ?? 0)}
          </p>
          <p className="text-[12px] text-muted-foreground mt-0.5">
            denne termin
          </p>
        </div>
        <div className="bg-card px-4 py-3">
          <div className="flex items-center gap-1.5">
            <TrendingDownIcon className="size-3 text-emerald-500" />
            <p className="text-[12px] uppercase tracking-wider text-muted-foreground/60 font-semibold">
              Inngående MVA
            </p>
          </div>
          <p className="text-lg font-display font-bold tabular-nums mt-0.5 leading-none">
            {krFmt(currentTermin?.inngaende ?? 0)}
          </p>
          <p className="text-[12px] text-muted-foreground mt-0.5">fradrag</p>
        </div>
        <div className="bg-card px-4 py-3">
          <div className="flex items-center gap-1.5">
            <ReceiptIcon className="size-3 text-[var(--primary)]" />
            <p className="text-[12px] uppercase tracking-wider text-muted-foreground/60 font-semibold">
              Netto å betale
            </p>
          </div>
          <p className="text-lg font-display font-bold tabular-nums mt-0.5 leading-none text-[var(--primary)]">
            {krFmt(Math.abs(currentTermin?.tilGode ?? 0))}
          </p>
          <p className="text-[12px] text-muted-foreground mt-0.5">
            {currentTermin?.termin}
          </p>
        </div>
        <div className="bg-card px-4 py-3">
          <div className="flex items-center gap-1.5">
            <CalendarIcon className="size-3" />
            <p className="text-[12px] uppercase tracking-wider text-muted-foreground/60 font-semibold">
              Frist
            </p>
          </div>
          <p
            className={cn(
              "text-lg font-display font-bold tabular-nums mt-0.5 leading-none",
              daysUntilDeadline != null && daysUntilDeadline <= 7
                ? "text-amber-600 dark:text-amber-400"
                : ""
            )}
          >
            {daysUntilDeadline != null ? `${daysUntilDeadline} dager` : "—"}
          </p>
          <p className="text-[12px] text-muted-foreground mt-0.5">
            10. feb 2026
          </p>
        </div>
        <div className="bg-card px-4 py-3">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <p className="text-[12px] uppercase tracking-wider text-muted-foreground/60 font-semibold cursor-help border-b border-dashed border-muted-foreground/30 w-fit">
                  Sendt i år
                </p>
              </TooltipTrigger>
              <TooltipContent
                side="bottom"
                className="max-w-[220px]"
              >
                <p className="text-xs leading-relaxed">
                  {submittedCount} av 6 terminer er sendt til Altinn for
                  2025.
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <div className="flex items-baseline gap-1 mt-0.5">
            <p className="text-lg font-display font-bold tabular-nums leading-none">
              {submittedCount}
            </p>
            <span className="text-[12px] text-muted-foreground">/ 6</span>
          </div>
          <div className="h-1 w-full overflow-hidden rounded-full bg-muted/60 mt-2">
            <motion.div
              initial={{ width: 0 }}
              animate={{
                width: `${Math.min((submittedCount / 6) * 100, 100)}%`,
              }}
              transition={{
                delay: 0.3,
                duration: 0.8,
                ease: [0.25, 0.46, 0.45, 0.94],
              }}
              className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400"
            />
          </div>
        </div>
      </motion.div>

      {/* Ciri status banner (autonomous mode) */}
      {autonomyMode === "autonomous" && currentTermin && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 }}
          className="flex items-center gap-4 rounded-xl border border-[var(--primary)]/20 bg-gradient-to-r from-[var(--primary)]/[0.04] to-transparent px-4 py-3"
        >
          <div className="relative shrink-0">
            <CiriLogo size="sm" />
            <span className="absolute -bottom-0.5 -right-0.5 flex size-2.5">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex size-2.5 rounded-full bg-green-500" />
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] leading-snug">
              <span className="font-medium">
                Ciri har gjennomgått alle 86 bilag
              </span>{" "}
              for {currentTermin.termin}. MVA-oppgaven er ferdig beregnet og
              validert.{" "}
              <span className="text-[var(--primary)] font-medium">
                Sendes automatisk 8. feb.
              </span>
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
              <DialogTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs gap-1.5"
                >
                  <FileTextIcon className="size-3" />
                  Se oppgave
                </Button>
              </DialogTrigger>
              <MVAPreviewDialog isAutoMode />
            </Dialog>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs text-muted-foreground"
            >
              <ClockIcon className="size-3 mr-1" />
              Utsett
            </Button>
          </div>
        </motion.div>
      )}

      {/* Assistant mode banner */}
      {autonomyMode === "assistant" && currentTermin && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 }}
          className="flex items-center gap-4 rounded-xl border border-[var(--primary)]/20 bg-gradient-to-r from-[var(--primary)]/[0.04] to-transparent px-4 py-3"
        >
          <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[var(--primary)]/10">
            <SendIcon className="size-4 text-[var(--primary)]" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[13px]">
              <span className="font-semibold">{currentTermin.termin}</span>{" "}
              ({currentTermin.period}) er klar til innsending.{" "}
              <span className="font-medium">
                kr {krFmt(Math.abs(currentTermin.tilGode))}
              </span>{" "}
              å betale innen{" "}
              {new Date(currentTermin.deadline!).toLocaleDateString("nb-NO", {
                day: "numeric",
                month: "long",
              })}
              .
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Dialog>
              <DialogTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs gap-1.5"
                >
                  <FileTextIcon className="size-3" />
                  Forhåndsvis
                </Button>
              </DialogTrigger>
              <MVAPreviewDialog />
            </Dialog>
            <Button size="sm" className="h-7 text-xs gap-1.5">
              <SendIcon className="size-3" />
              Send til Altinn
            </Button>
          </div>
        </motion.div>
      )}

      {/* Tab navigation */}
      <div className="flex items-center gap-1 border-b">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "relative flex items-center gap-1.5 px-3 py-2 text-[13px] font-medium transition-colors rounded-t-md",
                isActive
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground/80"
              )}
            >
              <Icon className="size-3.5" />
              {tab.label}
              {isActive && (
                <motion.div
                  layoutId="mva-tab-indicator"
                  className="absolute bottom-0 left-0 right-0 h-[2px] bg-[var(--primary)] rounded-full"
                  transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      <div className="min-h-[400px]">
        {/* ─── Oversikt tab ─── */}
        {activeTab === "oversikt" && (
          <motion.div
            key="oversikt"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className="space-y-5"
          >
            {/* Current period detail + Ciri timeline side by side */}
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-5">
              {/* Left: Current period breakdown */}
              <div className="rounded-xl border bg-card overflow-hidden flex flex-col">
                  <div className="px-5 py-3 border-b bg-muted/20">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <ReceiptIcon className="size-4 text-[var(--primary)]" />
                        <h3 className="text-sm font-semibold">
                          {currentTermin?.termin ?? "Ingen aktiv termin"} —{" "}
                          {currentTermin?.period}
                        </h3>
                      </div>
                      <Badge
                        variant="outline"
                        className="text-[12px] border-[var(--primary)]/30 text-[var(--primary)]"
                      >
                        Klar til sending
                      </Badge>
                    </div>
                  </div>
                  <div className="p-5 space-y-4 flex-1 flex flex-col">
                    {/* Three-column breakdown */}
                    <div className="grid grid-cols-3 gap-4">
                      <div className="rounded-lg border bg-muted/20 p-3">
                        <div className="flex items-center gap-1.5 mb-1">
                          <TrendingUpIcon className="size-3 text-rose-500" />
                          <span className="text-[12px] uppercase tracking-wider text-muted-foreground font-semibold">
                            Utgående
                          </span>
                        </div>
                        <p className="text-xl font-display font-bold tabular-nums">
                          kr {krFmt(currentTermin?.utgaende ?? 0)}
                        </p>
                      </div>
                      <div className="rounded-lg border bg-muted/20 p-3">
                        <div className="flex items-center gap-1.5 mb-1">
                          <TrendingDownIcon className="size-3 text-emerald-500" />
                          <span className="text-[12px] uppercase tracking-wider text-muted-foreground font-semibold">
                            Inngående
                          </span>
                        </div>
                        <p className="text-xl font-display font-bold tabular-nums">
                          kr {krFmt(currentTermin?.inngaende ?? 0)}
                        </p>
                      </div>
                      <div className="rounded-lg border bg-[var(--primary)]/[0.04] border-[var(--primary)]/15 p-3">
                        <div className="flex items-center gap-1.5 mb-1">
                          <ReceiptIcon className="size-3 text-[var(--primary)]" />
                          <span className="text-[12px] uppercase tracking-wider text-muted-foreground font-semibold">
                            Å betale
                          </span>
                        </div>
                        <p className="text-xl font-display font-bold tabular-nums text-[var(--primary)]">
                          kr {krFmt(Math.abs(currentTermin?.tilGode ?? 0))}
                        </p>
                      </div>
                    </div>

                    {/* Validation */}
                    <div className="flex items-center gap-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/40 px-3 py-2">
                      <ShieldCheckIcon className="size-4 text-emerald-600 shrink-0" />
                      <p className="text-[12px] text-emerald-700 dark:text-emerald-400">
                        86 bilag validert mot SAF-T. Ingen advarsler.
                      </p>
                    </div>

                    {/* Year totals compact */}
                    <div className="flex items-center gap-6 pt-2 border-t border-dashed border-border/60 mt-auto">
                      <div className="flex items-center gap-2">
                        <span className="text-[13px] text-muted-foreground">
                          Årstotal utgående:
                        </span>
                        <span className="text-[13px] font-display font-semibold tabular-nums">
                          kr {krFmt(totalUtgaende)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[13px] text-muted-foreground">
                          Årstotal inngående:
                        </span>
                        <span className="text-[13px] font-display font-semibold tabular-nums">
                          kr {krFmt(totalInngaende)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[13px] text-muted-foreground">
                          Netto betalt:
                        </span>
                        <span className="text-[13px] font-display font-semibold tabular-nums text-[var(--primary)]">
                          kr {krFmt(totalNetto)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

              {/* Right: Ciri activity timeline (compact) */}
              <div className="rounded-xl border bg-card overflow-hidden">
                <div className="px-4 py-3 border-b bg-muted/20">
                  <div className="flex items-center gap-2">
                    <ClockIcon className="size-3.5 text-muted-foreground" />
                    <h3 className="text-[13px] font-semibold">
                      Ciri-aktivitet
                    </h3>
                    <span className="text-[12px] text-muted-foreground ml-auto">
                      {completedSteps}/{totalSteps} fullført
                    </span>
                  </div>
                </div>
                <div className="p-3 max-h-[320px] overflow-y-auto">
                  <div className="relative">
                    <div className="absolute left-[11px] top-2 bottom-2 w-px bg-gradient-to-b from-emerald-400/60 via-[var(--primary)]/30 to-[var(--primary)]/15" />
                    <div className="space-y-0.5">
                      {ciriTimeline.map((event) => {
                        const Icon = event.icon;
                        const isScheduled = event.type === "scheduled";
                        return (
                          <div
                            key={event.id}
                            className="relative flex items-start gap-2.5 py-1.5 pl-0.5"
                          >
                            <div
                              className={cn(
                                "relative z-10 flex size-[22px] shrink-0 items-center justify-center rounded-full border bg-background",
                                isScheduled
                                  ? "border-dashed border-[var(--primary)]/40"
                                  : "border-emerald-400/60"
                              )}
                            >
                              <Icon
                                className={cn(
                                  "size-2.5",
                                  isScheduled
                                    ? "text-[var(--primary)]/60"
                                    : "text-emerald-600"
                                )}
                              />
                            </div>
                            <div className="flex-1 min-w-0 pt-0.5">
                              <p
                                className={cn(
                                  "text-[13px] leading-snug",
                                  isScheduled && "text-muted-foreground"
                                )}
                              >
                                {event.action}
                              </p>
                            </div>
                            <span className="text-[13px] text-muted-foreground tabular-nums shrink-0 pt-1">
                              {isScheduled
                                ? new Date(
                                    event.timestamp.replace(" ", "T")
                                  ).toLocaleDateString("nb-NO", {
                                    day: "numeric",
                                    month: "short",
                                  })
                                : event.timestamp.split(" ")[1]}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* ─── Inntekter tab ─── */}
        {activeTab === "inntekter" && (
          <motion.div
            key="inntekter"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
          >
            <IncomeDetailsCard />
          </motion.div>
        )}

        {/* ─── Kostnader tab ─── */}
        {activeTab === "kostnader" && (
          <motion.div
            key="kostnader"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
          >
            <ExpenseDetailsCard />
          </motion.div>
        )}

        {/* ─── Historikk tab ─── */}
        {activeTab === "historikk" && (
          <motion.div
            key="historikk"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className="space-y-3"
          >
            <div className="rounded-xl border bg-card overflow-hidden">
              <div className="px-5 py-3 border-b bg-muted/20">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold">
                    Alle terminer 2025
                  </h3>
                  <span className="text-[13px] text-muted-foreground">
                    {submittedCount} av 6 sendt
                  </span>
                </div>
              </div>
              <div className="divide-y divide-border/50">
                {mvaTerminer.map((termin) => {
                  const status =
                    statusConfig[
                      termin.status as keyof typeof statusConfig
                    ] ?? statusConfig.upcoming;
                  const StatusIcon = status.icon;
                  const isActive = termin.status === "ready";

                  return (
                    <div
                      key={termin.id}
                      onClick={() => handleTerminClick(termin)}
                      className={cn(
                        "group flex items-center gap-4 px-5 py-3.5 cursor-pointer transition-colors hover:bg-muted/30",
                        isActive && "bg-[var(--primary)]/[0.03]"
                      )}
                    >
                      <div
                        className={cn(
                          "flex size-8 shrink-0 items-center justify-center rounded-full",
                          status.bgColor
                        )}
                      >
                        <StatusIcon
                          className={cn("size-4", status.color)}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-[13px] font-medium">
                            {termin.termin}
                          </p>
                          <span className="text-[13px] text-muted-foreground">
                            {termin.period}
                          </span>
                          {termin.status === "submitted" &&
                            autonomyMode === "autonomous" && (
                              <Badge
                                variant="secondary"
                                className="gap-0.5 text-[12px] h-4 px-1.5"
                              >
                                <SparklesIcon className="size-2.5" />
                                Ciri
                              </Badge>
                            )}
                        </div>
                        <p className="text-[13px] text-muted-foreground">
                          {termin.status === "submitted"
                            ? `Sendt ${new Date(termin.submittedDate!).toLocaleDateString("nb-NO")}`
                            : termin.status === "ready"
                              ? `Frist: ${new Date(termin.deadline!).toLocaleDateString("nb-NO")}`
                              : "Kommende"}
                        </p>
                      </div>
                      <div className="hidden sm:grid grid-cols-3 gap-6 text-right">
                        <div>
                          <p className="text-[12px] text-muted-foreground">
                            Utgående
                          </p>
                          <p className="text-[13px] font-display font-medium tabular-nums">
                            {krFmt(termin.utgaende)}
                          </p>
                        </div>
                        <div>
                          <p className="text-[12px] text-muted-foreground">
                            Inngående
                          </p>
                          <p className="text-[13px] font-display font-medium tabular-nums">
                            {krFmt(termin.inngaende)}
                          </p>
                        </div>
                        <div>
                          <p className="text-[12px] text-muted-foreground">
                            Netto
                          </p>
                          <p className="text-[13px] font-display font-medium tabular-nums text-[var(--primary)]">
                            {krFmt(Math.abs(termin.tilGode))}
                          </p>
                        </div>
                      </div>
                      <ChevronRightIcon className="size-3.5 text-muted-foreground opacity-0 group-hover:opacity-60 transition-opacity shrink-0" />
                    </div>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {/* Termin detail dialog (shared) */}
      <TerminDetailDialog
        termin={selectedTermin}
        open={terminDialogOpen}
        onOpenChange={setTerminDialogOpen}
        autonomyMode={autonomyMode}
      />

      <LearnMoreDocs sections={["mva", "bokforing"]} />
    </div>
  );
}
