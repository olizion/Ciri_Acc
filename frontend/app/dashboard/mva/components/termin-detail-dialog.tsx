"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  TrendingUpIcon,
  TrendingDownIcon,
  CalendarIcon,
  CheckCircle2Icon,
  ClockIcon,
  DownloadIcon,
  SparklesIcon,
  EyeIcon,
  ExternalLinkIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import CiriLogo from "@/components/layout/ciri-logo";
import type { MVATermin } from "../types";

interface TerminDetailDialogProps {
  termin: MVATermin | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  autonomyMode: "assistant" | "autonomous";
}

export function TerminDetailDialog({
  termin,
  open,
  onOpenChange,
  autonomyMode,
}: TerminDetailDialogProps): JSX.Element | null {
  if (!termin) return null;

  const isSubmitted = termin.status === "submitted";
  const isReady = termin.status === "ready";
  const isOwed = termin.tilGode < 0;

  const daysInfo = useMemo(() => {
    if (isSubmitted && termin.submittedDate) {
      const submitted = new Date(termin.submittedDate);
      const now = new Date();
      const daysSince = Math.floor((now.getTime() - submitted.getTime()) / (1000 * 60 * 60 * 24));
      return { type: "submitted" as const, days: daysSince };
    }
    if (termin.deadline) {
      const deadline = new Date(termin.deadline);
      const now = new Date();
      const daysUntil = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      return { type: "deadline" as const, days: daysUntil };
    }
    return null;
  }, [termin, isSubmitted]);

  const altinnRef = useMemo(() => {
    if (!isSubmitted) return null;
    const hash = termin.id.charCodeAt(0) * 12345 + termin.utgaende;
    return `AR${termin.submittedDate?.replace(/-/g, "")}-${hash.toString().slice(-6)}`;
  }, [termin, isSubmitted]);

  const rateBreakdown = useMemo(() => {
    const total = termin.utgaende;
    return [
      { rate: 25, label: "Standard", amount: Math.round(total * 0.85), percent: 85 },
      { rate: 15, label: "Mat", amount: Math.round(total * 0.08), percent: 8 },
      { rate: 12, label: "Transport", amount: Math.round(total * 0.05), percent: 5 },
      { rate: 0, label: "Fritatt", amount: Math.round(total * 0.02), percent: 2 },
    ];
  }, [termin.utgaende]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl overflow-hidden p-0">
        {/* Header with gradient background */}
        <div className={cn(
          "relative px-6 pt-6 pb-8",
          isSubmitted
            ? "bg-gradient-to-br from-emerald-50 via-green-50 to-teal-50 dark:from-emerald-950/30 dark:via-green-950/20 dark:to-teal-950/30"
            : "bg-gradient-to-br from-[var(--primary)]/10 via-[var(--primary)]/5 to-purple-50 dark:from-[var(--primary)]/20 dark:via-[var(--primary)]/10 dark:to-purple-950/20"
        )}>
          {/* Decorative elements */}
          <div className="absolute top-0 right-0 w-32 h-32 opacity-20">
            <svg viewBox="0 0 100 100" className="w-full h-full">
              <circle cx="80" cy="20" r="40" fill="currentColor" className={isSubmitted ? "text-emerald-400" : "text-[var(--primary)]"} />
              <circle cx="60" cy="40" r="20" fill="currentColor" className={isSubmitted ? "text-teal-300" : "text-purple-300"} />
            </svg>
          </div>

          <DialogHeader className="relative">
            <div className="flex items-start justify-between">
              <div>
                <DialogTitle className="text-xl font-display flex items-center gap-2">
                  {termin.termin}
                  {isSubmitted && autonomyMode === "autonomous" && (
                    <Badge variant="secondary" className="gap-1 text-xs font-normal bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300">
                      <SparklesIcon className="size-3" />
                      Ciri
                    </Badge>
                  )}
                </DialogTitle>
                <DialogDescription className="text-sm mt-1">
                  {termin.period}
                </DialogDescription>
              </div>
              <Badge
                variant="outline"
                className={cn(
                  "text-xs font-medium",
                  isSubmitted && "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
                  isReady && "border-[var(--primary)] bg-[var(--primary)]/10 text-[var(--primary)]"
                )}
              >
                {isSubmitted ? (
                  <><CheckCircle2Icon className="size-3 mr-1" />Sendt</>
                ) : isReady ? (
                  <><ClockIcon className="size-3 mr-1" />Klar</>
                ) : (
                  "Kommende"
                )}
              </Badge>
            </div>
          </DialogHeader>

          {/* Key metric - Net amount */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mt-6 text-center"
          >
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
              {isOwed ? "Å betale" : "Til gode"}
            </p>
            <p className={cn(
              "text-4xl font-display font-bold tracking-tight",
              isSubmitted ? "text-emerald-700 dark:text-emerald-400" : "text-[var(--primary)]"
            )}>
              kr {Math.abs(termin.tilGode).toLocaleString("nb-NO")}
            </p>
          </motion.div>
        </div>

        {/* Content */}
        <div className="px-6 py-5 space-y-5">
          {/* Financial breakdown */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="grid grid-cols-2 gap-4"
          >
            <div className="rounded-xl border bg-card p-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-2">
                <TrendingUpIcon className="size-4 text-rose-500" />
                <span className="text-xs font-medium uppercase tracking-wide">Utgående MVA</span>
              </div>
              <p className="text-xl font-display font-semibold">
                kr {termin.utgaende.toLocaleString("nb-NO")}
              </p>
            </div>
            <div className="rounded-xl border bg-card p-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-2">
                <TrendingDownIcon className="size-4 text-emerald-500" />
                <span className="text-xs font-medium uppercase tracking-wide">Inngående MVA</span>
              </div>
              <p className="text-xl font-display font-semibold">
                kr {termin.inngaende.toLocaleString("nb-NO")}
              </p>
            </div>
          </motion.div>

          {/* MVA rate breakdown */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="space-y-3"
          >
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Fordeling etter MVA-sats
            </p>
            <div className="space-y-2">
              {rateBreakdown.map((item, index) => (
                <div key={item.rate} className="flex items-center gap-3">
                  <div className="w-12 text-xs font-medium text-right text-muted-foreground">
                    {item.rate}%
                  </div>
                  <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${item.percent}%` }}
                      transition={{ delay: 0.3 + index * 0.1, duration: 0.5, ease: "easeOut" }}
                      className={cn(
                        "h-full rounded-full",
                        item.rate === 25 && "bg-[var(--primary)]",
                        item.rate === 15 && "bg-purple-400",
                        item.rate === 12 && "bg-indigo-400",
                        item.rate === 0 && "bg-slate-400"
                      )}
                    />
                  </div>
                  <div className="w-20 text-xs text-muted-foreground text-right">
                    kr {item.amount.toLocaleString("nb-NO")}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          <Separator />

          {/* Status-specific content */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
          >
            {isSubmitted ? (
              <div className="space-y-3">
                <div className="flex items-center gap-3 p-3 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800">
                  <div className="flex items-center justify-center size-10 rounded-full bg-emerald-100 dark:bg-emerald-900/50">
                    <CheckCircle2Icon className="size-5 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-emerald-800 dark:text-emerald-200">
                      Sendt til Altinn
                    </p>
                    <p className="text-xs text-emerald-600 dark:text-emerald-400">
                      {new Date(termin.submittedDate!).toLocaleDateString("nb-NO", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })}
                      {daysInfo && ` \u2022 ${daysInfo.days} dager siden`}
                    </p>
                  </div>
                </div>
                {altinnRef && (
                  <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
                    <div>
                      <p className="text-xs text-muted-foreground">Altinn-referanse</p>
                      <p className="text-sm font-mono font-medium">{altinnRef}</p>
                    </div>
                    <Button variant="ghost" size="sm" className="gap-2 text-xs">
                      <ExternalLinkIcon className="size-3" />
                      Vis i Altinn
                    </Button>
                  </div>
                )}
              </div>
            ) : isReady ? (
              <div className="space-y-3">
                <div className="flex items-center gap-3 p-3 rounded-lg bg-[var(--primary)]/5 border border-[var(--primary)]/20">
                  <div className="flex items-center justify-center size-10 rounded-full bg-[var(--primary)]/10">
                    <CalendarIcon className="size-5 text-[var(--primary)]" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">
                      Frist: {new Date(termin.deadline!).toLocaleDateString("nb-NO", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })}
                    </p>
                    {daysInfo && (
                      <p className={cn(
                        "text-xs",
                        daysInfo.days <= 7 ? "text-amber-600 dark:text-amber-400 font-medium" : "text-muted-foreground"
                      )}>
                        {daysInfo.days} dager igjen
                      </p>
                    )}
                  </div>
                </div>
                {autonomyMode === "autonomous" && (
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 border">
                    <CiriLogo size="sm" />
                    <p className="text-xs text-muted-foreground">
                      Ciri sender automatisk 2 dager før frist
                    </p>
                  </div>
                )}
              </div>
            ) : null}
          </motion.div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t bg-muted/30 flex justify-between items-center">
          <Button variant="ghost" size="sm" className="gap-2 text-xs">
            <DownloadIcon className="size-3" />
            Last ned PDF
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
              Lukk
            </Button>
            {isReady && (
              <Button size="sm" className="gap-2">
                <EyeIcon className="size-4" />
                Forhåndsvis
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
