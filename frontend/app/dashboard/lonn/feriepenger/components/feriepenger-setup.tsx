"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckIcon,
  ChevronRightIcon,
  ArrowLeftIcon,
  SparklesIcon,
  BuildingIcon,
  UsersIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import CiriLogo from "@/components/layout/ciri-logo";
import { employees } from "../../data/employees";
import type { FeriepengerConfig, ComputedEmployeeRate } from "../types";

// ── Rates ──

const RATE_STANDARD = 0.102;
const RATE_EXTENDED = 0.12;

// ── Types ──

interface FeriepengerSetupProps {
  onComplete: (config: FeriepengerConfig) => void;
}

type Step = "intro" | "tariff" | "over60" | "summary";

// ── Helpers ──

function krFmt(n: number) {
  return Math.abs(n).toLocaleString("nb-NO");
}

function computeRatesPreview(
  hasTariffavtale: boolean,
  employeesOver60: string[]
): ComputedEmployeeRate[] {
  return employees.map((emp) => {
    const isOver60 = employeesOver60.includes(emp.id);
    if (isOver60) {
      return {
        employeeId: emp.id,
        rate: RATE_EXTENDED,
        rateLabel: "12 %",
        reason: "60 år eller eldre",
      };
    }
    if (hasTariffavtale) {
      return {
        employeeId: emp.id,
        rate: RATE_EXTENDED,
        rateLabel: "12 %",
        reason: "Tariffavtale (5 uker)",
      };
    }
    return {
      employeeId: emp.id,
      rate: RATE_STANDARD,
      rateLabel: "10,2 %",
      reason: "Lovens minimum (4 uker + 1 dag)",
      };
  });
}

// ── Step indicator ──

function StepDots({ current, steps }: { current: number; steps: number }) {
  return (
    <div className="flex items-center gap-1.5">
      {Array.from({ length: steps }).map((_, i) => (
        <div
          key={i}
          className={cn(
            "h-1 rounded-full transition-all duration-300",
            i === current
              ? "w-6 bg-[var(--primary)]"
              : i < current
                ? "w-1.5 bg-[var(--primary)]/40"
                : "w-1.5 bg-muted-foreground/20"
          )}
        />
      ))}
    </div>
  );
}

// ── Animated card wrapper for each step ──

function StepCard({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -12, scale: 0.98 }}
      transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
    >
      {children}
    </motion.div>
  );
}

// ── Main Component ──

