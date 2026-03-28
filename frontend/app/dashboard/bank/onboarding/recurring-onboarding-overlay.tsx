"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  CheckIcon,
  XIcon,
  RepeatIcon,
  SparklesIcon,
  ArrowRightIcon,
  CalendarIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import CiriLogo from "@/components/layout/ciri-logo";
import { type RecurringPattern, MOCK_BANK_NAME } from "./mock-data";
import { allMockTransactions } from "./mock-transactions";
import { detectRecurringPatterns } from "./detect-recurring";

type Phase = "fetching" | "patterns" | "done";

interface FetchStep {
  text: string;
  duration: number;
}

// Run detection on mock data (in production this would happen server-side)
const detectedPatterns = detectRecurringPatterns(allMockTransactions);
const TOTAL_TX_COUNT = allMockTransactions.length;

const FETCH_STEPS: FetchStep[] = [
  { text: `Kobler til ${MOCK_BANK_NAME}...`, duration: 800 },
  { text: "Henter bedriftskonto...", duration: 600 },
  { text: "Henter 3 måneder med transaksjoner...", duration: 1400 },
  { text: `${TOTAL_TX_COUNT} transaksjoner funnet`, duration: 500 },
  { text: "Analyserer mønstre...", duration: 1200 },
];

const categoryColors: Record<string, string> = {
  leie: "bg-violet-500",
  kontor: "bg-purple-500",
  forsikring: "bg-cyan-500",
  bank: "bg-indigo-500",
};

function formatAmount(n: number) {
  return Math.abs(n).toLocaleString("nb-NO");
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("nb-NO", { day: "2-digit", month: "short" });
}

// ─── Phase 1: Fetching Animation ────────────────────────────

