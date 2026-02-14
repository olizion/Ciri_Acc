import {
  CheckCircle2Icon,
  SendIcon,
  ClockIcon,
  BuildingIcon,
  ShoppingCartIcon,
  WifiIcon,
  CarIcon,
  CoffeeIcon,
} from "lucide-react";
import type { StatusConfig, ExpenseCategory, MVADetails } from "./types";

export const statusConfig: Record<string, StatusConfig> = {
  submitted: {
    label: "Sendt",
    icon: CheckCircle2Icon,
    color: "text-green-600",
    bgColor: "bg-green-100 dark:bg-green-900/30",
  },
  ready: {
    label: "Klar til sending",
    icon: SendIcon,
    color: "text-[var(--primary)]",
    bgColor: "bg-[var(--primary)]/10",
  },
  upcoming: {
    label: "Kommende",
    icon: ClockIcon,
    color: "text-muted-foreground",
    bgColor: "bg-muted",
  },
};

export const mvaDetails: MVADetails = {
  termin: "6. termin 2025",
  period: "November - Desember 2025",
  deadline: "10. februar 2026",
  bilagCount: 86,
  lines: [
    { code: "3", description: "Salg innenlands (25%)", grunnlag: 181000, mva: 45250 },
    { code: "5", description: "Fradragsberettiget inngående MVA (25%)", grunnlag: 87120, mva: 21780 },
  ],
  summary: {
    utgaende: 45230,
    inngaende: 21780,
    tilBetaling: 23450,
  },
  validationStatus: "passed",
  warnings: [],
};

export const expensesByCategory: ExpenseCategory[] = [
  { category: "Husleie", count: 2, total: 37000, mva: 9250, icon: BuildingIcon },
  { category: "IT-tjenester", count: 2, total: 13200, mva: 3300, icon: BuildingIcon },
  { category: "Kontorrekvisita", count: 2, total: 4400, mva: 1100, icon: ShoppingCartIcon },
  { category: "Kommunikasjon", count: 2, total: 3780, mva: 944, icon: WifiIcon },
  { category: "Transport", count: 1, total: 1650, mva: 412, icon: CarIcon },
  { category: "Reise", count: 1, total: 3200, mva: 0, icon: CarIcon },
  { category: "Representasjon", count: 1, total: 2200, mva: 550, icon: CoffeeIcon },
  { category: "Gaver (ikke fradrag)", count: 1, total: 4500, mva: 0, icon: ShoppingCartIcon },
];

export const categoryToAccount: Record<string, string> = {
  Husleie: "6300",
  "IT-tjenester": "6500",
  Kontorrekvisita: "6800",
  Kommunikasjon: "6900",
  Transport: "7100",
  Reise: "7130",
  Representasjon: "7350",
  Gaver: "7500",
};
