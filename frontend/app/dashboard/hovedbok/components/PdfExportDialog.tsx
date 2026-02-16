import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  FileTextIcon,
  FileDownIcon,
  CheckCircle2Icon,
  Loader2Icon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatNumber } from "../utils";
import { Totals } from "../types";

interface PdfExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dateRangeDisplay: string;
  totals: Totals;
  onDownload: () => void;
  isLoading: boolean;
}

export function PdfExportDialog({
  open,
  onOpenChange,
  dateRangeDisplay,
  totals,
  onDownload,
  isLoading,
}: PdfExportDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileTextIcon className="size-5 text-[var(--primary)]" />
            Eksporter Hovedbok til PDF
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-lg border bg-gradient-to-br from-purple-50 to-white dark:from-purple-950/20 dark:to-background p-6">
            <div className="flex items-start gap-4">
              <div className="flex size-12 items-center justify-center rounded-lg bg-[var(--primary)] text-white">
                <FileDownIcon className="size-6" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-lg">Hovedbok Rapport</h3>
                <p className="text-sm text-muted-foreground mt-1">{dateRangeDisplay}</p>
              </div>
            </div>

            <Separator className="my-4" />

            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="rounded-lg bg-white dark:bg-muted/50 p-3 shadow-sm">
                <p className="text-xs text-muted-foreground">Kontoer</p>
                <p className="text-xl font-bold text-[var(--primary)]">{totals.kontoCount}</p>
              </div>
              <div className="rounded-lg bg-white dark:bg-muted/50 p-3 shadow-sm">
                <p className="text-xs text-muted-foreground">Transaksjoner</p>
                <p className="text-xl font-bold text-[var(--primary)]">{totals.transaksjonCount}</p>
              </div>
              <div className="rounded-lg bg-white dark:bg-muted/50 p-3 shadow-sm">
                <p className="text-xs text-muted-foreground">Differanse</p>
                <p className={cn(
                  "text-xl font-bold",
                  totals.differanse === 0 ? "text-emerald-600" : "text-amber-600"
                )}>
                  {totals.differanse === 0 ? "✓ Balansert" : formatNumber(totals.differanse)}
                </p>
              </div>
            </div>

            <div className="mt-4 p-3 rounded-lg bg-muted/50 text-sm">
              <p className="font-medium mb-2">Rapporten inneholder:</p>
              <ul className="space-y-1 text-muted-foreground">
                <li className="flex items-center gap-2">
                  <CheckCircle2Icon className="size-4 text-emerald-500" />
                  Sammendrag med totaler
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2Icon className="size-4 text-emerald-500" />
                  Kontooversikt gruppert etter klasse
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2Icon className="size-4 text-emerald-500" />
                  IB, Debet, Kredit og UB for hver konto
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2Icon className="size-4 text-emerald-500" />
                  Profesjonell Ciri-formatering
                </li>
              </ul>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Avbryt
            </Button>
            <Button
              onClick={onDownload}
              disabled={isLoading}
              className="gap-2 bg-[var(--primary)] hover:bg-[var(--primary)]/90"
            >
              {isLoading ? (
                <>
                  <Loader2Icon className="size-4 animate-spin" />
                  Genererer...
                </>
              ) : (
                <>
                  <FileDownIcon className="size-4" />
                  Last ned PDF
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
