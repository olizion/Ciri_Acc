"use client";

import { useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import {
  ChevronDownIcon,
  ShieldIcon,
  HomeIcon,
  KeyIcon,
  WrenchIcon,
  RepeatIcon,
  PackageIcon,
  TrendingUpIcon,
  SparklesIcon,
  CalendarRangeIcon,
  ArrowRightIcon,
  ScaleIcon,
  CheckCircle2Icon,
  XIcon,
  MinusIcon,
  PlusIcon,
  BanknoteIcon,
  Loader2Icon,
} from "lucide-react";
import CiriLogo from "@/components/layout/ciri-logo";
import { API_BASE_URL } from "@/lib/api";
import { toast } from "sonner";
import type { PeriodiseringSuggestion } from "../../bilag/types";

interface CandidateCardProps {
  id: string;
  bilagNumber: string;
  description: string;
  documentDate: string | null;
  counterpartyName: string | null;
  grossAmount: number;
  netAmount: number;
  suggestedAccount: string | null;
  category: string | null;
  suggestion: PeriodiseringSuggestion;
  createdByCiri: boolean;
  isExpanded: boolean;
  onToggle: () => void;
  onAccepted: () => void;
  onDismissed: () => void;
}

const CATEGORY_ICONS: Record<string, typeof ShieldIcon> = {
  forsikring: ShieldIcon,
  husleie: HomeIcon,
  lisens: KeyIcon,
  vedlikehold: WrenchIcon,
  abonnement: RepeatIcon,
  inntekt: TrendingUpIcon,
  annet: PackageIcon,
};

const CATEGORY_LABELS: Record<string, string> = {
  forsikring: "Forsikring",
  husleie: "Husleie",
  abonnement: "Abonnement",
  lisens: "Lisens",
  vedlikehold: "Vedlikehold",
  inntekt: "Inntekt",
  annet: "Annet",
};

const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "Mai", "Jun",
  "Jul", "Aug", "Sep", "Okt", "Nov", "Des",
];

