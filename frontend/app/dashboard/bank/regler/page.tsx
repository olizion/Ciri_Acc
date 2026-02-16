"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import LearnMoreDocs from "@/components/learn-more-docs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  PaginationEllipsis,
} from "@/components/ui/pagination";
import {
  PlusIcon,
  ZapIcon,
  SearchIcon,
  FilterIcon,
  RefreshCwIcon,
  ListIcon,
  NetworkIcon,
  LayoutGridIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useCiriActionListener } from "@/lib/ciri-actions";
import { API_BASE_URL } from "@/lib/api";
import { useCrystallize } from "@/lib/use-crystallize";
import { queryKeys } from "@/lib/query-keys";
import { invalidateOnEvent } from "@/lib/query-invalidation";
import type {
  Rule,
  RuleType,
  RulePriority,
  RuleCriteria,
  RuleAction,
  RuleStats,
  ClusterStatsData,
  CascadeResult,
} from "./types";
import {
  emptyStats,
  emptyClusterStats,
  accountOptions,
} from "./constants";
import { DEV_CLUSTER_DATA, DEV_RULE_STATS } from "./data/dev-fixtures";
import { USE_DEV_DATA } from "./constants";
import {
  RuleCard,
  RuleCardSkeleton,
  RuleDialog,
  DeleteConfirmDialog,
  EmptyState,
  RuleDetailDialog,
  ClusterVisualization,
  RuleCompactRow,
} from "./components";

// ============================================================================
// MAIN PAGE
// ============================================================================

const RULES_PER_PAGE = 20;

