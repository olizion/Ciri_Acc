// ============================================================================
// SHARED TYPES
// ============================================================================

export type RuleType = "auto_category" | "auto_match" | "ignore" | "split";
export type RulePriority = "high" | "medium" | "low";

export interface RuleCriteria {
  description_contains?: string;
  amount_min?: number;
  amount_max?: number;
  amount_exact?: number;
  direction?: "debit" | "credit";
  merchant_name?: string;
}

export interface RuleAction {
  category?: string;
  account?: string;
  mva_code?: string;
  mark_private?: boolean;
}

export interface CascadeResult {
  transactions_marked_private: number;
  bilags_rejected: number;
  matches_rejected: number;
  total_affected: number;
}

export interface Rule {
  id: string;
  name: string;
  description?: string;
  rule_type: RuleType;
  priority: RulePriority;
  criteria: RuleCriteria;
  action: RuleAction;
  is_active: boolean;
  times_applied: number;
  times_overridden: number;
  last_applied_at?: string;
  learned_from_user: boolean;
  confidence_threshold?: number | null;
  created_at?: string;
  cascade?: CascadeResult | null;
}

export interface RuleStats {
  total_rules: number;
  active_rules: number;
  learned_rules: number;
  total_applied: number;
  total_transactions: number;
  matched_transactions: number;
  auto_handled: number;
  autonomy_percentage: number;
  autonomy_level: string;
}

export interface ClusterStatsData {
  total_clusters: number;
  strong_clusters: number;
  growing_clusters: number;
  weak_clusters: number;
  total_data_points: number;
  overridden_data_points: number;
  global_minimums_passed: boolean;
  global_minimums_reason: string;
  clusters: ClusterInfo[];
}

export interface ClusterInfo {
  account_number: string;
  account_name?: string;
  category: string;
  total_points: number;
  distinct_merchants: number;
  strength: number;
  strength_level: "weak" | "growing" | "strong";
  amount_range: string;
  dominant_direction: string;
  example_merchants: string[];
  overridden_count: number;
}
