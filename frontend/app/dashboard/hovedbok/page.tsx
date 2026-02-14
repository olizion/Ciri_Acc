"use client";

import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { format, startOfMonth, endOfMonth, subMonths, startOfQuarter, endOfQuarter, startOfYear, endOfYear, isWithinInterval, parseISO } from "date-fns";
import { nb } from "date-fns/locale";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Calendar } from "@/components/ui/calendar";
import { Skeleton } from "@/components/ui/skeleton";
import LearnMoreDocs from "@/components/learn-more-docs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  SearchIcon,
  FilterIcon,
  DownloadIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  XIcon,
  CalendarIcon,
  FileSpreadsheetIcon,
  FileTextIcon,
  SparklesIcon,
  TrendingUpIcon,
  TrendingDownIcon,
  AlertCircleIcon,
  CheckCircle2Icon,
  InfoIcon,
  BuildingIcon,
  FolderIcon,
  UsersIcon,
  ReceiptIcon,
  WalletIcon,
  ArrowRightIcon,
  RefreshCwIcon,
  Loader2Icon,
  FileDownIcon,
  EyeIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { API_BASE_URL, COMPANY_ID } from "@/lib/api";
import { getPdfThemeColors } from "@/lib/ciri-theme";
import { useCiriActionListener } from "@/lib/ciri-actions";
import CiriLogo from "@/components/layout/ciri-logo";

// Helper function to get date range from period preset
function getDateRangeFromPeriod(period: string, customFrom?: Date, customTo?: Date): { from: Date; to: Date } {
  const now = new Date();

  switch (period) {
    case "denne-maned":
      return { from: startOfMonth(now), to: endOfMonth(now) };
    case "forrige-maned":
      const lastMonth = subMonths(now, 1);
      return { from: startOfMonth(lastMonth), to: endOfMonth(lastMonth) };
    case "dette-kvartal":
      return { from: startOfQuarter(now), to: endOfQuarter(now) };
    case "dette-ar":
      return { from: startOfYear(now), to: endOfYear(now) };
    case "egendefinert":
      return {
        from: customFrom || startOfYear(now),
        to: customTo || endOfYear(now)
      };
    default:
      return { from: startOfYear(now), to: endOfYear(now) };
  }
}

// Types
interface Transaksjon {
  id: string;
  dato: string;
  bilagId?: string;  // Link to bilag detail
  bilagsnummer: string;
  beskrivelse: string;
  debet: number;
  kredit: number;
  motpart: string;
}

interface HovedboKonto {
  kontonummer: string;
  kontonavn: string;
  klasse: string;
  klasseNummer: number;
  inngaendeBalanse: number;
  debet: number;
  kredit: number;
  utgaendeBalanse: number;
  transaksjoner: Transaksjon[];
}

interface KontoKlasse {
  nummer: number;
  navn: string;
  kontoer: HovedboKonto[];
}

// Account class definitions
const kontoKlasser: Record<number, string> = {
  1: "Eiendeler",
  2: "Egenkapital og gjeld",
  3: "Salgs- og driftsinntekter",
  4: "Varekostnad",
  5: "Lønnskostnader",
  6: "Avskrivninger og nedskrivninger",
  7: "Andre driftskostnader",
  8: "Finansposter",
};

