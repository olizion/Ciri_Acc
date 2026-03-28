import { employees } from "../../data/employees";
import type { EmployeeFeriepenger, ComputedEmployeeRate } from "../types";

/**
 * Build feriepenger data for each employee using the rates from the config hook.
 * Falls back to 12% if no computed rates are provided (unconfigured state).
 */
export function buildEmployeeFeriepenger(
  computedRates: ComputedEmployeeRate[]
): EmployeeFeriepenger[] {
  return employees.map((emp) => {
    const previousYearGross = emp.salary * 12;
    const cr = computedRates.find((r) => r.employeeId === emp.id);
    const rate = cr?.rate ?? 0.12;
    const rateLabel = cr?.rateLabel ?? "12 %";
    const accruedTotal = Math.round(previousYearGross * rate);

    return {
      id: emp.id,
      name: emp.name,
      position: emp.position,
      previousYearGross,
      rate,
      rateLabel,
      accruedTotal,
      junePayoutAmount: accruedTotal,
      vacationDays: emp.vacationDays,
      status: emp.status,
    };
  });
}

/** Convenience totals */
export function totalJunePayoutFrom(data: EmployeeFeriepenger[]) {
  return data.reduce((sum, e) => sum + e.junePayoutAmount, 0);
}

export function totalVacationDaysUsedFrom(data: EmployeeFeriepenger[]) {
  return data.reduce((sum, e) => sum + e.vacationDays.used, 0);
}

export function totalVacationDaysTotalFrom(data: EmployeeFeriepenger[]) {
  return data.reduce((sum, e) => sum + e.vacationDays.total, 0);
}
