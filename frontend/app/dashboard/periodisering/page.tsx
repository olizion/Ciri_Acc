"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  CalendarRangeIcon,
  ClockIcon,
  CheckCircle2Icon,
  BanknoteIcon,
  SparklesIcon,
  InboxIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { API_BASE_URL, COMPANY_ID } from "@/lib/api";
import { useCrystallize } from "@/lib/use-crystallize";
import CiriLogo from "@/components/layout/ciri-logo";
import { CandidateCard } from "./components/candidate-card";
import type { PeriodiseringSuggestion } from "../bilag/types";

interface PeriodiseringCandidate {
  id: string;
  bilag_number: string;
  description: string;
  document_date: string | null;
  counterparty_name: string | null;
  gross_amount: number;
  net_amount: number;
  suggested_account: string | null;
  category: string | null;
  periodisering_suggestion: PeriodiseringSuggestion;
  created_by_ciri: boolean;
}

interface SummaryData {
  total_candidates: number;
  accepted: number;
  dismissed: number;
  pending: number;
  total_pending_amount: number;
}

function krFmt(n: number) {
  return n.toLocaleString("nb-NO", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

export default function PeriodiseringPage() {
  const searchParams = useSearchParams();
  const highlightId = searchParams.get("highlight");
  const defaultTab = searchParams.get("tab") || "pending";

  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState(defaultTab);
  const [expandedId, setExpandedId] = useState<string | null>(highlightId);

  // Fetch candidates for active tab
  const {
    data: candidates = [],
    isLoading,
    isFetching,
  } = useQuery<PeriodiseringCandidate[]>({
    queryKey: ["periodisering", "candidates", activeTab],
    queryFn: async () => {
      const statusMap: Record<string, string> = {
        pending: "pending",
        godkjent: "accepted",
        avvist: "dismissed",
      };
      const status = statusMap[activeTab] || "pending";
      const res = await fetch(
        `${API_BASE_URL}/api/bilag/periodisering/candidates?company_id=${COMPANY_ID}&status=${status}`
      );
      if (!res.ok) return [];
      const data = await res.json();
      return data.items || [];
    },
    staleTime: 15_000,
  });

  // Fetch summary metrics
  const { data: summary } = useQuery<SummaryData>({
    queryKey: ["periodisering", "summary"],
    queryFn: async () => {
      const res = await fetch(
        `${API_BASE_URL}/api/reports/periodisering/summary?company_id=${COMPANY_ID}`
      );
      if (!res.ok) return { total_candidates: 0, accepted: 0, dismissed: 0, pending: 0, total_pending_amount: 0 };
      return res.json();
    },
    staleTime: 30_000,
  });

  const crystallize = useCrystallize(isLoading);

  // Auto-scroll to highlighted candidate
  useEffect(() => {
    if (highlightId && !isLoading) {
      setTimeout(() => {
        const el = document.getElementById(`candidate-${highlightId}`);
        el?.scrollIntoView({ behavior: "smooth", block: "center" });
        setExpandedId(highlightId);
      }, 300);
    }
  }, [highlightId, isLoading]);

  const handleToggle = useCallback((id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  }, []);

  const handleAccepted = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["periodisering"] });
  }, [queryClient]);

  const handleDismissed = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["periodisering"] });
  }, [queryClient]);

  // Totals for accepted
  const totalDistributed = useMemo(() => {
    if (!summary) return 0;
    return summary.total_pending_amount || 0;
  }, [summary]);

  return (
    <div className="flex flex-col gap-6 p-6 max-w-5xl mx-auto">
      {/* Hero header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl border bg-gradient-to-br from-[var(--primary)]/[0.06] via-transparent to-sky-500/[0.04] p-6 pb-5"
      >
        <div className="flex items-start gap-4">
          <div className="flex size-12 items-center justify-center rounded-xl bg-[var(--primary)]/10 shrink-0">
            <CalendarRangeIcon className="size-6 text-[var(--primary)]" />
          </div>
          <div className="flex-1">
            <h1 className="text-xl font-display font-bold tracking-tight">
              Periodisering
            </h1>
            <p className="text-sm text-muted-foreground mt-1 max-w-lg leading-relaxed">
              Ciri har funnet kostnader og inntekter som kan fordeles over flere perioder i
              henhold til sammenstillingsprinsippet. Du bestemmer hvordan de fordeles.
            </p>
          </div>
          {/* Decorative Ciri logo */}
          <div className="shrink-0 hidden sm:flex items-center">
            <CiriLogo size="sm" />
          </div>
        </div>
        {/* Decorative gradient orb */}
        <div className="absolute -right-16 -top-16 size-48 rounded-full bg-[var(--primary)]/5 blur-3xl pointer-events-none" />
      </motion.div>

      {/* Summary metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          {
            label: "Venter på deg",
            value: summary?.pending ?? 0,
            icon: ClockIcon,
            color: "text-sky-600 dark:text-sky-400",
            bg: "bg-sky-100 dark:bg-sky-900/30",
            delay: 0,
          },
          {
            label: "Godkjent",
            value: summary?.accepted ?? 0,
            icon: CheckCircle2Icon,
            color: "text-emerald-600 dark:text-emerald-400",
            bg: "bg-emerald-100 dark:bg-emerald-900/30",
            delay: 0.05,
          },
          {
            label: "Venter totalt",
            value: `kr ${krFmt(totalDistributed)}`,
            icon: BanknoteIcon,
            color: "text-[var(--primary)]",
            bg: "bg-[var(--primary)]/10",
            delay: 0.1,
          },
        ].map((metric) => (
          <motion.div
            key={metric.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: metric.delay }}
          >
            <Card className="border">
              <CardContent className="flex items-center gap-3 p-4">
                <div className={cn("flex size-9 items-center justify-center rounded-lg shrink-0", metric.bg)}>
                  <metric.icon className={cn("size-4.5", metric.color)} />
                </div>
                <div>
                  <p className="text-lg font-display font-bold tabular-nums">{metric.value}</p>
                  <p className="text-xs text-muted-foreground">{metric.label}</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="pending" className="gap-1.5">
            <ClockIcon className="size-3.5" />
            Ventende
            {(summary?.pending ?? 0) > 0 && (
              <Badge variant="secondary" className="ml-1 h-4 px-1.5 text-[10px]">
                {summary?.pending}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="godkjent" className="gap-1.5">
            <CheckCircle2Icon className="size-3.5" />
            Godkjent
          </TabsTrigger>
          <TabsTrigger value="avvist">Avvist</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Candidate list */}
      <div className="space-y-3">
        {isLoading ? (
          // Skeleton loading
          Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className={cn(
                "rounded-xl border bg-card p-5 animate-pulse",
                crystallize
              )}
            >
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-lg bg-muted" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-48 rounded bg-muted" />
                  <div className="h-3 w-32 rounded bg-muted" />
                </div>
                <div className="h-5 w-20 rounded-full bg-muted" />
              </div>
            </div>
          ))
        ) : candidates.length === 0 ? (
          // Empty state
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center py-16 text-center"
          >
            <div className="flex size-16 items-center justify-center rounded-2xl bg-muted/50 mb-4">
              {activeTab === "pending" ? (
                <InboxIcon className="size-7 text-muted-foreground/40" />
              ) : activeTab === "godkjent" ? (
                <CheckCircle2Icon className="size-7 text-emerald-400/40" />
              ) : (
                <InboxIcon className="size-7 text-muted-foreground/40" />
              )}
            </div>
            <p className="text-sm font-medium text-muted-foreground">
              {activeTab === "pending"
                ? "Alt er i orden! Ingen forslag akkurat n\u00e5."
                : activeTab === "godkjent"
                  ? "Ingen godkjente periodiseringer enn\u00e5."
                  : "Ingen avviste forslag."}
            </p>
            {activeTab === "pending" && (
              <p className="text-xs text-muted-foreground/60 mt-1 max-w-sm">
                Ciri scanner nye bilag automatisk og gir deg beskjed n\u00e5r noe kan fordeles.
              </p>
            )}
          </motion.div>
        ) : (
          candidates.map((c, i) => (
            <motion.div
              key={c.id}
              id={`candidate-${c.id}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
            >
              <CandidateCard
                id={c.id}
                bilagNumber={c.bilag_number}
                description={c.description}
                documentDate={c.document_date}
                counterpartyName={c.counterparty_name}
                grossAmount={c.gross_amount}
                netAmount={c.net_amount}
                suggestedAccount={c.suggested_account}
                category={c.category}
                suggestion={c.periodisering_suggestion}
                createdByCiri={c.created_by_ciri}
                isExpanded={expandedId === c.id}
                onToggle={() => handleToggle(c.id)}
                onAccepted={handleAccepted}
                onDismissed={handleDismissed}
              />
            </motion.div>
          ))
        )}
      </div>

      {/* Ciri footer note */}
      {candidates.length > 0 && activeTab === "pending" && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="flex items-center justify-center gap-2 py-4 text-xs text-muted-foreground/50"
        >
          <CiriLogo size="sm" />
          <span>Ciri foreslår, du bestemmer. Alle posteringer følger norsk regnskapslov.</span>
        </motion.div>
      )}
    </div>
  );
}
