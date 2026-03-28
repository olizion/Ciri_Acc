"use client";

import { useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  TrendingUpIcon,
  FileTextIcon,
  SparklesIcon,
  PencilIcon,
  ChevronUpIcon,
  ChevronDownIcon,
} from "lucide-react";
import dynamic from "next/dynamic";
import {
  type OriginalPosting,
  type CorrectionInput,
  type CorrectionPreview,
  generateAuditLogEntry,
  CORRECTION_REASONS,
} from "@/lib/ciri-postering-verification";
import { addRevisionEntry, createCorrectionRevisionEntry } from "@/lib/bilag-store";
import { API_BASE_URL } from "@/lib/api";
import { toast } from "sonner";
import { incomeData } from "../data/income-data";
import type { IncomeItem } from "../types";

const PosteringCorrectionDialog = dynamic(
  () => import("@/components/postering-correction-dialog").then((m) => ({ default: m.PosteringCorrectionDialog })),
  { ssr: false }
);

export function IncomeDetailsCard() {
  const [isOpen, setIsOpen] = useState(true);
  const [selectedIncome, setSelectedIncome] = useState<IncomeItem | null>(null);
  const [correctionDialogOpen, setCorrectionDialogOpen] = useState(false);
  const [postingToCorrect, setPostingToCorrect] = useState<OriginalPosting | null>(null);

  const totalIncome = incomeData.reduce((acc, item) => acc + item.amount, 0);
  const totalMva = incomeData.reduce((acc, item) => acc + item.mva, 0);

  const handleOpenCorrection = useCallback((income: IncomeItem) => {
    const posting: OriginalPosting = {
      id: income.id,
      bilagNo: income.invoiceNo,
      date: income.date,
      description: income.description,
      vendor: income.customer,
      accountCode: "3000",
      accountName: "Salgsinntekt",
      amount: income.amount,
      mvaRate: income.mvaRate,
      mva: income.mva,
      category: "Tjenester",
      bilagTotal: income.amount + income.mva,
    };
    setPostingToCorrect(posting);
    setSelectedIncome(null);
    setCorrectionDialogOpen(true);
  }, []);

  const handleCorrectionComplete = useCallback(async (correction: CorrectionInput, preview: CorrectionPreview) => {
    if (!postingToCorrect) return;

    const reason = CORRECTION_REASONS.find((r) => r.id === correction.reasonId);
    const reasonLabel = reason?.label || "Annen årsak";

    // Persist correction to backend (creates reversering + new posteringer, updates bilag MVA)
    const bilagId = postingToCorrect.id;
    try {
      const res = await fetch(`${API_BASE_URL}/api/bilag/${bilagId}/correct`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          new_amount: correction.newAmount + correction.newMva,
          new_mva_amount: correction.newMva,
          new_mva_code: null,
          new_account_number: correction.newAccountCode,
          reason: correction.reasonText || reasonLabel,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: "Ukjent feil" }));
        console.warn("Backend correction failed:", err.detail);
      }
    } catch (e) {
      console.warn("Could not persist correction to backend:", e);
    }

    // Also store locally for audit trail UI
    const revisionEntry = createCorrectionRevisionEntry(
      {
        bilagNo: postingToCorrect.bilagNo,
        amount: postingToCorrect.amount,
        mva: postingToCorrect.mva,
        accountCode: postingToCorrect.accountCode,
      },
      {
        newAmount: correction.newAmount,
        newMva: correction.newMva,
        newAccountCode: correction.newAccountCode,
        reasonLabel,
        reasonText: correction.reasonText,
      },
      preview.crossReferences
    );
    addRevisionEntry(postingToCorrect.bilagNo, revisionEntry);

    toast.success("Postering korrigert", {
      description: `${postingToCorrect.bilagNo}: ${reasonLabel}. Reversering: ${preview.crossReferences.reverseringRef}`,
      duration: 6000,
    });
  }, [postingToCorrect]);

  return (
    <>
      <Card>
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
          <CardHeader className="pb-3">
            <CollapsibleTrigger className="flex w-full items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
                  <TrendingUpIcon className="size-5 text-green-600" />
                </div>
                <div className="text-left">
                  <CardTitle className="text-lg">Inntekter (Utgående MVA)</CardTitle>
                  <CardDescription>
                    {incomeData.length} fakturaer &bull; kr {totalIncome.toLocaleString("nb-NO")} &bull; MVA: kr {totalMva.toLocaleString("nb-NO")}
                  </CardDescription>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <Badge variant="outline" className="border-green-200 bg-green-50 text-green-700">
                  <SparklesIcon className="mr-1 size-3" />
                  Behandlet av Ciri
                </Badge>
                {isOpen ? (
                  <ChevronUpIcon className="size-5 text-muted-foreground" />
                ) : (
                  <ChevronDownIcon className="size-5 text-muted-foreground" />
                )}
              </div>
            </CollapsibleTrigger>
          </CardHeader>
          <CollapsibleContent>
            <CardContent className="pt-0">
              <p className="mb-3 text-xs text-muted-foreground">
                Klikk på en rad for å se detaljer eller endre postering
              </p>
              <div className="rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="w-[100px]">Dato</TableHead>
                      <TableHead>Beskrivelse</TableHead>
                      <TableHead>Kunde</TableHead>
                      <TableHead className="text-right">Beløp</TableHead>
                      <TableHead className="text-right">MVA</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {incomeData.map((item) => {
                      const Icon = item.icon;
                      return (
                        <TableRow
                          key={item.id}
                          className="cursor-pointer transition-colors hover:bg-[var(--primary)]/5"
                          onClick={() => setSelectedIncome(item)}
                        >
                          <TableCell className="font-mono text-sm text-muted-foreground">
                            {new Date(item.date).toLocaleDateString("nb-NO", { day: "2-digit", month: "2-digit" })}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Icon className="size-4 text-muted-foreground" />
                              <span className="text-sm">{item.description}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">{item.customer}</TableCell>
                          <TableCell className="text-right font-display text-sm">
                            kr {item.amount.toLocaleString("nb-NO")}
                          </TableCell>
                          <TableCell className="text-right font-display text-sm font-medium text-green-600">
                            kr {item.mva.toLocaleString("nb-NO")}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
              <div className="mt-4 flex items-center justify-between rounded-lg bg-green-50 p-4 dark:bg-green-900/20">
                <span className="font-medium">Total utgående MVA fra salg</span>
                <span className="font-display text-xl font-bold text-green-600">
                  kr {totalMva.toLocaleString("nb-NO")}
                </span>
              </div>
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>

      {/* Income Edit Dialog */}
      <Dialog open={!!selectedIncome} onOpenChange={(open) => !open && setSelectedIncome(null)}>
        <DialogContent className="!w-[50vw] !max-w-[50vw] sm:!max-w-[50vw]">
          {selectedIncome && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <FileTextIcon className="size-5" />
                  Faktura {selectedIncome.invoiceNo}
                </DialogTitle>
                <DialogDescription>
                  {selectedIncome.customer} &bull; {new Date(selectedIncome.date).toLocaleDateString("nb-NO", { day: "numeric", month: "long", year: "numeric" })}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                {/* Ciri's handling note */}
                <div className="flex gap-3 rounded-lg border border-green-200 bg-green-50 p-3 dark:border-green-900/30 dark:bg-green-900/20">
                  <SparklesIcon className="mt-0.5 size-4 shrink-0 text-green-600" />
                  <p className="text-sm text-green-700 dark:text-green-300">
                    Ciri har automatisk postert denne fakturaen som utgående MVA 25%.
                  </p>
                </div>

                {/* Invoice details */}
                <div className="space-y-3">
                  <div className="flex justify-between rounded-lg border p-3">
                    <span className="text-sm text-muted-foreground">Beskrivelse</span>
                    <span className="text-sm font-medium">{selectedIncome.description}</span>
                  </div>
                  <div className="flex justify-between rounded-lg border p-3">
                    <span className="text-sm text-muted-foreground">Beløp eks. MVA</span>
                    <span className="font-display text-sm font-medium">kr {selectedIncome.amount.toLocaleString("nb-NO")}</span>
                  </div>
                  <div className="flex justify-between rounded-lg border p-3">
                    <span className="text-sm text-muted-foreground">MVA ({selectedIncome.mvaRate}%)</span>
                    <span className="font-display text-sm font-medium text-green-600">kr {selectedIncome.mva.toLocaleString("nb-NO")}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between p-3">
                    <span className="font-medium">Total inkl. MVA</span>
                    <span className="font-display text-lg font-bold">kr {(selectedIncome.amount + selectedIncome.mva).toLocaleString("nb-NO")}</span>
                  </div>
                </div>

                {/* Posting details */}
                <div className="space-y-2">
                  <p className="text-sm font-medium">Postering</p>
                  <div className="rounded-lg border bg-muted/30 p-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-mono text-muted-foreground">3000</span>
                      <span>Salgsinntekt</span>
                      <span className="font-display">kr {selectedIncome.amount.toLocaleString("nb-NO")}</span>
                    </div>
                    <div className="mt-2 flex items-center justify-between text-sm">
                      <span className="font-mono text-muted-foreground">2700</span>
                      <span>Utgående MVA</span>
                      <span className="font-display text-green-600">kr {selectedIncome.mva.toLocaleString("nb-NO")}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <Button variant="outline" className="flex-1" onClick={() => setSelectedIncome(null)}>
                  Lukk
                </Button>
                <Button
                  variant="outline"
                  className="flex-1 gap-2"
                  onClick={() => handleOpenCorrection(selectedIncome)}
                >
                  <PencilIcon className="size-4" />
                  Endre postering
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Posting Correction Dialog */}
      <PosteringCorrectionDialog
        open={correctionDialogOpen}
        onOpenChange={setCorrectionDialogOpen}
        posting={postingToCorrect}
        onComplete={handleCorrectionComplete}
      />
    </>
  );
}
