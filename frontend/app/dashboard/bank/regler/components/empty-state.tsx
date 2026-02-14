"use client";

import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { LayersIcon, PlusIcon } from "lucide-react";

// ============================================================================
// EmptyState
// ============================================================================

interface EmptyStateProps {
  onCreateRule: () => void;
}

export function EmptyState({ onCreateRule }: EmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center py-16 rounded-xl border bg-card"
    >
      <div className="relative mb-4">
        <div className="size-14 rounded-2xl bg-[var(--primary)]/10 flex items-center justify-center">
          <LayersIcon className="size-7 text-[var(--primary)]" />
        </div>
        <div className="absolute -right-1 -bottom-1 size-6 rounded-full bg-muted flex items-center justify-center border-2 border-background">
          <PlusIcon className="size-3 text-muted-foreground" />
        </div>
      </div>
      <h3 className="font-display text-base font-semibold">
        Ingen regler enna
      </h3>
      <p className="text-[13px] text-muted-foreground mt-1 max-w-md mx-auto text-center leading-relaxed">
        Opprett regler for a automatisere bokforing av banktransaksjoner. Ciri laerer av dine korrigeringer og foreslar nye regler over tid.
      </p>
      <Button className="mt-6" size="sm" onClick={onCreateRule}>
        <PlusIcon className="size-3.5 mr-1.5" />
        Opprett forste regel
      </Button>
    </motion.div>
  );
}
