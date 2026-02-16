export interface Employee {
  id: string;
  name: string;
  position: string;
  email: string;
  phone: string;
  personnummer: string;
  salary: number;
  taxRate: number;
  taxTable: string;
  status: "active" | "vacation";
  employmentType: "fast" | "deltid";
  startDate: string;
  feriepenger: number;
  vacationDays: { used: number; total: number };
  bankAccount: string;
}

export interface PayslipRecord {
  id: string;
  month: string;
  gross: number;
  net: number;
  date: string;
}

export interface PersonnummerLookupResponse {
  personnummer_masked: string;
  name: string | null;
  first_name: string | null;
  last_name: string | null;
  tax_card_type: string;
  tax_table: string | null;
  tax_percentage: number | null;
  tax_municipality: string | null;
  has_frikort: boolean;
  frikort_amount: number | null;
  frikort_remaining: number | null;
  fetched_at: string;
  source: string;
}

export interface PayrollLineItem {
  employeeId: string;
  employeeName: string;
  gross: number;
  skattetrekk: number;
  net: number;
  arbeidsgiveravgift: number;
  otp: number;
  feriepengerAccrual: number;
}

export interface PayrollRun {
  id: string;
  month: string;
  date: string;
  status: "completed" | "ready" | "upcoming";
  lineItems: PayrollLineItem[];
  totalGross: number;
  totalSkattetrekk: number;
  totalNet: number;
  totalArbeidsgiveravgift: number;
  totalOtp: number;
  totalFeriepengerAccrual: number;
  totalCost: number;
  ameldingStatus: "sent" | "ready" | "pending";
}

export interface PayrollTimelineEvent {
  id: string;
  action: string;
  timestamp: string;
  type: "completed" | "scheduled";
  icon: React.ElementType;
}
