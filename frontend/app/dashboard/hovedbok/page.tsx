"use client";

import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { format, parseISO, isWithinInterval } from "date-fns";
import { nb } from "date-fns/locale";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import LearnMoreDocs from "@/components/learn-more-docs";
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
  DownloadIcon,
  CalendarIcon,
  FileSpreadsheetIcon,
  FileTextIcon,
  Loader2Icon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { API_BASE_URL, COMPANY_ID } from "@/lib/api";
import { useCiriActionListener } from "@/lib/ciri-actions";
import { useCrystallize } from "@/lib/use-crystallize";
import { HovedboKonto, KontoKlasse, Transaksjon, Filters, Totals } from "./types";
import { kontoKlasser, periodeValg, ciriInnsikter } from "./constants";
import { hovedbokData } from "./data/hovedbokData";
import { getDateRangeFromPeriod, formatNumber } from "./utils";
import { exportToExcel, downloadPDF } from "./export-utils";
import {
  SummaryCards,
  CiriInsightsCard,
  PdfExportDialog,
  SearchFilterBar,
  AccountClassSection,
} from "./components";

export default function HovedbokPage() {
  const [selectedPeriode, setSelectedPeriode] = useState("dette-ar");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedKontoer, setExpandedKontoer] = useState<Set<string>>(new Set());
  const [expandedKlasser, setExpandedKlasser] = useState<Set<number>>(new Set([1, 2, 3]));
  const [customDatePickerOpen, setCustomDatePickerOpen] = useState(false);
  const [customDateFrom, setCustomDateFrom] = useState<Date | undefined>(undefined);
  const [customDateTo, setCustomDateTo] = useState<Date | undefined>(undefined);
  const [highlightedKonto, setHighlightedKonto] = useState<string | null>(null);
  const [filters, setFilters] = useState<Filters>({
    kontoFra: "",
    kontoTil: "",
    avdeling: "",
    prosjekt: "",
  });
  const [exportLoading, setExportLoading] = useState<"excel" | "pdf" | null>(null);
  const [pdfPreviewOpen, setPdfPreviewOpen] = useState(false);

  const hovedbokSearchRef = useRef<HTMLInputElement>(null);
  useCiriActionListener("sok-konto", useCallback(() => hovedbokSearchRef.current?.focus(), []));

  // Auto-filter when arriving from balance sheet with ?konto=XXXX
  const searchParams = useSearchParams();
  const kontoParam = searchParams.get("konto");
  const kontoParamHandled = useRef(false);
  useEffect(() => {
    if (kontoParam && !kontoParamHandled.current) {
      kontoParamHandled.current = true;
      setSearchQuery(`*${kontoParam}`);
      const klasse = parseInt(kontoParam[0]);
      if (!isNaN(klasse)) {
        setExpandedKlasser(prev => new Set(prev).add(klasse));
      }
      setExpandedKontoer(prev => new Set(prev).add(kontoParam));
      setHighlightedKonto(kontoParam);
    }
  }, [kontoParam]);

  const dateRange = useMemo(() => {
    return getDateRangeFromPeriod(selectedPeriode, customDateFrom, customDateTo);
  }, [selectedPeriode, customDateFrom, customDateTo]);

  const periodStart = format(dateRange.from, "yyyy-MM-dd");
  const periodEnd = format(dateRange.to, "yyyy-MM-dd");

  const { data: apiData = null, isLoading: apiLoading, isFetching, refetch } = useQuery({
    queryKey: queryKeys.reports.hovedbok({ periodStart, periodEnd, companyId: COMPANY_ID }),
    queryFn: async () => {
      const params = new URLSearchParams({
        company_id: COMPANY_ID,
        period_start: periodStart,
        period_end: periodEnd,
      });
      const response = await fetch(`${API_BASE_URL}/api/reports/hovedbok?${params}`);
      if (!response.ok) return null;
      const data = await response.json();
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
          createdByCiri: t.created_by_ciri ?? false,
        })),
      }));
      return transformed;
    },
  });

  const crystallize = useCrystallize(apiLoading);
  const isRefreshing = isFetching;

  const dateRangeDisplay = useMemo(() => {
    return `${format(dateRange.from, "d. MMM yyyy", { locale: nb })} - ${format(dateRange.to, "d. MMM yyyy", { locale: nb })}`;
  }, [dateRange]);

  const dateFilteredData = useMemo(() => {
    if (apiData && apiData.length > 0) {
      return apiData;
    }

    return hovedbokData.map(konto => {
      const filteredTransaksjoner = konto.transaksjoner.filter(trans => {
        const transDate = parseISO(trans.dato);
        return isWithinInterval(transDate, { start: dateRange.from, end: dateRange.to });
      });

      const debet = filteredTransaksjoner.reduce((sum, t) => sum + t.debet, 0);
      const kredit = filteredTransaksjoner.reduce((sum, t) => sum + t.kredit, 0);

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

  const filteredKontoer = useMemo(() => {
    return kontoerPerKlasse.map(klasse => ({
      ...klasse,
      kontoer: klasse.kontoer
        .map(konto => {
          if (filters.kontoFra && konto.kontonummer < filters.kontoFra) return null;
          if (filters.kontoTil && konto.kontonummer > filters.kontoTil) return null;

          if (!searchQuery) return konto;

          const query = searchQuery.toLowerCase().trim();

          if (query.startsWith("*")) {
            const kontoSearch = query.slice(1).trim();
            if (!konto.kontonummer.includes(kontoSearch) && !konto.kontonavn.toLowerCase().includes(kontoSearch)) {
              return null;
            }
            return konto;
          } else if (query.startsWith("=")) {
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
            const matchesKonto =
              konto.kontonummer.includes(query) ||
              konto.kontonavn.toLowerCase().includes(query) ||
              konto.klasse.toLowerCase().includes(query);

            const matchingTrans = konto.transaksjoner.filter(t => transactionMatchesQuery(t, query));

            if (matchesKonto) {
              return konto;
            }

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

  const handlePeriodSelect = (periodeId: string) => {
    if (periodeId === "egendefinert") {
      setCustomDatePickerOpen(true);
    }
    setSelectedPeriode(periodeId);
  };

  const applyCustomDateRange = () => {
    setCustomDatePickerOpen(false);
  };

  const handleRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  const navigateToKonto = useCallback((kontonummer: string) => {
    const konto = hovedbokData.find(k => k.kontonummer === kontonummer);
    if (!konto) return;

    setExpandedKlasser(prev => {
      const newSet = new Set(prev);
      newSet.add(konto.klasseNummer);
      return newSet;
    });

    setExpandedKontoer(prev => {
      const newSet = new Set(prev);
      newSet.add(kontonummer);
      return newSet;
    });

    setHighlightedKonto(kontonummer);

    setTimeout(() => {
      const element = document.getElementById(`konto-${kontonummer}`);
      if (element) {
        element.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }, 100);

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

  const handleExportToExcel = useCallback(async () => {
    setExportLoading("excel");
    try {
      await exportToExcel(filteredKontoer, totals, dateRange, dateRangeDisplay);
    } catch (error) {
      console.error("Excel export failed:", error);
    } finally {
      setExportLoading(null);
    }
  }, [filteredKontoer, totals, dateRange, dateRangeDisplay]);

  const exportToPDF = useCallback(() => {
    setPdfPreviewOpen(true);
  }, []);

  const handleDownloadPDF = useCallback(async () => {
    setExportLoading("pdf");
    try {
      await downloadPDF(filteredKontoer, totals, dateRange, dateRangeDisplay);
    } catch (error) {
      console.error("PDF export failed:", error);
    } finally {
      setExportLoading(null);
      setPdfPreviewOpen(false);
    }
  }, [filteredKontoer, totals, dateRange, dateRangeDisplay]);


  return (
    <div className="mx-auto max-w-[1200px] space-y-6 pb-12">
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
              <DropdownMenuItem className="gap-2" onClick={handleExportToExcel} disabled={exportLoading === "excel"}>
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

      <PdfExportDialog
        open={pdfPreviewOpen}
        onOpenChange={setPdfPreviewOpen}
        dateRangeDisplay={dateRangeDisplay}
        totals={totals}
        onDownload={handleDownloadPDF}
        isLoading={exportLoading === "pdf"}
      />

      <div className={crystallize(1)}>
        <SummaryCards
          totals={totals}
          isRefreshing={isRefreshing}
          ciriInnsikterCount={ciriInnsikter.length}
        />
      </div>

      <div className={crystallize(2)}>
        <CiriInsightsCard
          ciriInnsikter={ciriInnsikter}
          transaksjonCount={totals.transaksjonCount}
          onNavigateToKonto={navigateToKonto}
        />
      </div>

      <SearchFilterBar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        filters={filters}
        onFiltersChange={setFilters}
        onRefresh={handleRefresh}
        isRefreshing={isRefreshing}
        searchInputRef={hovedbokSearchRef}
      />

      <Card className={crystallize(3)}>
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
          <div className="hidden lg:grid lg:grid-cols-[40px_100px_1fr_120px_120px_120px_120px] gap-4 px-4 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider border-b bg-muted/30 rounded-t-lg">
            <div></div>
            <div>Konto</div>
            <div>Kontonavn</div>
            <div className="text-right">IB</div>
            <div className="text-right">Debet</div>
            <div className="text-right">Kredit</div>
            <div className="text-right">UB</div>
          </div>

          {isRefreshing ? (
            <div className="space-y-2 py-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="space-y-2">
                  <div className="flex items-center gap-3 px-4 py-3">
                    <Skeleton className="size-4" />
                    <Skeleton className="h-5 w-16" />
                    <Skeleton className="h-5 w-32" />
                    <Skeleton className="h-5 w-20 ml-auto" />
                  </div>
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
          <div className="divide-y">
            {filteredKontoer.map((klasse) => (
              <AccountClassSection
                key={klasse.nummer}
                klasse={klasse}
                isExpanded={expandedKlasser.has(klasse.nummer)}
                onToggle={() => toggleKlasse(klasse.nummer)}
                expandedKontoer={expandedKontoer}
                onToggleKonto={toggleKonto}
                highlightedKonto={highlightedKonto}
              />
            ))}
          </div>
          )}

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