export default function FeriepengerSetup({ onComplete }: FeriepengerSetupProps) {
  const [step, setStep] = useState<Step>("intro");
  const [hasTariffavtale, setHasTariffavtale] = useState<boolean | null>(null);
  const [over60Ids, setOver60Ids] = useState<string[]>([]);

  const stepIndex = ["intro", "tariff", "over60", "summary"].indexOf(step);

  const toggleOver60 = (id: string) => {
    setOver60Ids((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleFinish = () => {
    onComplete({
      hasTariffavtale: hasTariffavtale ?? false,
      employeesOver60: over60Ids,
      configuredAt: new Date().toISOString(),
    });
  };

  const previewRates = computeRatesPreview(
    hasTariffavtale ?? false,
    over60Ids
  );

  return (
    <div className="mx-auto max-w-[620px] py-8">
      {/* Step indicator */}
      <div className="flex justify-center mb-8">
        <StepDots current={stepIndex} steps={4} />
      </div>

      <AnimatePresence mode="wait">
        {/* ─── Step 0: Intro ─── */}
        {step === "intro" && (
          <StepCard key="intro">
            <div className="text-center space-y-5">
              {/* Ciri avatar */}
              <div className="flex justify-center">
                <div className="relative">
                  <CiriLogo size="lg" animated intensity="subtle" />
                  <motion.span
                    className="absolute -bottom-1 -right-1 flex size-4 items-center justify-center rounded-full bg-green-500 ring-2 ring-background"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.3, type: "spring" }}
                  >
                    <SparklesIcon className="size-2.5 text-white" />
                  </motion.span>
                </div>
              </div>

              {/* Chat bubble */}
              <div className="relative mx-auto max-w-[480px]">
                <div className="rounded-2xl border bg-card px-6 py-5 shadow-sm">
                  <div className="absolute -top-2 left-1/2 -translate-x-1/2 size-4 rotate-45 border-l border-t bg-card" />
                  <h2 className="font-display text-lg font-bold tracking-tight mb-2">
                    Hei! La oss sette opp feriepenger.
                  </h2>
                  <p className="text-[13px] text-muted-foreground leading-relaxed">
                    Jeg trenger bare svar på et par spørsmål, så beregner jeg riktig
                    feriepengesats for alle ansatte. Det tar under ett minutt.
                  </p>
                </div>
              </div>

              {/* Info blurb */}
              <div className="mx-auto max-w-[440px] rounded-xl bg-muted/30 px-5 py-4 text-left">
                <p className="text-[12px] leading-relaxed text-muted-foreground">
                  <span className="font-semibold text-foreground">Hva er feriepenger?</span>{" "}
                  Alle arbeidsgivere i Norge må sette av en del av lønnen til feriepenger.
                  Pengene utbetales vanligvis i juni, når de ansatte tar ferie.
                  Satsen er enten{" "}
                  <span className="font-semibold text-foreground">10,2 %</span> eller{" "}
                  <span className="font-semibold text-foreground">12 %</span> av fjorårets
                  bruttolønn — avhengig av ferieordningen i bedriften din.
                </p>
              </div>

              <button
                onClick={() => setStep("tariff")}
                className="inline-flex items-center gap-2 rounded-lg bg-[var(--primary)] px-5 py-2.5 text-[13px] font-semibold text-primary-foreground shadow-sm transition-all hover:opacity-90 active:scale-[0.98]"
              >
                La oss starte
                <ChevronRightIcon className="size-3.5" />
              </button>
            </div>
          </StepCard>
        )}

        {/* ─── Step 1: Tariffavtale ─── */}
        {step === "tariff" && (
          <StepCard key="tariff">
            <div className="space-y-5">
              {/* Ciri question */}
              <div className="flex items-start gap-3">
                <CiriLogo size="sm" />
                <div className="rounded-2xl rounded-tl-md border bg-card px-5 py-4 shadow-sm flex-1">
                  <h3 className="font-display text-[15px] font-bold mb-1.5">
                    Hvor mange uker ferie har de ansatte?
                  </h3>
                  <p className="text-[12px] text-muted-foreground leading-relaxed">
                    Alle bedrifter i Norge gir minst 4 uker + 1 dag ferie (lovens minimum).
                    Noen bedrifter har avtale om 5 uker — for eksempel gjennom en tariffavtale
                    eller en intern ordning. Hvis du er usikker, er det mest sannsynlig lovens minimum.
                  </p>
                </div>
              </div>

              {/* Option cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pl-11">
                <button
                  onClick={() => setHasTariffavtale(false)}
                  className={cn(
                    "group relative rounded-xl border-2 p-4 text-left transition-all hover:shadow-md",
                    hasTariffavtale === false
                      ? "border-[var(--primary)] bg-[var(--primary)]/[0.04] shadow-sm"
                      : "border-border hover:border-border/80"
                  )}
                >
                  {hasTariffavtale === false && (
                    <motion.div
                      layoutId="tariff-check"
                      className="absolute top-3 right-3 flex size-5 items-center justify-center rounded-full bg-[var(--primary)]"
                    >
                      <CheckIcon className="size-3 text-primary-foreground" />
                    </motion.div>
                  )}
                  <BuildingIcon className="size-5 text-muted-foreground mb-2" />
                  <p className="text-[13px] font-semibold mb-0.5">
                    4 uker + 1 dag
                  </p>
                  <p className="text-[13px] text-muted-foreground leading-snug">
                    Lovens minimum. De fleste små bedrifter har dette.
                  </p>
                  <div className="mt-2 inline-flex items-center rounded-md bg-muted/50 px-2 py-0.5">
                    <span className="text-[13px] font-semibold tabular-nums">
                      Sats: 10,2 %
                    </span>
                  </div>
                </button>

                <button
                  onClick={() => setHasTariffavtale(true)}
                  className={cn(
                    "group relative rounded-xl border-2 p-4 text-left transition-all hover:shadow-md",
                    hasTariffavtale === true
                      ? "border-[var(--primary)] bg-[var(--primary)]/[0.04] shadow-sm"
                      : "border-border hover:border-border/80"
                  )}
                >
                  {hasTariffavtale === true && (
                    <motion.div
                      layoutId="tariff-check"
                      className="absolute top-3 right-3 flex size-5 items-center justify-center rounded-full bg-[var(--primary)]"
                    >
                      <CheckIcon className="size-3 text-primary-foreground" />
                    </motion.div>
                  )}
                  <UsersIcon className="size-5 text-muted-foreground mb-2" />
                  <p className="text-[13px] font-semibold mb-0.5">
                    5 uker
                  </p>
                  <p className="text-[13px] text-muted-foreground leading-snug">
                    Tariffavtale eller intern avtale om ekstra ferieuke.
                  </p>
                  <div className="mt-2 inline-flex items-center rounded-md bg-muted/50 px-2 py-0.5">
                    <span className="text-[13px] font-semibold tabular-nums">
                      Sats: 12 %
                    </span>
                  </div>
                </button>
              </div>

              {/* Navigation */}
              <div className="flex items-center justify-between pl-11 pt-2">
                <button
                  onClick={() => setStep("intro")}
                  className="flex items-center gap-1.5 text-[12px] text-muted-foreground hover:text-foreground transition-colors"
                >
                  <ArrowLeftIcon className="size-3" />
                  Tilbake
                </button>
                <button
                  onClick={() => setStep("over60")}
                  disabled={hasTariffavtale === null}
                  className={cn(
                    "inline-flex items-center gap-2 rounded-lg px-4 py-2 text-[13px] font-semibold transition-all",
                    hasTariffavtale !== null
                      ? "bg-[var(--primary)] text-primary-foreground shadow-sm hover:opacity-90 active:scale-[0.98]"
                      : "bg-muted text-muted-foreground cursor-not-allowed"
                  )}
                >
                  Neste
                  <ChevronRightIcon className="size-3.5" />
                </button>
              </div>
            </div>
          </StepCard>
        )}

        {/* ─── Step 2: Employees over 60 ─── */}
        {step === "over60" && (
          <StepCard key="over60">
            <div className="space-y-5">
              {/* Ciri question */}
              <div className="flex items-start gap-3">
                <CiriLogo size="sm" />
                <div className="rounded-2xl rounded-tl-md border bg-card px-5 py-4 shadow-sm flex-1">
                  <h3 className="font-display text-[15px] font-bold mb-1.5">
                    Er noen av de ansatte 60 år eller eldre i år?
                  </h3>
                  <p className="text-[12px] text-muted-foreground leading-relaxed">
                    Ansatte som fyller 60 i løpet av året har rett til en ekstra ferieuke,
                    og får alltid 12 % uansett hva bedriften ellers har avtalt.
                    {!hasTariffavtale && (
                      <span className="block mt-1 font-medium text-foreground/80">
                        De øvrige ansatte beholder 10,2 %.
                      </span>
                    )}
                    {hasTariffavtale && (
                      <span className="block mt-1 font-medium text-foreground/80">
                        Siden dere allerede har 5 uker, har alle 12 % — men det er greit å vite hvem som har den lovfestede retten.
                      </span>
                    )}
                  </p>
                </div>
              </div>

              {/* Employee checkboxes */}
              <div className="space-y-1 pl-11">
                {employees.map((emp) => {
                  const isChecked = over60Ids.includes(emp.id);
                  return (
                    <button
                      key={emp.id}
                      onClick={() => toggleOver60(emp.id)}
                      className={cn(
                        "flex items-center gap-3 w-full rounded-lg border px-4 py-3 text-left transition-all",
                        isChecked
                          ? "border-[var(--primary)]/40 bg-[var(--primary)]/[0.04]"
                          : "border-border/60 hover:border-border hover:bg-muted/20"
                      )}
                    >
                      {/* Custom checkbox */}
                      <div
                        className={cn(
                          "flex size-5 shrink-0 items-center justify-center rounded-md border-2 transition-all",
                          isChecked
                            ? "border-[var(--primary)] bg-[var(--primary)]"
                            : "border-muted-foreground/30"
                        )}
                      >
                        {isChecked && (
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ type: "spring", stiffness: 500, damping: 30 }}
                          >
                            <CheckIcon className="size-3 text-primary-foreground" />
                          </motion.div>
                        )}
                      </div>

                      {/* Avatar */}
                      <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[var(--primary)]/10 font-medium text-[var(--primary)] text-xs">
                        {emp.name
                          .split(" ")
                          .map((n) => n[0])
                          .join("")}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-medium truncate">
                          {emp.name}
                        </p>
                        <p className="text-[13px] text-muted-foreground truncate">
                          {emp.position}
                        </p>
                      </div>

                      {/* Rate badge */}
                      <div
                        className={cn(
                          "rounded-md px-2 py-0.5 text-[13px] font-semibold tabular-nums transition-colors",
                          isChecked
                            ? "bg-[var(--primary)]/10 text-[var(--primary)]"
                            : "bg-muted/50 text-muted-foreground"
                        )}
                      >
                        {isChecked || hasTariffavtale ? "12 %" : "10,2 %"}
                      </div>
                    </button>
                  );
                })}

                {/* None option */}
                <p className="text-[13px] text-muted-foreground pt-1 pl-1">
                  Ingen over 60? Bare gå videre uten å huke av noen.
                </p>
              </div>

              {/* Navigation */}
              <div className="flex items-center justify-between pl-11 pt-2">
                <button
                  onClick={() => setStep("tariff")}
                  className="flex items-center gap-1.5 text-[12px] text-muted-foreground hover:text-foreground transition-colors"
                >
                  <ArrowLeftIcon className="size-3" />
                  Tilbake
                </button>
                <button
                  onClick={() => setStep("summary")}
                  className="inline-flex items-center gap-2 rounded-lg bg-[var(--primary)] px-4 py-2 text-[13px] font-semibold text-primary-foreground shadow-sm transition-all hover:opacity-90 active:scale-[0.98]"
                >
                  Se oppsummering
                  <ChevronRightIcon className="size-3.5" />
                </button>
              </div>
            </div>
          </StepCard>
        )}

        {/* ─── Step 3: Summary ─── */}
        {step === "summary" && (
          <StepCard key="summary">
            <div className="space-y-5">
              {/* Ciri confirmation */}
              <div className="flex items-start gap-3">
                <CiriLogo size="sm" />
                <div className="rounded-2xl rounded-tl-md border bg-card px-5 py-4 shadow-sm flex-1">
                  <h3 className="font-display text-[15px] font-bold mb-1.5">
                    Alt klart! Her er satsene jeg beregnet.
                  </h3>
                  <p className="text-[12px] text-muted-foreground leading-relaxed">
                    Basert på svarene dine har jeg satt riktig feriepengesats for
                    hver ansatt. Du kan endre dette når som helst.
                  </p>
                </div>
              </div>

              {/* Config summary */}
              <div className="pl-11 space-y-3">
                {/* Settings recap */}
                <div className="rounded-xl border bg-muted/20 px-4 py-3 space-y-2">
                  <div className="flex items-center justify-between text-[12px]">
                    <span className="text-muted-foreground">Ferieordning</span>
                    <span className="font-semibold">
                      {hasTariffavtale ? "5 uker (tariffavtale)" : "4 uker + 1 dag (lovens minimum)"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[12px]">
                    <span className="text-muted-foreground">Ansatte 60+</span>
                    <span className="font-semibold">
                      {over60Ids.length === 0
                        ? "Ingen"
                        : employees
                            .filter((e) => over60Ids.includes(e.id))
                            .map((e) => e.name.split(" ")[0])
                            .join(", ")}
                    </span>
                  </div>
                </div>

                {/* Rate table */}
                <div className="rounded-xl border bg-card overflow-hidden">
                  <div className="grid grid-cols-[1fr_80px_1fr] gap-3 px-4 py-2 border-b bg-muted/10 text-[12px] uppercase tracking-wider text-muted-foreground font-semibold">
                    <span>Ansatt</span>
                    <span className="text-right">Sats</span>
                    <span>Begrunnelse</span>
                  </div>
                  <div className="divide-y divide-border/50">
                    {employees.map((emp) => {
                      const rate = previewRates.find(
                        (r) => r.employeeId === emp.id
                      );
                      return (
                        <div
                          key={emp.id}
                          className="grid grid-cols-[1fr_80px_1fr] gap-3 px-4 py-2.5 items-center"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-[var(--primary)]/10 font-medium text-[var(--primary)] text-[12px]">
                              {emp.name
                                .split(" ")
                                .map((n) => n[0])
                                .join("")}
                            </div>
                            <span className="text-[12px] font-medium truncate">
                              {emp.name}
                            </span>
                          </div>
                          <span className="text-[13px] font-semibold tabular-nums text-right text-[var(--primary)]">
                            {rate?.rateLabel}
                          </span>
                          <span className="text-[13px] text-muted-foreground truncate">
                            {rate?.reason}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Total feriepenger preview */}
                {(() => {
                  const totalPayout = employees.reduce((sum, emp) => {
                    const rate = previewRates.find(
                      (r) => r.employeeId === emp.id
                    );
                    return sum + Math.round(emp.salary * 12 * (rate?.rate ?? 0.12));
                  }, 0);
                  return (
                    <div className="rounded-xl border border-[var(--primary)]/20 bg-[var(--primary)]/[0.03] px-4 py-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[12px] text-muted-foreground">
                          Estimert feriepenger juni 2026
                        </span>
                        <span className="font-display text-lg font-bold tabular-nums">
                          kr {krFmt(totalPayout)}
                        </span>
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Navigation */}
              <div className="flex items-center justify-between pl-11 pt-2">
                <button
                  onClick={() => setStep("over60")}
                  className="flex items-center gap-1.5 text-[12px] text-muted-foreground hover:text-foreground transition-colors"
                >
                  <ArrowLeftIcon className="size-3" />
                  Tilbake
                </button>
                <button
                  onClick={handleFinish}
                  className="inline-flex items-center gap-2 rounded-lg bg-[var(--primary)] px-5 py-2.5 text-[13px] font-semibold text-primary-foreground shadow-sm transition-all hover:opacity-90 active:scale-[0.98]"
                >
                  <CheckIcon className="size-3.5" />
                  Bekreft og start
                </button>
              </div>
            </div>
          </StepCard>
        )}
      </AnimatePresence>
    </div>
  );
}
