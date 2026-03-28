"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  ReferenceLine,
  CartesianGrid,
} from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import type { MonthlyAccrual } from "../types";

interface AccrualAreaChartProps {
  data: MonthlyAccrual[];
}

const chartConfig = {
  cumulative: {
    label: "Opptjent feriepenger",
    color: "hsl(var(--primary))",
  },
  cumulativeSetAside: {
    label: "Avsatt beløp",
    color: "hsl(199, 89%, 48%)",
  },
} satisfies ChartConfig;

function krFmt(n: number) {
  return `kr ${Math.abs(n).toLocaleString("nb-NO")}`;
}

export default function AccrualAreaChart({ data }: AccrualAreaChartProps) {
  return (
    <ChartContainer config={chartConfig} className="h-[320px] w-full">
      <AreaChart
        data={data}
        margin={{ top: 10, right: 10, left: 10, bottom: 0 }}
      >
        <defs>
          <linearGradient id="fillCumulative" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
            <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.02} />
          </linearGradient>
          <linearGradient id="fillSetAside" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="hsl(199, 89%, 48%)" stopOpacity={0.2} />
            <stop offset="95%" stopColor="hsl(199, 89%, 48%)" stopOpacity={0.02} />
          </linearGradient>
        </defs>
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
          tickFormatter={(v) => `${Math.round(v / 1000)}k`}
        />
        <ChartTooltip
          content={
            <ChartTooltipContent
              formatter={(value, name) => {
                const label =
                  name === "cumulative"
                    ? "Opptjent"
                    : "Avsatt";
                return (
                  <span>
                    {label}: {krFmt(value as number)}
                  </span>
                );
              }}
            />
          }
        />
        <ReferenceLine
          x="Jun"
          stroke="hsl(var(--primary))"
          strokeDasharray="4 4"
          strokeOpacity={0.5}
          label={{
            value: "Utbetaling",
            position: "top",
            fontSize: 10,
            fill: "hsl(var(--primary))",
          }}
        />
        <Area
          type="monotone"
          dataKey="cumulative"
          stroke="hsl(var(--primary))"
          strokeWidth={2}
          fill="url(#fillCumulative)"
          animationDuration={800}
        />
        <Area
          type="monotone"
          dataKey="cumulativeSetAside"
          stroke="hsl(199, 89%, 48%)"
          strokeWidth={2}
          strokeDasharray="4 4"
          fill="url(#fillSetAside)"
          animationDuration={800}
        />
      </AreaChart>
    </ChartContainer>
  );
}
