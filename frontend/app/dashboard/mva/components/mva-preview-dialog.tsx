"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  SendIcon,
  CheckCircle2Icon,
  DownloadIcon,
  FileTextIcon,
  SparklesIcon,
  ShieldCheckIcon,
  ArrowRightIcon,
  LoaderIcon,
} from "lucide-react";
import type { MVAPDFData } from "@/components/mva/mva-pdf-document";
import { mvaDetails } from "../constants";
import { incomeData } from "../data/income-data";
import { expenseData } from "../data/expense-data";

const generateMVAPDF = async (data: MVAPDFData): Promise<void> => {
  const { generateMVAPDF: gen } = await import("@/lib/mva-pdf-generator");
  return gen(data);
};

interface MVAPreviewDialogProps {
  isAutoMode?: boolean;
}

export function MVAPreviewDialog({ isAutoMode = false }: MVAPreviewDialogProps) {
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  const handleDownloadPDF = useCallback(async () => {
    setIsGeneratingPDF(true);
    try {
      const pdfData: MVAPDFData = {
        termin: mvaDetails.termin,
        period: mvaDetails.period,
        deadline: mvaDetails.deadline,
        bilagCount: mvaDetails.bilagCount,
        lines: mvaDetails.lines,
        summary: mvaDetails.summary,
        incomeData: incomeData,
        expenseData: expenseData.map((e) => ({
          id: e.id,
          date: e.date,
          description: e.description,
          vendor: e.vendor,
          bilagNo: e.bilagNo,
          amount: e.amount,
          mvaRate: e.mvaRate,
          mva: e.mva,
          mvaCode: e.mvaCode,
        })),
        company: {
          name: "Demo Konsulent AS",
          orgNo: "123 456 789",
          address: "Storgata 1, 0123 Oslo",
        },
        generatedAt: new Date(),
      };

      await generateMVAPDF(pdfData);
    } catch (error) {
      console.error("Error generating PDF:", error);
    } finally {
      setIsGeneratingPDF(false);
    }
  }, []);

  return (
    <DialogContent className="max-w-2xl">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <FileTextIcon className="size-5" />
          MVA-oppgave {mvaDetails.termin}
        </DialogTitle>
        <DialogDescription>
          {mvaDetails.period} &bull; Frist: {mvaDetails.deadline}
        </DialogDescription>
      </DialogHeader>

      <ScrollArea className="max-h-[60vh]">
        <div className="space-y-6 pr-4">
          {/* Auto-mode scheduled banner */}
          {isAutoMode && (
            <div className="flex items-center gap-3 rounded-lg border-2 border-[var(--primary)]/30 bg-[var(--primary)]/5 p-4">
              <div className="flex size-10 items-center justify-center rounded-full bg-[var(--primary)]/20">
                <SendIcon className="size-5 text-[var(--primary)]" />
              </div>
              <div>
                <p className="font-medium text-[var(--primary)]">Automatisk innsending planlagt</p>
                <p className="text-sm text-muted-foreground">
                  Ciri sender denne meldingen til Altinn <span className="font-medium">8. februar 2026</span>
                </p>
              </div>
            </div>
          )}

          {/* Validation Status */}
          <div className="flex items-center gap-3 rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-900/30 dark:bg-green-900/20">
            <div className="flex size-10 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
              <ShieldCheckIcon className="size-5 text-green-600" />
            </div>
            <div>
              <p className="font-medium text-green-800 dark:text-green-200">Validering bestått</p>
              <p className="text-sm text-green-600 dark:text-green-400">
                Alle {mvaDetails.bilagCount} bilag er korrekt kategorisert og validert mot SAF-T
              </p>
            </div>
          </div>

          {/* MVA Lines */}
          <div className="space-y-3">
            <h3 className="font-medium">MVA-poster</h3>
            <div className="rounded-lg border">
              <div className="grid grid-cols-4 gap-4 border-b bg-muted/50 px-4 py-2 text-xs font-medium text-muted-foreground">
                <div>Kode</div>
                <div>Beskrivelse</div>
                <div className="text-right">Grunnlag</div>
                <div className="text-right">MVA</div>
              </div>
              {mvaDetails.lines.map((line) => (
                <div key={line.code} className="grid grid-cols-4 gap-4 border-b px-4 py-3 last:border-0">
                  <div className="font-mono text-sm">{line.code}</div>
                  <div className="text-sm">{line.description}</div>
                  <div className="text-right font-display text-sm">
                    kr {line.grunnlag.toLocaleString("nb-NO")}
                  </div>
                  <div className="text-right font-display text-sm font-medium">
                    kr {line.mva.toLocaleString("nb-NO")}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <Separator />

          {/* Summary */}
          <div className="space-y-3">
            <h3 className="font-medium">Oppsummering</h3>
            <div className="rounded-lg border bg-muted/30 p-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Utgående MVA (du skylder)</span>
                  <span className="font-display font-medium">
                    kr {mvaDetails.summary.utgaende.toLocaleString("nb-NO")}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Inngående MVA (fradrag)</span>
                  <span className="font-display font-medium text-green-600">
                    - kr {mvaDetails.summary.inngaende.toLocaleString("nb-NO")}
                  </span>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <span className="font-medium">Netto MVA å betale</span>
                  <span className="font-display text-xl font-bold text-[var(--primary)]">
                    kr {mvaDetails.summary.tilBetaling.toLocaleString("nb-NO")}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Ciri Note */}
          <div className="flex gap-3 rounded-lg border border-[var(--primary)]/20 bg-[var(--primary)]/5 p-4">
            <SparklesIcon className="mt-0.5 size-5 shrink-0 text-[var(--primary)]" />
            <div className="text-sm">
              <p className="font-medium text-[var(--primary)]">Ciri&apos;s kommentar</p>
              <p className="mt-1 text-muted-foreground">
                MVA-beløpet er 8% lavere enn forrige termin, hovedsakelig på grunn av
                økte fradragsberettigede kostnader i desember. Alt ser korrekt ut.
              </p>
            </div>
          </div>
        </div>
      </ScrollArea>

      <div className="flex gap-3 pt-4">
        <Button
          variant="outline"
          className="flex-1 gap-2"
          onClick={handleDownloadPDF}
          disabled={isGeneratingPDF}
        >
          {isGeneratingPDF ? (
            <>
              <LoaderIcon className="size-4 animate-spin" />
              Genererer...
            </>
          ) : (
            <>
              <DownloadIcon className="size-4" />
              Last ned PDF
            </>
          )}
        </Button>
        {isAutoMode ? (
          <div className="flex flex-1 items-center justify-center gap-2 rounded-md bg-muted/50 px-4 py-2 text-sm text-muted-foreground">
            <CheckCircle2Icon className="size-4 text-green-600" />
            <span>Sendes automatisk 8. feb</span>
          </div>
        ) : (
          <Button className="flex-1 gap-2">
            <SendIcon className="size-4" />
            Send til Altinn
            <ArrowRightIcon className="size-4" />
          </Button>
        )}
      </div>
    </DialogContent>
  );
}
