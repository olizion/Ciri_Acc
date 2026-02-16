import React from "react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { BalanseGruppe as BalanseGruppeType } from "../types";
import { BalanseKategoriHeader } from "./BalanseKategoriHeader";
import { BalanseLinjeRow } from "./BalanseLinjeRow";
import { BalanseGruppeTotal } from "./BalanseGruppeTotal";

interface BalanseGruppeProps {
  gruppe: BalanseGruppeType;
  expandedKategorier: Set<string>;
  onToggleKategori: (kategoriId: string) => void;
  asOfDate: string;
  isRight?: boolean;
}

export const BalanseGruppe = React.memo<BalanseGruppeProps>(({
  gruppe,
  expandedKategorier,
  onToggleKategori,
  asOfDate,
  isRight = false,
}) => {
  return (
    <div className={cn("flex flex-col h-full", isRight && "lg:border-l lg:pl-6")}>
      <h3 className="font-bold text-sm uppercase tracking-wider text-muted-foreground px-4 py-2 bg-muted/30 rounded-lg mb-2">
        {gruppe.navn}
      </h3>

      <div className="flex-1 space-y-2">
        {gruppe.kategorier.map((kategori) => (
          <Collapsible
            key={kategori.id}
            open={expandedKategorier.has(kategori.id)}
            onOpenChange={() => onToggleKategori(kategori.id)}
          >
            <CollapsibleTrigger className="flex w-full items-center">
              <BalanseKategoriHeader
                kategori={kategori}
                isExpanded={expandedKategorier.has(kategori.id)}
              />
            </CollapsibleTrigger>

            <CollapsibleContent>
              <div className="border-l-2 border-muted ml-6 space-y-0.5">
                {kategori.linjer.map((linje) => (
                  <BalanseLinjeRow key={linje.konto} linje={linje} asOfDate={asOfDate} />
                ))}
              </div>
            </CollapsibleContent>
          </Collapsible>
        ))}
      </div>

      <BalanseGruppeTotal total={gruppe.total} />
    </div>
  );
});

BalanseGruppe.displayName = "BalanseGruppe";