export default function ReglerPage() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [showInactive, setShowInactive] = useState(false);
  const [viewMode, setViewMode] = useState<"cards" | "compact">("compact");
  const [currentPage, setCurrentPage] = useState(1);

  // Dialog state
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<Rule | null>(null);

  // Detail sheet state
  const [detailRule, setDetailRule] = useState<Rule | null>(null);

  // Delete state
  const [deleteTarget, setDeleteTarget] = useState<Rule | null>(null);

  // Toggle state
  const [togglingId, setTogglingId] = useState<string | null>(null);

  // Tab state
  const [activeTab, setActiveTab] = useState<"regler" | "klynger">("regler");

  // Ciri bubble action listeners
  useCiriActionListener("ny-regel", useCallback(() => {
    setEditingRule(null);
    setIsDialogOpen(true);
  }, []));
  useCiriActionListener("vis-klynger", useCallback(() => setActiveTab("klynger"), []));

  // ---- Queries ----
  const { data: rules = [], isLoading } = useQuery({
    queryKey: queryKeys.rules.list,
    queryFn: async () => {
      const res = await fetch(`${API_BASE_URL}/api/bank/rules?active_only=false`);
      if (!res.ok) throw new Error("Kunne ikke hente regler");
      return res.json() as Promise<Rule[]>;
    },
  });

  const { data: stats = emptyStats } = useQuery({
    queryKey: queryKeys.rules.stats,
    queryFn: async () => {
      if (USE_DEV_DATA) return DEV_RULE_STATS;
      const res = await fetch(`${API_BASE_URL}/api/bank/rules/stats`);
      if (!res.ok) return emptyStats;
      return res.json() as Promise<RuleStats>;
    },
  });

  const { data: clusterStats = emptyClusterStats, isLoading: clustersLoading } = useQuery({
    queryKey: queryKeys.rules.clusters,
    queryFn: async () => {
      if (USE_DEV_DATA) return DEV_CLUSTER_DATA;
      const res = await fetch(`${API_BASE_URL}/api/bank/clusters/stats`);
      if (!res.ok) return emptyClusterStats;
      return res.json() as Promise<ClusterStatsData>;
    },
  });

  const { data: kontoer = [] } = useQuery({
    queryKey: queryKeys.bank.kontoer,
    queryFn: async () => {
      const res = await fetch(`${API_BASE_URL}/api/bank/kontoer`);
      if (!res.ok) return [];
      return res.json() as Promise<{ account_number: string; name: string; type: string }[]>;
    },
  });

  // Dynamic account options from DB (replaces hardcoded accountOptions)
  const dynamicAccountOptions = useMemo(() => {
    if (kontoer.length === 0) return accountOptions; // fallback to hardcoded while loading
    return kontoer.map((k) => ({
      value: k.account_number,
      label: `${k.account_number} - ${k.name}`,
    }));
  }, [kontoer]);

  // Lookup for account number -> name (for display in clusters, rules, etc.)
  const accountNameMap = useMemo(() => {
    const map: Record<string, string> = {};
    for (const k of kontoer) {
      map[k.account_number] = k.name;
    }
    return map;
  }, [kontoer]);

  // Enrich cluster data with account names from DB
  const enrichedClusterStats = useMemo<ClusterStatsData>(() => {
    if (Object.keys(accountNameMap).length === 0) return clusterStats;
    return {
      ...clusterStats,
      clusters: clusterStats.clusters.map((c) => ({
        ...c,
        account_name: accountNameMap[c.account_number],
      })),
    };
  }, [clusterStats, accountNameMap]);

  const crystallize = useCrystallize(isLoading);

  function invalidateRules() {
    invalidateOnEvent(queryClient, "rules:changed");
  }

  // ---- Mutations ----
  const createMutation = useMutation({
    mutationFn: async (data: {
      name: string;
      rule_type: RuleType;
      priority: RulePriority;
      criteria: RuleCriteria;
      action: RuleAction;
    }) => {
      const res = await fetch(`${API_BASE_URL}/api/bank/rules`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || "Kunne ikke opprette regel");
      }
      return res.json() as Promise<Rule>;
    },
    onSuccess: (created) => {
      toast.success(`Regel "${created.name}" opprettet`);
      showCascadeToast(created.cascade);
      setIsDialogOpen(false);
      setEditingRule(null);
      invalidateRules();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ ruleId, data }: {
      ruleId: string;
      data: {
        name: string;
        rule_type: RuleType;
        priority: RulePriority;
        criteria: RuleCriteria;
        action: RuleAction;
      };
    }) => {
      const res = await fetch(`${API_BASE_URL}/api/bank/rules/${ruleId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || "Kunne ikke oppdatere regel");
      }
      return res.json() as Promise<Rule>;
    },
    onSuccess: (updated) => {
      toast.success(`Regel "${updated.name}" oppdatert`);
      showCascadeToast(updated.cascade);
      setIsDialogOpen(false);
      setEditingRule(null);
      invalidateRules();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (ruleId: string) => {
      const res = await fetch(`${API_BASE_URL}/api/bank/rules/${ruleId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Kunne ikke slette regel");
    },
    onSuccess: () => {
      toast.success(`Regel "${deleteTarget?.name}" slettet`);
      setDeleteTarget(null);
      invalidateRules();
    },
    onError: () => toast.error("Kunne ikke slette regelen"),
  });

  const toggleMutation = useMutation({
    mutationFn: async (ruleId: string) => {
      setTogglingId(ruleId);
      const res = await fetch(`${API_BASE_URL}/api/bank/rules/${ruleId}/toggle`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("Kunne ikke endre regelstatus");
      return res.json() as Promise<{ message: string }>;
    },
    onSuccess: (data) => {
      toast.success(data.message);
      setTogglingId(null);
      invalidateRules();
    },
    onError: () => {
      toast.error("Kunne ikke endre regelstatus");
      setTogglingId(null);
    },
  });

  const applyAllMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`${API_BASE_URL}/api/bank/rules/apply-all`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("Kunne ikke kjore regler");
      return res.json() as Promise<{
        message: string;
        rules_applied: number;
        matches_found: number;
        total: number;
      }>;
    },
    onSuccess: (data) => {
      toast.success(data.message);
      invalidateRules();
    },
    onError: () => {
      toast.error("Kunne ikke kjore regler pa transaksjoner");
    },
  });

  // Ciri action: run all rules (needs applyAllMutation ref)
  useCiriActionListener("kjor-regler", useCallback(() => applyAllMutation.mutate(), []));

  // ---- Filter ----
  const filteredRules = useMemo(
    () =>
      rules.filter((rule) => {
        if (
          searchQuery &&
          !rule.name.toLowerCase().includes(searchQuery.toLowerCase())
        )
          return false;
        if (typeFilter !== "all" && rule.rule_type !== typeFilter)
          return false;
        if (!showInactive && !rule.is_active)
          return false;
        return true;
      }),
    [rules, searchQuery, typeFilter, showInactive]
  );

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, typeFilter, showInactive]);

  // Pagination
  const totalPages = Math.ceil(filteredRules.length / RULES_PER_PAGE);
  const paginatedRules = filteredRules.slice(
    (currentPage - 1) * RULES_PER_PAGE,
    currentPage * RULES_PER_PAGE
  );
  const showingFrom = filteredRules.length > 0 ? (currentPage - 1) * RULES_PER_PAGE + 1 : 0;
  const showingTo = Math.min(currentPage * RULES_PER_PAGE, filteredRules.length);

  // ---- Handlers ----
  function handleSaveRule(data: {
    name: string;
    rule_type: RuleType;
    priority: RulePriority;
    criteria: RuleCriteria;
    action: RuleAction;
  }) {
    if (editingRule) {
      updateMutation.mutate({ ruleId: editingRule.id, data });
    } else {
      createMutation.mutate(data);
    }
  }

  function showCascadeToast(cascade?: CascadeResult | null) {
    if (!cascade || cascade.total_affected === 0) return;
    const parts: string[] = [];
    if (cascade.transactions_marked_private > 0) {
      parts.push(
        `${cascade.transactions_marked_private} transaksjon${cascade.transactions_marked_private === 1 ? "" : "er"} markert privat`
      );
    }
    if (cascade.bilags_rejected > 0) {
      parts.push(`${cascade.bilags_rejected} bilag avvist`);
    }
    if (cascade.matches_rejected > 0) {
      parts.push(`${cascade.matches_rejected} forslag avvist`);
    }
    toast.info(`Opprydding: ${parts.join(", ")}`, { duration: 6000 });
  }

  function openCreateDialog() {
    setEditingRule(null);
    setIsDialogOpen(true);
  }

  function openEditDialog(rule: Rule) {
    setEditingRule(rule);
    setIsDialogOpen(true);
  }

  const isSaving = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="mx-auto max-w-[1200px] space-y-5 pb-12">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className={`flex items-end justify-between ${crystallize(1)}`}
      >
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight">
            Avstemmingsregler
          </h1>
          <p className="text-[13px] text-muted-foreground mt-0.5">
            Automatiser behandling av banktransaksjoner
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Tab switcher */}
          <div className="flex items-center gap-1 p-1 rounded-lg bg-muted">
            <Button
              variant={activeTab === "regler" ? "default" : "ghost"}
              size="sm"
              className="h-7 text-xs gap-1.5"
              onClick={() => setActiveTab("regler")}
            >
              <ListIcon className="size-3.5" />
              Regler
            </Button>
            <Button
              variant={activeTab === "klynger" ? "default" : "ghost"}
              size="sm"
              className="h-7 text-xs gap-1.5"
              onClick={() => setActiveTab("klynger")}
            >
              <NetworkIcon className="size-3.5" />
              Klynger
            </Button>
          </div>

          {activeTab === "regler" && (
            <>
              <Button
                variant="ghost"
                size="icon"
                className="size-8"
                onClick={() => invalidateRules()}
                disabled={isLoading}
              >
                <RefreshCwIcon
                  className={cn("size-3.5", isLoading && "animate-spin")}
                />
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs"
                onClick={() => applyAllMutation.mutate()}
                disabled={applyAllMutation.isPending}
              >
                <ZapIcon className={cn("size-3 mr-1.5", applyAllMutation.isPending && "animate-pulse")} />
                {applyAllMutation.isPending ? "Kjorer..." : "Kjor regler"}
              </Button>
              <Button size="sm" className="h-8 text-xs" onClick={openCreateDialog}>
                <PlusIcon className="size-3 mr-1.5" />
                Ny regel
              </Button>
            </>
          )}
        </div>
      </motion.div>

      {/* Tab content */}
      <AnimatePresence mode="wait">
        {activeTab === "regler" ? (
          <motion.div
            key="regler"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className={`space-y-4 ${crystallize(2)}`}
          >
            {/* Summary strip */}
            <div className="relative grid grid-cols-5 gap-px rounded-xl border bg-border overflow-hidden">
              <div className="bg-card px-4 py-3">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground/60 font-semibold">Aktive</p>
                <p className="text-lg font-display font-bold tabular-nums mt-0.5 leading-none">{stats.active_rules}</p>
              </div>
              <div className="bg-card px-4 py-3">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground/60 font-semibold">Totalt anvendt</p>
                <p className="text-lg font-display font-bold tabular-nums mt-0.5 leading-none">{stats.total_applied}</p>
              </div>
              <div className="bg-card px-4 py-3">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground/60 font-semibold">Laert av Ciri</p>
                <p className="text-lg font-display font-bold tabular-nums mt-0.5 leading-none text-[var(--primary)]">{stats.learned_rules}</p>
              </div>
              <div className="bg-card px-4 py-3">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground/60 font-semibold cursor-help border-b border-dashed border-muted-foreground/30 w-fit">Auto-behandlet</p>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="max-w-[240px]">
                      <p className="text-xs leading-relaxed">Transaksjoner Ciri har bokfort helt uten brukerhandling -- auto-matchet eller ignorert via regler.</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <div className="flex items-baseline gap-1 mt-0.5">
                  <p className="text-lg font-display font-bold tabular-nums leading-none">{stats.auto_handled}</p>
                  <span className="text-[10px] text-muted-foreground">/ {stats.total_transactions}</span>
                </div>
              </div>
              <div className="bg-card px-4 py-3">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground/60 font-semibold cursor-help border-b border-dashed border-muted-foreground/30 w-fit">Autonomi</p>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="max-w-[260px]">
                      <p className="text-xs leading-relaxed">Andelen av alle transaksjoner som Ciri har behandlet autonomt. Godkjente forslag teller ikke -- kun transaksjoner Ciri bokforte pa egenhand.</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <div className="flex items-baseline gap-1 mt-0.5">
                  <p className={cn(
                    "text-lg font-display font-bold tabular-nums leading-none",
                    stats.autonomy_percentage >= 50 ? "text-emerald-600 dark:text-emerald-400" : "text-foreground"
                  )}>{stats.autonomy_percentage}%</p>
                </div>
                {/* Progress bar at bottom of this cell */}
                <div className="h-1 w-full overflow-hidden rounded-full bg-muted/60 mt-2">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(stats.autonomy_percentage, 100)}%` }}
                    transition={{ delay: 0.3, duration: 0.8, ease: [0.25, 0.46, 0.45, 0.94] }}
                    className={cn(
                      "h-full rounded-full",
                      stats.autonomy_percentage >= 50
                        ? "bg-gradient-to-r from-emerald-500 to-emerald-400"
                        : "bg-gradient-to-r from-[var(--primary)] to-[var(--primary)]"
                    )}
                  />
                </div>
              </div>
            </div>

            {/* Filters */}
            <div className="flex items-center justify-between gap-3 rounded-xl border bg-card px-4 py-2.5">
              <div className="flex items-center gap-2">
                <div className="relative">
                  <SearchIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3 text-muted-foreground" />
                  <Input
                    placeholder="Sok regler..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="h-7 pl-7 w-[160px] text-xs focus:w-[220px] transition-all border-0 bg-muted/40"
                  />
                </div>
                <div className="w-px h-5 bg-border" />
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="h-7 w-[130px] text-xs border-0 bg-muted/40">
                    <FilterIcon className="size-3 mr-1.5 text-muted-foreground" />
                    <SelectValue placeholder="Alle typer" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Alle typer</SelectItem>
                    <SelectItem value="auto_category">Kategoriser</SelectItem>
                    <SelectItem value="auto_match">Auto-match</SelectItem>
                    <SelectItem value="ignore">Ignorer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  id="show-inactive"
                  checked={showInactive}
                  onCheckedChange={setShowInactive}
                />
                <Label htmlFor="show-inactive" className="text-[11px] text-muted-foreground">
                  Vis inaktive
                </Label>
                <div className="w-px h-5 bg-border ml-1" />
                <div className="flex items-center gap-0.5 p-0.5 rounded-md bg-muted/40">
                  <Button
                    variant={viewMode === "cards" ? "default" : "ghost"}
                    size="icon"
                    className="size-6"
                    onClick={() => setViewMode("cards")}
                    aria-label="Kortvisning"
                  >
                    <LayoutGridIcon className="size-3" />
                  </Button>
                  <Button
                    variant={viewMode === "compact" ? "default" : "ghost"}
                    size="icon"
                    className="size-6"
                    onClick={() => setViewMode("compact")}
                    aria-label="Listevisning"
                  >
                    <ListIcon className="size-3" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Rules list */}
            {isLoading ? (
              <div className="space-y-3">
                <RuleCardSkeleton />
                <RuleCardSkeleton />
                <RuleCardSkeleton />
              </div>
            ) : (
              <AnimatePresence mode="popLayout">
                {filteredRules.length > 0 ? (
                  <>
                    {viewMode === "cards" ? (
                      <div className="space-y-3">
                        {paginatedRules.map((rule, i) => (
                          <motion.div
                            key={rule.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.04, duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
                          >
                            <RuleCard
                              rule={rule}
                              onEdit={() => openEditDialog(rule)}
                              onDelete={() => setDeleteTarget(rule)}
                              onToggle={() => toggleMutation.mutate(rule.id)}
                              onDetail={() => setDetailRule(rule)}
                              isToggling={togglingId === rule.id}
                            />
                          </motion.div>
                        ))}
                      </div>
                    ) : (
                      <div className="rounded-xl border bg-card overflow-hidden">
                        <Table>
                          <TableHeader>
                            <TableRow className="hover:bg-transparent">
                              <TableHead className="text-[11px] font-semibold uppercase tracking-wider">Navn</TableHead>
                              <TableHead className="text-[11px] font-semibold uppercase tracking-wider w-[120px]">Type</TableHead>
                              <TableHead className="text-[11px] font-semibold uppercase tracking-wider w-[90px]">Prioritet</TableHead>
                              <TableHead className="text-[11px] font-semibold uppercase tracking-wider w-[70px]">Aktiv</TableHead>
                              <TableHead className="text-[11px] font-semibold uppercase tracking-wider w-[80px] text-right">Brukt</TableHead>
                              <TableHead className="text-[11px] font-semibold uppercase tracking-wider w-[100px]">Sist brukt</TableHead>
                              <TableHead className="w-[50px]" />
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {paginatedRules.map((rule) => (
                              <RuleCompactRow
                                key={rule.id}
                                rule={rule}
                                onEdit={() => openEditDialog(rule)}
                                onDelete={() => setDeleteTarget(rule)}
                                onToggle={() => toggleMutation.mutate(rule.id)}
                                onDetail={() => setDetailRule(rule)}
                                isToggling={togglingId === rule.id}
                              />
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}

                    {/* Pagination */}
                    {totalPages > 1 && (
                      <div className="flex items-center justify-between pt-2">
                        <p className="text-[12px] text-muted-foreground">
                          Viser {showingFrom}–{showingTo} av {filteredRules.length} regler
                        </p>
                        <Pagination className="w-auto mx-0">
                          <PaginationContent>
                            <PaginationItem>
                              <PaginationPrevious
                                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                                className={cn(currentPage === 1 && "pointer-events-none opacity-50")}
                              />
                            </PaginationItem>
                            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                              // Show first, last, and pages near current
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
                              // Show ellipsis only once per gap
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
                      </div>
                    )}
                  </>
                ) : searchQuery || typeFilter !== "all" ? (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex flex-col items-center py-12 rounded-xl border bg-card"
                  >
                    <div className="size-10 rounded-full bg-muted flex items-center justify-center mb-3">
                      <SearchIcon className="size-5 text-muted-foreground/40" />
                    </div>
                    <p className="text-sm font-semibold text-muted-foreground">
                      Ingen regler matcher soket
                    </p>
                    <p className="text-xs text-muted-foreground/60 mt-0.5">
                      Prov a endre sokeord eller filter
                    </p>
                  </motion.div>
                ) : (
                  <EmptyState onCreateRule={openCreateDialog} />
                )}
              </AnimatePresence>
            )}
          </motion.div>
        ) : (
          <motion.div
            key="klynger"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className={crystallize(2)}
          >
            <ClusterVisualization
              clusterStats={enrichedClusterStats}
              ruleStats={stats}
              isLoading={clustersLoading}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Create/Edit dialog */}
      <RuleDialog
        open={isDialogOpen}
        onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) setEditingRule(null);
        }}
        onSave={handleSaveRule}
        editingRule={editingRule}
        isSaving={isSaving}
        accountOptionsList={dynamicAccountOptions}
      />

      {/* Delete confirmation */}
      <DeleteConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        ruleName={deleteTarget?.name || ""}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
        isDeleting={deleteMutation.isPending}
      />

      {/* Rule detail dialog */}
      <RuleDetailDialog
        rule={detailRule}
        open={!!detailRule}
        onOpenChange={(open) => !open && setDetailRule(null)}
        onEdit={(rule) => {
          setDetailRule(null);
          openEditDialog(rule);
        }}
      />

      <LearnMoreDocs sections={["bank", "teknisk-arkitektur", "bokforing"]} />
    </div>
  );
}
