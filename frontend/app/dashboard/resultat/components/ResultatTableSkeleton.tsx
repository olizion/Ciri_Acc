import React from "react";
import { Skeleton } from "@/components/ui/skeleton";

export const ResultatTableSkeleton = React.memo(() => {
  return (
    <div className="space-y-4 py-4">
      {[1, 2, 3].map((i) => (
        <div key={i} className="space-y-2">
          <Skeleton className="h-10 w-full" />
          <div className="ml-4 space-y-1">
            {[1, 2, 3, 4].map((j) => (
              <Skeleton key={j} className="h-8 w-full" />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
});

ResultatTableSkeleton.displayName = "ResultatTableSkeleton";
