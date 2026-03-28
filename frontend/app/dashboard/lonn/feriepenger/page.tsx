"use client";

import { useState, useMemo } from "react";
import dynamic from "next/dynamic";
import { motion } from "framer-motion";
import { Progress } from "@/components/ui/progress";
import {
  UmbrellaIcon,
  WalletIcon,
  BanknoteIcon,
  PiggyBankIcon,
  CalendarDaysIcon,
  EyeIcon,
  UsersIcon,
  TargetIcon,
  ClockIcon,
  SettingsIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import CiriLogo from "@/components/layout/ciri-logo";
import { useFeriepengerConfig } from "./hooks/use-feriepenger-config";
import {
  buildEmployeeFeriepenger,
  totalVacationDaysUsedFrom,
  totalVacationDaysTotalFrom,
} from "./data/feriepenger-employees";
import { buildMonthlyAccrualData } from "./data/feriepenger-monthly";
import { buildScenarios } from "./data/feriepenger-scenarios";
import { buildTimeline } from "./data/feriepenger-timeline";

// Dynamic imports for chart components (Recharts ~100KB)
const AccrualAreaChart = dynamic(
  () => import("./components/accrual-area-chart"),
  { ssr: false }
);
const SetAsideBarChart = dynamic(
  () => import("./components/set-aside-bar-chart"),
  { ssr: false }
);

// Non-chart components
import {
  LiquidityImpactCard,
  EmployeeFeriepengerTable,
  FeriepengerSetup,
} from "./components";

// ============================================================================
// HELPERS
// ============================================================================

function krFmt(n: number) {
  return Math.abs(n).toLocaleString("nb-NO");
}

type TabId = "oversikt" | "per-ansatt" | "planlegging";

// ============================================================================
// MAIN PAGE
// ============================================================================

export default function FeriepengerPage() {
  const [activeTab, setActiveTab] = useState<TabId>("oversikt");
  const {
    isConfigured,
    saveConfig,
    resetConfig,
    computedRates,
    averageRate,
  } = useFeriepengerConfig();

  // ── Derived data (recomputed when config changes) ──

  const employeeData = useMemo(
    () => buildEmployeeFeriepenger(computedRates),
    [computedRates]
  );

  const monthly = useMemo(
    () => buildMonthlyAccrualData(averageRate),
    [averageRate]
  );

  const scenarios = useMemo(
    () => buildScenarios(monthly.TOTAL_FERIEPENGER_PAYOUT),
    [monthly.TOTAL_FERIEPENGER_PAYOUT]
  );

  const timeline = useMemo(
    () =>
      buildTimeline(
        monthly.TOTAL_FERIEPENGER_PAYOUT,
        monthly.MONTHLY_SET_ASIDE,
        employeeData.length
      ),
    [monthly.TOTAL_FERIEPENGER_PAYOUT, monthly.MONTHLY_SET_ASIDE, employeeData.length]
  );

  const totalVacationDaysUsed = totalVacationDaysUsedFrom(employeeData);
  const totalVacationDaysTotal = totalVacationDaysTotalFrom(employeeData);
  const setAsideProgress = Math.round((monthly.MONTHS_ELAPSED / 12) * 100);
  const completedSteps = timeline.filter((e) => e.type === "completed").length;
  const totalSteps = timeline.length;

  // Rate label for Ciri banner
  const rateLabel = useMemo(() => {
    const rates = new Set(computedRates.map((r) => r.rateLabel));
    if (rates.size === 1) return computedRates[0]?.rateLabel ?? "12 %";
    return "10,2\u201312 %";
  }, [computedRates]);

  // ── Show setup wizard if not configured ──

  if (!isConfigured) {
    return (
      <div className="mx-auto max-w-[1200px] pb-12">
        <FeriepengerSetup onComplete={saveConfig} />
      </div>
    );
  }

  // ── Configured: show full dashboard ──

  const tabs: { id: TabId; label: string; icon: typeof EyeIcon }[] = [
    { id: "oversikt", label: "Oversikt", icon: EyeIcon },
    { id: "per-ansatt", label: "Per ansatt", icon: UsersIcon },
    { id: "planlegging", label: "Planlegging", icon: TargetIcon },
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
            Feriepenger
          </h1>
          <p className="text-[13px] text-muted-foreground mt-0.5">
            {employeeData.length} ansatte &middot; kr{" "}
            {krFmt(monthly.TOTAL_FERIEPENGER_PAYOUT)} utbetales juni 2026
          </p>
        </div>
        <button
          onClick={resetConfig}
          className="flex items-center gap-1.5 text-[13px] text-muted-foreground hover:text-foreground transition-colors rounded-md px-2 py-1 hover:bg-muted/50"
          title="Kj\u00f8r oppsett p\u00e5 nytt"
        >
          <SettingsIcon className="size-3" />
          Endre oppsett
        </button>
      </motion.div>

      {/* Stats strip */}
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.04 }}
        className="relative grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-px rounded-xl border bg-border overflow-hidden"
      >
        {/* Cell 1: Opptjent i \u00e5r */}
        <div className="bg-card px-4 py-3">
          <div className="flex items-center gap-1.5">
            <UmbrellaIcon className="size-3 text-[var(--primary)]" />
            <p className="text-[12px] uppercase tracking-wider text-muted-foreground/60 font-semibold">
              Opptjent i \u00e5r
            </p>
          </div>
          <p className="text-lg font-display font-bold tabular-nums mt-0.5 leading-none">
            kr {krFmt(monthly.ACCRUED_YTD)}
          </p>
          <p className="text-[12px] text-muted-foreground mt-0.5">
            2026 (jan\u2013feb)
          </p>
        </div>

        {/* Cell 2: Feriepengegrunnlag */}
        <div className="bg-card px-4 py-3">
          <div className="flex items-center gap-1.5">
            <WalletIcon className="size-3" />
            <p className="text-[12px] uppercase tracking-wider text-muted-foreground/60 font-semibold">
              Feriepengegrunnlag
            </p>
          </div>
          <p className="text-lg font-display font-bold tabular-nums mt-0.5 leading-none">
            kr {krFmt(monthly.FERIEPENGER_GRUNNLAG)}
          </p>
          <p className="text-[12px] text-muted-foreground mt-0.5">
            2025-grunnlag
          </p>
        </div>

        {/* Cell 3: Utbetales juni */}
        <div className="bg-card px-4 py-3">
          <div className="flex items-center gap-1.5">
            <BanknoteIcon className="size-3 text-sky-500" />
            <p className="text-[12px] uppercase tracking-wider text-muted-foreground/60 font-semibold">
              Utbetales juni
            </p>
          </div>
          <p className="text-lg font-display font-bold tabular-nums mt-0.5 leading-none text-sky-600 dark:text-sky-400">
            kr {krFmt(monthly.TOTAL_FERIEPENGER_PAYOUT)}
          </p>
          <p className="text-[12px] text-muted-foreground mt-0.5">
            15. juni 2026
          </p>
        </div>

        {/* Cell 4: Satt av hittil */}
        <div className="bg-card px-4 py-3">
          <div className="flex items-center gap-1.5">
            <PiggyBankIcon className="size-3 text-emerald-500" />
            <p className="text-[12px] uppercase tracking-wider text-muted-foreground/60 font-semibold">
              Satt av hittil
            </p>
          </div>
          <p className="text-lg font-display font-bold tabular-nums mt-0.5 leading-none">
            kr {krFmt(monthly.SET_ASIDE_YTD)}
          </p>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-[12px] text-muted-foreground">
              {monthly.MONTHS_ELAPSED} av 12 mnd
            </span>
            <Progress value={setAsideProgress} className="h-1 flex-1" />
          </div>
        </div>

        {/* Cell 5: Feriedager brukt */}
        <div className="bg-card px-4 py-3">
          <div className="flex items-center gap-1.5">
            <CalendarDaysIcon className="size-3" />
            <p className="text-[12px] uppercase tracking-wider text-muted-foreground/60 font-semibold">
              Feriedager brukt
            </p>
          </div>
          <div className="flex items-baseline gap-1 mt-0.5">
            <p className="text-lg font-display font-bold tabular-nums leading-none">
              {totalVacationDaysUsed}
            </p>
            <span className="text-[12px] text-muted-foreground">
              / {totalVacationDaysTotal}
            </span>
          </div>
          <p className="text-[12px] text-muted-foreground mt-0.5">
            alle ansatte
          </p>
        </div>
      </motion.div>

      {/* Ciri banner */}
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
              Ciri setter automatisk av {rateLabel} av brutto hver m\u00e5ned til
              konto 2780.
            </span>{" "}
            kr {krFmt(monthly.SET_ASIDE_YTD)} av kr{" "}
            {krFmt(monthly.TOTAL_FERIEPENGER_PAYOUT)} er avsatt.{" "}
            <span className="text-[var(--primary)] font-medium">
              Alt under kontroll.
            </span>
          </p>
        </div>
      </motion.div>

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
                  layoutId="feriepenger-tab-indicator"
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
        {/* Oversikt tab */}
        {activeTab === "oversikt" && (
          <motion.div
            key="oversikt"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-5">
              {/* Left: Accrual Area Chart */}
              <div className="rounded-xl border bg-card overflow-hidden">
                <div className="px-5 py-3 border-b bg-muted/20">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <UmbrellaIcon className="size-4 text-[var(--primary)]" />
                      <h3 className="text-sm font-semibold">
                        Opptjening og avsetning 2026
                      </h3>
                    </div>
                    <div className="flex items-center gap-3 text-[13px] text-muted-foreground">
                      <span className="flex items-center gap-1.5">
                        <div className="size-2 rounded-full bg-[var(--primary)]" />
                        Opptjent
                      </span>
                      <span className="flex items-center gap-1.5">
                        <div className="size-2 rounded-full bg-sky-500" />
                        Avsatt
                      </span>
                    </div>
                  </div>
                </div>
                <div className="p-5">
                  <AccrualAreaChart data={monthly.monthlyData} />
                </div>
              </div>

              {/* Right: June liquidity card */}
              <div className="lg:self-start">
                <LiquidityImpactCard
                  totalFeriepengerPayout={monthly.TOTAL_FERIEPENGER_PAYOUT}
                  monthlyGross={monthly.FERIEPENGER_GRUNNLAG / 12}
                  setAsideYtd={monthly.SET_ASIDE_YTD}
                  monthsElapsed={monthly.MONTHS_ELAPSED}
                />
              </div>
            </div>
          </motion.div>
        )}

        {/* Per ansatt tab */}
        {activeTab === "per-ansatt" && (
          <motion.div
            key="per-ansatt"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
          >
            <EmployeeFeriepengerTable data={employeeData} />
          </motion.div>
        )}

        {/* Planlegging tab */}
        {activeTab === "planlegging" && (
          <motion.div
            key="planlegging"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-5">
              {/* Left: Scenario Bar Chart */}
              <div className="rounded-xl border bg-card overflow-hidden">
                <div className="px-5 py-3 border-b bg-muted/20">
                  <div className="flex items-center gap-2">
                    <TargetIcon className="size-4 text-[var(--primary)]" />
                    <h3 className="text-sm font-semibold">
                      Avsetningsscenarioer
                    </h3>
                  </div>
                </div>
                <div className="p-5">
                  <SetAsideBarChart scenarios={scenarios} />
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
                    <span className="text-[12px] text-muted-foreground ml-auto">
                      {completedSteps}/{totalSteps} fullf\u00f8rt
                    </span>
                  </div>
                </div>
                <div className="p-3 max-h-[420px] overflow-y-auto">
                  <div className="relative">
                    <div className="absolute left-[11px] top-2 bottom-2 w-px bg-gradient-to-b from-emerald-400/60 via-[var(--primary)]/30 to-[var(--primary)]/15" />
                    <div className="space-y-0.5">
                      {timeline.map((event) => {
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
      </div>
    </div>
  );
}
