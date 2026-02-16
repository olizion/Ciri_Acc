"use client";

import { useState, useCallback, useRef, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { format } from "date-fns";
import { nb } from "date-fns/locale";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  TrendingUpIcon,
  TrendingDownIcon,
  DownloadIcon,
  FileSpreadsheetIcon,
  FileTextIcon,
  ArrowUpIcon,
  RefreshCwIcon,
  DatabaseIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { API_BASE_URL, COMPANY_ID } from "@/lib/api";
import { useCrystallize } from "@/lib/use-crystallize";
import {
  ResultatMetricCard,
  CiriInsightsCard,
  ResultatTableSkeleton,
  ResultatGruppe,
  ResultatTotalRow,
} from "./components";
import {
  ResultatGruppe as ResultatGruppeType,
  BilagDetail,
  AccountBilagResponse,
  ApiResultatResponse,
  CiriInsight,
} from "./types";
import { månedNavn, years, DEFAULT_EXPANDED_GROUPS } from "./constants";
import { formatNumber, getYearTotal } from "./utils";

export default function ResultatregnskapPage() {
  const [selectedYear, setSelectedYear] = useState("2026");
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(DEFAULT_EXPANDED_GROUPS));
  const [expandedAccounts, setExpandedAccounts] = useState<Set<string>>(new Set());
  const [accountBilags, setAccountBilags] = useState<Record<string, BilagDetail[]>>({});
  const [loadingAccounts, setLoadingAccounts] = useState<Set<string>>(new Set());
  const tableRef = useRef<HTMLDivElement>(null);

  const { data: apiData = null, isLoading: apiLoading, isFetching, refetch } = useQuery({
    queryKey: queryKeys.reports.resultat({ year: selectedYear, companyId: COMPANY_ID }),
    queryFn: async () => {
      const response = await fetch(
        `${API_BASE_URL}/api/reports/bilag/resultat?company_id=${COMPANY_ID}&year=${selectedYear}`
      );
      if (!response.ok) return null;
      return response.json() as Promise<ApiResultatResponse>;
    },
  });

  const crystallize = useCrystallize(apiLoading);
  const isRefreshing = isFetching;

  const toggleAccountExpansion = useCallback(async (accountCode: string) => {
    setExpandedAccounts(prev => {
      const newSet = new Set(prev);
      if (newSet.has(accountCode)) {
        newSet.delete(accountCode);
      } else {
        newSet.add(accountCode);
        if (!accountBilags[accountCode] && !loadingAccounts.has(accountCode)) {
          fetchAccountBilags(accountCode);
        }
      }
      return newSet;
    });
  }, [accountBilags, loadingAccounts]);

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


  const resultatData: ResultatGruppeType[] = useMemo(() => {
    // Split API accounts into income (3xxx), expense (4xxx-7xxx), finans (8xxx)
    const incomeAccounts = apiData?.accounts.filter(a => a.account_code >= "3000" && a.account_code < "4000") || [];
    const expenseAccounts = apiData?.accounts.filter(a => a.account_code >= "4000" && a.account_code < "8000") || [];
    const finansAccounts = apiData?.accounts.filter(a => a.account_code >= "8000" && a.account_code < "9000") || [];

    // Helper to build lines + subtotal from account array
    const buildLines = (accounts: typeof incomeAccounts) => {
      const linjer = accounts.map(acc => ({
        konto: acc.account_code,
        navn: acc.account_name,
        måneder: acc.monthly_amounts,
        bilagCount: acc.bilag_count,
      }));
      const subtotal: number[] = Array(12).fill(0);
      linjer.forEach(l => l.måneder.forEach((val, i) => { subtotal[i] += val; }));
      const totalBilag = accounts.reduce((sum, a) => sum + a.bilag_count, 0);
      return { linjer, subtotal, totalBilag };
    };

    const income = buildLines(incomeAccounts);
    const expenses = buildLines(expenseAccounts);

    // Finansposter: income entries (8050, 8079) are positive, cost entries (8150, 8179) are negative
    const finansIncome = finansAccounts.filter(a => a.account_code < "8100");
    const finansCost = finansAccounts.filter(a => a.account_code >= "8100");
    const finansLinjer = [
      ...finansIncome.map(acc => ({
        konto: acc.account_code,
        navn: acc.account_name,
        måneder: acc.monthly_amounts,
        bilagCount: acc.bilag_count,
      })),
      ...finansCost.map(acc => ({
        konto: acc.account_code,
        navn: acc.account_name,
        måneder: acc.monthly_amounts.map(v => -v),
        bilagCount: acc.bilag_count,
      })),
    ];
    const finansSubtotal: number[] = Array(12).fill(0);
    finansLinjer.forEach(l => l.måneder.forEach((val, i) => { finansSubtotal[i] += val; }));
    const finansBilag = finansAccounts.reduce((sum, a) => sum + a.bilag_count, 0);

    return [
      {
        id: "driftsinntekter",
        navn: "Driftsinntekter",
        linjer: income.linjer.length > 0 ? income.linjer : [
          { konto: "3000", navn: "Salgsinntekt (ikke registrert)", måneder: Array(12).fill(0) },
        ],
        subtotal: {
          konto: "",
          navn: "Sum driftsinntekter",
          måneder: income.subtotal,
          bilagCount: income.totalBilag || undefined,
          isSubtotal: true,
        },
      },
      {
        id: "driftskostnader",
        navn: "Driftskostnader",
        linjer: expenses.linjer.length > 0 ? expenses.linjer : [
          { konto: "-", navn: "Ingen kostnader registrert", måneder: Array(12).fill(0) },
        ],
        subtotal: {
          konto: "",
          navn: "Sum driftskostnader",
          måneder: expenses.subtotal,
          bilagCount: expenses.totalBilag || undefined,
          isSubtotal: true,
        },
      },
      {
        id: "finansposter",
        navn: "Finansposter",
        linjer: finansLinjer.length > 0 ? finansLinjer : [
          { konto: "8050", navn: "Renteinntekter (ikke registrert)", måneder: Array(12).fill(0) },
          { konto: "8150", navn: "Rentekostnader (ikke registrert)", måneder: Array(12).fill(0) },
        ],
        subtotal: {
          konto: "",
          navn: "Netto finansposter",
          måneder: finansSubtotal,
          bilagCount: finansBilag || undefined,
          isSubtotal: true,
        },
      },
    ];
  }, [apiData]);

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

  const ciriInnsikter = useMemo((): CiriInsight[] => {
    if (!apiData || apiData.accounts.length === 0) {
      return [
        {
          type: "info",
          message: "Ingen bilag registrert for dette året ennå",
        },
      ];
    }

    const insights: CiriInsight[] = [];

    const categories = Object.entries(apiData.by_category).sort(([, a], [, b]) => b - a);
    if (categories.length > 0) {
      insights.push({
        type: "info",
        message: `Største kostnadskategori: ${categories[0][0]} (kr ${categories[0][1].toLocaleString("nb-NO", { maximumFractionDigits: 0 })})`,
      });
    }

    const totalBilag = apiData.accounts.reduce((sum, a) => sum + a.bilag_count, 0);
    insights.push({
      type: "positive",
      message: `${totalBilag} bilag registrert med totalt kr ${apiData.total_gross.toLocaleString("nb-NO", { maximumFractionDigits: 0 })} i kostnader`,
    });

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

  const handleRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

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
    <div className="mx-auto max-w-[1200px] space-y-6 pb-12">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight">Resultatregnskap</h1>
          <p className="text-muted-foreground">
            Månedlig oversikt for {selectedYear}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
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

      <div className={`grid gap-4 sm:grid-cols-2 lg:grid-cols-4 ${crystallize(1)}`}>
        <ResultatMetricCard
          title="Driftskostnader"
          value={driftskostnaderTotal}
          subtitle={`${apiData?.accounts.reduce((sum, a) => sum + a.bilag_count, 0) || 0} bilag`}
          icon={TrendingDownIcon}
          iconColor="text-rose-600"
          iconBgColor="bg-rose-100 dark:bg-rose-900/30"
          valueColor="text-rose-600"
          isLoading={apiLoading}
        />

        <ResultatMetricCard
          title="Driftsresultat"
          value={driftsresultatTotal}
          subtitle={driftsresultatTotal < 0 ? "Underskudd fra drift" : "Resultat fra drift"}
          icon={driftsresultatTotal < 0 ? TrendingDownIcon : TrendingUpIcon}
          iconColor={driftsresultatTotal < 0 ? "text-rose-600" : "text-blue-600"}
          iconBgColor={driftsresultatTotal < 0 ? "bg-rose-100 dark:bg-rose-900/30" : "bg-blue-100 dark:bg-blue-900/30"}
          valueColor={driftsresultatTotal < 0 ? "text-rose-600" : ""}
          isLoading={apiLoading}
        />

        <ResultatMetricCard
          title="MVA til gode"
          value={apiData?.total_mva || 0}
          subtitle="Fradragsberettiget"
          icon={ArrowUpIcon}
          iconColor="text-emerald-600"
          iconBgColor="bg-emerald-100 dark:bg-emerald-900/30"
          valueColor="text-emerald-600"
          isLoading={apiLoading}
        />

        <ResultatMetricCard
          title="Registrerte bilag"
          value={apiData?.accounts.reduce((sum, a) => sum + a.bilag_count, 0) || 0}
          subtitle={`${apiData?.accounts.length || 0} kontoer`}
          icon={DatabaseIcon}
          iconColor="text-[var(--primary)]"
          iconBgColor="bg-[var(--primary)]/10"
          isLoading={apiLoading}
        />
      </div>

      <div className={crystallize(2)}>
        <CiriInsightsCard insights={ciriInnsikter} />
      </div>

      <Card className={crystallize(3)}>
        <CardHeader className="pb-0">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Månedlig oppstilling</CardTitle>
            <Badge variant="outline">
              {selectedYear}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="overflow-x-auto" ref={tableRef}>
            <div className="w-full">
              <div className="grid grid-cols-[minmax(180px,1.8fr)_repeat(12,minmax(60px,1fr))_minmax(80px,1fr)] gap-1 px-2 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider border-b bg-muted/30 rounded-t-lg sticky top-0">
                <div>Konto</div>
                {månedNavn.map(m => (
                  <div key={m} className="text-right">{m}</div>
                ))}
                <div className="text-right font-semibold">Totalt</div>
              </div>

              {apiLoading ? (
                <ResultatTableSkeleton />
              ) : (
                <div className="divide-y">
                  {resultatData.map((gruppe) => (
                    <ResultatGruppe
                      key={gruppe.id}
                      gruppe={gruppe}
                      isExpanded={expandedGroups.has(gruppe.id)}
                      onToggle={() => toggleGroup(gruppe.id)}
                      expandedAccounts={expandedAccounts}
                      accountBilags={accountBilags}
                      loadingAccounts={loadingAccounts}
                      onToggleAccount={toggleAccountExpansion}
                    />
                  ))}

                  <div className="bg-muted/30 border-t-2 border-[var(--primary)]/30">
                    <ResultatTotalRow
                      label="DRIFTSRESULTAT"
                      values={Array(12).fill(0).map((_, i) => calculateDriftsresultat(i))}
                      total={driftsresultatTotal}
                    />

                    <ResultatTotalRow
                      label="RESULTAT FØR SKATT"
                      values={Array(12).fill(0).map((_, i) => calculateResultatForSkatt(i))}
                      total={resultatForSkattTotal}
                    />

                    <div className="grid grid-cols-[minmax(180px,1.8fr)_repeat(12,minmax(60px,1fr))_minmax(80px,1fr)] gap-1 px-2 py-2 items-center text-sm text-muted-foreground">
                      <div className="pl-8">Skattekostnad (22%)</div>
                      {Array(12).fill(0).map((_, i) => (
                        <div key={i} className="text-right font-mono text-xs">-</div>
                      ))}
                      <div className="text-right font-mono text-xs">
                        {skattekostnadTotal !== 0 ? `-${formatNumber(skattekostnadTotal)}` : "-"}
                      </div>
                    </div>

                    <ResultatTotalRow
                      label="ÅRSRESULTAT"
                      values={Array(12).fill(0)}
                      total={arsresultatTotal}
                      isFinal
                    />
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
