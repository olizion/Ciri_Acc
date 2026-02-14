"use client";

import { Badge } from "@/components/ui/badge";
import {
  CheckIcon,
  XIcon,
  AlertTriangleIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import CiriLogo from "@/components/layout/ciri-logo";
import type { MatchAssessment } from "../types";

interface CiriAssessmentCardProps {
  assessment: MatchAssessment;
  acknowledgeWarning: boolean;
  onAcknowledgeChange: (v: boolean) => void;
}

function CiriAssessmentCard({
  assessment,
  acknowledgeWarning,
  onAcknowledgeChange,
}: CiriAssessmentCardProps) {
  const isHigh = assessment.confidence === "high";
  const isMedium = assessment.confidence === "medium";
  const isLow = assessment.confidence === "low";

  const borderColor = isHigh
    ? "border-emerald-200 dark:border-emerald-800"
    : isMedium
    ? "border-amber-200 dark:border-amber-800"
    : "border-red-200 dark:border-red-800";

  const bgColor = isHigh
    ? "bg-emerald-50/60 dark:bg-emerald-900/10"
    : isMedium
    ? "bg-amber-50/60 dark:bg-amber-900/10"
    : "bg-red-50/60 dark:bg-red-900/10";

  const textColor = isHigh
    ? "text-emerald-700 dark:text-emerald-400"
    : isMedium
    ? "text-amber-700 dark:text-amber-400"
    : "text-red-700 dark:text-red-400";

  const scorePercent = Math.round(assessment.score * 100);

  return (
    <div className={cn("rounded-lg border p-4 space-y-3", borderColor, bgColor)}>
      {/* Header with Ciri + confidence */}
      <div className="flex items-start gap-3">
        <CiriLogo size="sm" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-foreground">Ciris vurdering</span>
            <Badge
              variant="outline"
              className={cn(
                "text-xs",
                isHigh && "border-emerald-300 bg-emerald-100 text-emerald-700 dark:border-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
                isMedium && "border-amber-300 bg-amber-100 text-amber-700 dark:border-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
                isLow && "border-red-300 bg-red-100 text-red-700 dark:border-red-700 dark:bg-red-900/30 dark:text-red-400",
              )}
            >
              {isHigh ? "Høy" : isMedium ? "Middels" : "Lav"} konfidens — {scorePercent}%
            </Badge>
          </div>
          <p className={cn("text-sm mt-1", textColor)}>
            {assessment.explanation}
          </p>
        </div>
      </div>

      {/* Match factors */}
      {Object.keys(assessment.factors).length > 0 && (
        <div className="grid grid-cols-2 gap-2">
          {Object.entries(assessment.factors).map(([name, factor]) => (
            <div
              key={name}
              className={cn(
                "flex items-center gap-1.5 text-xs rounded-md px-2 py-1",
                factor.matched
                  ? "bg-emerald-100/60 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400"
                  : "bg-gray-100/60 text-muted-foreground dark:bg-gray-800/30"
              )}
            >
              {factor.matched ? (
                <CheckIcon className="size-3 shrink-0" />
              ) : (
                <XIcon className="size-3 shrink-0" />
              )}
              <span className="truncate capitalize">{name.replace(/_/g, " ")}</span>
              <span className="ml-auto font-mono">{Math.round(factor.score * 100)}%</span>
            </div>
          ))}
        </div>
      )}

      {/* Warning section */}
      {assessment.warning && (
        <div className={cn(
          "flex items-start gap-2 rounded-md p-3 text-sm",
          isLow
            ? "bg-red-100/80 text-red-800 dark:bg-red-900/20 dark:text-red-300"
            : "bg-amber-100/80 text-amber-800 dark:bg-amber-900/20 dark:text-amber-300"
        )}>
          <AlertTriangleIcon className="size-4 mt-0.5 shrink-0" />
          <span>{assessment.warning}</span>
        </div>
      )}

      {/* Low confidence: require acknowledgment */}
      {isLow && assessment.score < 0.3 && (
        <label className="flex items-start gap-2 cursor-pointer rounded-md border border-red-200 bg-white/60 p-3 dark:border-red-800 dark:bg-gray-900/40">
          <input
            type="checkbox"
            checked={acknowledgeWarning}
            onChange={(e) => onAcknowledgeChange(e.target.checked)}
            className="mt-0.5 accent-red-600"
          />
          <span className="text-sm text-red-800 dark:text-red-300">
            Jeg bekrefter at denne koblingen er korrekt og tar ansvar for at posteringen er riktig.
          </span>
        </label>
      )}
    </div>
  );
}

export default CiriAssessmentCard;
