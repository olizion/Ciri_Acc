"use client";

import { useState, useMemo, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { format } from "date-fns";
import { nb } from "date-fns/locale";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  ScaleIcon,
  DownloadIcon,
  FileSpreadsheetIcon,
  FileTextIcon,
  CalendarIcon,
  RefreshCwIcon,
  WalletIcon,
  BuildingIcon,
  PiggyBankIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { API_BASE_URL, COMPANY_ID } from "@/lib/api";
import { useCiriActionListener } from "@/lib/ciri-actions";
import { useCrystallize } from "@/lib/use-crystallize";
import { toast } from "sonner";
import {
  BalanseMetricCard,
  CiriInsightsCard,
  BalanceCheckAlert,
  BalanseGruppe,
  BalanseTableSkeleton,
} from "./components";
import { BalanseGruppe as BalanseGruppeType, BilagBalanseData, CiriInsight } from "./types";
import { DEFAULT_EXPANDED_CATEGORIES } from "./constants";
import { formatNumber } from "./utils";

export default function BalansePage() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [expandedKategorier, setExpandedKategorier] = useState<Set<string>>(
    new Set(DEFAULT_EXPANDED_CATEGORIES)
  );
  useCiriActionListener("utvid-alle-balanse", useCallback(() => {
    setExpandedKategorier(new Set(DEFAULT_EXPANDED_CATEGORIES));
  }, []));

  const asOfDate = selectedDate.toISOString().split('T')[0];

  const { data: bilagBalanse = null, isLoading: apiLoading, isFetching, refetch } = useQuery({
    queryKey: queryKeys.reports.balanse({ asOfDate, companyId: COMPANY_ID }),
    queryFn: async () => {
      const response = await fetch(
        `${API_BASE_URL}/api/reports/bilag/balanse?company_id=${COMPANY_ID}&as_of_date=${asOfDate}`
      );
      if (!response.ok) {
        throw new Error("Kunne ikke hente balansedata");
      }
      return response.json() as Promise<BilagBalanseData>;
    },
    meta: { errorMessage: "Kunne ikke hente balansedata. Prøv igjen senere." },
  });

  const isRefreshing = isFetching;
  const crystallize = useCrystallize(apiLoading);

  const { eiendelerData, egenkapitalGjeldData } = useMemo(() => {
    const leverandorgjeldCount = bilagBalanse?.leverandorgjeld_count || 0;

    // Build lookup map from account_balances
    const balanceMap: Record<string, number> = {};
    if (bilagBalanse?.account_balances) {
      for (const ab of bilagBalanse.account_balances) {
        balanceMap[ab.account_code] = ab.balance;
      }
    }
    const bal = (konto: string) => balanceMap[konto] || 0;

    // Helper to build a category with auto-calculated subtotal
    const buildKategori = (
      id: string,
      navn: string,
      kontoer: { konto: string; navn: string }[],
      subtotalNavn: string,
    ) => {
      const linjer = kontoer.map(k => ({
        konto: k.konto,
        navn: k.navn,
        belop: bal(k.konto),
        fjoråret: 0,
        bilagCount: k.konto === "2400" ? leverandorgjeldCount : undefined,
      }));
      const subtotalBelop = linjer.reduce((sum, l) => sum + l.belop, 0);
      return {
        id,
        navn,
        linjer,
        subtotal: {
          konto: "",
          navn: subtotalNavn,
          belop: subtotalBelop,
          fjoråret: 0,
          isSubtotal: true as const,
          bilagCount: id === "kortsiktig-gjeld" ? leverandorgjeldCount : undefined,
        },
      };
    };

    // --- EIENDELER (NS 4102 classes 10-19) ---

    const immatrielleEiendeler = buildKategori("immatrielle-eiendeler", "Immatrielle eiendeler", [
      { konto: "1000", navn: "Forskning og utvikling" },
      { konto: "1050", navn: "Konsesjoner, patenter" },
    ], "Sum immatrielle eiendeler");

    const varigeDriftsmidler = buildKategori("varige-driftsmidler", "Varige driftsmidler", [
      { konto: "1100", navn: "Bygninger" },
      { konto: "1151", navn: "Tomter" },
      { konto: "1200", navn: "Maskiner og anlegg" },
      { konto: "1233", navn: "Varebiler" },
      { konto: "1236", navn: "Lastebiler" },
      { konto: "1250", navn: "Inventar og utstyr" },
      { konto: "1280", navn: "Kontormaskiner" },
    ], "Sum varige driftsmidler");

    const finansielleAnleggsmidler = buildKategori("finansielle-anleggsmidler", "Finansielle anleggsmidler", [
      { konto: "1350", navn: "Investeringer i aksjer" },
      { konto: "1397", navn: "Forskudd leasing" },
    ], "Sum finansielle anleggsmidler");

    const varelager = buildKategori("varelager", "Varelager", [
      { konto: "1400", navn: "Råvarer og halvfabrikata" },
      { konto: "1420", navn: "Varer under tilvirkning" },
      { konto: "1440", navn: "Ferdig egentilvirkede varer" },
      { konto: "1460", navn: "Innkjøpte varer for videresalg" },
    ], "Sum varelager");

    const kortsiktigeFordringer = buildKategori("kortsiktige-fordringer", "Kortsiktige fordringer", [
      { konto: "1500", navn: "Kundefordringer" },
      { konto: "1580", navn: "Avsetning tap på kundefordringer" },
      { konto: "1700", navn: "Forskuddsbetalt leie" },
    ], "Sum kortsiktige fordringer");

    const bankinnskudd = buildKategori("bankinnskudd", "Bankinnskudd, kontanter", [
      { konto: "1810", navn: "Aksjer, børsnoterte" },
      { konto: "1900", navn: "Kontanter" },
      { konto: "1920", navn: "Bankinnskudd" },
      { konto: "1950", navn: "Bankinnskudd for skattetrekk" },
    ], "Sum bankinnskudd og kontanter");

    const sumEiendeler = immatrielleEiendeler.subtotal.belop
      + varigeDriftsmidler.subtotal.belop
      + finansielleAnleggsmidler.subtotal.belop
      + varelager.subtotal.belop
      + kortsiktigeFordringer.subtotal.belop
      + bankinnskudd.subtotal.belop;

    const eiendeler: BalanseGruppeType = {
      id: "eiendeler",
      navn: "EIENDELER",
      kategorier: [
        immatrielleEiendeler,
        varigeDriftsmidler,
        finansielleAnleggsmidler,
        varelager,
        kortsiktigeFordringer,
        bankinnskudd,
      ],
      total: { konto: "", navn: "SUM EIENDELER", belop: sumEiendeler, fjoråret: 0, isTotal: true },
    };

    // --- EGENKAPITAL OG GJELD (NS 4102 classes 20-29) ---

    const egenkapital = buildKategori("egenkapital", "Egenkapital", [
      { konto: "2000", navn: "Aksjekapital" },
      { konto: "2050", navn: "Annen egenkapital" },
      { konto: "2060", navn: "Privatkonto" },
      { konto: "2080", navn: "Udekket tap" },
    ], "Sum egenkapital");

    const langsiktigGjeld = buildKategori("langsiktig-gjeld", "Langsiktig gjeld", [
      { konto: "2240", navn: "Pantelån" },
      { konto: "2250", navn: "Gjeld til kredittinstitusjoner" },
      { konto: "2380", navn: "Kassakreditt" },
    ], "Sum langsiktig gjeld");

    const leverandorgjeld = buildKategori("leverandorgjeld", "Leverandørgjeld", [
      { konto: "2400", navn: "Leverandørgjeld" },
    ], "Sum leverandørgjeld");

    const skyldOffentlig = buildKategori("skyld-offentlig", "Skyldige offentlige avgifter", [
      { konto: "2600", navn: "Forskuddstrekk" },
      { konto: "2700", navn: "Skyldig MVA" },
      { konto: "2740", navn: "Oppgjørskonto merverdiavgift" },
      { konto: "2770", navn: "Arbeidsgiveravgift skyldig" },
    ], "Sum skyldige offentlige avgifter");

    const annenKortsiktigGjeld = buildKategori("annen-kortsiktig-gjeld", "Annen kortsiktig gjeld", [
      { konto: "2930", navn: "Skyldig lønn" },
      { konto: "2940", navn: "Skyldige feriepenger" },
      { konto: "2950", navn: "Påløpt renter" },
      { konto: "2900", navn: "Annen kortsiktig gjeld" },
    ], "Sum annen kortsiktig gjeld");

    const sumEKGjeld = egenkapital.subtotal.belop
      + langsiktigGjeld.subtotal.belop
      + leverandorgjeld.subtotal.belop
      + skyldOffentlig.subtotal.belop
      + annenKortsiktigGjeld.subtotal.belop;

    const egenkapitalGjeld: BalanseGruppeType = {
      id: "egenkapital-gjeld",
      navn: "EGENKAPITAL OG GJELD",
      kategorier: [egenkapital, langsiktigGjeld, leverandorgjeld, skyldOffentlig, annenKortsiktigGjeld],
      total: { konto: "", navn: "SUM EGENKAPITAL OG GJELD", belop: sumEKGjeld, fjoråret: 0, isTotal: true },
    };

    return { eiendelerData: eiendeler, egenkapitalGjeldData: egenkapitalGjeld };
  }, [bilagBalanse]);

  const sumEiendeler = eiendelerData.total.belop;
  const sumEgenkapitalGjeld = egenkapitalGjeldData.total.belop;
  const isBalanced = sumEiendeler === sumEgenkapitalGjeld;
  const leverandorgjeld = bilagBalanse?.leverandorgjeld || 0;

  const ciriInnsikter = useMemo((): CiriInsight[] => {
    const insights: CiriInsight[] = [];

    if (!bilagBalanse) {
      insights.push({
        type: "info",
        message: "Laster balansedata...",
      });
      return insights;
    }

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

  const handleRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

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

  return (
    <div className="mx-auto max-w-[1200px] space-y-6 pb-12">
      <div className={`flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between ${crystallize(1)}`}>
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight">Balanse</h1>
          <p className="text-muted-foreground">
            Eiendeler, egenkapital og gjeld per {format(selectedDate, "d. MMMM yyyy", { locale: nb })}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
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

      <div className={`grid gap-4 sm:grid-cols-2 lg:grid-cols-4 ${crystallize(2)}`}>
        <BalanseMetricCard
          title="Leverandørgjeld"
          value={leverandorgjeld}
          subtitle={`${bilagBalanse?.leverandorgjeld_count || 0} ubetalte fakturaer`}
          icon={WalletIcon}
          iconColor={leverandorgjeld > 0 ? "text-amber-600" : "text-emerald-600"}
          iconBgColor={leverandorgjeld > 0 ? "bg-amber-100 dark:bg-amber-900/30" : "bg-emerald-100 dark:bg-emerald-900/30"}
          valueColor={leverandorgjeld > 0 ? "text-amber-600" : "text-emerald-600"}
          isLoading={apiLoading}
        />

        <BalanseMetricCard
          title="Bokførte kostnader"
          value={bilagBalanse?.posted_total || 0}
          subtitle={`${bilagBalanse?.posted_count || 0} bilag bokført`}
          icon={BuildingIcon}
          iconColor="text-blue-600"
          iconBgColor="bg-blue-100 dark:bg-blue-900/30"
          isLoading={apiLoading}
        />

        <BalanseMetricCard
          title="Sum eiendeler"
          value={sumEiendeler}
          subtitle="Ingen registrert ennå"
          icon={PiggyBankIcon}
          iconColor="text-sky-600"
          iconBgColor="bg-sky-100 dark:bg-sky-900/30"
          isLoading={apiLoading}
        />

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-sm">Balansestatus</p>
                {apiLoading ? (
                  <div className="h-8 w-20 mt-1">
                    <div className="h-full w-full bg-muted animate-pulse rounded" />
                  </div>
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

      <div className={crystallize(3)}><CiriInsightsCard insights={ciriInnsikter} /></div>

      <Card className={crystallize(4)}>
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
          <div className="grid grid-cols-[24px_1fr_120px] gap-2 px-4 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider border-b bg-muted/30 rounded-t-lg mb-4">
            <div></div>
            <div>Beskrivelse</div>
            <div className="text-right">Beløp</div>
          </div>

          {apiLoading ? (
            <BalanseTableSkeleton />
          ) : (
            <div className="grid lg:grid-cols-2 gap-8 items-stretch">
              <BalanseGruppe
                gruppe={eiendelerData}
                expandedKategorier={expandedKategorier}
                onToggleKategori={toggleKategori}
                asOfDate={asOfDate}
              />

              <BalanseGruppe
                gruppe={egenkapitalGjeldData}
                expandedKategorier={expandedKategorier}
                onToggleKategori={toggleKategori}
                asOfDate={asOfDate}
                isRight
              />
            </div>
          )}

          {!apiLoading && (
            <BalanceCheckAlert
              leverandorgjeld={leverandorgjeld}
              leverandorgjeldCount={bilagBalanse?.leverandorgjeld_count || 0}
            />
          )}
        </CardContent>
      </Card>

      <LearnMoreDocs sections={["rapporter", "bokforing"]} />
    </div>
  );
}
