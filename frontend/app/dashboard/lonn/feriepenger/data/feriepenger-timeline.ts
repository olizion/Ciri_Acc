import {
  CheckCircle2Icon,
  CalculatorIcon,
  PiggyBankIcon,
  CalendarIcon,
  BanknoteIcon,
  RefreshCwIcon,
} from "lucide-react";
import type { FeriepengerTimelineEvent } from "../types";

export const feriepengerTimeline: FeriepengerTimelineEvent[] = [
  {
    id: "ft-1",
    action: "Feriepengegrunnlag 2025 beregnet — kr 2 640 000",
    timestamp: "2026-01-02 09:00",
    type: "completed",
    icon: CalculatorIcon,
  },
  {
    id: "ft-2",
    action: "Avsetning januar fullført — kr 22 000 til konto 2780",
    timestamp: "2026-01-25 10:00",
    type: "completed",
    icon: PiggyBankIcon,
  },
  {
    id: "ft-3",
    action: "Avsetning februar fullført — kr 22 000 til konto 2780",
    timestamp: "2026-02-25 10:00",
    type: "completed",
    icon: PiggyBankIcon,
  },
  {
    id: "ft-4",
    action: "Avsetning mars planlagt — kr 22 000",
    timestamp: "2026-03-25 10:00",
    type: "scheduled",
    icon: CalendarIcon,
  },
  {
    id: "ft-5",
    action: "Avsetning april planlagt — kr 22 000",
    timestamp: "2026-04-25 10:00",
    type: "scheduled",
    icon: CalendarIcon,
  },
  {
    id: "ft-6",
    action: "Avsetning mai planlagt — kr 22 000",
    timestamp: "2026-05-25 10:00",
    type: "scheduled",
    icon: CalendarIcon,
  },
  {
    id: "ft-7",
    action: "Feriepenger utbetales — kr 264 000 til 4 ansatte",
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
