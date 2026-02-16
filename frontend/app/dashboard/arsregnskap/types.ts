export interface ChecklistItem {
  id: string;
  name: string;
  description: string;
  status: "complete" | "warning" | "pending" | "in_progress";
  detail?: string;
  subItems?: { name: string; complete: boolean }[];
  canAutoFix?: boolean;
}

export interface MissingBilag {
  id: string;
  date: string;
  amount: number;
  description: string;
  bankAccount: string;
  status: "missing" | "needs_review" | "matched";
}

export interface CiriActivity {
  id: string;
  task: string;
  timestamp: Date;
  status: "completed" | "in_progress";
}

export interface AccountLine {
  konto: string;
  navn: string;
  thisYear: number;
  lastYear: number;
  bilagCount?: number;
  bilag?: BilagEntry[];
}

export interface BilagEntry {
  id: string;
  date: string;
  description: string;
  amount: number;
  supplier?: string;
}

export interface AccountGroup {
  name: string;
  accounts: AccountLine[];
  isSum?: boolean;
}

// ── API response types (match backend models) ──────────────

export interface ApiAccountData {
  account_code: string;
  account_name: string;
  total_gross: number;
  total_net: number;
  total_mva: number;
  bilag_count: number;
  monthly_amounts: number[];
}

export interface ApiResultatResponse {
  year: number;
  accounts: ApiAccountData[];
  total_gross: number;
  total_net: number;
  total_mva: number;
  by_category: Record<string, number>;
}

export interface ApiAccountBalance {
  account_code: string;
  account_name: string;
  balance: number;
}

export interface ApiBalanseResponse {
  as_of_date: string;
  leverandorgjeld: number;
  leverandorgjeld_count: number;
  posted_total: number;
  posted_count: number;
  account_balances: ApiAccountBalance[];
}

export interface BilagDetailApi {
  id: string;
  bilag_number: string;
  document_date: string;
  description: string;
  counterparty_name: string | null;
  gross_amount: number;
  net_amount: number;
  mva_amount: number;
}

export interface AccountBilagResponse {
  account_code: string;
  account_name: string;
  year: number;
  bilags: BilagDetailApi[];
  total_amount: number;
}
