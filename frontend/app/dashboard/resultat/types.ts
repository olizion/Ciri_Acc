export interface ResultatLinje {
  konto: string;
  navn: string;
  måneder: number[];
  bilagCount?: number;
  isSubtotal?: boolean;
  isTotal?: boolean;
}

export interface ResultatGruppe {
  id: string;
  navn: string;
  linjer: ResultatLinje[];
  subtotal: ResultatLinje;
}

export interface BilagDetail {
  id: string;
  bilag_number: string;
  document_date: string;
  description: string;
  counterparty_name: string | null;
  gross_amount: number;
  net_amount: number;
  mva_amount: number;
  created_by_ciri?: boolean;
}

export interface AccountBilagResponse {
  account_code: string;
  account_name: string;
  year: number;
  bilags: BilagDetail[];
  total_amount: number;
}

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

export type InsightType = "positive" | "warning" | "info";

export interface CiriInsight {
  type: InsightType;
  message: string;
}
