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
