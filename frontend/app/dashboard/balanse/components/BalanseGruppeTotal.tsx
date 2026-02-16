import React from "react";
import { BalanseLinje } from "../types";
import { formatNumber } from "../utils";

interface BalanseGruppeTotalProps {
  total: BalanseLinje;
}

export const BalanseGruppeTotal = React.memo<BalanseGruppeTotalProps>(({ total }) => {
  return (
    <div className="grid grid-cols-[24px_1fr_120px] gap-2 px-4 py-3 bg-[var(--primary)]/5 rounded-lg items-center border-t-2 border-[var(--primary)]/30 mt-auto pt-4">
      <div></div>
      <div className="font-bold text-sm">{total.navn}</div>
      <div className="text-right font-mono font-bold text-lg">
        {total.belop !== 0 ? formatNumber(total.belop) : "-"}
      </div>
    </div>
  );
});

BalanseGruppeTotal.displayName = "BalanseGruppeTotal";
