"use client";

import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CLUSTER_STATS } from "../mock-data";
import { CHART_COLORS } from "../chart-theme";
import { cn } from "@/lib/utils";
import { NetworkIcon } from "lucide-react";

const strengthConfig = {
  STRONG: {
    color: "bg-emerald-500",
    label: "Sterk",
    badge: "border-emerald-500/30 text-emerald-600",
  },
  GROWING: {
    color: "bg-amber-500",
    label: "Voksende",
    badge: "border-amber-500/30 text-amber-600",
  },
  WEAK: {
    color: "bg-red-400",
    label: "Svak",
    badge: "border-red-400/30 text-red-500",
  },
};

export function ClusterMap() {
  return (
    <Card className="overflow-hidden">
      {/* Top highlight */}
      <div
        className="h-px"
        style={{
          background: `linear-gradient(to right, transparent, ${CHART_COLORS.emerald}30, transparent)`,
        }}
      />

      <div className="px-4 pt-4 pb-3 sm:px-5">
        <div className="flex items-center gap-2">
          <div
            className="flex h-7 w-7 items-center justify-center rounded-lg"
            style={{ backgroundColor: `${CHART_COLORS.emerald}15` }}
          >
            <NetworkIcon
              className="h-3.5 w-3.5"
              style={{ color: CHART_COLORS.emerald }}
            />
          </div>
          <span className="text-sm font-semibold">Klyngestyrke</span>
        </div>
      </div>

      <CardContent className="space-y-3 px-4 pb-4 sm:px-5">
        {CLUSTER_STATS.map((cluster, i) => {
          const config = strengthConfig[cluster.strengthLevel];
          return (
            <motion.div
              key={cluster.account}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05, duration: 0.3 }}
              className="space-y-1.5"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">
                  {cluster.account} {cluster.label}
                </span>
                <Badge
                  variant="outline"
                  className={cn("text-xs", config.badge)}
                >
                  {config.label}
                </Badge>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-muted">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${cluster.strength * 100}%` }}
                  transition={{
                    delay: i * 0.05 + 0.2,
                    duration: 0.6,
                    ease: "easeOut",
                  }}
                  className={cn("h-full rounded-full", config.color)}
                />
              </div>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span>{cluster.dataPoints} datapunkter</span>
                <span>{cluster.distinctMerchants} leverandører</span>
                {cluster.overrideRate > 0 && (
                  <span className="text-amber-600">
                    {(cluster.overrideRate * 100).toFixed(0)}% overstyrt
                  </span>
                )}
              </div>
            </motion.div>
          );
        })}
      </CardContent>
    </Card>
  );
}
