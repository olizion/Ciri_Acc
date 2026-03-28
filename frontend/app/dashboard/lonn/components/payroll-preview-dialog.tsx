"use client";

import { useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  SendIcon,
  CheckCircle2Icon,
  PlayIcon,
  FileTextIcon,
  SparklesIcon,
  ShieldCheckIcon,
  ClockIcon,
  PencilIcon,
  XIcon,
  Undo2Icon,
  UserMinusIcon,
  UserPlusIcon,
  AlertTriangleIcon,
  BanknoteIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { PayrollRun, PayrollLineItem } from "../types";

// ============================================================================
// TYPES
// ============================================================================

interface EditableLineItem extends PayrollLineItem {
  excluded: boolean;
  grossEdited: boolean;
  originalGross: number;
}

interface PayrollPreviewDialogProps {
  run: PayrollRun;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isAutoMode: boolean;
}

// ============================================================================
// HELPERS
// ============================================================================

function krFmt(n: number) {
  return Math.abs(n).toLocaleString("nb-NO");
}

function recalcItem(item: EditableLineItem, taxRate?: number): EditableLineItem {
  const rate = taxRate ?? (item.originalGross > 0 ? (item.skattetrekk / item.originalGross) : 0.3);
  const skattetrekk = Math.round(item.gross * rate);
  return {
    ...item,
    skattetrekk,
    net: item.gross - skattetrekk,
    arbeidsgiveravgift: Math.round(item.gross * 0.141),
    otp: Math.round(item.gross * 0.02),
    feriepengerAccrual: Math.round(item.gross * 0.12),
  };
}

// ============================================================================
// COMPONENT
// ============================================================================

export function PayrollPreviewDialog({
  run,
  open,
  onOpenChange,
  isAutoMode,
}: PayrollPreviewDialogProps) {
  // Editable state — each line item can be modified
  const [items, setItems] = useState<EditableLineItem[]>(() =>
    run.lineItems.map((li) => ({
      ...li,
      excluded: false,
      grossEdited: false,
      originalGross: li.gross,
    }))
  );

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  // Reset when run changes
  const resetAll = useCallback(() => {
    setItems(
      run.lineItems.map((li) => ({
        ...li,
        excluded: false,
        grossEdited: false,
        originalGross: li.gross,
      }))
    );
    setEditingId(null);
  }, [run]);

  // Computed totals (only from included items)
  const activeItems = useMemo(() => items.filter((i) => !i.excluded), [items]);
  const excludedCount = useMemo(() => items.filter((i) => i.excluded).length, [items]);

  const totals = useMemo(() => {
    const totalGross = activeItems.reduce((a, i) => a + i.gross, 0);
    const totalSkattetrekk = activeItems.reduce((a, i) => a + i.skattetrekk, 0);
    const totalNet = activeItems.reduce((a, i) => a + i.net, 0);
    const totalAga = activeItems.reduce((a, i) => a + i.arbeidsgiveravgift, 0);
    const totalOtp = activeItems.reduce((a, i) => a + i.otp, 0);
    const totalFp = activeItems.reduce((a, i) => a + i.feriepengerAccrual, 0);
    return {
      totalGross,
      totalSkattetrekk,
      totalNet,
      totalAga,
      totalOtp,
      totalFp,
      totalCost: totalGross + totalAga + totalOtp + totalFp,
    };
  }, [activeItems]);

  const hasChanges = useMemo(
    () => items.some((i) => i.excluded || i.grossEdited),
    [items]
  );

  const changeCount = useMemo(
    () => items.filter((i) => i.excluded || i.grossEdited).length,
    [items]
  );

  // ── Handlers ──

  const handleExclude = (id: string) => {
    setItems((prev) =>
      prev.map((i) => (i.employeeId === id ? { ...i, excluded: !i.excluded } : i))
    );
  };

  const startEdit = (item: EditableLineItem) => {
    setEditingId(item.employeeId);
    setEditValue(String(item.gross));
  };

  const commitEdit = (id: string) => {
    const parsed = parseInt(editValue.replace(/\s/g, ""), 10);
    if (!isNaN(parsed) && parsed >= 0) {
      setItems((prev) =>
        prev.map((i) => {
          if (i.employeeId !== id) return i;
          const updated = {
            ...i,
            gross: parsed,
            grossEdited: parsed !== i.originalGross,
          };
          return recalcItem(updated);
        })
      );
    }
    setEditingId(null);
  };

  const revertItem = (id: string) => {
    setItems((prev) =>
      prev.map((i) => {
        if (i.employeeId !== id) return i;
        const reverted = { ...i, gross: i.originalGross, grossEdited: false, excluded: false };
        return recalcItem(reverted);
      })
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileTextIcon className="size-5" />
            Lønnskjøring — {run.month}
          </DialogTitle>
          <DialogDescription>
            Utbetalingsdato{" "}
            {new Date(run.date).toLocaleDateString("nb-NO", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}{" "}
            · {activeItems.length} ansatte
            {excludedCount > 0 && (
              <span className="text-amber-600 dark:text-amber-400">
                {" "}
                · {excludedCount} utelatt
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh]">
          <div className="space-y-5 pr-4">
            {/* Auto-mode scheduled banner */}
            {isAutoMode && !hasChanges && (
              <div className="flex items-center gap-3 rounded-lg border-2 border-[var(--primary)]/30 bg-[var(--primary)]/5 p-3">
                <div className="flex size-9 items-center justify-center rounded-full bg-[var(--primary)]/20">
                  <ClockIcon className="size-4 text-[var(--primary)]" />
                </div>
                <div>
                  <p className="text-sm font-medium text-[var(--primary)]">
                    Automatisk utbetaling planlagt
                  </p>
                  <p className="text-[13px] text-muted-foreground">
                    Ciri utbetaler{" "}
                    <span className="font-medium">
                      {new Date(run.date).toLocaleDateString("nb-NO", {
                        day: "numeric",
                        month: "long",
                      })}
                    </span>{" "}
                    og sender A-melding innen den 5. neste måned.
                  </p>
                </div>
              </div>
            )}

            {/* Changes warning banner */}
            {hasChanges && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                className="flex items-center gap-3 rounded-lg border border-amber-300/50 bg-amber-50 dark:bg-amber-950/20 p-3"
              >
                <AlertTriangleIcon className="size-4 text-amber-600 shrink-0" />
                <p className="text-[13px] text-amber-700 dark:text-amber-400 flex-1">
                  {changeCount} endring{changeCount > 1 ? "er" : ""} gjort.
                  Beløpene oppdateres automatisk.
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 text-xs gap-1 text-amber-700 dark:text-amber-400 hover:text-amber-900"
                  onClick={resetAll}
                >
                  <Undo2Icon className="size-3" />
                  Tilbakestill alt
                </Button>
              </motion.div>
            )}

            {/* Employee line items (editable) */}
            <div className="rounded-lg border overflow-hidden">
              <div className="grid grid-cols-[1fr_110px_100px_100px_36px] gap-3 px-4 py-2 bg-muted/30 text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
                <span>Ansatt</span>
                <span className="text-right">Brutto</span>
                <span className="text-right">Skattetrekk</span>
                <span className="text-right">Netto</span>
                <span />
              </div>
              <div className="divide-y divide-border/50">
                {items.map((item) => {
                  const isEditing = editingId === item.employeeId;
                  const isModified = item.grossEdited || item.excluded;

                  return (
                    <div
                      key={item.employeeId}
                      className={cn(
                        "group grid grid-cols-[1fr_110px_100px_100px_36px] gap-3 px-4 py-2.5 transition-colors",
                        item.excluded && "bg-muted/40 opacity-50",
                        item.grossEdited &&
                          !item.excluded &&
                          "bg-amber-50/50 dark:bg-amber-950/10"
                      )}
                    >
                      {/* Name */}
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className={cn(
                            "text-[13px] font-medium truncate",
                            item.excluded && "line-through"
                          )}
                        >
                          {item.employeeName}
                        </span>
                        {item.grossEdited && !item.excluded && (
                          <Badge
                            variant="outline"
                            className="text-[10px] h-4 px-1 border-amber-300 text-amber-700 dark:text-amber-400 shrink-0"
                          >
                            Endret
                          </Badge>
                        )}
                        {item.excluded && (
                          <Badge
                            variant="outline"
                            className="text-[10px] h-4 px-1 border-muted-foreground/30 shrink-0"
                          >
                            Utelatt
                          </Badge>
                        )}
                      </div>

                      {/* Gross (editable) */}
                      <div className="flex items-center justify-end">
                        {isEditing ? (
                          <Input
                            autoFocus
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onBlur={() => commitEdit(item.employeeId)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") commitEdit(item.employeeId);
                              if (e.key === "Escape") setEditingId(null);
                            }}
                            className="h-7 w-[100px] text-right text-[13px] tabular-nums font-medium px-2"
                          />
                        ) : (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <button
                                  onClick={() => !item.excluded && startEdit(item)}
                                  disabled={item.excluded}
                                  className={cn(
                                    "text-[13px] tabular-nums text-right font-medium transition-colors rounded px-1.5 py-0.5 -mr-1.5",
                                    !item.excluded &&
                                      "hover:bg-[var(--primary)]/10 hover:text-[var(--primary)] cursor-pointer",
                                    item.grossEdited && "text-amber-700 dark:text-amber-400"
                                  )}
                                >
                                  {krFmt(item.gross)}
                                  {!item.excluded && (
                                    <PencilIcon className="inline size-2.5 ml-1 opacity-0 group-hover:opacity-40 transition-opacity" />
                                  )}
                                </button>
                              </TooltipTrigger>
                              {!item.excluded && (
                                <TooltipContent side="top" className="text-xs">
                                  Klikk for å endre bruttobeløp
                                </TooltipContent>
                              )}
                            </Tooltip>
                          </TooltipProvider>
                        )}
                      </div>

                      {/* Tax */}
                      <span
                        className={cn(
                          "text-[13px] tabular-nums text-right text-red-600 dark:text-red-400 self-center",
                          item.excluded && "text-muted-foreground"
                        )}
                      >
                        -{krFmt(item.skattetrekk)}
                      </span>

                      {/* Net */}
                      <span className="text-[13px] tabular-nums text-right font-medium self-center">
                        {krFmt(item.net)}
                      </span>

                      {/* Actions */}
                      <div className="flex items-center justify-center">
                        {isModified ? (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <button
                                  onClick={() => revertItem(item.employeeId)}
                                  className="flex size-6 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                                >
                                  <Undo2Icon className="size-3" />
                                </button>
                              </TooltipTrigger>
                              <TooltipContent side="left" className="text-xs">
                                Tilbakestill
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        ) : (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <button
                                  onClick={() => handleExclude(item.employeeId)}
                                  className="flex size-6 items-center justify-center rounded-md text-muted-foreground/40 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-950/30 transition-colors opacity-0 group-hover:opacity-100"
                                >
                                  <UserMinusIcon className="size-3" />
                                </button>
                              </TooltipTrigger>
                              <TooltipContent side="left" className="text-xs">
                                Utelat fra denne kjøringen
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Totals row */}
              <div className="grid grid-cols-[1fr_110px_100px_100px_36px] gap-3 px-4 py-2.5 border-t bg-muted/20">
                <span className="text-[13px] font-semibold">Sum</span>
                <span className="text-[13px] font-semibold tabular-nums text-right">
                  {krFmt(totals.totalGross)}
                </span>
                <span className="text-[13px] font-semibold tabular-nums text-right text-red-600 dark:text-red-400">
                  -{krFmt(totals.totalSkattetrekk)}
                </span>
                <span className="text-[13px] font-display font-bold tabular-nums text-right">
                  {krFmt(totals.totalNet)}
                </span>
                <span />
              </div>
            </div>

            <Separator />

            {/* Employer costs */}
            <div className="space-y-3">
              <h3 className="text-sm font-medium">Arbeidsgiver&shy;kostnader</h3>
              <div className="rounded-lg border bg-muted/20 p-4 space-y-2.5">
                <div className="flex items-center justify-between text-[13px]">
                  <span className="text-muted-foreground">Arbeidsgiveravgift (14,1%)</span>
                  <span className="font-display font-medium tabular-nums">
                    kr {krFmt(totals.totalAga)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[13px]">
                  <span className="text-muted-foreground">OTP (2%)</span>
                  <span className="font-display font-medium tabular-nums">
                    kr {krFmt(totals.totalOtp)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[13px]">
                  <span className="text-muted-foreground">Feriepenger (12%)</span>
                  <span className="font-display font-medium tabular-nums">
                    kr {krFmt(totals.totalFp)}
                  </span>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Total kostnad</span>
                  <span className="font-display text-lg font-bold text-[var(--primary)] tabular-nums">
                    kr {krFmt(totals.totalCost)}
                  </span>
                </div>
              </div>
            </div>

            {/* Validation */}
            <div className="flex items-center gap-3 rounded-lg border border-emerald-200 dark:border-emerald-800/40 bg-emerald-50 dark:bg-emerald-950/20 p-3">
              <ShieldCheckIcon className="size-4 text-emerald-600 shrink-0" />
              <p className="text-[12px] text-emerald-700 dark:text-emerald-400">
                Alle skattekort er oppdatert og validert mot Skatteetaten.
                {hasChanges
                  ? " Endrede beløp er omberegnet med gjeldende satser."
                  : " Beregningen er klar for utbetaling."}
              </p>
            </div>

            {/* Ciri note */}
            <div className="flex gap-3 rounded-lg border border-[var(--primary)]/20 bg-[var(--primary)]/5 p-3">
              <SparklesIcon className="mt-0.5 size-4 shrink-0 text-[var(--primary)]" />
              <div className="text-[13px]">
                <p className="font-medium text-[var(--primary)]">
                  Ciri&apos;s kommentar
                </p>
                <p className="mt-0.5 text-muted-foreground leading-relaxed">
                  Lønnskjøring for {run.month.toLowerCase()} ser korrekt ut.
                  A-melding genereres automatisk etter utbetaling og sendes til
                  Skatteetaten innen den 5. neste måned.
                </p>
              </div>
            </div>
          </div>
        </ScrollArea>

        {/* Footer actions */}
        <div className="flex gap-3 pt-3">
          {hasChanges && (
            <Button
              variant="ghost"
              size="sm"
              className="gap-1.5 text-muted-foreground"
              onClick={resetAll}
            >
              <Undo2Icon className="size-3.5" />
              Tilbakestill
            </Button>
          )}
          <div className="flex-1" />
          {isAutoMode && !hasChanges ? (
            <div className="flex items-center gap-2 rounded-md bg-muted/50 px-4 py-2 text-sm text-muted-foreground">
              <CheckCircle2Icon className="size-4 text-emerald-600" />
              <span>
                Utbetales{" "}
                {new Date(run.date).toLocaleDateString("nb-NO", {
                  day: "numeric",
                  month: "short",
                })}
              </span>
            </div>
          ) : (
            <Button className="gap-2">
              <PlayIcon className="size-4" />
              {hasChanges ? "Kjør med endringer" : "Kjør lønn"}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
