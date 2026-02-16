/**
 * AG Charts theme matching Ciri's Lavender Dream design system.
 * Uses OKLch-based colors from themes.css CSS variables.
 */
import type { AgChartTheme } from "ag-charts-community";

// Resolved palette colors (CSS variables can't be used directly in AG Charts canvas)
export const CHART_COLORS = {
  primary: "#5a7d6e",       // --primary-700 resolved
  primaryLight: "#a5c7b5",  // --primary-300
  secondary: "#8b5d7d",     // --secondary-600
  secondaryLight: "#c9a0bc", // --secondary-300
  emerald: "#059669",
  amber: "#d97706",
  red: "#dc2626",
  blue: "#2563eb",
  purple: "#7c3aed",
  slate: "#64748b",
  muted: "#e2e8f0",
} as const;

export const CHART_PALETTE = [
  CHART_COLORS.primary,
  CHART_COLORS.secondary,
  CHART_COLORS.emerald,
  CHART_COLORS.amber,
  CHART_COLORS.blue,
  CHART_COLORS.purple,
  CHART_COLORS.red,
  CHART_COLORS.slate,
];

export const ciriChartTheme: AgChartTheme = {
  palette: {
    fills: CHART_PALETTE,
    strokes: CHART_PALETTE,
  },
  params: {
    fontFamily: "'Outfit', sans-serif",
    fontSize: 11,
    backgroundColor: "transparent",
    foregroundColor: "#475569",
    accentColor: CHART_COLORS.primary,
    tooltipBackgroundColor: "#ffffff",
    tooltipTextColor: "#1e293b",
  },
  overrides: {
    common: {
      padding: { top: 8, right: 8, bottom: 8, left: 8 },
    },
    bar: {
      series: {
        cornerRadius: 4,
      },
    },
    donut: {
      series: {
        calloutLabel: { fontSize: 10 },
      },
    },
    line: {
      series: {
        strokeWidth: 2,
        marker: { size: 5 },
      },
    },
  },
};
