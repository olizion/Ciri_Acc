"use client";

import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { invalidateOnEvent } from "@/lib/query-invalidation";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import {
  FileTextIcon,
  SearchIcon,
  UploadIcon,
  CheckCircle2Icon,
  AlertCircleIcon,
  SparklesIcon,
  ShieldCheckIcon,
  LinkIcon,
  ChevronRightIcon,
  Loader2Icon,
  AlertTriangleIcon,
  CalendarRangeIcon,
} from "lucide-react";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  PaginationEllipsis,
} from "@/components/ui/pagination";
import { cn } from "@/lib/utils";
import { API_BASE_URL, COMPANY_ID } from "@/lib/api";
import CiriLogo from "@/components/layout/ciri-logo";
import LearnMoreDocs from "@/components/learn-more-docs";
import { useCiriActionListener } from "@/lib/ciri-actions";
import { useCrystallize } from "@/lib/use-crystallize";
import { toast } from "sonner";

import type { Bilag, BilagStatus } from "./types";
import { statusConfig, bilagTypeConfig, mvaCodes } from "./data/constants";
import {
  CompanyLogo,
  BilagDetailDialog,
  ManualPostDialog,
  UploadBilagDialog,
  EditBilagDialog,
} from "./components";
import { PeriodiseringDialog } from "./components/periodisering-dialog";

// Transform API response to frontend Bilag format
function transformApiBilag(apiItem: any): Bilag {
  const mvaKode = apiItem.mva_code || "0";
  const mvaInfo = mvaCodes.find(k => k.code === mvaKode) || mvaCodes[0];

  // Build file URL from API
  const fileUrl = apiItem.file_url
    ? `${API_BASE_URL}${apiItem.file_url}`
    : undefined;

  // Handle currency conversion display
  const hasConversion = apiItem.original_currency && apiItem.original_currency !== "NOK";

  return {
    id: apiItem.id,
    bilagsnummer: apiItem.bilag_number,
    bilagstype: "inngaende_faktura",
    bilagsdato: apiItem.document_date,
    registreringsdato: apiItem.created_at?.split("T")[0] || apiItem.document_date,
    forfallsdato: undefined,
    leverandor: apiItem.counterparty_name || "Ukjent leverandør",
    leverandorOrgnr: apiItem.counterparty_org_number,
    leverandorAdresse: undefined,
    leverandorDomain: undefined, // Will be resolved by CompanyLogo component
    beskrivelse: apiItem.description,
    belopEksMva: parseFloat(apiItem.net_amount) || 0,
    mvaGrunnlag: parseFloat(apiItem.net_amount) || 0,
    mvaBelop: parseFloat(apiItem.mva_amount) || 0,
    mvaSats: mvaInfo.rate,
    mvaKode: mvaKode,
    totalBelop: parseFloat(apiItem.gross_amount) || 0,
    valuta: "NOK",
    // Foreign currency info
    originalCurrency: apiItem.original_currency,
    originalAmount: apiItem.original_amount ? parseFloat(apiItem.original_amount) : undefined,
    exchangeRate: apiItem.exchange_rate ? parseFloat(apiItem.exchange_rate) : undefined,
    exchangeRateDate: apiItem.exchange_rate_date,
    vatTreatment: hasConversion ? {
      hasVAT: false,
      vatCode: mvaKode,
      vatCodeDescription: mvaInfo.name,
      explanation: `Konvertert fra ${apiItem.original_currency} ${apiItem.original_amount} med kurs ${parseFloat(apiItem.exchange_rate)?.toFixed(4) || apiItem.exchange_rate}`
    } : undefined,
    kontonummer: apiItem.suggested_account || "6540",
    kontonavn: apiItem.category || "Diverse",
    koststed: undefined,
    prosjekt: undefined,
    status: apiItem.status === "pending" ? "venter"
          : apiItem.status === "posted" ? "bokfort"
          : apiItem.status === "awaiting_transaction" ? "venter_transaksjon"
          : "trenger_gjennomgang",
    ciriKonfidans: apiItem.ciri_confidence ? Math.round(apiItem.ciri_confidence * 100) : undefined,
    posteringsreferanse: undefined,
    oppbevaringsfrist: `${new Date().getFullYear() + 5}-12-31`,
    arkivertDato: undefined,
    originalFilnavn: apiItem.original_filename,
    originalFiltype: "application/pdf",
    originalFilUrl: fileUrl,
    opprettetAv: "Ciri AI",
    endretAv: undefined,
    endretDato: undefined,
    revisjonslogg: [
      {
        timestamp: apiItem.created_at || new Date().toISOString(),
        handling: "Automatisk opprettet fra e-post",
        bruker: "Ciri AI",
        detaljer: "Faktura ekstrahert og analysert med AI"
      }
    ],
    missingFields: undefined,
    ciriMessage: undefined,
    summary: apiItem.description,
    ciriExplanation: apiItem.ciri_reasoning,
    periodiseringSuggestion: apiItem.periodisering_suggestion ?? undefined,
  };
}

