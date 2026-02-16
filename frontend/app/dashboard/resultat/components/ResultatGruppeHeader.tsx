import React from "react";
import { motion } from "framer-motion";
import { ChevronRightIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ResultatGruppe } from "../types";
import { formatNumber, getYearTotal } from "../utils";

interface ResultatGruppeHeaderProps {
  gruppe: ResultatGruppe;
  isExpanded: boolean;
}

export const ResultatGruppeHeader = React.memo<ResultatGruppeHeaderProps>(({
  gruppe,
  isExpanded,
}) => {
  return (
    <div className="grid w-full grid-cols-[minmax(180px,1.8fr)_repeat(12,minmax(60px,1fr))_minmax(80px,1fr)] gap-1 px-2 py-3 hover:bg-muted/30 transition-colors items-center">
      <div className="flex items-center gap-2">
        <motion.div
          animate={{ rotate: isExpanded ? 90 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronRightIcon className="size-4 text-muted-foreground" />
        </motion.div>
        <span className="font-semibold text-sm uppercase tracking-wide">
          {gruppe.navn}
        </span>
        {gruppe.subtotal.bilagCount && gruppe.subtotal.bilagCount > 0 && (
          <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
            {gruppe.subtotal.bilagCount} bilag
          </Badge>
        )}
      </div>
      {!isExpanded && (
        <>
          {gruppe.subtotal.måneder.map((val, i) => (
            <div key={i} className="text-right font-mono text-xs font-medium">
              {val !== 0 ? formatNumber(val, true) : "-"}
            </div>
          ))}
          <div className="text-right font-mono text-xs font-bold text-[var(--primary)]">
            {formatNumber(getYearTotal(gruppe.subtotal.måneder))}
          </div>
        </>
      )}
    </div>
  );
});

ResultatGruppeHeader.displayName = "ResultatGruppeHeader";
