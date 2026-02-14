"use client";

import { useState, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import LearnMoreDocs from "@/components/learn-more-docs";
import { Separator } from "@/components/ui/separator";
import {
  ReceiptIcon,
  TrendingUpIcon,
  TrendingDownIcon,
  CalendarIcon,
  SendIcon,
  CheckCircle2Icon,
  ClockIcon,
  ChevronRightIcon,
  DownloadIcon,
  FileTextIcon,
  SparklesIcon,
  BrainCircuitIcon,
  EyeIcon,
  ZapIcon,
  ShieldCheckIcon,
  FileCheckIcon,
  MailIcon,
  CalculatorIcon,
  CheckIcon,
  ArrowRightIcon,
  AlertCircleIcon,
  PencilIcon,
  BuildingIcon,
  ShoppingCartIcon,
  CarIcon,
  WifiIcon,
  CoffeeIcon,
  BriefcaseIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  ExternalLinkIcon,
  LoaderIcon
} from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger
} from "@/components/ui/collapsible";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import dynamic from "next/dynamic";

const SAFTExportDialog = dynamic(() => import("@/components/saft-export-dialog").then(m => ({ default: m.SAFTExportDialog })), { ssr: false });
const Fradragsveiviser = dynamic(() => import("@/components/fradragsveiviser").then(m => ({ default: m.Fradragsveiviser })), { ssr: false });
const PosteringCorrectionDialog = dynamic(() => import("@/components/postering-correction-dialog").then(m => ({ default: m.PosteringCorrectionDialog })), { ssr: false });
import { cn } from "@/lib/utils";
import CiriLogo from "@/components/layout/ciri-logo";
import { useCiriActionListener } from "@/lib/ciri-actions";
import type { MVAPDFData } from "@/components/mva/mva-pdf-document";

// Lazy import - @react-pdf/renderer is heavy
const generateMVAPDF = async (data: MVAPDFData) => {
  const { generateMVAPDF: gen } = await import("@/lib/mva-pdf-generator");
  return gen(data);
};
import {
  type OriginalPosting,
  type CorrectionInput,
  type CorrectionPreview,
  generateAuditLogEntry,
  CORRECTION_REASONS,
} from "@/lib/ciri-postering-verification";
import { addRevisionEntry, createCorrectionRevisionEntry } from "@/lib/bilag-store";
import { toast } from "sonner";

interface MVATermin {
  id: string;
  termin: string;
  period: string;
  utgaende: number;
  inngaende: number;
  tilGode: number;
  status: "submitted" | "ready" | "upcoming";
  deadline?: string;
  submittedDate?: string;
}

const mvaTerminer: MVATermin[] = [
  {
    id: "1",
    termin: "1. termin",
    period: "Jan - Feb 2025",
    utgaende: 42500,
    inngaende: 18200,
    tilGode: -24300,
    status: "submitted",
    submittedDate: "2025-04-08"
  },
  {
    id: "2",
    termin: "2. termin",
    period: "Mar - Apr 2025",
    utgaende: 38900,
    inngaende: 21500,
    tilGode: -17400,
    status: "submitted",
    submittedDate: "2025-06-09"
  },
  {
    id: "3",
    termin: "3. termin",
    period: "Mai - Jun 2025",
    utgaende: 51200,
    inngaende: 24800,
    tilGode: -26400,
    status: "submitted",
    submittedDate: "2025-08-10"
  },
  {
    id: "4",
    termin: "4. termin",
    period: "Jul - Aug 2025",
    utgaende: 35600,
    inngaende: 19300,
    tilGode: -16300,
    status: "submitted",
    submittedDate: "2025-10-09"
  },
  {
    id: "5",
    termin: "5. termin",
    period: "Sep - Okt 2025",
    utgaende: 48700,
    inngaende: 22100,
    tilGode: -26600,
    status: "submitted",
    submittedDate: "2025-12-08"
  },
  {
    id: "6",
    termin: "6. termin",
    period: "Nov - Des 2025",
    utgaende: 45230,
    inngaende: 21780,
    tilGode: -23450,
    status: "ready",
    deadline: "2026-02-10"
  }
];

// Ciri's activity timeline for the current termin - including scheduled future actions
const ciriTimeline = [
  {
    id: "1",
    timestamp: "2026-01-02 08:00",
    action: "Startet MVA-beregning for 6. termin",
    icon: CalculatorIcon,
    type: "completed"
  },
  {
    id: "2",
    timestamp: "2026-01-02 08:02",
    action: "Samlet inn 47 bilag fra november",
    icon: FileTextIcon,
    type: "completed"
  },
  {
    id: "3",
    timestamp: "2026-01-02 08:03",
    action: "Samlet inn 39 bilag fra desember",
    icon: FileTextIcon,
    type: "completed"
  },
  {
    id: "4",
    timestamp: "2026-01-02 08:05",
    action: "Kategoriserte alle bilag etter MVA-kode",
    icon: CheckCircle2Icon,
    type: "completed"
  },
  {
    id: "5",
    timestamp: "2026-01-02 08:07",
    action: "Beregnet utgående MVA: kr 45 230",
    icon: TrendingUpIcon,
    type: "completed"
  },
  {
    id: "6",
    timestamp: "2026-01-02 08:08",
    action: "Beregnet inngående MVA: kr 21 780",
    icon: TrendingDownIcon,
    type: "completed"
  },
  {
    id: "7",
    timestamp: "2026-01-02 08:10",
    action: "Validerte mot SAF-T krav",
    icon: ShieldCheckIcon,
    type: "completed"
  },
  {
    id: "8",
    timestamp: "2026-01-02 08:11",
    action: "Genererte MVA-melding RF-0002",
    icon: FileCheckIcon,
    type: "completed"
  },
  {
    id: "9",
    timestamp: "2026-01-02 08:12",
    action: "MVA-oppgave ferdig og planlagt for innsending",
    icon: CheckCircle2Icon,
    type: "completed"
  },
  {
    id: "10",
    timestamp: "2026-02-08 09:00",
    action: "Sender MVA-melding til Altinn",
    icon: SendIcon,
    type: "scheduled"
  },
  {
    id: "11",
    timestamp: "2026-02-08 09:01",
    action: "Bekrefter mottak fra Skatteetaten",
    icon: MailIcon,
    type: "scheduled"
  }
];

