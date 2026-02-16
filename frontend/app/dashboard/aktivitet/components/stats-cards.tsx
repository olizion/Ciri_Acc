"use client";

import { motion } from "framer-motion";
import {
  ActivityIcon,
  CheckCircle2Icon,
  AlertTriangleIcon,
  ShieldCheckIcon,
  FlagIcon,
} from "lucide-react";
import { PIPELINE_STATS } from "../mock-data";

const stats = [
  {
    label: "Totalt behandlet",
    value: PIPELINE_STATS.totalTransactions,
    icon: ActivityIcon,
    color: "var(--primary)",
    sub: "transaksjoner",
  },
  {
    label: "Autopostert",
    value: PIPELINE_STATS.autoPosted,
    icon: CheckCircle2Icon,
    color: "var(--chart-1)",
    sub: `${((PIPELINE_STATS.autoPosted / PIPELINE_STATS.totalTransactions) * 100).toFixed(0)}% av totalt`,
  },
  {
    label: "Foreslått bruker",
    value: PIPELINE_STATS.suggestedToUser,
    icon: AlertTriangleIcon,
    color: "var(--chart-2)",
    sub: "trenger godkjenning",
  },
  {
    label: "Regler brukt",
    value: PIPELINE_STATS.rulesApplied,
    icon: ShieldCheckIcon,
    color: "var(--chart-3)",
    sub: "automatiske regler",
  },
  {
    label: "AI-flagget",
    value: PIPELINE_STATS.phase3Flagged,
    icon: FlagIcon,
    color: "var(--chart-4)",
    sub: `${PIPELINE_STATS.userOverrides} overstyrt`,
  },
];

export function StatsCards() {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {stats.map((stat, i) => {
        const Icon = stat.icon;
        return (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06, duration: 0.35, ease: "easeOut" }}
            className="group relative overflow-hidden rounded-xl border bg-card p-4 transition-all duration-300 hover:shadow-md hover:shadow-[var(--primary)]/5"
          >
            {/* Subtle gradient accent */}
            <div
              className="absolute inset-x-0 top-0 h-0.5 opacity-0 transition-opacity group-hover:opacity-100"
              style={{ backgroundColor: stat.color }}
            />

            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">{stat.label}</p>
                <p className="font-display text-2xl font-bold tracking-tight">
                  {stat.value.toLocaleString("nb-NO")}
                </p>
                <p className="text-[10px] text-muted-foreground/70">{stat.sub}</p>
              </div>
              <div
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-transform duration-300 group-hover:scale-110"
                style={{
                  backgroundColor: `color-mix(in oklch, ${stat.color}, transparent 90%)`,
                }}
              >
                <Icon className="h-4 w-4" style={{ color: stat.color }} />
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
