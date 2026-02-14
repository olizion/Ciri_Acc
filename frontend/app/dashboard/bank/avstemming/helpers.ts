import type {
  MatchConfidence,
  MatchStatus,
  MatchSuggestion,
  ReconciliationPeriod,
  ReconciliationStatus,
  Transaction,
} from "./types";

// ============================================================================
// FORMATTING HELPERS
// ============================================================================

export function krFormat(n: number, decimals = 0): string {
  return Math.abs(n).toLocaleString("nb-NO", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export function dateShort(d: string): string {
  return new Date(d).toLocaleDateString("nb-NO", {
    day: "2-digit",
    month: "short",
  });
}

export function dateFull(d: string): string {
  return new Date(d).toLocaleDateString("nb-NO", {
    day: "numeric",
    month: "long",
  });
}

// ============================================================================
// API RESPONSE MAPPING
// ============================================================================

export function mapApiSuggestion(s: Record<string, unknown>): MatchSuggestion {
  const factors = (s.match_factors as Record<string, Record<string, unknown>>) || {};
  return {
    id: String(s.id),
    transaction_id: String(s.transaction_id ?? ""),
    bilag: {
      id: String(s.bilag_id ?? ""),
      bilag_number: String(s.bilag_number ?? ""),
      description: String(s.bilag_description ?? ""),
      amount: Number(s.bilag_amount ?? 0),
      date: String(s.bilag_date ?? ""),
      supplier: s.bilag_supplier ? String(s.bilag_supplier) : undefined,
      suggested_account: s.bilag_suggested_account ? String(s.bilag_suggested_account) : undefined,
      category: s.bilag_category ? String(s.bilag_category) : undefined,
    },
    confidence: (s.confidence as MatchConfidence) || "low",
    confidence_score: Number(s.confidence_score ?? 0),
    ciri_explanation: String(s.ciri_explanation ?? ""),
    status: (s.status as MatchStatus) || "suggested",
    match_factors: {
      exact_amount: factors.exact_amount?.matched as boolean | undefined
        ?? factors.amount_tolerance?.matched as boolean | undefined,
      reference_match: factors.reference_match?.matched as boolean | undefined,
      name_similarity: factors.name_similarity?.similarity as number | undefined,
      date_proximity: factors.date_proximity?.days_difference as number | undefined,
    },
    transaction_date: s.transaction_date ? String(s.transaction_date) : undefined,
    transaction_description: s.transaction_description ? String(s.transaction_description) : undefined,
    transaction_merchant_name: s.transaction_merchant_name ? String(s.transaction_merchant_name) : undefined,
    transaction_amount: s.transaction_amount != null ? Number(s.transaction_amount) : undefined,
  };
}

export function mapApiTransaction(t: Record<string, unknown>): Transaction {
  return {
    id: String(t.id),
    date: String(t.booking_date ?? ""),
    description: String(t.raw_description ?? t.cleaned_description ?? ""),
    merchant_name: t.merchant_name ? String(t.merchant_name) : undefined,
    amount: Number(t.amount ?? 0),
    category: String(t.category ?? "ukategorisert"),
    reconciliation_status: (t.reconciliation_status as ReconciliationStatus) || "unmatched",
    match: t.match ? mapApiSuggestion(t.match as Record<string, unknown>) : undefined,
  };
}

export function mapApiPeriod(p: Record<string, unknown>): ReconciliationPeriod {
  return {
    period: String(p.period ?? ""),
    bank_balance: Number(p.bank_balance ?? 0),
    booked_balance: Number(p.booked_balance ?? 0),
    difference: Number(p.difference ?? 0),
    total_transactions: Number(p.total_transactions ?? 0),
    matched_transactions: Number(p.matched_transactions ?? 0),
    unmatched_transactions: Number(p.unmatched_transactions ?? 0),
    pending_suggestions: Number(p.pending_suggestions ?? 0),
    auto_match_rate: Number(p.auto_match_rate ?? 0),
  };
}
