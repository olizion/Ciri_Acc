"use client";

import { useState, useMemo, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import {
  ChevronRightIcon,
  ChevronLeftIcon,
  CheckCircle2Icon,
  AlertCircleIcon,
  SparklesIcon,
  FileTextIcon,
  ReceiptIcon,
  ArrowRightIcon,
  ArrowLeftIcon,
  ScaleIcon,
  PencilIcon,
  MessageSquareIcon,
  ClipboardCheckIcon,
  CheckIcon,
  XIcon,
  InfoIcon,
  LinkIcon,
} from "lucide-react";
import CiriLogo from "@/components/layout/ciri-logo";
import {
  OriginalPosting,
  CorrectionInput,
  ValidationResult,
  CorrectionPreview,
  CORRECTION_REASONS,
  MVA_RATES,
  ACCOUNT_CATEGORIES,
  validateCorrection,
  generateCorrectionPreview,
  getCiriValidationMessage,
} from "@/lib/ciri-postering-verification";

// Steps for the wizard
const STEPS = [
  { id: 1, title: "Se original", icon: FileTextIcon },
  { id: 2, title: "Korriger", icon: PencilIcon },
  { id: 3, title: "Begrunnelse", icon: MessageSquareIcon },
  { id: 4, title: "Bekreft", icon: ClipboardCheckIcon },
  { id: 5, title: "Fullført", icon: CheckCircle2Icon },
] as const;

interface PosteringCorrectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  posting: OriginalPosting | null;
  onComplete?: (correction: CorrectionInput, preview: CorrectionPreview) => void;
}

