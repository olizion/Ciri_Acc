"use client";

import { memo } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  MoreHorizontalIcon,
  PencilIcon,
  TrashIcon,
  SparklesIcon,
  SearchIcon,
  TrendingUpIcon,
  ArrowRightIcon,
  ZapIcon,
  EyeOffIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Rule } from "../types";
import { categoryLabels } from "../constants";
import { RuleTypeBadge, PriorityBadge } from "./badges";

// ============================================================================
// RuleCard
// ============================================================================

interface RuleCardProps {
  rule: Rule;
  onEdit: () => void;
  onDelete: () => void;
  onToggle: () => void;
  onDetail: () => void;
  isToggling: boolean;
}

export const RuleCard = memo(function RuleCard({
  rule,
  onEdit,
  onDelete,
  onToggle,
  onDetail,
  isToggling,
}: RuleCardProps) {
  const typeAccent = {
    auto_category: { line: "bg-blue-500", glow: "group-hover:shadow-blue-500/8" },
    auto_match: { line: "bg-amber-500", glow: "group-hover:shadow-amber-500/8" },
    ignore: { line: "bg-slate-400", glow: "group-hover:shadow-slate-400/8" },
    split: { line: "bg-violet-500", glow: "group-hover:shadow-violet-500/8" },
  }[rule.rule_type] ?? { line: "bg-blue-500", glow: "" };

  const effectiveRate =
    rule.times_applied > 0
      ? Math.round(((rule.times_applied - rule.times_overridden) / rule.times_applied) * 100)
      : null;

  return (
    <motion.div
      layout
      exit={{ opacity: 0, y: -10, transition: { duration: 0.2 } }}
      className={cn(
        "group relative overflow-hidden rounded-xl border bg-card transition-all cursor-pointer",
        "hover:shadow-lg hover:shadow-black/[0.04] dark:hover:shadow-black/20",
        typeAccent.glow,
        rule.is_active
          ? "border-border"
          : "border-dashed border-muted-foreground/30 opacity-60"
      )}
      onClick={onDetail}
    >
      {/* Accent top bar */}
      <div className={cn("h-[2px] w-full", typeAccent.line)} />

      <div className="p-4">
        {/* Header row */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              {rule.learned_from_user && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="inline-flex size-5 items-center justify-center rounded-full bg-[var(--primary)] shrink-0">
                        <SparklesIcon className="size-2.5 text-white" />
                      </span>
                    </TooltipTrigger>
                    <TooltipContent><p>Laert fra dine korrigeringer</p></TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
              <h3 className="text-[13px] font-semibold leading-tight">{rule.name}</h3>
              <RuleTypeBadge type={rule.rule_type} />
            </div>
            {rule.description && (
              <p className="text-[13px] text-muted-foreground mt-1 line-clamp-1">
                {rule.description}
              </p>
            )}
          </div>
          <div
            className="flex items-center gap-1.5 shrink-0"
            onClick={(e) => e.stopPropagation()}
          >
            <Switch
              checked={rule.is_active}
              onCheckedChange={onToggle}
              disabled={isToggling}
              aria-label="Aktiver regel"
            />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="size-7 opacity-0 group-hover:opacity-100 transition-opacity">
                  <MoreHorizontalIcon className="size-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={onEdit}>
                  <PencilIcon className="size-4 mr-2" />
                  Rediger
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={onDelete} className="text-red-600">
                  <TrashIcon className="size-4 mr-2" />
                  Slett
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Two-panel criteria -> action flow */}
        <div className="relative flex gap-0 items-stretch">
          {/* Criteria panel (left) */}
          <div className="flex-1 rounded-lg bg-muted/40 p-3 border border-border/50">
            <div className="flex items-center gap-1.5 mb-2">
              <SearchIcon className="size-3 text-muted-foreground/60" />
              <span className="text-[12px] font-semibold uppercase tracking-wider text-muted-foreground/60">
                Nar
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {rule.criteria.description_contains && (
                <span className="inline-flex items-center rounded-md bg-[var(--primary)]/10 px-2 py-0.5 text-[13px] font-semibold text-[var(--primary)]">
                  &quot;{rule.criteria.description_contains}&quot;
                </span>
              )}
              {rule.criteria.merchant_name && (
                <span className="inline-flex items-center rounded-md bg-muted px-2 py-0.5 text-[13px] font-medium text-foreground/70">
                  {rule.criteria.merchant_name}
                </span>
              )}
              {rule.criteria.amount_exact != null && (
                <span className="inline-flex items-center rounded-md bg-muted px-2 py-0.5 text-[13px] font-mono text-foreground/70">
                  = kr {rule.criteria.amount_exact}
                </span>
              )}
              {(rule.criteria.amount_min != null || rule.criteria.amount_max != null) && (
                <span className="inline-flex items-center rounded-md bg-muted px-2 py-0.5 text-[13px] font-mono text-foreground/70">
                  {rule.criteria.amount_min != null && `>=${rule.criteria.amount_min}`}
                  {rule.criteria.amount_min != null && rule.criteria.amount_max != null && "--"}
                  {rule.criteria.amount_max != null && `<=${rule.criteria.amount_max}`}
                </span>
              )}
              {rule.criteria.direction && (
                <span className="inline-flex items-center rounded-md bg-muted px-2 py-0.5 text-[13px] font-medium text-foreground/70">
                  {rule.criteria.direction === "debit" ? "Utbetaling" : "Innbetaling"}
                </span>
              )}
            </div>
          </div>

          {/* Connector */}
          <div className="flex flex-col items-center justify-center w-8 relative z-10">
            <div className="flex-1 w-px border-l border-dashed border-border" />
            <div className="size-6 rounded-full flex items-center justify-center bg-card border-2 border-border shadow-sm -my-px">
              <ArrowRightIcon className="size-3 text-muted-foreground/60" />
            </div>
            <div className="flex-1 w-px border-l border-dashed border-border" />
          </div>

          {/* Action panel (right) */}
          <div className={cn(
            "flex-1 rounded-lg p-3 border",
            rule.rule_type === "ignore"
              ? "border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/20"
              : rule.rule_type === "auto_match"
                ? "border-amber-200/60 dark:border-amber-800/40 bg-amber-50/50 dark:bg-amber-950/15"
                : "border-[var(--primary)]/15 bg-[var(--primary)]/[0.03]"
          )}>
            <div className="flex items-center gap-1.5 mb-2">
              <ZapIcon className="size-3 text-muted-foreground/60" />
              <span className="text-[12px] font-semibold uppercase tracking-wider text-muted-foreground/60">
                Gjor
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {rule.rule_type === "ignore" && (
                <span className="inline-flex items-center gap-1 rounded-md bg-slate-200/60 dark:bg-slate-800/60 px-2 py-0.5 text-[13px] font-semibold text-slate-700 dark:text-slate-300">
                  <EyeOffIcon className="size-3" />
                  Marker privat
                </span>
              )}
              {rule.action.category && (
                <span className="inline-flex items-center rounded-md bg-[var(--primary)]/10 px-2 py-0.5 text-[13px] font-semibold text-[var(--primary)]">
                  {categoryLabels[rule.action.category] || rule.action.category}
                </span>
              )}
              {rule.action.account && (
                <span className="inline-flex items-center rounded-md bg-muted px-2 py-0.5 text-[13px] font-mono font-semibold text-foreground/70">
                  Konto {rule.action.account}
                </span>
              )}
              {rule.action.mva_code && (
                <span className="inline-flex items-center rounded-md bg-muted px-2 py-0.5 text-[13px] font-mono text-foreground/70">
                  MVA {rule.action.mva_code}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Footer stats row */}
        <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-border/50">
          <div className="flex items-center gap-3 text-[13px] text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <TrendingUpIcon className="size-3" />
              <span>Brukt {rule.times_applied}x</span>
            </div>
            {rule.last_applied_at && (
              <>
                <span className="text-muted-foreground/30">·</span>
                <span>
                  Sist {new Date(rule.last_applied_at).toLocaleDateString("nb-NO")}
                </span>
              </>
            )}
            {rule.priority !== "medium" && (
              <>
                <span className="text-muted-foreground/30">·</span>
                <PriorityBadge priority={rule.priority} />
              </>
            )}
          </div>
          {effectiveRate !== null && (
            <div className="flex items-center gap-2">
              <div className="h-1.5 w-12 overflow-hidden rounded-full bg-muted/60">
                <div
                  className={cn(
                    "h-full rounded-full transition-all",
                    effectiveRate >= 80 ? "bg-emerald-500" : effectiveRate >= 50 ? "bg-amber-500" : "bg-red-500"
                  )}
                  style={{ width: `${effectiveRate}%` }}
                />
              </div>
              <span className={cn(
                "text-[12px] font-bold tabular-nums",
                effectiveRate >= 80 ? "text-emerald-600 dark:text-emerald-400" : effectiveRate >= 50 ? "text-amber-600" : "text-red-600"
              )}>
                {effectiveRate}%
              </span>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
});

// ============================================================================
// RuleCardSkeleton
// ============================================================================

export function RuleCardSkeleton() {
  return (
    <div className="rounded-xl border bg-card overflow-hidden animate-pulse">
      <div className="h-[2px] w-full bg-muted" />
      <div className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="h-4 w-32 rounded bg-muted" />
              <div className="h-5 w-20 rounded-full bg-muted" />
            </div>
            <div className="h-3 w-48 rounded bg-muted" />
          </div>
          <div className="h-5 w-9 rounded-full bg-muted" />
        </div>
        <div className="flex gap-0 items-stretch">
          <div className="flex-1 h-16 rounded-lg bg-muted/40" />
          <div className="w-8" />
          <div className="flex-1 h-16 rounded-lg bg-muted/30" />
        </div>
        <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-border/50">
          <div className="flex gap-3">
            <div className="h-3 w-16 rounded bg-muted" />
            <div className="h-3 w-20 rounded bg-muted" />
          </div>
          <div className="h-1.5 w-12 rounded-full bg-muted" />
        </div>
      </div>
    </div>
  );
}
