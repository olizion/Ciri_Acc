"use client";

import { useMemo } from "react";
import { AgCharts } from "ag-charts-react";
import type { AgChartOptions } from "ag-charts-community";
import { AllCommunityModule, ModuleRegistry } from "ag-charts-community";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ACCOUNT_DISTRIBUTION } from "../mock-data";
import { ciriChartTheme, CHART_PALETTE } from "../chart-theme";
import { WalletIcon } from "lucide-react";

ModuleRegistry.registerModules([AllCommunityModule]);

export function AccountFlowChart() {
  const total = ACCOUNT_DISTRIBUTION.reduce((sum, d) => sum + d.amount, 0);

  const options = useMemo(
    () => ({
      theme: ciriChartTheme,
      height: 240,
      data: ACCOUNT_DISTRIBUTION,
      series: [
        {
          type: "bar" as const,
          direction: "horizontal" as const,
          xKey: "account",
          yKey: "amount",
          yName: "Beløp (kr)",
          cornerRadius: 6,
          formatter: ({ index }: { index: number }) => ({
            fill: CHART_PALETTE[index % CHART_PALETTE.length],
          }),
          label: {
            formatter: ({ value }: { value: number }) =>
              `kr ${(value / 1000).toFixed(0)}k`,
            fontSize: 10,
            color: "#ffffff",
          },
          tooltip: {
            renderer: ({ datum }: { datum: Record<string, unknown> }) => ({
              content: `${datum.account}: kr ${(datum.amount as number).toLocaleString("nb-NO")} (${(((datum.amount as number) / total) * 100).toFixed(1)}%)`,
            }),
          },
        },
      ],
      axes: [
        {
          type: "category" as const,
          position: "left" as const,
          label: { fontSize: 10, color: "#64748b" },
        },
        {
          type: "number" as const,
          position: "bottom" as const,
          label: {
            fontSize: 10,
            color: "#64748b",
            formatter: ({ value }: { value: number }) =>
              `${(value / 1000).toFixed(0)}k`,
          },
        },
      ],
    }),
    [total]
  );

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <WalletIcon className="h-4 w-4 text-muted-foreground" />
          <CardTitle className="text-sm font-medium">
            Kontofordeling
          </CardTitle>
        </div>
        <p className="text-[10px] text-muted-foreground">
          Totalt bokført per konto (alle faser)
        </p>
      </CardHeader>
      <CardContent className="p-2">
        <AgCharts options={options as unknown as AgChartOptions} />
      </CardContent>
    </Card>
  );
}
