// ============================================================================
// SHARED TYPES
// ============================================================================

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
