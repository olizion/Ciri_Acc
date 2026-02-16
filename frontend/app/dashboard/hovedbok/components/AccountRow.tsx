import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronRightIcon, ChevronDownIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatNumber } from "../utils";
import { HovedboKonto } from "../types";
import { TransactionRow } from "./TransactionRow";

interface AccountRowProps {
  konto: HovedboKonto;
  isExpanded: boolean;
  onToggle: () => void;
  isHighlighted: boolean;
}

export const AccountRow = React.memo(function AccountRow({
  konto,
  isExpanded,
  onToggle,
  isHighlighted,
}: AccountRowProps) {
  return (
    <Collapsible open={isExpanded} onOpenChange={onToggle}>
      <CollapsibleTrigger
        id={`konto-${konto.kontonummer}`}
        className="flex w-full items-center group"
      >
        <div className={cn(
          "grid w-full lg:grid-cols-[40px_100px_1fr_120px_120px_120px_120px] gap-4 px-4 py-3 hover:bg-muted/30 transition-all rounded-lg items-center",
          isHighlighted && "bg-[var(--primary)]/10 ring-2 ring-[var(--primary)] ring-offset-2"
        )}>
          <motion.div
            animate={{ rotate: isExpanded ? 90 : 0 }}
            transition={{ duration: 0.2 }}
            className="hidden lg:block"
          >
            {konto.transaksjoner.length > 0 && (
              <ChevronRightIcon className="size-4 text-muted-foreground" />
            )}
          </motion.div>

          <div className="lg:hidden col-span-full space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="font-mono text-xs">
                  {konto.kontonummer}
                </Badge>
                <span className="font-medium text-sm">{konto.kontonavn}</span>
              </div>
              {konto.transaksjoner.length > 0 && (
                <ChevronDownIcon className={cn(
                  "size-4 text-muted-foreground transition-transform",
                  isExpanded && "rotate-180"
                )} />
              )}
            </div>
            <div className="grid grid-cols-4 gap-2 text-xs">
              <div>
                <p className="text-muted-foreground">IB</p>
                <p className={cn(
                  "font-mono",
                  konto.inngaendeBalanse < 0 ? "text-rose-600" : ""
                )}>
                  {formatNumber(konto.inngaendeBalanse)}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Debet</p>
                <p className="font-mono text-emerald-600">{formatNumber(konto.debet)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Kredit</p>
                <p className="font-mono text-rose-600">{formatNumber(konto.kredit)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">UB</p>
                <p className={cn(
                  "font-mono font-medium",
                  konto.utgaendeBalanse < 0 ? "text-rose-600" : ""
                )}>
                  {formatNumber(konto.utgaendeBalanse)}
                </p>
              </div>
            </div>
          </div>

          <div className="hidden lg:block font-mono text-sm">
            {konto.kontonummer}
          </div>
          <div className="hidden lg:block text-sm truncate">
            {konto.kontonavn}
          </div>
          <div className={cn(
            "hidden lg:block text-right font-mono text-sm",
            konto.inngaendeBalanse < 0 ? "text-rose-600" : ""
          )}>
            {formatNumber(konto.inngaendeBalanse)}
          </div>
          <div className="hidden lg:block text-right font-mono text-sm text-emerald-600">
            {konto.debet > 0 ? formatNumber(konto.debet) : "-"}
          </div>
          <div className="hidden lg:block text-right font-mono text-sm text-rose-600">
            {konto.kredit > 0 ? formatNumber(konto.kredit) : "-"}
          </div>
          <div className={cn(
            "hidden lg:block text-right font-mono text-sm font-medium",
            konto.utgaendeBalanse < 0 ? "text-rose-600" : ""
          )}>
            {formatNumber(konto.utgaendeBalanse)}
          </div>
        </div>
      </CollapsibleTrigger>

      <CollapsibleContent>
        <AnimatePresence>
          {isExpanded && konto.transaksjoner.length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="ml-4 lg:ml-10 mb-2 overflow-hidden"
            >
              <div className="rounded-lg border bg-muted/20">
                <div className="hidden sm:grid sm:grid-cols-[100px_100px_1fr_100px_100px_80px] gap-4 px-4 py-2 text-xs font-medium text-muted-foreground border-b">
                  <div>Dato</div>
                  <div>Bilag</div>
                  <div>Beskrivelse</div>
                  <div className="text-right">Debet</div>
                  <div className="text-right">Kredit</div>
                  <div className="text-right">Motpart</div>
                </div>

                <div className="divide-y">
                  {konto.transaksjoner.map((trans) => (
                    <TransactionRow key={trans.id} trans={trans} />
                  ))}
                </div>

                <div className="hidden sm:grid sm:grid-cols-[100px_100px_1fr_100px_100px_80px] gap-4 px-4 py-2 text-sm font-medium border-t bg-muted/30">
                  <div></div>
                  <div></div>
                  <div className="text-muted-foreground">Sum {konto.transaksjoner.length} transaksjoner</div>
                  <div className="text-right font-mono text-emerald-600">
                    {formatNumber(konto.debet)}
                  </div>
                  <div className="text-right font-mono text-rose-600">
                    {formatNumber(konto.kredit)}
                  </div>
                  <div></div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </CollapsibleContent>
    </Collapsible>
  );
});
