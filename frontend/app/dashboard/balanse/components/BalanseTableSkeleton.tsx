import React from "react";
import { Skeleton } from "@/components/ui/skeleton";

export const BalanseTableSkeleton = React.memo(() => {
  return (
    <div className="grid lg:grid-cols-2 gap-8">
      <div className="space-y-4">
        {[1, 2].map((i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-8 w-full" />
            <div className="ml-6 space-y-1">
              {[1, 2, 3, 4].map((j) => (
                <Skeleton key={j} className="h-6 w-full" />
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-8 w-full" />
            <div className="ml-6 space-y-1">
              {[1, 2, 3].map((j) => (
                <Skeleton key={j} className="h-6 w-full" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
});

BalanseTableSkeleton.displayName = "BalanseTableSkeleton";
