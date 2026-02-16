"use client";

import { memo } from "react";
import { ExternalLinkIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Transaction } from "../types";
import { dateShort, krFormat } from "../helpers";
import { StatusDot } from "./status-dot";

// ============================================================================
// TransactionRow
// ============================================================================

interface TransactionRowProps {
  tx: Transaction;
  isRecent?: boolean;
  onClick?: () => void;
}

function getStatusLabel(status: string): string {
  switch (status) {
    case "matched": return "Avstemt";
    case "suggested": return "Foreslått";
    case "unmatched": return "Uavstemt";
    case "ignored": return "Ignorert";
    default: return "";
  }
}

function getStatusClassName(status: string): string {
  switch (status) {
    case "matched":
      return "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400";
    case "suggested":
      return "bg-teal-50 text-teal-700 dark:bg-teal-950/30 dark:text-teal-400";
    case "unmatched":
      return "bg-muted text-muted-foreground";
    default:
      return "bg-muted/50 text-muted-foreground/50";
  }
}

export const TransactionRow = memo(function TransactionRow({ tx, isRecent, onClick }: TransactionRowProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        "grid grid-cols-[20px_60px_1fr_90px_100px] items-center gap-2 py-2 px-3",
        "hover:bg-muted/30 transition-colors group",
        onClick && "cursor-pointer",
        isRecent && "animate-[recentFade_10s_ease-out_forwards]"
      )}
    >
      <StatusDot status={tx.reconciliation_status} />
      <span className="text-[11px] text-muted-foreground tabular-nums">
        {dateShort(tx.date)}
      </span>
      <div className="min-w-0 flex items-center gap-1">
        <div className="min-w-0 flex-1">
          <span className="text-[13px] truncate block leading-tight">
            {tx.merchant_name || tx.description}
          </span>
          {tx.merchant_name && tx.merchant_name !== tx.description && (
            <span className="text-[10px] text-muted-foreground/70 truncate block">
              {tx.description}
            </span>
          )}
        </div>
        {onClick && (
          <ExternalLinkIcon className="size-3 shrink-0 opacity-0 group-hover:opacity-60 transition-opacity text-muted-foreground" />
        )}
      </div>
      <span
        className={cn(
          "text-[11px] px-1.5 py-0.5 rounded text-center font-medium",
          getStatusClassName(tx.reconciliation_status)
        )}
      >
        {getStatusLabel(tx.reconciliation_status)}
      </span>
      <span
        className={cn(
          "text-right text-[13px] font-medium font-display tabular-nums",
          tx.amount < 0
            ? "text-foreground"
            : "text-emerald-600 dark:text-emerald-400"
        )}
      >
        {tx.amount < 0 ? "\u2212" : "+"}kr {krFormat(tx.amount)}
      </span>
    </div>
  );
});
