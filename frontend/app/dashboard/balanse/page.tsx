"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { motion } from "framer-motion";
import { format } from "date-fns";
import { nb } from "date-fns/locale";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import LearnMoreDocs from "@/components/learn-more-docs";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  ScaleIcon,
  DownloadIcon,
  ChevronRightIcon,
  FileSpreadsheetIcon,
  FileTextIcon,
  CalendarIcon,
  RefreshCwIcon,
  CheckCircle2Icon,
  AlertTriangleIcon,
  BuildingIcon,
  WalletIcon,
  PiggyBankIcon,
  SparklesIcon,
  InfoIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { API_BASE_URL, COMPANY_ID } from "@/lib/api";
import { useCiriActionListener } from "@/lib/ciri-actions";
import CiriLogo from "@/components/layout/ciri-logo";
import { toast } from "sonner";

// Types
interface BalanseLinje {
  konto: string;
  navn: string;
  belop: number;
  fjoråret: number;
  bilagCount?: number;
  isSubtotal?: boolean;
  isTotal?: boolean;
}

interface BalanseKategori {
  id: string;
  navn: string;
  linjer: BalanseLinje[];
  subtotal: BalanseLinje;
}

interface BalanseGruppe {
  id: string;
  navn: string;
  kategorier: BalanseKategori[];
  total: BalanseLinje;
}

interface BilagBalanseData {
  as_of_date: string;
  leverandorgjeld: number;
  leverandorgjeld_count: number;
  posted_total: number;
  posted_count: number;
}

