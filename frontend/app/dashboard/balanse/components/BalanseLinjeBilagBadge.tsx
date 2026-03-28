import React from "react";
import { Badge } from "@/components/ui/badge";

interface BalanseLinjeBilagBadgeProps {
  count: number;
}

export const BalanseLinjeBilagBadge = React.memo<BalanseLinjeBilagBadgeProps>(({ count }) => {
  if (count <= 0) return null;

  return (
    <Badge variant="secondary" className="text-[12px] px-1.5 py-0 h-4">
      {count} bilag
    </Badge>
  );
});

BalanseLinjeBilagBadge.displayName = "BalanseLinjeBilagBadge";
