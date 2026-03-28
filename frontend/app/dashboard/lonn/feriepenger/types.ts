export interface MonthlyAccrual {
  month: string;
  monthIndex: number;
  accrued: number;
  cumulative: number;
  setAside: number;
  cumulativeSetAside: number;
  isPayoutMonth: boolean;
}

export interface EmployeeFeriepenger {
  id: string;
  name: string;
  position: string;
  previousYearGross: number;
  rate: number;
  rateLabel: string;
  accruedTotal: number;
  junePayoutAmount: number;
  vacationDays: { used: number; total: number };
  status: "active" | "vacation";
}

export interface ScenarioMonthData {
  month: string;
  cashFlowImpact: number;
}

export interface SetAsideScenario {
  id: string;
  label: string;
  description: string;
  color: string;
  monthlyData: ScenarioMonthData[];
}

export interface FeriepengerTimelineEvent {
  id: string;
  action: string;
  timestamp: string;
  type: "completed" | "scheduled";
  icon: React.ElementType;
}

// ── Feriepenger configuration (from onboarding wizard) ──

export interface FeriepengerConfig {
  /** Company has tariffavtale with 5-week vacation */
  hasTariffavtale: boolean;
  /** Employee IDs marked as 60+ years old this year */
  employeesOver60: string[];
  /** Timestamp when config was saved */
  configuredAt: string;
}

export interface ComputedEmployeeRate {
  employeeId: string;
  rate: number;       // 0.102 or 0.12
  rateLabel: string;  // "10,2 %" or "12 %"
  reason: string;     // Why this rate was assigned
}
