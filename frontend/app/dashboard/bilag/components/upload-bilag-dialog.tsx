"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import {
  FileTextIcon,
  CheckCircle2Icon,
  AlertCircleIcon,
  SparklesIcon,
  UploadIcon,
  Loader2Icon,
  AlertTriangleIcon,
  CheckIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import CiriLogo from "@/components/layout/ciri-logo";
import { motion, AnimatePresence } from "framer-motion";
import { parseInvoice, determineVATTreatment } from "@/lib/invoice-ocr";
import { convertToNOK, formatCurrency, requiresConversion, CURRENCIES } from "@/lib/currency-conversion";
import { checkOllamaStatus, warmupOCRModel } from "@/lib/ollama-ocr";
import { toast } from "sonner";
import { CiriLoadingToast, CiriSuccessToast, CiriErrorToast } from "@/components/ciri-loading-toast";
import { getLogoUrl, findDomainFromSupplier } from "@/lib/brandfetch";
import type { Bilag, RevisionEntry } from "../types";

interface UploadBilagDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpload: (bilag: Bilag) => void;
  nextBilagNumber: string;
}

function UploadBilagDialog({
  open,
  onOpenChange,
  onUpload,
  nextBilagNumber
}: UploadBilagDialogProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressMessage, setProgressMessage] = useState("");
  const [ocrResult, setOcrResult] = useState<Partial<Bilag> | null>(null);
  const [step, setStep] = useState<"upload" | "processing" | "result">("upload");
  const [ollamaStatus, setOllamaStatus] = useState<{
    checked: boolean;
    available: boolean;
    model?: string;
    error?: string;
  }>({ checked: false, available: false });
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Check Ollama status and warmup model when dialog opens
  useEffect(() => {
    if (open && !ollamaStatus.checked) {
      checkOllamaStatus().then((status) => {
        setOllamaStatus({
          checked: true,
          available: status.available,
          model: status.model,
          error: status.error,
        });
        // Warmup model in background for faster OCR
        if (status.available) {
          warmupOCRModel();
        }
      });
    }
  }, [open, ollamaStatus.checked]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      setFile(droppedFile);
    }
  };

  // Rotating loading messages for better UX
  const loadingMessages = [
    "Leser dokumentet...",
    "Identifiserer leverandør...",
    "Verifiserer alle feltene...",
    "Sjekker MVA-informasjon...",
    "Passer på at alt stemmer...",
    "Kategoriserer bilaget...",
    "Nesten ferdig...",
  ];

  const startProcessing = () => {
    if (!file) return;
    processInvoiceWithFile(file);
  };

  const processInvoiceWithFile = async (fileToProcess: File) => {
    // Close dialog immediately and show toast
    const fileName = fileToProcess.name;
    onOpenChange(false);
    resetDialog();

    // Show Ciri loading toast with pulsating avatar
    const toastId = toast(
      <CiriLoadingToast
        fileName={fileName}
        messages={loadingMessages}
        messageInterval={3500}
      />,
      {
        duration: Infinity,
      }
    );

    try {
      const ocrResponse = await parseInvoice(fileToProcess, {
        onProgress: () => {
          // Progress is handled by CiriLoadingToast component
        },
      });

      if (!ocrResponse.success || !ocrResponse.invoice) {
        throw new Error(ocrResponse.error || "OCR-behandling mislyktes");
      }

      const invoice = ocrResponse.invoice;

      // Determine VAT treatment based on currency
      const vatTreatment = determineVATTreatment(invoice);

      // Handle currency conversion for foreign invoices
      let convertedAmount = invoice.totalAmount;
      let conversionInfo: {
        originalCurrency?: string;
        originalAmount?: number;
        exchangeRate?: number;
        exchangeRateDate?: string;
      } = {};

      if (requiresConversion(invoice.currency)) {
        // Use invoice date for historical exchange rate (required for Norwegian accounting)
        const conversion = await convertToNOK(
          invoice.totalAmount,
          invoice.currency,
          invoice.invoiceDate // Historical rate from invoice date
        );
        convertedAmount = conversion.convertedAmount;
        conversionInfo = {
          originalCurrency: invoice.currency,
          originalAmount: invoice.totalAmount,
          exchangeRate: conversion.exchangeRate,
          exchangeRateDate: conversion.rateDate,
        };
      }

      // Build the result with all detected fields
      const hasVendor = invoice.supplier.name && invoice.supplier.name.length > 0;
      const hasCompleteInfo = hasVendor && invoice.confidence >= 80;

      // For foreign invoices, we don't use standard MVA codes
      const isForeign = requiresConversion(invoice.currency);
      const mvaCode = isForeign ? vatTreatment.vatCode : (invoice.taxRate === 25 ? "1" : invoice.taxRate === 15 ? "11" : invoice.taxRate === 12 ? "13" : "0");
      const mvaSats = isForeign ? 0 : (invoice.taxRate || 0);
      const mvaBelop = isForeign ? 0 : Math.round(invoice.totalTax);

      const result: Partial<Bilag> = {
        bilagsnummer: nextBilagNumber,
        bilagstype: "inngaende_faktura",
        bilagsdato: invoice.invoiceDate || new Date().toISOString().split("T")[0],
        registreringsdato: new Date().toISOString().split("T")[0],
        forfallsdato: invoice.dueDate,
        leverandor: invoice.supplier.name || "Ukjent leverandør",
        leverandorOrgnr: invoice.supplier.companyNumber,
        leverandorAdresse: invoice.supplier.address,
        leverandorDomain: findDomainFromSupplier({
          name: invoice.supplier.name,
          website: invoice.supplier.website,
          email: invoice.supplier.email
        }) || undefined,
        beskrivelse: invoice.lineItems.length > 0
          ? invoice.lineItems.map(item => item.description).join(", ")
          : "Faktura fra " + (invoice.supplier.name || "ukjent leverandør"),
        belopEksMva: isForeign ? convertedAmount : Math.round(invoice.totalNet),
        mvaGrunnlag: isForeign ? convertedAmount : Math.round(invoice.totalNet),
        mvaBelop: mvaBelop,
        mvaSats: mvaSats,
        mvaKode: hasCompleteInfo ? mvaCode : "",
        totalBelop: isForeign ? convertedAmount : Math.round(invoice.totalAmount),
        valuta: "NOK",
        ...conversionInfo,
        vatTreatment: isForeign ? vatTreatment : undefined,
        kontonummer: hasCompleteInfo ? "6540" : "",
        kontonavn: hasCompleteInfo ? "Programvare" : "Ikke kategorisert",
        status: hasCompleteInfo ? "bokfort" : "trenger_gjennomgang",
        ciriKonfidans: invoice.confidence,
        originalFilnavn: fileToProcess?.name,
        originalFiltype: fileToProcess?.type,
        originalFilUrl: URL.createObjectURL(fileToProcess),
        opprettetAv: "Ciri AI",
        oppbevaringsfrist: "2030-12-31",
        summary: invoice.summary,
        ciriExplanation: invoice.ciriExplanation,
      };

      // Set missing fields if incomplete
      if (!hasCompleteInfo) {
        result.missingFields = {
          leverandor: !hasVendor,
          kontonummer: true,
          mvaKode: !isForeign,
        };
        result.ciriMessage = ocrResponse.warnings?.join(". ") ||
          "Jeg klarte ikke å lese alle felt fra dokumentet. Vennligst fullfør registreringen.";
      } else if (isForeign) {
        result.ciriMessage = `Utenlandsk faktura (${invoice.currency}) oppdaget. ` +
          `Beløpet er konvertert til NOK. ${vatTreatment.explanation}`;
      } else {
        // Auto-booked - add posteringsreferanse
        result.posteringsreferanse = `GL-2025-${Date.now().toString().slice(-4)}`;
        result.ciriMessage = undefined; // No message needed for auto-booked
      }

      // Build revision log
      const revisjonslogg: RevisionEntry[] = [
        {
          timestamp: new Date().toISOString(),
          handling: "Lastet opp",
          bruker: "Bruker"
        },
        {
          timestamp: new Date().toISOString(),
          handling: "OCR-behandlet av Ciri",
          bruker: "Ciri AI",
          detaljer: `Konfidans: ${result.ciriKonfidans}%`
        }
      ];

      if (result.originalCurrency && result.originalCurrency !== "NOK") {
        const currencySymbol = CURRENCIES[result.originalCurrency]?.symbol || result.originalCurrency;
        revisjonslogg.push({
          timestamp: new Date().toISOString(),
          handling: "Valutakonvertering",
          bruker: "Ciri AI",
          detaljer: `${currencySymbol}${result.originalAmount?.toFixed(2)} → kr ${result.totalBelop?.toLocaleString("nb-NO")} (kurs ${result.exchangeRate?.toFixed(2)})`
        });
      }

      // Add auto-booking entry if complete
      if (hasCompleteInfo && !isForeign) {
        revisjonslogg.push({
          timestamp: new Date().toISOString(),
          handling: "Automatisk bokført",
          bruker: "Ciri AI",
          detaljer: `Konto ${result.kontonummer}, MVA-kode ${result.mvaKode}`
        });
      }

      const newBilag: Bilag = {
        id: Date.now().toString(),
        bilagsnummer: result.bilagsnummer || nextBilagNumber,
        bilagstype: result.bilagstype || "inngaende_faktura",
        bilagsdato: result.bilagsdato || new Date().toISOString().split("T")[0],
        registreringsdato: new Date().toISOString().split("T")[0],
        forfallsdato: result.forfallsdato,
        leverandor: result.leverandor || "Ukjent",
        leverandorOrgnr: result.leverandorOrgnr,
        leverandorAdresse: result.leverandorAdresse,
        leverandorDomain: result.leverandorDomain,
        beskrivelse: result.beskrivelse || "",
        belopEksMva: result.belopEksMva || 0,
        mvaGrunnlag: result.mvaGrunnlag || 0,
        mvaBelop: result.mvaBelop || 0,
        mvaSats: result.mvaSats || 0,
        mvaKode: result.mvaKode || "",
        totalBelop: result.totalBelop || 0,
        valuta: "NOK",
        originalCurrency: result.originalCurrency,
        originalAmount: result.originalAmount,
        exchangeRate: result.exchangeRate,
        exchangeRateDate: result.exchangeRateDate,
        vatTreatment: result.vatTreatment,
        kontonummer: result.kontonummer || "",
        kontonavn: result.kontonavn || "Ikke kategorisert",
        status: result.status || "trenger_gjennomgang",
        ciriKonfidans: result.ciriKonfidans,
        posteringsreferanse: result.posteringsreferanse,
        oppbevaringsfrist: "2030-12-31",
        originalFilnavn: result.originalFilnavn,
        originalFiltype: result.originalFiltype,
        originalFilUrl: result.originalFilUrl,
        opprettetAv: "Ciri AI",
        missingFields: result.missingFields,
        ciriMessage: result.ciriMessage,
        summary: result.summary,
        ciriExplanation: result.ciriExplanation,
        revisjonslogg
      };

      onUpload(newBilag);

      // Get vendor logo URL from Brandfetch
      const vendorDomain = result.leverandorDomain || findDomainFromSupplier({
        name: result.leverandor,
        website: invoice.supplier.website,
        email: invoice.supplier.email
      });
      const vendorLogoUrl = vendorDomain ? getLogoUrl(vendorDomain) : null;

      toast.success(
        <CiriSuccessToast
          vendor={result.leverandor || "Ukjent"}
          amount={`kr ${result.totalBelop?.toLocaleString("nb-NO")}`}
          vendorLogo={vendorLogoUrl}
        />,
        {
          id: toastId,
          description: hasCompleteInfo ? "Automatisk bokført \u2713" : "Trenger gjennomgang",
          duration: 5000,
        }
      );

    } catch (error) {
      console.error("OCR error:", error);
      toast.error(
        <CiriErrorToast
          fileName={fileName}
          error={error instanceof Error ? error.message : "Ukjent feil"}
        />,
        {
          id: toastId,
          duration: 8000,
        }
      );
    }
  };

  const handleConfirm = () => {
    if (ocrResult) {
      // Build revision log with currency conversion if applicable
      const revisjonslogg: RevisionEntry[] = [
        {
          timestamp: new Date().toISOString(),
          handling: "Lastet opp",
          bruker: "Bruker"
        },
        {
          timestamp: new Date().toISOString(),
          handling: "OCR-behandlet av Ciri",
          bruker: "Ciri AI",
          detaljer: `Konfidans: ${ocrResult.ciriKonfidans}%`
        }
      ];

      // Add currency conversion entry if applicable
      if (ocrResult.originalCurrency && ocrResult.originalCurrency !== "NOK") {
        const currencySymbol = CURRENCIES[ocrResult.originalCurrency]?.symbol || ocrResult.originalCurrency;
        revisjonslogg.push({
          timestamp: new Date().toISOString(),
          handling: "Valutakonvertering",
          bruker: "Ciri AI",
          detaljer: `${currencySymbol}${ocrResult.originalAmount?.toFixed(2)} → kr ${ocrResult.totalBelop?.toLocaleString("nb-NO")} (kurs ${ocrResult.exchangeRate?.toFixed(2)})`
        });
      }

      const newBilag: Bilag = {
        id: Date.now().toString(),
        bilagsnummer: ocrResult.bilagsnummer || nextBilagNumber,
        bilagstype: ocrResult.bilagstype || "inngaende_faktura",
        bilagsdato: ocrResult.bilagsdato || new Date().toISOString().split("T")[0],
        registreringsdato: new Date().toISOString().split("T")[0],
        forfallsdato: ocrResult.forfallsdato,
        leverandor: ocrResult.leverandor || "Ukjent",
        leverandorOrgnr: ocrResult.leverandorOrgnr,
        leverandorAdresse: ocrResult.leverandorAdresse,
        leverandorDomain: ocrResult.leverandorDomain,
        beskrivelse: ocrResult.beskrivelse || "",
        belopEksMva: ocrResult.belopEksMva || 0,
        mvaGrunnlag: ocrResult.mvaGrunnlag || 0,
        mvaBelop: ocrResult.mvaBelop || 0,
        mvaSats: ocrResult.mvaSats || 0,
        mvaKode: ocrResult.mvaKode || "",
        totalBelop: ocrResult.totalBelop || 0,
        valuta: "NOK",
        // Currency conversion fields
        originalCurrency: ocrResult.originalCurrency,
        originalAmount: ocrResult.originalAmount,
        exchangeRate: ocrResult.exchangeRate,
        exchangeRateDate: ocrResult.exchangeRateDate,
        vatTreatment: ocrResult.vatTreatment,
        kontonummer: ocrResult.kontonummer || "",
        kontonavn: ocrResult.kontonavn || "Ikke kategorisert",
        status: ocrResult.status || "trenger_gjennomgang",
        ciriKonfidans: ocrResult.ciriKonfidans,
        oppbevaringsfrist: "2030-12-31",
        originalFilnavn: ocrResult.originalFilnavn,
        originalFiltype: ocrResult.originalFiltype,
        originalFilUrl: ocrResult.originalFilUrl,
        opprettetAv: "Ciri AI",
        missingFields: ocrResult.missingFields,
        ciriMessage: ocrResult.ciriMessage,
        summary: ocrResult.summary,
        ciriExplanation: ocrResult.ciriExplanation,
        revisjonslogg
      };
      onUpload(newBilag);
      resetDialog();
    }
  };

  const resetDialog = () => {
    setFile(null);
    setIsProcessing(false);
    setProgress(0);
    setOcrResult(null);
    setStep("upload");
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) resetDialog(); }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UploadIcon className="size-5" />
            Last opp bilag
          </DialogTitle>
          <DialogDescription>
            Last opp en faktura, kvittering eller annet bilag. Ciri vil automatisk lese og kategorisere dokumentet.
          </DialogDescription>
        </DialogHeader>

        <AnimatePresence mode="wait">
          {step === "upload" && (
            <motion.div
              key="upload"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-4"
            >
              {/* Ollama Status Banner */}
              {ollamaStatus.checked && (
                <div className={cn(
                  "rounded-lg border p-3 flex items-start gap-3",
                  ollamaStatus.available
                    ? "border-green-200 bg-green-50 dark:border-green-900/30 dark:bg-green-900/10"
                    : "border-amber-200 bg-amber-50 dark:border-amber-900/30 dark:bg-amber-900/10"
                )}>
                  {ollamaStatus.available ? (
                    <>
                      <CheckCircle2Icon className="size-5 text-green-600 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-green-800 dark:text-green-400">
                          Qwen2.5-VL klar
                        </p>
                        <p className="text-xs text-green-700 dark:text-green-500">
                          Bruker lokal AI ({ollamaStatus.model}) for høy-presisjon OCR
                        </p>
                      </div>
                    </>
                  ) : (
                    <>
                      <AlertCircleIcon className="size-5 text-amber-600 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-amber-800 dark:text-amber-400">
                          Ollama ikke tilgjengelig
                        </p>
                        <p className="text-xs text-amber-700 dark:text-amber-500 mb-2">
                          Bruker demo-modus. For ekte OCR, installer Ollama:
                        </p>
                        <div className="bg-gray-900 rounded p-2 text-xs font-mono text-green-400 space-y-1">
                          <p>curl -fsSL https://ollama.com/install.sh | sh</p>
                          <p>ollama pull qwen2.5vl:7b</p>
                          <p>ollama serve</p>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}

              <div
                onDrop={handleDrop}
                onDragOver={(e) => e.preventDefault()}
                onClick={() => fileInputRef.current?.click()}
                className={cn(
                  "flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 transition-colors cursor-pointer",
                  file ? "border-[var(--primary)] bg-[var(--primary)]/5" : "border-muted-foreground/25 hover:border-[var(--primary)]/50"
                )}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                {file ? (
                  <>
                    <FileTextIcon className="size-12 text-[var(--primary)]" />
                    <p className="mt-2 font-medium">{file.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {(file.size / 1024).toFixed(1)} KB
                    </p>
                  </>
                ) : (
                  <>
                    <UploadIcon className="size-12 text-muted-foreground" />
                    <p className="mt-2 font-medium">Dra og slipp fil her</p>
                    <p className="text-sm text-muted-foreground">eller klikk for å velge</p>
                    <p className="mt-2 text-xs text-muted-foreground">PDF, JPG eller PNG</p>
                  </>
                )}
              </div>

              {file && (
                <Button onClick={startProcessing} className="w-full">
                  <SparklesIcon className="mr-2 size-4" />
                  Last opp bilag til Ciri
                </Button>
              )}
            </motion.div>
          )}

          {step === "processing" && (
            <motion.div
              key="processing"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="flex flex-col items-center py-8 space-y-4"
            >
              <div className="relative">
                <CiriLogo size="lg" />
                <motion.div
                  className="absolute inset-0 rounded-full border-2 border-[var(--primary)]"
                  animate={{ scale: [1, 1.2, 1], opacity: [1, 0, 1] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                />
              </div>
              <div className="text-center">
                <p className="font-medium">
                  {ollamaStatus.available ? "Qwen2.5-VL analyserer..." : "Ciri behandler bilaget..."}
                </p>
                <p className="text-sm text-muted-foreground">
                  {progressMessage || "Leser og kategoriserer dokumentet"}
                </p>
              </div>
              <div className="w-full max-w-xs">
                <Progress value={progress} className="h-2" />
                <p className="mt-2 text-center text-sm text-muted-foreground">{progress}%</p>
              </div>
              {ollamaStatus.available && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <div className="size-2 rounded-full bg-green-500 animate-pulse" />
                  Lokal AI - data forlater ikke maskinen
                </div>
              )}
            </motion.div>
          )}

          {step === "result" && ocrResult && (
            <motion.div
              key="result"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-4"
            >
              {/* Status banner */}
              <div className={cn(
                "rounded-lg border p-4",
                ocrResult.status === "venter" ? "border-green-200 bg-green-50" : "border-amber-200 bg-amber-50"
              )}>
                <div className="flex items-start gap-3">
                  <CiriLogo size="sm" className="shrink-0" />
                  <div>
                    <p className="font-medium">
                      {ocrResult.status === "venter" ? (
                        <span className="text-green-700 flex items-center gap-2">
                          <CheckIcon className="size-4" /> Alle felt oppdaget!
                        </span>
                      ) : (
                        <span className="text-amber-700 flex items-center gap-2">
                          <AlertTriangleIcon className="size-4" /> Noen felt mangler
                        </span>
                      )}
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">{ocrResult.ciriMessage}</p>
                  </div>
                </div>
              </div>

              {/* Currency Conversion Box - for foreign invoices */}
              {ocrResult.originalCurrency && ocrResult.originalCurrency !== "NOK" && (
                <div className="rounded-lg border-2 border-blue-200 bg-blue-50/50 p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Badge variant="outline" className="bg-blue-100 text-blue-700 border-blue-300">
                      Utenlandsk faktura
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      Kurs: 1 {ocrResult.originalCurrency} = {ocrResult.exchangeRate?.toFixed(2)} NOK
                    </span>
                  </div>

                  {/* Original -> Converted display */}
                  <div className="flex items-center justify-center gap-3 py-2">
                    {/* Original Amount */}
                    <div className="flex flex-col items-center rounded-lg border-2 border-dashed border-gray-300 bg-white px-4 py-2">
                      <span className="text-xs text-muted-foreground">Original</span>
                      <span className="font-display text-lg font-bold text-gray-700">
                        {formatCurrency(ocrResult.originalAmount || 0, ocrResult.originalCurrency)}
                      </span>
                    </div>

                    {/* Arrow */}
                    <div className="text-xl text-blue-500">&rarr;</div>

                    {/* Converted Amount */}
                    <div className="flex flex-col items-center rounded-lg border-2 border-[var(--primary)] bg-[var(--primary)]/5 px-4 py-2">
                      <span className="text-xs text-muted-foreground">Bokført</span>
                      <span className="font-display text-lg font-bold text-[var(--primary)]">
                        kr {ocrResult.totalBelop?.toLocaleString("nb-NO")}
                      </span>
                    </div>
                  </div>

                  {/* VAT treatment notice */}
                  {ocrResult.vatTreatment && (
                    <div className="mt-3 flex items-start gap-2 rounded bg-amber-50 p-2 border border-amber-200">
                      <AlertTriangleIcon className="size-4 text-amber-600 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs font-medium text-amber-800">
                          {ocrResult.vatTreatment.vatCodeDescription}
                        </p>
                        <p className="text-xs text-amber-700 mt-0.5">
                          Ingen inngående MVA på utenlandske fakturaer
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Detected values */}
              <div className="rounded-lg border p-4 space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Leverandør</span>
                  <span className={cn("font-medium", ocrResult.missingFields?.leverandor && "text-red-500")}>
                    {ocrResult.leverandor}
                  </span>
                </div>
                {ocrResult.leverandorOrgnr && (
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Org.nr</span>
                    <span className="font-mono text-sm">{ocrResult.leverandorOrgnr}</span>
                  </div>
                )}
                <Separator />
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Beløp eks. MVA</span>
                  <span className="font-display">kr {ocrResult.belopEksMva?.toLocaleString("nb-NO")}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">
                    MVA {ocrResult.originalCurrency && ocrResult.originalCurrency !== "NOK"
                      ? "(ikke aktuelt)"
                      : `(${ocrResult.mvaSats}%)`}
                  </span>
                  <span className="font-display">kr {ocrResult.mvaBelop?.toLocaleString("nb-NO")}</span>
                </div>
                <Separator />
                <div className="flex justify-between">
                  <span className="font-medium">Total bokført</span>
                  <span className="font-display font-bold text-[var(--primary)]">
                    kr {ocrResult.totalBelop?.toLocaleString("nb-NO")}
                  </span>
                </div>
                <Separator />
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Konto</span>
                  <span className={cn("font-mono", ocrResult.missingFields?.kontonummer && "text-red-500 italic")}>
                    {ocrResult.kontonummer || "Må velges"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">MVA-kode</span>
                  <span className={cn("font-mono", !ocrResult.mvaKode && ocrResult.missingFields?.mvaKode && "text-red-500 italic")}>
                    {ocrResult.mvaKode || "Må velges"}
                    {ocrResult.originalCurrency && ocrResult.originalCurrency !== "NOK" && ocrResult.mvaKode && (
                      <span className="text-xs text-muted-foreground ml-1">(snudd avg.)</span>
                    )}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <SparklesIcon className="size-4 text-[var(--primary)]" />
                Konfidans: {ocrResult.ciriKonfidans}%
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {step === "result" && (
          <DialogFooter>
            <Button variant="outline" onClick={resetDialog}>
              Last opp ny
            </Button>
            <Button onClick={handleConfirm}>
              {ocrResult?.status === "venter" ? "Lagre og vurder" : "Lagre (ufullstendig)"}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default UploadBilagDialog;
