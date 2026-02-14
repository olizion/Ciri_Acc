import {
  EyeOffIcon,
  ShuffleIcon,
  AlertTriangleIcon,
  MessageSquareIcon,
} from "lucide-react";
import type { ReconciliationPeriod } from "./types";

// ============================================================================
// CONSTANTS
// ============================================================================

export const emptyPeriod: ReconciliationPeriod = {
  period: "",
  bank_balance: 0,
  booked_balance: 0,
  difference: 0,
  total_transactions: 0,
  matched_transactions: 0,
  unmatched_transactions: 0,
  pending_suggestions: 0,
  auto_match_rate: 0,
};

export const confidenceConfig = {
  high: {
    label: "Høy",
    color: "text-emerald-600 dark:text-emerald-400",
    bg: "bg-emerald-500",
    bgLight: "bg-emerald-50 dark:bg-emerald-950/40",
    border: "border-emerald-200 dark:border-emerald-800/50",
    ringColor: "ring-emerald-500/20",
    gradient: "from-emerald-500/10 via-emerald-500/5 to-transparent",
    accentLine: "bg-emerald-500",
  },
  medium: {
    label: "Middels",
    color: "text-amber-600 dark:text-amber-400",
    bg: "bg-amber-500",
    bgLight: "bg-amber-50/80 dark:bg-amber-950/30",
    border: "border-amber-200 dark:border-amber-800/50",
    ringColor: "ring-amber-500/20",
    gradient: "from-amber-500/10 via-amber-500/5 to-transparent",
    accentLine: "bg-amber-500",
  },
  low: {
    label: "Lav",
    color: "text-red-600 dark:text-red-400",
    bg: "bg-red-500",
    bgLight: "bg-red-50/80 dark:bg-red-950/30",
    border: "border-red-200 dark:border-red-800/50",
    ringColor: "ring-red-500/20",
    gradient: "from-red-500/10 via-red-500/5 to-transparent",
    accentLine: "bg-red-500",
  },
} as const;

export const REJECT_REASONS = [
  { key: "private_expense", label: "Privat utgift", icon: EyeOffIcon, desc: "Ikke forretningsrelatert" },
  { key: "wrong_match", label: "Feil kobling", icon: ShuffleIcon, desc: "Riktig transaksjon, feil bilag" },
  { key: "wrong_amount", label: "Feil beløp", icon: AlertTriangleIcon, desc: "Beløpene stemmer ikke" },
  { key: "other", label: "Annet", icon: MessageSquareIcon, desc: "Skriv egen begrunnelse" },
] as const;
