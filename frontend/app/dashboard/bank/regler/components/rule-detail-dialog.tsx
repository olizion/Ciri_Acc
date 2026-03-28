"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  SparklesIcon,
  SearchIcon,
  TrendingUpIcon,
  CalendarIcon,
  LightbulbIcon,
  CheckCircle2Icon,
  PencilIcon,
  ActivityIcon,
  ZapIcon,
  EyeOffIcon,
  TagIcon,
  TargetIcon,
  NetworkIcon,
  ShieldCheckIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Rule } from "../types";
import { categoryLabels, accountOptions } from "../constants";
import { RuleTypeBadge, PriorityBadge } from "./badges";

// ============================================================================
// Helpers
// ============================================================================

function getCriteriaChips(rule: Rule): string[] {
  const chips: string[] = [];
  if (rule.criteria.description_contains) {
    chips.push(`<<${rule.criteria.description_contains}>>`);
  }
  if (rule.criteria.merchant_name) {
    chips.push(rule.criteria.merchant_name);
  }
  if (rule.criteria.amount_exact != null) {
    chips.push(`kr ${rule.criteria.amount_exact}`);
  }
  if (rule.criteria.amount_min != null || rule.criteria.amount_max != null) {
    const min = rule.criteria.amount_min != null ? `kr ${rule.criteria.amount_min}` : "";
    const max = rule.criteria.amount_max != null ? `kr ${rule.criteria.amount_max}` : "";
    chips.push(min && max ? `${min} -- ${max}` : min || max);
  }
  if (rule.criteria.direction) {
    chips.push(rule.criteria.direction === "debit" ? "Utbetaling" : "Innbetaling");
  }
  return chips;
}

function buildFutureExamples(rule: Rule): { scenario: string; result: string; detail: string }[] {
  const kw = rule.criteria.description_contains || rule.criteria.merchant_name || "...";
  const examples: { scenario: string; result: string; detail: string }[] = [];

  if (rule.rule_type === "ignore") {
    examples.push({
      scenario: `<<${kw.toUpperCase()} BETALING>> pa kr 149`,
      result: "Markeres privat -- hoppes over",
      detail: "Transaksjonen fjernes fra bokforingslisten og vil ikke pavirke regnskapet eller MVA-beregning.",
    });
    examples.push({
      scenario: `<<${kw.toUpperCase()}*MONTHLY>> belastning`,
      result: "Ekskludert fra regnskap automatisk",
      detail: "Eventuelle bilag som matcher denne transaksjonen vil ogsa bli avvist automatisk.",
    });
  } else if (rule.rule_type === "auto_match") {
    examples.push({
      scenario: `<<${kw.toUpperCase()} FAKTURA>> + matchende bilag`,
      result: "Kobles automatisk uten din inngripen",
      detail: "Ciri sammenligner belop, dato og leverandornavn for a finne riktig bilag og oppretter posteringen.",
    });
    examples.push({
      scenario: `<<${kw.toUpperCase()}>> ny belastning uten eksakt bilagsmatch`,
      result: "Ciri soker bilag og foreslar kobling",
      detail: "Hvis ingen eksakt match finnes, vil Ciri vise deg de mest sannsynlige kandidatene for godkjenning.",
    });
  } else {
    const acct = rule.action.account
      ? accountOptions.find((a) => a.value === rule.action.account)?.label || rule.action.account
      : null;
    const cat = rule.action.category
      ? categoryLabels[rule.action.category] || rule.action.category
      : null;
    examples.push({
      scenario: `<<${kw.toUpperCase()} CHARGE>> pa kr 299`,
      result: `${cat ? `Kategorisert <<${cat}>>` : "Kategorisert"}${acct ? ` -> ${acct}` : ""}`,
      detail: `Transaksjonen bokfores automatisk${acct ? ` pa ${acct}` : ""}${rule.action.mva_code ? ` med MVA-kode ${rule.action.mva_code}` : ""}. Du trenger ikke gjore noe.`,
    });
    examples.push({
      scenario: `Neste gang <<${kw.toUpperCase()}>> dukker opp i kontoutskriften`,
      result: "Samme behandling -- ingen manuelt arbeid",
      detail: "Regelen kjores automatisk ved banksynkronisering. Korrigerer du resultatet, laerer Ciri av endringen.",
    });
  }

  return examples;
}

// ============================================================================
// RuleDetailDialog
// ============================================================================

