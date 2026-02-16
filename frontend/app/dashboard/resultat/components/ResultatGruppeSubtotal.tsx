import React from "react";
import { ResultatLinje } from "../types";
import { formatNumber, getYearTotal } from "../utils";

interface ResultatGruppeSubtotalProps {
  subtotal: ResultatLinje;
}

export const ResultatGruppeSubtotal = React.memo<ResultatGruppeSubtotalProps>(({ subtotal }) => {
  return (
    <div className="grid grid-cols-[minmax(180px,1.8fr)_repeat(12,minmax(60px,1fr))_minmax(80px,1fr)] gap-1 px-2 py-2 bg-muted/50 items-center text-sm rounded-b-md">
      <div className="pl-6 font-medium text-xs">
        {subtotal.navn}
      </div>
      {subtotal.måneder.map((val, i) => (
        <div key={i} className="text-right font-mono text-xs font-medium">
          {val !== 0 ? formatNumber(val, true) : "-"}
        </div>
      ))}
      <div className="text-right font-mono text-xs font-bold text-[var(--primary)]">
        {formatNumber(getYearTotal(subtotal.måneder))}
      </div>
    </div>
  );
});

ResultatGruppeSubtotal.displayName = "ResultatGruppeSubtotal";
