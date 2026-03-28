"use client";

import { useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  TrendingDownIcon,
  ReceiptIcon,
  SparklesIcon,
  CheckCircle2Icon,
  PencilIcon,
  ChevronUpIcon,
  ChevronDownIcon,
} from "lucide-react";
import dynamic from "next/dynamic";
import { cn } from "@/lib/utils";
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
import { expenseData } from "../data/expense-data";
import { expensesByCategory, categoryToAccount } from "../constants";
import type { ExpenseItem } from "../types";

const PosteringCorrectionDialog = dynamic(
  () => import("@/components/postering-correction-dialog").then((m) => ({ default: m.PosteringCorrectionDialog })),
  { ssr: false }
);

export function ExpenseDetailsCard() {
  const [isOpen, setIsOpen] = useState(true);
  const [showAll, setShowAll] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<ExpenseItem | null>(null);
  const [correctionDialogOpen, setCorrectionDialogOpen] = useState(false);
  const [postingToCorrect, setPostingToCorrect] = useState<OriginalPosting | null>(null);

  const totalExpenses = expenseData.reduce((acc, item) => acc + item.amount, 0);
  const totalMva = expenseData.filter((e) => e.mvaCode === "1").reduce((acc, item) => acc + item.mva, 0);
  const specialHandledItems = expenseData.filter((e) => e.status === "needs_review");

  const displayedExpenses = showAll ? expenseData : expenseData.slice(0, 6);

  function getAccountCode(category: string): string {
    return categoryToAccount[category] || "6000";
  }

  const handleOpenCorrection = useCallback((expense: ExpenseItem) => {
    const posting: OriginalPosting = {
      id: expense.id,
      bilagNo: expense.bilagNo,
      date: expense.date,
      description: expense.description,
      vendor: expense.vendor,
      accountCode: getAccountCode(expense.category),
      accountName: expense.category,
      amount: expense.amount,
      mvaRate: expense.mvaRate,
      mva: expense.mva,
      category: expense.category,
      bilagTotal: expense.amount + expense.mva,
    };
    setPostingToCorrect(posting);
    setSelectedExpense(null);
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
                <div className="flex size-10 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
                  <TrendingDownIcon className="size-5 text-red-500" />
                </div>
                <div className="text-left">
                  <CardTitle className="text-lg">Kostnader (Inngående MVA)</CardTitle>
                  <CardDescription>
                    {expenseData.length} bilag &bull; kr {totalExpenses.toLocaleString("nb-NO")} &bull; Fradrag: kr {totalMva.toLocaleString("nb-NO")}
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
            <CardContent className="space-y-4 pt-0">
              {/* Category Summary */}
              <div className="grid gap-2 sm:grid-cols-4">
                {expensesByCategory.slice(0, 4).map((cat) => {
                  const Icon = cat.icon;
                  return (
                    <div key={cat.category} className="flex items-center gap-2 rounded-lg border p-3">
                      <Icon className="size-4 text-muted-foreground" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-muted-foreground truncate">{cat.category}</p>
                        <p className="font-display text-sm font-medium">kr {cat.mva.toLocaleString("nb-NO")}</p>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Ciri's special handling notes */}
              {specialHandledItems.length > 0 && (
                <div className="rounded-lg border border-[var(--primary)]/20 bg-[var(--primary)]/5 p-4">
                  <div className="flex gap-3">
                    <SparklesIcon className="mt-0.5 size-5 shrink-0 text-[var(--primary)]" />
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-[var(--primary)]">Ciri har gjort følgende vurderinger:</p>
                      <ul className="space-y-1 text-sm text-muted-foreground">
                        {specialHandledItems.map((item) => (
                          <li key={item.id} className="flex items-start gap-2">
                            <CheckCircle2Icon className="mt-0.5 size-3.5 shrink-0 text-green-600" />
                            <span>
                              <span className="font-medium text-foreground">{item.description}</span>
                              {" \u2014 "}{item.warning?.replace("Ciri har ", "").replace("vennligst bekreft antall gjester", "håndtert automatisk")}
                            </span>
                          </li>
                        ))}
                      </ul>
                      <p className="text-xs text-muted-foreground">
                        Klikk på en rad for å se detaljer eller endre postering
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Expense Table */}
              <div className="rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="w-[100px]">Dato</TableHead>
                      <TableHead>Beskrivelse</TableHead>
                      <TableHead>Leverandør</TableHead>
                      <TableHead className="text-center">MVA-kode</TableHead>
                      <TableHead className="text-right">Beløp</TableHead>
                      <TableHead className="text-right">Fradrag</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {displayedExpenses.map((item) => {
                      const Icon = item.icon;
                      const hasNote = item.status === "needs_review";
                      return (
                        <TableRow
                          key={item.id}
                          className={cn(
                            "cursor-pointer transition-colors hover:bg-[var(--primary)]/5",
                            hasNote && "bg-[var(--primary)]/5"
                          )}
                          onClick={() => setSelectedExpense(item)}
                        >
                          <TableCell className="font-mono text-sm text-muted-foreground">
                            {new Date(item.date).toLocaleDateString("nb-NO", { day: "2-digit", month: "2-digit" })}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Icon className="size-4 text-muted-foreground" />
                              <span className="text-sm">{item.description}</span>
                              {hasNote && (
                                <SparklesIcon className="size-3.5 text-[var(--primary)]" />
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">{item.vendor}</TableCell>
                          <TableCell className="text-center">
                            <Badge variant="outline" className="font-mono text-xs">
                              {item.mvaCode}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right font-display text-sm">
                            kr {item.amount.toLocaleString("nb-NO")}
                          </TableCell>
                          <TableCell className={cn(
                            "text-right font-display text-sm font-medium",
                            item.mva > 0 && item.mvaCode === "1" ? "text-red-500" : "text-muted-foreground"
                          )}>
                            {item.mva > 0 && item.mvaCode === "1" ? `kr ${item.mva.toLocaleString("nb-NO")}` : "\u2014"}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {expenseData.length > 6 && (
                <Button
                  variant="ghost"
                  className="w-full"
                  onClick={() => setShowAll(!showAll)}
                >
                  {showAll ? (
                    <>
                      <ChevronUpIcon className="mr-2 size-4" />
                      Vis færre
                    </>
                  ) : (
                    <>
                      <ChevronDownIcon className="mr-2 size-4" />
                      Vis alle {expenseData.length} bilag
                    </>
                  )}
                </Button>
              )}

              <div className="flex items-center justify-between rounded-lg bg-red-50 p-4 dark:bg-red-900/20">
                <div>
                  <span className="font-medium">Total inngående MVA (fradrag)</span>
                  <p className="text-xs text-muted-foreground">Etter Ciris vurdering av fradragsrett</p>
                </div>
                <span className="font-display text-xl font-bold text-red-500">
                  kr {totalMva.toLocaleString("nb-NO")}
                </span>
              </div>
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>

      {/* Expense Edit Dialog */}
      <Dialog open={!!selectedExpense} onOpenChange={(open) => !open && setSelectedExpense(null)}>
        <DialogContent className="!w-[50vw] !max-w-[50vw] sm:!max-w-[50vw]">
          {selectedExpense && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <ReceiptIcon className="size-5" />
                  Bilag {selectedExpense.bilagNo}
                </DialogTitle>
                <DialogDescription>
                  {selectedExpense.vendor} &bull; {new Date(selectedExpense.date).toLocaleDateString("nb-NO", { day: "numeric", month: "long", year: "numeric" })}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                {/* Ciri's handling note */}
                <div className={cn(
                  "flex gap-3 rounded-lg border p-3",
                  selectedExpense.status === "needs_review"
                    ? "border-[var(--primary)]/30 bg-[var(--primary)]/5"
                    : "border-green-200 bg-green-50 dark:border-green-900/30 dark:bg-green-900/20"
                )}>
                  <SparklesIcon className={cn(
                    "mt-0.5 size-4 shrink-0",
                    selectedExpense.status === "needs_review" ? "text-[var(--primary)]" : "text-green-600"
                  )} />
                  <div className="text-sm">
                    {selectedExpense.status === "needs_review" ? (
                      <>
                        <p className="font-medium text-[var(--primary)]">Ciri har gjort en vurdering</p>
                        <p className="mt-1 text-muted-foreground">{selectedExpense.warning}</p>
                      </>
                    ) : (
                      <p className="text-green-700 dark:text-green-300">
                        Ciri har automatisk postert dette bilaget med {selectedExpense.mvaRate}% MVA-fradrag.
                      </p>
                    )}
                  </div>
                </div>

                {/* Expense details */}
                <div className="space-y-3">
                  <div className="flex justify-between rounded-lg border p-3">
                    <span className="text-sm text-muted-foreground">Beskrivelse</span>
                    <span className="text-sm font-medium">{selectedExpense.description}</span>
                  </div>
                  <div className="flex justify-between rounded-lg border p-3">
                    <span className="text-sm text-muted-foreground">Kategori</span>
                    <span className="text-sm font-medium">{selectedExpense.category}</span>
                  </div>
                  <div className="flex justify-between rounded-lg border p-3">
                    <span className="text-sm text-muted-foreground">Beløp eks. MVA</span>
                    <span className="font-display text-sm font-medium">kr {selectedExpense.amount.toLocaleString("nb-NO")}</span>
                  </div>
                  <div className="flex justify-between rounded-lg border p-3">
                    <span className="text-sm text-muted-foreground">MVA ({selectedExpense.mvaRate}%)</span>
                    <span className="font-display text-sm font-medium">kr {selectedExpense.mva.toLocaleString("nb-NO")}</span>
                  </div>
                  <div className="flex justify-between rounded-lg border p-3">
                    <span className="text-sm text-muted-foreground">MVA-fradrag</span>
                    <span className={cn(
                      "font-display text-sm font-medium",
                      selectedExpense.mvaCode === "1" ? "text-red-500" : "text-muted-foreground"
                    )}>
                      {selectedExpense.mvaCode === "1" ? `kr ${selectedExpense.mva.toLocaleString("nb-NO")}` : "Ikke fradragsberettiget"}
                    </span>
                  </div>
                </div>

                {/* Posting details */}
                <div className="space-y-2">
                  <p className="text-sm font-medium">Postering</p>
                  <div className="rounded-lg border bg-muted/30 p-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-mono text-muted-foreground">
                        {getAccountCode(selectedExpense.category)}
                      </span>
                      <span>{selectedExpense.category}</span>
                      <span className="font-display">kr {selectedExpense.amount.toLocaleString("nb-NO")}</span>
                    </div>
                    {selectedExpense.mvaCode === "1" && selectedExpense.mva > 0 && (
                      <div className="mt-2 flex items-center justify-between text-sm">
                        <span className="font-mono text-muted-foreground">2710</span>
                        <span>Inngående MVA</span>
                        <span className="font-display text-red-500">kr {selectedExpense.mva.toLocaleString("nb-NO")}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <Button variant="outline" className="flex-1" onClick={() => setSelectedExpense(null)}>
                  Lukk
                </Button>
                <Button
                  variant="outline"
                  className="flex-1 gap-2"
                  onClick={() => selectedExpense && handleOpenCorrection(selectedExpense)}
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
