"use client";

import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  UsersIcon,
  CalendarIcon,
  BanknoteIcon,
  WalletIcon,
  UmbrellaIcon,
  CheckCircle2Icon,
  SendIcon,
  ClockIcon,
  ChevronRightIcon,
  SparklesIcon,
  FileTextIcon,
  PlayIcon,
  ListIcon,
  ReceiptIcon,
  BarChart3Icon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import LearnMoreDocs from "@/components/learn-more-docs";
import CiriLogo from "@/components/layout/ciri-logo";
import { employees } from "./data/employees";
import { payrollRuns } from "./data/payroll-runs";
import { payrollTimeline } from "./data/payroll-timeline";
import { AddEmployeeDialog, EmployeeDialog } from "./components";
import type { PayrollRun } from "./types";

// ============================================================================
// HELPERS
// ============================================================================

function krFmt(n: number) {
  return Math.abs(n).toLocaleString("nb-NO");
}

type TabId = "ansatte" | "lonnskjoring" | "rapportering";

// ============================================================================
// MAIN PAGE
// ============================================================================

export default function LonnPage() {
  const [activeTab, setActiveTab] = useState<TabId>("ansatte");

  const activeEmployees = employees.filter((e) => e.status === "active");
  const totalSalary = activeEmployees.reduce((acc, e) => acc + e.salary, 0);
  const totalFeriepenger = employees.reduce(
    (acc, e) => acc + e.feriepenger,
    0
  );

  const nextRun = payrollRuns.find((r) => r.status === "ready");
  const completedRuns = payrollRuns.filter((r) => r.status === "completed");
  const ameldingSent = completedRuns.filter(
    (r) => r.ameldingStatus === "sent"
  ).length;

  const daysUntilPayroll = useMemo(() => {
    if (!nextRun) return null;
    const payDate = new Date(nextRun.date);
    const now = new Date();
    return Math.ceil(
      (payDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );
  }, [nextRun]);

  const totalMonthlyCost = useMemo(() => {
    if (!nextRun) return 0;
    return nextRun.totalCost;
  }, [nextRun]);

  const completedSteps = payrollTimeline.filter(
    (e) => e.type === "completed"
  ).length;
  const totalSteps = payrollTimeline.length;

  const tabs: { id: TabId; label: string; icon: typeof ListIcon }[] = [
    { id: "ansatte", label: "Ansatte", icon: UsersIcon },
    { id: "lonnskjoring", label: "Lønnskjøring", icon: BanknoteIcon },
    { id: "rapportering", label: "Rapportering", icon: BarChart3Icon },
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
            Lønn
          </h1>
          <p className="text-[13px] text-muted-foreground mt-0.5">
            {employees.length} ansatte · neste lønning{" "}
            {nextRun
              ? new Date(nextRun.date).toLocaleDateString("nb-NO", {
                  day: "numeric",
                  month: "long",
                })
              : "—"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <AddEmployeeDialog />
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
            <UsersIcon className="size-3 text-[var(--primary)]" />
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground/60 font-semibold">
              Ansatte
            </p>
          </div>
          <div className="flex items-baseline gap-1 mt-0.5">
            <p className="text-lg font-display font-bold tabular-nums leading-none">
              {activeEmployees.length}
            </p>
            <span className="text-[10px] text-muted-foreground">
              / {employees.length}
            </span>
          </div>
          <p className="text-[10px] text-muted-foreground mt-0.5">aktive</p>
        </div>
        <div className="bg-card px-4 py-3">
          <div className="flex items-center gap-1.5">
            <CalendarIcon className="size-3" />
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground/60 font-semibold">
              Neste lønning
            </p>
          </div>
          <p
            className={cn(
              "text-lg font-display font-bold tabular-nums mt-0.5 leading-none",
              daysUntilPayroll != null && daysUntilPayroll <= 3
                ? "text-amber-600 dark:text-amber-400"
                : ""
            )}
          >
            {daysUntilPayroll != null ? `${daysUntilPayroll} dager` : "—"}
          </p>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            {nextRun
              ? new Date(nextRun.date).toLocaleDateString("nb-NO", {
                  day: "numeric",
                  month: "short",
                })
              : ""}
          </p>
        </div>
        <div className="bg-card px-4 py-3">
          <div className="flex items-center gap-1.5">
            <BanknoteIcon className="size-3 text-emerald-500" />
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground/60 font-semibold">
              Brutto utbetaling
            </p>
          </div>
          <p className="text-lg font-display font-bold tabular-nums mt-0.5 leading-none">
            {krFmt(totalSalary)}
          </p>
          <p className="text-[10px] text-muted-foreground mt-0.5">per måned</p>
        </div>
        <div className="bg-card px-4 py-3">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-1.5">
                  <WalletIcon className="size-3 text-rose-500" />
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground/60 font-semibold cursor-help border-b border-dashed border-muted-foreground/30 w-fit">
                    Total kostnad
                  </p>
                </div>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-[240px]">
                <p className="text-xs leading-relaxed">
                  Inkluderer bruttolønn, arbeidsgiveravgift (14,1%), OTP (2%) og
                  feriepenger (12%).
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <p className="text-lg font-display font-bold tabular-nums mt-0.5 leading-none text-[var(--primary)]">
            {krFmt(totalMonthlyCost)}
          </p>
          <p className="text-[10px] text-muted-foreground mt-0.5">per måned</p>
        </div>
        <div className="bg-card px-4 py-3">
          <div className="flex items-center gap-1.5">
            <UmbrellaIcon className="size-3 text-sky-500" />
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground/60 font-semibold">
              Feriepenger
            </p>
          </div>
          <p className="text-lg font-display font-bold tabular-nums mt-0.5 leading-none">
            {krFmt(totalFeriepenger)}
          </p>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            opptjent i år
          </p>
        </div>
      </motion.div>

      {/* Ciri status banner */}
      {nextRun && (
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
                Lønnskjøring for {nextRun.month.toLowerCase()} er klar.
              </span>{" "}
              {nextRun.lineItems.length} ansatte, kr {krFmt(nextRun.totalNet)}{" "}
              utbetales.{" "}
              <span className="text-[var(--primary)] font-medium">
                A-melding sendes automatisk innen 5.{" "}
                {new Date(
                  new Date(nextRun.date).setMonth(
                    new Date(nextRun.date).getMonth() + 1
                  )
                ).toLocaleDateString("nb-NO", { month: "short" })}
                .
              </span>
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs gap-1.5"
              onClick={() => setActiveTab("lonnskjoring")}
            >
              <FileTextIcon className="size-3" />
              Se detaljer
            </Button>
            <Button size="sm" className="h-7 text-xs gap-1.5">
              <PlayIcon className="size-3" />
              Kjør lønn
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
                  layoutId="lonn-tab-indicator"
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
        {/* ─── Ansatte tab ─── */}
        {activeTab === "ansatte" && (
          <motion.div
            key="ansatte"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className="space-y-4"
          >
            <div className="rounded-xl border bg-card overflow-hidden">
              <div className="px-5 py-3 border-b bg-muted/20">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold">
                    Alle ansatte ({employees.length})
                  </h3>
                  <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                    <span>{activeEmployees.length} aktive</span>
                    <span>
                      {employees.length - activeEmployees.length} ferie/permisjon
                    </span>
                  </div>
                </div>
              </div>
              {/* Compact table header */}
              <div className="hidden sm:grid grid-cols-[1fr_120px_80px_100px_80px] gap-4 px-5 py-2 border-b bg-muted/10 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                <span>Ansatt</span>
                <span className="text-right">Bruttolønn</span>
                <span className="text-right">Skatt %</span>
                <span className="text-right">Netto</span>
                <span className="text-right">Status</span>
              </div>
              <div className="divide-y divide-border/50">
                {employees.map((employee) => {
                  const netSalary = Math.round(
                    employee.salary * (1 - employee.taxRate / 100)
                  );
                  return (
                    <EmployeeDialog key={employee.id} employee={employee}>
                      <div className="group flex items-center gap-4 px-5 py-3 cursor-pointer transition-colors hover:bg-muted/30">
                        <div className="sm:grid sm:grid-cols-[1fr_120px_80px_100px_80px] sm:gap-4 sm:items-center flex-1">
                          {/* Name + position */}
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[var(--primary)]/10 font-medium text-[var(--primary)] text-xs">
                              {employee.name
                                .split(" ")
                                .map((n) => n[0])
                                .join("")}
                            </div>
                            <div className="min-w-0">
                              <p className="text-[13px] font-medium truncate">
                                {employee.name}
                              </p>
                              <p className="text-[11px] text-muted-foreground truncate">
                                {employee.position} ·{" "}
                                {employee.employmentType === "fast"
                                  ? "Fast"
                                  : "Deltid"}
                              </p>
                            </div>
                          </div>
                          {/* Salary columns - hidden on mobile */}
                          <p className="hidden sm:block text-[13px] font-medium tabular-nums text-right">
                            kr {employee.salary.toLocaleString("nb-NO")}
                          </p>
                          <p className="hidden sm:block text-[13px] tabular-nums text-right text-muted-foreground">
                            {employee.taxRate}%
                          </p>
                          <p className="hidden sm:block text-[13px] font-medium tabular-nums text-right">
                            kr {netSalary.toLocaleString("nb-NO")}
                          </p>
                          <div className="hidden sm:flex justify-end">
                            {employee.status === "vacation" ? (
                              <Badge
                                variant="outline"
                                className="text-[10px] h-5 border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-400"
                              >
                                Ferie
                              </Badge>
                            ) : (
                              <Badge
                                variant="outline"
                                className="text-[10px] h-5 border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-400"
                              >
                                Aktiv
                              </Badge>
                            )}
                          </div>
                        </div>
                        <ChevronRightIcon className="size-3.5 text-muted-foreground opacity-0 group-hover:opacity-60 transition-opacity shrink-0" />
                      </div>
                    </EmployeeDialog>
                  );
                })}
              </div>
            </div>

            {/* Employee cost summary */}
            <div className="flex items-center gap-6 rounded-xl border bg-card px-5 py-3">
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-muted-foreground">
                  Brutto mnd:
                </span>
                <span className="text-[13px] font-display font-semibold tabular-nums">
                  kr {krFmt(totalSalary)}
                </span>
              </div>
              <div className="w-px h-4 bg-border" />
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-muted-foreground">
                  AGA (14,1%):
                </span>
                <span className="text-[13px] font-display font-semibold tabular-nums">
                  kr {krFmt(Math.round(totalSalary * 0.141))}
                </span>
              </div>
              <div className="w-px h-4 bg-border" />
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-muted-foreground">
                  OTP (2%):
                </span>
                <span className="text-[13px] font-display font-semibold tabular-nums">
                  kr {krFmt(Math.round(totalSalary * 0.02))}
                </span>
              </div>
              <div className="w-px h-4 bg-border" />
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-muted-foreground">
                  Total:
                </span>
                <span className="text-[13px] font-display font-bold tabular-nums text-[var(--primary)]">
                  kr {krFmt(totalMonthlyCost)}
                </span>
              </div>
            </div>
          </motion.div>
        )}

        {/* ─── Lønnskjøring tab ─── */}
        {activeTab === "lonnskjoring" && (
          <motion.div
            key="lonnskjoring"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className="space-y-5"
          >
            {/* Current/next payroll run */}
            {nextRun && <PayrollRunCard run={nextRun} isNext />}

            {/* Past runs */}
            {completedRuns.length > 0 && (
              <div className="rounded-xl border bg-card overflow-hidden">
                <div className="px-5 py-3 border-b bg-muted/20">
                  <h3 className="text-sm font-semibold">
                    Tidligere lønnskjøringer
                  </h3>
                </div>
                <div className="divide-y divide-border/50">
                  {completedRuns.map((run) => (
                    <div
                      key={run.id}
                      className="group flex items-center gap-4 px-5 py-3.5 cursor-pointer transition-colors hover:bg-muted/30"
                    >
                      <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30">
                        <CheckCircle2Icon className="size-4 text-emerald-600 dark:text-emerald-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-[13px] font-medium">{run.month}</p>
                          <Badge
                            variant="secondary"
                            className="gap-0.5 text-[10px] h-4 px-1.5"
                          >
                            <SparklesIcon className="size-2.5" />
                            Ciri
                          </Badge>
                        </div>
                        <p className="text-[11px] text-muted-foreground">
                          Utbetalt{" "}
                          {new Date(run.date).toLocaleDateString("nb-NO")} ·
                          A-melding sendt
                        </p>
                      </div>
                      <div className="hidden sm:grid grid-cols-3 gap-6 text-right">
                        <div>
                          <p className="text-[10px] text-muted-foreground">
                            Brutto
                          </p>
                          <p className="text-[13px] font-display font-medium tabular-nums">
                            {krFmt(run.totalGross)}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] text-muted-foreground">
                            Netto
                          </p>
                          <p className="text-[13px] font-display font-medium tabular-nums">
                            {krFmt(run.totalNet)}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] text-muted-foreground">
                            Total kost
                          </p>
                          <p className="text-[13px] font-display font-medium tabular-nums text-[var(--primary)]">
                            {krFmt(run.totalCost)}
                          </p>
                        </div>
                      </div>
                      <ChevronRightIcon className="size-3.5 text-muted-foreground opacity-0 group-hover:opacity-60 transition-opacity shrink-0" />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}

        {/* ─── Rapportering tab ─── */}
        {activeTab === "rapportering" && (
          <motion.div
            key="rapportering"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className="space-y-5"
          >
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-5">
              {/* Left: A-melding progress + feriepenger forecast */}
              <div className="space-y-4">
                {/* A-melding progress */}
                <div className="rounded-xl border bg-card overflow-hidden">
                  <div className="px-5 py-3 border-b bg-muted/20">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <SendIcon className="size-4 text-[var(--primary)]" />
                        <h3 className="text-sm font-semibold">
                          A-meldinger 2026
                        </h3>
                      </div>
                      <span className="text-[11px] text-muted-foreground">
                        {ameldingSent} av 12 sendt
                      </span>
                    </div>
                  </div>
                  <div className="p-5 space-y-4">
                    {/* Month grid */}
                    <div className="grid grid-cols-12 gap-1">
                      {Array.from({ length: 12 }, (_, i) => {
                        const monthNames = [
                          "Jan",
                          "Feb",
                          "Mar",
                          "Apr",
                          "Mai",
                          "Jun",
                          "Jul",
                          "Aug",
                          "Sep",
                          "Okt",
                          "Nov",
                          "Des",
                        ];
                        const isSent = i < ameldingSent;
                        const isNext = i === ameldingSent;
                        return (
                          <div key={i} className="text-center">
                            <div
                              className={cn(
                                "h-8 rounded-md border flex items-center justify-center text-[10px] font-medium transition-colors",
                                isSent &&
                                  "bg-emerald-100 dark:bg-emerald-900/30 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400",
                                isNext &&
                                  "bg-[var(--primary)]/10 border-[var(--primary)]/30 text-[var(--primary)]",
                                !isSent &&
                                  !isNext &&
                                  "bg-muted/30 text-muted-foreground/50"
                              )}
                            >
                              {isSent ? (
                                <CheckCircle2Icon className="size-3" />
                              ) : isNext ? (
                                <ClockIcon className="size-3" />
                              ) : null}
                            </div>
                            <p className="text-[9px] text-muted-foreground mt-1">
                              {monthNames[i]}
                            </p>
                          </div>
                        );
                      })}
                    </div>

                    {/* Validation status */}
                    <div className="flex items-center gap-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/40 px-3 py-2">
                      <CheckCircle2Icon className="size-4 text-emerald-600 shrink-0" />
                      <p className="text-[12px] text-emerald-700 dark:text-emerald-400">
                        Alle sendte A-meldinger er godkjent av Skatteetaten.
                        Ingen feil eller advarsler.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Feriepenger forecast */}
                <div className="rounded-xl border bg-card overflow-hidden">
                  <div className="px-5 py-3 border-b bg-muted/20">
                    <div className="flex items-center gap-2">
                      <UmbrellaIcon className="size-4 text-sky-500" />
                      <h3 className="text-sm font-semibold">
                        Feriepenger-prognose
                      </h3>
                    </div>
                  </div>
                  <div className="p-5 space-y-3">
                    <div className="grid grid-cols-3 gap-4">
                      <div className="rounded-lg border bg-muted/20 p-3">
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                          Opptjent i år
                        </p>
                        <p className="text-xl font-display font-bold tabular-nums mt-1">
                          kr {krFmt(totalFeriepenger)}
                        </p>
                      </div>
                      <div className="rounded-lg border bg-muted/20 p-3">
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                          Utbetales juni
                        </p>
                        <p className="text-xl font-display font-bold tabular-nums mt-1 text-sky-600 dark:text-sky-400">
                          kr {krFmt(totalFeriepenger)}
                        </p>
                      </div>
                      <div className="rounded-lg border bg-muted/20 p-3">
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                          Sett av / mnd
                        </p>
                        <p className="text-xl font-display font-bold tabular-nums mt-1">
                          kr {krFmt(Math.round(totalFeriepenger / 12))}
                        </p>
                      </div>
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      Feriepenger utbetales i juni og erstatter vanlig lønn
                      under ferie. Ciri setter automatisk av 12% av brutto hver
                      måned slik at du unngår likviditetspresset i juni.
                    </p>
                    {/* Progress toward June payout */}
                    <div>
                      <div className="flex items-center justify-between text-[11px] mb-1">
                        <span className="text-muted-foreground">
                          Avsatt hittil (feb)
                        </span>
                        <span className="font-medium tabular-nums">
                          kr {krFmt(Math.round((totalFeriepenger / 12) * 2))} av
                          kr {krFmt(totalFeriepenger)}
                        </span>
                      </div>
                      <Progress
                        value={Math.round((2 / 12) * 100)}
                        className="h-1.5"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Right: Ciri activity timeline */}
              <div className="rounded-xl border bg-card overflow-hidden lg:self-start">
                <div className="px-4 py-3 border-b bg-muted/20">
                  <div className="flex items-center gap-2">
                    <ClockIcon className="size-3.5 text-muted-foreground" />
                    <h3 className="text-[13px] font-semibold">
                      Ciri-aktivitet
                    </h3>
                    <span className="text-[10px] text-muted-foreground ml-auto">
                      {completedSteps}/{totalSteps} fullført
                    </span>
                  </div>
                </div>
                <div className="p-3 max-h-[420px] overflow-y-auto">
                  <div className="relative">
                    <div className="absolute left-[11px] top-2 bottom-2 w-px bg-gradient-to-b from-emerald-400/60 via-[var(--primary)]/30 to-[var(--primary)]/15" />
                    <div className="space-y-0.5">
                      {payrollTimeline.map((event) => {
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
                                  "text-[11px] leading-snug",
                                  isScheduled && "text-muted-foreground"
                                )}
                              >
                                {event.action}
                              </p>
                            </div>
                            <span className="text-[9px] text-muted-foreground tabular-nums shrink-0 pt-1">
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
      </div>

      <LearnMoreDocs sections={["lonn", "rapporter"]} />
    </div>
  );
}

// ============================================================================
// PAYROLL RUN CARD (used in Lønnskjøring tab)
// ============================================================================

function PayrollRunCard({
  run,
  isNext,
}: {
  run: PayrollRun;
  isNext?: boolean;
}) {
  return (
    <div className="rounded-xl border bg-card overflow-hidden">
      <div className="px-5 py-3 border-b bg-muted/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ReceiptIcon className="size-4 text-[var(--primary)]" />
            <h3 className="text-sm font-semibold">
              {run.month}
              {isNext && " — neste kjøring"}
            </h3>
          </div>
          <Badge
            variant="outline"
            className={cn(
              "text-[10px]",
              isNext
                ? "border-[var(--primary)]/30 text-[var(--primary)]"
                : "border-emerald-200 text-emerald-700"
            )}
          >
            {isNext ? "Klar til utbetaling" : "Fullført"}
          </Badge>
        </div>
      </div>
      <div className="p-5 space-y-4">
        {/* Per-employee breakdown */}
        <div className="rounded-lg border overflow-hidden">
          <div className="grid grid-cols-[1fr_100px_100px_100px] gap-4 px-4 py-2 bg-muted/20 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
            <span>Ansatt</span>
            <span className="text-right">Brutto</span>
            <span className="text-right">Skattetrekk</span>
            <span className="text-right">Utbetalt</span>
          </div>
          <div className="divide-y divide-border/50">
            {run.lineItems.map((item) => (
              <div
                key={item.employeeId}
                className="grid grid-cols-[1fr_100px_100px_100px] gap-4 px-4 py-2.5"
              >
                <span className="text-[13px] font-medium truncate">
                  {item.employeeName}
                </span>
                <span className="text-[13px] tabular-nums text-right">
                  {krFmt(item.gross)}
                </span>
                <span className="text-[13px] tabular-nums text-right text-red-600 dark:text-red-400">
                  -{krFmt(item.skattetrekk)}
                </span>
                <span className="text-[13px] font-medium tabular-nums text-right">
                  {krFmt(item.net)}
                </span>
              </div>
            ))}
          </div>
          {/* Totals */}
          <div className="grid grid-cols-[1fr_100px_100px_100px] gap-4 px-4 py-2.5 border-t bg-muted/10">
            <span className="text-[13px] font-semibold">Sum</span>
            <span className="text-[13px] font-semibold tabular-nums text-right">
              {krFmt(run.totalGross)}
            </span>
            <span className="text-[13px] font-semibold tabular-nums text-right text-red-600 dark:text-red-400">
              -{krFmt(run.totalSkattetrekk)}
            </span>
            <span className="text-[13px] font-display font-bold tabular-nums text-right">
              {krFmt(run.totalNet)}
            </span>
          </div>
        </div>

        {/* Employer costs */}
        <div className="flex items-center gap-6 pt-2 border-t border-dashed border-border/60">
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-muted-foreground">
              Arbeidsgiveravgift:
            </span>
            <span className="text-[13px] font-display font-semibold tabular-nums">
              kr {krFmt(run.totalArbeidsgiveravgift)}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-muted-foreground">OTP:</span>
            <span className="text-[13px] font-display font-semibold tabular-nums">
              kr {krFmt(run.totalOtp)}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-muted-foreground">
              Feriepenger:
            </span>
            <span className="text-[13px] font-display font-semibold tabular-nums">
              kr {krFmt(run.totalFeriepengerAccrual)}
            </span>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <span className="text-[11px] text-muted-foreground">
              Total kostnad:
            </span>
            <span className="text-[13px] font-display font-bold tabular-nums text-[var(--primary)]">
              kr {krFmt(run.totalCost)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
