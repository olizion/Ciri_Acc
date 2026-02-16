import { startOfMonth, endOfMonth, subMonths, startOfQuarter, endOfQuarter, startOfYear, endOfYear } from "date-fns";

export function getDateRangeFromPeriod(period: string, customFrom?: Date, customTo?: Date): { from: Date; to: Date } {
  const now = new Date();

  switch (period) {
    case "denne-maned":
      return { from: startOfMonth(now), to: endOfMonth(now) };
    case "forrige-maned":
      const lastMonth = subMonths(now, 1);
      return { from: startOfMonth(lastMonth), to: endOfMonth(lastMonth) };
    case "dette-kvartal":
      return { from: startOfQuarter(now), to: endOfQuarter(now) };
    case "dette-ar":
      return { from: startOfYear(now), to: endOfYear(now) };
    case "egendefinert":
      return {
        from: customFrom || startOfYear(now),
        to: customTo || endOfYear(now)
      };
    default:
      return { from: startOfYear(now), to: endOfYear(now) };
  }
}

export function formatNumber(num: number) {
  return num.toLocaleString("nb-NO", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
