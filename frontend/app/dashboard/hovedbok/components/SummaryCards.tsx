import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import CiriLogo from "@/components/layout/ciri-logo";
import {
  TrendingUpIcon,
  TrendingDownIcon,
  AlertCircleIcon,
  CheckCircle2Icon,
  SparklesIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatNumber } from "../utils";
import { Totals } from "../types";

interface SummaryCardsProps {
  totals: Totals;
  isRefreshing: boolean;
  ciriInnsikterCount: number;
}

export function SummaryCards({ totals, isRefreshing, ciriInnsikterCount }: SummaryCardsProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-muted-foreground text-sm">Total Debet</p>
              {isRefreshing ? (
                <Skeleton className="h-8 w-32 mt-1" />
              ) : (
                <p className="font-display text-2xl font-bold text-emerald-600">
                  {formatNumber(totals.totalDebet)}
                </p>
              )}
            </div>
            <div className="flex size-10 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30">
              <TrendingUpIcon className="size-5 text-emerald-600" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-muted-foreground text-sm">Total Kredit</p>
              {isRefreshing ? (
                <Skeleton className="h-8 w-32 mt-1" />
              ) : (
                <p className="font-display text-2xl font-bold text-rose-600">
                  {formatNumber(totals.totalKredit)}
                </p>
              )}
            </div>
            <div className="flex size-10 items-center justify-center rounded-full bg-rose-100 dark:bg-rose-900/30">
              <TrendingDownIcon className="size-5 text-rose-600" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-muted-foreground text-sm">Differanse</p>
              {isRefreshing ? (
                <Skeleton className="h-8 w-32 mt-1" />
              ) : (
                <p className={cn(
                  "font-display text-2xl font-bold",
                  totals.differanse === 0 ? "text-emerald-600" : "text-amber-600"
                )}>
                  {formatNumber(totals.differanse)}
                </p>
              )}
            </div>
            <div className={cn(
              "flex size-10 items-center justify-center rounded-full",
              totals.differanse === 0
                ? "bg-emerald-100 dark:bg-emerald-900/30"
                : "bg-amber-100 dark:bg-amber-900/30"
            )}>
              {totals.differanse === 0 ? (
                <CheckCircle2Icon className="size-5 text-emerald-600" />
              ) : (
                <AlertCircleIcon className="size-5 text-amber-600" />
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-[var(--primary)]/20 bg-[var(--primary)]/5">
        <CardContent className="pt-6">
          <div className="flex items-center gap-3">
            <CiriLogo size="md" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-[var(--primary)]">Ciri-analyse</p>
              <p className="text-xs text-muted-foreground truncate">
                {ciriInnsikterCount} observasjoner
              </p>
            </div>
            <Badge variant="outline" className="border-[var(--primary)]/30 text-[var(--primary)]">
              <SparklesIcon className="size-3 mr-1" />
              {ciriInnsikterCount}
            </Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