function FetchingPhase({ onComplete }: { onComplete: () => void }) {
  const [stepIndex, setStepIndex] = useState(0);
  const [txCount, setTxCount] = useState(0);

  useEffect(() => {
    if (stepIndex >= FETCH_STEPS.length) {
      const timer = setTimeout(onComplete, 600);
      return () => clearTimeout(timer);
    }

    const timer = setTimeout(() => {
      if (stepIndex === 3) setTxCount(TOTAL_TX_COUNT);
      setStepIndex((i) => i + 1);
    }, FETCH_STEPS[stepIndex].duration);

    return () => clearTimeout(timer);
  }, [stepIndex, onComplete]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, y: -20 }}
      className="flex flex-col items-center text-center"
    >
      <motion.div
        animate={{ scale: [1, 1.05, 1] }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
      >
        <CiriLogo size="xl" animated intensity="dramatic" showPulseRings />
      </motion.div>

      <div className="mt-8 space-y-3 min-h-[120px]">
        <AnimatePresence mode="wait">
          <motion.p
            key={stepIndex}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="text-lg font-medium"
          >
            {stepIndex < FETCH_STEPS.length ? FETCH_STEPS[stepIndex].text : "Klar!"}
          </motion.p>
        </AnimatePresence>

        {/* Progress dots */}
        <div className="flex items-center justify-center gap-1.5">
          {FETCH_STEPS.map((_, i) => (
            <motion.div
              key={i}
              className={cn(
                "size-2 rounded-full transition-colors duration-300",
                i < stepIndex ? "bg-[var(--primary)]" : i === stepIndex ? "bg-[var(--primary)]/60" : "bg-muted-foreground/20"
              )}
              animate={i === stepIndex ? { scale: [1, 1.3, 1] } : {}}
              transition={{ duration: 0.6, repeat: Infinity }}
            />
          ))}
        </div>

        {txCount > 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="inline-flex items-center gap-2 rounded-full border bg-card px-4 py-2 shadow-sm"
          >
            <span className="font-mono text-2xl font-bold tabular-nums text-[var(--primary)]">{txCount}</span>
            <span className="text-sm text-muted-foreground">transaksjoner</span>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}

// ─── Timeline Dots ──────────────────────────────────────────

function TransactionTimeline({ transactions }: { transactions: RecurringPattern["transactions"] }) {
  const sorted = [...transactions].sort((a, b) => a.date.localeCompare(b.date));

  return (
    <div className="flex items-center gap-1">
      {sorted.map((tx, i) => (
        <div key={i} className="flex items-center">
          <div className="flex flex-col items-center gap-0.5">
            <div className="size-2.5 rounded-full bg-[var(--primary)]" />
            <span className="text-[13px] text-muted-foreground tabular-nums whitespace-nowrap">
              {formatDate(tx.date)}
            </span>
          </div>
          {i < sorted.length - 1 && (
            <div className="h-px w-6 bg-[var(--primary)]/30 -mt-3" />
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Pattern Card ───────────────────────────────────────────

function PatternCard({
  pattern,
  index,
  onToggle,
}: {
  pattern: RecurringPattern;
  index: number;
  onToggle: (id: string) => void;
}) {
  const isConfirmed = pattern.confirmed === true;
  const isRejected = pattern.confirmed === false;
  const dotColor = categoryColors[pattern.category] || "bg-muted-foreground";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08, type: "spring", stiffness: 300, damping: 30 }}
      className={cn(
        "group relative rounded-xl border p-4 transition-all duration-200",
        isConfirmed && "border-[var(--primary)]/40 bg-[var(--primary)]/[0.03]",
        isRejected && "border-muted bg-muted/30 opacity-60",
        !isConfirmed && !isRejected && "border-border hover:border-[var(--primary)]/30"
      )}
    >
      <div className="flex items-start gap-4">
        {/* Left: category accent + info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <div className={cn("size-2.5 rounded-full shrink-0", dotColor)} />
            <span className="font-semibold text-sm truncate">{pattern.merchantName}</span>
          </div>

          <div className="flex items-center gap-3 text-xs text-muted-foreground mb-3">
            <span className="flex items-center gap-1">
              <RepeatIcon className="size-3" />
              {pattern.frequencyLabel}
            </span>
            <span className="flex items-center gap-1">
              <CalendarIcon className="size-3" />
              {pattern.transactions.length} forekomster
            </span>
            <Badge variant="secondary" className="text-[12px] h-4 px-1.5">
              {pattern.categoryLabel}
            </Badge>
          </div>

          {/* Timeline */}
          <TransactionTimeline transactions={pattern.transactions} />

          {/* Account suggestion */}
          <p className="mt-2 text-[13px] text-muted-foreground">
            Konto {pattern.suggestedAccount} · ca. kr {formatAmount(pattern.avgAmount)}/{pattern.frequency === "monthly" ? "mnd" : pattern.frequency === "quarterly" ? "kvartal" : "uke"}
          </p>
        </div>

        {/* Right: amount + toggle */}
        <div className="flex flex-col items-end gap-3 shrink-0">
          <span className="font-mono text-lg font-bold tabular-nums">
            kr {formatAmount(pattern.avgAmount)}
          </span>

          <button
            onClick={() => onToggle(pattern.id)}
            className={cn(
              "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all duration-200",
              isConfirmed
                ? "bg-[var(--primary)] text-white shadow-sm"
                : isRejected
                  ? "bg-muted text-muted-foreground"
                  : "bg-[var(--primary)]/10 text-[var(--primary)] hover:bg-[var(--primary)]/20"
            )}
          >
            {isConfirmed ? (
              <>
                <CheckIcon className="size-3.5" />
                Gjentakende
              </>
            ) : isRejected ? (
              <>
                <XIcon className="size-3.5" />
                Ikke gjentakende
              </>
            ) : (
              <>
                <CheckIcon className="size-3.5" />
                Gjentakende
              </>
            )}
          </button>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Phase 2: Patterns ──────────────────────────────────────

function PatternsPhase({
  patterns,
  onToggle,
  onConfirmAll,
  onFinish,
}: {
  patterns: RecurringPattern[];
  onToggle: (id: string) => void;
  onConfirmAll: () => void;
  onFinish: () => void;
}) {
  const confirmedCount = patterns.filter((p) => p.confirmed === true).length;
  const allDecided = patterns.every((p) => p.confirmed !== null);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, y: -20 }}
      className="w-full max-w-2xl"
    >
      {/* Header */}
      <div className="text-center mb-6">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="inline-flex items-center gap-2 mb-3"
        >
          <CiriLogo size="sm" />
          <Badge variant="secondary" className="gap-1 bg-[var(--primary)]/10 text-[var(--primary)] border-0">
            <SparklesIcon className="size-3" />
            Analyse fullført
          </Badge>
        </motion.div>
        <h2 className="font-display text-2xl font-bold tracking-tight">
          Ciri fant {patterns.length} gjentakende transaksjoner
        </h2>
        <p className="text-muted-foreground mt-1 text-sm max-w-md mx-auto">
          Bekreft hvilke som er gjentakende, så bokfører Ciri dem automatisk fremover.
        </p>
      </div>

      {/* Bulk action */}
      <div className="flex items-center justify-between mb-4">
        <span className="text-xs text-muted-foreground">
          {confirmedCount} av {patterns.length} bekreftet
        </span>
        <Button variant="ghost" size="sm" className="text-xs h-7 gap-1" onClick={onConfirmAll}>
          <CheckIcon className="size-3" />
          Bekreft alle
        </Button>
      </div>

      {/* Cards */}
      <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-1">
        {patterns.map((pattern, i) => (
          <PatternCard key={pattern.id} pattern={pattern} index={i} onToggle={onToggle} />
        ))}
      </div>

      {/* Footer */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="mt-6 flex items-center justify-between"
      >
        <p className="text-xs text-muted-foreground max-w-xs">
          Du kan alltid endre dette senere under Bank → Regler
        </p>
        <Button onClick={onFinish} className="gap-2" disabled={!allDecided}>
          Fullfør
          <ArrowRightIcon className="size-4" />
        </Button>
      </motion.div>
    </motion.div>
  );
}

// ─── Phase 3: Done ──────────────────────────────────────────

function DonePhase({ confirmedCount, onClose }: { confirmedCount: number; onClose: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center text-center"
    >
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 300, damping: 20, delay: 0.1 }}
        className="flex size-16 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30 mb-6"
      >
        <CheckIcon className="size-8 text-emerald-600" />
      </motion.div>

      <h2 className="font-display text-2xl font-bold tracking-tight">Alt klart!</h2>
      <p className="text-muted-foreground mt-2 max-w-sm text-sm">
        {confirmedCount} gjentakende {confirmedCount === 1 ? "transaksjon" : "transaksjoner"} er satt opp.
        Ciri vil automatisk bokføre dem når de dukker opp.
      </p>

      <div className="mt-4 flex items-center gap-2 rounded-lg border bg-muted/30 px-4 py-3">
        <CiriLogo size="sm" />
        <p className="text-sm text-left">
          <span className="font-medium">Neste gang {confirmedCount === 1 ? "denne transaksjonen" : "disse transaksjonene"} kommer inn,</span>{" "}
          <span className="text-muted-foreground">bokfører jeg det automatisk med riktig konto og kategori.</span>
        </p>
      </div>

      <Button onClick={onClose} className="mt-6 gap-2">
        Gå til transaksjoner
        <ArrowRightIcon className="size-4" />
      </Button>
    </motion.div>
  );
}

// ─── Main Overlay ───────────────────────────────────────────

export function RecurringOnboardingOverlay({ onClose }: { onClose: () => void }) {
  const [phase, setPhase] = useState<Phase>("fetching");
  const [patterns, setPatterns] = useState<RecurringPattern[]>(
    detectedPatterns.map((p) => ({ ...p, confirmed: true }))
  );

  const handleToggle = useCallback((id: string) => {
    setPatterns((prev) =>
      prev.map((p) => {
        if (p.id !== id) return p;
        // Cycle: true → false → true
        return { ...p, confirmed: !p.confirmed };
      })
    );
  }, []);

  const handleConfirmAll = useCallback(() => {
    setPatterns((prev) => prev.map((p) => ({ ...p, confirmed: true })));
  }, []);

  const handleFinish = useCallback(() => {
    setPhase("done");
  }, []);

  const handleFetchComplete = useCallback(() => {
    setPhase("patterns");
  }, []);

  const confirmedCount = patterns.filter((p) => p.confirmed === true).length;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 backdrop-blur-xl"
    >
      {/* Subtle background gradient */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[var(--primary)]/[0.03] via-transparent to-[var(--primary)]/[0.03]" />

      {/* Close button (only in patterns phase) */}
      {phase === "patterns" && (
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          onClick={onClose}
          className="absolute right-6 top-6 flex size-8 items-center justify-center rounded-full border bg-card text-muted-foreground hover:text-foreground transition-colors"
        >
          <XIcon className="size-4" />
        </motion.button>
      )}

      {/* Content */}
      <div className="relative w-full max-w-2xl px-6">
        <AnimatePresence mode="wait">
          {phase === "fetching" && (
            <FetchingPhase key="fetching" onComplete={handleFetchComplete} />
          )}
          {phase === "patterns" && (
            <PatternsPhase
              key="patterns"
              patterns={patterns}
              onToggle={handleToggle}
              onConfirmAll={handleConfirmAll}
              onFinish={handleFinish}
            />
          )}
          {phase === "done" && (
            <DonePhase key="done" confirmedCount={confirmedCount} onClose={onClose} />
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
