"use client";

import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import { nb } from "date-fns/locale";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import LearnMoreDocs from "@/components/learn-more-docs";
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
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  TrendingUpIcon,
  TrendingDownIcon,
  DownloadIcon,
  ChevronRightIcon,
  FileSpreadsheetIcon,
  FileTextIcon,
  ArrowUpIcon,
  RefreshCwIcon,
  SparklesIcon,
  CheckCircle2Icon,
  AlertTriangleIcon,
  InfoIcon,
  DatabaseIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { API_BASE_URL, COMPANY_ID } from "@/lib/api";
import CiriLogo from "@/components/layout/ciri-logo";

import Link from "next/link";

// Types
interface ResultatLinje {
  konto: string;
  navn: string;
  måneder: number[]; // 12 months of data
  bilagCount?: number;
  isSubtotal?: boolean;
  isTotal?: boolean;
}

interface ResultatGruppe {
  id: string;
  navn: string;
  linjer: ResultatLinje[];
  subtotal: ResultatLinje;
}

interface BilagDetail {
  id: string;
  bilag_number: string;
  document_date: string;
  description: string;
  counterparty_name: string | null;
  gross_amount: number;
  net_amount: number;
  mva_amount: number;
}

interface AccountBilagResponse {
  account_code: string;
  account_name: string;
  year: number;
  bilags: BilagDetail[];
  total_amount: number;
}

