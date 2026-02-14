import type { LucideIcon } from "lucide-react";

export interface MVATermin {
  id: string;
  termin: string;
  period: string;
  utgaende: number;
  inngaende: number;
  tilGode: number;
  status: "submitted" | "ready" | "upcoming";
  deadline?: string;
  submittedDate?: string;
}

export interface IncomeItem {
  id: string;
  date: string;
  description: string;
  customer: string;
  invoiceNo: string;
  amount: number;
  mvaRate: number;
  mva: number;
  category: string;
  icon: LucideIcon;
}

export interface ExpenseItem {
  id: string;
  date: string;
  description: string;
  vendor: string;
  bilagNo: string;
  amount: number;
  mvaRate: number;
  mva: number;
  category: string;
  mvaCode: string;
  icon: LucideIcon;
  status: "verified" | "needs_review";
  warning?: string;
}

export interface ExpenseCategory {
  category: string;
  count: number;
  total: number;
  mva: number;
  icon: LucideIcon;
}

export interface StatusConfig {
  label: string;
  icon: LucideIcon;
  color: string;
  bgColor: string;
}

export interface CiriTimelineEvent {
  id: string;
  timestamp: string;
  action: string;
  icon: LucideIcon;
  type: "completed" | "scheduled";
}

export interface MVADetailLine {
  code: string;
  description: string;
  grunnlag: number;
  mva: number;
}

export interface MVADetails {
  termin: string;
  period: string;
  deadline: string;
  bilagCount: number;
  lines: MVADetailLine[];
  summary: {
    utgaende: number;
    inngaende: number;
    tilBetaling: number;
  };
  validationStatus: string;
  warnings: string[];
}
