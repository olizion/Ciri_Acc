import type { MonthlyAccrual } from "../types";

const MONTHLY_GROSS = 220_000; // Total gross salary all employees
const FERIEPENGER_RATE = 0.12;
const MONTHLY_ACCRUAL = Math.round(MONTHLY_GROSS * FERIEPENGER_RATE); // 26 400
const MONTHLY_SET_ASIDE = 22_000; // What Ciri sets aside each month

const months = [
  "Jan", "Feb", "Mar", "Apr", "Mai", "Jun",
  "Jul", "Aug", "Sep", "Okt", "Nov", "Des",
];

export const monthlyAccrualData: MonthlyAccrual[] = months.map((month, i) => {
  const accrued = MONTHLY_ACCRUAL;
  const cumulative = MONTHLY_ACCRUAL * (i + 1);
  const setAside = MONTHLY_SET_ASIDE;
  const cumulativeSetAside = MONTHLY_SET_ASIDE * (i + 1);

  return {
    month,
    monthIndex: i,
    accrued,
    cumulative,
    setAside,
    cumulativeSetAside,
    isPayoutMonth: i === 5, // June
  };
});

export const TOTAL_FERIEPENGER_PAYOUT = 264_000; // Based on 2025 gross
export const FERIEPENGER_GRUNNLAG = 2_640_000; // 2025 full year gross
export const ACCRUED_YTD = MONTHLY_ACCRUAL * 2; // Jan + Feb 2026
export const SET_ASIDE_YTD = MONTHLY_SET_ASIDE * 2; // Jan + Feb
export const MONTHS_ELAPSED = 2;
