"use client";

import { Progress } from "@/components/ui/progress";
import type { EmployeeFeriepenger } from "../types";

interface EmployeeFeriepengerTableProps {
  data: EmployeeFeriepenger[];
}

function krFmt(n: number) {
  return Math.abs(n).toLocaleString("nb-NO");
}

export default function EmployeeFeriepengerTable({ data }: EmployeeFeriepengerTableProps) {
  const totalJunePayout = data.reduce((s, e) => s + e.junePayoutAmount, 0);

  return (
    <div className="rounded-xl border bg-card overflow-hidden">
      <div className="px-5 py-3 border-b bg-muted/20">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">
            Feriepenger per ansatt ({data.length})
          </h3>
          <span className="text-[13px] text-muted-foreground">
            Basert på 2025-grunnlag
          </span>
        </div>
      </div>

      {/* Table header */}
      <div className="hidden sm:grid grid-cols-[1fr_110px_70px_110px_120px_100px] gap-4 px-5 py-2 border-b bg-muted/10 text-[12px] uppercase tracking-wider text-muted-foreground font-semibold">
        <span>Ansatt</span>
        <span className="text-right">Grunnlag</span>
        <span className="text-right">Sats</span>
        <span className="text-right">Opptjent</span>
        <span className="text-center">Feriedager</span>
        <span className="text-right">Juni-utbet.</span>
      </div>

      {/* Rows */}
      <div className="divide-y divide-border/50">
        {data.map((emp) => {
          const daysProgress = Math.round(
            (emp.vacationDays.used / emp.vacationDays.total) * 100
          );
          return (
            <div
              key={emp.id}
              className="group flex items-center gap-4 px-5 py-3 transition-colors hover:bg-muted/30"
            >
              <div className="sm:grid sm:grid-cols-[1fr_110px_70px_110px_120px_100px] sm:gap-4 sm:items-center flex-1">
                {/* Name + position */}
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[var(--primary)]/10 font-medium text-[var(--primary)] text-xs">
                    {emp.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")}
                  </div>
                  <div className="min-w-0">
                    <p className="text-[13px] font-medium truncate">
                      {emp.name}
                    </p>
                    <p className="text-[13px] text-muted-foreground truncate">
                      {emp.position}
                    </p>
                  </div>
                </div>

                {/* Grunnlag */}
                <p className="hidden sm:block text-[13px] font-medium tabular-nums text-right">
                  kr {krFmt(emp.previousYearGross)}
                </p>

                {/* Sats */}
                <p className="hidden sm:block text-[13px] tabular-nums text-right text-muted-foreground">
                  {emp.rateLabel}
                </p>

                {/* Opptjent */}
                <p className="hidden sm:block text-[13px] font-medium tabular-nums text-right">
                  kr {krFmt(emp.accruedTotal)}
                </p>

                {/* Feriedager with mini progress */}
                <div className="hidden sm:block px-2">
                  <div className="flex items-center justify-between text-[13px] mb-0.5">
                    <span className="text-muted-foreground">
                      {emp.vacationDays.used}/{emp.vacationDays.total}
                    </span>
                    <span className="text-muted-foreground/60">{daysProgress}%</span>
                  </div>
                  <Progress value={daysProgress} className="h-1" />
                </div>

                {/* Juni-utbetaling */}
                <p className="hidden sm:block text-[13px] font-display font-semibold tabular-nums text-right text-sky-600 dark:text-sky-400">
                  kr {krFmt(emp.junePayoutAmount)}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Totals row */}
      <div className="hidden sm:grid grid-cols-[1fr_110px_70px_110px_120px_100px] gap-4 px-5 py-3 border-t bg-muted/10">
        <span className="text-[13px] font-semibold">Totalt</span>
        <span className="text-[13px] font-semibold tabular-nums text-right">
          kr {krFmt(data.reduce((s, e) => s + e.previousYearGross, 0))}
        </span>
        <span />
        <span className="text-[13px] font-semibold tabular-nums text-right">
          kr {krFmt(data.reduce((s, e) => s + e.accruedTotal, 0))}
        </span>
        <span />
        <span className="text-[13px] font-display font-bold tabular-nums text-right text-sky-600 dark:text-sky-400">
          kr {krFmt(totalJunePayout)}
        </span>
      </div>
    </div>
  );
}
