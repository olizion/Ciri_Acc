"use client";

import { motion } from "framer-motion";
import { ChevronRightIcon, TrendingUpIcon, TrendingDownIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function FinancialPreviewCard({
  title,
  amount,
  trend,
  trendValue,
  href,
  delay = 0
}: {
  title: string;
  amount: number;
  trend: "up" | "down" | "neutral";
  trendValue?: string;
  href: string;
  delay?: number;
}) {
  const isPositive = trend === "up";
  const isNeutral = trend === "neutral";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
    >
      <Card className="group cursor-pointer hover:border-[var(--primary)]/30 transition-all">
        <CardContent className="p-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-muted-foreground">{title}</p>
              <p className="font-display text-2xl font-bold mt-1">
                kr {amount.toLocaleString("nb-NO")}
              </p>
              {trendValue && !isNeutral && (
                <div className={cn(
                  "flex items-center gap-1 text-xs mt-1",
                  isPositive ? "text-emerald-600" : "text-red-500"
                )}>
                  {isPositive ? <TrendingUpIcon className="size-3" /> : <TrendingDownIcon className="size-3" />}
                  <span>{trendValue} fra i fjor</span>
                </div>
              )}
            </div>
            <ChevronRightIcon className="size-5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