// Month names (short)
const månedNavn = ["Jan", "Feb", "Mar", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Des"];

// Period options
const years = [2026, 2025, 2024];

interface ApiAccountData {
  account_code: string;
  account_name: string;
  total_gross: number;
  total_net: number;
  total_mva: number;
  bilag_count: number;
  monthly_amounts: number[];
}

interface ApiResultatResponse {
  year: number;
  accounts: ApiAccountData[];
  total_gross: number;
  total_net: number;
  total_mva: number;
  by_category: Record<string, number>;
}

export default function ResultatregnskapPage() {
  const [selectedYear, setSelectedYear] = useState("2026");
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(
    new Set(["driftsinntekter", "driftskostnader", "finansposter"])
  );
  const [expandedAccounts, setExpandedAccounts] = useState<Set<string>>(new Set());
  const [accountBilags, setAccountBilags] = useState<Record<string, BilagDetail[]>>({});
  const [loadingAccounts, setLoadingAccounts] = useState<Set<string>>(new Set());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const tableRef = useRef<HTMLDivElement>(null);

  // API data state
  const [apiData, setApiData] = useState<ApiResultatResponse | null>(null);
  const [apiLoading, setApiLoading] = useState(true);

  // Toggle account expansion and fetch bilags
  const toggleAccountExpansion = useCallback(async (accountCode: string) => {
    setExpandedAccounts(prev => {
      const newSet = new Set(prev);
      if (newSet.has(accountCode)) {
        newSet.delete(accountCode);
      } else {
        newSet.add(accountCode);
        // Fetch bilags if not already loaded
        if (!accountBilags[accountCode] && !loadingAccounts.has(accountCode)) {
          fetchAccountBilags(accountCode);
        }
      }
      return newSet;
    });
  }, [accountBilags, loadingAccounts]);

  // Fetch bilags for an account
  const fetchAccountBilags = useCallback(async (accountCode: string) => {
    setLoadingAccounts(prev => new Set(prev).add(accountCode));
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/reports/account/${accountCode}/bilags?company_id=${COMPANY_ID}&year=${selectedYear}`
      );
      if (response.ok) {
        const data: AccountBilagResponse = await response.json();
        setAccountBilags(prev => ({ ...prev, [accountCode]: data.bilags }));
      }
    } catch (error) {
      console.error(`Failed to fetch bilags for account ${accountCode}:`, error);
    } finally {
      setLoadingAccounts(prev => {
        const newSet = new Set(prev);
        newSet.delete(accountCode);
        return newSet;
      });
    }
  }, [selectedYear]);

  // Fetch real bilag data from API
  useEffect(() => {
    async function fetchResultatData() {
      try {
        setApiLoading(true);
        const response = await fetch(
          `${API_BASE_URL}/api/reports/bilag/resultat?company_id=${COMPANY_ID}&year=${selectedYear}`
        );
        if (response.ok) {
          const data = await response.json();
          setApiData(data);
        }
      } catch (error) {
        console.error("Failed to fetch resultat data:", error);
      } finally {
        setApiLoading(false);
      }
    }
    fetchResultatData();
  }, [selectedYear]);

  // Build resultat data from API response
  const resultatData: ResultatGruppe[] = useMemo(() => {
    // Transform API accounts to ResultatLinje format for driftskostnader
    const driftskostnaderLinjer: ResultatLinje[] = apiData?.accounts.map(acc => ({
      konto: acc.account_code,
      navn: acc.account_name,
      måneder: acc.monthly_amounts,
      bilagCount: acc.bilag_count,
    })) || [];

    // Calculate subtotal for driftskostnader
    const driftskostnaderSubtotal: number[] = Array(12).fill(0);
    driftskostnaderLinjer.forEach(linje => {
      linje.måneder.forEach((val, i) => {
        driftskostnaderSubtotal[i] += val;
      });
    });

    return [
      {
        id: "driftsinntekter",
        navn: "Driftsinntekter",
        linjer: [
          // Placeholder for income - would come from sales invoices
          { konto: "3000", navn: "Salgsinntekt (ikke registrert)", måneder: Array(12).fill(0) },
        ],
        subtotal: { konto: "", navn: "Sum driftsinntekter", måneder: Array(12).fill(0), isSubtotal: true },
      },
      {
        id: "driftskostnader",
        navn: "Driftskostnader",
        linjer: driftskostnaderLinjer.length > 0 ? driftskostnaderLinjer : [
          { konto: "-", navn: "Ingen kostnader registrert", måneder: Array(12).fill(0) },
        ],
        subtotal: {
          konto: "",
          navn: "Sum driftskostnader",
          måneder: driftskostnaderSubtotal,
          bilagCount: apiData?.accounts.reduce((sum, a) => sum + a.bilag_count, 0) || 0,
          isSubtotal: true
        },
      },
      {
        id: "finansposter",
        navn: "Finansposter",
        linjer: [
          { konto: "8040", navn: "Renteinntekter", måneder: Array(12).fill(0) },
          { konto: "8150", navn: "Rentekostnader", måneder: Array(12).fill(0) },
        ],
        subtotal: { konto: "", navn: "Netto finansposter", måneder: Array(12).fill(0), isSubtotal: true },
      },
    ];
  }, [apiData]);

  // Calculate totals
  const getYearTotal = (måneder: number[]) => måneder.reduce((sum, val) => sum + val, 0);

  const driftsinntekterTotal = getYearTotal(resultatData[0]?.subtotal.måneder || []);
  const driftskostnaderTotal = getYearTotal(resultatData[1]?.subtotal.måneder || []);
  const finansposterTotal = getYearTotal(resultatData[2]?.subtotal.måneder || []);
  const driftsresultatTotal = driftsinntekterTotal - driftskostnaderTotal;
  const resultatForSkattTotal = driftsresultatTotal + finansposterTotal;
  const skattekostnadTotal = resultatForSkattTotal > 0 ? resultatForSkattTotal * 0.22 : 0;
  const arsresultatTotal = resultatForSkattTotal - skattekostnadTotal;

  const calculateDriftsresultat = (monthIndex: number) => {
    const inntekt = resultatData[0]?.subtotal.måneder[monthIndex] || 0;
    const kostnad = resultatData[1]?.subtotal.måneder[monthIndex] || 0;
    return inntekt - kostnad;
  };

  const calculateResultatForSkatt = (monthIndex: number) => {
    return calculateDriftsresultat(monthIndex) + (resultatData[2]?.subtotal.måneder[monthIndex] || 0);
  };

  // Ciri insights based on real data
  const ciriInnsikter = useMemo(() => {
    if (!apiData || apiData.accounts.length === 0) {
      return [
        {
          type: "info" as const,
          message: "Ingen bilag registrert for dette året ennå",
        },
      ];
    }

    const insights: { type: "positive" | "warning" | "info"; message: string }[] = [];

    // Find highest cost category
    const categories = Object.entries(apiData.by_category).sort(([,a], [,b]) => b - a);
    if (categories.length > 0) {
      insights.push({
        type: "info",
        message: `Største kostnadskategori: ${categories[0][0]} (kr ${categories[0][1].toLocaleString("nb-NO", { maximumFractionDigits: 0 })})`,
      });
    }

    // Total bilags registered
    const totalBilag = apiData.accounts.reduce((sum, a) => sum + a.bilag_count, 0);
    insights.push({
      type: "positive",
      message: `${totalBilag} bilag registrert med totalt kr ${apiData.total_gross.toLocaleString("nb-NO", { maximumFractionDigits: 0 })} i kostnader`,
    });

    // MVA info
    if (apiData.total_mva > 0) {
      insights.push({
        type: "info",
        message: `Fradragsberettiget MVA: kr ${apiData.total_mva.toLocaleString("nb-NO", { maximumFractionDigits: 0 })}`,
      });
    }

    return insights;
  }, [apiData]);

  const toggleGroup = (groupId: string) => {
    setExpandedGroups(prev => {
      const newSet = new Set(prev);
      if (newSet.has(groupId)) {
        newSet.delete(groupId);
      } else {
        newSet.add(groupId);
      }
      return newSet;
    });
  };

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/reports/bilag/resultat?company_id=${COMPANY_ID}&year=${selectedYear}`
      );
      if (response.ok) {
        const data = await response.json();
        setApiData(data);
      }
    } catch (error) {
      console.error("Failed to refresh:", error);
    }
    setIsRefreshing(false);
  }, [selectedYear]);

  const formatNumber = (num: number, compact = false) => {
    if (compact && Math.abs(num) >= 1000) {
      return (num / 1000).toFixed(0) + "k";
    }
    return num.toLocaleString("nb-NO", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });
  };

  // Export to Excel
  const exportToExcel = useCallback(async () => {
    const XLSX = await import("xlsx");
    const wb = XLSX.utils.book_new();

    const data: (string | number)[][] = [
      ["RESULTATREGNSKAP - CIRI REGNSKAP"],
      [],
      ["År:", selectedYear],
      ["Generert:", format(new Date(), "d. MMMM yyyy 'kl.' HH:mm", { locale: nb })],
      [],
      ["Konto", "Beskrivelse", ...månedNavn, "Totalt"],
    ];

    resultatData.forEach(gruppe => {
      data.push([]);
      data.push([gruppe.navn.toUpperCase(), "", ...Array(12).fill(""), ""]);
      gruppe.linjer.forEach(linje => {
        data.push([
          linje.konto,
          linje.navn,
          ...linje.måneder,
          getYearTotal(linje.måneder),
        ]);
      });
      data.push([
        "",
        gruppe.subtotal.navn,
        ...gruppe.subtotal.måneder,
        getYearTotal(gruppe.subtotal.måneder),
      ]);
    });

    data.push([]);
    data.push(["", "DRIFTSRESULTAT", ...Array(12).fill(0).map((_, i) => calculateDriftsresultat(i)), driftsresultatTotal]);
    data.push(["", "RESULTAT FØR SKATT", ...Array(12).fill(0).map((_, i) => calculateResultatForSkatt(i)), resultatForSkattTotal]);
    data.push(["", "Skattekostnad (22%)", ...Array(12).fill(""), -skattekostnadTotal]);
    data.push(["", "ÅRSRESULTAT", ...Array(12).fill(""), arsresultatTotal]);

    const ws = XLSX.utils.aoa_to_sheet(data);
    ws["!cols"] = [
      { wch: 8 }, { wch: 28 },
      ...Array(12).fill({ wch: 10 }),
      { wch: 12 }
    ];
    XLSX.utils.book_append_sheet(wb, ws, "Resultatregnskap");
    XLSX.writeFile(wb, `resultatregnskap_${selectedYear}.xlsx`);
  }, [selectedYear, resultatData, driftsresultatTotal, resultatForSkattTotal, skattekostnadTotal, arsresultatTotal]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight">Resultatregnskap</h1>
          <p className="text-muted-foreground">
            Månedlig oversikt for {selectedYear}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Year Selector */}
          <Select value={selectedYear} onValueChange={setSelectedYear}>
            <SelectTrigger className="w-24">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {years.map(year => (
                <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
              ))}
            </SelectContent>
          </Select>

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
                <p className="text-muted-foreground text-sm">Driftskostnader</p>
                {apiLoading ? (
                  <Skeleton className="h-8 w-32 mt-1" />
                ) : (
                  <p className="font-display text-2xl font-bold text-rose-600">
                    kr {formatNumber(driftskostnaderTotal)}
                  </p>
                )}
                <p className="text-xs text-muted-foreground mt-1">
                  {apiData?.accounts.reduce((sum, a) => sum + a.bilag_count, 0) || 0} bilag
                </p>
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
                <p className="text-muted-foreground text-sm">Driftsresultat</p>
                {apiLoading ? (
                  <Skeleton className="h-8 w-32 mt-1" />
                ) : (
                  <p className={cn(
                    "font-display text-2xl font-bold",
                    driftsresultatTotal < 0 ? "text-rose-600" : "text-foreground"
                  )}>
                    kr {formatNumber(driftsresultatTotal)}
                  </p>
                )}
                <p className={cn("text-xs mt-1", driftsresultatTotal < 0 ? "text-rose-600" : "text-muted-foreground")}>
                  {driftsresultatTotal < 0 ? "Underskudd" : "Resultat"} fra drift
                </p>
              </div>
              <div className={cn(
                "flex size-10 items-center justify-center rounded-full",
                driftsresultatTotal < 0 ? "bg-rose-100 dark:bg-rose-900/30" : "bg-blue-100 dark:bg-blue-900/30"
              )}>
                {driftsresultatTotal < 0 ? (
                  <TrendingDownIcon className="size-5 text-rose-600" />
                ) : (
                  <TrendingUpIcon className="size-5 text-blue-600" />
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-sm">MVA til gode</p>
                {apiLoading ? (
                  <Skeleton className="h-8 w-32 mt-1" />
                ) : (
                  <p className="font-display text-2xl font-bold text-emerald-600">
                    kr {formatNumber(apiData?.total_mva || 0)}
                  </p>
                )}
                <p className="text-xs text-muted-foreground mt-1">
                  Fradragsberettiget
                </p>
              </div>
              <div className="flex size-10 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30">
                <ArrowUpIcon className="size-5 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-sm">Registrerte bilag</p>
                {apiLoading ? (
                  <Skeleton className="h-8 w-20 mt-1" />
                ) : (
                  <p className="font-display text-2xl font-bold">
                    {apiData?.accounts.reduce((sum, a) => sum + a.bilag_count, 0) || 0}
                  </p>
                )}
                <p className="text-xs text-muted-foreground mt-1">
                  {apiData?.accounts.length || 0} kontoer
                </p>
              </div>
              <div className="flex size-10 items-center justify-center rounded-full bg-[var(--primary)]/10">
                <DatabaseIcon className="size-5 text-[var(--primary)]" />
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
                <p className="text-sm font-medium">Ciri har analysert regnskapet</p>
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
                        : "bg-blue-50 text-blue-800 dark:bg-blue-900/20 dark:text-blue-200"
                    )}
                  >
                    {innsikt.type === "positive" ? (
                      <CheckCircle2Icon className="size-4 shrink-0" />
                    ) : innsikt.type === "warning" ? (
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

      {/* Resultatregnskap Table */}
      <Card>
        <CardHeader className="pb-0">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Månedlig oppstilling</CardTitle>
            <Badge variant="outline">
              {selectedYear}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="pt-4">
          {/* Scrollable table container */}
          <div className="overflow-x-auto" ref={tableRef}>
            <div className="w-full">
              {/* Table Header */}
              <div className="grid grid-cols-[minmax(180px,1.8fr)_repeat(12,minmax(60px,1fr))_minmax(80px,1fr)] gap-1 px-2 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider border-b bg-muted/30 rounded-t-lg sticky top-0">
                <div>Konto</div>
                {månedNavn.map(m => (
                  <div key={m} className="text-right">{m}</div>
                ))}
                <div className="text-right font-semibold">Totalt</div>
              </div>

              {apiLoading ? (
                <div className="space-y-4 py-4">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="space-y-2">
                      <Skeleton className="h-10 w-full" />
                      <div className="ml-4 space-y-1">
                        {[1, 2, 3, 4].map(j => (
                          <Skeleton key={j} className="h-8 w-full" />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="divide-y">
                  {resultatData.map((gruppe) => (
                    <Collapsible
                      key={gruppe.id}
                      open={expandedGroups.has(gruppe.id)}
                      onOpenChange={() => toggleGroup(gruppe.id)}
                    >
                      {/* Group Header */}
                      <CollapsibleTrigger className="flex w-full items-center">
                        <div className="grid w-full grid-cols-[minmax(180px,1.8fr)_repeat(12,minmax(60px,1fr))_minmax(80px,1fr)] gap-1 px-2 py-3 hover:bg-muted/30 transition-colors items-center">
                          <div className="flex items-center gap-2">
                            <motion.div
                              animate={{ rotate: expandedGroups.has(gruppe.id) ? 90 : 0 }}
                              transition={{ duration: 0.2 }}
                            >
                              <ChevronRightIcon className="size-4 text-muted-foreground" />
                            </motion.div>
                            <span className="font-semibold text-sm uppercase tracking-wide">
                              {gruppe.navn}
                            </span>
                            {gruppe.subtotal.bilagCount && gruppe.subtotal.bilagCount > 0 && (
                              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
                                {gruppe.subtotal.bilagCount} bilag
                              </Badge>
                            )}
                          </div>
                          {/* Show values when collapsed */}
                          {!expandedGroups.has(gruppe.id) && (
                            <>
                              {gruppe.subtotal.måneder.map((val, i) => (
                                <div key={i} className="text-right font-mono text-xs font-medium">
                                  {val !== 0 ? formatNumber(val, true) : "-"}
                                </div>
                              ))}
                              <div className="text-right font-mono text-xs font-bold text-[var(--primary)]">
                                {formatNumber(getYearTotal(gruppe.subtotal.måneder))}
                              </div>
                            </>
                          )}
                        </div>
                      </CollapsibleTrigger>

                      {/* Group Content - Individual Lines */}
                      <CollapsibleContent>
                        <div className="border-l-2 border-muted ml-4">
                          {gruppe.linjer.map((linje) => (
                            <div key={linje.konto}>
                              {/* Account Row - Clickable if has bilags */}
                              <div
                                className={cn(
                                  "grid grid-cols-[minmax(180px,1.8fr)_repeat(12,minmax(60px,1fr))_minmax(80px,1fr)] gap-1 px-2 py-2 transition-colors items-center text-sm",
                                  linje.bilagCount && linje.bilagCount > 0
                                    ? "cursor-pointer hover:bg-[var(--primary)]/5"
                                    : "hover:bg-muted/20"
                                )}
                                onClick={() => linje.bilagCount && linje.bilagCount > 0 && toggleAccountExpansion(linje.konto)}
                              >
                                <div className="flex items-center gap-2 pl-2">
                                  {linje.bilagCount && linje.bilagCount > 0 ? (
                                    <motion.div
                                      animate={{ rotate: expandedAccounts.has(linje.konto) ? 90 : 0 }}
                                      transition={{ duration: 0.2 }}
                                    >
                                      <ChevronRightIcon className="size-3 text-muted-foreground" />
                                    </motion.div>
                                  ) : (
                                    <div className="w-3" />
                                  )}
                                  <span className="font-mono text-xs text-muted-foreground w-10">
                                    {linje.konto}
                                  </span>
                                  <span className="truncate text-muted-foreground text-xs">
                                    {linje.navn}
                                  </span>
                                  {linje.bilagCount && linje.bilagCount > 0 && (
                                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 ml-1">
                                      {linje.bilagCount}
                                    </Badge>
                                  )}
                                </div>
                                {linje.måneder.map((val, i) => (
                                  <div
                                    key={i}
                                    className={cn(
                                      "text-right font-mono text-xs",
                                      val < 0 ? "text-rose-600" : "text-muted-foreground"
                                    )}
                                  >
                                    {val !== 0 ? formatNumber(val, true) : "-"}
                                  </div>
                                ))}
                                <div className="text-right font-mono text-xs font-medium">
                                  {getYearTotal(linje.måneder) !== 0 ? formatNumber(getYearTotal(linje.måneder)) : "-"}
                                </div>
                              </div>

                              {/* Expanded Bilag List */}
                              <AnimatePresence>
                                {expandedAccounts.has(linje.konto) && (
                                  <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: "auto", opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    transition={{ duration: 0.2 }}
                                    className="overflow-hidden"
                                  >
                                    <div className="ml-8 mb-2 bg-muted/30 rounded-lg p-3 border border-muted">
                                      {loadingAccounts.has(linje.konto) ? (
                                        <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                                          <RefreshCwIcon className="size-4 animate-spin" />
                                          Henter bilag...
                                        </div>
                                      ) : accountBilags[linje.konto]?.length ? (
                                        <div className="space-y-1">
                                          <div className="text-xs font-medium text-muted-foreground mb-2">
                                            Bilag på konto {linje.konto}:
                                          </div>
                                          {accountBilags[linje.konto].map((bilag) => {
                                            const hasValidId = bilag.id && bilag.id.length > 0 && bilag.id !== 'null' && bilag.id !== 'undefined';
                                            const content = (
                                              <div className="flex items-center justify-between py-1.5 px-2 rounded-md hover:bg-background transition-colors group">
                                                <div className="flex items-center gap-3">
                                                  <span className="font-mono text-xs text-[var(--primary)]">
                                                    {bilag.bilag_number}
                                                  </span>
                                                  <span className="text-xs text-muted-foreground">
                                                    {new Date(bilag.document_date).toLocaleDateString("nb-NO")}
                                                  </span>
                                                  <span className="text-xs truncate max-w-[200px]">
                                                    {bilag.description}
                                                  </span>
                                                  {bilag.counterparty_name && (
                                                    <span className="text-xs text-muted-foreground truncate max-w-[150px]">
                                                      — {bilag.counterparty_name}
                                                    </span>
                                                  )}
                                                </div>
                                                <div className="flex items-center gap-2">
                                                  <span className="font-mono text-xs font-medium">
                                                    kr {bilag.net_amount.toLocaleString("nb-NO", { maximumFractionDigits: 0 })}
                                                  </span>
                                                  <ChevronRightIcon className="size-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                                                </div>
                                              </div>
                                            );

                                            return hasValidId ? (
                                              <Link
                                                key={bilag.id}
                                                href={`/dashboard/bilag?id=${bilag.id}`}
                                                className="block"
                                              >
                                                {content}
                                              </Link>
                                            ) : (
                                              <div key={bilag.bilag_number || Math.random()}>
                                                {content}
                                              </div>
                                            );
                                          })}
                                        </div>
                                      ) : (
                                        <div className="text-sm text-muted-foreground py-2">
                                          Ingen bilag funnet
                                        </div>
                                      )}
                                    </div>
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </div>
                          ))}

                          {/* Subtotal Row - at bottom of category */}
                          <div className="grid grid-cols-[minmax(180px,1.8fr)_repeat(12,minmax(60px,1fr))_minmax(80px,1fr)] gap-1 px-2 py-2 bg-muted/50 items-center text-sm rounded-b-md">
                            <div className="pl-6 font-medium text-xs">
                              {gruppe.subtotal.navn}
                            </div>
                            {gruppe.subtotal.måneder.map((val, i) => (
                              <div key={i} className="text-right font-mono text-xs font-medium">
                                {val !== 0 ? formatNumber(val, true) : "-"}
                              </div>
                            ))}
                            <div className="text-right font-mono text-xs font-bold text-[var(--primary)]">
                              {formatNumber(getYearTotal(gruppe.subtotal.måneder))}
                            </div>
                          </div>
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  ))}

                  {/* Key Totals Section */}
                  <div className="bg-muted/30 border-t-2 border-[var(--primary)]/30">
                    {/* Driftsresultat */}
                    <div className="grid grid-cols-[minmax(180px,1.8fr)_repeat(12,minmax(60px,1fr))_minmax(80px,1fr)] gap-1 px-2 py-3 items-center">
                      <div className="font-bold text-sm pl-6">DRIFTSRESULTAT</div>
                      {Array(12).fill(0).map((_, i) => {
                        const val = calculateDriftsresultat(i);
                        return (
                          <div
                            key={i}
                            className={cn(
                              "text-right font-mono text-sm font-medium",
                              val < 0 ? "text-rose-600" : ""
                            )}
                          >
                            {val !== 0 ? formatNumber(val, true) : "-"}
                          </div>
                        );
                      })}
                      <div className={cn(
                        "text-right font-mono text-sm font-bold",
                        driftsresultatTotal < 0 ? "text-rose-600" : "text-[var(--primary)]"
                      )}>
                        {formatNumber(driftsresultatTotal)}
                      </div>
                    </div>

                    {/* Resultat før skatt */}
                    <div className="grid grid-cols-[minmax(180px,1.8fr)_repeat(12,minmax(60px,1fr))_minmax(80px,1fr)] gap-1 px-2 py-3 items-center border-t">
                      <div className="font-bold text-sm pl-6">RESULTAT FØR SKATT</div>
                      {Array(12).fill(0).map((_, i) => {
                        const val = calculateResultatForSkatt(i);
                        return (
                          <div
                            key={i}
                            className={cn(
                              "text-right font-mono text-sm",
                              val < 0 ? "text-rose-600" : "text-muted-foreground"
                            )}
                          >
                            {val !== 0 ? formatNumber(val, true) : "-"}
                          </div>
                        );
                      })}
                      <div className={cn(
                        "text-right font-mono text-sm font-bold",
                        resultatForSkattTotal < 0 ? "text-rose-600" : ""
                      )}>
                        {formatNumber(resultatForSkattTotal)}
                      </div>
                    </div>

                    {/* Skattekostnad */}
                    <div className="grid grid-cols-[minmax(180px,1.8fr)_repeat(12,minmax(60px,1fr))_minmax(80px,1fr)] gap-1 px-2 py-2 items-center text-sm text-muted-foreground">
                      <div className="pl-8">Skattekostnad (22%)</div>
                      {Array(12).fill(0).map((_, i) => (
                        <div key={i} className="text-right font-mono text-xs">-</div>
                      ))}
                      <div className="text-right font-mono text-xs">
                        {skattekostnadTotal !== 0 ? `-${formatNumber(skattekostnadTotal)}` : "-"}
                      </div>
                    </div>

                    {/* Årsresultat */}
                    <div className="grid grid-cols-[minmax(180px,1.8fr)_repeat(12,minmax(60px,1fr))_minmax(80px,1fr)] gap-1 px-2 py-4 items-center bg-[var(--primary)]/5 border-t-2 border-[var(--primary)]/30">
                      <div className="font-bold text-base pl-6">ÅRSRESULTAT</div>
                      {Array(12).fill(0).map((_, i) => (
                        <div key={i} className="text-right font-mono text-xs text-muted-foreground">-</div>
                      ))}
                      <div className={cn(
                        "text-right font-mono text-lg font-bold",
                        arsresultatTotal < 0 ? "text-rose-600" : "text-emerald-600"
                      )}>
                        {formatNumber(arsresultatTotal)}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <LearnMoreDocs sections={["rapporter", "bokforing"]} />
    </div>
  );
}
