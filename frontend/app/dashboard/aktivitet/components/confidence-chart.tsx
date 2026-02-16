"use client";

import { useMemo } from "react";
import { AgCharts } from "ag-charts-react";
import type { AgChartOptions } from "ag-charts-community";
import { AllCommunityModule, ModuleRegistry } from "ag-charts-community";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CONFIDENCE_DISTRIBUTION } from "../mock-data";
import { ciriChartTheme, CHART_COLORS } from "../chart-theme";
import { BarChart3Icon } from "lucide-react";

ModuleRegistry.registerModules([AllCommunityModule]);

const BUCKET_COLORS: Record<string, string> = {
  Lav: CHART_COLORS.red,
  Medium: CHART_COLORS.amber,
  Høy: CHART_COLORS.primaryLight,
  "Svært høy": CHART_COLORS.primary,
};

export function ConfidenceChart() {
  const options = useMemo(
    () => ({
      theme: ciriChartTheme,
      height: 220,
      data: CONFIDENCE_DISTRIBUTION,
      series: [
        {
          type: "bar" as const,
          xKey: "range",
          yKey: "count",
          yName: "Beslutninger",
          cornerRadius: 6,
          formatter: ({ datum }: { datum: Record<string, unknown> }) => ({
            fill: BUCKET_COLORS[datum.bucket as string] ?? CHART_COLORS.slate,
          }),
          tooltip: {
            renderer: ({ datum }: { datum: Record<string, unknown> }) => ({
              content: `${datum.range}: ${datum.count} beslutninger (${datum.bucket})`,
            }),
          },
        },
      ],
      axes: [
        {
          type: "category" as const,
          position: "bottom" as const,
          label: { fontSize: 10, color: "#64748b" },
          title: { text: "Konfidensområde", fontSize: 10, color: "#94a3b8" },
        },
        {
          type: "number" as const,
          position: "left" as const,
          label: { fontSize: 10, color: "#64748b" },
          title: { text: "Antall", fontSize: 10, color: "#94a3b8" },
        },
      ],
    }),
    []
  );

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <BarChart3Icon className="h-4 w-4 text-muted-foreground" />
          <CardTitle className="text-sm font-medium">
            Konfidensfordeling
          </CardTitle>
        </div>
        <p className="text-[10px] text-muted-foreground">
          Hvordan beslutninger fordeler seg etter konfidensverdi
        </p>
      </CardHeader>
      <CardContent className="p-2">
        <AgCharts options={options as unknown as AgChartOptions} />
      </CardContent>
    </Card>
  );
}