function krFmt(n: number) {
  return n.toLocaleString("nb-NO", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

function formatPeriod(period: string) {
  const [year, month] = period.split("-");
  const m = parseInt(month, 10) - 1;
  return `${MONTH_NAMES[m]} ${year}`;
}

function computeEndPeriod(start: string, count: number): string {
  const [sy, sm] = start.split("-").map(Number);
  const total = (sy * 12 + sm - 1) + count - 1;
  const y = Math.floor(total / 12);
  const m = (total % 12) + 1;
  return `${y}-${String(m).padStart(2, "0")}`;
}

function buildPeriodList(start: string, count: number, totalAmount: number) {
  const monthly = Math.round((totalAmount / count) * 100) / 100;
  const remainder = Math.round((totalAmount - monthly * count) * 100) / 100;
  const periods: { period: string; label: string; amount: number }[] = [];
  const [sy, sm] = start.split("-").map(Number);

  for (let i = 0; i < count; i++) {
    const total = (sy * 12 + sm - 1) + i;
    const y = Math.floor(total / 12);
    const m = (total % 12) + 1;
    const period = `${y}-${String(m).padStart(2, "0")}`;
    const amount = i === count - 1 ? monthly + remainder : monthly;
    periods.push({ period, label: formatPeriod(period), amount });
  }

  return { periods, monthly, remainder };
}

export function CandidateCard({
  id,
  bilagNumber,
  description,
  documentDate,
  counterpartyName,
  grossAmount,
  netAmount,
  suggestedAccount,
  category,
  suggestion,
  createdByCiri,
  isExpanded,
  onToggle,
  onAccepted,
  onDismissed,
}: CandidateCardProps) {
  const [periodCount, setPeriodCount] = useState(suggestion.period_count);
  const [startPeriod, setStartPeriod] = useState(suggestion.start_period);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  const Icon = CATEGORY_ICONS[suggestion.category] || PackageIcon;
  const categoryLabel = CATEGORY_LABELS[suggestion.category] || suggestion.category;
  const isAccepted = suggestion.accepted;
  const isDismissed = suggestion.dismissed;

  const { periods, monthly, remainder } = useMemo(
    () => buildPeriodList(startPeriod, periodCount, suggestion.total_amount),
    [startPeriod, periodCount, suggestion.total_amount]
  );

  const endPeriod = useMemo(
    () => computeEndPeriod(startPeriod, periodCount),
    [startPeriod, periodCount]
  );

  const hasUserOverride = periodCount !== suggestion.period_count || startPeriod !== suggestion.start_period;

  const handleAccept = useCallback(async () => {
    setIsSubmitting(true);
    try {
      const reqBody: Record<string, unknown> = {};
      if (periodCount !== suggestion.period_count) reqBody.override_period_count = periodCount;
      if (startPeriod !== suggestion.start_period) reqBody.override_start_period = startPeriod;

      const res = await fetch(
        `${API_BASE_URL}/api/bilag/${id}/periodisering/accept`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(reqBody),
        }
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: "Ukjent feil" }));
        toast.error("Kunne ikke godkjenne periodisering", {
          description: err.detail || `Feilkode ${res.status}`,
        });
        return;
      }
      setConfirmed(true);
      toast.success("Periodisering godkjent", {
        description: `${periodCount} månedlige posteringer opprettet`,
      });
      setTimeout(() => onAccepted(), 1200);
    } catch (e) {
      toast.error("Nettverksfeil", { description: "Kunne ikke nå serveren" });
    } finally {
      setIsSubmitting(false);
    }
  }, [id, periodCount, startPeriod, suggestion, onAccepted]);

  const handleDismiss = useCallback(async () => {
    try {
      const res = await fetch(
        `${API_BASE_URL}/api/bilag/${id}/periodisering/dismiss`,
        { method: "POST" }
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: "Ukjent feil" }));
        toast.error("Kunne ikke avvise forslag", { description: err.detail });
        return;
      }
      onDismissed();
    } catch {
      toast.error("Nettverksfeil", { description: "Kunne ikke nå serveren" });
    }
  }, [id, onDismissed]);

  // Max bar height for timeline visualization
  const maxAmount = Math.max(...periods.map((p) => p.amount), 1);

  return (
    <motion.div
      layout
      className={cn(
        "rounded-xl border bg-card transition-shadow",
        isExpanded && "shadow-lg shadow-[var(--primary)]/5 border-[var(--primary)]/20",
        confirmed && "border-emerald-300 dark:border-emerald-700",
        isAccepted && "opacity-80",
        isDismissed && "opacity-50",
      )}
    >
      {/* Collapsed header — always visible */}
      <button
        onClick={onToggle}
        disabled={isAccepted || isDismissed || confirmed}
        className="w-full flex items-center gap-3 px-5 py-4 text-left group"
      >
        <div
          className={cn(
            "flex size-10 items-center justify-center rounded-lg shrink-0",
            isAccepted
              ? "bg-emerald-100 dark:bg-emerald-900/30"
              : confirmed
                ? "bg-emerald-100 dark:bg-emerald-900/30"
                : "bg-[var(--primary)]/10"
          )}
        >
          {confirmed || isAccepted ? (
            <CheckCircle2Icon className="size-5 text-emerald-600 dark:text-emerald-400" />
          ) : (
            <Icon className="size-5 text-[var(--primary)]" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium truncate">
              {counterpartyName || description}
            </span>
            {createdByCiri && (
              <Badge
                variant="outline"
                className="text-[10px] px-1 py-0 h-3.5 gap-0.5 border-amber-300/60 bg-amber-50/50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-950/20 dark:text-amber-400"
              >
                <SparklesIcon className="size-2" />
                Ciri
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-xs text-muted-foreground font-mono">{bilagNumber}</span>
            {documentDate && (
              <span className="text-xs text-muted-foreground">
                {new Date(documentDate).toLocaleDateString("nb-NO")}
              </span>
            )}
            <span className="text-xs text-muted-foreground">
              kr {krFmt(suggestion.total_amount)} over {suggestion.period_count} mnd
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {isAccepted && (
            <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-0">
              Godkjent
            </Badge>
          )}
          {isDismissed && (
            <Badge variant="secondary">Avvist</Badge>
          )}
          {confirmed && (
            <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-0">
              Periodisert over {periodCount} mnd
            </Badge>
          )}
          {!isAccepted && !isDismissed && !confirmed && (
            <>
              <Badge
                variant="outline"
                className="text-xs border-sky-300 bg-sky-50 text-sky-700 dark:border-sky-700 dark:bg-sky-900/20 dark:text-sky-400"
              >
                {categoryLabel}
              </Badge>
              <motion.div
                animate={{ rotate: isExpanded ? 180 : 0 }}
                transition={{ duration: 0.2 }}
              >
                <ChevronDownIcon className="size-4 text-muted-foreground" />
              </motion.div>
            </>
          )}
        </div>
      </button>

      {/* Expanded review flow */}
      <AnimatePresence>
        {isExpanded && !isAccepted && !isDismissed && !confirmed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <Separator />
            <div className="px-5 py-5 space-y-5">
              {/* Step 1: Ciri's suggestion */}
              <div className="rounded-lg border border-[var(--primary)]/15 bg-[var(--primary)]/[0.03] p-4 space-y-3">
                <div className="flex items-start gap-3">
                  <CiriLogo size="sm" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold">Ciris vurdering</p>
                    <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                      {suggestion.reason}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground/70">
                  <ScaleIcon className="size-3 shrink-0" />
                  <span>{suggestion.legal_basis}</span>
                </div>
                <div className="text-xs text-muted-foreground/60 italic">
                  Dette er Ciri sitt forslag. Du bestemmer.
                </div>
              </div>

              {/* Account flow */}
              <div className="flex items-center gap-2 rounded-lg border bg-muted/30 px-4 py-3">
                <div className="text-center flex-1">
                  <p className="text-xs text-muted-foreground">Balansekonto</p>
                  <p className="text-sm font-mono font-semibold">{suggestion.balance_account}</p>
                  <p className="text-xs text-muted-foreground">
                    {suggestion.direction === "inntekt" ? "Forskuddsbetalt inntekt" : "Forskuddsbetalt"}
                  </p>
                </div>
                <ArrowRightIcon className="size-4 text-muted-foreground shrink-0" />
                <div className="text-center flex-1">
                  <p className="text-xs text-muted-foreground">
                    {suggestion.direction === "inntekt" ? "Inntektskonto" : "Kostnadskonto"}
                  </p>
                  <p className="text-sm font-mono font-semibold">{suggestion.expense_account}</p>
                  <p className="text-xs text-muted-foreground">Månedlig</p>
                </div>
              </div>

              {/* Step 2: User controls */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  <CalendarRangeIcon className="size-4" />
                  Din vurdering
                </h3>

                <div className="grid grid-cols-2 gap-4">
                  {/* Period count */}
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">
                      Antall måneder
                    </Label>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="outline"
                        size="icon"
                        className="size-8 shrink-0"
                        onClick={() => setPeriodCount(Math.max(1, periodCount - 1))}
                        disabled={periodCount <= 1}
                      >
                        <MinusIcon className="size-3" />
                      </Button>
                      <Input
                        type="number"
                        min={1}
                        max={60}
                        value={periodCount}
                        onChange={(e) =>
                          setPeriodCount(Math.max(1, Math.min(60, parseInt(e.target.value) || 1)))
                        }
                        className="h-8 text-center font-mono text-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                      <Button
                        variant="outline"
                        size="icon"
                        className="size-8 shrink-0"
                        onClick={() => setPeriodCount(Math.min(60, periodCount + 1))}
                        disabled={periodCount >= 60}
                      >
                        <PlusIcon className="size-3" />
                      </Button>
                    </div>
                  </div>

                  {/* Start month */}
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">
                      Startmåned
                    </Label>
                    <Input
                      type="month"
                      value={startPeriod}
                      onChange={(e) => setStartPeriod(e.target.value)}
                      className="h-8 text-sm font-mono"
                    />
                  </div>
                </div>

                {/* Live summary */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="rounded-lg border bg-card p-2.5 text-center">
                    <p className="text-xs text-muted-foreground">Totalt</p>
                    <p className="text-sm font-display font-bold tabular-nums">
                      kr {krFmt(suggestion.total_amount)}
                    </p>
                  </div>
                  <div className="rounded-lg border bg-card p-2.5 text-center">
                    <p className="text-xs text-muted-foreground">Per mnd</p>
                    <p className="text-sm font-display font-bold tabular-nums">
                      kr {krFmt(monthly)}
                    </p>
                  </div>
                  <div className="rounded-lg border bg-card p-2.5 text-center">
                    <p className="text-xs text-muted-foreground">Periode</p>
                    <p className="text-sm font-display font-bold tabular-nums">
                      {formatPeriod(startPeriod)} — {formatPeriod(endPeriod)}
                    </p>
                  </div>
                </div>

                {hasUserOverride && (
                  <motion.div
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1.5"
                  >
                    <SparklesIcon className="size-3" />
                    Du har justert Ciris forslag fra {suggestion.period_count} til {periodCount} måneder
                  </motion.div>
                )}

                {/* Timeline bar chart */}
                <div>
                  <p className="text-xs text-muted-foreground mb-2">Periodefordeling</p>
                  <div className="flex items-end gap-[2px] h-16">
                    {periods.map((p, i) => {
                      const heightPct = (p.amount / maxAmount) * 100;
                      return (
                        <motion.div
                          key={p.period}
                          initial={{ scaleY: 0 }}
                          animate={{ scaleY: 1 }}
                          transition={{ delay: i * 0.015, duration: 0.2 }}
                          style={{ height: `${heightPct}%`, originY: 1 }}
                          className={cn(
                            "flex-1 rounded-t-sm min-w-[4px]",
                            i === periods.length - 1 && remainder !== 0
                              ? "bg-amber-400/70 dark:bg-amber-500/50"
                              : "bg-[var(--primary)]/40"
                          )}
                          title={`${p.label}: kr ${krFmt(p.amount)}`}
                        />
                      );
                    })}
                  </div>
                  <div className="flex justify-between mt-1">
                    <span className="text-[10px] text-muted-foreground">{formatPeriod(startPeriod)}</span>
                    <span className="text-[10px] text-muted-foreground">{formatPeriod(endPeriod)}</span>
                  </div>
                </div>
              </div>

              {/* Step 3: Actions */}
              <Separator />
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <BanknoteIcon className="size-3.5 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">
                    kr {krFmt(suggestion.total_amount)} over {periodCount} mnd fra {formatPeriod(startPeriod)}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" onClick={handleDismiss}>
                    <XIcon className="size-3.5 mr-1" />
                    Avvis
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleAccept}
                    disabled={isSubmitting}
                    className="gap-1.5"
                  >
                    {isSubmitting ? (
                      <Loader2Icon className="size-3.5 animate-spin" />
                    ) : (
                      <CheckCircle2Icon className="size-3.5" />
                    )}
                    {isSubmitting ? "Bokfører..." : "Godkjenn"}
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
