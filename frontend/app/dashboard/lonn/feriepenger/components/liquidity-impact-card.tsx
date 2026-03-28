"use client";

import { AlertTriangleIcon, CalendarIcon, BookOpenIcon } from "lucide-react";
import { Progress } from "@/components/ui/progress";

export interface LiquidityImpactCardProps {
  totalFeriepengerPayout: number;
  monthlyGross: number;
  setAsideYtd: number;
  monthsElapsed: number;
}

function krFmt(n: number) {
  return Math.abs(n).toLocaleString("nb-NO");
}

export default function LiquidityImpactCard({
  totalFeriepengerPayout,
  monthlyGross,
  setAsideYtd,
  monthsElapsed,
}: LiquidityImpactCardProps) {
  const remaining = totalFeriepengerPayout - setAsideYtd;
  const monthsLeft = 12 - monthsElapsed;
  const monthlyAccrual = monthsLeft > 0 ? Math.round(remaining / monthsLeft) : 0;
  const juneTotal = totalFeriepengerPayout + monthlyGross;
  const progressPercent = totalFeriepengerPayout > 0
    ? Math.round((setAsideYtd / totalFeriepengerPayout) * 100)
    : 0;

  return (
    <div className="rounded-xl border bg-card overflow-hidden">
      <div className="px-4 py-3 border-b bg-muted/20">
        <div className="flex items-center gap-2">
          <CalendarIcon className="size-3.5 text-muted-foreground" />
          <h3 className="text-[13px] font-semibold">
            Juni-utbetaling
          </h3>
        </div>
      </div>
      <div className="p-4 space-y-4">
        {/* What's due in June */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[12px]">
            <span className="text-muted-foreground">Feriepenger</span>
            <span className="font-medium tabular-nums">kr {krFmt(totalFeriepengerPayout)}</span>
          </div>
          <div className="flex items-center justify-between text-[12px]">
            <span className="text-muted-foreground">Ordinær lønn juni</span>
            <span className="font-medium tabular-nums">kr {krFmt(monthlyGross)}</span>
          </div>
          <div className="flex items-center justify-between text-[13px] pt-1.5 border-t font-semibold">
            <span>Totalt ut fra konto i juni</span>
            <span className="font-display tabular-nums">kr {krFmt(juneTotal)}</span>
          </div>
        </div>

        {/* Liquidity warning */}
        <div className="flex items-start gap-2.5 rounded-lg border border-amber-200 dark:border-amber-800/40 bg-amber-50/60 dark:bg-amber-950/20 p-3">
          <AlertTriangleIcon className="size-3.5 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
          <p className="text-[12px] text-amber-800 dark:text-amber-300 leading-relaxed">
            Hele beløpet går fra driftskontoen i juni. Sørg for at det er nok
            likviditet — avsetningen på konto 2780 er kun bokført, ikke overført
            til separat konto.
          </p>
        </div>

        {/* Accounting accrual progress */}
        <div className="rounded-lg border bg-muted/30 p-3 space-y-2">
          <div className="flex items-center gap-1.5 mb-1">
            <BookOpenIcon className="size-3 text-muted-foreground" />
            <span className="text-[12px] font-medium">Bokført avsetning (konto 2780)</span>
          </div>
          <div className="flex items-center justify-between text-[12px]">
            <span className="text-muted-foreground">
              {monthsElapsed} av 12 mnd bokført
            </span>
            <span className="font-semibold tabular-nums">
              kr {krFmt(setAsideYtd)} av {krFmt(totalFeriepengerPayout)}
            </span>
          </div>
          <Progress value={progressPercent} className="h-1.5" />
          {remaining > 0 && monthsLeft > 0 && (
            <p className="text-[12px] text-muted-foreground">
              kr {krFmt(monthlyAccrual)}/mnd bokføres de neste {monthsLeft} månedene.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
