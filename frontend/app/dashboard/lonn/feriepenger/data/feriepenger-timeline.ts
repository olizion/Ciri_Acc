import {
  CalculatorIcon,
  PiggyBankIcon,
  CalendarIcon,
  BanknoteIcon,
  RefreshCwIcon,
} from "lucide-react";
import type { FeriepengerTimelineEvent } from "../types";

function krFmt(n: number) {
  return Math.abs(n).toLocaleString("nb-NO");
}

export function buildTimeline(
  totalPayout: number,
  monthlySetAside: number,
  employeeCount: number
): FeriepengerTimelineEvent[] {
  return [
    {
      id: "ft-1",
      action: `Feriepengegrunnlag 2025 beregnet — kr ${krFmt(totalPayout)}`,
      timestamp: "2026-01-02 09:00",
      type: "completed",
      icon: CalculatorIcon,
    },
    {
      id: "ft-2",
      action: `Avsetning januar fullført — kr ${krFmt(monthlySetAside)} til konto 2780`,
      timestamp: "2026-01-25 10:00",
      type: "completed",
      icon: PiggyBankIcon,
    },
    {
      id: "ft-3",
      action: `Avsetning februar fullført — kr ${krFmt(monthlySetAside)} til konto 2780`,
      timestamp: "2026-02-25 10:00",
      type: "completed",
      icon: PiggyBankIcon,
    },
    {
      id: "ft-4",
      action: `Avsetning mars planlagt — kr ${krFmt(monthlySetAside)}`,
      timestamp: "2026-03-25 10:00",
      type: "scheduled",
      icon: CalendarIcon,
    },
    {
      id: "ft-5",
      action: `Avsetning april planlagt — kr ${krFmt(monthlySetAside)}`,
      timestamp: "2026-04-25 10:00",
      type: "scheduled",
      icon: CalendarIcon,
    },
    {
      id: "ft-6",
      action: `Avsetning mai planlagt — kr ${krFmt(monthlySetAside)}`,
      timestamp: "2026-05-25 10:00",
      type: "scheduled",
      icon: CalendarIcon,
    },
    {
      id: "ft-7",
      action: `Feriepenger utbetales — kr ${krFmt(totalPayout)} til ${employeeCount} ansatte`,
      timestamp: "2026-06-15 06:00",
      type: "scheduled",
      icon: BanknoteIcon,
    },
    {
      id: "ft-8",
      action: "Feriepengegrunnlag 2026 oppdateres ved årsslutt",
      timestamp: "2026-12-31 23:59",
      type: "scheduled",
      icon: RefreshCwIcon,
    },
  ];
}
