import React from "react";
import Link from "next/link";
import { ChevronRightIcon } from "lucide-react";
import { BilagDetail } from "../types";
import { CiriPostedBadge } from "@/components/ui/ciri-posted-badge";

interface BilagListItemProps {
  bilag: BilagDetail;
}

export const BilagListItem = React.memo<BilagListItemProps>(({ bilag }) => {
  const hasValidId = bilag.id && bilag.id.length > 0 && bilag.id !== 'null' && bilag.id !== 'undefined';

  const content = (
    <div className="flex items-center justify-between py-1.5 px-2 rounded-md hover:bg-background transition-colors group">
      <div className="flex items-center gap-3">
        <span className="font-mono text-xs text-[var(--primary)]">
          {bilag.bilag_number}
        </span>
        <span className="text-xs text-muted-foreground">
          {new Date(bilag.document_date).toLocaleDateString("nb-NO")}
        </span>
        <span className="text-xs truncate max-w-[200px]">
          {bilag.description}
        </span>
        {bilag.counterparty_name && (
          <span className="text-xs text-muted-foreground truncate max-w-[150px]">
            — {bilag.counterparty_name}
          </span>
        )}
        {bilag.created_by_ciri && (
          <CiriPostedBadge bilagId={bilag.id} showOverrideLink={false} />
        )}
      </div>
      <div className="flex items-center gap-2">
        <span className="font-mono text-xs font-medium">
          kr {bilag.net_amount.toLocaleString("nb-NO", { maximumFractionDigits: 0 })}
        </span>
        <ChevronRightIcon className="size-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
    </div>
  );

  return hasValidId ? (
    <Link
      href={`/dashboard/bilag?id=${bilag.id}`}
      className="block"
    >
      {content}
    </Link>
  ) : (
    <div>{content}</div>
  );
});

BilagListItem.displayName = "BilagListItem";
