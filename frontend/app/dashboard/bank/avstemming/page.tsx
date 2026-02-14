"use client";

import { useState, useMemo, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import LearnMoreDocs from "@/components/learn-more-docs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import {
  CheckCircle2Icon,
  SearchIcon,
  SparklesIcon,
  ZapIcon,
  ChevronRightIcon,
  ChevronLeftIcon,
  RefreshCwIcon,
  CalendarIcon,
  BuildingIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useCiriActionListener } from "@/lib/ciri-actions";
import type { MatchSuggestion, Transaction, ReconciliationStatus } from "./types";
import { emptyPeriod } from "./constants";
import { krFormat, mapApiSuggestion, mapApiTransaction, mapApiPeriod } from "./helpers";
import { MatchCard, TransactionRow } from "./components";
import { API_BASE_URL } from "@/lib/api";

// ============================================================================
// MAIN PAGE
// ============================================================================

export default function AvstemmingPage() {
  const queryClient = useQueryClient();
  const now0 = new Date();
  const currentMonth = `${now0.getFullYear()}-${String(now0.getMonth() + 1).padStart(2, "0")}`;
  const [selectedPeriod, setSelectedPeriod] = useState(currentMonth);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [recentlyModified, setRecentlyModified] = useState<Map<string, number>>(new Map());

  const markModified = useCallback((txId: string) => {
    setRecentlyModified((prev) => new Map(prev).set(txId, Date.now()));
  }, []);

  // Queries
  const { data: period = emptyPeriod, isLoading } = useQuery({
    queryKey: ["reconciliation", "status", selectedPeriod],
    queryFn: async () => {
      const res = await fetch(`${API_BASE_URL}/api/bank/reconciliation/status?period=${selectedPeriod}`);
      if (!res.ok) return emptyPeriod;
      return mapApiPeriod(await res.json());
    },
  });

  const { data: attentionItems = [] } = useQuery({
    queryKey: ["reconciliation", "suggestions"],
    queryFn: async () => {
      const res = await fetch(`${API_BASE_URL}/api/bank/reconciliation/suggestions`);
      if (!res.ok) return [] as MatchSuggestion[];
      const data = await res.json();
      return (data as Record<string, unknown>[]).map(mapApiSuggestion);
    },
  });

  const { data: transactions = [] } = useQuery({
    queryKey: ["bank", "transactions"],
    queryFn: async () => {
      const res = await fetch(`${API_BASE_URL}/api/bank/transactions?limit=100`);
      if (!res.ok) return [] as Transaction[];
      const data = await res.json();
      return (data as Record<string, unknown>[]).map(mapApiTransaction);
    },
  });

  // Mutations
  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ["reconciliation"] });
    queryClient.invalidateQueries({ queryKey: ["bank", "transactions"] });
  };

  const confirmMutation = useMutation({
    mutationFn: async ({ matchId, feedback }: { matchId: string; feedback?: string }) => {
      const res = await fetch(
        `${API_BASE_URL}/api/bank/reconciliation/matches/${matchId}/confirm`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ feedback: feedback || null }),
        }
      );
      if (!res.ok) throw new Error("Confirm failed");
    },
    onMutate: async ({ matchId }) => {
      await queryClient.cancelQueries({ queryKey: ["reconciliation", "suggestions"] });
      await queryClient.cancelQueries({ queryKey: ["bank", "transactions"] });

      const prevSuggestions = queryClient.getQueryData<MatchSuggestion[]>(["reconciliation", "suggestions"]);
      const prevTransactions = queryClient.getQueryData<Transaction[]>(["bank", "transactions"]);

      const match = prevSuggestions?.find((s) => s.id === matchId);

      queryClient.setQueryData<MatchSuggestion[]>(
        ["reconciliation", "suggestions"],
        (old) => (old || []).filter((s) => s.id !== matchId)
      );

      if (match?.transaction_id) {
        markModified(match.transaction_id);
        queryClient.setQueryData<Transaction[]>(
          ["bank", "transactions"],
          (old) =>
            (old || []).map((tx) =>
              tx.id === match.transaction_id
                ? { ...tx, reconciliation_status: "matched" as ReconciliationStatus }
                : tx
            )
        );
      }

      return { prevSuggestions, prevTransactions };
    },
    onError: (_err, _vars, context) => {
      if (context?.prevSuggestions) {
        queryClient.setQueryData(["reconciliation", "suggestions"], context.prevSuggestions);
      }
      if (context?.prevTransactions) {
        queryClient.setQueryData(["bank", "transactions"], context.prevTransactions);
      }
    },
    onSettled: () => invalidateAll(),
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ matchId, feedback, rejectReason }: {
      matchId: string; feedback?: string; rejectReason?: string
    }) => {
      const res = await fetch(
        `${API_BASE_URL}/api/bank/reconciliation/matches/${matchId}/reject`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            feedback: feedback || null,
            reject_reason: rejectReason || null,
          }),
        }
      );
      if (!res.ok) throw new Error("Reject failed");
    },
    onMutate: async ({ matchId }) => {
      await queryClient.cancelQueries({ queryKey: ["reconciliation", "suggestions"] });
      await queryClient.cancelQueries({ queryKey: ["bank", "transactions"] });

      const prevSuggestions = queryClient.getQueryData<MatchSuggestion[]>(["reconciliation", "suggestions"]);
      const prevTransactions = queryClient.getQueryData<Transaction[]>(["bank", "transactions"]);

      const match = prevSuggestions?.find((s) => s.id === matchId);

      queryClient.setQueryData<MatchSuggestion[]>(
        ["reconciliation", "suggestions"],
        (old) => (old || []).filter((s) => s.id !== matchId)
      );

      if (match?.transaction_id) {
        markModified(match.transaction_id);
        queryClient.setQueryData<Transaction[]>(
          ["bank", "transactions"],
          (old) =>
            (old || []).map((tx) =>
              tx.id === match.transaction_id
                ? { ...tx, reconciliation_status: "unmatched" as ReconciliationStatus }
                : tx
            )
        );
      }

      return { prevSuggestions, prevTransactions };
    },
    onError: (_err, _vars, context) => {
      if (context?.prevSuggestions) {
        queryClient.setQueryData(["reconciliation", "suggestions"], context.prevSuggestions);
      }
      if (context?.prevTransactions) {
        queryClient.setQueryData(["bank", "transactions"], context.prevTransactions);
      }
    },
    onSettled: () => invalidateAll(),
  });

  const refreshMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`${API_BASE_URL}/api/bank/reconciliation/run`, { method: "POST" });
      if (!res.ok) throw new Error("Reconciliation run failed");
    },
    onSuccess: () => invalidateAll(),
  });

  const handleConfirmMatch = (matchId: string, feedback?: string) => {
    confirmMutation.mutate({ matchId, feedback });
  };

  const handleRejectMatch = (matchId: string, reason: string, feedback?: string) => {
    rejectMutation.mutate({ matchId, feedback, rejectReason: reason });
  };

  const handleConfirmAllHigh = () => {
    const highItems = attentionItems.filter((s) => s.confidence === "high");
    highItems.forEach((s) => confirmMutation.mutate({ matchId: s.id }));
  };

  const handleRefresh = () => {
    refreshMutation.mutate();
  };

  // Ciri bubble action listeners
  useCiriActionListener("avstem-alle", handleConfirmAllHigh);
  useCiriActionListener("vis-differanser", useCallback(() => setStatusFilter("unmatched"), []));
  useCiriActionListener("foresla-match", handleRefresh);

  const isRefreshing = refreshMutation.isPending;

  const filteredTransactions = useMemo(() => {
    const filtered = transactions.filter((t) => {
      if (
        searchQuery &&
        !t.description.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !(t.merchant_name || "").toLowerCase().includes(searchQuery.toLowerCase())
      )
        return false;
      if (statusFilter !== "all" && t.reconciliation_status !== statusFilter)
        return false;
      return true;
    });

    return filtered.sort((a, b) => {
      const aModified = recentlyModified.get(a.id) ?? 0;
      const bModified = recentlyModified.get(b.id) ?? 0;
      if (aModified !== bModified) return bModified - aModified;
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    });
  }, [transactions, searchQuery, statusFilter, recentlyModified]);

  const matchRate = Math.round(period.auto_match_rate);
  const highCount = attentionItems.filter(
    (s) => s.confidence === "high"
  ).length;
  const isBalanced = period.difference === 0;

  const periods = useMemo(() => {
    const result: { value: string; label: string }[] = [];
    const now = new Date();
    for (let i = 0; i < 12; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const label = d.toLocaleDateString("nb-NO", { month: "short", year: "numeric" });
      result.push({ value, label: label.charAt(0).toUpperCase() + label.slice(1) });
    }
    return result;
  }, []);

  const matchedCount = period.matched_transactions;
  const totalCount = period.total_transactions;

  return (
    <div className="mx-auto max-w-[1200px] space-y-5 pb-12">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-end justify-between"
      >
        <div>
          <div className="flex items-center gap-3">
            <h1 className="font-display text-2xl font-bold tracking-tight">
              Bankavstemming
            </h1>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="size-7"
                onClick={() => {
                  const idx = periods.findIndex(
                    (p) => p.value === selectedPeriod
                  );
                  if (idx < periods.length - 1)
                    setSelectedPeriod(periods[idx + 1].value);
                }}
              >
                <ChevronLeftIcon className="size-3.5" />
              </Button>
              <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                <SelectTrigger className="h-7 w-[100px] text-xs font-medium border-0 bg-muted/60">
                  <CalendarIcon className="size-3 mr-1 text-muted-foreground" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {periods.map((p) => (
                    <SelectItem key={p.value} value={p.value}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant="ghost"
                size="icon"
                className="size-7"
                onClick={() => {
                  const idx = periods.findIndex(
                    (p) => p.value === selectedPeriod
                  );
                  if (idx > 0) setSelectedPeriod(periods[idx - 1].value);
                }}
                disabled={selectedPeriod === periods[0].value}
              >
                <ChevronRightIcon className="size-3.5" />
              </Button>
            </div>
          </div>
          <p className="text-[13px] text-muted-foreground mt-0.5">
            Koble banktransaksjoner med bilag for å avstemme regnskapet.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="size-8"
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            <RefreshCwIcon
              className={cn("size-3.5", isRefreshing && "animate-spin")}
            />
          </Button>
          <Button size="sm" className="h-8 text-xs" asChild>
            <a href="/dashboard/bank/accounts/connect">
              <BuildingIcon className="size-3 mr-1.5" />
              Koble til bank
            </a>
          </Button>
        </div>
      </motion.div>

      {/* Summary strip */}
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: isLoading ? 0.5 : 1, y: 0 }}
        transition={{ delay: 0.04 }}
        className="relative grid grid-cols-5 gap-px rounded-xl border bg-border overflow-hidden"
      >
        {/* Cell: Bank balance */}
        <div className="bg-card px-4 py-3">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground/60 font-semibold">
            Banksaldo
          </p>
          <p className="text-lg font-display font-bold tabular-nums mt-0.5 leading-none">
            {krFormat(period.bank_balance)}
          </p>
        </div>

        {/* Cell: Booked balance */}
        <div className="bg-card px-4 py-3">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground/60 font-semibold">
            Bokført
          </p>
          <p className="text-lg font-display font-bold tabular-nums mt-0.5 leading-none">
            {krFormat(period.booked_balance)}
          </p>
        </div>

        {/* Cell: Difference */}
        <div className="bg-card px-4 py-3">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground/60 font-semibold">
            Differanse
          </p>
          <p
            className={cn(
              "text-lg font-display font-bold tabular-nums mt-0.5 leading-none",
              isBalanced
                ? "text-emerald-600 dark:text-emerald-400"
                : "text-amber-600 dark:text-amber-400"
            )}
          >
            {isBalanced ? (
              <span className="flex items-center gap-1">
                <CheckCircle2Icon className="size-4" />0
              </span>
            ) : (
              <>
                {period.difference > 0 ? "+" : "\u2212"}
                {krFormat(period.difference)}
              </>
            )}
          </p>
        </div>

        {/* Cell: Match rate */}
        <div className="bg-card px-4 py-3">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground/60 font-semibold">
            Avstemt
          </p>
          <div className="flex items-baseline gap-2 mt-0.5">
            <p
              className={cn(
                "text-lg font-display font-bold tabular-nums leading-none",
                matchRate >= 90
                  ? "text-emerald-600 dark:text-emerald-400"
                  : matchRate >= 70
                    ? "text-amber-600 dark:text-amber-400"
                    : "text-red-600 dark:text-red-400"
              )}
            >
              {matchRate}%
            </p>
            <span className="text-[11px] text-muted-foreground tabular-nums">
              {matchedCount}/{totalCount}
            </span>
          </div>
        </div>

        {/* Cell: Pending */}
        <div className="bg-card px-4 py-3">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground/60 font-semibold">
            Venter
          </p>
          <div className="flex items-baseline gap-2 mt-0.5">
            <p
              className={cn(
                "text-lg font-display font-bold tabular-nums leading-none",
                period.pending_suggestions > 0
                  ? "text-teal-700 dark:text-teal-400"
                  : "text-emerald-600 dark:text-emerald-400"
              )}
            >
              {period.pending_suggestions}
            </p>
            {period.unmatched_transactions > 0 && (
              <span className="text-[11px] text-muted-foreground">
                + {period.unmatched_transactions} uavstemte
              </span>
            )}
          </div>
        </div>

        {/* Progress bar at bottom */}
        <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-transparent">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${matchRate}%` }}
            transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
            className="h-full bg-gradient-to-r from-teal-600/80 to-emerald-500 rounded-r-full"
          />
        </div>
      </motion.div>

      {/* Main content: suggestions + transactions */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-5">
        {/* LEFT: Match suggestions */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 }}
          className="space-y-3"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <SparklesIcon className="size-4 text-teal-600 dark:text-teal-400" />
              <h2 className="text-sm font-semibold">Ciris forslag</h2>
              <span className="text-[11px] text-muted-foreground">
                {attentionItems.length} venter på godkjenning
              </span>
            </div>
            {highCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-[11px] text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-950/20"
                onClick={handleConfirmAllHigh}
              >
                <ZapIcon className="size-3 mr-1" />
                Godkjenn {highCount} sikre
              </Button>
            )}
          </div>

          {/* Match cards */}
          <div className="space-y-3">
            <AnimatePresence mode="popLayout">
              {attentionItems.map((suggestion, index) => {
                const transaction = transactions.find(
                  (t) => t.id === suggestion.transaction_id
                ) ?? {
                  id: suggestion.transaction_id,
                  date: suggestion.transaction_date || suggestion.bilag.date,
                  description: suggestion.transaction_description || "",
                  merchant_name: suggestion.transaction_merchant_name,
                  amount: suggestion.transaction_amount ?? -(suggestion.bilag.amount),
                  category: "ukategorisert",
                  reconciliation_status: "suggested" as ReconciliationStatus,
                };
                if (!suggestion.transaction_id) return null;
                return (
                  <MatchCard
                    key={suggestion.id}
                    suggestion={suggestion}
                    transaction={transaction}
                    onConfirm={(feedback) =>
                      handleConfirmMatch(suggestion.id, feedback)
                    }
                    onReject={(reason, feedback) =>
                      handleRejectMatch(suggestion.id, reason, feedback)
                    }
                    index={index}
                  />
                );
              })}
            </AnimatePresence>
          </div>

          {/* Empty state */}
          <AnimatePresence>
            {attentionItems.length === 0 && (
              <motion.div
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ delay: 0.15 }}
                className="flex flex-col items-center py-12 rounded-xl border bg-card"
              >
                <div className="relative mb-3">
                  <div className="size-12 rounded-full bg-emerald-100 dark:bg-emerald-950/40 flex items-center justify-center">
                    <CheckCircle2Icon className="size-6 text-emerald-500" />
                  </div>
                </div>
                <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">
                  Alt er avstemt
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Ingen forslag venter på godkjenning
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* RIGHT: Transaction list */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.12 }}
          className="space-y-3 lg:sticky lg:top-4 lg:self-start"
        >
          {/* Search + filters */}
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold mr-auto">Transaksjoner</h2>
            <div className="relative">
              <SearchIcon className="absolute left-2 top-1/2 -translate-y-1/2 size-3 text-muted-foreground" />
              <Input
                placeholder="Søk..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-7 pl-7 w-[120px] text-xs focus:w-[160px] transition-all"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-7 w-[110px] text-xs">
                <SelectValue placeholder="Alle" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle</SelectItem>
                <SelectItem value="matched">Avstemt</SelectItem>
                <SelectItem value="suggested">Foreslått</SelectItem>
                <SelectItem value="unmatched">Uavstemt</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Transaction table */}
          <div className="rounded-xl border bg-card overflow-hidden">
            <div className="grid grid-cols-[20px_60px_1fr_90px_100px] items-center gap-2 py-1.5 px-3 border-b bg-muted/30">
              <span />
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
                Dato
              </span>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
                Beskrivelse
              </span>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60 text-center">
                Status
              </span>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60 text-right">
                Beløp
              </span>
            </div>

            <ScrollArea className="h-[calc(100vh-320px)] min-h-[300px] max-h-[600px]">
              {filteredTransactions.length > 0 ? (
                <div className="divide-y divide-border/40">
                  {filteredTransactions.map((tx) => (
                    <TransactionRow key={tx.id} tx={tx} isRecent={recentlyModified.has(tx.id)} />
                  ))}
                </div>
              ) : (
                <div className="py-10 text-center">
                  <SearchIcon className="size-5 mx-auto text-muted-foreground/30 mb-2" />
                  <p className="text-xs text-muted-foreground">
                    Ingen transaksjoner funnet
                  </p>
                </div>
              )}
            </ScrollArea>

            <div className="flex items-center justify-between px-3 py-1.5 border-t bg-muted/20 text-[10px] text-muted-foreground">
              <span>
                {filteredTransactions.length} av {transactions.length}{" "}
                transaksjoner
              </span>
              <span className="tabular-nums">
                Saldo: kr {krFormat(period.bank_balance)}
              </span>
            </div>
          </div>
        </motion.div>
      </div>

      <LearnMoreDocs sections={["bank", "teknisk-arkitektur"]} />
    </div>
  );
}
