"use client";

import { useState } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Cell } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { cn } from "@/lib/utils";
import { scenarios } from "../data/feriepenger-scenarios";

const chartConfig = {
  ingen: {
    label: "Ingen avsetning",
    color: "hsl(0, 72%, 51%)",
  },
  ciri: {
    label: "Ciri 12 % månedlig",
    color: "hsl(var(--primary))",
  },
  kvartalsvis: {
    label: "Kvartalsvis",
    color: "hsl(199, 89%, 48%)",
  },
} satisfies ChartConfig;

function krFmt(n: number) {
  const abs = Math.abs(n);
  const formatted = abs.toLocaleString("nb-NO");
  return n < 0 ? `-kr ${formatted}` : `kr ${formatted}`;
}

// Merge scenario data into a single array for grouped bar chart
function buildChartData(activeScenarios: Set<string>) {
  const months = [
    "Jan", "Feb", "Mar", "Apr", "Mai", "Jun",
    "Jul", "Aug", "Sep", "Okt", "Nov", "Des",
  ];
  return months.map((month, i) => {
    const entry: Record<string, string | number> = { month };
    for (const scenario of scenarios) {
      if (activeScenarios.has(scenario.id)) {
        entry[scenario.id] = scenario.monthlyData[i].cashFlowImpact;
      }
    }
    return entry;
  });
}

export default function SetAsideBarChart() {
  const [activeScenarios, setActiveScenarios] = useState<Set<string>>(
    new Set(["ingen", "ciri", "kvartalsvis"])
  );

  const toggleScenario = (id: string) => {
    setActiveScenarios((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        if (next.size > 1) next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const chartData = buildChartData(activeScenarios);

  return (
    <div className="space-y-3">
      {/* Toggle pills */}
      <div className="flex items-center gap-2 flex-wrap">
        {scenarios.map((s) => {
          const isActive = activeScenarios.has(s.id);
          return (
            <button
              key={s.id}
              onClick={() => toggleScenario(s.id)}
              className={cn(
                "flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-medium transition-all border",
                isActive
                  ? "border-border bg-card shadow-sm"
                  : "border-transparent bg-muted/40 text-muted-foreground opacity-60"
              )}
            >
              <div
                className="size-2 rounded-full shrink-0"
                style={{ backgroundColor: s.color }}
              />
              {s.label}
            </button>
          );
        })}
      </div>

      {/* Bar chart */}
      <ChartContainer config={chartConfig} className="h-[280px] w-full">
        <BarChart
          data={chartData}
          margin={{ top: 10, right: 10, left: 10, bottom: 0 }}
        >
          <CartesianGrid vertical={false} strokeDasharray="3 3" />
          <XAxis
            dataKey="month"
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            fontSize={11}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            fontSize={11}
            tickFormatter={(v) => {
              if (v === 0) return "0";
              return `${Math.round(v / 1000)}k`;
            }}
          />
          <ChartTooltip
            content={
              <ChartTooltipContent
                formatter={(value, name) => {
                  const scenario = scenarios.find((s) => s.id === name);
                  return (
                    <span>
                      {scenario?.label}: {krFmt(value as number)}
                    </span>
                  );
                }}
              />
            }
          />
          {activeScenarios.has("ingen") && (
            <Bar
              dataKey="ingen"
              fill="hsl(0, 72%, 51%)"
              radius={[3, 3, 0, 0]}
              animationDuration={600}
            >
              {chartData.map((entry, index) => (
                <Cell
                  key={`ingen-${index}`}
                  fillOpacity={entry.month === "Jun" ? 1 : 0.6}
                />
              ))}
            </Bar>
          )}
          {activeScenarios.has("ciri") && (
            <Bar
              dataKey="ciri"
              fill="hsl(var(--primary))"
              radius={[3, 3, 0, 0]}
              animationDuration={600}
            />
          )}
          {activeScenarios.has("kvartalsvis") && (
            <Bar
              dataKey="kvartalsvis"
              fill="hsl(199, 89%, 48%)"
              radius={[3, 3, 0, 0]}
              animationDuration={600}
            >
              {chartData.map((entry, index) => (
                <Cell
                  key={`kvartalsvis-${index}`}
                  fillOpacity={entry.month === "Jun" ? 1 : 0.7}
                />
              ))}
            </Bar>
          )}
        </BarChart>
      </ChartContainer>

      {/* Scenario descriptions */}
      <div className="grid grid-cols-1 gap-1.5">
        {scenarios
          .filter((s) => activeScenarios.has(s.id))
          .map((s) => (
            <div key={s.id} className="flex items-center gap-2 text-[11px] text-muted-foreground">
              <div
                className="size-1.5 rounded-full shrink-0"
                style={{ backgroundColor: s.color }}
              />
              <span>{s.description}</span>
            </div>
          ))}
      </div>
    </div>
  );
}
