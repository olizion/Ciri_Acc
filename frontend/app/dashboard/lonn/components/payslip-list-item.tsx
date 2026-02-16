"use client";

import React from "react";
import { FileTextIcon, DownloadIcon } from "lucide-react";
import type { PayslipRecord } from "../types";

interface PayslipListItemProps {
  slip: PayslipRecord;
}

export const PayslipListItem = React.memo(function PayslipListItem({ slip }: PayslipListItemProps) {
  return (
    <div className="flex items-center justify-between rounded-lg border p-3 hover:bg-muted/30 transition-colors cursor-pointer group">
      <div className="flex items-center gap-3">
        <FileTextIcon className="size-4 text-muted-foreground" />
        <div>
          <p className="text-sm font-medium">{slip.month}</p>
          <p className="text-xs text-muted-foreground">
            {new Date(slip.date).toLocaleDateString("nb-NO")}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium tabular-nums">kr {slip.net.toLocaleString("nb-NO")}</span>
        <DownloadIcon className="size-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
    </div>
  );
});
