"use client";

import { useMemo } from "react";
import { AgCharts } from "ag-charts-react";
import type { AgChartOptions } from "ag-charts-community";
import { AllCommunityModule, ModuleRegistry } from "ag-charts-community";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BATCH_HISTORY } from "../mock-data";
import { ciriChartTheme, CHART_COLORS } from "../chart-theme";
import { TrendingUpIcon } from "lucide-react";

ModuleRegistry.registerModules([AllCommunityModule]);

export function BatchTrendChart() {
  const options = useMemo(
    () => ({
      theme: ciriChartTheme,
      height: 260,
      data: BATCH_HISTORY,
      series: [
        {
          type: "bar" as const,
          xKey: "date",
          yKey: "approved",
          yName: "Godkjent",
          stacked: true,
          fill: CHART_COLORS.primary,
          stroke: CHART_COLORS.primary,
          cornerRadius: 4,
        },
        {
          type: "bar" as const,
          xKey: "date",
          yKey: "flagged",
          yName: "Flagget",
          stacked: true,
          fill: CHART_COLORS.amber,
          stroke: CHART_COLORS.amber,
          cornerRadius: 4,
        },
        {
          type: "line" as const,
          xKey: "date",
          yKey: "approvalRate",
          yName: "Godkjenningsrate (%)",
          stroke: CHART_COLORS.emerald,
          strokeWidth: 2.5,
          marker: {
            fill: CHART_COLORS.emerald,
            stroke: "#ffffff",
            strokeWidth: 2,
            size: 6,
          },
          tooltip: {
            renderer: ({ datum }: { datum: Record<string, unknown> }) => ({
              content: `Godkjenningsrate: ${datum.approvalRate}%`,
            }),
          },
        },
      ],
      axes: [
        {
          type: "category" as const,
          position: "bottom" as const,
          label: { fontSize: 10, color: "#64748b" },
        },
        {
          type: "number" as const,
          position: "left" as const,
          label: { fontSize: 10, color: "#64748b" },
          title: { text: "Antall", fontSize: 10, color: "#94a3b8" },
          keys: ["approved", "flagged"],
        },
        {
          type: "number" as const,
          position: "right" as const,
          label: {
            fontSize: 10,
            color: "#64748b",
            formatter: ({ value }: { value: number }) => `${value}%`,
          },
          title: { text: "Rate", fontSize: 10, color: "#94a3b8" },
          keys: ["approvalRate"],
          min: 0,
          max: 100,
        },
      ],
      legend: {
        position: "bottom" as const,
        item: { label: { fontSize: 10 } },
      },
    }),
    []
  );

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <TrendingUpIcon className="h-4 w-4 text-muted-foreground" />
          <CardTitle className="text-sm font-medium">
            Batch-historikk & godkjenningsrate
          </CardTitle>
        </div>
        <p className="text-[10px] text-muted-foreground">
          Stablede batcher med godkjenningsrate-trend (grønn linje)
        </p>
      </CardHeader>
      <CardContent className="p-2">
        <AgCharts options={options as unknown as AgChartOptions} />
      </CardContent>
    </Card>
  );
}
