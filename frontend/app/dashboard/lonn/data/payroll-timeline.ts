import {
  CheckCircle2Icon,
  SearchIcon,
  FileTextIcon,
  SendIcon,
  CalendarIcon,
  CreditCardIcon,
} from "lucide-react";
import type { PayrollTimelineEvent } from "../types";

export const payrollTimeline: PayrollTimelineEvent[] = [
  {
    id: "pt-1",
    action: "Skattekort hentet for alle 4 ansatte fra Skatteetaten",
    timestamp: "2026-01-02 09:15",
    type: "completed",
    icon: SearchIcon,
  },
  {
    id: "pt-2",
    action: "Lønnskjøring for januar beregnet og validert",
    timestamp: "2026-01-23 10:00",
    type: "completed",
    icon: FileTextIcon,
  },
  {
    id: "pt-3",
    action: "Lønn utbetalt til 4 ansatte — kr 155 700",
    timestamp: "2026-01-25 06:00",
    type: "completed",
    icon: CreditCardIcon,
  },
  {
    id: "pt-4",
    action: "A-melding for januar sendt til Skatteetaten",
    timestamp: "2026-02-03 08:30",
    type: "completed",
    icon: SendIcon,
  },
  {
    id: "pt-5",
    action: "Lønnskjøring for februar beregnet og validert",
    timestamp: "2026-02-13 10:00",
    type: "completed",
    icon: FileTextIcon,
  },
  {
    id: "pt-6",
    action: "Utbetaling av februar-lønn planlagt 25. feb",
    timestamp: "2026-02-25 06:00",
    type: "scheduled",
    icon: CalendarIcon,
  },
  {
    id: "pt-7",
    action: "A-melding for februar sendes innen 5. mars",
    timestamp: "2026-03-05 08:00",
    type: "scheduled",
    icon: SendIcon,
  },
  {
    id: "pt-8",
    action: "Skattekort oppdateres 15. mars (ny periode)",
    timestamp: "2026-03-15 09:00",
    type: "scheduled",
    icon: SearchIcon,
  },
];
