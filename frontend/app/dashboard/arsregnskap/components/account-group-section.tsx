"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { ChevronDownIcon } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import type { AccountGroup } from "../types";
import { AccountLineRow } from "./account-line-row";

export function AccountGroupSection({ group, index, year }: { group: AccountGroup; index: number; year: string }) {
  const [isOpen, setIsOpen] = useState(true);

  if (group.isSum) {
    const line = group.accounts[0];
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: index * 0.05 }}
        className="grid grid-cols-12 gap-4 py-3 px-4 bg-muted/50 font-semibold text-sm"
      >
        <div className="col-span-2"></div>
        <div className="col-span-6">{group.name}</div>
        <div className={cn("col-span-2 text-right tabular-nums", line.thisYear < 0 && "text-red-600")}>
          {line.thisYear.toLocaleString("nb-NO")}
        </div>
        <div className="col-span-2 text-right tabular-nums text-muted-foreground">
          {line.lastYear.toLocaleString("nb-NO")}
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
    >
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <div className="flex items-center gap-2 py-2 px-4 bg-muted/30 cursor-pointer hover:bg-muted/50 transition-colors border-y">
            <ChevronDownIcon className={cn("size-4 transition-transform", isOpen && "rotate-180")} />
            <span className="font-semibold text-sm">{group.name}</span>
          </div>
        </CollapsibleTrigger>
        <CollapsibleContent>
          {group.accounts.map((account, i) => (
            <AccountLineRow key={account.konto || i} account={account} isLast={i === group.accounts.length - 1} year={year} />
          ))}
        </CollapsibleContent>
      </Collapsible>
    </motion.div>
  );
}
