"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import LearnMoreDocs from "@/components/learn-more-docs";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger
} from "@/components/ui/collapsible";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog";
import {
  CheckCircle2Icon,
  AlertCircleIcon,
  ClockIcon,
  ChevronRightIcon,
  ChevronDownIcon,
  FileTextIcon,
  CalculatorIcon,
  ScaleIcon,
  FileCheckIcon,
  BanknoteIcon,
  BuildingIcon,
  TrendingUpIcon,
  TrendingDownIcon,
  UploadIcon,
  DownloadIcon,
  SendIcon,
  SparklesIcon,
  PlayIcon,
  CalendarIcon,
  ReceiptIcon,
  EyeIcon,
  ExternalLinkIcon,
  RefreshCwIcon,
  LayoutDashboardIcon,
  FileSpreadsheetIcon,
  MinusIcon,
  PlusIcon
} from "lucide-react";
import { cn } from "@/lib/utils";
import CiriLogo from "@/components/layout/ciri-logo";

// ============================================================================
// TYPES
// ============================================================================

interface ChecklistItem {
  id: string;
  name: string;
  description: string;
  status: "complete" | "warning" | "pending" | "in_progress";
  detail?: string;
  subItems?: { name: string; complete: boolean }[];
  canAutoFix?: boolean;
}

interface MissingBilag {
  id: string;
  date: string;
  amount: number;
  description: string;
  bankAccount: string;
  status: "missing" | "needs_review" | "matched";
}

interface CiriActivity {
  id: string;
  task: string;
  timestamp: Date;
  status: "completed" | "in_progress";
}

interface AccountLine {
  konto: string;
  navn: string;
  thisYear: number;
  lastYear: number;
  bilag?: BilagEntry[];
}

interface BilagEntry {
  id: string;
  date: string;
  description: string;
  amount: number;
  supplier?: string;
}

interface AccountGroup {
  name: string;
  accounts: AccountLine[];
  isSum?: boolean;
}

// ============================================================================
// DATA
// ============================================================================

const checklistItems: ChecklistItem[] = [
  {
    id: "bilag",
    name: "Bilag komplett",
    description: "Alle kvitteringer og fakturaer lastet opp og matchet",
    status: "warning",
    detail: "247 av 259 bilag matchet",
    subItems: [
      { name: "Inngående fakturaer", complete: true },
      { name: "Utgående fakturaer", complete: true },
      { name: "Kvitteringer", complete: false },
      { name: "Bankbilag", complete: true }
    ],
    canAutoFix: false
  },
  {
    id: "bank",
    name: "Bankavstemming",
    description: "Alle bankkontoer avstemt mot regnskap",
    status: "complete",
    detail: "Avstemt per 31.12.2025",
    subItems: [
      { name: "Driftskonto 1920.10.12345", complete: true },
      { name: "Skattetrekkskonto 1950.20.67890", complete: true }
    ]
  },
  {
    id: "mva",
    name: "MVA-oppgaver",
    description: "Alle 6 MVA-terminer sendt og godkjent",
    status: "complete",
    detail: "6 av 6 terminer sendt"
  },
  {
    id: "lonn",
    name: "Lønn og A-meldinger",
    description: "Alle lønnskjøringer og rapporter sendt",
    status: "complete",
    detail: "12 av 12 A-meldinger sendt"
  },
  {
    id: "avskrivning",
    name: "Avskrivninger",
    description: "Årlige avskrivninger beregnet og bokført",
    status: "in_progress",
    detail: "Ciri beregner saldoavskrivninger",
    subItems: [
      { name: "Driftsmidler gruppe A", complete: true },
      { name: "Driftsmidler gruppe D", complete: false },
      { name: "Immaterielle eiendeler", complete: false }
    ],
    canAutoFix: true
  },
  {
    id: "periodisering",
    name: "Periodiseringer",
    description: "Forskuddsbetalte kostnader og påløpte inntekter",
    status: "pending",
    detail: "Venter på avskrivninger",
    canAutoFix: true
  },
  {
    id: "skatt",
    name: "Skatteberegning",
    description: "Betalbar skatt og utsatt skatt beregnet",
    status: "pending",
    detail: "Avhenger av periodiseringer"
  },
  {
    id: "kontroll",
    name: "Kontroll og godkjenning",
    description: "Gjennomgang og signering av regnskapet",
    status: "pending",
    detail: "Siste steg før innsending"
  }
];

