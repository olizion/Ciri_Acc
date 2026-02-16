import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";
import { formatNumber } from "../utils";

interface ResultatMetricCardProps {
  title: string;
  value: number | string;
  subtitle: string;
  icon: LucideIcon;
  iconColor: string;
  iconBgColor: string;
  valueColor?: string;
  isLoading?: boolean;
}

export const ResultatMetricCard = React.memo<ResultatMetricCardProps>(({
  title,
  value,
  subtitle,
  icon: Icon,
  iconColor,
  iconBgColor,
  valueColor,
  isLoading,
}) => {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-muted-foreground text-sm">{title}</p>
            {isLoading ? (
              <Skeleton className="h-8 w-32 mt-1" />
            ) : (
              <p className={cn("font-display text-2xl font-bold", valueColor)}>
                {typeof value === 'number' ? `kr ${formatNumber(value)}` : value}
              </p>
            )}
            <p className={cn("text-xs mt-1", subtitle.includes("Underskudd") ? "text-rose-600" : "text-muted-foreground")}>
              {subtitle}
            </p>
          </div>
          <div className={cn("flex size-10 items-center justify-center rounded-full", iconBgColor)}>
            <Icon className={cn("size-5", iconColor)} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
});

ResultatMetricCard.displayName = "ResultatMetricCard";
