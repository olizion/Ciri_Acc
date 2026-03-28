"use client";

import { useState, memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  CheckIcon,
  XIcon,
  CreditCardIcon,
  LinkIcon,
  MessageSquareIcon,
  ReceiptIcon,
  ChevronRightIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import CiriLogo from "@/components/layout/ciri-logo";
import type { MatchSuggestion, Transaction } from "../types";
import { confidenceConfig, REJECT_REASONS } from "../constants";
import { dateFull, krFormat } from "../helpers";
import { FactorPill } from "./factor-pill";

// ============================================================================
// MatchCard
// ============================================================================

interface MatchCardProps {
  suggestion: MatchSuggestion;
  transaction: Transaction;
  onConfirm: (feedback?: string) => void;
  onReject: (reason: string, feedback?: string) => void;
  index: number;
}

export const MatchCard = memo(function MatchCard({
  suggestion,
  transaction,
  onConfirm,
  onReject,
  index,
}: MatchCardProps) {
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedbackText, setFeedbackText] = useState("");
  const [rejectMode, setRejectMode] = useState(false);
  const [otherRejectMode, setOtherRejectMode] = useState(false);
  const conf = confidenceConfig[suggestion.confidence] ?? confidenceConfig.low;
  const scorePercent = Math.round(suggestion.confidence_score * 100);

  const amountDiff =
    Math.abs(transaction.amount) - Math.abs(suggestion.bilag.amount);
  const amountMatch = Math.abs(amountDiff) < 1;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{
        delay: index * 0.06,
        duration: 0.25,
        ease: [0.23, 1, 0.32, 1],
        layout: { duration: 0.25, ease: [0.25, 0.1, 0.25, 1] },
      }}
      layout
      className="group relative"
    >
      <div
        className={cn(
          "relative overflow-hidden rounded-xl border bg-card",
          "transition-shadow duration-300",
          "hover:shadow-lg hover:shadow-black/[0.04] dark:hover:shadow-black/20",
          conf.border
        )}
      >
        {/* Accent line at top */}
        <div className={cn("h-[2px] w-full", conf.accentLine)} />

        {/* Card content */}
        <div className="p-4">
          {/* Top row: confidence badge + score + Ciri */}
          <div className="flex items-center gap-2.5 mb-3.5">
            <CiriLogo size="sm" />
            <div className="flex-1 min-w-0">
              <p className="text-[13px] leading-snug text-foreground/80">
                {suggestion.ciri_explanation}
              </p>
            </div>
            {/* Confidence score ring */}
            <div className="relative flex-shrink-0">
              <svg width="40" height="40" viewBox="0 0 40 40" className="rotate-[-90deg]">
                <circle
                  cx="20" cy="20" r="16"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  className="text-muted/60"
                />
                <circle
                  cx="20" cy="20" r="16"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeDasharray={`${(scorePercent / 100) * 2 * Math.PI * 16} ${2 * Math.PI * 16}`}
                  strokeLinecap="round"
                  className={conf.color}
                />
              </svg>
              <span className={cn(
                "absolute inset-0 flex items-center justify-center text-[13px] font-bold tabular-nums",
                conf.color
              )}>
                {scorePercent}
              </span>
            </div>
          </div>

          {/* The pairing -- two panels connected visually */}
          <div className="relative flex gap-0 items-stretch">
            {/* TRANSACTION panel (left) */}
            <div className="flex-1 rounded-lg bg-muted/40 p-3 border border-border/50">
              <div className="flex items-center gap-1.5 mb-2">
                <CreditCardIcon className="size-3 text-muted-foreground/60" />
                <span className="text-[12px] font-semibold uppercase tracking-wider text-muted-foreground/60">
                  Banktransaksjon
                </span>
              </div>
              <p className="text-sm font-semibold text-foreground truncate">
                {transaction.merchant_name || transaction.description}
              </p>
              <p className="text-[13px] text-muted-foreground mt-0.5 truncate">
                {transaction.description !== (transaction.merchant_name || transaction.description)
                  ? transaction.description
                  : ""}
              </p>
              <div className="flex items-baseline justify-between mt-2">
                <span className="text-[13px] text-muted-foreground">
                  {dateFull(transaction.date)}
                </span>
                <span className={cn(
                  "text-base font-bold font-display tabular-nums",
                  transaction.amount < 0 ? "text-foreground" : "text-emerald-600 dark:text-emerald-400"
                )}>
                  {transaction.amount < 0 ? "\u2212" : "+"}kr {krFormat(transaction.amount)}
                </span>
              </div>
            </div>

            {/* CENTER connector */}
            <div className="flex flex-col items-center justify-center w-10 relative z-10">
              <div className="flex-1 w-px border-l border-dashed border-border" />
              <div className={cn(
                "size-7 rounded-full flex items-center justify-center -my-px",
                "bg-card border-2 shadow-sm",
                conf.border,
              )}>
                <LinkIcon className={cn("size-3", conf.color)} />
              </div>
              <div className="flex-1 w-px border-l border-dashed border-border" />
            </div>

            {/* BILAG panel (right) */}
            <div className={cn(
              "flex-1 rounded-lg p-3 border",
              conf.bgLight,
              conf.border,
            )}>
              <div className="flex items-center gap-1.5 mb-2">
                <ReceiptIcon className="size-3 text-muted-foreground/60" />
                <span className="text-[12px] font-semibold uppercase tracking-wider text-muted-foreground/60">
                  Bilag
                </span>
                <span className={cn(
                  "ml-auto text-[12px] font-mono tabular-nums px-1.5 py-0.5 rounded bg-card/80",
                  "text-muted-foreground border border-border/50"
                )}>
                  {suggestion.bilag.bilag_number}
                </span>
              </div>
              <p className="text-sm font-semibold text-foreground truncate">
                {suggestion.bilag.supplier || suggestion.bilag.description}
              </p>
              <p className="text-[13px] text-muted-foreground mt-0.5 truncate">
                {suggestion.bilag.description}
              </p>
              {suggestion.bilag.suggested_account && (
                <div className="flex items-center gap-1.5 mt-1.5">
                  <span className="inline-flex items-center gap-1 text-[12px] font-mono tabular-nums px-1.5 py-0.5 rounded-md bg-violet-500/10 text-violet-700 dark:text-violet-300 border border-violet-500/20">
                    <ChevronRightIcon className="size-2.5" />
                    Konto {suggestion.bilag.suggested_account}
                  </span>
                  {suggestion.bilag.category && (
                    <span className="text-[12px] text-muted-foreground/70">
                      {suggestion.bilag.category}
                    </span>
                  )}
                </div>
              )}
              <div className="flex items-baseline justify-between mt-2">
                <span className="text-[13px] text-muted-foreground">
                  {dateFull(suggestion.bilag.date)}
                </span>
                <span className="text-base font-bold font-display tabular-nums text-foreground">
                  {suggestion.bilag.amount < 0 ? "\u2212" : "+"}kr {krFormat(suggestion.bilag.amount)}
                </span>
              </div>
            </div>
          </div>

          {/* Match factors bar */}
          <div className="flex items-center gap-2 mt-3 flex-wrap">
            <FactorPill
              label="Beløp"
              matched={suggestion.match_factors.exact_amount || false}
              detail={
                amountMatch
                  ? "Eksakt"
                  : `Avvik kr ${krFormat(amountDiff)}`
              }
            />
            {suggestion.match_factors.name_similarity !== undefined && (
              <FactorPill
                label="Leverandør"
                matched={suggestion.match_factors.name_similarity >= 0.7}
                detail={`${Math.round(suggestion.match_factors.name_similarity * 100)}% match`}
              />
            )}
            {suggestion.match_factors.date_proximity !== undefined && (
              <FactorPill
                label="Dato"
                matched={suggestion.match_factors.date_proximity <= 5}
                detail={
                  suggestion.match_factors.date_proximity === 0
                    ? "Samme dag"
                    : `${suggestion.match_factors.date_proximity} dager`
                }
              />
            )}
            {suggestion.match_factors.reference_match && (
              <FactorPill label="Referanse" matched detail="Treff" />
            )}
          </div>

          {/* Feedback toggle */}
          <AnimatePresence>
            {showFeedback && !rejectMode && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="mt-3">
                  <Textarea
                    placeholder="Fortell Ciri hvorfor du godkjenner..."
                    value={feedbackText}
                    onChange={(e) => setFeedbackText(e.target.value)}
                    rows={2}
                    className="resize-none text-xs"
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Reject reason picker */}
          <AnimatePresence>
            {rejectMode && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.25 }}
                className="overflow-hidden"
              >
                <div className="mt-3 pt-3 border-t border-border/50">
                  <p className="text-[13px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                    Hvorfor avviser du?
                  </p>
                  <div className="grid grid-cols-2 gap-1.5">
                    {REJECT_REASONS.map((reason) => {
                      const Icon = reason.icon;
                      return (
                        <button
                          key={reason.key}
                          onClick={() => {
                            if (reason.key === "other") {
                              setRejectMode(false);
                              setShowFeedback(false);
                              setOtherRejectMode(true);
                            } else {
                              onReject(reason.key, feedbackText || undefined);
                            }
                          }}
                          className={cn(
                            "flex items-center gap-2 rounded-lg border p-2.5 text-left transition-all",
                            "hover:border-red-300 hover:bg-red-50/50 dark:hover:border-red-800 dark:hover:bg-red-950/20",
                            reason.key === "private_expense"
                              ? "border-red-200/60 dark:border-red-900/40"
                              : "border-border"
                          )}
                        >
                          <Icon className="size-3.5 text-muted-foreground shrink-0" />
                          <div className="min-w-0">
                            <p className="text-xs font-medium leading-tight">{reason.label}</p>
                            <p className="text-[12px] text-muted-foreground leading-tight">{reason.desc}</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                  <button
                    onClick={() => setRejectMode(false)}
                    className="mt-2 text-[13px] text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Avbryt
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* "Other" reject textarea */}
          <AnimatePresence>
            {otherRejectMode && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="mt-3">
                  <Textarea
                    placeholder="Beskriv hvorfor du avviser..."
                    value={feedbackText}
                    onChange={(e) => setFeedbackText(e.target.value)}
                    rows={2}
                    className="resize-none text-xs"
                    autoFocus
                  />
                  <div className="flex items-center gap-2 mt-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 px-2 text-[13px]"
                      onClick={() => { setOtherRejectMode(false); setFeedbackText(""); }}
                    >
                      Avbryt
                    </Button>
                    <Button
                      size="sm"
                      className="h-6 px-3 text-[13px] bg-red-600 hover:bg-red-700 text-white"
                      onClick={() => onReject("other", feedbackText || undefined)}
                      disabled={!feedbackText.trim()}
                    >
                      Avvis
                    </Button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Action buttons */}
          {!rejectMode && !otherRejectMode && (
            <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border/50">
              <button
                onClick={() => setShowFeedback(!showFeedback)}
                className={cn(
                  "flex items-center gap-1 text-[13px] text-muted-foreground hover:text-foreground transition-colors",
                  showFeedback && "text-foreground"
                )}
              >
                <MessageSquareIcon className="size-3" />
                Kommentar
              </button>

              <div className="flex-1" />

              <Button
                size="sm"
                variant="ghost"
                className="h-7 px-3 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30"
                onClick={() => setRejectMode(true)}
              >
                <XIcon className="size-3 mr-1" />
                Avvis
              </Button>
              <Button
                size="sm"
                className={cn(
                  "h-7 px-4 text-xs font-medium",
                  "bg-emerald-600 hover:bg-emerald-700 text-white",
                  "dark:bg-emerald-600 dark:hover:bg-emerald-500"
                )}
                onClick={() => onConfirm(feedbackText || undefined)}
              >
                <CheckIcon className="size-3 mr-1" />
                Bekreft match
              </Button>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
});