const missingBilagData: MissingBilag[] = [
  { id: "1", date: "2025-11-15", amount: -2340, description: "VIPPS *TEKNISK", bankAccount: "1920.10.12345", status: "missing" },
  { id: "2", date: "2025-11-22", amount: -890, description: "REMA 1000 OSLO", bankAccount: "1920.10.12345", status: "missing" },
  { id: "3", date: "2025-12-03", amount: -15600, description: "ELKJØP STORMARKED", bankAccount: "1920.10.12345", status: "needs_review" },
  { id: "4", date: "2025-12-10", amount: -450, description: "SPOTIFY AB", bankAccount: "1920.10.12345", status: "missing" },
  { id: "5", date: "2025-12-12", amount: -1200, description: "CLAS OHLSON", bankAccount: "1920.10.12345", status: "needs_review" },
  { id: "6", date: "2025-12-18", amount: -3400, description: "AMAZON EU", bankAccount: "1920.10.12345", status: "missing" },
  { id: "7", date: "2025-12-20", amount: -780, description: "UBER TRIP", bankAccount: "1920.10.12345", status: "missing" },
  { id: "8", date: "2025-12-22", amount: -5200, description: "POWER NORWAY", bankAccount: "1920.10.12345", status: "needs_review" },
];

const ciriActivities: CiriActivity[] = [
  { id: "1", task: "Beregner saldoavskrivninger for gruppe D", timestamp: new Date(), status: "in_progress" },
  { id: "2", task: "Avstemte konto 2740 Forskuddsbetalt", timestamp: new Date(Date.now() - 1000 * 60 * 2), status: "completed" },
  { id: "3", task: "Kontrollerte MVA-grunnlag mot bilag", timestamp: new Date(Date.now() - 1000 * 60 * 5), status: "completed" },
  { id: "4", task: "Matchet 3 bankbilag automatisk", timestamp: new Date(Date.now() - 1000 * 60 * 8), status: "completed" },
  { id: "5", task: "Genererte kontospesifikasjon", timestamp: new Date(Date.now() - 1000 * 60 * 12), status: "completed" },
];

// Resultatregnskap data
const resultatregnskapData: AccountGroup[] = [
  {
    name: "Driftsinntekter",
    accounts: [
      { konto: "3000", navn: "Salgsinntekt, avgiftspliktig", thisYear: 3850000, lastYear: 3200000, bilag: [
        { id: "F-001", date: "2025-01-15", description: "Faktura Kunde AS", amount: 125000, supplier: "Kunde AS" },
        { id: "F-002", date: "2025-01-28", description: "Faktura Nordic Tech", amount: 89000, supplier: "Nordic Tech" },
        { id: "F-003", date: "2025-02-10", description: "Faktura Konsulent Partner", amount: 156000, supplier: "Konsulent Partner" },
      ]},
      { konto: "3100", navn: "Salgsinntekt, avgiftsfri", thisYear: 400000, lastYear: 350000 },
    ]
  },
  {
    name: "Sum driftsinntekter",
    accounts: [{ konto: "", navn: "", thisYear: 4250000, lastYear: 3550000 }],
    isSum: true
  },
  {
    name: "Driftskostnader",
    accounts: [
      { konto: "4000", navn: "Varekostnad", thisYear: -520000, lastYear: -480000, bilag: [
        { id: "B-101", date: "2025-03-05", description: "Innkjøp programvare", amount: -45000, supplier: "Software AS" },
        { id: "B-102", date: "2025-04-12", description: "Lisenser", amount: -28000, supplier: "Microsoft" },
      ]},
      { konto: "5000", navn: "Lønnskostnad", thisYear: -1850000, lastYear: -1650000 },
      { konto: "5400", navn: "Arbeidsgiveravgift", thisYear: -260900, lastYear: -232650 },
      { konto: "5420", navn: "Pensjonskostnad", thisYear: -37000, lastYear: -33000 },
      { konto: "6000", navn: "Avskrivninger", thisYear: -85000, lastYear: -78000 },
      { konto: "6300", navn: "Leie lokale", thisYear: -180000, lastYear: -168000, bilag: [
        { id: "B-201", date: "2025-01-01", description: "Husleie januar", amount: -15000, supplier: "Eiendom AS" },
        { id: "B-202", date: "2025-02-01", description: "Husleie februar", amount: -15000, supplier: "Eiendom AS" },
      ]},
      { konto: "6500", navn: "Verktøy og utstyr", thisYear: -42000, lastYear: -38000 },
      { konto: "6700", navn: "Revisjon og regnskap", thisYear: -65000, lastYear: -58000 },
      { konto: "6800", navn: "Kontorkostnader", thisYear: -32000, lastYear: -29000 },
      { konto: "6900", navn: "Telefon og internett", thisYear: -18000, lastYear: -16000 },
      { konto: "7000", navn: "Reisekostnader", thisYear: -48000, lastYear: -42000 },
      { konto: "7300", navn: "Markedsføring", thisYear: -95000, lastYear: -85000 },
      { konto: "7700", navn: "Annen driftskostnad", thisYear: -28000, lastYear: -25000 },
    ]
  },
  {
    name: "Sum driftskostnader",
    accounts: [{ konto: "", navn: "", thisYear: -3260900, lastYear: -2934650 }],
    isSum: true
  },
  {
    name: "Driftsresultat",
    accounts: [{ konto: "", navn: "", thisYear: 989100, lastYear: 615350 }],
    isSum: true
  },
  {
    name: "Finansposter",
    accounts: [
      { konto: "8000", navn: "Renteinntekter", thisYear: 12500, lastYear: 8200 },
      { konto: "8100", navn: "Rentekostnader", thisYear: -3400, lastYear: -2800 },
    ]
  },
  {
    name: "Ordinært resultat før skatt",
    accounts: [{ konto: "", navn: "", thisYear: 998200, lastYear: 620750 }],
    isSum: true
  },
  {
    name: "Skattekostnad",
    accounts: [
      { konto: "8300", navn: "Skattekostnad", thisYear: -219604, lastYear: -136565 },
    ]
  },
  {
    name: "Årsresultat",
    accounts: [{ konto: "", navn: "", thisYear: 778596, lastYear: 484185 }],
    isSum: true
  }
];

