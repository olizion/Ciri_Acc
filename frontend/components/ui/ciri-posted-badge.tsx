import React from "react";
import Link from "next/link";
import { SparklesIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface CiriPostedBadgeProps {
  bilagId?: string;
  showOverrideLink?: boolean;
}

export const CiriPostedBadge = React.memo<CiriPostedBadgeProps>(
  ({ bilagId, showOverrideLink = true }) => {
    const badge = (
      <Badge
        variant="outline"
        className="text-[11px] px-1.5 py-0 h-4 gap-0.5 border-amber-300/60 bg-amber-50/50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-950/20 dark:text-amber-400 shrink-0"
      >
        <SparklesIcon className="size-2.5" />
        Ciri
      </Badge>
    );

    const hasLink = showOverrideLink && bilagId;

    const wrappedBadge = hasLink ? (
      <Link
        href={`/dashboard/bilag?id=${bilagId}`}
        className="inline-flex hover:opacity-80 transition-opacity"
        onClick={(e) => e.stopPropagation()}
      >
        {badge}
      </Link>
    ) : (
      badge
    );

    return (
      <TooltipProvider delayDuration={300}>
        <Tooltip>
          <TooltipTrigger asChild>{wrappedBadge}</TooltipTrigger>
          <TooltipContent side="top" className="text-xs max-w-[220px]">
            Automatisk bokført av Ciri.
            {hasLink && " Klikk for å gjennomgå."}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }
);

CiriPostedBadge.displayName = "CiriPostedBadge";
