"use client";

import { useState, useCallback, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import {
  ReceiptIcon,
  UploadIcon,
  CheckCircle2Icon,
  ShieldCheckIcon,
  FileIcon,
  XIcon,
  AlertTriangleIcon,
  SparklesIcon,
  ImageIcon,
  FileTextIcon,
} from "lucide-react";
import CiriLogo from "@/components/layout/ciri-logo";
import type { MissingBilag, BilagAction } from "../types";

function getFileIcon(fileName: string) {
  const ext = fileName.split(".").pop()?.toLowerCase();
  if (ext === "pdf") return FileTextIcon;
  if (["jpg", "jpeg", "png", "webp"].includes(ext || "")) return ImageIcon;
  return FileIcon;
}

export interface ManglendeBilagDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: MissingBilag[];
  actions: Record<string, BilagAction>;
  onAction: (id: string, action: BilagAction) => void;
}

function TransactionRow({
  item,
  action,
  onUpload,
  onApprove,
  onClear,
}: {
  item: MissingBilag;
  action: BilagAction;
  onUpload: (file: File) => void;
  onApprove: () => void;
  onClear: () => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) onUpload(file);
    },
    [onUpload]
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) onUpload(file);
    },
    [onUpload]
  );

  const isResolved = action.type !== "none";

  return (
    <div
      className={cn(
        "group relative rounded-xl border p-4 transition-colors",
        isResolved
          ? "border-emerald-200 bg-emerald-50/50 dark:border-emerald-800/50 dark:bg-emerald-950/20"
          : isDragOver
            ? "border-[var(--primary)] bg-[var(--primary)]/5 ring-2 ring-[var(--primary)]/20"
            : item.status === "missing"
              ? "border-red-200/60 bg-red-50/30 dark:border-red-900/30 dark:bg-red-950/10"
              : "border-amber-200/60 bg-amber-50/30 dark:border-amber-900/30 dark:bg-amber-950/10"
      )}
      onDragOver={(e) => {
        e.preventDefault();
        if (!isResolved) setIsDragOver(true);
      }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={isResolved ? undefined : handleDrop}
    >
      {/* Drag overlay */}
      <AnimatePresence>
        {isDragOver && !isResolved && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-10 flex items-center justify-center rounded-xl border-2 border-dashed border-[var(--primary)] bg-[var(--primary)]/10 backdrop-blur-[2px]"
          >
            <div className="flex items-center gap-2 text-[var(--primary)] font-medium">
              <UploadIcon className="size-5" />
              Slipp filen her
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex items-start gap-3">
        <div
          className={cn(
            "flex size-9 shrink-0 items-center justify-center rounded-lg",
            isResolved
              ? "bg-emerald-100 dark:bg-emerald-900/40"
              : item.status === "missing"
                ? "bg-red-100 dark:bg-red-900/30"
                : "bg-amber-100 dark:bg-amber-900/30"
          )}
        >
          {isResolved ? (
            <CheckCircle2Icon className="size-5 text-emerald-600 dark:text-emerald-400" />
          ) : (
            <ReceiptIcon
              className={cn(
                "size-4",
                item.status === "missing"
                  ? "text-red-600 dark:text-red-400"
                  : "text-amber-600 dark:text-amber-400"
              )}
            />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className={cn("font-medium text-sm truncate", isResolved && "text-muted-foreground line-through decoration-emerald-400/50")}>
              {item.description}
            </p>
            {item.status === "needs_review" && !isResolved && (
              <Badge
                variant="outline"
                className="shrink-0 text-[12px] border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-400"
              >
                Gjennomgang
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-3 mt-0.5">
            <span className="text-xs text-muted-foreground">
              {new Date(item.date).toLocaleDateString("nb-NO", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </span>
            <span className="text-xs text-muted-foreground">
              Konto {item.bankAccount}
            </span>
          </div>

          {action.type === "uploaded" && (
            <div className="mt-2 flex items-center gap-2 text-xs text-emerald-700 dark:text-emerald-400">
              {(() => {
                const Icon = getFileIcon(action.fileName);
                return <Icon className="size-3.5" />;
              })()}
              <span className="truncate">{action.fileName}</span>
            </div>
          )}
          {action.type === "approved" && (
            <div className="mt-2 flex items-center gap-2 text-xs text-emerald-700 dark:text-emerald-400">
              <ShieldCheckIcon className="size-3.5" />
              <span>Manuelt godkjent — du er ansvarlig</span>
            </div>
          )}
        </div>

        <p className="font-medium tabular-nums text-sm shrink-0">
          kr {Math.abs(item.amount).toLocaleString("nb-NO")}
        </p>
      </div>

      {!isResolved && (
        <div className="mt-3 flex items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.jpg,.jpeg,.png,.webp"
            className="hidden"
            onChange={handleFileSelect}
          />
          <Button
            size="sm"
            variant="outline"
            className="flex-1 h-8 text-xs gap-1.5 border-dashed hover:border-[var(--primary)] hover:text-[var(--primary)] hover:bg-[var(--primary)]/5"
            onClick={() => fileInputRef.current?.click()}
          >
            <UploadIcon className="size-3.5" />
            Last opp bilag
          </Button>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 text-xs gap-1.5 text-muted-foreground hover:text-amber-700 hover:bg-amber-50 dark:hover:text-amber-400 dark:hover:bg-amber-950/30"
                  onClick={onApprove}
                >
                  <ShieldCheckIcon className="size-3.5" />
                  Godkjenn uten bilag
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-[240px]">
                <p className="text-xs">
                  Du tar ansvar for denne transaksjonen. Ciri bokfører den uten
                  bilag.
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      )}

      {isResolved && (
        <div className="mt-2 flex justify-end">
          <Button
            size="sm"
            variant="ghost"
            className="h-6 text-[13px] text-muted-foreground hover:text-foreground px-2"
            onClick={onClear}
          >
            <XIcon className="size-3 mr-1" />
            Angre
          </Button>
        </div>
      )}
    </div>
  );
}

export function ManglendeBilagDialog({
  open,
  onOpenChange,
  items,
  actions,
  onAction,
}: ManglendeBilagDialogProps) {
  const unresolvedItems = items.filter(
    (item) => (actions[item.id]?.type ?? "none") === "none"
  );
  const resolvedItems = items.filter(
    (item) => (actions[item.id]?.type ?? "none") !== "none"
  );
  const resolvedCount = resolvedItems.length;
  const totalCount = items.length;
  const allResolved = resolvedCount === totalCount;

  const handleConfirm = useCallback(() => {
    onOpenChange(false);
  }, [onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] !flex !flex-col !gap-0 !p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-4 shrink-0">
          <DialogTitle className="flex items-center gap-2.5 font-display">
            <div className="flex size-9 items-center justify-center rounded-lg bg-red-100 dark:bg-red-900/30">
              <ReceiptIcon className="size-5 text-red-600 dark:text-red-400" />
            </div>
            Manglende bilag
          </DialogTitle>
          <DialogDescription>
            Last opp bilag for transaksjonene, eller godkjenn dem manuelt.
            Manuelt godkjente transaksjoner bokføres uten bilag — du er
            ansvarlig.
          </DialogDescription>
        </DialogHeader>

        {/* Progress bar */}
        <div className="px-6 pb-4 shrink-0">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
            <span>
              {resolvedCount} av {totalCount} løst
            </span>
            {resolvedCount > 0 && !allResolved && (
              <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                {totalCount - resolvedCount} gjenstår
              </span>
            )}
            {allResolved && (
              <span className="text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                <CheckCircle2Icon className="size-3" />
                Alle løst
              </span>
            )}
          </div>
          <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400"
              initial={{ width: 0 }}
              animate={{
                width: `${totalCount > 0 ? (resolvedCount / totalCount) * 100 : 0}%`,
              }}
              transition={{ type: "spring", stiffness: 100, damping: 20 }}
            />
          </div>
        </div>

        <Separator className="shrink-0" />

        {/* Transaction list */}
        <div className="flex-1 min-h-0 overflow-y-auto">
          <div className="p-6 space-y-3">
            {unresolvedItems.map((item) => (
              <TransactionRow
                key={item.id}
                item={item}
                action={actions[item.id] ?? { type: "none" }}
                onUpload={(file) =>
                  onAction(item.id, { type: "uploaded", fileName: file.name })
                }
                onApprove={() => onAction(item.id, { type: "approved" })}
                onClear={() => onAction(item.id, { type: "none" })}
              />
            ))}

            {resolvedItems.length > 0 && unresolvedItems.length > 0 && (
              <div className="flex items-center gap-3 py-2">
                <Separator className="flex-1" />
                <span className="text-xs text-muted-foreground shrink-0">
                  Løst ({resolvedCount})
                </span>
                <Separator className="flex-1" />
              </div>
            )}
            {resolvedItems.map((item) => (
              <TransactionRow
                key={item.id}
                item={item}
                action={actions[item.id] ?? { type: "none" }}
                onUpload={(file) =>
                  onAction(item.id, { type: "uploaded", fileName: file.name })
                }
                onApprove={() => onAction(item.id, { type: "approved" })}
                onClear={() => onAction(item.id, { type: "none" })}
              />
            ))}
          </div>
        </div>

        <Separator className="shrink-0" />

        {/* Footer */}
        <div className="px-6 py-4 shrink-0">
          {resolvedItems.some((i) => actions[i.id]?.type === "approved") && (
            <div className="flex items-start gap-2.5 rounded-lg border border-amber-200 bg-amber-50/80 dark:border-amber-900/50 dark:bg-amber-950/30 p-3 mb-4">
              <AlertTriangleIcon className="size-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
              <div className="text-xs text-amber-800 dark:text-amber-300">
                <p className="font-medium">
                  {resolvedItems.filter((i) => actions[i.id]?.type === "approved").length}{" "}
                  transaksjon(er) godkjennes uten bilag
                </p>
                <p className="mt-0.5 text-amber-700/80 dark:text-amber-400/70">
                  Du overtar revisjonsansvaret for disse. Ciri bokfører dem som
                  godkjent.
                </p>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-2">
            <div className="flex items-center gap-2 mr-auto">
              <CiriLogo size="sm" />
              <span className="text-xs text-muted-foreground">
                {allResolved
                  ? "Klar til å bokføre alle transaksjoner"
                  : "Løs alle transaksjoner for å fortsette"}
              </span>
            </div>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Avbryt
            </Button>
            <Button
              disabled={resolvedCount === 0}
              onClick={handleConfirm}
              className={cn(
                "gap-2",
                allResolved &&
                  "bg-emerald-600 hover:bg-emerald-700 text-white"
              )}
            >
              <SparklesIcon className="size-4" />
              {allResolved
                ? "Bekreft og bokfør"
                : `Bekreft ${resolvedCount} av ${totalCount}`}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
