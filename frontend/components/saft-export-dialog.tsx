"use client";

import { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DownloadIcon,
  FileTextIcon,
  CheckCircle2Icon,
  AlertTriangleIcon,
  XCircleIcon,
  ShieldCheckIcon,
  SparklesIcon,
  Loader2Icon,
  CalendarIcon,
  BuildingIcon,
  FileCheckIcon,
  SendIcon,
  ScaleIcon,
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import {
  generateSAFTXML,
  downloadSAFTFile,
  validateSAFTData,
  type SAFTExportOptions,
  type SAFTValidationResult,
} from "@/lib/saft-generator";
import CiriLogo from "@/components/layout/ciri-logo";

interface SAFTExportDialogProps {
  children: React.ReactNode;
  /** If true, user has given blanket consent during onboarding for autonomous mode */
  hasAutonomousConsent?: boolean;
}

// Demo company data
const demoCompany = {
  organizationNumber: "923456789",
  name: "Demo Konsulenter AS",
  address: {
    streetName: "Storgata",
    number: "15",
    postalCode: "0182",
    city: "Oslo",
    country: "NO",
  },
  contact: {
    name: "Ola Nordmann",
    phone: "+47 22 33 44 55",
    email: "post@demokonsulenter.no",
  },
};

// Standard Norwegian chart of accounts (NS 4102)
const demoAccounts = [
  { accountId: "1500", accountDescription: "Kundefordringer", standardAccountId: "1500", accountType: "AR" as const, closingDebitBalance: 125000 },
  { accountId: "1920", accountDescription: "Bankinnskudd", standardAccountId: "1920", accountType: "GL" as const, closingDebitBalance: 360000 },
  { accountId: "2400", accountDescription: "Leverandørgjeld", standardAccountId: "2400", accountType: "AP" as const, closingCreditBalance: 85000 },
  { accountId: "2700", accountDescription: "Utgående MVA", standardAccountId: "2700", accountType: "GL" as const, closingCreditBalance: 45230 },
  { accountId: "2710", accountDescription: "Inngående MVA", standardAccountId: "2710", accountType: "GL" as const, closingDebitBalance: 21780 },
  { accountId: "3000", accountDescription: "Salgsinntekt, avgiftspliktig", standardAccountId: "3000", accountType: "GL" as const, closingCreditBalance: 181000 },
  { accountId: "6300", accountDescription: "Leie lokaler", standardAccountId: "6300", accountType: "GL" as const, closingDebitBalance: 37000 },
  { accountId: "6500", accountDescription: "Verktøy, inventar og driftsmateriale", standardAccountId: "6500", accountType: "GL" as const, closingDebitBalance: 13200 },
  { accountId: "6800", accountDescription: "Kontorrekvisita", standardAccountId: "6800", accountType: "GL" as const, closingDebitBalance: 4400 },
  { accountId: "6900", accountDescription: "Telefon", standardAccountId: "6900", accountType: "GL" as const, closingDebitBalance: 3780 },
  { accountId: "7100", accountDescription: "Bilkostnader", standardAccountId: "7100", accountType: "GL" as const, closingDebitBalance: 1650 },
  { accountId: "7350", accountDescription: "Representasjon, fradragsberettiget", standardAccountId: "7350", accountType: "GL" as const, closingDebitBalance: 2200 },
];

const demoCustomers = [
  { customerId: "K001", name: "Norsk Industri AS", organizationNumber: "987654321", address: { postalCode: "0150", city: "Oslo", country: "NO" } },
  { customerId: "K002", name: "TechStart Bergen AS", organizationNumber: "876543210", address: { postalCode: "5003", city: "Bergen", country: "NO" } },
  { customerId: "K003", name: "Stavanger Kommune", organizationNumber: "964965226", address: { postalCode: "4005", city: "Stavanger", country: "NO" } },
  { customerId: "K004", name: "Maritim Solutions AS", organizationNumber: "912345678", address: { postalCode: "6003", city: "Ålesund", country: "NO" } },
  { customerId: "K005", name: "Fjord Shipping AS", organizationNumber: "923456780", address: { postalCode: "5527", city: "Haugesund", country: "NO" } },
];

const demoSuppliers = [
  { supplierId: "L001", name: "Staples Norway AS", organizationNumber: "914778271", address: { postalCode: "0213", city: "Oslo", country: "NO" } },
  { supplierId: "L002", name: "Telenor ASA", organizationNumber: "982463718", address: { postalCode: "1360", city: "Fornebu", country: "NO" } },
  { supplierId: "L003", name: "Circle K Norge", organizationNumber: "914048898", address: { postalCode: "0167", city: "Oslo", country: "NO" } },
  { supplierId: "L004", name: "Microsoft Norge AS", organizationNumber: "965314583", address: { postalCode: "0277", city: "Oslo", country: "NO" } },
  { supplierId: "L005", name: "Entra Eiendom AS", organizationNumber: "997063371", address: { postalCode: "0104", city: "Oslo", country: "NO" } },
];

const demoTaxCodes = [
  { taxCode: "1", description: "Innenlands omsetning, 25%", taxPercentage: 25, country: "NO", standardTaxCode: "3", taxType: "MVA" as const },
  { taxCode: "11", description: "Innenlands kjøp, 25%", taxPercentage: 25, country: "NO", standardTaxCode: "1", taxType: "MVA" as const },
  { taxCode: "3", description: "Innenlands omsetning, 15% (mat)", taxPercentage: 15, country: "NO", standardTaxCode: "31", taxType: "MVA" as const },
  { taxCode: "5", description: "Innenlands omsetning, 12% (transport)", taxPercentage: 12, country: "NO", standardTaxCode: "32", taxType: "MVA" as const },
  { taxCode: "6", description: "MVA-fri omsetning", taxPercentage: 0, country: "NO", standardTaxCode: "5", taxType: "MVA" as const },
  { taxCode: "0", description: "Ingen MVA-behandling", taxPercentage: 0, country: "NO", standardTaxCode: "0", taxType: "Ingen" as const },
];

// Demo transactions for the period
const demoTransactions = [
  {
    transactionId: "2025-11-001",
    period: "202511",
    transactionDate: "2025-11-03",
    description: "Faktura 2025-0089 - Norsk Industri AS",
    systemEntryDate: "2025-11-03",
    glPostingDate: "2025-11-03",
    lines: [
      { recordId: "1", accountId: "1500", customerId: "K001", description: "Kundefordring", debitAmount: 56250 },
      { recordId: "2", accountId: "3000", description: "Salgsinntekt", creditAmount: 45000, taxCode: "1", taxAmount: 11250 },
      { recordId: "3", accountId: "2700", description: "Utgående MVA 25%", creditAmount: 11250 },
    ],
  },
  {
    transactionId: "2025-11-002",
    period: "202511",
    transactionDate: "2025-11-05",
    description: "Bilag B-2025-0413 - Telenor ASA",
    systemEntryDate: "2025-11-05",
    glPostingDate: "2025-11-05",
    lines: [
      { recordId: "1", accountId: "6900", description: "Telefon", debitAmount: 1890, taxCode: "11", taxAmount: 472 },
      { recordId: "2", accountId: "2710", description: "Inngående MVA 25%", debitAmount: 472 },
      { recordId: "3", accountId: "2400", supplierId: "L002", description: "Leverandørgjeld", creditAmount: 2362 },
    ],
  },
  {
    transactionId: "2025-11-003",
    period: "202511",
    transactionDate: "2025-11-08",
    description: "Faktura 2025-0090 - TechStart Bergen AS",
    systemEntryDate: "2025-11-08",
    glPostingDate: "2025-11-08",
    lines: [
      { recordId: "1", accountId: "1500", customerId: "K002", description: "Kundefordring", debitAmount: 47500 },
      { recordId: "2", accountId: "3000", description: "Salgsinntekt", creditAmount: 38000, taxCode: "1", taxAmount: 9500 },
      { recordId: "3", accountId: "2700", description: "Utgående MVA 25%", creditAmount: 9500 },
    ],
  },
  {
    transactionId: "2025-11-004",
    period: "202511",
    transactionDate: "2025-11-12",
    description: "Bilag B-2025-0415 - Microsoft Norge AS",
    systemEntryDate: "2025-11-12",
    glPostingDate: "2025-11-12",
    lines: [
      { recordId: "1", accountId: "6500", description: "IT-tjenester", debitAmount: 8400, taxCode: "11", taxAmount: 2100 },
      { recordId: "2", accountId: "2710", description: "Inngående MVA 25%", debitAmount: 2100 },
      { recordId: "3", accountId: "2400", supplierId: "L004", description: "Leverandørgjeld", creditAmount: 10500 },
    ],
  },
  {
    transactionId: "2025-11-005",
    period: "202511",
    transactionDate: "2025-11-15",
    description: "Bilag B-2025-0416 - Entra Eiendom AS (Husleie)",
    systemEntryDate: "2025-11-15",
    glPostingDate: "2025-11-15",
    lines: [
      { recordId: "1", accountId: "6300", description: "Husleie", debitAmount: 18500, taxCode: "11", taxAmount: 4625 },
      { recordId: "2", accountId: "2710", description: "Inngående MVA 25%", debitAmount: 4625 },
      { recordId: "3", accountId: "2400", supplierId: "L005", description: "Leverandørgjeld", creditAmount: 23125 },
    ],
  },
  {
    transactionId: "2025-12-001",
    period: "202512",
    transactionDate: "2025-12-02",
    description: "Faktura 2025-0093 - Fjord Shipping AS",
    systemEntryDate: "2025-12-02",
    glPostingDate: "2025-12-02",
    lines: [
      { recordId: "1", accountId: "1500", customerId: "K005", description: "Kundefordring", debitAmount: 22500 },
      { recordId: "2", accountId: "3000", description: "Salgsinntekt", creditAmount: 18000, taxCode: "1", taxAmount: 4500 },
      { recordId: "3", accountId: "2700", description: "Utgående MVA 25%", creditAmount: 4500 },
    ],
  },
  {
    transactionId: "2025-12-002",
    period: "202512",
    transactionDate: "2025-12-15",
    description: "Bilag B-2025-0423 - Entra Eiendom AS (Husleie)",
    systemEntryDate: "2025-12-15",
    glPostingDate: "2025-12-15",
    lines: [
      { recordId: "1", accountId: "6300", description: "Husleie", debitAmount: 18500, taxCode: "11", taxAmount: 4625 },
      { recordId: "2", accountId: "2710", description: "Inngående MVA 25%", debitAmount: 4625 },
      { recordId: "3", accountId: "2400", supplierId: "L005", description: "Leverandørgjeld", creditAmount: 23125 },
    ],
  },
];

type ExportStep = "select" | "validating" | "validated" | "exporting" | "complete";

export function SAFTExportDialog({ children, hasAutonomousConsent = true }: SAFTExportDialogProps) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<ExportStep>("select");
  const [selectedYear, setSelectedYear] = useState("2025");
  const [selectedPeriod, setSelectedPeriod] = useState("6"); // 6th termin (Nov-Dec)
  const [validationResult, setValidationResult] = useState<SAFTValidationResult | null>(null);
  const [progress, setProgress] = useState(0);
  const [authorized, setAuthorized] = useState(false);

  // If user has given blanket consent during onboarding, they don't need per-filing consent
  const needsPerFilingConsent = !hasAutonomousConsent;

  const periodOptions = [
    { value: "full", label: "Hele året", start: "01-01", end: "12-31" },
    { value: "1", label: "1. termin (Jan-Feb)", start: "01-01", end: "02-28" },
    { value: "2", label: "2. termin (Mar-Apr)", start: "03-01", end: "04-30" },
    { value: "3", label: "3. termin (Mai-Jun)", start: "05-01", end: "06-30" },
    { value: "4", label: "4. termin (Jul-Aug)", start: "07-01", end: "08-31" },
    { value: "5", label: "5. termin (Sep-Okt)", start: "09-01", end: "10-31" },
    { value: "6", label: "6. termin (Nov-Des)", start: "11-01", end: "12-31" },
  ];

  const selectedPeriodData = periodOptions.find((p) => p.value === selectedPeriod)!;

  const exportOptions: SAFTExportOptions = useMemo(
    () => ({
      company: demoCompany,
      periodStart: `${selectedYear}-${selectedPeriodData.start}`,
      periodEnd: `${selectedYear}-${selectedPeriodData.end}`,
      selectionStartDate: `${selectedYear}-${selectedPeriodData.start}`,
      selectionEndDate: `${selectedYear}-${selectedPeriodData.end}`,
      accounts: demoAccounts,
      customers: demoCustomers,
      suppliers: demoSuppliers,
      taxCodes: demoTaxCodes,
      transactions: demoTransactions.filter((t) => {
        const period = selectedPeriod;
        if (period === "full") return true;
        const month = parseInt(t.transactionDate.split("-")[1]);
        const periodNum = parseInt(period);
        const startMonth = (periodNum - 1) * 2 + 1;
        const endMonth = periodNum * 2;
        return month >= startMonth && month <= endMonth;
      }),
      softwareCompanyName: "Ciri AI",
      softwareId: "CIRI",
      softwareVersion: "1.0.0",
    }),
    [selectedYear, selectedPeriod, selectedPeriodData]
  );

  const handleValidate = async () => {
    setStep("validating");
    setProgress(0);

    // Simulate validation process
    for (let i = 0; i <= 100; i += 10) {
      await new Promise((r) => setTimeout(r, 100));
      setProgress(i);
    }

    const result = validateSAFTData(exportOptions);
    setValidationResult(result);
    setStep("validated");
  };

  const handleExport = async () => {
    setStep("exporting");
    setProgress(0);

    // Simulate export process
    for (let i = 0; i <= 100; i += 5) {
      await new Promise((r) => setTimeout(r, 50));
      setProgress(i);
    }

    const xml = generateSAFTXML(exportOptions);
    const filename = `SAF-T_${demoCompany.organizationNumber}_${selectedYear}_${selectedPeriod === "full" ? "FULL" : `T${selectedPeriod}`}.xml`;
    downloadSAFTFile(xml, filename);

    setStep("complete");
  };

  const handleReset = () => {
    setStep("select");
    setValidationResult(null);
    setProgress(0);
    setAuthorized(false);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) handleReset(); }}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileTextIcon className="size-5" />
            SAF-T Rapportering
          </DialogTitle>
          <DialogDescription>
            Ciri genererer og sender SAF-T v1.30 til Skatteetaten via Altinn
          </DialogDescription>
        </DialogHeader>

        {/* Step: Select Period */}
        {step === "select" && (
          <div className="space-y-6">
            <div className="flex gap-3 rounded-lg border border-[var(--primary)]/20 bg-[var(--primary)]/5 p-4">
              <CiriLogo size="sm" />
              <div className="text-sm">
                <p className="font-medium text-[var(--primary)]">Ciri har forberedt SAF-T rapportering</p>
                <p className="mt-1 text-muted-foreground">
                  Velg periode for validering. Etter din godkjenning sender Ciri filen til Skatteetaten via Altinn.
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">År</label>
                <Select value={selectedYear} onValueChange={setSelectedYear}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="2025">2025</SelectItem>
                    <SelectItem value="2024">2024</SelectItem>
                    <SelectItem value="2023">2023</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Periode</label>
                <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {periodOptions.map((period) => (
                      <SelectItem key={period.value} value={period.value}>
                        {period.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="rounded-lg border bg-muted/30 p-4">
              <div className="flex items-center gap-2 text-sm font-medium">
                <CalendarIcon className="size-4" />
                Eksportperiode
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                {selectedYear}-{selectedPeriodData.start} til {selectedYear}-{selectedPeriodData.end}
              </p>
              <div className="mt-3 grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-2xl font-bold">{exportOptions.transactions.length}</p>
                  <p className="text-xs text-muted-foreground">Transaksjoner</p>
                </div>
                <div>
                  <p className="text-2xl font-bold">{exportOptions.accounts.length}</p>
                  <p className="text-xs text-muted-foreground">Kontoer</p>
                </div>
                <div>
                  <p className="text-2xl font-bold">{exportOptions.customers.length + exportOptions.suppliers.length}</p>
                  <p className="text-xs text-muted-foreground">Parter</p>
                </div>
              </div>
            </div>

            <Button className="w-full" onClick={handleValidate}>
              <ShieldCheckIcon className="mr-2 size-4" />
              Valider og fortsett
            </Button>
          </div>
        )}

        {/* Step: Validating */}
        {step === "validating" && (
          <div className="space-y-6 py-8 text-center">
            <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-[var(--primary)]/10">
              <Loader2Icon className="size-8 animate-spin text-[var(--primary)]" />
            </div>
            <div>
              <p className="font-medium">Validerer data...</p>
              <p className="text-sm text-muted-foreground">Kontrollerer mot SAF-T v1.30 krav</p>
            </div>
            <Progress value={progress} className="mx-auto max-w-xs" />
          </div>
        )}

        {/* Step: Validated */}
        {step === "validated" && validationResult && (
          <div className="space-y-6">
            {/* Validation Status */}
            {validationResult.valid ? (
              <div className="flex items-center gap-3 rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-900/30 dark:bg-green-900/20">
                <div className="flex size-10 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
                  <CheckCircle2Icon className="size-5 text-green-600" />
                </div>
                <div>
                  <p className="font-medium text-green-800 dark:text-green-200">Validering bestått</p>
                  <p className="text-sm text-green-600 dark:text-green-400">
                    Alle data oppfyller SAF-T v1.30 kravene
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-900/30 dark:bg-red-900/20">
                <div className="flex size-10 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
                  <XCircleIcon className="size-5 text-red-600" />
                </div>
                <div>
                  <p className="font-medium text-red-800 dark:text-red-200">Validering feilet</p>
                  <p className="text-sm text-red-600 dark:text-red-400">
                    {validationResult.errors.length} feil må rettes før eksport
                  </p>
                </div>
              </div>
            )}

            {/* Errors */}
            {validationResult.errors.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium text-red-700">Feil</p>
                <ScrollArea className="max-h-32">
                  <div className="space-y-1">
                    {validationResult.errors.map((error, idx) => (
                      <div key={idx} className="flex items-start gap-2 text-sm">
                        <XCircleIcon className="mt-0.5 size-4 shrink-0 text-red-500" />
                        <span className="text-red-700">{error}</span>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            )}

            {/* Warnings */}
            {validationResult.warnings.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium text-amber-700">Advarsler</p>
                <ScrollArea className="max-h-32">
                  <div className="space-y-1">
                    {validationResult.warnings.map((warning, idx) => (
                      <div key={idx} className="flex items-start gap-2 text-sm">
                        <AlertTriangleIcon className="mt-0.5 size-4 shrink-0 text-amber-500" />
                        <span className="text-muted-foreground">{warning}</span>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            )}

            {/* Export Summary */}
            <div className="rounded-lg border bg-muted/30 p-4">
              <div className="flex items-center gap-2 text-sm font-medium">
                <FileCheckIcon className="size-4" />
                SAF-T fil innhold
              </div>
              <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Firma</span>
                  <span className="font-medium">{demoCompany.name}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Org.nr</span>
                  <span className="font-mono">{demoCompany.organizationNumber}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Format</span>
                  <Badge variant="outline">SAF-T v1.30</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Periode</span>
                  <span className="font-mono">{selectedYear} T{selectedPeriod}</span>
                </div>
              </div>
            </div>

            {/* Legal Authorization - only shown if user hasn't given blanket consent */}
            {validationResult.valid && needsPerFilingConsent && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/30 dark:bg-amber-900/20">
                <div className="flex items-start gap-3">
                  <ScaleIcon className="mt-0.5 size-5 shrink-0 text-amber-600" />
                  <div className="flex-1 space-y-3">
                    <div>
                      <p className="text-sm font-medium text-amber-800 dark:text-amber-200">Lovpålagt godkjenning</p>
                      <p className="mt-1 text-xs text-amber-700 dark:text-amber-300">
                        I henhold til Skatteforvaltningsloven er du som næringsdrivende ansvarlig for innholdet i MVA-meldingen.
                      </p>
                    </div>
                    <div className="flex items-start gap-3">
                      <Checkbox
                        id="authorize"
                        checked={authorized}
                        onCheckedChange={(checked) => setAuthorized(checked === true)}
                        className="mt-0.5"
                      />
                      <label htmlFor="authorize" className="text-sm text-amber-800 dark:text-amber-200 cursor-pointer">
                        Jeg bekrefter at opplysningene er korrekte og gir Ciri fullmakt til å sende SAF-T filen til Skatteetaten på mine vegne.
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Pre-authorized notice - shown when user has given blanket consent */}
            {validationResult.valid && !needsPerFilingConsent && (
              <div className="flex gap-3 rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-900/30 dark:bg-green-900/20">
                <CheckCircle2Icon className="mt-0.5 size-5 shrink-0 text-green-600" />
                <div className="text-sm">
                  <p className="font-medium text-green-800 dark:text-green-200">Forhåndsgodkjent</p>
                  <p className="mt-1 text-green-700 dark:text-green-300">
                    Du har gitt Ciri fullmakt til å sende rapporter i autonom modus. Ciri sender SAF-T filen automatisk etter validering.
                  </p>
                </div>
              </div>
            )}

            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={handleReset}>
                Tilbake
              </Button>
              <Button
                className="flex-1"
                onClick={handleExport}
                disabled={!validationResult.valid || (needsPerFilingConsent && !authorized)}
              >
                <SendIcon className="mr-2 size-4" />
                {needsPerFilingConsent ? "Godkjenn og send" : "Send til Altinn"}
              </Button>
            </div>
          </div>
        )}

        {/* Step: Exporting */}
        {step === "exporting" && (
          <div className="space-y-6 py-8 text-center">
            <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-[var(--primary)]/10">
              <Loader2Icon className="size-8 animate-spin text-[var(--primary)]" />
            </div>
            <div>
              <p className="font-medium">
                {progress < 40 ? "Genererer SAF-T fil..." :
                 progress < 70 ? "Validerer mot Altinn..." :
                 "Sender til Skatteetaten..."}
              </p>
              <p className="text-sm text-muted-foreground">
                {progress < 40 ? "Konverterer data til XML format" :
                 progress < 70 ? "Kontrollerer format og innhold" :
                 "Leverer via Altinn API"}
              </p>
            </div>
            <Progress value={progress} className="mx-auto max-w-xs" />
          </div>
        )}

        {/* Step: Complete */}
        {step === "complete" && (
          <div className="space-y-6 py-4 text-center">
            <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
              <CheckCircle2Icon className="size-8 text-green-600" />
            </div>
            <div>
              <p className="text-lg font-medium">SAF-T sendt til Altinn</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Ciri har levert filen til Skatteetaten
              </p>
            </div>

            {/* Submission confirmation */}
            <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-left dark:border-green-900/30 dark:bg-green-900/20">
              <div className="flex items-start gap-3">
                <CheckCircle2Icon className="mt-0.5 size-5 shrink-0 text-green-600" />
                <div className="space-y-2 text-sm">
                  <p className="font-medium text-green-800 dark:text-green-200">Innsending bekreftet</p>
                  <div className="space-y-1 text-green-700 dark:text-green-300">
                    <div className="flex justify-between">
                      <span>Referansenummer:</span>
                      <span className="font-mono">ALT-2026-{Math.random().toString(36).substring(2, 10).toUpperCase()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Tidspunkt:</span>
                      <span>{new Date().toLocaleString("nb-NO")}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Status:</span>
                      <Badge className="bg-green-600 text-white">Mottatt</Badge>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-lg border bg-muted/30 p-4 text-left">
              <div className="flex items-center gap-2 text-sm">
                <FileTextIcon className="size-4 text-muted-foreground" />
                <span className="font-mono text-xs">
                  SAF-T_{demoCompany.organizationNumber}_{selectedYear}_T{selectedPeriod}.xml
                </span>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                En kopi er lagret i ditt arkiv og lastet ned til din enhet.
              </p>
            </div>

            <div className="flex gap-3 rounded-lg border border-[var(--primary)]/20 bg-[var(--primary)]/5 p-4 text-left">
              <CiriLogo size="sm" />
              <div className="text-sm">
                <p className="font-medium text-[var(--primary)]">Alt er i orden</p>
                <p className="mt-1 text-muted-foreground">
                  Ciri har fullført SAF-T rapporteringen. Du vil motta en bekreftelse fra Skatteetaten på e-post innen 24 timer.
                </p>
              </div>
            </div>

            <Button className="w-full" onClick={() => setOpen(false)}>
              Ferdig
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