// Balanse data
const balanseAktivaData: AccountGroup[] = [
  {
    name: "Anleggsmidler",
    accounts: [
      { konto: "1000", navn: "Forskning og utvikling", thisYear: 120000, lastYear: 95000 },
      { konto: "1200", navn: "Maskiner og inventar", thisYear: 185000, lastYear: 142000 },
      { konto: "1280", navn: "Akkumulerte avskrivninger", thisYear: -85000, lastYear: -62000 },
    ]
  },
  {
    name: "Sum anleggsmidler",
    accounts: [{ konto: "", navn: "", thisYear: 220000, lastYear: 175000 }],
    isSum: true
  },
  {
    name: "Omløpsmidler",
    accounts: [
      { konto: "1500", navn: "Kundefordringer", thisYear: 425000, lastYear: 380000, bilag: [
        { id: "K-001", date: "2025-12-15", description: "Utestående Kunde AS", amount: 125000 },
        { id: "K-002", date: "2025-12-20", description: "Utestående Nordic Tech", amount: 89000 },
      ]},
      { konto: "1700", navn: "Andre fordringer", thisYear: 35000, lastYear: 28000 },
      { konto: "1900", navn: "Bankinnskudd", thisYear: 1285000, lastYear: 892000 },
    ]
  },
  {
    name: "Sum omløpsmidler",
    accounts: [{ konto: "", navn: "", thisYear: 1745000, lastYear: 1300000 }],
    isSum: true
  },
  {
    name: "Sum eiendeler",
    accounts: [{ konto: "", navn: "", thisYear: 1965000, lastYear: 1475000 }],
    isSum: true
  }
];

const balansePassivaData: AccountGroup[] = [
  {
    name: "Egenkapital",
    accounts: [
      { konto: "2000", navn: "Aksjekapital", thisYear: 100000, lastYear: 100000 },
      { konto: "2050", navn: "Annen egenkapital", thisYear: 641404, lastYear: 357219 },
      { konto: "2080", navn: "Årets resultat", thisYear: 778596, lastYear: 484185 },
    ]
  },
  {
    name: "Sum egenkapital",
    accounts: [{ konto: "", navn: "", thisYear: 1520000, lastYear: 941404 }],
    isSum: true
  },
  {
    name: "Gjeld",
    accounts: [
      { konto: "2400", navn: "Leverandørgjeld", thisYear: 156000, lastYear: 198000 },
      { konto: "2600", navn: "Skattetrekk", thisYear: 89000, lastYear: 78000 },
      { konto: "2700", navn: "Skyldig MVA", thisYear: 112000, lastYear: 95000 },
      { konto: "2780", navn: "Påløpt lønn og feriepenger", thisYear: 88000, lastYear: 162596 },
    ]
  },
  {
    name: "Sum gjeld",
    accounts: [{ konto: "", navn: "", thisYear: 445000, lastYear: 533596 }],
    isSum: true
  },
  {
    name: "Sum egenkapital og gjeld",
    accounts: [{ konto: "", navn: "", thisYear: 1965000, lastYear: 1475000 }],
    isSum: true
  }
];

// ============================================================================
// COMPONENTS
// ============================================================================

