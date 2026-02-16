"use client";

import { memo } from "react";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { TableRow, TableCell } from "@/components/ui/table";
import {
  MoreHorizontalIcon,
  PencilIcon,
  TrashIcon,
  SparklesIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Rule } from "../types";
import { RuleTypeBadge, PriorityBadge } from "./badges";

interface RuleCompactRowProps {
  rule: Rule;
  onEdit: () => void;
  onDelete: () => void;
  onToggle: () => void;
  onDetail: () => void;
  isToggling: boolean;
}

export const RuleCompactRow = memo(function RuleCompactRow({
  rule,
  onEdit,
  onDelete,
  onToggle,
  onDetail,
  isToggling,
}: RuleCompactRowProps) {
  return (
    <TableRow
      className="group cursor-pointer hover:bg-muted/30 transition-colors"
      onClick={onDetail}
    >
      {/* Name */}
      <TableCell className="py-2 px-3">
        <div className="flex items-center gap-1.5 min-w-0">
          {rule.learned_from_user && (
            <SparklesIcon className="size-3 text-[var(--primary)] shrink-0" />
          )}
          <span className="text-[13px] font-medium truncate">{rule.name}</span>
        </div>
      </TableCell>

      {/* Type */}
      <TableCell className="py-2 px-3">
        <RuleTypeBadge type={rule.rule_type} />
      </TableCell>

      {/* Priority */}
      <TableCell className="py-2 px-3">
        <PriorityBadge priority={rule.priority} />
      </TableCell>

      {/* Active */}
      <TableCell className="py-2 px-3" onClick={(e) => e.stopPropagation()}>
        <Switch
          checked={rule.is_active}
          onCheckedChange={onToggle}
          disabled={isToggling}
          aria-label="Aktiver regel"
        />
      </TableCell>

      {/* Times applied */}
      <TableCell className="py-2 px-3 text-right">
        <span className="text-[13px] tabular-nums text-muted-foreground">
          {rule.times_applied}x
        </span>
      </TableCell>

      {/* Last applied */}
      <TableCell className="py-2 px-3">
        <span className="text-[12px] text-muted-foreground">
          {rule.last_applied_at
            ? new Date(rule.last_applied_at).toLocaleDateString("nb-NO")
            : "—"}
        </span>
      </TableCell>

      {/* Actions */}
      <TableCell className="py-2 px-3" onClick={(e) => e.stopPropagation()}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                "size-7 opacity-0 group-hover:opacity-100 transition-opacity"
              )}
            >
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
      </TableCell>
    </TableRow>
  );
});