export function PosteringCorrectionDialog({
  open,
  onOpenChange,
  posting,
  onComplete,
}: PosteringCorrectionDialogProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [correction, setCorrection] = useState<CorrectionInput>({
    newAccountCode: "",
    newAmount: 0,
    newMvaRate: 25,
    newMva: 0,
    reasonId: "",
    reasonText: "",
  });
  const [confirmed, setConfirmed] = useState(false);

  // Reset state when dialog closes
  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (!open) {
        setCurrentStep(1);
        setCorrection({
          newAccountCode: "",
          newAmount: 0,
          newMvaRate: 25,
          newMva: 0,
          reasonId: "",
          reasonText: "",
        });
        setConfirmed(false);
      }
      onOpenChange(open);
    },
    [onOpenChange]
  );

  // Initialize correction values from original posting
  const initializeFromPosting = useCallback(() => {
    if (posting) {
      setCorrection({
        newAccountCode: posting.accountCode,
        newAmount: posting.amount,
        newMvaRate: posting.mvaRate,
        newMva: posting.mva,
        reasonId: "",
        reasonText: "",
      });
    }
  }, [posting]);

  // Validation result
  const validationResult = useMemo<ValidationResult | null>(() => {
    if (!posting) return null;
    return validateCorrection(posting, correction);
  }, [posting, correction]);

  // Correction preview
  const preview = useMemo<CorrectionPreview | null>(() => {
    if (!posting) return null;
    return generateCorrectionPreview(posting, correction);
  }, [posting, correction]);

  // Real-time Ciri validation messages
  const ciriMessages = useMemo(() => {
    if (!posting) return [];

    const messages: { message: string; isValid: boolean; field: string }[] = [];

    // Amount validation - use actual MVA amount entered, not calculated
    const amountMsg = getCiriValidationMessage("amount", correction.newAmount, {
      bilagTotal: posting.bilagTotal,
      mvaRate: correction.newMvaRate,
      mvaAmount: correction.newMva,
    });
    if (amountMsg) messages.push({ ...amountMsg, field: "amount" });

    // Account validation
    const accountMsg = getCiriValidationMessage("account", correction.newAccountCode, {
      category: posting.category,
    });
    if (accountMsg) messages.push({ ...accountMsg, field: "account" });

    return messages;
  }, [posting, correction]);

  // Handle MVA rate change and recalculate MVA
  const handleMvaRateChange = useCallback((rate: string) => {
    const mvaRate = parseInt(rate);
    setCorrection((prev) => ({
      ...prev,
      newMvaRate: mvaRate,
      newMva: Math.round(prev.newAmount * (mvaRate / 100)),
    }));
  }, []);

  // Handle amount change and recalculate MVA
  const handleAmountChange = useCallback((value: string) => {
    const amount = parseFloat(value) || 0;
    setCorrection((prev) => ({
      ...prev,
      newAmount: amount,
      newMva: Math.round(amount * (prev.newMvaRate / 100)),
    }));
  }, []);

  // Handle step navigation
  const goToNextStep = useCallback(() => {
    if (currentStep === 1) {
      initializeFromPosting();
    }
    if (currentStep === 4 && preview && onComplete) {
      onComplete(correction, preview);
    }
    setCurrentStep((prev) => Math.min(prev + 1, 5));
  }, [currentStep, initializeFromPosting, correction, preview, onComplete]);

  const goToPreviousStep = useCallback(() => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  }, []);

  // Check if can proceed to next step
  const canProceed = useMemo(() => {
    switch (currentStep) {
      case 1:
        return true;
      case 2:
        return correction.newAmount > 0 && correction.newAccountCode;
      case 3:
        return (
          correction.reasonId &&
          (correction.reasonId !== "other" || correction.reasonText.length >= 10)
        );
      case 4:
        return confirmed && validationResult?.isValid;
      default:
        return false;
    }
  }, [currentStep, correction, confirmed, validationResult]);

  if (!posting) return null;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="!w-[50vw] !max-w-[50vw] sm:!max-w-[50vw]">
        <DialogHeader className="pb-2">
          <DialogTitle className="flex items-center gap-2">
            <ScaleIcon className="size-5 text-[var(--primary)]" />
            Korriger postering
          </DialogTitle>
          <DialogDescription>
            Bilag {posting.bilagNo} • {posting.vendor}
          </DialogDescription>
        </DialogHeader>

        {/* Step Indicator */}
        <div className="flex items-center justify-between border-b pb-4">
          {STEPS.map((step, index) => {
            const Icon = step.icon;
            const isActive = currentStep === step.id;
            const isCompleted = currentStep > step.id;

            return (
              <div key={step.id} className="flex items-center">
                <div
                  className={cn(
                    "flex items-center gap-2 rounded-full px-3 py-1.5 text-sm transition-colors",
                    isActive && "bg-[var(--primary)]/10 text-[var(--primary)]",
                    isCompleted && "text-green-600",
                    !isActive && !isCompleted && "text-muted-foreground"
                  )}
                >
                  <div
                    className={cn(
                      "flex size-6 items-center justify-center rounded-full border",
                      isActive && "border-[var(--primary)] bg-[var(--primary)] text-white",
                      isCompleted && "border-green-500 bg-green-500 text-white",
                      !isActive && !isCompleted && "border-muted-foreground/30"
                    )}
                  >
                    {isCompleted ? (
                      <CheckIcon className="size-3.5" />
                    ) : (
                      <Icon className="size-3.5" />
                    )}
                  </div>
                  <span className="hidden font-medium sm:inline">{step.title}</span>
                </div>
                {index < STEPS.length - 1 && (
                  <ChevronRightIcon className="mx-1 size-4 text-muted-foreground/30" />
                )}
              </div>
            );
          })}
        </div>

        <ScrollArea className="max-h-[55vh]">
          <div className="space-y-4 py-2 pr-4">
            {/* Step 1: Review Original */}
            {currentStep === 1 && (
              <div className="space-y-4">
                {/* Ciri explanation */}
                <div className="flex gap-3 rounded-lg border border-[var(--primary)]/20 bg-[var(--primary)]/5 p-4">
                  <CiriLogo size="sm" />
                  <div className="text-sm">
                    <p className="font-medium text-[var(--primary)]">
                      La meg vise deg den opprinnelige posteringen
                    </p>
                    <p className="mt-1 text-muted-foreground">
                      Gjennomgå detaljene nedenfor. Iht. Bokføringsloven §6 kan ikke
                      posteringer endres direkte, men må korrigeres med reversering og
                      ny postering.
                    </p>
                  </div>
                </div>

                {/* Original posting details */}
                <div className="space-y-3">
                  <h3 className="text-sm font-medium">Opprinnelig postering</h3>

                  <div className="rounded-lg border bg-muted/30 p-4">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div>
                        <p className="text-xs text-muted-foreground">Bilagsnummer</p>
                        <p className="font-mono text-sm font-medium">{posting.bilagNo}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Dato</p>
                        <p className="text-sm font-medium">
                          {new Date(posting.date).toLocaleDateString("nb-NO", {
                            day: "numeric",
                            month: "long",
                            year: "numeric",
                          })}
                        </p>
                      </div>
                      <div className="sm:col-span-2">
                        <p className="text-xs text-muted-foreground">Beskrivelse</p>
                        <p className="text-sm font-medium">{posting.description}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Leverandør</p>
                        <p className="text-sm font-medium">{posting.vendor}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Kategori</p>
                        <p className="text-sm font-medium">{posting.category}</p>
                      </div>
                    </div>

                    <Separator className="my-4" />

                    <div className="space-y-3">
                      <h4 className="text-xs font-medium text-muted-foreground">
                        Kontoføring
                      </h4>
                      <div className="rounded border bg-background p-3">
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-mono text-muted-foreground">
                            {posting.accountCode}
                          </span>
                          <span>{posting.accountName}</span>
                          <span className="font-display">
                            kr {posting.amount.toLocaleString("nb-NO")}
                          </span>
                        </div>
                        {posting.mva > 0 && (
                          <div className="mt-2 flex items-center justify-between text-sm">
                            <span className="font-mono text-muted-foreground">2710</span>
                            <span>Inngående MVA ({posting.mvaRate}%)</span>
                            <span className="font-display text-red-500">
                              kr {posting.mva.toLocaleString("nb-NO")}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    <Separator className="my-4" />

                    <div className="flex justify-between">
                      <span className="font-medium">Total (bilag)</span>
                      <span className="font-display text-lg font-bold">
                        kr {posting.bilagTotal.toLocaleString("nb-NO")}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Enter Correction */}
            {currentStep === 2 && (
              <div className="space-y-4">
                {/* Ciri real-time validation */}
                <div className="flex gap-3 rounded-lg border border-[var(--primary)]/20 bg-[var(--primary)]/5 p-4">
                  <CiriLogo size="sm" />
                  <div className="flex-1">
                    <p className="text-base font-medium text-[var(--primary)]">
                      Jeg validerer korreksjonen i sanntid
                    </p>
                    <div className="mt-3 space-y-2">
                      {ciriMessages.map((msg, idx) => (
                        <div
                          key={idx}
                          className={cn(
                            "flex items-center gap-2 text-sm",
                            msg.isValid ? "text-green-600" : "text-amber-600"
                          )}
                        >
                          {msg.isValid ? (
                            <CheckCircle2Icon className="size-4" />
                          ) : (
                            <AlertCircleIcon className="size-4" />
                          )}
                          <span>{msg.message}</span>
                        </div>
                      ))}
                      {ciriMessages.length === 0 && (
                        <p className="text-sm text-muted-foreground">
                          Fyll inn feltene nedenfor for å se validering...
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Correction form */}
                <div className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="account">Konto</Label>
                      <Input
                        id="account"
                        placeholder="f.eks. 6300"
                        value={correction.newAccountCode}
                        onChange={(e) =>
                          setCorrection((prev) => ({
                            ...prev,
                            newAccountCode: e.target.value,
                          }))
                        }
                        className="font-mono"
                      />
                      <p className="text-xs text-muted-foreground">
                        Opprinnelig: {posting.accountCode} ({posting.accountName})
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="amount">Beløp eks. MVA</Label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                          kr
                        </span>
                        <Input
                          id="amount"
                          type="number"
                          value={correction.newAmount || ""}
                          onChange={(e) => handleAmountChange(e.target.value)}
                          className="pl-9 font-display"
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Opprinnelig: kr {posting.amount.toLocaleString("nb-NO")}
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="mvaRate">MVA-sats</Label>
                      <Select
                        value={correction.newMvaRate.toString()}
                        onValueChange={handleMvaRateChange}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="25">25% (standard)</SelectItem>
                          <SelectItem value="15">15% (mat/drikke)</SelectItem>
                          <SelectItem value="12">12% (transport)</SelectItem>
                          <SelectItem value="0">0% (fritatt)</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">
                        Opprinnelig: {posting.mvaRate}%
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="mva">MVA-beløp</Label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                          kr
                        </span>
                        <Input
                          id="mva"
                          type="number"
                          value={correction.newMva || ""}
                          onChange={(e) =>
                            setCorrection((prev) => ({
                              ...prev,
                              newMva: parseFloat(e.target.value) || 0,
                            }))
                          }
                          className="pl-9 font-display"
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Beregnet: kr{" "}
                        {Math.round(
                          correction.newAmount * (correction.newMvaRate / 100)
                        ).toLocaleString("nb-NO")}
                      </p>
                    </div>
                  </div>

                  <Separator />

                  {(() => {
                    const newTotal = correction.newAmount + correction.newMva;
                    const difference = newTotal - posting.bilagTotal;
                    const hasDiscrepancy = Math.abs(difference) > 1;

                    return (
                      <div className={cn(
                        "rounded-lg border p-4",
                        hasDiscrepancy
                          ? "border-amber-300 bg-amber-50 dark:border-amber-800 dark:bg-amber-900/20"
                          : "border-green-300 bg-green-50 dark:border-green-800 dark:bg-green-900/20"
                      )}>
                        <div className="flex justify-between items-center">
                          <span className="text-base font-medium">Ny total</span>
                          <span className="font-display text-xl font-bold">
                            kr {newTotal.toLocaleString("nb-NO")}
                          </span>
                        </div>
                        <div className="mt-3 flex justify-between items-center">
                          <span className="text-base text-muted-foreground">Bilaget viser</span>
                          <span className="font-display text-base font-medium">
                            kr {posting.bilagTotal.toLocaleString("nb-NO")}
                          </span>
                        </div>
                        {hasDiscrepancy && (
                          <div className="mt-3 flex items-center gap-2 text-amber-700 dark:text-amber-400">
                            <AlertCircleIcon className="size-5" />
                            <span className="text-sm font-medium">
                              Avvik: kr {Math.abs(difference).toLocaleString("nb-NO")} {difference > 0 ? "for mye" : "for lite"}
                            </span>
                          </div>
                        )}
                        {!hasDiscrepancy && (
                          <div className="mt-3 flex items-center gap-2 text-green-700 dark:text-green-400">
                            <CheckCircle2Icon className="size-5" />
                            <span className="text-sm font-medium">Beløpet stemmer med bilaget</span>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              </div>
            )}

            {/* Step 3: Provide Reason */}
            {currentStep === 3 && (
              <div className="space-y-4">
                {/* Ciri explanation */}
                <div className="flex gap-3 rounded-lg border border-[var(--primary)]/20 bg-[var(--primary)]/5 p-4">
                  <CiriLogo size="sm" />
                  <div className="text-sm">
                    <p className="font-medium text-[var(--primary)]">
                      Bokføringsloven §10 krever begrunnelse
                    </p>
                    <p className="mt-1 text-muted-foreground">
                      For revisjonsformål må alle korreksjoner ha en dokumentert årsak.
                      Velg fra listen eller skriv din egen begrunnelse.
                    </p>
                  </div>
                </div>

                {/* Reason selection */}
                <div className="space-y-3">
                  <Label>Velg årsak til korreksjon</Label>
                  <div className="grid gap-2">
                    {CORRECTION_REASONS.map((reason) => (
                      <div
                        key={reason.id}
                        className={cn(
                          "flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-muted/50",
                          correction.reasonId === reason.id &&
                            "border-[var(--primary)] bg-[var(--primary)]/5"
                        )}
                        onClick={() =>
                          setCorrection((prev) => ({ ...prev, reasonId: reason.id }))
                        }
                      >
                        <div
                          className={cn(
                            "flex size-5 items-center justify-center rounded-full border",
                            correction.reasonId === reason.id
                              ? "border-[var(--primary)] bg-[var(--primary)] text-white"
                              : "border-muted-foreground/30"
                          )}
                        >
                          {correction.reasonId === reason.id && (
                            <CheckIcon className="size-3" />
                          )}
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium">{reason.label}</p>
                          <p className="text-xs text-muted-foreground">
                            {reason.description}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Custom reason text */}
                <div className="space-y-2">
                  <Label htmlFor="reasonText">
                    Utfyllende begrunnelse{" "}
                    {correction.reasonId === "other" ? "(påkrevd)" : "(valgfritt)"}
                  </Label>
                  <Textarea
                    id="reasonText"
                    placeholder="Beskriv hvorfor posteringen må korrigeres..."
                    value={correction.reasonText}
                    onChange={(e) =>
                      setCorrection((prev) => ({ ...prev, reasonText: e.target.value }))
                    }
                    rows={3}
                  />
                  <p className="text-xs text-muted-foreground">
                    {correction.reasonText.length}/10 tegn (minimum)
                  </p>
                </div>
              </div>
            )}

            {/* Step 4: Review & Confirm */}
            {currentStep === 4 && preview && (
              <div className="space-y-4">
                {/* Ciri summary */}
                <div className="flex gap-3 rounded-lg border border-[var(--primary)]/20 bg-[var(--primary)]/5 p-4">
                  <CiriLogo size="sm" />
                  <div className="text-sm">
                    <p className="font-medium text-[var(--primary)]">
                      Her er hva som vil skje
                    </p>
                    <p className="mt-1 text-muted-foreground">
                      Jeg oppretter en reversering av den opprinnelige posteringen, og
                      deretter en ny korrigert postering. Begge vil ha kryssreferanser
                      til hverandre.
                    </p>
                  </div>
                </div>

                {/* Transaction chain visualization */}
                <div className="space-y-3">
                  {/* Original */}
                  <div className="rounded-lg border p-4">
                    <div className="mb-2 flex items-center gap-2">
                      <Badge variant="outline" className="font-mono text-xs">
                        {posting.bilagNo}
                      </Badge>
                      <span className="text-sm font-medium">Opprinnelig postering</span>
                      <span className="text-xs text-muted-foreground">
                        (vil reverseres)
                      </span>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {posting.accountCode} - kr {posting.amount.toLocaleString("nb-NO")}{" "}
                      + MVA kr {posting.mva.toLocaleString("nb-NO")}
                    </div>
                  </div>

                  <div className="flex justify-center">
                    <ArrowRightIcon className="size-5 rotate-90 text-muted-foreground" />
                  </div>

                  {/* Reversering */}
                  <div className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-900/30 dark:bg-red-900/20">
                    <div className="mb-2 flex items-center gap-2">
                      <Badge
                        variant="outline"
                        className="border-red-200 bg-red-100 font-mono text-xs text-red-700 dark:border-red-800 dark:bg-red-900/50 dark:text-red-300"
                      >
                        {preview.crossReferences.reverseringRef}
                      </Badge>
                      <span className="text-sm font-medium text-red-700 dark:text-red-300">
                        Reversering
                      </span>
                      <span className="text-xs text-red-600 dark:text-red-400">
                        (Ciri oppretter)
                      </span>
                    </div>
                    <div className="text-sm text-red-600 dark:text-red-400">
                      {preview.reversering.description}
                    </div>
                  </div>

                  <div className="flex justify-center">
                    <ArrowRightIcon className="size-5 rotate-90 text-muted-foreground" />
                  </div>

                  {/* New posting */}
                  <div className="rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-900/30 dark:bg-green-900/20">
                    <div className="mb-2 flex items-center gap-2">
                      <Badge
                        variant="outline"
                        className="border-green-200 bg-green-100 font-mono text-xs text-green-700 dark:border-green-800 dark:bg-green-900/50 dark:text-green-300"
                      >
                        {preview.crossReferences.correctionRef}
                      </Badge>
                      <span className="text-sm font-medium text-green-700 dark:text-green-300">
                        Ny korrigert postering
                      </span>
                    </div>
                    <div className="text-sm text-green-600 dark:text-green-400">
                      {correction.newAccountCode} - kr{" "}
                      {correction.newAmount.toLocaleString("nb-NO")} + MVA kr{" "}
                      {correction.newMva.toLocaleString("nb-NO")}
                    </div>
                  </div>
                </div>

                {/* Cross-reference info */}
                <div className="flex items-start gap-2 rounded-lg border bg-muted/30 p-3">
                  <LinkIcon className="mt-0.5 size-4 text-muted-foreground" />
                  <div className="text-xs text-muted-foreground">
                    <p className="font-medium text-foreground">Kryssreferanser</p>
                    <p className="mt-1">
                      Alle tre posteringer vil referere til hverandre i revisjonsloggen
                      iht. Bokføringsforskriften.
                    </p>
                  </div>
                </div>

                {/* Validation errors/warnings */}
                {validationResult && (validationResult.errors.length > 0 || validationResult.warnings.length > 0) && (
                  <div className="space-y-2">
                    {validationResult.errors.map((error, idx) => (
                      <div
                        key={idx}
                        className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/30 dark:bg-red-900/20 dark:text-red-300"
                      >
                        <XIcon className="size-4" />
                        {error.message}
                      </div>
                    ))}
                    {validationResult.warnings.map((warning, idx) => (
                      <div
                        key={idx}
                        className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700 dark:border-amber-900/30 dark:bg-amber-900/20 dark:text-amber-300"
                      >
                        <AlertCircleIcon className="size-4" />
                        {warning.message}
                      </div>
                    ))}
                  </div>
                )}

                {/* Legal notice */}
                <div className="rounded-lg border bg-muted/30 p-4">
                  <div className="flex items-start gap-2">
                    <InfoIcon className="mt-0.5 size-4 text-muted-foreground" />
                    <div className="text-xs text-muted-foreground">
                      <p className="font-medium text-foreground">
                        Bokføringsloven §9 - Retting av feil
                      </p>
                      <p className="mt-1">
                        &quot;Retting av bokførte opplysninger skal skje på en slik måte at
                        det klart fremgår hva som er rettet.&quot; Denne korreksjonen
                        tilfredsstiller lovens krav ved bruk av reversering og ny
                        postering med full sporbarhet.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Confirmation checkbox */}
                <div className="flex items-start space-x-3 rounded-lg border p-4">
                  <Checkbox
                    id="confirm"
                    checked={confirmed}
                    onCheckedChange={(checked) => setConfirmed(checked === true)}
                  />
                  <div className="grid gap-1.5 leading-none">
                    <label
                      htmlFor="confirm"
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      Jeg bekrefter at korreksjonen er korrekt
                    </label>
                    <p className="text-xs text-muted-foreground">
                      Ved å krysse av godtar jeg at Ciri oppretter reversering og ny
                      postering på mine vegne.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Step 5: Complete */}
            {currentStep === 5 && preview && (
              <div className="space-y-4">
                {/* Success message */}
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <div className="mb-4 flex size-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
                    <CheckCircle2Icon className="size-8 text-green-600" />
                  </div>
                  <h3 className="text-lg font-semibold">Korreksjon fullført</h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Posteringen er korrigert i henhold til Bokføringsloven.
                  </p>
                </div>

                {/* Audit trail reference */}
                <div className="rounded-lg border bg-muted/30 p-4">
                  <h4 className="mb-3 text-sm font-medium">Revisjonslogg</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Opprinnelig bilag</span>
                      <span className="font-mono">{posting.bilagNo}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Reversering</span>
                      <span className="font-mono text-red-600">
                        {preview.crossReferences.reverseringRef}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Korrigert postering</span>
                      <span className="font-mono text-green-600">
                        {preview.crossReferences.correctionRef}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Ciri note */}
                <div className="flex gap-3 rounded-lg border border-[var(--primary)]/20 bg-[var(--primary)]/5 p-4">
                  <CiriLogo size="sm" />
                  <div className="text-sm">
                    <p className="font-medium text-[var(--primary)]">Alt i orden!</p>
                    <p className="mt-1 text-muted-foreground">
                      Jeg har oppdatert MVA-beregningen for gjeldende termin.
                      Korreksjonen er loggført og sporbar for revisjon.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Navigation buttons */}
        <div className="flex justify-between pt-4">
          {currentStep > 1 && currentStep < 5 ? (
            <Button variant="outline" onClick={goToPreviousStep}>
              <ChevronLeftIcon className="mr-2 size-4" />
              Tilbake
            </Button>
          ) : (
            <div />
          )}

          {currentStep < 5 ? (
            <Button onClick={goToNextStep} disabled={!canProceed}>
              {currentStep === 4 ? (
                <>
                  <CheckCircle2Icon className="mr-2 size-4" />
                  Fullfør korreksjon
                </>
              ) : (
                <>
                  Neste
                  <ChevronRightIcon className="ml-2 size-4" />
                </>
              )}
            </Button>
          ) : (
            <Button onClick={() => handleOpenChange(false)}>
              <CheckIcon className="mr-2 size-4" />
              Lukk
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