// Sample hovedbok data - dates span December 2025 to February 2026
const hovedbokData: HovedboKonto[] = [
  // Class 1 - Eiendeler
  {
    kontonummer: "1200",
    kontonavn: "Maskiner og anlegg",
    klasse: "Eiendeler",
    klasseNummer: 1,
    inngaendeBalanse: 450000,
    debet: 125000,
    kredit: 0,
    utgaendeBalanse: 575000,
    transaksjoner: [
      { id: "t1", dato: "2026-01-15", bilagsnummer: "B-2026-0012", beskrivelse: "Ny produksjonsmaskin", debet: 125000, kredit: 0, motpart: "2400" },
    ]
  },
  {
    kontonummer: "1500",
    kontonavn: "Kundefordringer",
    klasse: "Eiendeler",
    klasseNummer: 1,
    inngaendeBalanse: 287500,
    debet: 542000,
    kredit: 498000,
    utgaendeBalanse: 331500,
    transaksjoner: [
      { id: "t2", dato: "2025-12-02", bilagsnummer: "B-2025-0945", beskrivelse: "Faktura #1247 - Kunde AS", debet: 187500, kredit: 0, motpart: "3000" },
      { id: "t3", dato: "2025-12-08", bilagsnummer: "B-2025-0956", beskrivelse: "Innbetaling fra Kunde AS", debet: 0, kredit: 187500, motpart: "1920" },
      { id: "t4", dato: "2026-01-10", bilagsnummer: "B-2026-0005", beskrivelse: "Faktura #1248 - Bedrift Norge AS", debet: 234500, kredit: 0, motpart: "3000" },
      { id: "t5", dato: "2026-01-18", bilagsnummer: "B-2026-0015", beskrivelse: "Innbetaling fra Bedrift Norge AS", debet: 0, kredit: 190500, motpart: "1920" },
      { id: "t6", dato: "2026-01-25", bilagsnummer: "B-2026-0022", beskrivelse: "Faktura #1249 - Tech Solutions", debet: 120000, kredit: 0, motpart: "3000" },
      { id: "t7", dato: "2026-02-01", bilagsnummer: "B-2026-0030", beskrivelse: "Innbetaling fra Tech Solutions", debet: 0, kredit: 120000, motpart: "1920" },
    ]
  },
  {
    kontonummer: "1920",
    kontonavn: "Bankinnskudd",
    klasse: "Eiendeler",
    klasseNummer: 1,
    inngaendeBalanse: 1245000,
    debet: 847500,
    kredit: 692000,
    utgaendeBalanse: 1400500,
    transaksjoner: [
      { id: "t8", dato: "2025-12-05", bilagsnummer: "B-2025-0949", beskrivelse: "Overføring fra kunde", debet: 245000, kredit: 0, motpart: "1500" },
      { id: "t9", dato: "2025-12-10", bilagsnummer: "B-2025-0962", beskrivelse: "Husleie desember", debet: 0, kredit: 45000, motpart: "6300" },
      { id: "t10", dato: "2025-12-12", bilagsnummer: "B-2025-0967", beskrivelse: "Strøm og energi", debet: 0, kredit: 12500, motpart: "6340" },
      { id: "t11", dato: "2026-01-05", bilagsnummer: "B-2026-0002", beskrivelse: "Kundeinnbetaling", debet: 187500, kredit: 0, motpart: "1500" },
      { id: "t12", dato: "2026-01-20", bilagsnummer: "B-2026-0018", beskrivelse: "Lønn januar", debet: 0, kredit: 385000, motpart: "5000" },
      { id: "t13", dato: "2026-01-25", bilagsnummer: "B-2026-0023", beskrivelse: "Leverandørbetaling", debet: 0, kredit: 124500, motpart: "2400" },
      { id: "t14", dato: "2026-01-28", bilagsnummer: "B-2026-0026", beskrivelse: "Innbetaling prosjekt", debet: 315000, kredit: 0, motpart: "1500" },
      { id: "t15", dato: "2026-02-01", bilagsnummer: "B-2026-0031", beskrivelse: "MVA-betaling", debet: 0, kredit: 87500, motpart: "2740" },
      { id: "t16", dato: "2026-02-01", bilagsnummer: "B-2026-0032", beskrivelse: "Kundeinnbetaling", debet: 100000, kredit: 0, motpart: "1500" },
      { id: "t17", dato: "2025-12-08", bilagsnummer: "B-2025-0958", beskrivelse: "Forsikring", debet: 0, kredit: 37500, motpart: "7500" },
    ]
  },
  // Class 2 - Egenkapital og gjeld
  {
    kontonummer: "2000",
    kontonavn: "Aksjekapital",
    klasse: "Egenkapital og gjeld",
    klasseNummer: 2,
    inngaendeBalanse: -100000,
    debet: 0,
    kredit: 0,
    utgaendeBalanse: -100000,
    transaksjoner: []
  },
  {
    kontonummer: "2050",
    kontonavn: "Annen egenkapital",
    klasse: "Egenkapital og gjeld",
    klasseNummer: 2,
    inngaendeBalanse: -890000,
    debet: 0,
    kredit: 245000,
    utgaendeBalanse: -1135000,
    transaksjoner: [
      { id: "t18", dato: "2025-12-31", bilagsnummer: "B-2025-0999", beskrivelse: "Resultatoverføring", debet: 0, kredit: 245000, motpart: "8800" },
    ]
  },
  {
    kontonummer: "2400",
    kontonavn: "Leverandørgjeld",
    klasse: "Egenkapital og gjeld",
    klasseNummer: 2,
    inngaendeBalanse: -178500,
    debet: 298500,
    kredit: 412000,
    utgaendeBalanse: -292000,
    transaksjoner: [
      { id: "t19", dato: "2025-12-03", bilagsnummer: "B-2025-0947", beskrivelse: "Faktura fra IT-leverandør", debet: 0, kredit: 87500, motpart: "6500" },
      { id: "t20", dato: "2025-12-08", bilagsnummer: "B-2025-0958", beskrivelse: "Betaling til leverandør", debet: 65000, kredit: 0, motpart: "1920" },
      { id: "t21", dato: "2026-01-08", bilagsnummer: "B-2026-0004", beskrivelse: "Varekjøp", debet: 0, kredit: 199500, motpart: "4000" },
      { id: "t22", dato: "2026-01-15", bilagsnummer: "B-2026-0011", beskrivelse: "Betaling vareleverandør", debet: 145000, kredit: 0, motpart: "1920" },
      { id: "t23", dato: "2026-01-22", bilagsnummer: "B-2026-0019", beskrivelse: "Kontorutstyr", debet: 0, kredit: 45000, motpart: "6800" },
      { id: "t24", dato: "2026-01-28", bilagsnummer: "B-2026-0025", beskrivelse: "Betaling kontorrekvisita", debet: 45000, kredit: 0, motpart: "1920" },
      { id: "t25", dato: "2026-02-01", bilagsnummer: "B-2026-0033", beskrivelse: "Rådgivningstjenester", debet: 0, kredit: 80000, motpart: "6700" },
      { id: "t26", dato: "2026-02-01", bilagsnummer: "B-2026-0034", beskrivelse: "Delvis betaling rådgiver", debet: 43500, kredit: 0, motpart: "1920" },
    ]
  },
  {
    kontonummer: "2740",
    kontonavn: "Skyldig MVA",
    klasse: "Egenkapital og gjeld",
    klasseNummer: 2,
    inngaendeBalanse: -87500,
    debet: 87500,
    kredit: 112500,
    utgaendeBalanse: -112500,
    transaksjoner: [
      { id: "t27", dato: "2025-12-10", bilagsnummer: "B-2025-0964", beskrivelse: "Utgående MVA desember", debet: 0, kredit: 56250, motpart: "3000" },
      { id: "t28", dato: "2026-01-10", bilagsnummer: "B-2026-0006", beskrivelse: "MVA-betaling 6. termin", debet: 87500, kredit: 0, motpart: "1920" },
      { id: "t29", dato: "2026-01-31", bilagsnummer: "B-2026-0028", beskrivelse: "Utgående MVA januar", debet: 0, kredit: 56250, motpart: "3000" },
    ]
  },
  // Class 3 - Inntekter
  {
    kontonummer: "3000",
    kontonavn: "Salgsinntekt, avgiftspliktig",
    klasse: "Salgs- og driftsinntekter",
    klasseNummer: 3,
    inngaendeBalanse: 0,
    debet: 0,
    kredit: 1450000,
    utgaendeBalanse: -1450000,
    transaksjoner: [
      { id: "t30", dato: "2025-12-05", bilagsnummer: "B-2025-0950", beskrivelse: "Salg prosjekt A", debet: 0, kredit: 425000, motpart: "1500" },
      { id: "t31", dato: "2025-12-12", bilagsnummer: "B-2025-0966", beskrivelse: "Konsulentoppdrag", debet: 0, kredit: 287500, motpart: "1500" },
      { id: "t32", dato: "2026-01-08", bilagsnummer: "B-2026-0003", beskrivelse: "Produktsalg", debet: 0, kredit: 312500, motpart: "1500" },
      { id: "t33", dato: "2026-01-20", bilagsnummer: "B-2026-0017", beskrivelse: "Serviceavtale", debet: 0, kredit: 175000, motpart: "1500" },
      { id: "t34", dato: "2026-02-01", bilagsnummer: "B-2026-0035", beskrivelse: "Prosjektleveranse", debet: 0, kredit: 250000, motpart: "1500" },
    ]
  },
  // Class 4 - Varekostnad
  {
    kontonummer: "4000",
    kontonavn: "Varekjøp",
    klasse: "Varekostnad",
    klasseNummer: 4,
    inngaendeBalanse: 0,
    debet: 485000,
    kredit: 0,
    utgaendeBalanse: 485000,
    transaksjoner: [
      { id: "t35", dato: "2025-12-08", bilagsnummer: "B-2025-0957", beskrivelse: "Innkjøp komponenter", debet: 187500, kredit: 0, motpart: "2400" },
      { id: "t36", dato: "2026-01-12", bilagsnummer: "B-2026-0008", beskrivelse: "Råvarer produksjon", debet: 142500, kredit: 0, motpart: "2400" },
      { id: "t37", dato: "2026-01-28", bilagsnummer: "B-2026-0024", beskrivelse: "Materialkjøp", debet: 155000, kredit: 0, motpart: "2400" },
    ]
  },
  // Class 5 - Lønnskostnader
  {
    kontonummer: "5000",
    kontonavn: "Lønn til ansatte",
    klasse: "Lønnskostnader",
    klasseNummer: 5,
    inngaendeBalanse: 0,
    debet: 645000,
    kredit: 0,
    utgaendeBalanse: 645000,
    transaksjoner: [
      { id: "t38", dato: "2025-12-20", bilagsnummer: "B-2025-0980", beskrivelse: "Lønn desember", debet: 320000, kredit: 0, motpart: "1920" },
      { id: "t39", dato: "2026-01-20", bilagsnummer: "B-2026-0016", beskrivelse: "Lønn januar", debet: 325000, kredit: 0, motpart: "1920" },
    ]
  },
  {
    kontonummer: "5400",
    kontonavn: "Arbeidsgiveravgift",
    klasse: "Lønnskostnader",
    klasseNummer: 5,
    inngaendeBalanse: 0,
    debet: 91035,
    kredit: 0,
    utgaendeBalanse: 91035,
    transaksjoner: [
      { id: "t40", dato: "2025-12-20", bilagsnummer: "B-2025-0981", beskrivelse: "AGA desember", debet: 45120, kredit: 0, motpart: "2770" },
      { id: "t41", dato: "2026-01-20", bilagsnummer: "B-2026-0016b", beskrivelse: "AGA januar", debet: 45915, kredit: 0, motpart: "2770" },
    ]
  },
  // Class 6 - Andre driftskostnader
  {
    kontonummer: "6300",
    kontonavn: "Leie lokaler",
    klasse: "Andre driftskostnader",
    klasseNummer: 6,
    inngaendeBalanse: 0,
    debet: 90000,
    kredit: 0,
    utgaendeBalanse: 90000,
    transaksjoner: [
      { id: "t42", dato: "2025-12-01", bilagsnummer: "B-2025-0941", beskrivelse: "Husleie desember", debet: 45000, kredit: 0, motpart: "1920" },
      { id: "t43", dato: "2026-01-02", bilagsnummer: "B-2026-0001", beskrivelse: "Husleie januar", debet: 45000, kredit: 0, motpart: "1920" },
    ]
  },
  {
    kontonummer: "6500",
    kontonavn: "Programvare og IT-tjenester",
    klasse: "Andre driftskostnader",
    klasseNummer: 6,
    inngaendeBalanse: 0,
    debet: 142500,
    kredit: 0,
    utgaendeBalanse: 142500,
    transaksjoner: [
      { id: "t44", dato: "2025-12-05", bilagsnummer: "B-2025-0951", beskrivelse: "Microsoft 365 lisenser", debet: 12500, kredit: 0, motpart: "2400" },
      { id: "t45", dato: "2025-12-12", bilagsnummer: "B-2025-0968", beskrivelse: "AWS hosting", debet: 35000, kredit: 0, motpart: "2400" },
      { id: "t46", dato: "2026-01-05", bilagsnummer: "B-2026-0002b", beskrivelse: "Slack Enterprise", debet: 8500, kredit: 0, motpart: "2400" },
      { id: "t47", dato: "2026-01-15", bilagsnummer: "B-2026-0010", beskrivelse: "GitHub Team", debet: 4500, kredit: 0, motpart: "2400" },
      { id: "t48", dato: "2026-01-22", bilagsnummer: "B-2026-0020", beskrivelse: "IT-konsulent", debet: 82000, kredit: 0, motpart: "2400" },
    ]
  },
  {
    kontonummer: "6800",
    kontonavn: "Kontorrekvisita",
    klasse: "Andre driftskostnader",
    klasseNummer: 6,
    inngaendeBalanse: 0,
    debet: 23500,
    kredit: 0,
    utgaendeBalanse: 23500,
    transaksjoner: [
      { id: "t49", dato: "2025-12-08", bilagsnummer: "B-2025-0959", beskrivelse: "Kontorrekvisita", debet: 8500, kredit: 0, motpart: "2400" },
      { id: "t50", dato: "2026-01-08", bilagsnummer: "B-2026-0003b", beskrivelse: "Printerpapir og toner", debet: 4500, kredit: 0, motpart: "2400" },
      { id: "t51", dato: "2026-01-18", bilagsnummer: "B-2026-0014", beskrivelse: "Møteromutstyr", debet: 10500, kredit: 0, motpart: "2400" },
    ]
  },
  // Class 7 - Andre driftskostnader
  {
    kontonummer: "7100",
    kontonavn: "Bilkostnader",
    klasse: "Andre driftskostnader",
    klasseNummer: 7,
    inngaendeBalanse: 0,
    debet: 28500,
    kredit: 0,
    utgaendeBalanse: 28500,
    transaksjoner: [
      { id: "t52", dato: "2025-12-15", bilagsnummer: "B-2025-0972", beskrivelse: "Drivstoff firmabil", debet: 4500, kredit: 0, motpart: "1920" },
      { id: "t53", dato: "2025-12-28", bilagsnummer: "B-2025-0990", beskrivelse: "Service firmabil", debet: 12500, kredit: 0, motpart: "2400" },
      { id: "t54", dato: "2026-01-15", bilagsnummer: "B-2026-0009", beskrivelse: "Drivstoff januar", debet: 5500, kredit: 0, motpart: "1920" },
      { id: "t55", dato: "2026-01-28", bilagsnummer: "B-2026-0027", beskrivelse: "Bomavgifter Q4", debet: 6000, kredit: 0, motpart: "1920" },
    ]
  },
  {
    kontonummer: "7500",
    kontonavn: "Forsikringer",
    klasse: "Andre driftskostnader",
    klasseNummer: 7,
    inngaendeBalanse: 0,
    debet: 75000,
    kredit: 0,
    utgaendeBalanse: 75000,
    transaksjoner: [
      { id: "t56", dato: "2025-12-01", bilagsnummer: "B-2025-0942", beskrivelse: "Bedriftsforsikring kvartal", debet: 37500, kredit: 0, motpart: "1920" },
      { id: "t57", dato: "2026-01-02", bilagsnummer: "B-2026-0001b", beskrivelse: "Ansvarsforsikring", debet: 37500, kredit: 0, motpart: "1920" },
    ]
  },
  // Class 8 - Finansposter
  {
    kontonummer: "8040",
    kontonavn: "Renteinntekter",
    klasse: "Finansposter",
    klasseNummer: 8,
    inngaendeBalanse: 0,
    debet: 0,
    kredit: 12500,
    utgaendeBalanse: -12500,
    transaksjoner: [
      { id: "t58", dato: "2025-12-31", bilagsnummer: "B-2025-0998", beskrivelse: "Renter bankkonto desember", debet: 0, kredit: 6250, motpart: "1920" },
      { id: "t59", dato: "2026-01-31", bilagsnummer: "B-2026-0029", beskrivelse: "Renter bankkonto januar", debet: 0, kredit: 6250, motpart: "1920" },
    ]
  },
  {
    kontonummer: "8150",
    kontonavn: "Rentekostnader",
    klasse: "Finansposter",
    klasseNummer: 8,
    inngaendeBalanse: 0,
    debet: 8500,
    kredit: 0,
    utgaendeBalanse: 8500,
    transaksjoner: [
      { id: "t60", dato: "2025-12-31", bilagsnummer: "B-2025-0997", beskrivelse: "Renter kassakreditt des", debet: 4250, kredit: 0, motpart: "1920" },
      { id: "t61", dato: "2026-01-31", bilagsnummer: "B-2026-0029b", beskrivelse: "Renter kassakreditt jan", debet: 4250, kredit: 0, motpart: "1920" },
    ]
  },
];

