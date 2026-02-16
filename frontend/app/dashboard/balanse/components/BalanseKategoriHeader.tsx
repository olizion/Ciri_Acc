import React from "react";
import { motion } from "framer-motion";
import { ChevronRightIcon } from "lucide-react";
import { BalanseKategori } from "../types";
import { formatNumber } from "../utils";
import { BalanseLinjeBilagBadge } from "./BalanseLinjeBilagBadge";

interface BalanseKategoriHeaderProps {
  kategori: BalanseKategori;
  isExpanded: boolean;
}

export const BalanseKategoriHeader = React.memo<BalanseKategoriHeaderProps>(({
  kategori,
  isExpanded,
}) => {
  return (
    <div className="grid w-full grid-cols-[24px_1fr_120px] gap-2 px-4 py-2.5 hover:bg-muted/30 transition-colors items-center rounded-lg">
      <motion.div
        animate={{ rotate: isExpanded ? 90 : 0 }}
        transition={{ duration: 0.2 }}
      >
        <ChevronRightIcon className="size-4 text-muted-foreground" />
      </motion.div>
      <div className="flex items-center gap-2">
        <span className="font-semibold text-sm">{kategori.navn}</span>
        {kategori.subtotal.bilagCount && <BalanseLinjeBilagBadge count={kategori.subtotal.bilagCount} />}
      </div>
      <div className="text-right font-mono text-sm font-medium">
        {kategori.subtotal.belop !== 0 ? formatNumber(kategori.subtotal.belop) : "-"}
      </div>
    </div>
  );
});

BalanseKategoriHeader.displayName = "BalanseKategoriHeader";
