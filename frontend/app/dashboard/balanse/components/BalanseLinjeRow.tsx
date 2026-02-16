import React, { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { BalanseLinje } from "../types";
import { formatNumber } from "../utils";
import { BalanseLinjeBilagBadge } from "./BalanseLinjeBilagBadge";
import { ChevronRightIcon, FileTextIcon, Loader2Icon } from "lucide-react";
import { API_BASE_URL, COMPANY_ID } from "@/lib/api";

interface HovedBokTransaksjon {
  id: string;
  dato: string;
  bilag_id: string;
  bilag_number: string;
  beskrivelse: string;
  debet: number;
  kredit: number;
  motpart: string;
}

interface HovedBokKonto {
  kontonummer: string;
  transaksjoner: HovedBokTransaksjon[];
}

interface HovedBokResponse {
  kontoer: HovedBokKonto[];
}

interface BalanseLinjeRowProps {
  linje: BalanseLinje;
  asOfDate: string;
}

export const BalanseLinjeRow = React.memo<BalanseLinjeRowProps>(({ linje, asOfDate }) => {
  const [expanded, setExpanded] = useState(false);
  const hasData = linje.belop !== 0;

  const periodStart = `${asOfDate.slice(0, 4)}-01-01`;

  const { data: transaksjoner, isLoading } = useQuery<HovedBokTransaksjon[]>({
    queryKey: ["balanse-drill", linje.konto, periodStart, asOfDate],
    queryFn: async () => {
      const res = await fetch(
        `${API_BASE_URL}/api/reports/hovedbok?company_id=${COMPANY_ID}&period_start=${periodStart}&period_end=${asOfDate}`
      );
      if (!res.ok) return [];
      const data: HovedBokResponse = await res.json();
      const konto = data.kontoer.find((k) => k.kontonummer === linje.konto);
      return konto?.transaksjoner ?? [];
    },
    enabled: expanded && hasData,
    staleTime: 30_000,
  });

  const handleClick = () => {
    if (hasData) setExpanded((prev) => !prev);
  };

  return (
    <div>
      <div
        onClick={handleClick}
        className={cn(
          "grid grid-cols-[24px_1fr_120px] gap-2 px-4 py-1.5 transition-colors items-center text-sm",
          hasData
            ? "hover:bg-[var(--primary)]/5 cursor-pointer group"
            : "hover:bg-muted/20"
        )}
      >
        <div className="flex items-center">
          {hasData ? (
            <ChevronRightIcon
              className={cn(
                "size-3 text-muted-foreground transition-transform duration-200 shrink-0",
                expanded && "rotate-90"
              )}
            />
          ) : (
            <span className="font-mono text-xs text-muted-foreground">{linje.konto}</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {hasData && (
            <span className="font-mono text-xs text-muted-foreground shrink-0">{linje.konto}</span>
          )}
          <span className={cn("truncate", hasData ? "text-foreground" : "text-muted-foreground")}>
            {linje.navn}
          </span>
          {linje.bilagCount != null && linje.bilagCount > 0 && (
            <BalanseLinjeBilagBadge count={linje.bilagCount} />
          )}
        </div>
        <div className="text-right font-mono">
          {linje.belop !== 0 ? formatNumber(linje.belop) : "-"}
        </div>
      </div>

      {expanded && hasData && (
        <div className="ml-10 mr-4 mb-2 border-l-2 border-[var(--primary)]/20 bg-muted/20 rounded-r-lg overflow-hidden">
          {isLoading ? (
            <div className="flex items-center gap-2 px-4 py-3 text-xs text-muted-foreground">
              <Loader2Icon className="size-3 animate-spin" />
              Henter posteringer...
            </div>
          ) : !transaksjoner || transaksjoner.length === 0 ? (
            <div className="px-4 py-3 text-xs text-muted-foreground">
              Ingen posteringer funnet
            </div>
          ) : (
            <div className="divide-y divide-border/50">
              {transaksjoner.map((t) => (
                <Link
                  key={t.id}
                  href={`/dashboard/bilag?id=${t.bilag_id}`}
                  className="grid grid-cols-[80px_1fr_90px] gap-2 px-4 py-2 text-xs hover:bg-[var(--primary)]/5 transition-colors group/tx items-center"
                >
                  <span className="text-muted-foreground">{t.dato}</span>
                  <div className="flex items-center gap-2 min-w-0">
                    <FileTextIcon className="size-3 text-muted-foreground shrink-0" />
                    <span className="truncate">{t.beskrivelse}</span>
                    <span className="text-muted-foreground shrink-0 opacity-0 group-hover/tx:opacity-100 transition-opacity">
                      {t.bilag_number}
                    </span>
                  </div>
                  <span className={cn(
                    "text-right font-mono",
                    t.debet > 0 ? "text-foreground" : "text-muted-foreground"
                  )}>
                    {t.debet > 0
                      ? formatNumber(t.debet)
                      : t.kredit > 0
                      ? `-${formatNumber(t.kredit)}`
                      : "-"}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
});

BalanseLinjeRow.displayName = "BalanseLinjeRow";
