"use client";

import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import type { MessageChart } from "@/app/dashboard/chat/hooks/use-chat";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid
} from "recharts";
import { cn } from "@/lib/utils";

interface MiniChartProps {
  chart: MessageChart;
  /** Larger variant for full chat page */
  size?: "sm" | "lg";
}

export function MiniChart({ chart, size = "sm" }: MiniChartProps) {
  const config = Object.fromEntries(
    Object.entries(chart.config).map(([key, val]) => [key, { label: val.label, color: val.color }])
  );

  const colors = Object.values(chart.config).map((c) => c.color);
  const height = size === "lg" ? "h-[220px]" : "h-[180px]";
  const tickSize = size === "lg" ? 11 : 10;
  const barSize = size === "lg" ? 40 : 32;
  const pieOuter = size === "lg" ? 85 : 70;
  const pieInner = size === "lg" ? 50 : 40;

  return (
    <div className={cn("mt-3 overflow-hidden rounded-xl border bg-card/50", size === "lg" ? "p-4" : "p-3")}>
      {chart.title && (
        <p className={cn("mb-2 font-medium text-muted-foreground", size === "lg" ? "text-sm" : "text-xs")}>
          {chart.title}
        </p>
      )}
      <ChartContainer
        config={config}
        className={cn(height, "w-full [&_.recharts-cartesian-axis-tick_text]:text-[12px]")}
      >
        {chart.type === "bar" ? (
          <BarChart data={chart.data} margin={{ top: 4, right: 4, bottom: 0, left: -12 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border/40" />
            <XAxis
              dataKey={chart.xAxisKey}
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: tickSize }}
            />
            <YAxis tickLine={false} axisLine={false} tick={{ fontSize: tickSize }} width={44} />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  formatter={(value) =>
                    typeof value === "number"
                      ? `kr ${value.toLocaleString("nb-NO")}`
                      : value
                  }
                />
              }
            />
            {chart.dataKeys.map((key, i) => (
              <Bar
                key={key}
                dataKey={key}
                fill={colors[i % colors.length]}
                radius={[4, 4, 0, 0]}
                maxBarSize={barSize}
              />
            ))}
          </BarChart>
        ) : chart.type === "line" ? (
          <LineChart data={chart.data} margin={{ top: 4, right: 4, bottom: 0, left: -12 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border/40" />
            <XAxis
              dataKey={chart.xAxisKey}
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: tickSize }}
            />
            <YAxis tickLine={false} axisLine={false} tick={{ fontSize: tickSize }} width={44} />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  formatter={(value) =>
                    typeof value === "number"
                      ? `kr ${value.toLocaleString("nb-NO")}`
                      : value
                  }
                />
              }
            />
            {chart.dataKeys.map((key, i) => (
              <Line
                key={key}
                type="monotone"
                dataKey={key}
                stroke={colors[i % colors.length]}
                strokeWidth={2}
                dot={{ r: 3, strokeWidth: 0, fill: colors[i % colors.length] }}
                activeDot={{ r: 5, strokeWidth: 2, stroke: "hsl(var(--background))" }}
              />
            ))}
          </LineChart>
        ) : (
          <PieChart>
            <ChartTooltip
              content={
                <ChartTooltipContent
                  formatter={(value) =>
                    typeof value === "number"
                      ? `kr ${value.toLocaleString("nb-NO")}`
                      : value
                  }
                />
              }
            />
            <Pie
              data={chart.data}
              dataKey={chart.dataKeys[0]}
              nameKey={chart.xAxisKey}
              cx="50%"
              cy="50%"
              innerRadius={pieInner}
              outerRadius={pieOuter}
              strokeWidth={2}
              stroke="hsl(var(--background))"
            >
              {chart.data.map((entry, i) => (
                <Cell
                  key={entry[chart.xAxisKey] as string}
                  fill={colors[i % colors.length]}
                />
              ))}
            </Pie>
          </PieChart>
        )}
      </ChartContainer>
      {/* Legend */}
      {Object.keys(chart.config).length > 1 && (
        <div className="mt-2 flex flex-wrap items-center justify-center gap-3">
          {Object.entries(chart.config).map(([, val]) => (
            <div key={val.label} className="flex items-center gap-1.5">
              <span
                className="inline-block h-2.5 w-2.5 rounded-sm"
                style={{ backgroundColor: val.color }}
              />
              <span className={cn("text-muted-foreground", size === "lg" ? "text-xs" : "text-[12px]")}>
                {val.label}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
