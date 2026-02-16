import React from "react";
import { cn } from "@/lib/utils";
import { formatNumber } from "../utils";

interface ResultatTotalRowProps {
  label: string;
  values: number[];
  total: number;
  isNegative?: boolean;
  isFinal?: boolean;
}

export const ResultatTotalRow = React.memo<ResultatTotalRowProps>(({
  label,
  values,
  total,
  isNegative = false,
  isFinal = false,
}) => {
  return (
    <div
      className={cn(
        "grid grid-cols-[minmax(180px,1.8fr)_repeat(12,minmax(60px,1fr))_minmax(80px,1fr)] gap-1 px-2 py-3 items-center",
        isFinal && "bg-[var(--primary)]/5 border-t-2 border-[var(--primary)]/30",
        !isFinal && "border-t"
      )}
    >
      <div className={cn("pl-6", isFinal ? "font-bold text-base" : "font-bold text-sm")}>
        {label}
      </div>
      {values.map((val, i) => (
        <div
          key={i}
          className={cn(
            "text-right font-mono",
            isFinal ? "text-xs text-muted-foreground" : "text-sm",
            !isFinal && val < 0 ? "text-rose-600" : !isFinal ? "text-muted-foreground" : ""
          )}
        >
          {isFinal ? "-" : val !== 0 ? formatNumber(val, true) : "-"}
        </div>
      ))}
      <div
        className={cn(
          "text-right font-mono font-bold",
          isFinal ? "text-lg" : "text-sm",
          total < 0 ? (isFinal ? "text-rose-600" : "text-rose-600") : isFinal ? "text-emerald-600" : isNegative ? "" : "text-[var(--primary)]"
        )}
      >
        {isNegative && total !== 0 ? `-${formatNumber(Math.abs(total))}` : formatNumber(total)}
      </div>
    </div>
  );
});

ResultatTotalRow.displayName = "ResultatTotalRow";
