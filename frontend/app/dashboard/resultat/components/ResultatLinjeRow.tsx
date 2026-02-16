import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronRightIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { ResultatLinje, BilagDetail } from "../types";
import { formatNumber, getYearTotal } from "../utils";
import { månedNavn } from "../constants";
import { AccountBilagList } from "./AccountBilagList";

interface ResultatLinjeRowProps {
  linje: ResultatLinje;
  isExpanded: boolean;
  onToggle: () => void;
  bilags: BilagDetail[] | undefined;
  isLoadingBilags: boolean;
}

export const ResultatLinjeRow = React.memo<ResultatLinjeRowProps>(({
  linje,
  isExpanded,
  onToggle,
  bilags,
  isLoadingBilags,
}) => {
  const hasClickableBilags = linje.bilagCount && linje.bilagCount > 0;

  return (
    <div>
      <div
        className={cn(
          "grid grid-cols-[minmax(180px,1.8fr)_repeat(12,minmax(60px,1fr))_minmax(80px,1fr)] gap-1 px-2 py-2 transition-colors items-center text-sm",
          hasClickableBilags ? "cursor-pointer hover:bg-[var(--primary)]/5" : "hover:bg-muted/20"
        )}
        onClick={() => hasClickableBilags && onToggle()}
      >
        <div className="flex items-center gap-2 pl-2">
          {hasClickableBilags ? (
            <motion.div
              animate={{ rotate: isExpanded ? 90 : 0 }}
              transition={{ duration: 0.2 }}
            >
              <ChevronRightIcon className="size-3 text-muted-foreground" />
            </motion.div>
          ) : (
            <div className="w-3" />
          )}
          <span className="font-mono text-xs text-muted-foreground w-10">
            {linje.konto}
          </span>
          <span className="truncate text-muted-foreground text-xs">
            {linje.navn}
          </span>
          {hasClickableBilags && (
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 ml-1">
              {linje.bilagCount}
            </Badge>
          )}
        </div>
        {linje.måneder.map((val, i) => (
          <div
            key={i}
            className={cn(
              "text-right font-mono text-xs",
              val < 0 ? "text-rose-600" : "text-muted-foreground"
            )}
          >
            {val !== 0 ? formatNumber(val, true) : "-"}
          </div>
        ))}
        <div className="text-right font-mono text-xs font-medium">
          {getYearTotal(linje.måneder) !== 0 ? formatNumber(getYearTotal(linje.måneder)) : "-"}
        </div>
      </div>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <AccountBilagList
              accountCode={linje.konto}
              bilags={bilags}
              isLoading={isLoadingBilags}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});

ResultatLinjeRow.displayName = "ResultatLinjeRow";
