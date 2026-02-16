import React from "react";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  SparklesIcon,
  CheckCircle2Icon,
  AlertTriangleIcon,
  InfoIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import CiriLogo from "@/components/layout/ciri-logo";
import { CiriInsight } from "../types";

interface CiriInsightsCardProps {
  insights: CiriInsight[];
}

export const CiriInsightsCard = React.memo<CiriInsightsCardProps>(({ insights }) => {
  return (
    <Card className="border-[var(--primary)]/20 bg-gradient-to-r from-[var(--primary)]/5 to-transparent">
      <CardContent className="py-4">
        <div className="flex items-start gap-4">
          <div className="relative shrink-0">
            <CiriLogo size="md" />
            <motion.div
              className="absolute inset-0 rounded-full border-2 border-[var(--primary)]"
              animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0, 0.5] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
          </div>
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium">Ciri har analysert balansen</p>
              <Badge variant="secondary" className="text-xs">
                <SparklesIcon className="size-3 mr-1" />
                AI
              </Badge>
            </div>
            <div className="space-y-1.5">
              {insights.map((innsikt, index) => (
                <div
                  key={index}
                  className={cn(
                    "flex items-center gap-2 text-sm rounded-md px-3 py-1.5",
                    innsikt.type === "positive"
                      ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-200"
                      : innsikt.type === "warning"
                      ? "bg-amber-50 text-amber-800 dark:bg-amber-900/20 dark:text-amber-200"
                      : innsikt.type === "error"
                      ? "bg-rose-50 text-rose-800 dark:bg-rose-900/20 dark:text-rose-200"
                      : "bg-blue-50 text-blue-800 dark:bg-blue-900/20 dark:text-blue-200"
                  )}
                >
                  {innsikt.type === "positive" ? (
                    <CheckCircle2Icon className="size-4 shrink-0" />
                  ) : innsikt.type === "warning" || innsikt.type === "error" ? (
                    <AlertTriangleIcon className="size-4 shrink-0" />
                  ) : (
                    <InfoIcon className="size-4 shrink-0" />
                  )}
                  <span>{innsikt.message}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
});

CiriInsightsCard.displayName = "CiriInsightsCard";
