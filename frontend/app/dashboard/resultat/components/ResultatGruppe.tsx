import React from "react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ResultatGruppe as ResultatGruppeType, BilagDetail } from "../types";
import { ResultatGruppeHeader } from "./ResultatGruppeHeader";
import { ResultatLinjeRow } from "./ResultatLinjeRow";
import { ResultatGruppeSubtotal } from "./ResultatGruppeSubtotal";

interface ResultatGruppeProps {
  gruppe: ResultatGruppeType;
  isExpanded: boolean;
  onToggle: () => void;
  expandedAccounts: Set<string>;
  accountBilags: Record<string, BilagDetail[]>;
  loadingAccounts: Set<string>;
  onToggleAccount: (accountCode: string) => void;
}

export const ResultatGruppe = React.memo<ResultatGruppeProps>(({
  gruppe,
  isExpanded,
  onToggle,
  expandedAccounts,
  accountBilags,
  loadingAccounts,
  onToggleAccount,
}) => {
  return (
    <Collapsible open={isExpanded} onOpenChange={onToggle}>
      <CollapsibleTrigger className="flex w-full items-center">
        <ResultatGruppeHeader gruppe={gruppe} isExpanded={isExpanded} />
      </CollapsibleTrigger>

      <CollapsibleContent>
        <div className="border-l-2 border-muted ml-4">
          {gruppe.linjer.map((linje) => (
            <ResultatLinjeRow
              key={linje.konto}
              linje={linje}
              isExpanded={expandedAccounts.has(linje.konto)}
              onToggle={() => onToggleAccount(linje.konto)}
              bilags={accountBilags[linje.konto]}
              isLoadingBilags={loadingAccounts.has(linje.konto)}
            />
          ))}

          <ResultatGruppeSubtotal subtotal={gruppe.subtotal} />
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
});

ResultatGruppe.displayName = "ResultatGruppe";
