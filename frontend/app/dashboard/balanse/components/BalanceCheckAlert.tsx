import React from "react";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2Icon, AlertTriangleIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatNumber } from "../utils";

interface BalanceCheckAlertProps {
  leverandorgjeld: number;
  leverandorgjeldCount: number;
}

export const BalanceCheckAlert = React.memo<BalanceCheckAlertProps>(({
  leverandorgjeld,
  leverandorgjeldCount,
}) => {
  return (
    <div
      className={cn(
        "mt-6 p-4 rounded-lg border-2 flex items-center justify-between",
        leverandorgjeld > 0
          ? "border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-900/20"
          : "border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-900/20"
      )}
    >
      <div className="flex items-center gap-3">
        {leverandorgjeld > 0 ? (
          <AlertTriangleIcon className="size-6 text-amber-600" />
        ) : (
          <CheckCircle2Icon className="size-6 text-blue-600" />
        )}
        <div>
          <p
            className={cn(
              "font-medium",
              leverandorgjeld > 0
                ? "text-amber-800 dark:text-amber-200"
                : "text-blue-800 dark:text-blue-200"
            )}
          >
            {leverandorgjeld > 0 ? "Utestående leverandørgjeld" : "Ingen utestående gjeld"}
          </p>
          <p className="text-sm text-muted-foreground">
            {leverandorgjeld > 0
              ? `${leverandorgjeldCount} fakturaer venter på betaling`
              : "Alle registrerte fakturaer er bokført"}
          </p>
        </div>
      </div>
      {leverandorgjeld > 0 && (
        <Badge variant="outline" className="text-lg px-4 py-2 border-amber-400 text-amber-700">
          kr {formatNumber(leverandorgjeld)}
        </Badge>
      )}
    </div>
  );
});

BalanceCheckAlert.displayName = "BalanceCheckAlert";
