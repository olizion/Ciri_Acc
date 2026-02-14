"use client";

import { Badge } from "@/components/ui/badge";
import {
  TagIcon,
  ZapIcon,
  EyeOffIcon,
  SettingsIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { RuleType, RulePriority } from "../types";

// ============================================================================
// RuleTypeBadge
// ============================================================================

const ruleTypeConfigs = {
  auto_category: {
    icon: TagIcon,
    label: "Kategoriser",
    color: "text-blue-700 dark:text-blue-400",
    bg: "bg-blue-50 dark:bg-blue-950/30",
    border: "border-blue-200 dark:border-blue-800",
  },
  auto_match: {
    icon: ZapIcon,
    label: "Auto-match",
    color: "text-amber-700 dark:text-amber-400",
    bg: "bg-amber-50 dark:bg-amber-950/30",
    border: "border-amber-200 dark:border-amber-800",
  },
  ignore: {
    icon: EyeOffIcon,
    label: "Ignorer",
    color: "text-slate-700 dark:text-slate-400",
    bg: "bg-slate-50 dark:bg-slate-950/30",
    border: "border-slate-200 dark:border-slate-700",
  },
  split: {
    icon: SettingsIcon,
    label: "Splitt",
    color: "text-amber-700 dark:text-amber-400",
    bg: "bg-amber-50 dark:bg-amber-950/30",
    border: "border-amber-200 dark:border-amber-800",
  },
};

interface RuleTypeBadgeProps {
  type: RuleType;
}

export function RuleTypeBadge({ type }: RuleTypeBadgeProps) {
  const c = ruleTypeConfigs[type] ?? ruleTypeConfigs.auto_category;
  const Icon = c.icon;

  return (
    <Badge
      variant="outline"
      className={cn("font-normal gap-1.5", c.color, c.bg, c.border)}
    >
      <Icon className="size-3.5" />
      <span>{c.label}</span>
    </Badge>
  );
}

// ============================================================================
// PriorityBadge
// ============================================================================

const priorityConfigs = {
  high: {
    label: "Hoy",
    color: "text-red-600",
    bg: "bg-red-50 dark:bg-red-950/30",
  },
  medium: {
    label: "Medium",
    color: "text-amber-600",
    bg: "bg-amber-50 dark:bg-amber-950/30",
  },
  low: {
    label: "Lav",
    color: "text-slate-600",
    bg: "bg-slate-50 dark:bg-slate-950/30",
  },
};

interface PriorityBadgeProps {
  priority: RulePriority;
}

export function PriorityBadge({ priority }: PriorityBadgeProps) {
  const c = priorityConfigs[priority] ?? priorityConfigs.medium;

  return (
    <Badge variant="secondary" className={cn("text-xs font-normal", c.color, c.bg)}>
      {c.label}
    </Badge>
  );
}
