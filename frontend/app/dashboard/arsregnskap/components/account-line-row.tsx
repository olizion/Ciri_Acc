"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { API_BASE_URL, COMPANY_ID } from "@/lib/api";
import { ChevronDownIcon, FileTextIcon, Loader2Icon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import type { AccountLine, AccountBilagResponse } from "../types";

export function AccountLineRow({ account, isLast, year }: { account: AccountLine; isLast: boolean; year: string }) {
  const [isOpen, setIsOpen] = useState(false);

  // Drillable if we know bilagCount > 0 (resultat), or if the account
  // has a konto and non-zero balance (balanse — count unknown upfront)
  const knownCount = (account.bilagCount ?? 0) > 0;
  const isDrillable = knownCount || (account.konto !== "" && account.thisYear !== 0);

  const { data: bilagData, isLoading: bilagLoading } = useQuery({
    queryKey: queryKeys.reports.accountBilags({
      accountCode: account.konto,
      year,
      companyId: COMPANY_ID,
    }),
    queryFn: async () => {
      const res = await fetch(
        `${API_BASE_URL}/api/reports/account/${account.konto}/bilags?company_id=${COMPANY_ID}&year=${year}`
      );
      if (!res.ok) return null;
      return res.json() as Promise<AccountBilagResponse>;
    },
    enabled: isOpen && isDrillable,
  });

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild disabled={!isDrillable}>
        <div className={cn(
          "grid grid-cols-12 gap-4 py-3 px-4 text-sm transition-colors",
          isDrillable && "cursor-pointer hover:bg-muted/50",
          !isLast && "border-b"
        )}>
          <div className="col-span-2 text-muted-foreground font-mono">{account.konto}</div>
          <div className="col-span-6 flex items-center gap-2">
            {account.navn}
            {isDrillable && (
              <Badge variant="secondary" className="text-xs h-5 px-1.5">
                {knownCount ? account.bilagCount : ""}
                <ChevronDownIcon className={cn("size-3 ml-0.5 transition-transform", isOpen && "rotate-180")} />
              </Badge>
            )}
          </div>
          <div className={cn("col-span-2 text-right tabular-nums font-medium", account.thisYear < 0 && "text-red-600")}>
            {account.thisYear.toLocaleString("nb-NO")}
          </div>
          <div className="col-span-2 text-right tabular-nums text-muted-foreground">
            {account.lastYear.toLocaleString("nb-NO")}
          </div>
        </div>
      </CollapsibleTrigger>

      {isDrillable && (
        <CollapsibleContent>
          <div className="bg-muted/30 border-b">
            {bilagLoading ? (
              <div className="flex items-center gap-2 py-4 px-4 text-sm text-muted-foreground">
                <Loader2Icon className="size-4 animate-spin" />
                Henter bilag...
              </div>
            ) : bilagData?.bilags && bilagData.bilags.length > 0 ? (
              bilagData.bilags.map((bilag, i) => (
                <Link
                  key={bilag.id}
                  href={`/dashboard/bilag?id=${bilag.id}`}
                  className={cn(
                    "grid grid-cols-12 gap-4 py-2 px-4 text-xs hover:bg-muted/50 transition-colors",
                    i !== bilagData.bilags.length - 1 && "border-b border-dashed"
                  )}
                >
                  <div className="col-span-2 font-mono text-muted-foreground">
                    {bilag.bilag_number}
                  </div>
                  <div className="col-span-4 flex items-center gap-2 text-muted-foreground">
                    <FileTextIcon className="size-3 shrink-0" />
                    <span className="truncate">{bilag.description || bilag.counterparty_name || "Bilag"}</span>
                  </div>
                  <div className="col-span-2 text-muted-foreground">
                    {bilag.document_date}
                  </div>
                  <div className={cn("col-span-2 text-right tabular-nums", bilag.gross_amount < 0 && "text-red-500")}>
                    {bilag.gross_amount.toLocaleString("nb-NO")}
                  </div>
                  <div className="col-span-2 text-right text-[var(--primary)] text-xs font-medium">
                    Se bilag →
                  </div>
                </Link>
              ))
            ) : (
              <div className="py-4 px-4 text-sm text-muted-foreground">
                Ingen bilag funnet
              </div>
            )}
          </div>
        </CollapsibleContent>
      )}
    </Collapsible>
  );
}