export default function BilagPage() {
  const searchParams = useSearchParams();
  const urlBilagId = searchParams.get("id");

  const queryClient = useQueryClient();

  const {
    data: bilagData = [] as Bilag[],
    isLoading,
    error: queryError,
  } = useQuery<Bilag[]>({
    queryKey: queryKeys.bilag.list(),
    queryFn: async () => {
      const response = await fetch(
        `${API_BASE_URL}/api/bilag?company_id=${COMPANY_ID}&per_page=100`
      );
      if (!response.ok) {
        throw new Error(`Failed to fetch bilags: ${response.statusText}`);
      }
      const data = await response.json();
      return data.items.map(transformApiBilag);
    },
    staleTime: 30_000,
  });

  const crystallize = useCrystallize(isLoading);

  const apiError = queryError instanceof Error ? queryError.message : queryError ? "Kunne ikke hente bilag" : null;

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [selectedBilag, setSelectedBilag] = useState<Bilag | null>(null);
  const [urlDialogDismissed, setUrlDialogDismissed] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "list">("list");
  const [currentPage, setCurrentPage] = useState(1);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingBilag, setEditingBilag] = useState<Bilag | null>(null);
  const [manualPostBilag, setManualPostBilag] = useState<Bilag | null>(null);
  const [periodiseringBilag, setPeriodiseringBilag] = useState<Bilag | null>(null);

  // Derive URL-targeted bilag synchronously (no useEffect delay → no jitter)
  const urlBilag = useMemo(() => {
    if (!urlBilagId || bilagData.length === 0) return null;
    return bilagData.find(b => b.id === urlBilagId) ?? null;
  }, [urlBilagId, bilagData]);

  // Reset dismissed state when URL changes to a new ID
  useEffect(() => { setUrlDialogDismissed(false); }, [urlBilagId]);

  // Effective dialog bilag: manual selection wins, else URL-derived (unless dismissed)
  const dialogBilag = selectedBilag ?? (urlDialogDismissed ? null : urlBilag);

  // Ciri bubble action listeners
  const searchInputRef = useRef<HTMLInputElement>(null);
  useCiriActionListener("sok-bilag", useCallback(() => {
    searchInputRef.current?.focus();
  }, []));
  useCiriActionListener("vis-manglende-bilag", useCallback(() => {
    setStatusFilter("trenger_gjennomgang");
  }, []));
  useCiriActionListener("last-opp-bilag", useCallback(() => {
    setShowUploadDialog(true);
  }, []));

  const BILAG_PER_PAGE = 20;

  const filteredBilag = useMemo(() => {
    return bilagData.filter((bilag) => {
      const matchesSearch =
        bilag.leverandor.toLowerCase().includes(searchQuery.toLowerCase()) ||
        bilag.bilagsnummer.includes(searchQuery) ||
        bilag.beskrivelse.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === "all" || bilag.status === statusFilter;
      const matchesType = typeFilter === "all" || bilag.bilagstype === typeFilter;
      return matchesSearch && matchesStatus && matchesType;
    });
  }, [bilagData, searchQuery, statusFilter, typeFilter]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, typeFilter]);

  // Pagination
  const totalPages = Math.ceil(filteredBilag.length / BILAG_PER_PAGE);
  const paginatedBilag = filteredBilag.slice(
    (currentPage - 1) * BILAG_PER_PAGE,
    currentPage * BILAG_PER_PAGE
  );
  const showingFrom = filteredBilag.length > 0 ? (currentPage - 1) * BILAG_PER_PAGE + 1 : 0;
  const showingTo = Math.min(currentPage * BILAG_PER_PAGE, filteredBilag.length);

  const stats = useMemo(() => ({
    total: bilagData.length,
    bokfort: bilagData.filter((b) => b.status === "bokfort").length,
    venter: bilagData.filter((b) => b.status === "venter").length,
    venterTransaksjon: bilagData.filter((b) => b.status === "venter_transaksjon").length,
    trengerGjennomgang: bilagData.filter((b) => b.status === "trenger_gjennomgang").length,
    totalBelop: bilagData.reduce((sum, b) => sum + b.totalBelop, 0),
    totalMva: bilagData.reduce((sum, b) => sum + b.mvaBelop, 0)
  }), [bilagData]);

  // Handle completing a bilag that needs review
  const handleCompleteBilag = useCallback((bilag: Bilag) => {
    setEditingBilag(bilag);
    setShowEditDialog(true);
    setSelectedBilag(null);
    setUrlDialogDismissed(true);
  }, []);

  // Handle approving a waiting bilag
  const handleApproveBilag = useCallback((bilag: Bilag) => {
    queryClient.setQueryData<Bilag[]>(queryKeys.bilag.list(), (prev) =>
      (prev ?? []).map(b => {
        if (b.id === bilag.id) {
          return {
            ...b,
            status: "bokfort" as BilagStatus,
            posteringsreferanse: `GL-2025-${1900 + parseInt(b.id)}`,
            revisjonslogg: [
              ...b.revisjonslogg,
              {
                timestamp: new Date().toISOString(),
                handling: "Godkjent og bokført",
                bruker: "Bruker",
                detaljer: "Manuelt godkjent"
              }
            ]
          };
        }
        return b;
      })
    );
    invalidateOnEvent(queryClient, "bilag:approved");
    setSelectedBilag(null);
    setUrlDialogDismissed(true);
  }, [queryClient]);

  // Handle saving edited bilag
  const handleSaveEdit = useCallback((updatedBilag: Bilag) => {
    queryClient.setQueryData<Bilag[]>(queryKeys.bilag.list(), (prev) =>
      (prev ?? []).map(b => {
        if (b.id === updatedBilag.id) {
          return {
            ...updatedBilag,
            status: "bokfort" as BilagStatus,
            missingFields: undefined,
            ciriMessage: undefined,
            posteringsreferanse: `GL-2025-${1900 + parseInt(updatedBilag.id)}`,
            revisjonslogg: [
              ...updatedBilag.revisjonslogg,
              {
                timestamp: new Date().toISOString(),
                handling: "Fullført manuelt og bokført",
                bruker: "Bruker",
                detaljer: `Konto ${updatedBilag.kontonummer}, MVA-kode ${updatedBilag.mvaKode}`
              }
            ]
          };
        }
        return b;
      })
    );
    invalidateOnEvent(queryClient, "bilag:posted");
    setShowEditDialog(false);
    setEditingBilag(null);
  }, [queryClient]);

  // Handle bilag uploaded — refetch from DB
  const handleBilagUploaded = useCallback(() => {
    invalidateOnEvent(queryClient, "bilag:posted");
    setShowUploadDialog(false);
  }, [queryClient]);

  return (
    <div className="space-y-6">
      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-8">
          <Loader2Icon className="size-8 animate-spin text-[var(--primary)]" />
          <span className="ml-2 text-muted-foreground">Henter bilag...</span>
        </div>
      )}

      {/* API Error Banner */}
      {apiError && (
        <div className="flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950">
          <AlertTriangleIcon className="size-5 text-amber-600" />
          <div>
            <p className="font-medium text-amber-800 dark:text-amber-200">Kunne ikke hente bilag fra server</p>
            <p className="text-sm text-amber-600 dark:text-amber-400">{apiError}. Viser demo-data.</p>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight">Bilagsarkiv</h1>
          <p className="text-muted-foreground">
            Alle bilag lagres i 5 år iht. Bokføringsloven
          </p>
        </div>
        <Button onClick={() => setShowUploadDialog(true)}>
          <UploadIcon className="mr-2 size-4" />
          Last opp bilag
        </Button>
      </div>

      {/* Stats Overview */}
      <div className={`grid grid-cols-2 gap-4 lg:grid-cols-4 ${crystallize(1)}`}>
        <Card className="cursor-pointer transition-all hover:border-[var(--primary)]/30" onClick={() => setStatusFilter("all")}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-sm">Totalt i år</p>
                <p className="font-display text-3xl font-bold">{stats.total}</p>
              </div>
              <div className="flex size-12 items-center justify-center rounded-full bg-muted">
                <FileTextIcon className="size-6 text-muted-foreground" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer transition-all hover:border-green-300" onClick={() => setStatusFilter("bokfort")}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-sm">Bokført</p>
                <p className="font-display text-3xl font-bold text-green-600">{stats.bokfort}</p>
              </div>
              <div className="flex size-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
                <CheckCircle2Icon className="size-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer transition-all hover:border-blue-300" onClick={() => setStatusFilter("venter_transaksjon")}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-sm">Venter på transaksjon</p>
                <p className="font-display text-3xl font-bold text-blue-600">{stats.venterTransaksjon}</p>
              </div>
              <div className="flex size-12 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30">
                <LinkIcon className="size-6 text-blue-600" />
              </div>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">Koble til banktransaksjon for å bokføre</p>
          </CardContent>
        </Card>
        <Card className="cursor-pointer transition-all hover:border-red-300" onClick={() => setStatusFilter("trenger_gjennomgang")}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-sm">Trenger gjennomgang</p>
                <p className="font-display text-3xl font-bold text-red-500">{stats.trengerGjennomgang}</p>
              </div>
              <div className="flex size-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
                <AlertCircleIcon className="size-6 text-red-500" />
              </div>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">Mangler informasjon - klikk for å fullføre</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className={crystallize(2)}>
        <CardHeader className="pb-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <div className="relative">
                <SearchIcon className="text-muted-foreground absolute left-3 top-1/2 size-4 -translate-y-1/2" />
                <Input
                  ref={searchInputRef}
                  placeholder="Søk på leverandør, bilagsnr, beskrivelse..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-80 pl-9"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Alle statuser" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle statuser</SelectItem>
                  <SelectItem value="bokfort">Bokført</SelectItem>
                  <SelectItem value="venter">Venter godkjenning</SelectItem>
                  <SelectItem value="venter_transaksjon">Venter på transaksjon</SelectItem>
                  <SelectItem value="trenger_gjennomgang">Trenger gjennomgang</SelectItem>
                </SelectContent>
              </Select>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Alle typer" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle typer</SelectItem>
                  <SelectItem value="inngaende_faktura">Inngående faktura</SelectItem>
                  <SelectItem value="utgaende_faktura">Utgående faktura</SelectItem>
                  <SelectItem value="kvittering">Kvittering</SelectItem>
                  <SelectItem value="kreditnota">Kreditnota</SelectItem>
                  <SelectItem value="bankbilag">Bankbilag</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as "grid" | "list")}>
              <TabsList>
                <TabsTrigger value="grid">Kort</TabsTrigger>
                <TabsTrigger value="list">Liste</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardHeader>
        <CardContent>
          {/* Grid View */}
          {viewMode === "grid" && (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {paginatedBilag.map((bilag) => {
                const status = statusConfig[bilag.status] ?? statusConfig.venter;
                const StatusIcon = status.icon;
                const type = bilagTypeConfig[bilag.bilagstype] ?? bilagTypeConfig.inngaende_faktura;

                return (
                  <div
                    key={bilag.id}
                    onClick={() => setSelectedBilag(bilag)}
                    className={cn(
                      "group cursor-pointer rounded-xl border p-5 transition-all hover:border-[var(--primary)]/30 hover:shadow-md",
                      bilag.status === "trenger_gjennomgang" && "border-red-200 bg-red-50/50 dark:border-red-900/30 dark:bg-red-900/10",
                      bilag.status === "venter" && "border-amber-200 bg-amber-50/50 dark:border-amber-900/30 dark:bg-amber-900/10"
                    )}
                  >
                    {/* Header */}
                    <div className="mb-4 flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <CompanyLogo
                          domain={bilag.leverandorDomain}
                          companyName={bilag.leverandor}
                          size="md"
                        />
                        <div>
                          <p className="font-mono text-sm text-muted-foreground">#{bilag.bilagsnummer}</p>
                          <p className="text-xs text-muted-foreground">{type.label}</p>
                        </div>
                      </div>
                      {bilag.ciriKonfidans && bilag.ciriKonfidans >= 95 && (
                        <div className="flex items-center gap-1 text-xs text-[var(--primary)]">
                          <SparklesIcon className="size-3.5" />
                          <span>{bilag.ciriKonfidans}%</span>
                        </div>
                      )}
                    </div>

                    {/* Content */}
                    <div className="mb-3">
                      <p className="font-medium line-clamp-1">{bilag.leverandor}</p>
                    </div>

                    {/* Ciri Explanation/Message section */}
                    {(bilag.ciriExplanation || bilag.ciriMessage || bilag.summary) && (
                      <div className={cn(
                        "mb-4 flex items-start gap-2 rounded-lg p-3 border",
                        bilag.status === "bokfort"
                          ? "bg-green-50/50 border-green-200/50 dark:bg-green-900/10 dark:border-green-800/30"
                          : "bg-[var(--primary)]/5 border-[var(--primary)]/20"
                      )}>
                        <CiriLogo size="sm" className="shrink-0 mt-0.5" />
                        <p className={cn(
                          "text-xs leading-relaxed",
                          bilag.status === "bokfort" ? "text-green-700 dark:text-green-400" : "text-[var(--primary)]"
                        )}>
                          {bilag.ciriExplanation || bilag.ciriMessage || bilag.summary}
                        </p>
                      </div>
                    )}

                    {/* Periodisering badge */}
                    {bilag.periodiseringSuggestion?.is_candidate &&
                     !bilag.periodiseringSuggestion.dismissed &&
                     !bilag.periodiseringSuggestion.accepted && (
                      <a
                        href={`/dashboard/periodisering?highlight=${bilag.id}`}
                        onClick={(e) => { e.stopPropagation(); }}
                        className="mb-3 flex w-full items-center gap-2 rounded-lg border border-sky-200 bg-sky-50/60 p-2.5 text-left transition-colors hover:bg-sky-100/60 dark:border-sky-800/40 dark:bg-sky-950/20 dark:hover:bg-sky-900/30"
                      >
                        <CalendarRangeIcon className="size-4 text-sky-600 dark:text-sky-400 shrink-0" />
                        <span className="text-xs text-sky-700 dark:text-sky-400 flex-1">Kan periodiseres over {bilag.periodiseringSuggestion.period_count} mnd</span>
                        <Badge variant="outline" className="text-[12px] border-sky-300 bg-sky-100 text-sky-700 dark:border-sky-700 dark:bg-sky-900/30 dark:text-sky-400 shrink-0">
                          Se forslag
                        </Badge>
                      </a>
                    )}
                    {bilag.periodiseringSuggestion?.accepted && (
                      <div className="mb-3 flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50/60 p-2.5 dark:border-emerald-800/40 dark:bg-emerald-950/20">
                        <CheckCircle2Icon className="size-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                        <span className="text-xs text-emerald-700 dark:text-emerald-400">Periodisert over {bilag.periodiseringSuggestion.period_count} mnd</span>
                      </div>
                    )}

                    {/* Amount */}
                    <div className="mb-4 rounded-lg bg-muted/50 p-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Total</span>
                        <span className="font-display text-lg font-bold">
                          kr {bilag.totalBelop.toLocaleString("nb-NO")}
                        </span>
                      </div>
                      <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
                        <span>herav MVA {bilag.mvaSats}%</span>
                        <span>kr {bilag.mvaBelop.toLocaleString("nb-NO")}</span>
                      </div>
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-between">
                      <Badge className={cn("border", status.className)}>
                        <StatusIcon className="mr-1 size-3" />
                        {status.label}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {new Date(bilag.bilagsdato).toLocaleDateString("nb-NO")}
                      </span>
                    </div>

                    {/* Hover indicator */}
                    <div className="mt-3 flex items-center justify-center opacity-0 transition-opacity group-hover:opacity-100">
                      <span className="flex items-center gap-1 text-xs text-[var(--primary)]">
                        {bilag.status === "trenger_gjennomgang" ? "Klikk for å fullføre" : "Klikk for detaljer"}
                        <ChevronRightIcon className="size-3" />
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* List View */}
          {viewMode === "list" && (
            <div className="space-y-2">
              {paginatedBilag.map((bilag) => {
                const status = statusConfig[bilag.status] ?? statusConfig.venter;
                const StatusIcon = status.icon;
                const type = bilagTypeConfig[bilag.bilagstype] ?? bilagTypeConfig.inngaende_faktura;

                return (
                  <div
                    key={bilag.id}
                    onClick={() => setSelectedBilag(bilag)}
                    className={cn(
                      "group flex cursor-pointer items-center gap-4 rounded-lg border p-4 transition-all hover:border-[var(--primary)]/30 hover:bg-[var(--primary)]/5",
                      bilag.status === "trenger_gjennomgang" && "border-red-200 bg-red-50/50",
                      bilag.status === "venter" && "border-amber-200 bg-amber-50/50"
                    )}
                  >
                    <CompanyLogo
                      domain={bilag.leverandorDomain}
                      companyName={bilag.leverandor}
                      size="md"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm text-muted-foreground">#{bilag.bilagsnummer}</span>
                        <span className="font-medium truncate">{bilag.leverandor}</span>
                        {bilag.ciriKonfidans && bilag.ciriKonfidans >= 95 && (
                          <SparklesIcon className="size-3.5 text-[var(--primary)]" />
                        )}
                      </div>
                      {bilag.summary ? (
                        <p className="text-sm font-medium text-[var(--primary)] truncate">{bilag.summary}</p>
                      ) : (
                        <p className="text-sm text-muted-foreground truncate">{bilag.beskrivelse}</p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="font-display font-semibold">kr {bilag.totalBelop.toLocaleString("nb-NO")}</p>
                      <p className="text-xs text-muted-foreground">MVA kr {bilag.mvaBelop.toLocaleString("nb-NO")}</p>
                    </div>
                    <div className="w-40 text-right">
                      <Badge className={cn("border", status.className)}>
                        <StatusIcon className="mr-1 size-3" />
                        {status.label}
                      </Badge>
                    </div>
                    <span className="w-24 text-right text-sm text-muted-foreground">
                      {new Date(bilag.bilagsdato).toLocaleDateString("nb-NO")}
                    </span>
                    <ChevronRightIcon className="size-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                  </div>
                );
              })}
            </div>
          )}

          {/* Empty state */}
          {filteredBilag.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <FileTextIcon className="size-12 text-muted-foreground/50" />
              <p className="mt-4 text-lg font-medium">Ingen bilag funnet</p>
              <p className="text-sm text-muted-foreground">Prøv å endre søk eller filtre</p>
            </div>
          )}

          {/* Pagination + results info */}
          {filteredBilag.length > 0 && (
            <div className="mt-6 flex items-center justify-between border-t pt-4">
              <div className="flex items-center gap-4">
                <p className="text-[12px] text-muted-foreground">
                  Viser {showingFrom}–{showingTo} av {filteredBilag.length} bilag
                </p>
                <div className="flex items-center gap-2 text-[12px] text-muted-foreground">
                  <ShieldCheckIcon className="size-3.5 text-green-600" />
                  <span>Oppbevares til 31.12.2030 (5 år)</span>
                </div>
              </div>
              {totalPages > 1 && (
                <Pagination className="w-auto mx-0">
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious
                        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                        className={cn(currentPage === 1 && "pointer-events-none opacity-50")}
                      />
                    </PaginationItem>
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                      if (
                        page === 1 ||
                        page === totalPages ||
                        Math.abs(page - currentPage) <= 1
                      ) {
                        return (
                          <PaginationItem key={page}>
                            <PaginationLink
                              isActive={page === currentPage}
                              onClick={() => setCurrentPage(page)}
                            >
                              {page}
                            </PaginationLink>
                          </PaginationItem>
                        );
                      }
                      if (
                        (page === 2 && currentPage > 3) ||
                        (page === totalPages - 1 && currentPage < totalPages - 2)
                      ) {
                        return (
                          <PaginationItem key={page}>
                            <PaginationEllipsis />
                          </PaginationItem>
                        );
                      }
                      return null;
                    })}
                    <PaginationItem>
                      <PaginationNext
                        onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                        className={cn(currentPage === totalPages && "pointer-events-none opacity-50")}
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Bilag Detail Dialog */}
      <BilagDetailDialog
        bilag={dialogBilag}
        open={!!dialogBilag}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedBilag(null);
            setUrlDialogDismissed(true);
          }
        }}
        onComplete={handleCompleteBilag}
        onApprove={handleApproveBilag}
        onManualPost={(bilag) => {
          setManualPostBilag(bilag);
          setSelectedBilag(null);
          setUrlDialogDismissed(true);
        }}
      />

      {/* Manual Post Dialog */}
      <ManualPostDialog
        bilag={manualPostBilag}
        open={!!manualPostBilag}
        onOpenChange={(open) => !open && setManualPostBilag(null)}
        onSuccess={(bilag) => {
          queryClient.setQueryData<Bilag[]>(queryKeys.bilag.list(), (prev) =>
            (prev ?? []).map(b =>
              b.id === bilag.id ? { ...b, status: "bokfort" as BilagStatus } : b
            )
          );
          invalidateOnEvent(queryClient, "bilag:manualPosted");
          setManualPostBilag(null);
          toast.success("Bilag koblet til transaksjon og bokført");
        }}
      />

      {/* Upload Dialog */}
      <UploadBilagDialog
        open={showUploadDialog}
        onOpenChange={setShowUploadDialog}
        onUploaded={handleBilagUploaded}
      />

      {/* Edit/Complete Dialog */}
      <EditBilagDialog
        bilag={editingBilag}
        open={showEditDialog}
        onOpenChange={(open) => {
          setShowEditDialog(open);
          if (!open) setEditingBilag(null);
        }}
        onSave={handleSaveEdit}
      />

      {/* Periodisering Dialog */}
      {periodiseringBilag?.periodiseringSuggestion && (
        <PeriodiseringDialog
          open={!!periodiseringBilag}
          onOpenChange={(open) => { if (!open) setPeriodiseringBilag(null); }}
          bilagId={periodiseringBilag.id}
          bilagDescription={periodiseringBilag.beskrivelse}
          suggestion={periodiseringBilag.periodiseringSuggestion}
          onAccepted={() => queryClient.invalidateQueries({ queryKey: queryKeys.bilag.all })}
          onDismissed={() => queryClient.invalidateQueries({ queryKey: queryKeys.bilag.all })}
        />
      )}

      <LearnMoreDocs sections={["bokforing", "teknisk-arkitektur"]} />
    </div>
  );
}