interface RuleDetailDialogProps {
  rule: Rule | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: (rule: Rule) => void;
}

export function RuleDetailDialog({
  rule,
  open,
  onOpenChange,
  onEdit,
}: RuleDetailDialogProps) {
  if (!rule) return null;

  const criteriaChips = getCriteriaChips(rule);
  const examples = buildFutureExamples(rule);

  const effectiveRate =
    rule.times_applied > 0
      ? Math.round(
          ((rule.times_applied - rule.times_overridden) / rule.times_applied) * 100
        )
      : 100;

  const typeAccent = {
    auto_category: { line: "bg-blue-500", color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-50 dark:bg-blue-950/30", border: "border-blue-200 dark:border-blue-800" },
    auto_match: { line: "bg-amber-500", color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-50 dark:bg-amber-950/30", border: "border-amber-200 dark:border-amber-800" },
    ignore: { line: "bg-slate-400", color: "text-slate-600 dark:text-slate-400", bg: "bg-slate-50 dark:bg-slate-950/30", border: "border-slate-200 dark:border-slate-700" },
    split: { line: "bg-violet-500", color: "text-violet-600 dark:text-violet-400", bg: "bg-violet-50 dark:bg-violet-950/30", border: "border-violet-200 dark:border-violet-800" },
  }[rule.rule_type] ?? { line: "bg-blue-500", color: "text-blue-600", bg: "bg-blue-50", border: "border-blue-200" };

  // Detailed pipeline steps
  const detailedSteps = [
    {
      icon: ActivityIcon,
      title: "Banktransaksjon mottas",
      desc: "Ny transaksjon oppdages ved synkronisering med banken din. Ciri analyserer beskrivelse, belop og retning.",
      accent: "bg-muted text-foreground/70",
      dotColor: "bg-foreground/30",
    },
    {
      icon: SearchIcon,
      title: "Kriteriene sjekkes",
      desc: criteriaChips.length > 0
        ? `Ciri ser etter: ${criteriaChips.join(", ")}. Alle betingelser ma matche for at regelen slar inn.`
        : "Alle transaksjoner vil matche denne regelen, uavhengig av innhold.",
      accent: "bg-[var(--primary)]/10 text-[var(--primary)]",
      dotColor: "bg-[var(--primary)]",
      chips: criteriaChips,
    },
    {
      icon: rule.rule_type === "ignore" ? EyeOffIcon : rule.rule_type === "auto_match" ? ZapIcon : TagIcon,
      title: rule.rule_type === "ignore"
        ? "Marker som privat"
        : rule.rule_type === "auto_match"
          ? "Koble med bilag"
          : "Kategoriser og bokfor",
      desc: rule.rule_type === "ignore"
        ? "Transaksjonen flagges som privat. Den fjernes fra bokforingskoen og vil aldri pavirke regnskapet, MVA eller arsoppgjoret."
        : rule.rule_type === "auto_match"
          ? "Ciri soker blant ventende bilag etter en match basert pa belop, leverandor og dato. Ved treff kobles transaksjon og bilag automatisk."
          : `Transaksjonen kategoriseres${rule.action.category ? ` som <<${categoryLabels[rule.action.category] || rule.action.category}>>` : ""}${rule.action.account ? ` og bokfores pa konto ${rule.action.account}` : ""}${rule.action.mva_code ? ` med MVA-kode ${rule.action.mva_code}` : ""}.`,
      accent: typeAccent.bg + " " + typeAccent.color,
      dotColor: typeAccent.line,
      actions: true,
    },
    {
      icon: CheckCircle2Icon,
      title: "Ferdig -- ingen handling kreves",
      desc: rule.rule_type === "ignore"
        ? "Transaksjonen er ferdigbehandlet. Du kan alltid angre ved a endre den manuelt i transaksjonsvisningen."
        : "Posteringen opprettes automatisk. Ciri overvaker treffsikkerheten -- korrigerer du resultatet, tilpasser regelen seg.",
      accent: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
      dotColor: "bg-emerald-500",
    },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[760px] max-h-[90vh] overflow-y-auto p-0 gap-0">
        {/* Accent top bar */}
        <div className={cn("h-[3px] w-full rounded-t-lg", typeAccent.line)} />

        {/* Header */}
        <div className="px-8 pt-7 pb-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2.5 flex-wrap">
                <RuleTypeBadge type={rule.rule_type} />
                <PriorityBadge priority={rule.priority} />
                {rule.learned_from_user && (
                  <Badge className="text-[12px] gap-1 bg-[var(--primary)]/10 text-[var(--primary)] hover:bg-[var(--primary)]/20 border-0">
                    <SparklesIcon className="size-3" />
                    Laert av Ciri
                  </Badge>
                )}
              </div>
              <DialogTitle className="font-display text-2xl tracking-tight">
                {rule.name}
              </DialogTitle>
              {rule.description && (
                <DialogDescription className="text-[13px] mt-1.5 leading-relaxed">
                  {rule.description}
                </DialogDescription>
              )}
              {!rule.description && <DialogDescription className="sr-only">Regeldetaljer</DialogDescription>}
            </div>
            {/* Effectiveness ring */}
            {rule.times_applied > 0 && (
              <div className="relative shrink-0">
                <svg width="56" height="56" viewBox="0 0 56 56" className="rotate-[-90deg]">
                  <circle cx="28" cy="28" r="22" fill="none" stroke="currentColor" strokeWidth="4" className="text-muted/60" />
                  <circle
                    cx="28" cy="28" r="22"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="4"
                    strokeDasharray={`${(effectiveRate / 100) * 2 * Math.PI * 22} ${2 * Math.PI * 22}`}
                    strokeLinecap="round"
                    className={effectiveRate >= 80 ? "text-emerald-500" : effectiveRate >= 50 ? "text-amber-500" : "text-red-500"}
                  />
                </svg>
                <span className={cn(
                  "absolute inset-0 flex items-center justify-center text-[13px] font-bold tabular-nums",
                  effectiveRate >= 80 ? "text-emerald-600 dark:text-emerald-400" : effectiveRate >= 50 ? "text-amber-600" : "text-red-600"
                )}>
                  {effectiveRate}%
                </span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2 mt-4 text-[13px] text-muted-foreground">
            <div className="flex items-center gap-1.5 bg-muted/40 rounded-full px-3 py-1.5">
              <CalendarIcon className="size-3 shrink-0" />
              {rule.created_at
                ? new Date(rule.created_at).toLocaleDateString("nb-NO", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })
                : "Ukjent dato"}
            </div>
            <div className="flex items-center gap-1.5 bg-muted/40 rounded-full px-3 py-1.5">
              {rule.learned_from_user ? (
                <><SparklesIcon className="size-3 shrink-0" />Laert fra korrigering</>
              ) : (
                <><PencilIcon className="size-3 shrink-0" />Opprettet manuelt</>
              )}
            </div>
            {rule.times_applied > 0 && (
              <div className="flex items-center gap-1.5 bg-muted/40 rounded-full px-3 py-1.5">
                <TrendingUpIcon className="size-3 shrink-0" />
                Brukt {rule.times_applied}x
              </div>
            )}
          </div>
        </div>

        <div className="h-px bg-border" />

        <div className="px-8 py-7 space-y-8">

          {/* Detailed pipeline schematic */}
          <div>
            <p className="text-[12px] font-bold tracking-[0.12em] uppercase text-muted-foreground/50 mb-4">
              Slik fungerer regelen -- steg for steg
            </p>

            <div className="space-y-0">
              {detailedSteps.map((step, i) => {
                const Icon = step.icon;
                return (
                  <div key={step.title} className="relative flex gap-4">
                    {/* Vertical connector line */}
                    {i < detailedSteps.length - 1 && (
                      <div
                        className="absolute left-[17px] top-[38px] w-px bottom-0"
                        style={{ backgroundColor: "var(--border)" }}
                      />
                    )}

                    {/* Step number + icon */}
                    <div className="relative z-10 flex flex-col items-center">
                      <div className={cn(
                        "flex size-[34px] shrink-0 items-center justify-center rounded-xl transition-colors",
                        step.accent,
                      )}>
                        <Icon className="size-4" />
                      </div>
                    </div>

                    {/* Step content */}
                    <div className={cn("flex-1 min-w-0 pb-6", i === detailedSteps.length - 1 && "pb-0")}>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[12px] font-bold tabular-nums text-muted-foreground/40 uppercase">
                          Steg {i + 1}
                        </span>
                      </div>
                      <p className="text-[13px] font-semibold leading-tight text-foreground">
                        {step.title}
                      </p>
                      <p className="text-[12px] text-muted-foreground/70 mt-1 leading-relaxed max-w-lg">
                        {step.desc}
                      </p>

                      {/* Show criteria chips inline */}
                      {step.chips && step.chips.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {step.chips.map((chip) => (
                            <span
                              key={chip}
                              className="inline-flex items-center rounded-md bg-[var(--primary)]/10 px-2.5 py-1 text-[13px] font-semibold text-[var(--primary)]"
                            >
                              {chip}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Show action tags inline */}
                      {step.actions && (
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {rule.rule_type === "ignore" && (
                            <span className="inline-flex items-center gap-1 rounded-md bg-slate-200/60 dark:bg-slate-800/60 px-2.5 py-1 text-[13px] font-semibold text-slate-700 dark:text-slate-300">
                              <EyeOffIcon className="size-3" />
                              Privat
                            </span>
                          )}
                          {rule.rule_type === "auto_match" && (
                            <span className="inline-flex items-center gap-1 rounded-md bg-amber-100 dark:bg-amber-900/40 px-2.5 py-1 text-[13px] font-semibold text-amber-700 dark:text-amber-300">
                              <ZapIcon className="size-3" />
                              Auto-match
                            </span>
                          )}
                          {rule.action.category && (
                            <span className="inline-flex items-center rounded-md bg-[var(--primary)]/10 px-2.5 py-1 text-[13px] font-semibold text-[var(--primary)]">
                              {categoryLabels[rule.action.category] || rule.action.category}
                            </span>
                          )}
                          {rule.action.account && (
                            <span className="inline-flex items-center rounded-md bg-muted px-2.5 py-1 text-[13px] font-mono font-semibold text-foreground/70">
                              {accountOptions.find((a) => a.value === rule.action.account)?.label || `Konto ${rule.action.account}`}
                            </span>
                          )}
                          {rule.action.mva_code && (
                            <span className="inline-flex items-center rounded-md bg-muted px-2.5 py-1 text-[13px] font-mono font-semibold text-foreground/70">
                              MVA-kode {rule.action.mva_code}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="h-px bg-border" />

          {/* Ciri Knowledge: what Ciri learns */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="flex size-6 items-center justify-center rounded-md bg-[var(--primary)]/10">
                <SparklesIcon className="size-3.5 text-[var(--primary)]" />
              </div>
              <p className="text-sm font-semibold">Hva Ciri laerer fra denne regelen</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border bg-muted/20 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <TargetIcon className="size-3.5 text-muted-foreground/60" />
                  <span className="text-[13px] font-semibold text-muted-foreground/60 uppercase tracking-wider">Monstergjenkjenning</span>
                </div>
                <p className="text-[12px] text-foreground/80 leading-relaxed">
                  {rule.criteria.description_contains
                    ? `Ciri vet at transaksjoner som inneholder <<${rule.criteria.description_contains}>>${rule.criteria.merchant_name ? ` fra ${rule.criteria.merchant_name}` : ""} alltid skal behandles likt.`
                    : "Regelen matcher bredt -- Ciri bruker den som generell fallback for ukategoriserte transaksjoner."}
                </p>
              </div>
              <div className="rounded-xl border bg-muted/20 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <NetworkIcon className="size-3.5 text-muted-foreground/60" />
                  <span className="text-[13px] font-semibold text-muted-foreground/60 uppercase tracking-wider">Klyngepavirkning</span>
                </div>
                <p className="text-[12px] text-foreground/80 leading-relaxed">
                  {rule.action.category
                    ? `Hver gang regelen brukes, styrkes <<${categoryLabels[rule.action.category] || rule.action.category}>>-klyngen. Jo flere datapunkter, desto mer autonom blir Ciri for denne typen.`
                    : "Regelen bidrar til Ciris forstaelse av transaksjonsflyt, men pavirker ikke klyngestyrke direkte."}
                </p>
              </div>
              <div className="rounded-xl border bg-muted/20 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <ShieldCheckIcon className="size-3.5 text-muted-foreground/60" />
                  <span className="text-[13px] font-semibold text-muted-foreground/60 uppercase tracking-wider">Selvkorrigering</span>
                </div>
                <p className="text-[12px] text-foreground/80 leading-relaxed">
                  {rule.times_overridden > 0
                    ? `Du har korrigert denne regelen ${rule.times_overridden} ${rule.times_overridden === 1 ? "gang" : "ganger"}. Ciri bruker korrigeringene til a forbedre fremtidige forslag.`
                    : "Hvis du korrigerer resultatet, vil Ciri laere av endringen og tilpasse fremtidige behandlinger automatisk."}
                </p>
              </div>
              <div className="rounded-xl border bg-muted/20 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUpIcon className="size-3.5 text-muted-foreground/60" />
                  <span className="text-[13px] font-semibold text-muted-foreground/60 uppercase tracking-wider">Autonomi</span>
                </div>
                <p className="text-[12px] text-foreground/80 leading-relaxed">
                  {effectiveRate >= 80 && rule.times_applied >= 5
                    ? `Med ${effectiveRate}% treffsikkerhet og ${rule.times_applied} bruk er denne regelen stabil nok til autonom bokforing.`
                    : rule.times_applied > 0
                      ? `Regelen trenger flere datapunkter og hoyere treffsikkerhet (na ${effectiveRate}%) for a bidra til full autonomi.`
                      : "Regelen har ikke blitt brukt enna. Etter nok bruk vil den bidra til Ciris evne til autonom bokforing."}
                </p>
              </div>
            </div>
          </div>

          <div className="h-px bg-border" />

          {/* Future examples */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="flex size-6 items-center justify-center rounded-md bg-amber-100 dark:bg-amber-900/30">
                <LightbulbIcon className="size-3.5 text-amber-600 dark:text-amber-400" />
              </div>
              <p className="text-sm font-semibold">Neste gang dette skjer</p>
            </div>
            <div className="space-y-3">
              {examples.map((ex, i) => (
                <div
                  key={i}
                  className="rounded-xl border bg-card p-4"
                >
                  <p className="text-[13px] font-medium text-foreground/90">
                    {ex.scenario}
                  </p>
                  <div className="flex items-center gap-1.5 mt-2">
                    <CheckCircle2Icon className="size-3.5 text-emerald-500 shrink-0" />
                    <p className="text-[12px] text-emerald-700 dark:text-emerald-400 font-semibold">
                      {ex.result}
                    </p>
                  </div>
                  <p className="text-[13px] text-muted-foreground/60 mt-1.5 leading-relaxed">
                    {ex.detail}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="h-px bg-border" />

          {/* Stats */}
          <div>
            <p className="text-[12px] font-bold tracking-[0.12em] uppercase text-muted-foreground/50 mb-3">
              Statistikk
            </p>
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-xl border bg-card px-4 py-3 text-center">
                <p className="text-2xl font-display font-bold tabular-nums leading-none">
                  {rule.times_applied}
                </p>
                <p className="text-[12px] text-muted-foreground mt-1">
                  ganger brukt
                </p>
              </div>
              <div className="rounded-xl border bg-card px-4 py-3 text-center">
                <p className="text-2xl font-display font-bold tabular-nums leading-none">
                  {rule.times_overridden}
                </p>
                <p className="text-[12px] text-muted-foreground mt-1">
                  ganger korrigert
                </p>
              </div>
              <div className="rounded-xl border bg-card px-4 py-3 text-center">
                <p
                  className={cn(
                    "text-2xl font-display font-bold tabular-nums leading-none",
                    effectiveRate >= 80
                      ? "text-emerald-600"
                      : effectiveRate >= 50
                        ? "text-amber-600"
                        : "text-red-600"
                  )}
                >
                  {effectiveRate}%
                </p>
                <p className="text-[12px] text-muted-foreground mt-1">
                  treffsikkerhet
                </p>
              </div>
            </div>
            {/* Effectiveness bar */}
            {rule.times_applied > 0 && (
              <div className="mt-3">
                <div className="h-2 w-full overflow-hidden rounded-full bg-muted/60">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all",
                      effectiveRate >= 80
                        ? "bg-emerald-500"
                        : effectiveRate >= 50
                          ? "bg-amber-500"
                          : "bg-red-500"
                    )}
                    style={{ width: `${effectiveRate}%` }}
                  />
                </div>
                {rule.last_applied_at && (
                  <p className="text-[12px] text-muted-foreground mt-1.5">
                    Sist brukt{" "}
                    {new Date(rule.last_applied_at).toLocaleDateString("nb-NO", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t px-8 py-4 flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            className="flex-1 h-9"
            onClick={() => onOpenChange(false)}
          >
            Lukk
          </Button>
          <Button
            size="sm"
            className="flex-1 h-9"
            onClick={() => {
              onOpenChange(false);
              onEdit(rule);
            }}
          >
            <PencilIcon className="size-3.5 mr-2" />
            Rediger regel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
