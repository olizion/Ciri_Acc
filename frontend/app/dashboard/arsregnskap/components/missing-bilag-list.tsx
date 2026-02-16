"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { AlertCircleIcon, ReceiptIcon, UploadIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { MissingBilag } from "../types";

export function MissingBilagList({ items }: { items: MissingBilag[] }) {
  const [filter, setFilter] = useState<string>("all");

  const filteredItems = items.filter(item => {
    if (filter === "all") return true;
    return item.status === filter;
  });

  const missingCount = items.filter(i => i.status === "missing").length;
  const reviewCount = items.filter(i => i.status === "needs_review").length;

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="destructive" className="font-normal">
            {missingCount} mangler
          </Badge>
          {reviewCount > 0 && (
            <Badge variant="outline" className="border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-400 font-normal">
              {reviewCount} gjennomgang
            </Badge>
          )}
        </div>
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-[140px] h-8">
            <SelectValue placeholder="Filter" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle</SelectItem>
            <SelectItem value="missing">Mangler</SelectItem>
            <SelectItem value="needs_review">Gjennomgang</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <ScrollArea className="h-[280px]">
        <div className="space-y-2 pr-4">
          {filteredItems.map((item, index) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className={cn(
                "group flex items-center gap-3 rounded-lg border p-3 transition-all hover:border-[var(--primary)]/30",
                item.status === "missing" && "bg-red-50/50 dark:bg-red-950/10",
                item.status === "needs_review" && "bg-amber-50/50 dark:bg-amber-950/10"
              )}
            >
              <div className={cn(
                "flex size-8 shrink-0 items-center justify-center rounded-lg",
                item.status === "missing" ? "bg-red-100 dark:bg-red-900/30" : "bg-amber-100 dark:bg-amber-900/30"
              )}>
                {item.status === "missing" ? (
                  <ReceiptIcon className="size-4 text-red-600 dark:text-red-400" />
                ) : (
                  <AlertCircleIcon className="size-4 text-amber-600 dark:text-amber-400" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <p className="font-medium truncate text-sm">{item.description}</p>
                <p className="text-xs text-muted-foreground">
                  {new Date(item.date).toLocaleDateString("nb-NO")}
                </p>
              </div>

              <p className="font-medium tabular-nums text-sm shrink-0">
                kr {Math.abs(item.amount).toLocaleString("nb-NO")}
              </p>

              <Button
                variant="ghost"
                size="icon"
                className="size-8 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
              >
                <UploadIcon className="size-4" />
              </Button>
            </motion.div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