// MVA details for the dialog
const mvaDetails = {
  termin: "6. termin 2025",
  period: "November - Desember 2025",
  deadline: "10. februar 2026",
  bilagCount: 86,
  lines: [
    { code: "3", description: "Salg innenlands (25%)", grunnlag: 181000, mva: 45250 },
    { code: "5", description: "Fradragsberettiget inngående MVA (25%)", grunnlag: 87120, mva: 21780 }
  ],
  summary: {
    utgaende: 45230,
    inngaende: 21780,
    tilBetaling: 23450
  },
  validationStatus: "passed",
  warnings: []
};

// Detailed income (sales) data for the termin
const incomeData = [
  {
    id: "inc-1",
    date: "2025-11-03",
    description: "Konsulenttjenester - Norsk Industri AS",
    customer: "Norsk Industri AS",
    invoiceNo: "2025-0089",
    amount: 45000,
    mvaRate: 25,
    mva: 11250,
    category: "Tjenester",
    icon: BriefcaseIcon
  },
  {
    id: "inc-2",
    date: "2025-11-08",
    description: "Programvareutvikling - TechStart Bergen",
    customer: "TechStart Bergen AS",
    invoiceNo: "2025-0090",
    amount: 38000,
    mvaRate: 25,
    mva: 9500,
    category: "Tjenester",
    icon: BriefcaseIcon
  },
  {
    id: "inc-3",
    date: "2025-11-15",
    description: "Workshop - Digital transformasjon",
    customer: "Stavanger Kommune",
    invoiceNo: "2025-0091",
    amount: 28000,
    mvaRate: 25,
    mva: 7000,
    category: "Tjenester",
    icon: BriefcaseIcon
  },
  {
    id: "inc-4",
    date: "2025-11-22",
    description: "Systemintegrasjon - Fase 1",
    customer: "Maritim Solutions AS",
    invoiceNo: "2025-0092",
    amount: 52000,
    mvaRate: 25,
    mva: 13000,
    category: "Tjenester",
    icon: BriefcaseIcon
  },
  {
    id: "inc-5",
    date: "2025-12-02",
    description: "Vedlikeholdsavtale Q4",
    customer: "Fjord Shipping AS",
    invoiceNo: "2025-0093",
    amount: 18000,
    mvaRate: 25,
    mva: 4500,
    category: "Tjenester",
    icon: BriefcaseIcon
  }
];

// Detailed expense (purchase) bilag data for the termin
const expenseData = [
  {
    id: "exp-1",
    date: "2025-11-02",
    description: "Kontorrekvisita - Staples",
    vendor: "Staples Norway AS",
    bilagNo: "B-2025-0412",
    amount: 2840,
    mvaRate: 25,
    mva: 710,
    category: "Kontorrekvisita",
    mvaCode: "1",
    icon: ShoppingCartIcon,
    status: "verified"
  },
  {
    id: "exp-2",
    date: "2025-11-05",
    description: "Internett og telefoni - november",
    vendor: "Telenor ASA",
    bilagNo: "B-2025-0413",
    amount: 1890,
    mvaRate: 25,
    mva: 472,
    category: "Kommunikasjon",
    mvaCode: "1",
    icon: WifiIcon,
    status: "verified"
  },
  {
    id: "exp-3",
    date: "2025-11-08",
    description: "Firmabil - drivstoff",
    vendor: "Circle K Norge",
    bilagNo: "B-2025-0414",
    amount: 1650,
    mvaRate: 25,
    mva: 412,
    category: "Transport",
    mvaCode: "1",
    icon: CarIcon,
    status: "verified"
  },
  {
    id: "exp-4",
    date: "2025-11-12",
    description: "Skyløsninger - Azure november",
    vendor: "Microsoft Norge AS",
    bilagNo: "B-2025-0415",
    amount: 8400,
    mvaRate: 25,
    mva: 2100,
    category: "IT-tjenester",
    mvaCode: "1",
    icon: BuildingIcon,
    status: "verified"
  },
  {
    id: "exp-5",
    date: "2025-11-15",
    description: "Kontorleie - november",
    vendor: "Entra Eiendom AS",
    bilagNo: "B-2025-0416",
    amount: 18500,
    mvaRate: 25,
    mva: 4625,
    category: "Husleie",
    mvaCode: "1",
    icon: BuildingIcon,
    status: "verified"
  },
  {
    id: "exp-6",
    date: "2025-11-18",
    description: "Representasjon - kundemøte",
    vendor: "Restaurant Fjord",
    bilagNo: "B-2025-0417",
    amount: 2200,
    mvaRate: 25,
    mva: 550,
    category: "Representasjon",
    mvaCode: "1",
    icon: CoffeeIcon,
    status: "needs_review",
    warning: "Representasjon over kr 500 per person - vennligst bekreft antall gjester"
  },
  {
    id: "exp-7",
    date: "2025-11-22",
    description: "Programvare - Adobe Creative Cloud",
    vendor: "Adobe Systems",
    bilagNo: "B-2025-0418",
    amount: 4800,
    mvaRate: 25,
    mva: 1200,
    category: "IT-tjenester",
    mvaCode: "1",
    icon: BuildingIcon,
    status: "verified"
  },
  {
    id: "exp-8",
    date: "2025-11-25",
    description: "Reiseutgifter - Oslo tur/retur",
    vendor: "SAS Norge",
    bilagNo: "B-2025-0419",
    amount: 3200,
    mvaRate: 0,
    mva: 0,
    category: "Reise",
    mvaCode: "6",
    icon: CarIcon,
    status: "verified"
  },
  {
    id: "exp-9",
    date: "2025-12-01",
    description: "Kontorrekvisita - desember",
    vendor: "Staples Norway AS",
    bilagNo: "B-2025-0420",
    amount: 1560,
    mvaRate: 25,
    mva: 390,
    category: "Kontorrekvisita",
    mvaCode: "1",
    icon: ShoppingCartIcon,
    status: "verified"
  },
  {
    id: "exp-10",
    date: "2025-12-05",
    description: "Internett og telefoni - desember",
    vendor: "Telenor ASA",
    bilagNo: "B-2025-0421",
    amount: 1890,
    mvaRate: 25,
    mva: 472,
    category: "Kommunikasjon",
    mvaCode: "1",
    icon: WifiIcon,
    status: "verified"
  },
  {
    id: "exp-11",
    date: "2025-12-10",
    description: "Julegave til ansatte",
    vendor: "Vinmonopolet",
    bilagNo: "B-2025-0422",
    amount: 4500,
    mvaRate: 25,
    mva: 1125,
    category: "Gaver",
    mvaCode: "7",
    icon: ShoppingCartIcon,
    status: "needs_review",
    warning: "Gaver til ansatte - ikke fradragsberettiget MVA. Ciri har ekskludert fra fradrag."
  },
  {
    id: "exp-12",
    date: "2025-12-15",
    description: "Kontorleie - desember",
    vendor: "Entra Eiendom AS",
    bilagNo: "B-2025-0423",
    amount: 18500,
    mvaRate: 25,
    mva: 4625,
    category: "Husleie",
    mvaCode: "1",
    icon: BuildingIcon,
    status: "verified"
  }
];

