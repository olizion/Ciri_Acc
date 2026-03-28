import React from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { ChevronRightIcon } from "lucide-react";
import { formatNumber } from "../utils";
import { Transaksjon } from "../types";
import { CiriPostedBadge } from "@/components/ui/ciri-posted-badge";

interface TransactionRowProps {
  trans: Transaksjon;
}

export const TransactionRow = React.memo(function TransactionRow({ trans }: TransactionRowProps) {
  const content = (
    <div className="grid sm:grid-cols-[100px_100px_1fr_100px_100px_80px] gap-2 sm:gap-4 px-4 py-2.5 text-sm hover:bg-[var(--primary)]/5 transition-colors cursor-pointer group">
      <div className="sm:hidden space-y-1">
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">{trans.dato}</span>
          <Badge variant="outline" className="text-xs font-mono group-hover:border-[var(--primary)] group-hover:text-[var(--primary)]">
            {trans.bilagsnummer}
          </Badge>
        </div>
        <p className="text-sm">{trans.beskrivelse}</p>
        <div className="flex justify-between text-xs">
          {trans.debet > 0 && (
            <span className="text-emerald-600">D: {formatNumber(trans.debet)}</span>
          )}
          {trans.kredit > 0 && (
            <span className="text-rose-600">K: {formatNumber(trans.kredit)}</span>
          )}
          <span className="text-muted-foreground">→ {trans.motpart}</span>
        </div>
      </div>

      <div className="hidden sm:block text-muted-foreground">
        {trans.dato}
      </div>
      <div className="hidden sm:block">
        <Badge variant="outline" className="text-xs font-mono group-hover:border-[var(--primary)] group-hover:text-[var(--primary)] transition-colors">
          {trans.bilagsnummer}
        </Badge>
      </div>
      <div className="hidden sm:flex items-center gap-1.5 truncate group-hover:text-[var(--primary)] transition-colors">
        <span className="truncate">{trans.beskrivelse}</span>
        {trans.createdByCiri && <CiriPostedBadge bilagId={trans.bilagId} showOverrideLink={false} />}
      </div>
      <div className="hidden sm:block text-right font-mono text-emerald-600">
        {trans.debet > 0 ? formatNumber(trans.debet) : "-"}
      </div>
      <div className="hidden sm:block text-right font-mono text-rose-600">
        {trans.kredit > 0 ? formatNumber(trans.kredit) : "-"}
      </div>
      <div className="hidden sm:flex items-center justify-end gap-1 font-mono text-muted-foreground">
        <span>{trans.motpart}</span>
        <ChevronRightIcon className="size-3 opacity-0 group-hover:opacity-100 transition-opacity text-[var(--primary)]" />
      </div>
    </div>
  );

  const hasValidBilagId = trans.bilagId && trans.bilagId.length > 0 && trans.bilagId !== 'null' && trans.bilagId !== 'undefined';

  return hasValidBilagId ? (
    <Link href={`/dashboard/bilag?id=${trans.bilagId}`} className="block">
      {content}
    </Link>
  ) : (
    <div>{content}</div>
  );
});
