"use client";

import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import {
  CalendarRangeIcon,
  ScaleIcon,
  ArrowRightIcon,
  CheckCircle2Icon,
  BookOpenIcon,
  BanknoteIcon,
  CalendarIcon,
  SparklesIcon,
} from "lucide-react";
import CiriLogo from "@/components/layout/ciri-logo";
import { API_BASE_URL } from "@/lib/api";
import type { PeriodiseringSuggestion } from "../types";

interface PeriodiseringDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bilagId: string;
  bilagDescription: string;
  suggestion: PeriodiseringSuggestion;
  onAccepted?: () => void;
  onDismissed?: () => void;
}

const CATEGORY_LABELS: Record<string, string> = {
  forsikring: "Forsikring",
  husleie: "Husleie",
  abonnement: "Abonnement",
  lisens: "Lisens",
  vedlikehold: "Vedlikehold",
  annet: "Annet",
};

const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "Mai", "Jun",
  "Jul", "Aug", "Sep", "Okt", "Nov", "Des",
];

function formatPeriod(period: string) {
  const [year, month] = period.split("-");
  const m = parseInt(month, 10) - 1;
  return `${MONTH_NAMES[m]} ${year}`;
}

function krFmt(n: number) {
  return n.toLocaleString("nb-NO", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

function buildPeriodList(start: string, count: number, monthly: number, remainder: number) {
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

  return periods;
}

export function PeriodiseringDialog({
  open,
  onOpenChange,
  bilagId,
  bilagDescription,
  suggestion,
  onAccepted,
  onDismissed,
}: PeriodiseringDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  const periods = useMemo(
    () =>
      buildPeriodList(
        suggestion.start_period,
        suggestion.period_count,
        suggestion.monthly_amount,
        suggestion.remainder ?? 0
      ),
    [suggestion]
  );

  const handleAccept = async () => {
    setIsSubmitting(true);
    try {
      const res = await fetch(
        `${API_BASE_URL}/api/bilag/${bilagId}/periodisering/accept`,
        { method: "POST" }
      );
      if (res.ok) {
        setConfirmed(true);
        onAccepted?.();
        setTimeout(() => {
          onOpenChange(false);
          setConfirmed(false);
        }, 1500);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDismiss = async () => {
    await fetch(
      `${API_BASE_URL}/api/bilag/${bilagId}/periodisering/dismiss`,
      { method: "POST" }
    );
    onDismissed?.();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl !flex !flex-col !gap-0 !p-0 max-h-[85vh] overflow-hidden">
        {/* Header */}
        <DialogHeader className="px-6 pt-6 pb-4 shrink-0">
          <DialogTitle className="flex items-center gap-2.5 font-display">
            <div className="flex size-9 items-center justify-center rounded-lg bg-sky-100 dark:bg-sky-900/30">
              <CalendarRangeIcon className="size-5 text-sky-600 dark:text-sky-400" />
            </div>
            Periodiseringsforslag
          </DialogTitle>
          <DialogDescription className="text-sm">
            {bilagDescription}
          </DialogDescription>
        </DialogHeader>

        <Separator className="shrink-0" />

        {/* Scrollable body */}
        <div className="flex-1 min-h-0 overflow-y-auto">
          <div className="p-6 space-y-5">
            {/* AI reasoning card */}
            <div className="rounded-lg border border-sky-200 dark:border-sky-800/50 bg-sky-50/60 dark:bg-sky-950/20 p-4 space-y-3">
              <div className="flex items-start gap-3">
                <CiriLogo size="sm" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold">Ciris vurdering</span>
                    <Badge
                      variant="outline"
                      className="text-xs border-sky-300 bg-sky-100 text-sky-700 dark:border-sky-700 dark:bg-sky-900/30 dark:text-sky-400"
                    >
                      {CATEGORY_LABELS[suggestion.category] || suggestion.category}
                    </Badge>
                  </div>
                  <p className="text-sm text-sky-800 dark:text-sky-300 mt-1 leading-relaxed">
                    {suggestion.reason}
                  </p>
                </div>
              </div>

              {/* Legal basis */}
              <div className="flex items-center gap-2 text-xs text-sky-600/80 dark:text-sky-400/70">
                <ScaleIcon className="size-3 shrink-0" />
                <span>{suggestion.legal_basis}</span>
              </div>
            </div>

            {/* Key figures */}
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-lg border bg-card p-3 text-center">
                <BanknoteIcon className="size-4 mx-auto text-muted-foreground mb-1" />
                <p className="text-lg font-display font-bold tabular-nums">
                  kr {krFmt(suggestion.total_amount)}
                </p>
                <p className="text-xs text-muted-foreground">Totalt netto</p>
              </div>
              <div className="rounded-lg border bg-card p-3 text-center">
                <CalendarIcon className="size-4 mx-auto text-muted-foreground mb-1" />
                <p className="text-lg font-display font-bold tabular-nums">
                  {suggestion.period_count}
                </p>
                <p className="text-xs text-muted-foreground">Perioder</p>
              </div>
              <div className="rounded-lg border bg-card p-3 text-center">
                <ArrowRightIcon className="size-4 mx-auto text-muted-foreground mb-1" />
                <p className="text-lg font-display font-bold tabular-nums">
                  kr {krFmt(suggestion.monthly_amount)}
                </p>
                <p className="text-xs text-muted-foreground">Per mnd</p>
              </div>
            </div>

            {/* Account flow */}
            <div className="flex items-center gap-2 rounded-lg border bg-muted/30 px-4 py-3">
              <div className="text-center flex-1">
                <p className="text-xs text-muted-foreground">Balanseblad</p>
                <p className="text-sm font-mono font-semibold">{suggestion.balance_account}</p>
                <p className="text-xs text-muted-foreground">Forskuddsbetalt</p>
              </div>
              <ArrowRightIcon className="size-4 text-muted-foreground shrink-0" />
              <div className="text-center flex-1">
                <p className="text-xs text-muted-foreground">Kostnadskonto</p>
                <p className="text-sm font-mono font-semibold">{suggestion.expense_account}</p>
                <p className="text-xs text-muted-foreground">Månedlig</p>
              </div>
            </div>

            {/* Period breakdown */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <BookOpenIcon className="size-4 text-muted-foreground" />
                <h3 className="text-sm font-semibold">Periodefordeling</h3>
                <span className="text-xs text-muted-foreground ml-auto">
                  {formatPeriod(suggestion.start_period)} — {formatPeriod(suggestion.end_period)}
                </span>
              </div>
              <div className="grid grid-cols-4 sm:grid-cols-6 gap-1.5">
                {periods.map((p, i) => (
                  <motion.div
                    key={p.period}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.02 }}
                    className={cn(
                      "rounded-md border px-2 py-1.5 text-center transition-colors",
                      "bg-sky-50/50 border-sky-200/60 dark:bg-sky-950/20 dark:border-sky-800/40"
                    )}
                  >
                    <p className="text-xs font-medium text-sky-700 dark:text-sky-400">
                      {p.label.split(" ")[0]}
                    </p>
                    <p className="text-[12px] tabular-nums text-muted-foreground">
                      {krFmt(p.amount)}
                    </p>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <Separator className="shrink-0" />

        {/* Footer */}
        <div className="px-6 py-4 shrink-0">
          {confirmed ? (
            <motion.div
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center justify-center gap-2 py-2 text-emerald-600 dark:text-emerald-400"
            >
              <CheckCircle2Icon className="size-5" />
              <span className="font-medium">
                {suggestion.period_count} posteringer opprettet
              </span>
            </motion.div>
          ) : (
            <DialogFooter className="gap-2 sm:gap-2">
              <div className="flex items-center gap-2 mr-auto">
                <CiriLogo size="sm" />
                <span className="text-xs text-muted-foreground">
                  Posteringer kan ikke angres
                </span>
              </div>
              <Button variant="outline" onClick={handleDismiss}>
                Avvis
              </Button>
              <Button
                onClick={handleAccept}
                disabled={isSubmitting}
                className="gap-2"
              >
                <SparklesIcon className="size-4" />
                {isSubmitting ? "Bokfører..." : "Godta periodisering"}
              </Button>
            </DialogFooter>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