// Summary by category for expenses
const expensesByCategory = [
  { category: "Husleie", count: 2, total: 37000, mva: 9250, icon: BuildingIcon },
  { category: "IT-tjenester", count: 2, total: 13200, mva: 3300, icon: BuildingIcon },
  { category: "Kontorrekvisita", count: 2, total: 4400, mva: 1100, icon: ShoppingCartIcon },
  { category: "Kommunikasjon", count: 2, total: 3780, mva: 944, icon: WifiIcon },
  { category: "Transport", count: 1, total: 1650, mva: 412, icon: CarIcon },
  { category: "Reise", count: 1, total: 3200, mva: 0, icon: CarIcon },
  { category: "Representasjon", count: 1, total: 2200, mva: 550, icon: CoffeeIcon },
  { category: "Gaver (ikke fradrag)", count: 1, total: 4500, mva: 0, icon: ShoppingCartIcon }
];

const statusConfig = {
  submitted: {
    label: "Sendt",
    icon: CheckCircle2Icon,
    color: "text-green-600",
    bgColor: "bg-green-100 dark:bg-green-900/30"
  },
  ready: {
    label: "Klar til sending",
    icon: SendIcon,
    color: "text-[var(--primary)]",
    bgColor: "bg-[var(--primary)]/10"
  },
  upcoming: {
    label: "Kommende",
    icon: ClockIcon,
    color: "text-muted-foreground",
    bgColor: "bg-muted"
  }
};