// Period options
const periodeValg = [
  { id: "denne-maned", label: "Denne måned", shortLabel: "Mnd" },
  { id: "forrige-maned", label: "Forrige måned", shortLabel: "Forr." },
  { id: "dette-kvartal", label: "Dette kvartal", shortLabel: "Kv." },
  { id: "dette-ar", label: "Dette år", shortLabel: "År" },
  { id: "egendefinert", label: "Egendefinert", shortLabel: "..." },
];

// Ciri insights data
const ciriInnsikter = [
  {
    type: "warning" as const,
    message: "Konto 2400 har uvanlig høy aktivitet denne måneden (+127% fra forrige)",
    konto: "2400"
  },
  {
    type: "info" as const,
    message: "Konto 6500 nærmer seg budsjettgrense (87% brukt)",
    konto: "6500"
  },
];

export default function HovedbokPage() {
  const [selectedPeriode, setSelectedPeriode] = useState("dette-ar");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterOpen, setFilterOpen] = useState(false);
  const [expandedKontoer, setExpandedKontoer] = useState<Set<string>>(new Set());
  const [expandedKlasser, setExpandedKlasser] = useState<Set<number>>(new Set([1, 2, 3]));
  const [customDatePickerOpen, setCustomDatePickerOpen] = useState(false);

  // Custom date range for "Egendefinert"
  const [customDateFrom, setCustomDateFrom] = useState<Date | undefined>(undefined);
  const [customDateTo, setCustomDateTo] = useState<Date | undefined>(undefined);

  // Refresh state
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  // Highlighted account (for Ciri insights navigation)
  const [highlightedKonto, setHighlightedKonto] = useState<string | null>(null);

  // Ciri bubble action listeners
  const hovedbokSearchRef = useRef<HTMLInputElement>(null);
  useCiriActionListener("sok-konto", useCallback(() => hovedbokSearchRef.current?.focus(), []));
  useCiriActionListener("vis-filter", useCallback(() => setFilterOpen(true), []));

  // Filters
  const [filters, setFilters] = useState({
    kontoFra: "",
    kontoTil: "",
    avdeling: "",
    prosjekt: "",
  });

  // Active filter chips
  const activeFilters = Object.entries(filters).filter(([_, value]) => value !== "");

  // API data state
  const [apiData, setApiData] = useState<HovedboKonto[] | null>(null);
  const [apiLoading, setApiLoading] = useState(false);

  // Calculate current date range
  const dateRange = useMemo(() => {
    return getDateRangeFromPeriod(selectedPeriode, customDateFrom, customDateTo);
  }, [selectedPeriode, customDateFrom, customDateTo]);

  // Fetch hovedbok data from API
  useEffect(() => {
    async function fetchHovedbokData() {
      try {
        setApiLoading(true);
        const params = new URLSearchParams({
          company_id: COMPANY_ID,
          period_start: format(dateRange.from, "yyyy-MM-dd"),
          period_end: format(dateRange.to, "yyyy-MM-dd"),
        });
        const response = await fetch(`${API_BASE_URL}/api/reports/hovedbok?${params}`);
        if (response.ok) {
          const data = await response.json();
          // Transform API data to match our interface
          const transformed: HovedboKonto[] = data.kontoer.map((k: any) => ({
            kontonummer: k.kontonummer,
            kontonavn: k.kontonavn,
            klasse: k.klasse,
            klasseNummer: k.klasse_nummer,
            inngaendeBalanse: k.inngaende_balanse,
            debet: k.debet,
            kredit: k.kredit,
            utgaendeBalanse: k.utgaende_balanse,
            transaksjoner: k.transaksjoner.map((t: any) => ({
              id: t.id,
              dato: t.dato,
              bilagId: t.bilag_id,
              bilagsnummer: t.bilag_number,
              beskrivelse: t.beskrivelse,
              debet: t.debet,
              kredit: t.kredit,
              motpart: t.motpart,
            })),
          }));
          setApiData(transformed);
        }
      } catch (error) {
        console.error("Failed to fetch hovedbok data:", error);
        // Fall back to mock data (already set)
      } finally {
        setApiLoading(false);
      }
    }
    fetchHovedbokData();
  }, [dateRange]);

  // Format date range for display
  const dateRangeDisplay = useMemo(() => {
    return `${format(dateRange.from, "d. MMM yyyy", { locale: nb })} - ${format(dateRange.to, "d. MMM yyyy", { locale: nb })}`;
  }, [dateRange]);

  // Filter transactions by date and recalculate account totals
  // Use API data if available, otherwise fall back to mock data
  const dateFilteredData = useMemo(() => {
    // If API data is available, use it directly (already filtered by API)
    if (apiData && apiData.length > 0) {
      return apiData;
    }

    // Fall back to mock data with date filtering
    return hovedbokData.map(konto => {
      // Filter transactions within the date range
      const filteredTransaksjoner = konto.transaksjoner.filter(trans => {
        const transDate = parseISO(trans.dato);
        return isWithinInterval(transDate, { start: dateRange.from, end: dateRange.to });
      });

      // Recalculate debet and kredit from filtered transactions
      const debet = filteredTransaksjoner.reduce((sum, t) => sum + t.debet, 0);
      const kredit = filteredTransaksjoner.reduce((sum, t) => sum + t.kredit, 0);

      // Calculate utgående balanse based on filtered transactions
      // For simplicity, we use inngående balanse + (debet - kredit) for asset accounts
      // and inngående balanse + (kredit - debet) for liability/equity/income accounts
      // Norwegian standard chart: class 1 = assets, 4-7 = cost accounts (debit-normal)
      // Classes 2 (equity/liabilities), 3 (revenue), 8 (financial items) are credit-normal
      const isDebitAccount = konto.klasseNummer === 1 || (konto.klasseNummer >= 4 && konto.klasseNummer <= 7);
      const utgaendeBalanse = isDebitAccount
        ? konto.inngaendeBalanse + debet - kredit
        : konto.inngaendeBalanse - debet + kredit;

      return {
        ...konto,
        transaksjoner: filteredTransaksjoner,
        debet,
        kredit,
        utgaendeBalanse,
      };
    });
  }, [dateRange, apiData]);

  // Group accounts by class
  const kontoerPerKlasse = useMemo(() => {
    const grouped: KontoKlasse[] = [];

    Object.entries(kontoKlasser).forEach(([numStr, navn]) => {
      const num = parseInt(numStr);
      const kontoer = dateFilteredData.filter(k => k.klasseNummer === num);
      if (kontoer.length > 0) {
        grouped.push({ nummer: num, navn, kontoer });
      }
    });

    return grouped;
  }, [dateFilteredData]);

  // Helper to check if a transaction matches the search query
  const transactionMatchesQuery = useCallback((trans: Transaksjon, query: string): boolean => {
    return (
      trans.bilagsnummer.toLowerCase().includes(query) ||
      trans.beskrivelse.toLowerCase().includes(query) ||
      trans.motpart.includes(query) ||
      trans.dato.includes(query) ||
      trans.debet.toString().includes(query) ||
      trans.kredit.toString().includes(query)
    );
  }, []);

  // Filter accounts and transactions based on search and filters
  const filteredKontoer = useMemo(() => {
    return kontoerPerKlasse.map(klasse => ({
      ...klasse,
      kontoer: klasse.kontoer
        .map(konto => {
          // Apply account range filter first
          if (filters.kontoFra && konto.kontonummer < filters.kontoFra) return null;
          if (filters.kontoTil && konto.kontonummer > filters.kontoTil) return null;

          // If no search, return account as-is
          if (!searchQuery) return konto;

          const query = searchQuery.toLowerCase().trim();

          // Check for prefix searches (power user mode)
          if (query.startsWith("*")) {
            // Account-only search - show all transactions if account matches
            const kontoSearch = query.slice(1).trim();
            if (!konto.kontonummer.includes(kontoSearch) && !konto.kontonavn.toLowerCase().includes(kontoSearch)) {
              return null;
            }
            return konto;
          } else if (query.startsWith("=")) {
            // Amount search - filter to only matching transactions
            const belop = parseFloat(query.slice(1));
            if (isNaN(belop)) return konto;

            const matchingTrans = konto.transaksjoner.filter(t => t.debet === belop || t.kredit === belop);
            if (matchingTrans.length === 0) return null;

            return {
              ...konto,
              transaksjoner: matchingTrans,
              debet: matchingTrans.reduce((sum, t) => sum + t.debet, 0),
              kredit: matchingTrans.reduce((sum, t) => sum + t.kredit, 0),
            };
          } else if (query.startsWith("#")) {
            // Bilag number search - filter to only matching transactions
            const bilagSearch = query.slice(1).toLowerCase().trim();
            const matchingTrans = konto.transaksjoner.filter(t =>
              t.bilagsnummer.toLowerCase().includes(bilagSearch)
            );
            if (matchingTrans.length === 0) return null;

            return {
              ...konto,
              transaksjoner: matchingTrans,
              debet: matchingTrans.reduce((sum, t) => sum + t.debet, 0),
              kredit: matchingTrans.reduce((sum, t) => sum + t.kredit, 0),
            };
          } else {
            // Universal search - check account AND filter transactions
            const matchesKonto =
              konto.kontonummer.includes(query) ||
              konto.kontonavn.toLowerCase().includes(query) ||
              konto.klasse.toLowerCase().includes(query);

            // Filter transactions that match
            const matchingTrans = konto.transaksjoner.filter(t => transactionMatchesQuery(t, query));

            // If account name matches, show all transactions
            if (matchesKonto) {
              return konto;
            }

            // If only transactions match, show only those transactions
            if (matchingTrans.length > 0) {
              return {
                ...konto,
                transaksjoner: matchingTrans,
                debet: matchingTrans.reduce((sum, t) => sum + t.debet, 0),
                kredit: matchingTrans.reduce((sum, t) => sum + t.kredit, 0),
              };
            }

            return null;
          }
        })
        .filter((konto): konto is HovedboKonto => konto !== null)
    })).filter(klasse => klasse.kontoer.length > 0);
  }, [kontoerPerKlasse, searchQuery, filters, transactionMatchesQuery]);

  // Check if we're in transaction-filtered mode (for UI hints)
  const isTransactionSearch = useMemo(() => {
    if (!searchQuery) return false;
    const query = searchQuery.toLowerCase().trim();
    // Account-only search doesn't filter transactions
    if (query.startsWith("*")) return false;
    return true;
  }, [searchQuery]);

  // Calculate totals from filtered data
  const totals = useMemo(() => {
    let totalDebet = 0;
    let totalKredit = 0;
    let kontoCount = 0;
    let transaksjonCount = 0;

    dateFilteredData.forEach(konto => {
      totalDebet += konto.debet;
      totalKredit += konto.kredit;
      kontoCount++;
      transaksjonCount += konto.transaksjoner.length;
    });

    return { totalDebet, totalKredit, kontoCount, transaksjonCount, differanse: totalDebet - totalKredit };
  }, [dateFilteredData]);

  // Handle period selection
  const handlePeriodSelect = (periodeId: string) => {
    if (periodeId === "egendefinert") {
      setCustomDatePickerOpen(true);
    }
    setSelectedPeriode(periodeId);
  };

  // Apply custom date range
  const applyCustomDateRange = () => {
    setCustomDatePickerOpen(false);
  };

  // Refresh data
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    // Simulate API call delay - in production this would fetch fresh data
    await new Promise(resolve => setTimeout(resolve, 800));
    setRefreshKey(prev => prev + 1);
    setIsRefreshing(false);
  }, []);

  // Navigate to and highlight a specific account (from Ciri insights)
  const navigateToKonto = useCallback((kontonummer: string) => {
    // Find which class this account belongs to
    const konto = hovedbokData.find(k => k.kontonummer === kontonummer);
    if (!konto) return;

    // Expand the class
    setExpandedKlasser(prev => {
      const newSet = new Set(prev);
      newSet.add(konto.klasseNummer);
      return newSet;
    });

    // Expand the account to show transactions
    setExpandedKontoer(prev => {
      const newSet = new Set(prev);
      newSet.add(kontonummer);
      return newSet;
    });

    // Set highlight
    setHighlightedKonto(kontonummer);

    // Scroll to the account after a short delay (to allow expansion)
    setTimeout(() => {
      const element = document.getElementById(`konto-${kontonummer}`);
      if (element) {
        element.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }, 100);

    // Remove highlight after animation
    setTimeout(() => {
      setHighlightedKonto(null);
    }, 2500);
  }, []);

  const toggleKonto = (kontonummer: string) => {
    const newExpanded = new Set(expandedKontoer);
    if (newExpanded.has(kontonummer)) {
      newExpanded.delete(kontonummer);
    } else {
      newExpanded.add(kontonummer);
    }
    setExpandedKontoer(newExpanded);
  };

  const toggleKlasse = (klasseNummer: number) => {
    const newExpanded = new Set(expandedKlasser);
    if (newExpanded.has(klasseNummer)) {
      newExpanded.delete(klasseNummer);
    } else {
      newExpanded.add(klasseNummer);
    }
    setExpandedKlasser(newExpanded);
  };

  const removeFilter = (key: string) => {
    setFilters(prev => ({ ...prev, [key]: "" }));
  };

  const formatNumber = (num: number) => {
    return num.toLocaleString("nb-NO", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  // Export state
  const [exportLoading, setExportLoading] = useState<"excel" | "pdf" | null>(null);
  const [pdfPreviewOpen, setPdfPreviewOpen] = useState(false);

  // Export to Excel
  const exportToExcel = useCallback(async () => {
    setExportLoading("excel");

    try {
      // Dynamic import to avoid SSR issues
      const XLSX = await import("xlsx");

      // Create workbook
      const wb = XLSX.utils.book_new();

      // Summary sheet
      const summaryData = [
        ["HOVEDBOK - CIRI REGNSKAP"],
        [],
        ["Periode:", dateRangeDisplay],
        ["Generert:", format(new Date(), "d. MMMM yyyy 'kl.' HH:mm", { locale: nb })],
        [],
        ["SAMMENDRAG"],
        ["Total Debet", totals.totalDebet],
        ["Total Kredit", totals.totalKredit],
        ["Differanse", totals.differanse],
        ["Antall kontoer", totals.kontoCount],
        ["Antall transaksjoner", totals.transaksjonCount],
      ];
      const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);

      // Style the summary sheet
      summarySheet["!cols"] = [{ wch: 25 }, { wch: 20 }];
      XLSX.utils.book_append_sheet(wb, summarySheet, "Sammendrag");

      // Accounts overview sheet
      const accountsHeader = ["Kontonr", "Kontonavn", "Klasse", "IB", "Debet", "Kredit", "UB"];
      const accountsData: (string | number)[][] = [accountsHeader];

      filteredKontoer.forEach(klasse => {
        // Add class header
        accountsData.push([`--- ${klasse.nummer}xxx ${klasse.navn} ---`, "", "", "", "", "", ""]);

        klasse.kontoer.forEach(konto => {
          accountsData.push([
            konto.kontonummer,
            konto.kontonavn,
            konto.klasse,
            konto.inngaendeBalanse,
            konto.debet,
            konto.kredit,
            konto.utgaendeBalanse,
          ]);
        });
      });

      // Add totals row
      accountsData.push([]);
      accountsData.push(["TOTALT", "", "", "", totals.totalDebet, totals.totalKredit, totals.differanse]);

      const accountsSheet = XLSX.utils.aoa_to_sheet(accountsData);
      accountsSheet["!cols"] = [
        { wch: 10 }, { wch: 30 }, { wch: 25 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }
      ];
      XLSX.utils.book_append_sheet(wb, accountsSheet, "Kontooversikt");

      // Transactions detail sheet
      const transHeader = ["Konto", "Kontonavn", "Dato", "Bilagsnr", "Beskrivelse", "Debet", "Kredit", "Motpart"];
      const transData: (string | number)[][] = [transHeader];

      filteredKontoer.forEach(klasse => {
        klasse.kontoer.forEach(konto => {
          konto.transaksjoner.forEach(trans => {
            transData.push([
              konto.kontonummer,
              konto.kontonavn,
              trans.dato,
              trans.bilagsnummer,
              trans.beskrivelse,
              trans.debet || 0,
              trans.kredit || 0,
              trans.motpart,
            ]);
          });
        });
      });

      const transSheet = XLSX.utils.aoa_to_sheet(transData);
      transSheet["!cols"] = [
        { wch: 10 }, { wch: 25 }, { wch: 12 }, { wch: 15 }, { wch: 35 }, { wch: 12 }, { wch: 12 }, { wch: 10 }
      ];
      XLSX.utils.book_append_sheet(wb, transSheet, "Transaksjoner");

      // Generate filename with date
      const filename = `hovedbok_${format(dateRange.from, "yyyy-MM-dd")}_${format(dateRange.to, "yyyy-MM-dd")}.xlsx`;

      // Download
      XLSX.writeFile(wb, filename);
    } catch (error) {
      console.error("Excel export failed:", error);
    } finally {
      setExportLoading(null);
    }
  }, [filteredKontoer, totals, dateRange, dateRangeDisplay]);

  // Export to PDF (opens preview dialog)
  const exportToPDF = useCallback(() => {
    setPdfPreviewOpen(true);
  }, []);

  // Generate and download PDF
  const downloadPDF = useCallback(async () => {
    setExportLoading("pdf");

    try {
      // Dynamic import to avoid SSR issues
      const { pdf, Document, Page, Text, View, StyleSheet } = await import("@react-pdf/renderer");

      // Use centralized Ciri theme colors
      const THEME = getPdfThemeColors();

      // Create styles
      const styles = StyleSheet.create({
        page: {
          padding: 40,
          fontSize: 10,
          fontFamily: "Helvetica",
        },
        header: {
          marginBottom: 20,
          borderBottom: `2px solid ${THEME.primary}`,
          paddingBottom: 15,
        },
        title: {
          fontSize: 24,
          fontWeight: "bold",
          color: THEME.primary,
          marginBottom: 5,
        },
        subtitle: {
          fontSize: 12,
          color: "#6b7280",
        },
        periodBadge: {
          marginTop: 8,
          padding: "4px 8px",
          backgroundColor: THEME.bgLight,
          borderRadius: 4,
          fontSize: 10,
          color: "#374151",
          alignSelf: "flex-start",
        },
        summarySection: {
          marginBottom: 25,
          padding: 15,
          backgroundColor: THEME.bgAccent,
          borderRadius: 8,
        },
        summaryTitle: {
          fontSize: 14,
          fontWeight: "bold",
          color: THEME.primary,
          marginBottom: 12,
        },
        summaryGrid: {
          flexDirection: "row",
          justifyContent: "space-between",
        },
        summaryItem: {
          alignItems: "center",
        },
        summaryLabel: {
          fontSize: 9,
          color: "#6b7280",
          marginBottom: 2,
        },
        summaryValue: {
          fontSize: 16,
          fontWeight: "bold",
        },
        debet: {
          color: "#059669",
        },
        kredit: {
          color: "#dc2626",
        },
        balanced: {
          color: "#059669",
        },
        unbalanced: {
          color: "#d97706",
        },
        table: {
          marginTop: 10,
        },
        tableHeader: {
          flexDirection: "row",
          backgroundColor: THEME.primary,
          padding: 8,
          borderTopLeftRadius: 6,
          borderTopRightRadius: 6,
        },
        tableHeaderText: {
          color: "#ffffff",
          fontWeight: "bold",
          fontSize: 9,
        },
        tableRow: {
          flexDirection: "row",
          padding: 8,
          borderBottomWidth: 1,
          borderBottomColor: "#e5e7eb",
        },
        tableRowAlt: {
          backgroundColor: THEME.bgLight,
        },
        classHeader: {
          flexDirection: "row",
          padding: 10,
          backgroundColor: THEME.bgAccent,
          marginTop: 8,
        },
        classHeaderText: {
          fontWeight: "bold",
          color: THEME.primaryDark,
          fontSize: 10,
        },
        col1: { width: "12%" },
        col2: { width: "28%" },
        col3: { width: "15%", textAlign: "right" },
        col4: { width: "15%", textAlign: "right" },
        col5: { width: "15%", textAlign: "right" },
        col6: { width: "15%", textAlign: "right" },
        footer: {
          position: "absolute",
          bottom: 30,
          left: 40,
          right: 40,
          flexDirection: "row",
          justifyContent: "space-between",
          borderTop: "1px solid #e5e7eb",
          paddingTop: 10,
          fontSize: 8,
          color: "#9ca3af",
        },
        pageNumber: {
          position: "absolute",
          bottom: 30,
          right: 40,
          fontSize: 8,
          color: "#9ca3af",
        },
      });

      // Create document
      const HovedboKPDF = () => (
        <Document>
          <Page size="A4" style={styles.page}>
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.title}>Hovedbok</Text>
              <Text style={styles.subtitle}>Ciri Regnskap</Text>
              <View style={styles.periodBadge}>
                <Text>{dateRangeDisplay}</Text>
              </View>
            </View>

            {/* Summary */}
            <View style={styles.summarySection}>
              <Text style={styles.summaryTitle}>Sammendrag</Text>
              <View style={styles.summaryGrid}>
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryLabel}>Total Debet</Text>
                  <Text style={[styles.summaryValue, styles.debet]}>
                    kr {formatNumber(totals.totalDebet)}
                  </Text>
                </View>
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryLabel}>Total Kredit</Text>
                  <Text style={[styles.summaryValue, styles.kredit]}>
                    kr {formatNumber(totals.totalKredit)}
                  </Text>
                </View>
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryLabel}>Differanse</Text>
                  <Text style={[styles.summaryValue, totals.differanse === 0 ? styles.balanced : styles.unbalanced]}>
                    kr {formatNumber(totals.differanse)}
                  </Text>
                </View>
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryLabel}>Kontoer</Text>
                  <Text style={styles.summaryValue}>{totals.kontoCount}</Text>
                </View>
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryLabel}>Transaksjoner</Text>
                  <Text style={styles.summaryValue}>{totals.transaksjonCount}</Text>
                </View>
              </View>
            </View>

            {/* Table */}
            <View style={styles.table}>
              <View style={styles.tableHeader}>
                <Text style={[styles.tableHeaderText, styles.col1]}>Konto</Text>
                <Text style={[styles.tableHeaderText, styles.col2]}>Kontonavn</Text>
                <Text style={[styles.tableHeaderText, styles.col3]}>IB</Text>
                <Text style={[styles.tableHeaderText, styles.col4]}>Debet</Text>
                <Text style={[styles.tableHeaderText, styles.col5]}>Kredit</Text>
                <Text style={[styles.tableHeaderText, styles.col6]}>UB</Text>
              </View>

              {filteredKontoer.map((klasse, ki) => (
                <View key={klasse.nummer}>
                  <View style={styles.classHeader}>
                    <Text style={styles.classHeaderText}>
                      {klasse.nummer}xxx - {klasse.navn}
                    </Text>
                  </View>
                  {klasse.kontoer.map((konto, i) => (
                    <View key={konto.kontonummer} style={i % 2 === 1 ? [styles.tableRow, styles.tableRowAlt] : styles.tableRow}>
                      <Text style={styles.col1}>{konto.kontonummer}</Text>
                      <Text style={styles.col2}>{konto.kontonavn}</Text>
                      <Text style={styles.col3}>{formatNumber(konto.inngaendeBalanse)}</Text>
                      <Text style={[styles.col4, styles.debet]}>{konto.debet > 0 ? formatNumber(konto.debet) : "-"}</Text>
                      <Text style={[styles.col5, styles.kredit]}>{konto.kredit > 0 ? formatNumber(konto.kredit) : "-"}</Text>
                      <Text style={styles.col6}>{formatNumber(konto.utgaendeBalanse)}</Text>
                    </View>
                  ))}
                </View>
              ))}
            </View>

            {/* Footer */}
            <View style={styles.footer}>
              <Text>Generert av Ciri • {format(new Date(), "d. MMMM yyyy 'kl.' HH:mm", { locale: nb })}</Text>
            </View>
            <Text style={styles.pageNumber} render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} fixed />
          </Page>
        </Document>
      );

      // Generate and download
      const blob = await pdf(<HovedboKPDF />).toBlob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `hovedbok_${format(dateRange.from, "yyyy-MM-dd")}_${format(dateRange.to, "yyyy-MM-dd")}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("PDF export failed:", error);
    } finally {
      setExportLoading(null);
      setPdfPreviewOpen(false);
    }
  }, [filteredKontoer, totals, dateRange, dateRangeDisplay, formatNumber]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight">Hovedbok</h1>
          <div className="flex flex-wrap items-center gap-2 text-muted-foreground">
            <span>{totals.kontoCount} kontoer • {totals.transaksjonCount} transaksjoner</span>
            <Badge variant="outline" className="gap-1 font-normal">
              <CalendarIcon className="size-3" />
              {dateRangeDisplay}
            </Badge>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Period Selector */}
          <div className="flex rounded-lg border bg-muted/30 p-1">
            {periodeValg.map((periode) => (
              <Button
                key={periode.id}
                variant="ghost"
                size="sm"
                onClick={() => handlePeriodSelect(periode.id)}
                className={cn(
                  "h-8 px-3 text-xs font-medium transition-all",
                  selectedPeriode === periode.id
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <span className="hidden sm:inline">{periode.label}</span>
                <span className="sm:hidden">{periode.shortLabel}</span>
              </Button>
            ))}
          </div>

          {/* Custom Date Range Popover */}
          <Popover open={customDatePickerOpen} onOpenChange={setCustomDatePickerOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className={cn(
                  "gap-2",
                  selectedPeriode === "egendefinert" && "border-[var(--primary)] text-[var(--primary)]"
                )}
              >
                <CalendarIcon className="size-4" />
                <span className="hidden sm:inline">
                  {selectedPeriode === "egendefinert" && customDateFrom && customDateTo
                    ? `${format(customDateFrom, "d. MMM", { locale: nb })} - ${format(customDateTo, "d. MMM", { locale: nb })}`
                    : dateRangeDisplay}
                </span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <div className="p-4 space-y-4">
                <div className="text-sm font-medium">Velg periode</div>
                <div className="flex gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Fra dato</Label>
                    <Calendar
                      mode="single"
                      selected={customDateFrom}
                      onSelect={setCustomDateFrom}
                      locale={nb}
                      className="rounded-md border"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Til dato</Label>
                    <Calendar
                      mode="single"
                      selected={customDateTo}
                      onSelect={setCustomDateTo}
                      locale={nb}
                      className="rounded-md border"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-2 border-t">
                  <Button variant="ghost" size="sm" onClick={() => setCustomDatePickerOpen(false)}>
                    Avbryt
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => {
                      setSelectedPeriode("egendefinert");
                      applyCustomDateRange();
                    }}
                    disabled={!customDateFrom || !customDateTo}
                  >
                    Bruk periode
                  </Button>
                </div>
              </div>
            </PopoverContent>
          </Popover>

          {/* Export Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2" disabled={exportLoading !== null}>
                {exportLoading ? (
                  <Loader2Icon className="size-4 animate-spin" />
                ) : (
                  <DownloadIcon className="size-4" />
                )}
                <span className="hidden sm:inline">Eksporter</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem className="gap-2" onClick={exportToExcel} disabled={exportLoading === "excel"}>
                {exportLoading === "excel" ? (
                  <Loader2Icon className="size-4 animate-spin" />
                ) : (
                  <FileSpreadsheetIcon className="size-4" />
                )}
                Excel (.xlsx)
              </DropdownMenuItem>
              <DropdownMenuItem className="gap-2" onClick={exportToPDF} disabled={exportLoading === "pdf"}>
                {exportLoading === "pdf" ? (
                  <Loader2Icon className="size-4 animate-spin" />
                ) : (
                  <FileTextIcon className="size-4" />
                )}
                PDF
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* PDF Export Preview Dialog */}
      <Dialog open={pdfPreviewOpen} onOpenChange={setPdfPreviewOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileTextIcon className="size-5 text-[var(--primary)]" />
              Eksporter Hovedbok til PDF
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Preview Card */}
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

            {/* Actions */}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setPdfPreviewOpen(false)}>
                Avbryt
              </Button>
              <Button
                onClick={downloadPDF}
                disabled={exportLoading === "pdf"}
                className="gap-2 bg-[var(--primary)] hover:bg-[var(--primary)]/90"
              >
                {exportLoading === "pdf" ? (
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

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-sm">Total Debet</p>
                {isRefreshing ? (
                  <Skeleton className="h-8 w-32 mt-1" />
                ) : (
                  <p className="font-display text-2xl font-bold text-emerald-600">
                    {formatNumber(totals.totalDebet)}
                  </p>
                )}
              </div>
              <div className="flex size-10 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30">
                <TrendingUpIcon className="size-5 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-sm">Total Kredit</p>
                {isRefreshing ? (
                  <Skeleton className="h-8 w-32 mt-1" />
                ) : (
                  <p className="font-display text-2xl font-bold text-rose-600">
                    {formatNumber(totals.totalKredit)}
                  </p>
                )}
              </div>
              <div className="flex size-10 items-center justify-center rounded-full bg-rose-100 dark:bg-rose-900/30">
                <TrendingDownIcon className="size-5 text-rose-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-sm">Differanse</p>
                {isRefreshing ? (
                  <Skeleton className="h-8 w-32 mt-1" />
                ) : (
                  <p className={cn(
                    "font-display text-2xl font-bold",
                    totals.differanse === 0 ? "text-emerald-600" : "text-amber-600"
                  )}>
                    {formatNumber(totals.differanse)}
                  </p>
                )}
              </div>
              <div className={cn(
                "flex size-10 items-center justify-center rounded-full",
                totals.differanse === 0
                  ? "bg-emerald-100 dark:bg-emerald-900/30"
                  : "bg-amber-100 dark:bg-amber-900/30"
              )}>
                {totals.differanse === 0 ? (
                  <CheckCircle2Icon className="size-5 text-emerald-600" />
                ) : (
                  <AlertCircleIcon className="size-5 text-amber-600" />
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-[var(--primary)]/20 bg-[var(--primary)]/5">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <CiriLogo size="md" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[var(--primary)]">Ciri-analyse</p>
                <p className="text-xs text-muted-foreground truncate">
                  {ciriInnsikter.length} observasjoner
                </p>
              </div>
              <Badge variant="outline" className="border-[var(--primary)]/30 text-[var(--primary)]">
                <SparklesIcon className="size-3 mr-1" />
                {ciriInnsikter.length}
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Ciri Insights */}
      {ciriInnsikter.length > 0 && (
        <Card className="border-[var(--primary)]/20 bg-gradient-to-r from-[var(--primary)]/5 to-purple-50/50 dark:to-purple-950/20">
          <CardContent className="py-4">
            <div className="flex items-start gap-4">
              <div className="relative shrink-0">
                <CiriLogo size="md" />
                <motion.div
                  className="absolute inset-0 rounded-full border-2 border-[var(--primary)]"
                  animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0, 0.5] }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
              </div>
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium">Ciri har analysert {totals.transaksjonCount} transaksjoner</p>
                  <Badge variant="secondary" className="text-xs">
                    <SparklesIcon className="size-3 mr-1" />
                    AI
                  </Badge>
                </div>
                <div className="space-y-1.5">
                  {ciriInnsikter.map((innsikt, index) => (
                    <div
                      key={index}
                      className={cn(
                        "flex items-center gap-2 text-sm rounded-md px-3 py-1.5",
                        innsikt.type === "warning"
                          ? "bg-amber-50 text-amber-800 dark:bg-amber-900/20 dark:text-amber-200"
                          : "bg-blue-50 text-blue-800 dark:bg-blue-900/20 dark:text-blue-200"
                      )}
                    >
                      {innsikt.type === "warning" ? (
                        <AlertCircleIcon className="size-4 shrink-0" />
                      ) : (
                        <InfoIcon className="size-4 shrink-0" />
                      )}
                      <span>{innsikt.message}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="ml-auto h-6 px-2 text-xs"
                        onClick={() => navigateToKonto(innsikt.konto)}
                      >
                        Se konto {innsikt.konto}
                        <ArrowRightIcon className="size-3 ml-1" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Search and Filter Bar */}
      <Card>
        <CardContent className="py-4">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              {/* Search */}
              <div className="relative flex-1">
                <SearchIcon className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Input
                        ref={hovedbokSearchRef}
                        placeholder="Søk på konto, bilag, beskrivelse..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9 pr-20"
                      />
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="max-w-sm p-3">
                      <p className="font-medium mb-2">Universalt søk</p>
                      <p className="text-xs text-muted-foreground mb-2">
                        Søk fritt på tvers av kontoer, bilagsnummer og beskrivelser.
                      </p>
                      <p className="font-medium mb-1 text-xs">Avanserte prefikser:</p>
                      <ul className="text-xs space-y-1">
                        <li className="flex items-center gap-2">
                          <code className="bg-muted px-1.5 py-0.5 rounded font-mono">*</code>
                          <span>Kun konto (f.eks. *1920)</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <code className="bg-muted px-1.5 py-0.5 rounded font-mono">=</code>
                          <span>Eksakt beløp (f.eks. =45000)</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <code className="bg-muted px-1.5 py-0.5 rounded font-mono">#</code>
                          <span>Bilagsnummer (f.eks. #B-2026)</span>
                        </li>
                      </ul>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                {searchQuery && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-12 top-1/2 -translate-y-1/2 size-6"
                    onClick={() => setSearchQuery("")}
                  >
                    <XIcon className="size-3" />
                  </Button>
                )}
                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 text-xs text-muted-foreground">
                  <kbd className="bg-muted px-1.5 py-0.5 rounded text-[10px] font-mono">*</kbd>
                  <kbd className="bg-muted px-1.5 py-0.5 rounded text-[10px] font-mono">=</kbd>
                  <kbd className="bg-muted px-1.5 py-0.5 rounded text-[10px] font-mono">#</kbd>
                </div>
              </div>

              {/* Filter Toggle */}
              <Button
                variant={filterOpen ? "secondary" : "outline"}
                size="sm"
                onClick={() => setFilterOpen(!filterOpen)}
                className="gap-2"
              >
                <FilterIcon className="size-4" />
                Filter
                {activeFilters.length > 0 && (
                  <Badge variant="secondary" className="ml-1 size-5 p-0 justify-center">
                    {activeFilters.length}
                  </Badge>
                )}
              </Button>

              {/* Refresh */}
              <Button
                variant="ghost"
                size="icon"
                className="shrink-0"
                onClick={handleRefresh}
                disabled={isRefreshing}
              >
                <RefreshCwIcon className={cn("size-4", isRefreshing && "animate-spin")} />
              </Button>
            </div>

            {/* Active Filters */}
            {activeFilters.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {activeFilters.map(([key, value]) => (
                  <Badge
                    key={key}
                    variant="secondary"
                    className="gap-1 pr-1"
                  >
                    {key === "kontoFra" && `Fra konto: ${value}`}
                    {key === "kontoTil" && `Til konto: ${value}`}
                    {key === "avdeling" && `Avdeling: ${value}`}
                    {key === "prosjekt" && `Prosjekt: ${value}`}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-4 p-0 hover:bg-transparent"
                      onClick={() => removeFilter(key)}
                    >
                      <XIcon className="size-3" />
                    </Button>
                  </Badge>
                ))}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 text-xs text-muted-foreground"
                  onClick={() => setFilters({ kontoFra: "", kontoTil: "", avdeling: "", prosjekt: "" })}
                >
                  Fjern alle
                </Button>
              </div>
            )}

            {/* Filter Panel */}
            <AnimatePresence>
              {filterOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="grid gap-4 pt-4 border-t sm:grid-cols-2 lg:grid-cols-4">
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground flex items-center gap-1">
                        <WalletIcon className="size-3" />
                        Konto fra
                      </Label>
                      <Input
                        placeholder="f.eks. 1000"
                        value={filters.kontoFra}
                        onChange={(e) => setFilters(prev => ({ ...prev, kontoFra: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground flex items-center gap-1">
                        <WalletIcon className="size-3" />
                        Konto til
                      </Label>
                      <Input
                        placeholder="f.eks. 9999"
                        value={filters.kontoTil}
                        onChange={(e) => setFilters(prev => ({ ...prev, kontoTil: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground flex items-center gap-1">
                        <BuildingIcon className="size-3" />
                        Avdeling
                      </Label>
                      <Select
                        value={filters.avdeling}
                        onValueChange={(v) => setFilters(prev => ({ ...prev, avdeling: v }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Alle avdelinger" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="salg">Salg</SelectItem>
                          <SelectItem value="marked">Marked</SelectItem>
                          <SelectItem value="utvikling">Utvikling</SelectItem>
                          <SelectItem value="admin">Administrasjon</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground flex items-center gap-1">
                        <FolderIcon className="size-3" />
                        Prosjekt
                      </Label>
                      <Select
                        value={filters.prosjekt}
                        onValueChange={(v) => setFilters(prev => ({ ...prev, prosjekt: v }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Alle prosjekter" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="p1">Prosjekt Alpha</SelectItem>
                          <SelectItem value="p2">Prosjekt Beta</SelectItem>
                          <SelectItem value="p3">Prosjekt Gamma</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </CardContent>
      </Card>

      {/* Account List */}
      <Card>
        <CardHeader className="pb-0">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Kontooversikt</CardTitle>
            <div className="text-sm text-muted-foreground">
              {isRefreshing ? (
                <Skeleton className="h-4 w-20" />
              ) : (
                `${filteredKontoer.reduce((acc, k) => acc + k.kontoer.length, 0)} kontoer`
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-4">
          {/* Table Header */}
          <div className="hidden lg:grid lg:grid-cols-[40px_100px_1fr_120px_120px_120px_120px] gap-4 px-4 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider border-b bg-muted/30 rounded-t-lg">
            <div></div>
            <div>Konto</div>
            <div>Kontonavn</div>
            <div className="text-right">IB</div>
            <div className="text-right">Debet</div>
            <div className="text-right">Kredit</div>
            <div className="text-right">UB</div>
          </div>

          {/* Skeleton Loading State */}
          {isRefreshing ? (
            <div className="space-y-2 py-4">
              {/* Class skeleton */}
              {[1, 2, 3].map((i) => (
                <div key={i} className="space-y-2">
                  {/* Class header skeleton */}
                  <div className="flex items-center gap-3 px-4 py-3">
                    <Skeleton className="size-4" />
                    <Skeleton className="h-5 w-16" />
                    <Skeleton className="h-5 w-32" />
                    <Skeleton className="h-5 w-20 ml-auto" />
                  </div>
                  {/* Account rows skeleton */}
                  <div className="ml-6 pl-4 border-l-2 border-muted space-y-1">
                    {[1, 2, 3].map((j) => (
                      <div
                        key={j}
                        className="hidden lg:grid lg:grid-cols-[40px_100px_1fr_120px_120px_120px_120px] gap-4 px-4 py-3"
                      >
                        <div />
                        <Skeleton className="h-4 w-12" />
                        <Skeleton className="h-4 w-40" />
                        <Skeleton className="h-4 w-20 ml-auto" />
                        <Skeleton className="h-4 w-20 ml-auto" />
                        <Skeleton className="h-4 w-20 ml-auto" />
                        <Skeleton className="h-4 w-20 ml-auto" />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
          /* Account Classes */
          <div className="divide-y">
            {filteredKontoer.map((klasse) => (
              <Collapsible
                key={klasse.nummer}
                open={expandedKlasser.has(klasse.nummer)}
                onOpenChange={() => toggleKlasse(klasse.nummer)}
              >
                {/* Class Header */}
                <CollapsibleTrigger className="flex w-full items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors">
                  <motion.div
                    animate={{ rotate: expandedKlasser.has(klasse.nummer) ? 90 : 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <ChevronRightIcon className="size-4 text-muted-foreground" />
                  </motion.div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="font-mono text-xs">
                      {klasse.nummer}xxx
                    </Badge>
                    <span className="font-medium">{klasse.navn}</span>
                  </div>
                  <Badge variant="secondary" className="ml-auto text-xs">
                    {klasse.kontoer.length} kontoer
                  </Badge>
                </CollapsibleTrigger>

                {/* Class Content - Account List */}
                <CollapsibleContent>
                  <div className="border-l-2 border-muted ml-6 pl-4">
                    {klasse.kontoer.map((konto) => (
                      <Collapsible
                        key={konto.kontonummer}
                        open={expandedKontoer.has(konto.kontonummer)}
                        onOpenChange={() => toggleKonto(konto.kontonummer)}
                      >
                        {/* Account Row */}
                        <CollapsibleTrigger
                          id={`konto-${konto.kontonummer}`}
                          className="flex w-full items-center group"
                        >
                          <div className={cn(
                            "grid w-full lg:grid-cols-[40px_100px_1fr_120px_120px_120px_120px] gap-4 px-4 py-3 hover:bg-muted/30 transition-all rounded-lg items-center",
                            highlightedKonto === konto.kontonummer && "bg-[var(--primary)]/10 ring-2 ring-[var(--primary)] ring-offset-2"
                          )}>
                            <motion.div
                              animate={{ rotate: expandedKontoer.has(konto.kontonummer) ? 90 : 0 }}
                              transition={{ duration: 0.2 }}
                              className="hidden lg:block"
                            >
                              {konto.transaksjoner.length > 0 && (
                                <ChevronRightIcon className="size-4 text-muted-foreground" />
                              )}
                            </motion.div>

                            {/* Mobile Layout */}
                            <div className="lg:hidden col-span-full space-y-2">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <Badge variant="outline" className="font-mono text-xs">
                                    {konto.kontonummer}
                                  </Badge>
                                  <span className="font-medium text-sm">{konto.kontonavn}</span>
                                </div>
                                {konto.transaksjoner.length > 0 && (
                                  <ChevronDownIcon className={cn(
                                    "size-4 text-muted-foreground transition-transform",
                                    expandedKontoer.has(konto.kontonummer) && "rotate-180"
                                  )} />
                                )}
                              </div>
                              <div className="grid grid-cols-4 gap-2 text-xs">
                                <div>
                                  <p className="text-muted-foreground">IB</p>
                                  <p className={cn(
                                    "font-mono",
                                    konto.inngaendeBalanse < 0 ? "text-rose-600" : ""
                                  )}>
                                    {formatNumber(konto.inngaendeBalanse)}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-muted-foreground">Debet</p>
                                  <p className="font-mono text-emerald-600">{formatNumber(konto.debet)}</p>
                                </div>
                                <div>
                                  <p className="text-muted-foreground">Kredit</p>
                                  <p className="font-mono text-rose-600">{formatNumber(konto.kredit)}</p>
                                </div>
                                <div>
                                  <p className="text-muted-foreground">UB</p>
                                  <p className={cn(
                                    "font-mono font-medium",
                                    konto.utgaendeBalanse < 0 ? "text-rose-600" : ""
                                  )}>
                                    {formatNumber(konto.utgaendeBalanse)}
                                  </p>
                                </div>
                              </div>
                            </div>

                            {/* Desktop Layout */}
                            <div className="hidden lg:block font-mono text-sm">
                              {konto.kontonummer}
                            </div>
                            <div className="hidden lg:block text-sm truncate">
                              {konto.kontonavn}
                            </div>
                            <div className={cn(
                              "hidden lg:block text-right font-mono text-sm",
                              konto.inngaendeBalanse < 0 ? "text-rose-600" : ""
                            )}>
                              {formatNumber(konto.inngaendeBalanse)}
                            </div>
                            <div className="hidden lg:block text-right font-mono text-sm text-emerald-600">
                              {konto.debet > 0 ? formatNumber(konto.debet) : "-"}
                            </div>
                            <div className="hidden lg:block text-right font-mono text-sm text-rose-600">
                              {konto.kredit > 0 ? formatNumber(konto.kredit) : "-"}
                            </div>
                            <div className={cn(
                              "hidden lg:block text-right font-mono text-sm font-medium",
                              konto.utgaendeBalanse < 0 ? "text-rose-600" : ""
                            )}>
                              {formatNumber(konto.utgaendeBalanse)}
                            </div>
                          </div>
                        </CollapsibleTrigger>

                        {/* Transaction Details */}
                        <CollapsibleContent>
                          <AnimatePresence>
                            {expandedKontoer.has(konto.kontonummer) && konto.transaksjoner.length > 0 && (
                              <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: "auto" }}
                                exit={{ opacity: 0, height: 0 }}
                                className="ml-4 lg:ml-10 mb-2 overflow-hidden"
                              >
                                <div className="rounded-lg border bg-muted/20">
                                  {/* Transaction Header */}
                                  <div className="hidden sm:grid sm:grid-cols-[100px_100px_1fr_100px_100px_80px] gap-4 px-4 py-2 text-xs font-medium text-muted-foreground border-b">
                                    <div>Dato</div>
                                    <div>Bilag</div>
                                    <div>Beskrivelse</div>
                                    <div className="text-right">Debet</div>
                                    <div className="text-right">Kredit</div>
                                    <div className="text-right">Motpart</div>
                                  </div>

                                  {/* Transactions */}
                                  <div className="divide-y">
                                    {konto.transaksjoner.map((trans) => {
                                      const TransactionRow = (
                                        <div
                                          className="grid sm:grid-cols-[100px_100px_1fr_100px_100px_80px] gap-2 sm:gap-4 px-4 py-2.5 text-sm hover:bg-[var(--primary)]/5 transition-colors cursor-pointer group"
                                        >
                                          {/* Mobile */}
                                          <div className="sm:hidden space-y-1">
                                            <div className="flex items-center justify-between">
                                              <span className="text-xs text-muted-foreground">{trans.dato}</span>
                                              <Badge variant="outline" className="text-xs font-mono group-hover:border-[var(--primary)] group-hover:text-[var(--primary)]">
                                                {trans.bilagsnummer}
                                              </Badge>
                                            </div>
                                            <p className="text-sm">{trans.beskrivelse}</p>
                                            <div className="flex justify-between text-xs">
                                              {trans.debet > 0 && (
                                                <span className="text-emerald-600">D: {formatNumber(trans.debet)}</span>
                                              )}
                                              {trans.kredit > 0 && (
                                                <span className="text-rose-600">K: {formatNumber(trans.kredit)}</span>
                                              )}
                                              <span className="text-muted-foreground">→ {trans.motpart}</span>
                                            </div>
                                          </div>

                                          {/* Desktop */}
                                          <div className="hidden sm:block text-muted-foreground">
                                            {trans.dato}
                                          </div>
                                          <div className="hidden sm:block">
                                            <Badge variant="outline" className="text-xs font-mono group-hover:border-[var(--primary)] group-hover:text-[var(--primary)] transition-colors">
                                              {trans.bilagsnummer}
                                            </Badge>
                                          </div>
                                          <div className="hidden sm:block truncate group-hover:text-[var(--primary)] transition-colors">
                                            {trans.beskrivelse}
                                          </div>
                                          <div className="hidden sm:block text-right font-mono text-emerald-600">
                                            {trans.debet > 0 ? formatNumber(trans.debet) : "-"}
                                          </div>
                                          <div className="hidden sm:block text-right font-mono text-rose-600">
                                            {trans.kredit > 0 ? formatNumber(trans.kredit) : "-"}
                                          </div>
                                          <div className="hidden sm:flex items-center justify-end gap-1 font-mono text-muted-foreground">
                                            <span>{trans.motpart}</span>
                                            <ChevronRightIcon className="size-3 opacity-0 group-hover:opacity-100 transition-opacity text-[var(--primary)]" />
                                          </div>
                                        </div>
                                      );

                                      // Wrap in Link if bilagId is a valid non-empty string
                                      const hasValidBilagId = trans.bilagId && trans.bilagId.length > 0 && trans.bilagId !== 'null' && trans.bilagId !== 'undefined';
                                      return hasValidBilagId ? (
                                        <Link
                                          key={trans.id}
                                          href={`/dashboard/bilag?id=${trans.bilagId}`}
                                          className="block"
                                        >
                                          {TransactionRow}
                                        </Link>
                                      ) : (
                                        <div key={trans.id}>
                                          {TransactionRow}
                                        </div>
                                      );
                                    })}
                                  </div>

                                  {/* Transaction Summary */}
                                  <div className="hidden sm:grid sm:grid-cols-[100px_100px_1fr_100px_100px_80px] gap-4 px-4 py-2 text-sm font-medium border-t bg-muted/30">
                                    <div></div>
                                    <div></div>
                                    <div className="text-muted-foreground">Sum {konto.transaksjoner.length} transaksjoner</div>
                                    <div className="text-right font-mono text-emerald-600">
                                      {formatNumber(konto.debet)}
                                    </div>
                                    <div className="text-right font-mono text-rose-600">
                                      {formatNumber(konto.kredit)}
                                    </div>
                                    <div></div>
                                  </div>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </CollapsibleContent>
                      </Collapsible>
                    ))}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            ))}
          </div>
          )}

          {/* Total Summary */}
          <div className="mt-4 pt-4 border-t">
            <div className="hidden lg:grid lg:grid-cols-[40px_100px_1fr_120px_120px_120px_120px] gap-4 px-4 py-3 bg-muted/50 rounded-lg font-medium">
              <div></div>
              <div></div>
              <div className="text-muted-foreground">Totalt</div>
              <div></div>
              <div className="text-right font-mono text-lg text-emerald-600">
                {formatNumber(totals.totalDebet)}
              </div>
              <div className="text-right font-mono text-lg text-rose-600">
                {formatNumber(totals.totalKredit)}
              </div>
              <div className={cn(
                "text-right font-mono text-lg",
                totals.differanse === 0 ? "text-emerald-600" : "text-amber-600"
              )}>
                {formatNumber(totals.differanse)}
              </div>
            </div>

            {/* Mobile Total */}
            <div className="lg:hidden grid grid-cols-3 gap-4 p-4 bg-muted/50 rounded-lg">
              <div className="text-center">
                <p className="text-xs text-muted-foreground mb-1">Total Debet</p>
                <p className="font-mono font-medium text-emerald-600">{formatNumber(totals.totalDebet)}</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-muted-foreground mb-1">Total Kredit</p>
                <p className="font-mono font-medium text-rose-600">{formatNumber(totals.totalKredit)}</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-muted-foreground mb-1">Differanse</p>
                <p className={cn(
                  "font-mono font-medium",
                  totals.differanse === 0 ? "text-emerald-600" : "text-amber-600"
                )}>
                  {formatNumber(totals.differanse)}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <LearnMoreDocs sections={["bokforing", "rapporter"]} />
    </div>
  );
}