export default function BalansePage() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [expandedKategorier, setExpandedKategorier] = useState<Set<string>>(
    new Set(["anleggsmidler", "omlopsmidler", "egenkapital", "langsiktig-gjeld", "kortsiktig-gjeld"])
  );
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Ciri bubble action listener
  useCiriActionListener("utvid-alle-balanse", useCallback(() => {
    setExpandedKategorier(new Set(["anleggsmidler", "omlopsmidler", "egenkapital", "langsiktig-gjeld", "kortsiktig-gjeld"]));
  }, []));

  // API data
  const [bilagBalanse, setBilagBalanse] = useState<BilagBalanseData | null>(null);
  const [apiLoading, setApiLoading] = useState(true);

  // Fetch bilag balanse data
  useEffect(() => {
    async function fetchBalanseData() {
      try {
        setApiLoading(true);
        const dateStr = selectedDate.toISOString().split('T')[0];
        const response = await fetch(
          `${API_BASE_URL}/api/reports/bilag/balanse?company_id=${COMPANY_ID}&as_of_date=${dateStr}`
        );
        if (response.ok) {
          const data = await response.json();
          setBilagBalanse(data);
        }
      } catch (error) {
        console.error("Failed to fetch balanse data:", error);
        toast.error("Kunne ikke hente balansedata. Prøv igjen senere.");
      } finally {
        setApiLoading(false);
      }
    }
    fetchBalanseData();
  }, [selectedDate]);

  // Build balance sheet data with real bilag data
  const { eiendelerData, egenkapitalGjeldData } = useMemo(() => {
    // Leverandørgjeld from pending bilags
    const leverandorgjeld = bilagBalanse?.leverandorgjeld || 0;
    const leverandorgjeldCount = bilagBalanse?.leverandorgjeld_count || 0;

    const eiendeler: BalanseGruppe = {
      id: "eiendeler",
      navn: "EIENDELER",
      kategorier: [
        {
          id: "anleggsmidler",
          navn: "Anleggsmidler",
          linjer: [
            { konto: "1050", navn: "Konsesjoner, patenter", belop: 0, fjoråret: 0 },
            { konto: "1200", navn: "Maskiner og anlegg", belop: 0, fjoråret: 0 },
            { konto: "1250", navn: "Inventar og utstyr", belop: 0, fjoråret: 0 },
          ],
          subtotal: { konto: "", navn: "Sum anleggsmidler", belop: 0, fjoråret: 0, isSubtotal: true },
        },
        {
          id: "omlopsmidler",
          navn: "Omløpsmidler",
          linjer: [
            { konto: "1400", navn: "Varelager", belop: 0, fjoråret: 0 },
            { konto: "1500", navn: "Kundefordringer", belop: 0, fjoråret: 0 },
            { konto: "1920", navn: "Bankinnskudd", belop: 0, fjoråret: 0 },
          ],
          subtotal: { konto: "", navn: "Sum omløpsmidler", belop: 0, fjoråret: 0, isSubtotal: true },
        },
      ],
      total: { konto: "", navn: "SUM EIENDELER", belop: 0, fjoråret: 0, isTotal: true },
    };

    const egenkapitalGjeld: BalanseGruppe = {
      id: "egenkapital-gjeld",
      navn: "EGENKAPITAL OG GJELD",
      kategorier: [
        {
          id: "egenkapital",
          navn: "Egenkapital",
          linjer: [
            { konto: "2000", navn: "Aksjekapital", belop: 0, fjoråret: 0 },
            { konto: "2050", navn: "Annen egenkapital", belop: 0, fjoråret: 0 },
          ],
          subtotal: { konto: "", navn: "Sum egenkapital", belop: 0, fjoråret: 0, isSubtotal: true },
        },
        {
          id: "langsiktig-gjeld",
          navn: "Langsiktig gjeld",
          linjer: [
            { konto: "2250", navn: "Gjeld til kredittinstitusjoner", belop: 0, fjoråret: 0 },
          ],
          subtotal: { konto: "", navn: "Sum langsiktig gjeld", belop: 0, fjoråret: 0, isSubtotal: true },
        },
        {
          id: "kortsiktig-gjeld",
          navn: "Kortsiktig gjeld",
          linjer: [
            {
              konto: "2400",
              navn: "Leverandørgjeld",
              belop: leverandorgjeld,
              fjoråret: 0,
              bilagCount: leverandorgjeldCount
            },
            { konto: "2700", navn: "Skyldig MVA", belop: 0, fjoråret: 0 },
            { konto: "2900", navn: "Annen kortsiktig gjeld", belop: 0, fjoråret: 0 },
          ],
          subtotal: {
            konto: "",
            navn: "Sum kortsiktig gjeld",
            belop: leverandorgjeld,
            fjoråret: 0,
            bilagCount: leverandorgjeldCount,
            isSubtotal: true
          },
        },
      ],
      total: { konto: "", navn: "SUM EGENKAPITAL OG GJELD", belop: leverandorgjeld, fjoråret: 0, isTotal: true },
    };

    return { eiendelerData: eiendeler, egenkapitalGjeldData: egenkapitalGjeld };
  }, [bilagBalanse]);

  // Calculate key figures
  const sumEiendeler = eiendelerData.total.belop;
  const sumEgenkapitalGjeld = egenkapitalGjeldData.total.belop;
  const isBalanced = sumEiendeler === sumEgenkapitalGjeld;
  const egenkapital = egenkapitalGjeldData.kategorier[0].subtotal.belop;
  const kortsiktigGjeld = egenkapitalGjeldData.kategorier[2].subtotal.belop;
  const leverandorgjeld = bilagBalanse?.leverandorgjeld || 0;

  // Ciri insights based on real data
  const ciriInnsikter = useMemo(() => {
    const insights: { type: "positive" | "warning" | "info" | "error"; message: string }[] = [];

    if (!bilagBalanse) {
      insights.push({
        type: "info",
        message: "Laster balansedata...",
      });
      return insights;
    }

    // Leverandørgjeld info
    if (bilagBalanse.leverandorgjeld > 0) {
      insights.push({
        type: "warning",
        message: `${bilagBalanse.leverandorgjeld_count} ubetalte fakturaer på kr ${bilagBalanse.leverandorgjeld.toLocaleString("nb-NO", { maximumFractionDigits: 0 })}`,
      });
    } else {
      insights.push({
        type: "positive",
        message: "Ingen utestående leverandørgjeld",
      });
    }

    // Posted bilags info
    if (bilagBalanse.posted_count > 0) {
      insights.push({
        type: "info",
        message: `${bilagBalanse.posted_count} bilag bokført med totalt kr ${bilagBalanse.posted_total.toLocaleString("nb-NO", { maximumFractionDigits: 0 })}`,
      });
    }

    return insights;
  }, [bilagBalanse]);

  const toggleKategori = (kategoriId: string) => {
    setExpandedKategorier(prev => {
      const newSet = new Set(prev);
      if (newSet.has(kategoriId)) {
        newSet.delete(kategoriId);
      } else {
        newSet.add(kategoriId);
      }
      return newSet;
    });
  };

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const dateStr = selectedDate.toISOString().split('T')[0];
      const response = await fetch(
        `${API_BASE_URL}/api/reports/bilag/balanse?company_id=${COMPANY_ID}&as_of_date=${dateStr}`
      );
      if (response.ok) {
        const data = await response.json();
        setBilagBalanse(data);
      }
    } catch (error) {
      console.error("Failed to refresh:", error);
      toast.error("Kunne ikke oppdatere balansedata.");
    }
    setIsRefreshing(false);
  }, [selectedDate]);

  const formatNumber = (num: number) => {
    return num.toLocaleString("nb-NO", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });
  };

  const getChange = (current: number, previous: number) => {
    return current - previous;
  };

  const getChangePercent = (current: number, previous: number) => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / Math.abs(previous)) * 100;
  };

  // Export to Excel
  const exportToExcel = useCallback(async () => {
    const XLSX = await import("xlsx");
    const wb = XLSX.utils.book_new();

    const data: (string | number)[][] = [
      ["BALANSE - CIRI REGNSKAP"],
      [],
      ["Dato:", format(selectedDate, "d. MMMM yyyy", { locale: nb })],
      ["Generert:", format(new Date(), "d. MMMM yyyy 'kl.' HH:mm", { locale: nb })],
      [],
      ["EIENDELER"],
      ["Konto", "Beskrivelse", "Beløp", "Fjoråret", "Endring"],
    ];

    eiendelerData.kategorier.forEach(kategori => {
      data.push([]);
      data.push([kategori.navn.toUpperCase(), "", "", "", ""]);
      kategori.linjer.forEach(linje => {
        data.push([
          linje.konto,
          linje.navn,
          linje.belop,
          linje.fjoråret,
          linje.belop - linje.fjoråret,
        ]);
      });
      data.push(["", kategori.subtotal.navn, kategori.subtotal.belop, kategori.subtotal.fjoråret, kategori.subtotal.belop - kategori.subtotal.fjoråret]);
    });
    data.push([]);
    data.push(["", eiendelerData.total.navn, eiendelerData.total.belop, eiendelerData.total.fjoråret, eiendelerData.total.belop - eiendelerData.total.fjoråret]);

    data.push([]);
    data.push(["EGENKAPITAL OG GJELD"]);

    egenkapitalGjeldData.kategorier.forEach(kategori => {
      data.push([]);
      data.push([kategori.navn.toUpperCase(), "", "", "", ""]);
      kategori.linjer.forEach(linje => {
        data.push([
          linje.konto,
          linje.navn,
          linje.belop,
          linje.fjoråret,
          linje.belop - linje.fjoråret,
        ]);
      });
      data.push(["", kategori.subtotal.navn, kategori.subtotal.belop, kategori.subtotal.fjoråret, kategori.subtotal.belop - kategori.subtotal.fjoråret]);
    });
    data.push([]);
    data.push(["", egenkapitalGjeldData.total.navn, egenkapitalGjeldData.total.belop, egenkapitalGjeldData.total.fjoråret, egenkapitalGjeldData.total.belop - egenkapitalGjeldData.total.fjoråret]);

    const ws = XLSX.utils.aoa_to_sheet(data);
    ws["!cols"] = [{ wch: 8 }, { wch: 30 }, { wch: 14 }, { wch: 14 }, { wch: 12 }];
    XLSX.utils.book_append_sheet(wb, ws, "Balanse");
    XLSX.writeFile(wb, `balanse_${format(selectedDate, "yyyy-MM-dd")}.xlsx`);
  }, [selectedDate, eiendelerData, egenkapitalGjeldData]);

  const renderBalanseGruppe = (gruppe: BalanseGruppe, isRight = false) => (
    <div className={cn("flex flex-col h-full", isRight && "lg:border-l lg:pl-6")}>
      <h3 className="font-bold text-sm uppercase tracking-wider text-muted-foreground px-4 py-2 bg-muted/30 rounded-lg mb-2">
        {gruppe.navn}
      </h3>

      <div className="flex-1 space-y-2">
      {gruppe.kategorier.map((kategori) => (
        <Collapsible
          key={kategori.id}
          open={expandedKategorier.has(kategori.id)}
          onOpenChange={() => toggleKategori(kategori.id)}
        >
          <CollapsibleTrigger className="flex w-full items-center">
            <div className="grid w-full grid-cols-[24px_1fr_100px_100px_80px] gap-2 px-4 py-2.5 hover:bg-muted/30 transition-colors items-center rounded-lg">
              <motion.div
                animate={{ rotate: expandedKategorier.has(kategori.id) ? 90 : 0 }}
                transition={{ duration: 0.2 }}
              >
                <ChevronRightIcon className="size-4 text-muted-foreground" />
              </motion.div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm">{kategori.navn}</span>
                {kategori.subtotal.bilagCount && kategori.subtotal.bilagCount > 0 && (
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
                    {kategori.subtotal.bilagCount} bilag
                  </Badge>
                )}
              </div>
              <div className="text-right font-mono text-sm font-medium">
                {kategori.subtotal.belop !== 0 ? formatNumber(kategori.subtotal.belop) : "-"}
              </div>
              <div className="text-right font-mono text-sm text-muted-foreground">
                {kategori.subtotal.fjoråret !== 0 ? formatNumber(kategori.subtotal.fjoråret) : "-"}
              </div>
              <div className={cn(
                "text-right font-mono text-xs",
                getChange(kategori.subtotal.belop, kategori.subtotal.fjoråret) >= 0
                  ? "text-emerald-600"
                  : "text-rose-600"
              )}>
                {kategori.subtotal.belop !== 0 || kategori.subtotal.fjoråret !== 0 ? (
                  <>
                    {getChange(kategori.subtotal.belop, kategori.subtotal.fjoråret) >= 0 ? "+" : ""}
                    {getChangePercent(kategori.subtotal.belop, kategori.subtotal.fjoråret).toFixed(0)}%
                  </>
                ) : "-"}
              </div>
            </div>
          </CollapsibleTrigger>

          <CollapsibleContent>
            <div className="border-l-2 border-muted ml-6 space-y-0.5">
              {kategori.linjer.map((linje) => (
                <div key={linje.konto}>
                  {/* Account Row */}
                  <div className="grid grid-cols-[24px_1fr_100px_100px_80px] gap-2 px-4 py-1.5 transition-colors items-center text-sm hover:bg-muted/20">
                    <div className="flex items-center">
                      <span className="font-mono text-xs text-muted-foreground">{linje.konto}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="truncate text-muted-foreground">{linje.navn}</span>
                      {linje.bilagCount && linje.bilagCount > 0 && (
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
                          {linje.bilagCount}
                        </Badge>
                      )}
                    </div>
                    <div className="text-right font-mono">
                      {linje.belop > 0 ? formatNumber(linje.belop) : "-"}
                    </div>
                    <div className="text-right font-mono text-muted-foreground">
                      {linje.fjoråret > 0 ? formatNumber(linje.fjoråret) : "-"}
                    </div>
                    <div className={cn(
                      "text-right font-mono text-xs",
                      getChange(linje.belop, linje.fjoråret) > 0
                        ? "text-emerald-600"
                        : getChange(linje.belop, linje.fjoråret) < 0
                        ? "text-rose-600"
                        : "text-muted-foreground"
                    )}>
                      {linje.belop === 0 && linje.fjoråret === 0 ? "-" :
                        getChange(linje.belop, linje.fjoråret) >= 0 ? "+" : ""}
                      {linje.belop === 0 && linje.fjoråret === 0 ? "" :
                        getChangePercent(linje.belop, linje.fjoråret).toFixed(0)}
                      {linje.belop === 0 && linje.fjoråret === 0 ? "" : "%"}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CollapsibleContent>
        </Collapsible>
      ))}
      </div>

      {/* Total */}
      <div className="grid grid-cols-[24px_1fr_100px_100px_80px] gap-2 px-4 py-3 bg-[var(--primary)]/5 rounded-lg items-center border-t-2 border-[var(--primary)]/30 mt-auto pt-4">
        <div></div>
        <div className="font-bold text-sm">{gruppe.total.navn}</div>
        <div className="text-right font-mono font-bold text-lg">
          {gruppe.total.belop !== 0 ? formatNumber(gruppe.total.belop) : "-"}
        </div>
        <div className="text-right font-mono text-muted-foreground">
          {gruppe.total.fjoråret !== 0 ? formatNumber(gruppe.total.fjoråret) : "-"}
        </div>
        <div className={cn(
          "text-right font-mono text-sm font-medium",
          getChange(gruppe.total.belop, gruppe.total.fjoråret) >= 0
            ? "text-emerald-600"
            : "text-rose-600"
        )}>
          {gruppe.total.belop !== 0 || gruppe.total.fjoråret !== 0 ? (
            <>
              {getChange(gruppe.total.belop, gruppe.total.fjoråret) >= 0 ? "+" : ""}
              {getChangePercent(gruppe.total.belop, gruppe.total.fjoråret).toFixed(0)}%
            </>
          ) : "-"}
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight">Balanse</h1>
          <p className="text-muted-foreground">
            Eiendeler, egenkapital og gjeld per {format(selectedDate, "d. MMMM yyyy", { locale: nb })}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Date Selector */}
          <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <CalendarIcon className="size-4" />
                {format(selectedDate, "d. MMM yyyy", { locale: nb })}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(date) => {
                  if (date) {
                    setSelectedDate(date);
                    setDatePickerOpen(false);
                  }
                }}
                locale={nb}
              />
            </PopoverContent>
          </Popover>

          {/* Export */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <DownloadIcon className="size-4" />
                <span className="hidden sm:inline">Eksporter</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={exportToExcel} className="gap-2">
                <FileSpreadsheetIcon className="size-4" />
                Excel (.xlsx)
              </DropdownMenuItem>
              <DropdownMenuItem className="gap-2">
                <FileTextIcon className="size-4" />
                PDF
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Refresh */}
          <Button
            variant="ghost"
            size="icon"
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            <RefreshCwIcon className={cn("size-4", isRefreshing && "animate-spin")} />
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-sm">Leverandørgjeld</p>
                {apiLoading ? (
                  <Skeleton className="h-8 w-32 mt-1" />
                ) : (
                  <p className={cn(
                    "font-display text-2xl font-bold",
                    leverandorgjeld > 0 ? "text-amber-600" : "text-emerald-600"
                  )}>
                    kr {formatNumber(leverandorgjeld)}
                  </p>
                )}
                <p className="text-xs text-muted-foreground mt-1">
                  {bilagBalanse?.leverandorgjeld_count || 0} ubetalte fakturaer
                </p>
              </div>
              <div className={cn(
                "flex size-10 items-center justify-center rounded-full",
                leverandorgjeld > 0 ? "bg-amber-100 dark:bg-amber-900/30" : "bg-emerald-100 dark:bg-emerald-900/30"
              )}>
                <WalletIcon className={cn(
                  "size-5",
                  leverandorgjeld > 0 ? "text-amber-600" : "text-emerald-600"
                )} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-sm">Bokførte kostnader</p>
                {apiLoading ? (
                  <Skeleton className="h-8 w-32 mt-1" />
                ) : (
                  <p className="font-display text-2xl font-bold">
                    kr {formatNumber(bilagBalanse?.posted_total || 0)}
                  </p>
                )}
                <p className="text-xs text-muted-foreground mt-1">
                  {bilagBalanse?.posted_count || 0} bilag bokført
                </p>
              </div>
              <div className="flex size-10 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30">
                <BuildingIcon className="size-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-sm">Sum eiendeler</p>
                {apiLoading ? (
                  <Skeleton className="h-8 w-32 mt-1" />
                ) : (
                  <p className="font-display text-2xl font-bold">
                    kr {formatNumber(sumEiendeler)}
                  </p>
                )}
                <p className="text-xs text-muted-foreground mt-1">
                  Ingen registrert ennå
                </p>
              </div>
              <div className="flex size-10 items-center justify-center rounded-full bg-sky-100 dark:bg-sky-900/30">
                <PiggyBankIcon className="size-5 text-sky-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-sm">Balansestatus</p>
                {apiLoading ? (
                  <Skeleton className="h-8 w-20 mt-1" />
                ) : (
                  <p className={cn(
                    "font-display text-lg font-bold",
                    isBalanced ? "text-emerald-600" : "text-amber-600"
                  )}>
                    {isBalanced ? "I balanse" : "Ufullstendig"}
                  </p>
                )}
                <p className="text-xs text-muted-foreground mt-1">
                  {isBalanced ? "Eiendeler = Gjeld" : "Mangler data"}
                </p>
              </div>
              <div className={cn(
                "flex size-10 items-center justify-center rounded-full",
                isBalanced ? "bg-emerald-100 dark:bg-emerald-900/30" : "bg-amber-100 dark:bg-amber-900/30"
              )}>
                <ScaleIcon className={cn(
                  "size-5",
                  isBalanced ? "text-emerald-600" : "text-amber-600"
                )} />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Ciri Insights */}
      <Card className="border-[var(--primary)]/20 bg-gradient-to-r from-[var(--primary)]/5 to-transparent">
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
                <p className="text-sm font-medium">Ciri har analysert balansen</p>
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
                      innsikt.type === "positive"
                        ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-200"
                        : innsikt.type === "warning"
                        ? "bg-amber-50 text-amber-800 dark:bg-amber-900/20 dark:text-amber-200"
                        : innsikt.type === "error"
                        ? "bg-rose-50 text-rose-800 dark:bg-rose-900/20 dark:text-rose-200"
                        : "bg-blue-50 text-blue-800 dark:bg-blue-900/20 dark:text-blue-200"
                    )}
                  >
                    {innsikt.type === "positive" ? (
                      <CheckCircle2Icon className="size-4 shrink-0" />
                    ) : innsikt.type === "warning" || innsikt.type === "error" ? (
                      <AlertTriangleIcon className="size-4 shrink-0" />
                    ) : (
                      <InfoIcon className="size-4 shrink-0" />
                    )}
                    <span>{innsikt.message}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Balance Table */}
      <Card>
        <CardHeader className="pb-0">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Oppstilling</CardTitle>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="gap-1">
                <CalendarIcon className="size-3" />
                {format(selectedDate, "d. MMM yyyy", { locale: nb })}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-4">
          {/* Table Header */}
          <div className="grid grid-cols-[24px_1fr_100px_100px_80px] gap-2 px-4 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider border-b bg-muted/30 rounded-t-lg mb-4">
            <div></div>
            <div>Beskrivelse</div>
            <div className="text-right">Beløp</div>
            <div className="text-right">Fjoråret</div>
            <div className="text-right">Endr.</div>
          </div>

          {apiLoading ? (
            <div className="grid lg:grid-cols-2 gap-8">
              <div className="space-y-4">
                {[1, 2].map(i => (
                  <div key={i} className="space-y-2">
                    <Skeleton className="h-8 w-full" />
                    <div className="ml-6 space-y-1">
                      {[1, 2, 3, 4].map(j => (
                        <Skeleton key={j} className="h-6 w-full" />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              <div className="space-y-4">
                {[1, 2, 3].map(i => (
                  <div key={i} className="space-y-2">
                    <Skeleton className="h-8 w-full" />
                    <div className="ml-6 space-y-1">
                      {[1, 2, 3].map(j => (
                        <Skeleton key={j} className="h-6 w-full" />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="grid lg:grid-cols-2 gap-8 items-stretch">
              {/* Eiendeler (Left) */}
              {renderBalanseGruppe(eiendelerData)}

              {/* Egenkapital og Gjeld (Right) */}
              {renderBalanseGruppe(egenkapitalGjeldData, true)}
            </div>
          )}

          {/* Balance Check */}
          {!apiLoading && (
            <div className={cn(
              "mt-6 p-4 rounded-lg border-2 flex items-center justify-between",
              leverandorgjeld > 0
                ? "border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-900/20"
                : "border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-900/20"
            )}>
              <div className="flex items-center gap-3">
                {leverandorgjeld > 0 ? (
                  <AlertTriangleIcon className="size-6 text-amber-600" />
                ) : (
                  <CheckCircle2Icon className="size-6 text-blue-600" />
                )}
                <div>
                  <p className={cn("font-medium", leverandorgjeld > 0 ? "text-amber-800 dark:text-amber-200" : "text-blue-800 dark:text-blue-200")}>
                    {leverandorgjeld > 0 ? "Utestående leverandørgjeld" : "Ingen utestående gjeld"}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {leverandorgjeld > 0
                      ? `${bilagBalanse?.leverandorgjeld_count || 0} fakturaer venter på betaling`
                      : "Alle registrerte fakturaer er bokført"}
                  </p>
                </div>
              </div>
              {leverandorgjeld > 0 && (
                <Badge variant="outline" className="text-lg px-4 py-2 border-amber-400 text-amber-700">
                  kr {formatNumber(leverandorgjeld)}
                </Badge>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <LearnMoreDocs sections={["rapporter", "bokforing"]} />
    </div>
  );
}