// Animated Arc Progress
function ProgressArc({ progress, size = 200 }: { progress: number; size?: number }) {
  const strokeWidth = 12;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * Math.PI;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <div className="relative" style={{ width: size, height: size / 2 + 20 }}>
      <svg width={size} height={size / 2 + 20}>
        <path
          d={`M ${strokeWidth / 2} ${size / 2} A ${radius} ${radius} 0 0 1 ${size - strokeWidth / 2} ${size / 2}`}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-muted/30"
          strokeLinecap="round"
        />
        <motion.path
          d={`M ${strokeWidth / 2} ${size / 2} A ${radius} ${radius} 0 0 1 ${size - strokeWidth / 2} ${size / 2}`}
          fill="none"
          stroke="url(#progressGradient)"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset }}
          transition={{ duration: 1.5, ease: "easeOut" }}
        />
        <defs>
          <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="var(--primary)" />
            <stop offset="100%" stopColor="var(--primary)" stopOpacity="0.6" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-x-0 bottom-0 flex flex-col items-center">
        <motion.span
          className="font-display text-5xl font-bold"
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.5, duration: 0.5 }}
        >
          {progress}%
        </motion.span>
        <span className="text-sm text-muted-foreground">fullført</span>
      </div>
    </div>
  );
}

// Live Activity Feed
function LiveActivityFeed({ activities }: { activities: CiriActivity[] }) {
  const currentActivity = activities.find(a => a.status === "in_progress") || activities[0];
  const completedActivities = activities.filter(a => a.status === "completed").slice(0, 4);

  return (
    <div className="space-y-4">
      <div className="rounded-xl border-2 border-[var(--primary)]/20 bg-[var(--primary)]/5 p-4">
        <div className="flex items-center gap-3">
          <div className="relative">
            <CiriLogo size="sm" />
            <motion.div
              className="absolute -inset-1 rounded-full border-2 border-[var(--primary)]/40"
              animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0, 0.5] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <motion.div
                className="size-2 rounded-full bg-[var(--primary)]"
                animate={{ scale: [1, 1.3, 1] }}
                transition={{ duration: 1, repeat: Infinity }}
              />
              <span className="text-xs font-medium text-[var(--primary)]">Arbeider nå</span>
            </div>
            <p className="font-medium truncate">{currentActivity.task}</p>
          </div>
        </div>
      </div>
      <div className="space-y-2">
        {completedActivities.map((activity, index) => (
          <motion.div
            key={activity.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            className="flex items-center gap-3 text-sm"
          >
            <CheckCircle2Icon className="size-4 shrink-0 text-emerald-500" />
            <span className="flex-1 truncate text-muted-foreground">{activity.task}</span>
            <span className="text-xs text-muted-foreground shrink-0">
              {formatTimeAgo(activity.timestamp)}
            </span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

// Missing Bilag List
function MissingBilagList({ items }: { items: MissingBilag[] }) {
  const [filter, setFilter] = useState<string>("all");

  const filteredItems = items.filter(item => {
    if (filter === "all") return true;
    return item.status === filter;
  });

  const missingCount = items.filter(i => i.status === "missing").length;
  const reviewCount = items.filter(i => i.status === "needs_review").length;

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="destructive" className="font-normal">
            {missingCount} mangler
          </Badge>
          {reviewCount > 0 && (
            <Badge variant="outline" className="border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-400 font-normal">
              {reviewCount} gjennomgang
            </Badge>
          )}
        </div>
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-[140px] h-8">
            <SelectValue placeholder="Filter" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle</SelectItem>
            <SelectItem value="missing">Mangler</SelectItem>
            <SelectItem value="needs_review">Gjennomgang</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <ScrollArea className="h-[280px]">
        <div className="space-y-2 pr-4">
          {filteredItems.map((item, index) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className={cn(
                "group flex items-center gap-3 rounded-lg border p-3 transition-all hover:border-[var(--primary)]/30",
                item.status === "missing" && "bg-red-50/50 dark:bg-red-950/10",
                item.status === "needs_review" && "bg-amber-50/50 dark:bg-amber-950/10"
              )}
            >
              <div className={cn(
                "flex size-8 shrink-0 items-center justify-center rounded-lg",
                item.status === "missing" ? "bg-red-100 dark:bg-red-900/30" : "bg-amber-100 dark:bg-amber-900/30"
              )}>
                {item.status === "missing" ? (
                  <ReceiptIcon className="size-4 text-red-600 dark:text-red-400" />
                ) : (
                  <AlertCircleIcon className="size-4 text-amber-600 dark:text-amber-400" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <p className="font-medium truncate text-sm">{item.description}</p>
                <p className="text-xs text-muted-foreground">
                  {new Date(item.date).toLocaleDateString("nb-NO")}
                </p>
              </div>

              <p className="font-medium tabular-nums text-sm shrink-0">
                kr {Math.abs(item.amount).toLocaleString("nb-NO")}
              </p>

              <Button
                variant="ghost"
                size="icon"
                className="size-8 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
              >
                <UploadIcon className="size-4" />
              </Button>
            </motion.div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}

// Checklist Item Component
function ChecklistItemRow({ item, index }: { item: ChecklistItem; index: number }) {
  const [isOpen, setIsOpen] = useState(false);

  const statusConfig = {
    complete: { icon: CheckCircle2Icon, color: "text-emerald-600", bg: "bg-emerald-100 dark:bg-emerald-900/30", border: "border-emerald-200 dark:border-emerald-800" },
    warning: { icon: AlertCircleIcon, color: "text-amber-600", bg: "bg-amber-100 dark:bg-amber-900/30", border: "border-amber-200 dark:border-amber-800" },
    pending: { icon: ClockIcon, color: "text-muted-foreground", bg: "bg-muted", border: "border-muted" },
    in_progress: { icon: RefreshCwIcon, color: "text-[var(--primary)]", bg: "bg-[var(--primary)]/10", border: "border-[var(--primary)]/30" }
  };

  const status = statusConfig[item.status as keyof typeof statusConfig] ?? statusConfig.pending;
  const StatusIcon = status.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
    >
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <div className={cn(
          "rounded-xl border transition-all",
          status.border,
          item.status === "in_progress" && "ring-2 ring-[var(--primary)]/20"
        )}>
          <CollapsibleTrigger asChild>
            <button className="flex w-full items-center gap-4 p-4 text-left hover:bg-muted/30 transition-colors rounded-xl">
              <div className={cn("flex size-10 shrink-0 items-center justify-center rounded-lg", status.bg)}>
                <StatusIcon className={cn("size-5", status.color, item.status === "in_progress" && "animate-spin")} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-medium">{item.name}</p>
                  {item.status === "in_progress" && (
                    <Badge variant="secondary" className="text-xs bg-[var(--primary)]/10 text-[var(--primary)]">
                      Pågår
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">{item.detail || item.description}</p>
              </div>
              {item.subItems && (
                <ChevronDownIcon className={cn(
                  "size-5 text-muted-foreground transition-transform",
                  isOpen && "rotate-180"
                )} />
              )}
            </button>
          </CollapsibleTrigger>
          {item.subItems && (
            <CollapsibleContent>
              <div className="border-t px-4 py-3 space-y-2">
                {item.subItems.map((sub, i) => (
                  <div key={i} className="flex items-center gap-3 text-sm">
                    {sub.complete ? (
                      <CheckCircle2Icon className="size-4 text-emerald-500" />
                    ) : (
                      <div className="size-4 rounded-full border-2 border-muted-foreground/30" />
                    )}
                    <span className={sub.complete ? "text-muted-foreground" : ""}>{sub.name}</span>
                  </div>
                ))}
                {item.canAutoFix && item.status !== "complete" && (
                  <Button size="sm" variant="outline" className="mt-3 w-full">
                    <SparklesIcon className="mr-2 size-4" />
                    La Ciri fullføre
                  </Button>
                )}
              </div>
            </CollapsibleContent>
          )}
        </div>
      </Collapsible>
    </motion.div>
  );
}

// Financial Preview Card
function FinancialPreviewCard({
  title,
  amount,
  trend,
  trendValue,
  href,
  delay = 0
}: {
  title: string;
  amount: number;
  trend: "up" | "down" | "neutral";
  trendValue?: string;
  href: string;
  delay?: number;
}) {
  const isPositive = trend === "up";
  const isNeutral = trend === "neutral";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
    >
      <Card className="group cursor-pointer hover:border-[var(--primary)]/30 transition-all">
        <CardContent className="p-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-muted-foreground">{title}</p>
              <p className="font-display text-2xl font-bold mt-1">
                kr {amount.toLocaleString("nb-NO")}
              </p>
              {trendValue && !isNeutral && (
                <div className={cn(
                  "flex items-center gap-1 text-xs mt-1",
                  isPositive ? "text-emerald-600" : "text-red-500"
                )}>
                  {isPositive ? <TrendingUpIcon className="size-3" /> : <TrendingDownIcon className="size-3" />}
                  <span>{trendValue} fra i fjor</span>
                </div>
              )}
            </div>
            <ChevronRightIcon className="size-5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// Account Line Row with expandable bilag
function AccountLineRow({ account, isLast }: { account: AccountLine; isLast: boolean }) {
  const [isOpen, setIsOpen] = useState(false);
  const hasBilag = account.bilag && account.bilag.length > 0;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild disabled={!hasBilag}>
        <div className={cn(
          "grid grid-cols-12 gap-4 py-3 px-4 text-sm transition-colors",
          hasBilag && "cursor-pointer hover:bg-muted/50",
          !isLast && "border-b"
        )}>
          <div className="col-span-2 text-muted-foreground font-mono">{account.konto}</div>
          <div className="col-span-6 flex items-center gap-2">
            {account.navn}
            {hasBilag && (
              <Badge variant="secondary" className="text-xs h-5 px-1.5">
                {account.bilag?.length}
                <ChevronDownIcon className={cn("size-3 ml-0.5 transition-transform", isOpen && "rotate-180")} />
              </Badge>
            )}
          </div>
          <div className={cn("col-span-2 text-right tabular-nums font-medium", account.thisYear < 0 && "text-red-600")}>
            {account.thisYear.toLocaleString("nb-NO")}
          </div>
          <div className="col-span-2 text-right tabular-nums text-muted-foreground">
            {account.lastYear.toLocaleString("nb-NO")}
          </div>
        </div>
      </CollapsibleTrigger>

      {hasBilag && (
        <CollapsibleContent>
          <div className="bg-muted/30 border-b">
            {account.bilag?.map((bilag, i) => (
              <div key={bilag.id} className={cn(
                "grid grid-cols-12 gap-4 py-2 px-4 text-xs",
                i !== account.bilag!.length - 1 && "border-b border-dashed"
              )}>
                <div className="col-span-2 font-mono text-muted-foreground">{bilag.id}</div>
                <div className="col-span-4 flex items-center gap-2 text-muted-foreground">
                  <FileTextIcon className="size-3" />
                  {bilag.description}
                </div>
                <div className="col-span-2 text-muted-foreground">{bilag.date}</div>
                <div className={cn("col-span-2 text-right tabular-nums", bilag.amount < 0 && "text-red-500")}>
                  {bilag.amount.toLocaleString("nb-NO")}
                </div>
                <div className="col-span-2 text-right">
                  <Button variant="ghost" size="sm" className="h-6 px-2 text-xs">
                    <EyeIcon className="size-3 mr-1" />
                    Se
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CollapsibleContent>
      )}
    </Collapsible>
  );
}

// Account Group Section
function AccountGroupSection({ group, index }: { group: AccountGroup; index: number }) {
  const [isOpen, setIsOpen] = useState(true);

  if (group.isSum) {
    const line = group.accounts[0];
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: index * 0.05 }}
        className="grid grid-cols-12 gap-4 py-3 px-4 bg-muted/50 font-semibold text-sm"
      >
        <div className="col-span-2"></div>
        <div className="col-span-6">{group.name}</div>
        <div className={cn("col-span-2 text-right tabular-nums", line.thisYear < 0 && "text-red-600")}>
          {line.thisYear.toLocaleString("nb-NO")}
        </div>
        <div className="col-span-2 text-right tabular-nums text-muted-foreground">
          {line.lastYear.toLocaleString("nb-NO")}
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
    >
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <div className="flex items-center gap-2 py-2 px-4 bg-muted/30 cursor-pointer hover:bg-muted/50 transition-colors border-y">
            <ChevronDownIcon className={cn("size-4 transition-transform", isOpen && "rotate-180")} />
            <span className="font-semibold text-sm">{group.name}</span>
          </div>
        </CollapsibleTrigger>
        <CollapsibleContent>
          {group.accounts.map((account, i) => (
            <AccountLineRow key={account.konto || i} account={account} isLast={i === group.accounts.length - 1} />
          ))}
        </CollapsibleContent>
      </Collapsible>
    </motion.div>
  );
}

// Full Årsregnskap View
function ArsregnskapFullView() {
  const [activeTab, setActiveTab] = useState<"resultat" | "balanse">("resultat");

  return (
    <div className="space-y-6">
      {/* Header with tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex gap-2">
          <Button
            variant={activeTab === "resultat" ? "default" : "outline"}
            onClick={() => setActiveTab("resultat")}
            className="gap-2"
          >
            <TrendingUpIcon className="size-4" />
            Resultatregnskap
          </Button>
          <Button
            variant={activeTab === "balanse" ? "default" : "outline"}
            onClick={() => setActiveTab("balanse")}
            className="gap-2"
          >
            <ScaleIcon className="size-4" />
            Balanse
          </Button>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <DownloadIcon className="size-4 mr-2" />
            Eksporter
          </Button>
          <Button variant="outline" size="sm">
            <EyeIcon className="size-4 mr-2" />
            Skriv ut
          </Button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === "resultat" && (
          <motion.div
            key="resultat"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
          >
            <Card>
              <CardHeader className="border-b">
                <CardTitle className="font-display">Resultatregnskap</CardTitle>
                <CardDescription>Mitt Konsulentselskap AS - Regnskapsåret 2025</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                {/* Column headers */}
                <div className="grid grid-cols-12 gap-4 py-3 px-4 bg-muted/50 text-xs font-medium text-muted-foreground border-b">
                  <div className="col-span-2">Konto</div>
                  <div className="col-span-6">Beskrivelse</div>
                  <div className="col-span-2 text-right">2025</div>
                  <div className="col-span-2 text-right">2024</div>
                </div>
                {/* Data rows */}
                <div>
                  {resultatregnskapData.map((group, index) => (
                    <AccountGroupSection key={group.name} group={group} index={index} />
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {activeTab === "balanse" && (
          <motion.div
            key="balanse"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="space-y-6"
          >
            {/* Aktiva */}
            <Card>
              <CardHeader className="border-b">
                <CardTitle className="font-display">Balanse - Eiendeler</CardTitle>
                <CardDescription>Mitt Konsulentselskap AS - Per 31.12.2025</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <div className="grid grid-cols-12 gap-4 py-3 px-4 bg-muted/50 text-xs font-medium text-muted-foreground border-b">
                  <div className="col-span-2">Konto</div>
                  <div className="col-span-6">Beskrivelse</div>
                  <div className="col-span-2 text-right">2025</div>
                  <div className="col-span-2 text-right">2024</div>
                </div>
                <div>
                  {balanseAktivaData.map((group, index) => (
                    <AccountGroupSection key={group.name} group={group} index={index} />
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Passiva */}
            <Card>
              <CardHeader className="border-b">
                <CardTitle className="font-display">Balanse - Egenkapital og gjeld</CardTitle>
                <CardDescription>Mitt Konsulentselskap AS - Per 31.12.2025</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <div className="grid grid-cols-12 gap-4 py-3 px-4 bg-muted/50 text-xs font-medium text-muted-foreground border-b">
                  <div className="col-span-2">Konto</div>
                  <div className="col-span-6">Beskrivelse</div>
                  <div className="col-span-2 text-right">2025</div>
                  <div className="col-span-2 text-right">2024</div>
                </div>
                <div>
                  {balansePassivaData.map((group, index) => (
                    <AccountGroupSection key={group.name} group={group} index={index} />
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}

// Helper function
function formatTimeAgo(date: Date): string {
  const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
  if (seconds < 60) return "nå";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min siden`;
  const hours = Math.floor(minutes / 60);
  return `${hours} t siden`;
}

// ============================================================================
// MAIN PAGE
// ============================================================================

export default function ArsregnskapPage() {
  const [view, setView] = useState<"summary" | "full">("summary");

  const completedItems = checklistItems.filter(i => i.status === "complete").length;
  const totalItems = checklistItems.length;
  const progressPercent = Math.round((completedItems / totalItems) * 100);

  const deadline = new Date("2026-06-30");
  const today = new Date();
  const daysUntilDeadline = Math.ceil((deadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  const currentPhase = checklistItems.find(i => i.status === "in_progress")?.name || "Forberedelse";

  return (
    <div className="mx-auto max-w-6xl space-y-6 pb-12">
      {/* Header with view toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="font-display text-3xl font-bold tracking-tight">Årsregnskap 2025</h1>
          <p className="text-muted-foreground mt-1">
            {view === "summary" ? "Ciri forbereder regnskapet for innsending" : "Fullstendig regnskap med detaljer"}
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex items-center gap-2 p-1 rounded-lg bg-muted"
        >
          <Button
            variant={view === "summary" ? "default" : "ghost"}
            size="sm"
            onClick={() => setView("summary")}
            className="gap-2"
          >
            <LayoutDashboardIcon className="size-4" />
            Oversikt
          </Button>
          <Button
            variant={view === "full" ? "default" : "ghost"}
            size="sm"
            onClick={() => setView("full")}
            className="gap-2"
          >
            <FileSpreadsheetIcon className="size-4" />
            Årsregnskap
          </Button>
        </motion.div>
      </div>

      <AnimatePresence mode="wait">
        {view === "summary" ? (
          <motion.div
            key="summary"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-6"
          >
            {/* Progress Hero */}
            <Card className="relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-[var(--primary)]/5 via-transparent to-[var(--primary)]/5" />
              <CardContent className="relative p-8">
                <div className="flex flex-col md:flex-row items-center gap-8">
                  <div className="flex flex-col items-center">
                    <ProgressArc progress={progressPercent} />
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.8 }}
                      className="mt-4 text-center"
                    >
                      <Badge variant="secondary" className="bg-[var(--primary)]/10 text-[var(--primary)]">
                        {currentPhase}
                      </Badge>
                    </motion.div>
                  </div>
                  <div className="flex-1 space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="rounded-xl border bg-card p-4">
                        <div className="flex items-center gap-3">
                          <div className="flex size-10 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
                            <CheckCircle2Icon className="size-5 text-emerald-600" />
                          </div>
                          <div>
                            <p className="text-2xl font-bold">{completedItems}</p>
                            <p className="text-xs text-muted-foreground">av {totalItems} fullført</p>
                          </div>
                        </div>
                      </div>
                      <div className="rounded-xl border bg-card p-4">
                        <div className="flex items-center gap-3">
                          <div className="flex size-10 items-center justify-center rounded-lg bg-[var(--primary)]/10">
                            <CalendarIcon className="size-5 text-[var(--primary)]" />
                          </div>
                          <div>
                            <p className="text-2xl font-bold">{daysUntilDeadline}</p>
                            <p className="text-xs text-muted-foreground">dager til frist</p>
                          </div>
                        </div>
                      </div>
                    </div>
                    <LiveActivityFeed activities={ciriActivities} />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Two Column Layout */}
            <div className="grid gap-6 lg:grid-cols-5">
              <div className="lg:col-span-3 space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="font-display text-xl font-semibold">Sjekkliste</h2>
                  <span className="text-sm text-muted-foreground">
                    {completedItems} av {totalItems} fullført
                  </span>
                </div>
                <div className="space-y-3">
                  {checklistItems.map((item, index) => (
                    <ChecklistItemRow key={item.id} item={item} index={index} />
                  ))}
                </div>
              </div>

              <div className="lg:col-span-2">
                <Card className="h-full">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <ReceiptIcon className="size-5 text-red-500" />
                      Manglende bilag
                    </CardTitle>
                    <CardDescription>
                      Transaksjoner som trenger dokumentasjon
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <MissingBilagList items={missingBilagData} />
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Financial Preview */}
            <div>
              <h2 className="font-display text-xl font-semibold mb-4">Nøkkeltall</h2>
              <div className="grid gap-4 sm:grid-cols-3">
                <FinancialPreviewCard
                  title="Årsresultat"
                  amount={778596}
                  trend="up"
                  trendValue="+61%"
                  href="/dashboard/resultat"
                  delay={0.1}
                />
                <FinancialPreviewCard
                  title="Omsetning"
                  amount={4250000}
                  trend="up"
                  trendValue="+20%"
                  href="/dashboard/resultat"
                  delay={0.15}
                />
                <FinancialPreviewCard
                  title="Egenkapital"
                  amount={1520000}
                  trend="up"
                  trendValue="+61%"
                  href="/dashboard/balanse"
                  delay={0.2}
                />
              </div>
            </div>

            {/* Actions */}
            <Card>
              <CardContent className="p-6">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div>
                    <p className="font-medium">Klar til å generere årsregnskap?</p>
                    <p className="text-sm text-muted-foreground">
                      Fullfør alle oppgaver i sjekklisten først.
                    </p>
                  </div>
                  <div className="flex gap-3 flex-wrap justify-center">
                    <Button variant="outline" onClick={() => setView("full")}>
                      <EyeIcon className="mr-2 size-4" />
                      Se årsregnskap
                    </Button>
                    <Button variant="outline">
                      <DownloadIcon className="mr-2 size-4" />
                      Last ned PDF
                    </Button>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span>
                            <Button disabled={progressPercent < 100}>
                              <SendIcon className="mr-2 size-4" />
                              Send til Altinn
                            </Button>
                          </span>
                        </TooltipTrigger>
                        {progressPercent < 100 && (
                          <TooltipContent>
                            <p>Fullfør sjekklisten først</p>
                          </TooltipContent>
                        )}
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Ciri footer */}
            <div className="flex items-center gap-3 rounded-xl border bg-muted/30 p-4">
              <CiriLogo size="sm" />
              <p className="flex-1 text-sm">
                <span className="font-medium">Ciri jobber kontinuerlig</span>
                <span className="text-muted-foreground"> med å forberede årsregnskapet. Du blir varslet når noe trenger din oppmerksomhet.</span>
              </p>
              <Badge variant="outline" className="shrink-0 border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-400">
                <SparklesIcon className="mr-1 size-3" />
                Aktiv
              </Badge>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="full"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <ArsregnskapFullView />
          </motion.div>
        )}
      </AnimatePresence>

      <LearnMoreDocs sections={["rapporter", "bokforing"]} />
    </div>
  );
}
