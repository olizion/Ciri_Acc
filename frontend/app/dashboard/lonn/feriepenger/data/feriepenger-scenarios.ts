import type { SetAsideScenario } from "../types";

const months = [
  "Jan", "Feb", "Mar", "Apr", "Mai", "Jun",
  "Jul", "Aug", "Sep", "Okt", "Nov", "Des",
];

export function buildScenarios(totalPayout: number): SetAsideScenario[] {
  return [
    {
      id: "ingen",
      label: "Ingen avsetning",
      description: "Alt betales i juni — stor likviditetssjokk",
      color: "hsl(0, 72%, 51%)",
      monthlyData: months.map((month, i) => ({
        month,
        cashFlowImpact: i === 5 ? -totalPayout : 0,
      })),
    },
    {
      id: "ciri",
      label: "Ciri månedlig",
      description: "Jevn avsetning hele året — forutsigbar kontantstrøm",
      color: "hsl(var(--primary))",
      monthlyData: months.map((month) => ({
        month,
        cashFlowImpact: -Math.round(totalPayout / 12),
      })),
    },
    {
      id: "kvartalsvis",
      label: "Kvartalsvis",
      description: "Avsetter hvert kvartal — mellomløsning",
      color: "hsl(199, 89%, 48%)",
      monthlyData: months.map((month, i) => ({
        month,
        cashFlowImpact: i % 3 === 2 ? -Math.round(totalPayout / 4) : 0,
      })),
    },
  ];
}
