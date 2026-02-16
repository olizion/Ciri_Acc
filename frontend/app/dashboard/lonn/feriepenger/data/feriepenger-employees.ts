import { employees } from "../../data/employees";
import type { EmployeeFeriepenger } from "../types";

export const employeeFeriepenger: EmployeeFeriepenger[] = employees.map((emp) => {
  const previousYearGross = emp.salary * 12;
  // Over 60 gets 12%, under 60 gets 12% (simplified — in reality some get 10.2%)
  // Sofie is deltid so she gets 10.2%
  const rate = emp.employmentType === "deltid" ? 0.102 : 0.12;
  const rateLabel = emp.employmentType === "deltid" ? "10,2 %" : "12 %";
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

export const totalJunePayout = employeeFeriepenger.reduce(
  (sum, e) => sum + e.junePayoutAmount,
  0
);

export const totalVacationDaysUsed = employeeFeriepenger.reduce(
  (sum, e) => sum + e.vacationDays.used,
  0
);

export const totalVacationDaysTotal = employeeFeriepenger.reduce(
  (sum, e) => sum + e.vacationDays.total,
  0
);
