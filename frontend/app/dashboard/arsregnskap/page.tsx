"use client";

import { useState, useMemo, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { API_BASE_URL, COMPANY_ID } from "@/lib/api";
import { useCrystallize } from "@/lib/use-crystallize";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import LearnMoreDocs from "@/components/learn-more-docs";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from "@/components/ui/tooltip";
import {
  CheckCircle2Icon,
  CalendarIcon,
  ReceiptIcon,
  EyeIcon,
  DownloadIcon,
  SendIcon,
  SparklesIcon,
  LayoutDashboardIcon,
  FileSpreadsheetIcon
} from "lucide-react";
import CiriLogo from "@/components/layout/ciri-logo";
import {
  ProgressArc,
  LiveActivityFeed,
  MissingBilagList,
  ChecklistItemRow,
  FinancialPreviewCard,
  ArsregnskapFullView,
  ManglendeBilagDialog
} from "./components";
import { checklistItems, TOTAL_BILAG_COUNT } from "./data/checklist";
import { missingBilagData } from "./data/missing-bilag";
import { ciriActivities } from "./data/activities";
import type { ApiResultatResponse, ApiBalanseResponse, BilagAction } from "./types";
import {
  transformResultatToGroups,
  transformBalanseToGroups,
  getArsresultat,
  getOmsetning,
  getEgenkapital,
} from "./utils";


export default function ArsregnskapPage() {
  const [view, setView] = useState<"summary" | "full">("summary");
  const [bilagDialogOpen, setBilagDialogOpen] = useState(false);
  const [bilagActions, setBilagActions] = useState<Record<string, BilagAction>>({});
  const year = "2025";

  // ── Bilag action handler (lifted state) ─────────────────────
  const handleBilagAction = useCallback((id: string, action: BilagAction) => {
    setBilagActions((prev) => ({ ...prev, [id]: action }));
  }, []);

  // ── Derived bilag counts ────────────────────────────────────
  const resolvedBilagCount = useMemo(
    () => Object.values(bilagActions).filter((a) => a.type !== "none").length,
    [bilagActions]
  );
  const missingBilagCount = missingBilagData.length;
  const unresolvedBilagCount = missingBilagCount - resolvedBilagCount;
  const matchedBilagCount = TOTAL_BILAG_COUNT - missingBilagCount + resolvedBilagCount;

  // ── Fetch periodisering summary ──────────────────────────────
  const { data: periodiseringSummary } = useQuery({
    queryKey: ["periodisering-summary", year, COMPANY_ID],
    queryFn: async () => {
      const res = await fetch(
        `${API_BASE_URL}/api/reports/periodisering/summary?company_id=${COMPANY_ID}&year=${year}`
      );
      if (!res.ok) return null;
      return res.json() as Promise<{ total_candidates: number; accepted: number; dismissed: number; pending: number; total_amount_pending: number }>;
    },
  });

  // ── Build dynamic checklist ─────────────────────────────────
  const dynamicChecklist = useMemo(() => {
    return checklistItems.map((item) => {
      if (item.id === "bilag") {
        const allResolved = unresolvedBilagCount === 0;
        return {
          ...item,
          status: allResolved ? "complete" as const : "warning" as const,
          detail: `${matchedBilagCount} av ${TOTAL_BILAG_COUNT} bilag matchet`,
          subItems: item.subItems?.map((sub) =>
            sub.name === "Bilag fra banktransaksjoner" ? { ...sub, complete: allResolved } : sub
          ),
        };
      }
      if (item.id === "periodisering" && periodiseringSummary) {
        const { pending, accepted, total_candidates } = periodiseringSummary;
        if (total_candidates === 0) return item;
        const allDone = pending === 0;
        return {
          ...item,
          status: allDone ? "complete" as const : "warning" as const,
          detail: allDone
            ? `${accepted} periodiseringer bokført`
            : `${pending} periodiseringsforslag venter`,
        };
      }
      return item;
    });
  }, [unresolvedBilagCount, matchedBilagCount, periodiseringSummary]);

  // ── Fetch real data ───────────────────────────────────────
  const { data: resultatApi, isLoading: resultatLoading } = useQuery({
    queryKey: queryKeys.reports.resultat({ year, companyId: COMPANY_ID }),
    queryFn: async () => {
      const res = await fetch(
        `${API_BASE_URL}/api/reports/bilag/resultat?company_id=${COMPANY_ID}&year=${year}`
      );
      if (!res.ok) return null;
      return res.json() as Promise<ApiResultatResponse>;
    },
  });

  const { data: balanseApi, isLoading: balanseLoading } = useQuery({
    queryKey: queryKeys.reports.balanse({ asOfDate: `${year}-12-31`, companyId: COMPANY_ID }),
    queryFn: async () => {
      const res = await fetch(
        `${API_BASE_URL}/api/reports/bilag/balanse?company_id=${COMPANY_ID}&as_of_date=${year}-12-31`
      );
      if (!res.ok) return null;
      return res.json() as Promise<ApiBalanseResponse>;
    },
  });

  const isLoading = resultatLoading || balanseLoading;
  const crystallize = useCrystallize(isLoading);

  // ── Transform to AccountGroup[] ───────────────────────────
  const resultatData = useMemo(
    () => (resultatApi ? transformResultatToGroups(resultatApi) : []),
    [resultatApi]
  );

  const { aktiva: balanseAktivaData, passiva: balansePassivaData } = useMemo(
    () => (balanseApi ? transformBalanseToGroups(balanseApi) : { aktiva: [], passiva: [] }),
    [balanseApi]
  );

  // ── Summary card values ───────────────────────────────────
  const arsresultat = getArsresultat(resultatData);
  const omsetning = getOmsetning(resultatData);
  const egenkapital = getEgenkapital(balansePassivaData);

  // ── Checklist progress ──────────────────────────────────────
  const completedItems = dynamicChecklist.filter(i => i.status === "complete").length;
  const totalItems = dynamicChecklist.length;
  const progressPercent = Math.round((completedItems / totalItems) * 100);

  const deadline = new Date("2026-06-30");
  const today = new Date();
  const daysUntilDeadline = Math.ceil((deadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  const currentPhase = dynamicChecklist.find(i => i.status === "in_progress")?.name || "Forberedelse";

  return (
    <div className="mx-auto max-w-6xl space-y-6 pb-12">
      {/* Header with view toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="font-display text-3xl font-bold tracking-tight">Årsregnskap {year}</h1>
          <p className="text-muted-foreground mt-1">
            {view === "summary" ? "Ciri forbereder regnskapet for innsending" : "Fullstendig regnskap med detaljer"}
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex items-center gap-2 p-1 rounded-lg bg-muted"
        >
          <Button
            variant={view === "summary" ? "default" : "ghost"}
            size="sm"
            onClick={() => setView("summary")}
            className="gap-2"
          >
            <LayoutDashboardIcon className="size-4" />
            Oversikt
          </Button>
          <Button
            variant={view === "full" ? "default" : "ghost"}
            size="sm"
            onClick={() => setView("full")}
            className="gap-2"
          >
            <FileSpreadsheetIcon className="size-4" />
            Årsregnskap
          </Button>
        </motion.div>
      </div>

      <AnimatePresence mode="wait">
        {view === "summary" ? (
          <motion.div
            key="summary"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-6"
          >
            {/* Progress Hero */}
            <Card className="relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-[var(--primary)]/5 via-transparent to-[var(--primary)]/5" />
              <CardContent className="relative p-8">
                <div className="flex flex-col md:flex-row items-center gap-8">
                  <div className="flex flex-col items-center">
                    <ProgressArc progress={progressPercent} />
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.8 }}
                      className="mt-4 text-center"
                    >
                      <Badge variant="secondary" className="bg-[var(--primary)]/10 text-[var(--primary)]">
                        {currentPhase}
                      </Badge>
                    </motion.div>
                  </div>
                  <div className="flex-1 space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="rounded-xl border bg-card p-4">
                        <div className="flex items-center gap-3">
                          <div className="flex size-10 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
                            <CheckCircle2Icon className="size-5 text-emerald-600" />
                          </div>
                          <div>
                            <p className="text-2xl font-bold">{completedItems}</p>
                            <p className="text-xs text-muted-foreground">av {totalItems} fullført</p>
                          </div>
                        </div>
                      </div>
                      <div className="rounded-xl border bg-card p-4">
                        <div className="flex items-center gap-3">
                          <div className="flex size-10 items-center justify-center rounded-lg bg-[var(--primary)]/10">
                            <CalendarIcon className="size-5 text-[var(--primary)]" />
                          </div>
                          <div>
                            <p className="text-2xl font-bold">{daysUntilDeadline}</p>
                            <p className="text-xs text-muted-foreground">dager til frist</p>
                          </div>
                        </div>
                      </div>
                    </div>
                    <LiveActivityFeed activities={ciriActivities} />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Two Column Layout */}
            <div className="grid gap-6 lg:grid-cols-5">
              <div className="lg:col-span-3 space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="font-display text-xl font-semibold">Sjekkliste</h2>
                  <span className="text-sm text-muted-foreground">
                    {completedItems} av {totalItems} fullført
                  </span>
                </div>
                <div className="space-y-3">
                  {dynamicChecklist.map((item, index) => (
                    <ChecklistItemRow
                      key={item.id}
                      item={item}
                      index={index}
                      onAction={item.id === "bilag" ? () => setBilagDialogOpen(true) : undefined}
                    />
                  ))}
                </div>
              </div>

              <div className="lg:col-span-2">
                <Card className="h-full">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <ReceiptIcon className="size-5 text-red-500" />
                      Manglende bilag
                    </CardTitle>
                    <CardDescription>
                      {unresolvedBilagCount} av {missingBilagCount} transaksjoner mangler bilag
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <MissingBilagList items={missingBilagData} onResolveAll={() => setBilagDialogOpen(true)} />
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Financial Preview */}
            <div className={crystallize(1)}>
              <h2 className="font-display text-xl font-semibold mb-4">Nøkkeltall</h2>
              <div className="grid gap-4 sm:grid-cols-3">
                <FinancialPreviewCard
                  title="Årsresultat"
                  amount={arsresultat}
                  trend={arsresultat >= 0 ? "up" : "down"}
                  href="/dashboard/resultat"
                  delay={0.1}
                />
                <FinancialPreviewCard
                  title="Omsetning"
                  amount={omsetning}
                  trend={omsetning >= 0 ? "up" : "neutral"}
                  href="/dashboard/resultat"
                  delay={0.15}
                />
                <FinancialPreviewCard
                  title="Egenkapital"
                  amount={egenkapital}
                  trend={egenkapital >= 0 ? "up" : "down"}
                  href="/dashboard/balanse"
                  delay={0.2}
                />
              </div>
            </div>

            {/* Actions */}
            <Card>
              <CardContent className="p-6">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div>
                    <p className="font-medium">Klar til å generere årsregnskap?</p>
                    <p className="text-sm text-muted-foreground">
                      Fullfør alle oppgaver i sjekklisten først.
                    </p>
                  </div>
                  <div className="flex gap-3 flex-wrap justify-center">
                    <Button variant="outline" onClick={() => setView("full")}>
                      <EyeIcon className="mr-2 size-4" />
                      Se årsregnskap
                    </Button>
                    <Button variant="outline">
                      <DownloadIcon className="mr-2 size-4" />
                      Last ned PDF
                    </Button>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span>
                            <Button disabled={progressPercent < 100}>
                              <SendIcon className="mr-2 size-4" />
                              Send til Altinn
                            </Button>
                          </span>
                        </TooltipTrigger>
                        {progressPercent < 100 && (
                          <TooltipContent>
                            <p>Fullfør sjekklisten først</p>
                          </TooltipContent>
                        )}
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Ciri footer */}
            <div className="flex items-center gap-3 rounded-xl border bg-muted/30 p-4">
              <CiriLogo size="sm" />
              <p className="flex-1 text-sm">
                <span className="font-medium">Ciri jobber kontinuerlig</span>
                <span className="text-muted-foreground"> med å forberede årsregnskapet. Du blir varslet når noe trenger din oppmerksomhet.</span>
              </p>
              <Badge variant="outline" className="shrink-0 border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-400">
                <SparklesIcon className="mr-1 size-3" />
                Aktiv
              </Badge>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="full"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <ArsregnskapFullView
              resultatData={resultatData}
              balanseAktivaData={balanseAktivaData}
              balansePassivaData={balansePassivaData}
              isLoading={isLoading}
              year={year}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <LearnMoreDocs sections={["rapporter", "bokforing"]} />

      <ManglendeBilagDialog
        open={bilagDialogOpen}
        onOpenChange={setBilagDialogOpen}
        items={missingBilagData}
        actions={bilagActions}
        onAction={handleBilagAction}
      />
    </div>
  );
}