// Termin Detail Dialog Component
function TerminDetailDialog({
  termin,
  open,
  onOpenChange,
  autonomyMode
}: {
  termin: MVATermin | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  autonomyMode: "assistant" | "autonomous";
}) {
  if (!termin) return null;

  const isSubmitted = termin.status === "submitted";
  const isReady = termin.status === "ready";
  const isOwed = termin.tilGode < 0;

  // Calculate days until deadline or days since submission
  const daysInfo = useMemo(() => {
    if (isSubmitted && termin.submittedDate) {
      const submitted = new Date(termin.submittedDate);
      const now = new Date();
      const daysSince = Math.floor((now.getTime() - submitted.getTime()) / (1000 * 60 * 60 * 24));
      return { type: "submitted", days: daysSince };
    } else if (termin.deadline) {
      const deadline = new Date(termin.deadline);
      const now = new Date();
      const daysUntil = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      return { type: "deadline", days: daysUntil };
    }
    return null;
  }, [termin, isSubmitted]);

  // Generate a fake Altinn reference for submitted termins
  const altinnRef = useMemo(() => {
    if (!isSubmitted) return null;
    const hash = termin.id.charCodeAt(0) * 12345 + termin.utgaende;
    return `AR${termin.submittedDate?.replace(/-/g, "")}-${hash.toString().slice(-6)}`;
  }, [termin, isSubmitted]);

  // MVA rate breakdown (simulated based on amounts)
  const rateBreakdown = useMemo(() => {
    const total = termin.utgaende;
    return [
      { rate: 25, label: "Standard", amount: Math.round(total * 0.85), percent: 85 },
      { rate: 15, label: "Mat", amount: Math.round(total * 0.08), percent: 8 },
      { rate: 12, label: "Transport", amount: Math.round(total * 0.05), percent: 5 },
      { rate: 0, label: "Fritatt", amount: Math.round(total * 0.02), percent: 2 },
    ];
  }, [termin.utgaende]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl overflow-hidden p-0">
        {/* Header with gradient background */}
        <div className={cn(
          "relative px-6 pt-6 pb-8",
          isSubmitted
            ? "bg-gradient-to-br from-emerald-50 via-green-50 to-teal-50 dark:from-emerald-950/30 dark:via-green-950/20 dark:to-teal-950/30"
            : "bg-gradient-to-br from-[var(--primary)]/10 via-[var(--primary)]/5 to-purple-50 dark:from-[var(--primary)]/20 dark:via-[var(--primary)]/10 dark:to-purple-950/20"
        )}>
          {/* Decorative elements */}
          <div className="absolute top-0 right-0 w-32 h-32 opacity-20">
            <svg viewBox="0 0 100 100" className="w-full h-full">
              <circle cx="80" cy="20" r="40" fill="currentColor" className={isSubmitted ? "text-emerald-400" : "text-[var(--primary)]"} />
              <circle cx="60" cy="40" r="20" fill="currentColor" className={isSubmitted ? "text-teal-300" : "text-purple-300"} />
            </svg>
          </div>

          <DialogHeader className="relative">
            <div className="flex items-start justify-between">
              <div>
                <DialogTitle className="text-xl font-display flex items-center gap-2">
                  {termin.termin}
                  {isSubmitted && autonomyMode === "autonomous" && (
                    <Badge variant="secondary" className="gap-1 text-xs font-normal bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300">
                      <SparklesIcon className="size-3" />
                      Ciri
                    </Badge>
                  )}
                </DialogTitle>
                <DialogDescription className="text-sm mt-1">
                  {termin.period}
                </DialogDescription>
              </div>
              <Badge
                variant="outline"
                className={cn(
                  "text-xs font-medium",
                  isSubmitted && "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
                  isReady && "border-[var(--primary)] bg-[var(--primary)]/10 text-[var(--primary)]"
                )}
              >
                {isSubmitted ? (
                  <><CheckCircle2Icon className="size-3 mr-1" />Sendt</>
                ) : isReady ? (
                  <><ClockIcon className="size-3 mr-1" />Klar</>
                ) : (
                  "Kommende"
                )}
              </Badge>
            </div>
          </DialogHeader>

          {/* Key metric - Net amount */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mt-6 text-center"
          >
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
              {isOwed ? "Å betale" : "Til gode"}
            </p>
            <p className={cn(
              "text-4xl font-display font-bold tracking-tight",
              isSubmitted ? "text-emerald-700 dark:text-emerald-400" : "text-[var(--primary)]"
            )}>
              kr {Math.abs(termin.tilGode).toLocaleString("nb-NO")}
            </p>
          </motion.div>
        </div>

        {/* Content */}
        <div className="px-6 py-5 space-y-5">
          {/* Financial breakdown */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="grid grid-cols-2 gap-4"
          >
            <div className="rounded-xl border bg-card p-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-2">
                <TrendingUpIcon className="size-4 text-rose-500" />
                <span className="text-xs font-medium uppercase tracking-wide">Utgående MVA</span>
              </div>
              <p className="text-xl font-display font-semibold">
                kr {termin.utgaende.toLocaleString("nb-NO")}
              </p>
            </div>
            <div className="rounded-xl border bg-card p-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-2">
                <TrendingDownIcon className="size-4 text-emerald-500" />
                <span className="text-xs font-medium uppercase tracking-wide">Inngående MVA</span>
              </div>
              <p className="text-xl font-display font-semibold">
                kr {termin.inngaende.toLocaleString("nb-NO")}
              </p>
            </div>
          </motion.div>

          {/* MVA rate breakdown */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="space-y-3"
          >
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Fordeling etter MVA-sats
            </p>
            <div className="space-y-2">
              {rateBreakdown.map((item, index) => (
                <div key={item.rate} className="flex items-center gap-3">
                  <div className="w-12 text-xs font-medium text-right text-muted-foreground">
                    {item.rate}%
                  </div>
                  <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${item.percent}%` }}
                      transition={{ delay: 0.3 + index * 0.1, duration: 0.5, ease: "easeOut" }}
                      className={cn(
                        "h-full rounded-full",
                        item.rate === 25 && "bg-[var(--primary)]",
                        item.rate === 15 && "bg-purple-400",
                        item.rate === 12 && "bg-indigo-400",
                        item.rate === 0 && "bg-slate-400"
                      )}
                    />
                  </div>
                  <div className="w-20 text-xs text-muted-foreground text-right">
                    kr {item.amount.toLocaleString("nb-NO")}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          <Separator />

          {/* Status-specific content */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
          >
            {isSubmitted ? (
              <div className="space-y-3">
                <div className="flex items-center gap-3 p-3 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800">
                  <div className="flex items-center justify-center size-10 rounded-full bg-emerald-100 dark:bg-emerald-900/50">
                    <CheckCircle2Icon className="size-5 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-emerald-800 dark:text-emerald-200">
                      Sendt til Altinn
                    </p>
                    <p className="text-xs text-emerald-600 dark:text-emerald-400">
                      {new Date(termin.submittedDate!).toLocaleDateString("nb-NO", {
                        day: "numeric",
                        month: "long",
                        year: "numeric"
                      })}
                      {daysInfo && ` • ${daysInfo.days} dager siden`}
                    </p>
                  </div>
                </div>
                {altinnRef && (
                  <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
                    <div>
                      <p className="text-xs text-muted-foreground">Altinn-referanse</p>
                      <p className="text-sm font-mono font-medium">{altinnRef}</p>
                    </div>
                    <Button variant="ghost" size="sm" className="gap-2 text-xs">
                      <ExternalLinkIcon className="size-3" />
                      Vis i Altinn
                    </Button>
                  </div>
                )}
              </div>
            ) : isReady ? (
              <div className="space-y-3">
                <div className="flex items-center gap-3 p-3 rounded-lg bg-[var(--primary)]/5 border border-[var(--primary)]/20">
                  <div className="flex items-center justify-center size-10 rounded-full bg-[var(--primary)]/10">
                    <CalendarIcon className="size-5 text-[var(--primary)]" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">
                      Frist: {new Date(termin.deadline!).toLocaleDateString("nb-NO", {
                        day: "numeric",
                        month: "long",
                        year: "numeric"
                      })}
                    </p>
                    {daysInfo && (
                      <p className={cn(
                        "text-xs",
                        daysInfo.days <= 7 ? "text-amber-600 dark:text-amber-400 font-medium" : "text-muted-foreground"
                      )}>
                        {daysInfo.days} dager igjen
                      </p>
                    )}
                  </div>
                </div>
                {autonomyMode === "autonomous" && (
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 border">
                    <CiriLogo size="sm" />
                    <p className="text-xs text-muted-foreground">
                      Ciri sender automatisk 2 dager før frist
                    </p>
                  </div>
                )}
              </div>
            ) : null}
          </motion.div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t bg-muted/30 flex justify-between items-center">
          <Button variant="ghost" size="sm" className="gap-2 text-xs">
            <DownloadIcon className="size-3" />
            Last ned PDF
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
              Lukk
            </Button>
            {isReady && (
              <Button size="sm" className="gap-2">
                <EyeIcon className="size-4" />
                Forhåndsvis
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function MVAPage() {
  const [autonomyMode, setAutonomyMode] = useState<"assistant" | "autonomous">("autonomous");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [selectedTermin, setSelectedTermin] = useState<MVATermin | null>(null);
  const [terminDialogOpen, setTerminDialogOpen] = useState(false);

  // Ciri bubble action listener
  useCiriActionListener("forhandsvis-mva", useCallback(() => setPreviewOpen(true), []));

  const currentTermin = mvaTerminer.find((t) => t.status === "ready");
  const totalUtgaende = mvaTerminer.reduce((acc, t) => acc + t.utgaende, 0);
  const totalInngaende = mvaTerminer.reduce((acc, t) => acc + t.inngaende, 0);
  const submittedCount = mvaTerminer.filter((t) => t.status === "submitted").length;

  return (
    <div className="space-y-6">
      {/* Header with Autonomy Selector */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight">MVA-oppgaver</h1>
          <p className="text-muted-foreground">Administrer og send MVA-meldinger til Altinn</p>
        </div>
        <div className="flex flex-col items-end gap-3">
          {/* Autonomy Mode Selector */}
          <Tabs
            value={autonomyMode}
            onValueChange={(v) => setAutonomyMode(v as "assistant" | "autonomous")}
            className="w-fit"
          >
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="assistant" className="gap-2 px-4">
                <SparklesIcon className="size-4" />
                <span className="hidden sm:inline">Assistent</span>
              </TabsTrigger>
              <TabsTrigger value="autonomous" className="gap-2 px-4">
                <BrainCircuitIcon className="size-4" />
                <span className="hidden sm:inline">Autonom</span>
              </TabsTrigger>
            </TabsList>
          </Tabs>
          <div className="flex gap-2">
            <SAFTExportDialog>
              <Button variant="outline" size="sm">
                <DownloadIcon className="mr-2 size-4" />
                Eksporter SAF-T
              </Button>
            </SAFTExportDialog>
          </div>
        </div>
      </div>

      {/* Autonomous Mode */}
      {autonomyMode === "autonomous" && currentTermin && (
        <>
          {/* Fradragsveiviser at top */}
          <Fradragsveiviser />

          {/* Ciri Summary Card */}
          <Card className="relative overflow-hidden border-[var(--primary)]/30">
            <div className="pointer-events-none absolute -right-20 -top-20 size-64 rounded-full bg-[var(--primary)]/10 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-10 -left-10 size-40 rounded-full bg-[var(--secondary)]/10 blur-2xl" />

            <CardHeader className="pb-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <CiriLogo size="sm" />
                    <span className="absolute -bottom-0.5 -right-0.5 flex size-3">
                      <span className="absolute inline-flex size-full animate-ping rounded-full bg-green-400 opacity-75" />
                      <span className="relative inline-flex size-3 rounded-full bg-green-500" />
                    </span>
                  </div>
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <SparklesIcon className="size-5 text-[var(--primary)]" />
                      Ciri håndterer MVA-meldingen
                    </CardTitle>
                    <CardDescription>
                      Autonom modus aktiv for {currentTermin.termin}
                    </CardDescription>
                  </div>
                </div>
                <Badge className="border-[var(--primary)]/30 bg-[var(--primary)]/10 text-[var(--primary)]">
                  <ClockIcon className="mr-1 size-3" />
                  Planlagt innsending
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="space-y-6">
              {/* Scheduled Submission Banner */}
              <div className="rounded-xl border-2 border-[var(--primary)]/30 bg-gradient-to-r from-[var(--primary)]/10 via-[var(--primary)]/5 to-transparent p-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="flex size-12 items-center justify-center rounded-full bg-[var(--primary)]/20">
                      <SendIcon className="size-6 text-[var(--primary)]" />
                    </div>
                    <div>
                      <p className="font-medium text-[var(--primary)]">Automatisk innsending planlagt</p>
                      <p className="text-sm text-muted-foreground">
                        Ciri sender MVA-meldingen til Altinn <span className="font-semibold text-foreground">8. februar 2026 kl. 09:00</span>
                      </p>
                    </div>
                  </div>
                  <div className="hidden text-right sm:block">
                    <p className="text-2xl font-bold text-[var(--primary)]">7 dager</p>
                    <p className="text-xs text-muted-foreground">til innsending</p>
                  </div>
                </div>
              </div>

              {/* Ciri's Summary Text */}
              <div className="rounded-xl border bg-gradient-to-br from-[var(--primary)]/5 to-transparent p-5">
                <div className="flex gap-4">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[var(--primary)]/10">
                    <SparklesIcon className="size-5 text-[var(--primary)]" />
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm leading-relaxed">
                      <span className="font-medium">Jeg har gjennomgått alle 86 bilag</span> fra november og desember 2025.
                      MVA-oppgaven er ferdig beregnet og validert mot SAF-T-kravene.
                    </p>
                    <p className="text-sm leading-relaxed text-muted-foreground">
                      Basert på <span className="font-medium text-foreground">kr 181 000</span> i avgiftspliktig salg
                      og <span className="font-medium text-foreground">kr 87 120</span> i fradragsberettigede kostnader,
                      er netto MVA å betale <span className="font-semibold text-[var(--primary)]">kr 23 450</span>.
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Fristen er 10. februar 2026. Jeg sender meldingen automatisk <span className="font-medium text-foreground">2 dager før fristen</span> for å sikre at alt er i orden.
                      Du trenger ikke gjøre noe — jeg gir deg beskjed når det er sendt.
                    </p>
                  </div>
                </div>
              </div>

              {/* Quick Stats */}
              <div className="grid gap-4 sm:grid-cols-4">
                <div className="rounded-lg border bg-white/50 p-4 dark:bg-white/5">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <TrendingUpIcon className="size-4 text-green-600" />
                    <span className="text-xs">Utgående MVA</span>
                  </div>
                  <p className="font-display mt-1 text-xl font-semibold">
                    kr {currentTermin.utgaende.toLocaleString("nb-NO")}
                  </p>
                </div>
                <div className="rounded-lg border bg-white/50 p-4 dark:bg-white/5">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <TrendingDownIcon className="size-4 text-red-500" />
                    <span className="text-xs">Inngående MVA</span>
                  </div>
                  <p className="font-display mt-1 text-xl font-semibold">
                    kr {currentTermin.inngaende.toLocaleString("nb-NO")}
                  </p>
                </div>
                <div className="rounded-lg border bg-white/50 p-4 dark:bg-white/5">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <ReceiptIcon className="size-4 text-[var(--primary)]" />
                    <span className="text-xs">Netto å betale</span>
                  </div>
                  <p className="font-display mt-1 text-xl font-semibold text-[var(--primary)]">
                    kr {Math.abs(currentTermin.tilGode).toLocaleString("nb-NO")}
                  </p>
                </div>
                <div className="rounded-lg border bg-white/50 p-4 dark:bg-white/5">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <CalendarIcon className="size-4" />
                    <span className="text-xs">Frist</span>
                  </div>
                  <p className="font-display mt-1 text-xl font-semibold">
                    9 dager
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col gap-3 sm:flex-row">
                <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="flex-1 gap-2">
                      <FileTextIcon className="size-4" />
                      Se MVA-oppgave
                    </Button>
                  </DialogTrigger>
                  <MVAPreviewDialog isAutoMode />
                </Dialog>
                <Button variant="ghost" className="flex-1 gap-2 text-muted-foreground hover:text-destructive">
                  <ClockIcon className="size-4" />
                  Utsett automatisk innsending
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Ciri Activity Timeline */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <ClockIcon className="size-5" />
                Ciri-aktivitet for {currentTermin.termin}
              </CardTitle>
              <CardDescription>
                Tidslinje over hva Ciri har gjort for å forberede MVA-meldingen
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="relative">
                {/* Timeline line */}
                <div className="absolute left-5 top-0 h-full w-px bg-gradient-to-b from-green-500 via-[var(--primary)]/50 to-[var(--primary)]/30" />

                <div className="space-y-4">
                  {ciriTimeline.map((event, index) => {
                    const Icon = event.icon;
                    const isScheduled = event.type === "scheduled";
                    const isLastCompleted = event.type === "completed" && ciriTimeline[index + 1]?.type === "scheduled";

                    return (
                      <div key={event.id} className="relative flex gap-4 pl-2">
                        {/* Separator between completed and scheduled */}
                        {isScheduled && index > 0 && ciriTimeline[index - 1]?.type === "completed" && (
                          <div className="absolute -top-2 left-0 right-0 flex items-center gap-2 pl-12">
                            <div className="h-px flex-1 bg-border" />
                            <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                              Planlagt
                            </span>
                            <div className="h-px flex-1 bg-border" />
                          </div>
                        )}
                        <div
                          className={cn(
                            "relative z-10 flex size-7 shrink-0 items-center justify-center rounded-full border-2 bg-background",
                            isScheduled
                              ? "border-dashed border-[var(--primary)]/50 bg-[var(--primary)]/5"
                              : isLastCompleted
                                ? "border-green-500 bg-green-50 dark:bg-green-900/30"
                                : "border-green-500/50 bg-green-50/50 dark:bg-green-900/20"
                          )}
                        >
                          <Icon
                            className={cn(
                              "size-3.5",
                              isScheduled
                                ? "text-[var(--primary)]/70"
                                : "text-green-600"
                            )}
                          />
                        </div>
                        <div className={cn("flex-1 pb-4", isScheduled && index > 0 && ciriTimeline[index - 1]?.type === "completed" && "pt-4")}>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <p className={cn(
                                "text-sm",
                                isScheduled && "text-muted-foreground",
                                isLastCompleted && "font-medium text-green-700 dark:text-green-400"
                              )}>
                                {event.action}
                              </p>
                              {isScheduled && (
                                <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                                  Planlagt
                                </Badge>
                              )}
                            </div>
                            <span className={cn(
                              "text-xs",
                              isScheduled ? "text-[var(--primary)]" : "text-muted-foreground"
                            )}>
                              {isScheduled
                                ? new Date(event.timestamp.replace(" ", "T")).toLocaleDateString("nb-NO", { day: "numeric", month: "short" })
                                : event.timestamp.split(" ")[1]}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Detailed Income Section */}
          <IncomeDetailsCard />

          {/* Detailed Expenses Section */}
          <ExpenseDetailsCard />
        </>
      )}

      {/* Semi-Autonomy Mode (Original View) */}
      {autonomyMode === "assistant" && (
        <>
          {/* Fradragsveiviser at top */}
          <Fradragsveiviser />

          {/* Current Period Card */}
          {currentTermin && (
            <Card className="relative overflow-hidden border-[var(--primary)]/30 bg-gradient-to-br from-[var(--primary)]/5 via-transparent to-[var(--secondary)]/5">
              <div className="pointer-events-none absolute -right-20 -top-20 size-64 rounded-full bg-[var(--primary)]/10 blur-3xl" />
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <Badge className="mb-2 border-[var(--primary)]/30 bg-[var(--primary)]/10 text-[var(--primary)]">
                      Klar til innsending
                    </Badge>
                    <CardTitle className="text-xl">
                      {currentTermin.termin} ({currentTermin.period})
                    </CardTitle>
                    <CardDescription>
                      Frist: {new Date(currentTermin.deadline!).toLocaleDateString("nb-NO", {
                        day: "numeric",
                        month: "long",
                        year: "numeric"
                      })}
                    </CardDescription>
                  </div>
                  <div className="text-right">
                    <p className="text-muted-foreground text-sm">Å betale</p>
                    <p className="font-display text-3xl font-bold text-[var(--primary)]">
                      kr {Math.abs(currentTermin.tilGode).toLocaleString("nb-NO")}
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid gap-6 sm:grid-cols-3">
                  <div className="rounded-lg border bg-white/50 p-4 dark:bg-white/5">
                    <div className="flex items-center gap-2">
                      <TrendingUpIcon className="size-4 text-green-600" />
                      <span className="text-muted-foreground text-sm">Utgående MVA</span>
                    </div>
                    <p className="font-display mt-1 text-2xl font-semibold">
                      kr {currentTermin.utgaende.toLocaleString("nb-NO")}
                    </p>
                  </div>
                  <div className="rounded-lg border bg-white/50 p-4 dark:bg-white/5">
                    <div className="flex items-center gap-2">
                      <TrendingDownIcon className="size-4 text-red-500" />
                      <span className="text-muted-foreground text-sm">Inngående MVA</span>
                    </div>
                    <p className="font-display mt-1 text-2xl font-semibold">
                      kr {currentTermin.inngaende.toLocaleString("nb-NO")}
                    </p>
                  </div>
                  <div className="rounded-lg border bg-white/50 p-4 dark:bg-white/5">
                    <div className="flex items-center gap-2">
                      <ReceiptIcon className="size-4 text-[var(--primary)]" />
                      <span className="text-muted-foreground text-sm">Netto</span>
                    </div>
                    <p className="font-display mt-1 text-2xl font-semibold text-[var(--primary)]">
                      kr {Math.abs(currentTermin.tilGode).toLocaleString("nb-NO")}
                    </p>
                  </div>
                </div>
                <div className="mt-6 flex gap-3">
                  <Button className="flex-1">
                    <SendIcon className="mr-2 size-4" />
                    Send til Altinn
                  </Button>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="outline">
                        <FileTextIcon className="mr-2 size-4" />
                        Forhåndsvis
                      </Button>
                    </DialogTrigger>
                    <MVAPreviewDialog />
                  </Dialog>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Detailed Income Section */}
          <IncomeDetailsCard />

          {/* Detailed Expenses Section */}
          <ExpenseDetailsCard />
        </>
      )}

      {/* Stats - Show in both modes */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-sm">Terminer sendt</p>
                <p className="font-display text-3xl font-bold">{submittedCount}/6</p>
              </div>
              <div className="flex size-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
                <CheckCircle2Icon className="size-6 text-green-600" />
              </div>
            </div>
            <Progress value={(submittedCount / 6) * 100} className="mt-4" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-sm">Total utgående MVA</p>
                <p className="font-display text-2xl font-bold">
                  kr {totalUtgaende.toLocaleString("nb-NO")}
                </p>
              </div>
              <TrendingUpIcon className="size-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-sm">Total inngående MVA</p>
                <p className="font-display text-2xl font-bold">
                  kr {totalInngaende.toLocaleString("nb-NO")}
                </p>
              </div>
              <TrendingDownIcon className="size-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* All Terminer */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarIcon className="size-5" />
            Alle terminer 2025
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {mvaTerminer.map((termin) => {
              const status = statusConfig[termin.status as keyof typeof statusConfig] ?? statusConfig.upcoming;
              const StatusIcon = status.icon;

              return (
                <div
                  key={termin.id}
                  onClick={() => {
                    setSelectedTermin(termin);
                    setTerminDialogOpen(true);
                  }}
                  className={cn(
                    "group flex items-center gap-4 rounded-lg border p-4 transition-all cursor-pointer hover:border-[var(--primary)]/30 hover:bg-[var(--primary)]/5",
                    termin.status === "ready" && "border-[var(--primary)]/30 bg-[var(--primary)]/5"
                  )}>
                  <div
                    className={cn(
                      "flex size-10 shrink-0 items-center justify-center rounded-full",
                      status.bgColor
                    )}>
                    <StatusIcon className={cn("size-5", status.color)} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{termin.termin}</p>
                      <Badge variant="outline" className="text-xs">
                        {termin.period}
                      </Badge>
                      {termin.status === "submitted" && autonomyMode === "autonomous" && (
                        <Badge variant="secondary" className="gap-1 text-xs">
                          <SparklesIcon className="size-3" />
                          Ciri
                        </Badge>
                      )}
                    </div>
                    <p className="text-muted-foreground text-sm">
                      {termin.status === "submitted"
                        ? `Sendt ${new Date(termin.submittedDate!).toLocaleDateString("nb-NO")}`
                        : termin.status === "ready"
                          ? `Frist: ${new Date(termin.deadline!).toLocaleDateString("nb-NO")}`
                          : "Kommende"}
                    </p>
                  </div>
                  <div className="hidden grid-cols-3 gap-8 text-right sm:grid">
                    <div>
                      <p className="text-muted-foreground text-xs">Utgående</p>
                      <p className="font-display font-medium">
                        kr {termin.utgaende.toLocaleString("nb-NO")}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">Inngående</p>
                      <p className="font-display font-medium">
                        kr {termin.inngaende.toLocaleString("nb-NO")}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">Netto</p>
                      <p className="font-display font-medium text-[var(--primary)]">
                        kr {Math.abs(termin.tilGode).toLocaleString("nb-NO")}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="opacity-0 transition-opacity group-hover:opacity-100">
                    <ChevronRightIcon className="size-4" />
                  </Button>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Termin Detail Dialog */}
      <TerminDetailDialog
        termin={selectedTermin}
        open={terminDialogOpen}
        onOpenChange={setTerminDialogOpen}
        autonomyMode={autonomyMode}
      />

      <LearnMoreDocs sections={["mva", "bokforing"]} />
    </div>
  );
}

// MVA Preview Dialog Component
function MVAPreviewDialog({ isAutoMode = false }: { isAutoMode?: boolean }) {
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  // Handle PDF download
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
        expenseData: expenseData.map(e => ({
          id: e.id,
          date: e.date,
          description: e.description,
          vendor: e.vendor,
          bilagNo: e.bilagNo,
          amount: e.amount,
          mvaRate: e.mvaRate,
          mva: e.mva,
          mvaCode: e.mvaCode
        })),
        company: {
          name: "Demo Konsulent AS",
          orgNo: "123 456 789",
          address: "Storgata 1, 0123 Oslo"
        },
        generatedAt: new Date()
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
          {mvaDetails.period} • Frist: {mvaDetails.deadline}
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

// Income Details Card Component
function IncomeDetailsCard() {
  const [isOpen, setIsOpen] = useState(true);
  const [selectedIncome, setSelectedIncome] = useState<typeof incomeData[0] | null>(null);
  const [correctionDialogOpen, setCorrectionDialogOpen] = useState(false);
  const [postingToCorrect, setPostingToCorrect] = useState<OriginalPosting | null>(null);

  const totalIncome = incomeData.reduce((acc, item) => acc + item.amount, 0);
  const totalMva = incomeData.reduce((acc, item) => acc + item.mva, 0);

  // Handle opening correction dialog from income
  const handleOpenCorrection = useCallback((income: typeof incomeData[0]) => {
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
      bilagTotal: income.amount + income.mva
    };
    setPostingToCorrect(posting);
    setSelectedIncome(null);
    setCorrectionDialogOpen(true);
  }, []);

  // Handle correction completion - log to revision log
  const handleCorrectionComplete = useCallback((correction: CorrectionInput, preview: CorrectionPreview) => {
    if (!postingToCorrect) return;

    // Generate audit log entry
    const auditEntry = generateAuditLogEntry(postingToCorrect, correction, preview);
    console.log("📋 Correction audit log:", auditEntry);

    // Find the reason label
    const reason = CORRECTION_REASONS.find((r) => r.id === correction.reasonId);
    const reasonLabel = reason?.label || "Annen årsak";

    // Store revision entry for the bilag (Bokføringsloven compliance)
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

    // Show success toast with correction details
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
                    {incomeData.length} fakturaer • kr {totalIncome.toLocaleString("nb-NO")} • MVA: kr {totalMva.toLocaleString("nb-NO")}
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
                  {selectedIncome.customer} • {new Date(selectedIncome.date).toLocaleDateString("nb-NO", { day: "numeric", month: "long", year: "numeric" })}
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

// Expense Details Card Component
function ExpenseDetailsCard() {
  const [isOpen, setIsOpen] = useState(true);
  const [showAll, setShowAll] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<typeof expenseData[0] | null>(null);
  const [correctionDialogOpen, setCorrectionDialogOpen] = useState(false);
  const [postingToCorrect, setPostingToCorrect] = useState<OriginalPosting | null>(null);

  const totalExpenses = expenseData.reduce((acc, item) => acc + item.amount, 0);
  const totalMva = expenseData.filter(e => e.mvaCode === "1").reduce((acc, item) => acc + item.mva, 0);
  const specialHandledItems = expenseData.filter(e => e.status === "needs_review");

  const displayedExpenses = showAll ? expenseData : expenseData.slice(0, 6);

  // Get account code based on category
  const getAccountCode = (category: string): string => {
    const categoryToAccount: Record<string, string> = {
      "Husleie": "6300",
      "IT-tjenester": "6500",
      "Kontorrekvisita": "6800",
      "Kommunikasjon": "6900",
      "Transport": "7100",
      "Reise": "7130",
      "Representasjon": "7350",
      "Gaver": "7500"
    };
    return categoryToAccount[category] || "6000";
  };

  // Handle opening correction dialog from expense
  const handleOpenCorrection = useCallback((expense: typeof expenseData[0]) => {
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
      bilagTotal: expense.amount + expense.mva
    };
    setPostingToCorrect(posting);
    setSelectedExpense(null);
    setCorrectionDialogOpen(true);
  }, []);

  // Handle correction completion - log to revision log
  const handleCorrectionComplete = useCallback((correction: CorrectionInput, preview: CorrectionPreview) => {
    if (!postingToCorrect) return;

    // Generate audit log entry
    const auditEntry = generateAuditLogEntry(postingToCorrect, correction, preview);
    console.log("📋 Correction audit log:", auditEntry);

    // Find the reason label
    const reason = CORRECTION_REASONS.find((r) => r.id === correction.reasonId);
    const reasonLabel = reason?.label || "Annen årsak";

    // Store revision entry for the bilag (Bokføringsloven compliance)
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

    // Show success toast with correction details
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
                    {expenseData.length} bilag • kr {totalExpenses.toLocaleString("nb-NO")} • Fradrag: kr {totalMva.toLocaleString("nb-NO")}
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
                              {" — "}{item.warning?.replace("Ciri har ", "").replace("vennligst bekreft antall gjester", "håndtert automatisk")}
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
                            {item.mva > 0 && item.mvaCode === "1" ? `kr ${item.mva.toLocaleString("nb-NO")}` : "—"}
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
                  {selectedExpense.vendor} • {new Date(selectedExpense.date).toLocaleDateString("nb-NO", { day: "numeric", month: "long", year: "numeric" })}
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
                        {selectedExpense.category === "Husleie" ? "6300" :
                         selectedExpense.category === "IT-tjenester" ? "6500" :
                         selectedExpense.category === "Kontorrekvisita" ? "6800" :
                         selectedExpense.category === "Kommunikasjon" ? "6900" :
                         selectedExpense.category === "Transport" ? "7100" :
                         selectedExpense.category === "Reise" ? "7130" :
                         selectedExpense.category === "Representasjon" ? "7350" :
                         "7500"}
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
