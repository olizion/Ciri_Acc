"use client";

import { AlertTriangleIcon, ShieldCheckIcon } from "lucide-react";
import { TOTAL_FERIEPENGER_PAYOUT } from "../data/feriepenger-monthly";

function krFmt(n: number) {
  return Math.abs(n).toLocaleString("nb-NO");
}

const ORDINAER_LONN = 110_000;
const MVA_BETALING = 23_000;
const TOTAL_JUNE_COST = TOTAL_FERIEPENGER_PAYOUT + ORDINAER_LONN + MVA_BETALING;
const MED_CIRI = TOTAL_JUNE_COST - TOTAL_FERIEPENGER_PAYOUT; // Only pay the non-feriepenger costs

export default function LiquidityImpactCard() {
  return (
    <div className="rounded-xl border bg-card overflow-hidden">
      <div className="px-4 py-3 border-b bg-muted/20">
        <div className="flex items-center gap-2">
          <AlertTriangleIcon className="size-3.5 text-amber-500" />
          <h3 className="text-[13px] font-semibold">
            Trippelsmellen i juni
          </h3>
        </div>
      </div>
      <div className="p-4 space-y-3">
        <p className="text-[11px] text-muted-foreground leading-relaxed">
          I juni treffer feriepenger, ordinær lønn og MVA-betaling samtidig. Uten
          avsetning kan dette gi et likviditetssjokk.
        </p>

        {/* June cost breakdown */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[12px]">
            <span className="text-muted-foreground">Feriepenger</span>
            <span className="font-medium tabular-nums">kr {krFmt(TOTAL_FERIEPENGER_PAYOUT)}</span>
          </div>
          <div className="flex items-center justify-between text-[12px]">
            <span className="text-muted-foreground">Ordinær lønn</span>
            <span className="font-medium tabular-nums">kr {krFmt(ORDINAER_LONN)}</span>
          </div>
          <div className="flex items-center justify-between text-[12px]">
            <span className="text-muted-foreground">MVA-betaling</span>
            <span className="font-medium tabular-nums">kr {krFmt(MVA_BETALING)}</span>
          </div>
          <div className="flex items-center justify-between text-[12px] pt-1.5 border-t">
            <span className="font-semibold">Total juni</span>
            <span className="font-display font-bold tabular-nums">kr {krFmt(TOTAL_JUNE_COST)}</span>
          </div>
        </div>

        {/* Comparison cards */}
        <div className="grid grid-cols-2 gap-2 pt-1">
          <div className="rounded-lg border border-red-200 dark:border-red-800/40 bg-red-50 dark:bg-red-950/20 p-3 text-center">
            <p className="text-[10px] uppercase tracking-wider text-red-600 dark:text-red-400 font-semibold mb-1">
              Uten avsetning
            </p>
            <p className="text-lg font-display font-bold tabular-nums text-red-600 dark:text-red-400">
              -{krFmt(TOTAL_JUNE_COST)}
            </p>
            <p className="text-[10px] text-red-500/70 mt-0.5">i juni alene</p>
          </div>
          <div className="rounded-lg border border-emerald-200 dark:border-emerald-800/40 bg-emerald-50 dark:bg-emerald-950/20 p-3 text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <ShieldCheckIcon className="size-3 text-emerald-600 dark:text-emerald-400" />
              <p className="text-[10px] uppercase tracking-wider text-emerald-600 dark:text-emerald-400 font-semibold">
                Med Ciri
              </p>
            </div>
            <p className="text-lg font-display font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
              -{krFmt(MED_CIRI)}
            </p>
            <p className="text-[10px] text-emerald-500/70 mt-0.5">feriepenger allerede avsatt</p>
          </div>
        </div>
      </div>
    </div>
  );
}
