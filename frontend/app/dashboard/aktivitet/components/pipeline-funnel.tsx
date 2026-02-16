"use client";

import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PHASE_FUNNEL, PIPELINE_STATS } from "../mock-data";
import {
  ScanSearchIcon,
  LayersIcon,
  BrainCircuitIcon,
  CheckCircle2Icon,
  ArrowRightIcon,
} from "lucide-react";

const phaseConfig = [
  { icon: ScanSearchIcon, color: "var(--muted-foreground)", label: "Transaksjoner" },
  { icon: ScanSearchIcon, color: "var(--chart-2)", label: "Fase 1" },
  { icon: LayersIcon, color: "var(--chart-3)", label: "Fase 2" },
  { icon: BrainCircuitIcon, color: "var(--primary)", label: "Fase 3" },
];

export function PipelineFunnel() {
  const max = PHASE_FUNNEL[0].count;

  const conversionRates = [
    {
      label: "Fase 1 gjennomgang",
      value: `${((PIPELINE_STATS.phase1Passed / PIPELINE_STATS.totalTransactions) * 100).toFixed(0)}%`,
    },
    {
      label: "Fase 2 klyngesjekk",
      value: `${((PIPELINE_STATS.phase2Passed / PIPELINE_STATS.phase1Passed) * 100).toFixed(0)}%`,
    },
    {
      label: "Fase 3 AI-godkjent",
      value: `${((PIPELINE_STATS.phase3Approved / PIPELINE_STATS.phase3Queued) * 100).toFixed(0)}%`,
    },
  ];

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">Behandlingspipeline</CardTitle>
          <div className="flex items-center gap-1">
            <CheckCircle2Icon className="h-3.5 w-3.5 text-emerald-600" />
            <span className="text-xs text-muted-foreground">
              {PIPELINE_STATS.phase3Approved} godkjent av{" "}
              {PIPELINE_STATS.totalTransactions}
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Funnel visualization */}
        <div className="flex items-stretch gap-2">
          {PHASE_FUNNEL.map((phase, i) => {
            const config = phaseConfig[i];
            const Icon = config.icon;
            const widthPct = Math.max((phase.count / max) * 100, 20);
            const isLast = i === PHASE_FUNNEL.length - 1;

            return (
              <div key={phase.phase} className="flex flex-1 items-center gap-2">
                <motion.div
                  initial={{ scaleX: 0, opacity: 0 }}
                  animate={{ scaleX: 1, opacity: 1 }}
                  transition={{ delay: i * 0.12, duration: 0.5, ease: "easeOut" }}
                  className="flex-1 origin-left"
                >
                  <div
                    className="rounded-xl p-3 transition-shadow hover:shadow-sm"
                    style={{
                      backgroundColor: `color-mix(in oklch, ${config.color}, transparent 92%)`,
                      borderLeft: `3px solid ${config.color}`,
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <Icon
                        className="h-4 w-4 shrink-0"
                        style={{ color: config.color }}
                      />
                      <div className="min-w-0">
                        <p className="truncate text-[10px] font-medium text-muted-foreground">
                          {phase.phase}
                        </p>
                        <p className="font-display text-lg font-bold tracking-tight">
                          {phase.count.toLocaleString("nb-NO")}
                        </p>
                      </div>
                    </div>
                  </div>
                </motion.div>
                {!isLast && (
                  <ArrowRightIcon className="h-4 w-4 shrink-0 text-muted-foreground/30" />
                )}
              </div>
            );
          })}
        </div>

        {/* Conversion rates */}
        <div className="mt-4 flex items-center gap-6">
          {conversionRates.map((rate) => (
            <div key={rate.label} className="text-xs">
              <span className="text-muted-foreground">{rate.label}: </span>
              <span className="font-semibold">{rate.value}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
