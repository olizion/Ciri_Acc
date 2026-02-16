"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2Icon, TrendingUpIcon, TrendingDownIcon } from "lucide-react";

interface StatsCardsProps {
  submittedCount: number;
  totalUtgaende: number;
  totalInngaende: number;
}

export function StatsCards({ submittedCount, totalUtgaende, totalInngaende }: StatsCardsProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-muted-foreground text-sm">Terminer sendt</p>
              <p className="font-display text-3xl font-bold">{submittedCount}/6</p>
            </div>
            <div className="flex size-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
              <CheckCircle2Icon className="size-6 text-green-600" />
            </div>
          </div>
          <Progress value={(submittedCount / 6) * 100} className="mt-4" />
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-muted-foreground text-sm">Total utgående MVA</p>
              <p className="font-display text-2xl font-bold">
                kr {totalUtgaende.toLocaleString("nb-NO")}
              </p>
            </div>
            <TrendingUpIcon className="size-8 text-green-600" />
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-muted-foreground text-sm">Total inngående MVA</p>
              <p className="font-display text-2xl font-bold">
                kr {totalInngaende.toLocaleString("nb-NO")}
              </p>
            </div>
            <TrendingDownIcon className="size-8 text-red-500" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
