export interface BalanseLinje {
  konto: string;
  navn: string;
  belop: number;
  fjoråret: number;
  bilagCount?: number;
  isSubtotal?: boolean;
  isTotal?: boolean;
}

export interface BalanseKategori {
  id: string;
  navn: string;
  linjer: BalanseLinje[];
  subtotal: BalanseLinje;
}

export interface BalanseGruppe {
  id: string;
  navn: string;
  kategorier: BalanseKategori[];
  total: BalanseLinje;
}

export interface AccountBalance {
  account_code: string;
  account_name: string;
  balance: number;
}

export interface BilagBalanseData {
  as_of_date: string;
  leverandorgjeld: number;
  leverandorgjeld_count: number;
  posted_total: number;
  posted_count: number;
  account_balances: AccountBalance[];
}

export type InsightType = "positive" | "warning" | "info" | "error";

export interface CiriInsight {
  type: InsightType;
  message: string;
}
