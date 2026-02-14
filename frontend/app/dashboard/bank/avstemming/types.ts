// ============================================================================
// SHARED TYPES
// ============================================================================

export type MatchConfidence = "high" | "medium" | "low";
export type MatchStatus = "suggested" | "confirmed" | "rejected";
export type ReconciliationStatus = "unmatched" | "suggested" | "matched" | "ignored";

export interface BilagInfo {
  id: string;
  bilag_number: string;
  description: string;
  amount: number;
  date: string;
  supplier?: string;
  suggested_account?: string;
  category?: string;
}

export interface MatchSuggestion {
  id: string;
  transaction_id: string;
  bilag: BilagInfo;
  confidence: MatchConfidence;
  confidence_score: number;
  ciri_explanation: string;
  status: MatchStatus;
  match_factors: {
    exact_amount?: boolean;
    reference_match?: boolean;
    name_similarity?: number;
    date_proximity?: number;
  };
  // Enriched transaction data from suggestions API
  transaction_date?: string;
  transaction_description?: string;
  transaction_merchant_name?: string;
  transaction_amount?: number;
}

export interface Transaction {
  id: string;
  date: string;
  description: string;
  merchant_name?: string;
  amount: number;
  category: string;
  reconciliation_status: ReconciliationStatus;
  match?: MatchSuggestion;
}

export interface ReconciliationPeriod {
  period: string;
  bank_balance: number;
  booked_balance: number;
  difference: number;
  total_transactions: number;
  matched_transactions: number;
  unmatched_transactions: number;
  pending_suggestions: number;
  auto_match_rate: number;
}
