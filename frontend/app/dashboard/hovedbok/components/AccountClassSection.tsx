import React from "react";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronRightIcon } from "lucide-react";
import { KontoKlasse } from "../types";
import { AccountRow } from "./AccountRow";

interface AccountClassSectionProps {
  klasse: KontoKlasse;
  isExpanded: boolean;
  onToggle: () => void;
  expandedKontoer: Set<string>;
  onToggleKonto: (kontonummer: string) => void;
  highlightedKonto: string | null;
}

export const AccountClassSection = React.memo(function AccountClassSection({
  klasse,
  isExpanded,
  onToggle,
  expandedKontoer,
  onToggleKonto,
  highlightedKonto,
}: AccountClassSectionProps) {
  return (
    <Collapsible open={isExpanded} onOpenChange={onToggle}>
      <CollapsibleTrigger className="flex w-full items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors">
        <motion.div
          animate={{ rotate: isExpanded ? 90 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronRightIcon className="size-4 text-muted-foreground" />
        </motion.div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="font-mono text-xs">
            {klasse.nummer}xxx
          </Badge>
          <span className="font-medium">{klasse.navn}</span>
        </div>
        <Badge variant="secondary" className="ml-auto text-xs">
          {klasse.kontoer.length} kontoer
        </Badge>
      </CollapsibleTrigger>

      <CollapsibleContent>
        <div className="border-l-2 border-muted ml-6 pl-4">
          {klasse.kontoer.map((konto) => (
            <AccountRow
              key={konto.kontonummer}
              konto={konto}
              isExpanded={expandedKontoer.has(konto.kontonummer)}
              onToggle={() => onToggleKonto(konto.kontonummer)}
              isHighlighted={highlightedKonto === konto.kontonummer}
            />
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
});
