import type { SetAsideScenario } from "../types";

const TOTAL_PAYOUT = 264_000;

const months = [
  "Jan", "Feb", "Mar", "Apr", "Mai", "Jun",
  "Jul", "Aug", "Sep", "Okt", "Nov", "Des",
];

export const scenarios: SetAsideScenario[] = [
  {
    id: "ingen",
    label: "Ingen avsetning",
    description: "Alt betales i juni — stor likviditetssjokk",
    color: "hsl(0, 72%, 51%)", // red-500
    monthlyData: months.map((month, i) => ({
      month,
      cashFlowImpact: i === 5 ? -TOTAL_PAYOUT : 0,
    })),
  },
  {
    id: "ciri",
    label: "Ciri 12 % månedlig",
    description: "Jevn avsetning hele året — forutsigbar kontantstrøm",
    color: "hsl(var(--primary))",
    monthlyData: months.map((month) => ({
      month,
      cashFlowImpact: -Math.round(TOTAL_PAYOUT / 12),
    })),
  },
  {
    id: "kvartalsvis",
    label: "Kvartalsvis",
    description: "Avsetter hvert kvartal — mellomløsning",
    color: "hsl(199, 89%, 48%)", // sky-500
    monthlyData: months.map((month, i) => ({
      month,
      cashFlowImpact: i % 3 === 2 ? -Math.round(TOTAL_PAYOUT / 4) : 0,
    })),
  },
];
