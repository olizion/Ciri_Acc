import type { PayrollRun } from "../types";
import { employees } from "./employees";

function buildLineItems(emps: typeof employees) {
  return emps
    .filter((e) => e.status === "active" || e.status === "vacation")
    .map((e) => {
      const skattetrekk = Math.round(e.salary * (e.taxRate / 100));
      return {
        employeeId: e.id,
        employeeName: e.name,
        gross: e.salary,
        skattetrekk,
        net: e.salary - skattetrekk,
        arbeidsgiveravgift: Math.round(e.salary * 0.141),
        otp: Math.round(e.salary * 0.02),
        feriepengerAccrual: Math.round(e.salary * 0.12),
      };
    });
}

function totals(items: ReturnType<typeof buildLineItems>) {
  const totalGross = items.reduce((a, i) => a + i.gross, 0);
  const totalSkattetrekk = items.reduce((a, i) => a + i.skattetrekk, 0);
  const totalNet = items.reduce((a, i) => a + i.net, 0);
  const totalArbeidsgiveravgift = items.reduce(
    (a, i) => a + i.arbeidsgiveravgift,
    0
  );
  const totalOtp = items.reduce((a, i) => a + i.otp, 0);
  const totalFeriepengerAccrual = items.reduce(
    (a, i) => a + i.feriepengerAccrual,
    0
  );
  return {
    totalGross,
    totalSkattetrekk,
    totalNet,
    totalArbeidsgiveravgift,
    totalOtp,
    totalFeriepengerAccrual,
    totalCost:
      totalGross + totalArbeidsgiveravgift + totalOtp + totalFeriepengerAccrual,
  };
}

const items = buildLineItems(employees);
const t = totals(items);

export const payrollRuns: PayrollRun[] = [
  {
    id: "pr-3",
    month: "Februar 2026",
    date: "2026-02-25",
    status: "ready",
    lineItems: items,
    ...t,
    ameldingStatus: "ready",
  },
  {
    id: "pr-2",
    month: "Januar 2026",
    date: "2026-01-25",
    status: "completed",
    lineItems: items,
    ...t,
    ameldingStatus: "sent",
  },
  {
    id: "pr-1",
    month: "Desember 2025",
    date: "2025-12-23",
    status: "completed",
    lineItems: items,
    ...t,
    ameldingStatus: "sent",
  },
];
