import { employees } from "../../data/employees";
import type { MonthlyAccrual } from "../types";

const months = [
  "Jan", "Feb", "Mar", "Apr", "Mai", "Jun",
  "Jul", "Aug", "Sep", "Okt", "Nov", "Des",
];

/**
 * Build monthly accrual data using the weighted-average rate from the config.
 * `averageRate` is computed by the useFeriepengerConfig hook.
 */
export function buildMonthlyAccrualData(averageRate: number) {
  const MONTHLY_GROSS = employees.reduce((s, e) => s + e.salary, 0);
  const MONTHLY_ACCRUAL = Math.round(MONTHLY_GROSS * averageRate);
  const MONTHLY_SET_ASIDE = MONTHLY_ACCRUAL; // Ciri sets aside the exact accrual amount

  const monthlyData: MonthlyAccrual[] = months.map((month, i) => ({
    month,
    monthIndex: i,
    accrued: MONTHLY_ACCRUAL,
    cumulative: MONTHLY_ACCRUAL * (i + 1),
    setAside: MONTHLY_SET_ASIDE,
    cumulativeSetAside: MONTHLY_SET_ASIDE * (i + 1),
    isPayoutMonth: i === 5,
  }));

  const TOTAL_FERIEPENGER_PAYOUT = MONTHLY_ACCRUAL * 12;
  const FERIEPENGER_GRUNNLAG = MONTHLY_GROSS * 12;
  const MONTHS_ELAPSED = 2; // Jan + Feb 2026
  const ACCRUED_YTD = MONTHLY_ACCRUAL * MONTHS_ELAPSED;
  const SET_ASIDE_YTD = MONTHLY_SET_ASIDE * MONTHS_ELAPSED;

  return {
    monthlyData,
    TOTAL_FERIEPENGER_PAYOUT,
    FERIEPENGER_GRUNNLAG,
    ACCRUED_YTD,
    SET_ASIDE_YTD,
    MONTHS_ELAPSED,
    MONTHLY_ACCRUAL,
    MONTHLY_SET_ASIDE,
  };
}
