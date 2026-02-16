import React from "react";
import { RefreshCwIcon } from "lucide-react";
import { BilagDetail } from "../types";
import { BilagListItem } from "./BilagListItem";

interface AccountBilagListProps {
  accountCode: string;
  bilags: BilagDetail[] | undefined;
  isLoading: boolean;
}

export const AccountBilagList = React.memo<AccountBilagListProps>(({
  accountCode,
  bilags,
  isLoading,
}) => {
  return (
    <div className="ml-8 mb-2 bg-muted/30 rounded-lg p-3 border border-muted">
      {isLoading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
          <RefreshCwIcon className="size-4 animate-spin" />
          Henter bilag...
        </div>
      ) : bilags?.length ? (
        <div className="space-y-1">
          <div className="text-xs font-medium text-muted-foreground mb-2">
            Bilag på konto {accountCode}:
          </div>
          {bilags.map((bilag) => (
            <BilagListItem key={bilag.id || bilag.bilag_number} bilag={bilag} />
          ))}
        </div>
      ) : (
        <div className="text-sm text-muted-foreground py-2">
          Ingen bilag funnet
        </div>
      )}
    </div>
  );
});

AccountBilagList.displayName = "AccountBilagList";
