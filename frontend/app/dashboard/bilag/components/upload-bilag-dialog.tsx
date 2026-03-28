"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  FileTextIcon,
  CheckCircle2Icon,
  AlertCircleIcon,
  SparklesIcon,
  UploadIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { parseInvoice, determineVATTreatment } from "@/lib/invoice-ocr";
import { convertToNOK, requiresConversion } from "@/lib/currency-conversion";
import { checkOllamaStatus } from "@/lib/ollama-ocr";
import { toast } from "sonner";
import { CiriLoadingToast, CiriSuccessToast, CiriErrorToast } from "@/components/ciri-loading-toast";
import { getLogoUrl, findDomainFromSupplier } from "@/lib/brandfetch";
import { API_BASE_URL, COMPANY_ID } from "@/lib/api";

interface UploadBilagDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUploaded: () => void;
}

function UploadBilagDialog({
  open,
  onOpenChange,
  onUploaded,
}: UploadBilagDialogProps) {
  const [file, setFile] = useState<File | null>(null);
  const [ocrStatus, setOcrStatus] = useState<{
    checked: boolean;
    available: boolean;
    model?: string;
    error?: string;
  }>({ checked: false, available: false });
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Check OCR status when dialog opens
  useEffect(() => {
    if (open && !ocrStatus.checked) {
      checkOllamaStatus().then((status) => {
        setOcrStatus({
          checked: true,
          available: status.available,
          model: status.model,
          error: status.error,
        });
      });
    }
  }, [open, ocrStatus.checked]);

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

  const loadingMessages = [
    "Leser dokumentet...",
    "Identifiserer leverandør...",
    "Verifiserer alle feltene...",
    "Sjekker MVA-informasjon...",
    "Passer på at alt stemmer...",
    "Kategoriserer bilaget...",
    "Nesten ferdig...",
  ];

  const resetDialog = () => {
    setFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const startProcessing = () => {
    if (!file) return;
    processInvoiceWithFile(file);
  };

  const processInvoiceWithFile = async (fileToProcess: File) => {
    const fileName = fileToProcess.name;
    onOpenChange(false);
    resetDialog();

    const toastId = toast(
      <CiriLoadingToast
        fileName={fileName}
        messages={loadingMessages}
        messageInterval={3500}
      />,
      { duration: Infinity }
    );

    const safetyTimeout = setTimeout(() => {
      toast.error(
        <CiriErrorToast fileName={fileName} error="Tidsavbrudd — prøv igjen" />,
        { id: toastId, duration: 8000 }
      );
    }, 90_000);

    try {
      // Step 1: OCR — extract invoice data
      const ocrResponse = await parseInvoice(fileToProcess, { onProgress: () => {} });
      if (!ocrResponse.success || !ocrResponse.invoice) {
        throw new Error(ocrResponse.error || "OCR-behandling mislyktes");
      }

      const invoice = ocrResponse.invoice;
      const vatTreatment = determineVATTreatment(invoice);
      const isForeign = requiresConversion(invoice.currency);

      // Step 2: Currency conversion if needed
      let grossAmount = Math.round(invoice.totalAmount);
      let netAmount = Math.round(invoice.totalNet);
      let mvaAmount = isForeign ? 0 : Math.round(invoice.totalTax);
      let originalCurrency: string | undefined;
      let originalAmount: number | undefined;
      let exchangeRate: number | undefined;
      let exchangeRateDate: string | undefined;

      if (isForeign) {
        const conversion = await convertToNOK(invoice.totalAmount, invoice.currency, invoice.invoiceDate);
        grossAmount = Math.round(conversion.convertedAmount);
        netAmount = grossAmount;
        originalCurrency = invoice.currency;
        originalAmount = invoice.totalAmount;
        exchangeRate = conversion.exchangeRate;
        exchangeRateDate = conversion.rateDate;
      }

      const hasVendor = invoice.supplier.name && invoice.supplier.name.length > 0;
      const hasCompleteInfo = hasVendor && invoice.confidence >= 80;
      const mvaCode = isForeign ? vatTreatment.vatCode
        : (invoice.taxRate === 25 ? "1" : invoice.taxRate === 15 ? "11" : invoice.taxRate === 12 ? "13" : "0");

      const description = invoice.lineItems.length > 0
        ? invoice.lineItems.map(item => item.description).join(", ")
        : "Faktura fra " + (invoice.supplier.name || "ukjent leverandør");

      const ciriReasoning = [
        invoice.ciriExplanation,
        invoice.summary,
        isForeign ? vatTreatment.explanation : null,
      ].filter(Boolean).join(" | ");

      // Step 3: Save to backend with file
      const formData = new FormData();
      formData.append("file", fileToProcess);
      formData.append("company_id", COMPANY_ID);
      formData.append("description", description);
      formData.append("document_date", invoice.invoiceDate || new Date().toISOString().split("T")[0]);
      formData.append("gross_amount", String(grossAmount));
      formData.append("net_amount", String(netAmount));
      formData.append("mva_amount", String(mvaAmount));
      if (hasCompleteInfo) formData.append("mva_code", mvaCode);
      if (invoice.supplier.name) formData.append("counterparty_name", invoice.supplier.name);
      if (invoice.supplier.companyNumber) formData.append("counterparty_org_number", invoice.supplier.companyNumber);
      if (hasCompleteInfo) {
        formData.append("category", "Programvare");
        formData.append("suggested_account", "6540");
      }
      formData.append("ciri_confidence", String(invoice.confidence / 100));
      if (ciriReasoning) formData.append("ciri_reasoning", ciriReasoning);
      if (originalCurrency) formData.append("original_currency", originalCurrency);
      if (originalAmount != null) formData.append("original_amount", String(originalAmount));
      if (exchangeRate != null) formData.append("exchange_rate", String(exchangeRate));
      if (exchangeRateDate) formData.append("exchange_rate_date", exchangeRateDate);

      const saveResponse = await fetch(`${API_BASE_URL}/api/bilag/upload`, {
        method: "POST",
        body: formData,
      });

      if (!saveResponse.ok) {
        const err = await saveResponse.json().catch(() => ({ detail: "Lagring feilet" }));
        throw new Error(err.detail || "Kunne ikke lagre bilag");
      }

      clearTimeout(safetyTimeout);

      // Step 4: Tell parent to refetch from DB
      onUploaded();

      const vendorDomain = findDomainFromSupplier({
        name: invoice.supplier.name,
        website: invoice.supplier.website,
        email: invoice.supplier.email
      });
      const vendorLogoUrl = vendorDomain ? getLogoUrl(vendorDomain) : null;

      toast.success(
        <CiriSuccessToast
          vendor={invoice.supplier.name || "Ukjent"}
          amount={`kr ${grossAmount.toLocaleString("nb-NO")}`}
          vendorLogo={vendorLogoUrl}
        />,
        {
          id: toastId,
          description: hasCompleteInfo ? "Automatisk bokført \u2713" : "Trenger gjennomgang",
          duration: 5000,
        }
      );

    } catch (error) {
      clearTimeout(safetyTimeout);
      console.error("OCR error:", error);
      toast.error(
        <CiriErrorToast
          fileName={fileName}
          error={error instanceof Error ? error.message : "Ukjent feil"}
        />,
        { id: toastId, duration: 8000 }
      );
    }
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

        <div className="space-y-4">
          {/* OCR Status Banner */}
          {ocrStatus.checked && (
            <div className={cn(
              "rounded-lg border p-3 flex items-start gap-3",
              ocrStatus.available
                ? "border-green-200 bg-green-50 dark:border-green-900/30 dark:bg-green-900/10"
                : "border-amber-200 bg-amber-50 dark:border-amber-900/30 dark:bg-amber-900/10"
            )}>
              {ocrStatus.available ? (
                <>
                  <CheckCircle2Icon className="size-5 text-green-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-green-800 dark:text-green-400">
                      Ciri OCR klar
                    </p>
                    <p className="text-xs text-green-700 dark:text-green-500">
                      Bruker {ocrStatus.model} for høy-presisjon dokumentanalyse
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <AlertCircleIcon className="size-5 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-amber-800 dark:text-amber-400">
                      OCR ikke tilgjengelig
                    </p>
                    <p className="text-xs text-amber-700 dark:text-amber-500">
                      {ocrStatus.error || "Sjekk at backend kjører og API-nøkkel er konfigurert."}
                    </p>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Drop zone */}
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
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default UploadBilagDialog;
