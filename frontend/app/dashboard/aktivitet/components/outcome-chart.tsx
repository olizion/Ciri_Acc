"use client";

import { useMemo } from "react";
import { AgCharts } from "ag-charts-react";
import type { AgChartOptions } from "ag-charts-community";
import { AllCommunityModule, ModuleRegistry } from "ag-charts-community";
import { Card, CardContent } from "@/components/ui/card";
import { OUTCOME_DISTRIBUTION } from "../mock-data";
import { ciriChartTheme, CHART_COLORS } from "../chart-theme";
import { PieChartIcon } from "lucide-react";

ModuleRegistry.registerModules([AllCommunityModule]);

const DONUT_FILLS = [
  CHART_COLORS.primary,
  CHART_COLORS.secondary,
  CHART_COLORS.amber,
  CHART_COLORS.red,
  CHART_COLORS.purple,
];

export function OutcomeChart() {
  const total = OUTCOME_DISTRIBUTION.reduce((sum, d) => sum + d.value, 0);

  const options = useMemo(
    () => ({
      theme: ciriChartTheme,
      height: 280,
      data: OUTCOME_DISTRIBUTION.map((d, i) => ({
        ...d,
        fill: DONUT_FILLS[i],
      })),
      series: [
        {
          type: "donut" as const,
          angleKey: "value",
          calloutLabelKey: "name",
          sectorLabelKey: "value",
          innerRadiusRatio: 0.6,
          fills: DONUT_FILLS,
          strokes: DONUT_FILLS,
          strokeWidth: 0,
          calloutLabel: {
            fontSize: 11,
            color: "#64748b",
          },
          sectorLabel: {
            formatter: ({ value }: { value: number }) =>
              `${((value / total) * 100).toFixed(0)}%`,
            fontSize: 11,
            color: "#ffffff",
          },
          innerLabels: [
            {
              text: total.toLocaleString("nb-NO"),
              fontSize: 22,
              fontWeight: "bold" as const,
              fontFamily: "'Hedvig Letters Serif', serif",
              color: "#1e293b",
            },
            {
              text: "totalt",
              fontSize: 11,
              color: "#64748b",
              spacing: 2,
            },
          ],
          tooltip: {
            renderer: ({ datum }: { datum: Record<string, unknown> }) => ({
              content: `${datum.name}: ${(datum.value as number).toLocaleString("nb-NO")} (${(((datum.value as number) / total) * 100).toFixed(1)}%)`,
            }),
          },
        },
      ],
    }),
    [total]
  );

  return (
    <Card className="overflow-hidden">
      {/* Top highlight */}
      <div
        className="h-px"
        style={{
          background: `linear-gradient(to right, transparent, ${CHART_COLORS.secondary}30, transparent)`,
        }}
      />

      <div className="px-4 pt-4 pb-2 sm:px-5">
        <div className="flex items-center gap-2">
          <div
            className="flex h-7 w-7 items-center justify-center rounded-lg"
            style={{ backgroundColor: `${CHART_COLORS.secondary}15` }}
          >
            <PieChartIcon
              className="h-3.5 w-3.5"
              style={{ color: CHART_COLORS.secondary }}
            />
          </div>
          <span className="text-sm font-semibold">Resultatfordeling</span>
        </div>
      </div>

      <CardContent className="p-2">
        <AgCharts options={options as unknown as AgChartOptions} />
      </CardContent>
    </Card>
  );
}
