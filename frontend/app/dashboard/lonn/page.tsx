"use client";

import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  UsersIcon,
  CalendarIcon,
  BanknoteIcon,
  WalletIcon,
  UmbrellaIcon,
  CheckCircle2Icon,
  SendIcon,
  ClockIcon,
  ChevronRightIcon,
  SparklesIcon,
  BrainCircuitIcon,
  FileTextIcon,
  PlayIcon,
  ListIcon,
  ReceiptIcon,
  BarChart3Icon,
  SearchIcon,
  ShieldAlertIcon,
  XCircleIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import LearnMoreDocs from "@/components/learn-more-docs";
import CiriLogo from "@/components/layout/ciri-logo";
import { employees as mockEmployees } from "./data/employees";
import { payrollRuns as mockPayrollRuns } from "./data/payroll-runs";
import { payrollTimeline as fallbackTimeline } from "./data/payroll-timeline";
import { AddEmployeeDialog, EmployeeDialog, PayrollPreviewDialog } from "./components";
import type { Employee, PayrollRun, PayrollLineItem, PayrollTimelineEvent } from "./types";
import { API_BASE_URL, COMPANY_ID } from "@/lib/api";

// ============================================================================
// HELPERS
// ============================================================================

function krFmt(n: number) {
  return Math.abs(n).toLocaleString("nb-NO");
}

type TabId = "ansatte" | "lonnskjoring" | "rapportering";

// ============================================================================
// EMPLOYEE AVATAR (with error fallback)
// ============================================================================

function EmployeeAvatar({ name, avatarUrl, size = 8 }: { name: string; avatarUrl?: string | null; size?: number }) {
  const [imgError, setImgError] = useState(false);
  const initials = name.split(" ").map((n) => n[0]).join("");
  const sizeClass = size === 8 ? "size-8" : size === 14 ? "size-14" : "size-8";

  if (avatarUrl && !imgError) {
    return (
      <img
        src={avatarUrl}
        alt={name}
        className={`${sizeClass} shrink-0 rounded-full object-cover ring-1 ring-border`}
        onError={() => setImgError(true)}
      />
    );
  }

  return (
    <div className={`flex ${sizeClass} shrink-0 items-center justify-center rounded-full bg-[var(--primary)]/10 font-medium text-[var(--primary)] text-xs`}>
      {initials}
    </div>
  );
}

// ============================================================================
// MAIN PAGE
// ============================================================================

export default function LonnPage() {
  const [activeTab, setActiveTab] = useState<TabId>("ansatte");
  const [autonomyMode, setAutonomyMode] = useState<"assistant" | "autonomous">("autonomous");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [dbEmployees, setDbEmployees] = useState<Employee[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [lonnAuthConnected, setLonnAuthConnected] = useState(true); // TODO: check via /api/altinn/status/{org}/lonn

  // Payroll runs — fetched from backend, mock fallback
  const [dbPayrollRuns, setDbPayrollRuns] = useState<PayrollRun[] | null>(null);
  const payrollRuns = dbPayrollRuns ?? mockPayrollRuns;

  // A-melding submissions from backend
  const [ameldingSubmissions, setAmeldingSubmissions] = useState<{
    id: string;
    periode: string;
    status: string;
    employee_count: number;
    total_gross_salary: number;
    total_tax_deduction: number;
    submission_type: string;
    submitted_at: string | null;
    created_at: string;
  }[]>([]);

  const fetchEmployees = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/employees/`, { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      const mapped: Employee[] = (data.employees || []).map((e: any) => ({
        id: e.id,
        name: e.full_name,
        position: e.position,
        email: e.email || "",
        phone: e.phone || "",
        personnummer: "****** *****",
        salary: e.monthly_salary,
        taxRate: e.tax_percentage ?? 30,
        taxTable: e.tax_table || "—",
        status: e.status === "active" ? "active" as const : "vacation" as const,
        employmentType: (e.employment_type === "fast" ? "fast" : "deltid") as "fast" | "deltid",
        startDate: e.start_date,
        feriepenger: e.feriepenger_accrued ?? 0,
        vacationDays: { used: 0, total: 25 },
        bankAccount: "",
        avatarUrl: e.avatar_url || null,
        createdAt: e.created_at,
      }));
      setDbEmployees(mapped);
    } catch { /* silent */ }
  }, []);

  const fetchAmeldingHistory = useCallback(async () => {
    try {
      const res = await fetch(
        `${API_BASE_URL}/api/amelding/history?company_id=${COMPANY_ID}`,
        { cache: "no-store" }
      );
      if (!res.ok) return;
      const data = await res.json();
      setAmeldingSubmissions(data);
    } catch { /* silent — falls back to payrollRuns data */ }
  }, []);

  // Build a "next run" from real DB employees when available
  useEffect(() => {
    if (dbEmployees.length === 0) return;

    const now = new Date();
    const payDay = 25; // default pay day
    const nextPayDate = new Date(now.getFullYear(), now.getMonth(), payDay);
    if (nextPayDate <= now) {
      nextPayDate.setMonth(nextPayDate.getMonth() + 1);
    }
    const monthLabel = nextPayDate.toLocaleDateString("nb-NO", { month: "long", year: "numeric" });
    const monthCapitalized = monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1);

    const active = dbEmployees.filter((e) => e.status === "active");
    const lineItems: PayrollLineItem[] = active.map((e) => {
      const skattetrekk = Math.round(e.salary * (e.taxRate / 100));
      return {
        employeeId: e.id,
        employeeName: e.name,
        gross: e.salary,
        skattetrekk,
        net: e.salary - skattetrekk,
        arbeidsgiveravgift: Math.round(e.salary * 0.141),
        otp: Math.round(e.salary * 0.02),
        feriepengerAccrual: Math.round(e.salary * 0.12),
      };
    });

    const totalGross = lineItems.reduce((a, i) => a + i.gross, 0);
    const totalSkattetrekk = lineItems.reduce((a, i) => a + i.skattetrekk, 0);
    const totalNet = lineItems.reduce((a, i) => a + i.net, 0);
    const totalAga = lineItems.reduce((a, i) => a + i.arbeidsgiveravgift, 0);
    const totalOtp = lineItems.reduce((a, i) => a + i.otp, 0);
    const totalFp = lineItems.reduce((a, i) => a + i.feriepengerAccrual, 0);

    const nextRun: PayrollRun = {
      id: `pr-next-${nextPayDate.toISOString().slice(0, 7)}`,
      month: monthCapitalized,
      date: nextPayDate.toISOString().slice(0, 10),
      status: "ready",
      lineItems,
      totalGross,
      totalSkattetrekk,
      totalNet,
      totalArbeidsgiveravgift: totalAga,
      totalOtp,
      totalFeriepengerAccrual: totalFp,
      totalCost: totalGross + totalAga + totalOtp + totalFp,
      ameldingStatus: "ready",
    };

    // Build past runs from A-melding submissions (each submitted a-melding implies a completed run)
    const pastRuns: PayrollRun[] = ameldingSubmissions
      .filter((s) => s.status === "submitted" || s.status === "accepted")
      .map((s) => {
        const [year, monthStr] = s.periode.split("-");
        const monthNames = [
          "Januar", "Februar", "Mars", "April", "Mai", "Juni",
          "Juli", "August", "September", "Oktober", "November", "Desember",
        ];
        const monthIdx = parseInt(monthStr, 10) - 1;
        return {
          id: `pr-${s.id}`,
          month: `${monthNames[monthIdx]} ${year}`,
          date: `${s.periode}-25`,
          status: "completed" as const,
          lineItems, // approximate — same employees
          totalGross: s.total_gross_salary,
          totalSkattetrekk: s.total_tax_deduction,
          totalNet: s.total_gross_salary - s.total_tax_deduction,
          totalArbeidsgiveravgift: Math.round(s.total_gross_salary * 0.141),
          totalOtp: Math.round(s.total_gross_salary * 0.02),
          totalFeriepengerAccrual: Math.round(s.total_gross_salary * 0.12),
          totalCost: Math.round(s.total_gross_salary * 1.281),
          ameldingStatus: "sent" as const,
        };
      })
      .sort((a, b) => b.date.localeCompare(a.date));

    setDbPayrollRuns([nextRun, ...pastRuns]);
  }, [dbEmployees, ameldingSubmissions]);

  useEffect(() => { fetchEmployees(); fetchAmeldingHistory(); }, [fetchEmployees, fetchAmeldingHistory]);

  // Use DB employees when available, fall back to mocks only if DB returned nothing
  const employees = useMemo(() => {
    if (dbEmployees.length > 0) {
      return [...dbEmployees].sort((a, b) => {
        const da = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const db_ = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return db_ - da;
      });
    }
    return mockEmployees;
  }, [dbEmployees]);

  // Filtered employees based on search
  const filteredEmployees = useMemo(() => {
    if (!searchQuery.trim()) return employees;
    const q = searchQuery.toLowerCase();
    return employees.filter(
      (e) =>
        e.name.toLowerCase().includes(q) ||
        e.position.toLowerCase().includes(q) ||
        e.email.toLowerCase().includes(q)
    );
  }, [employees, searchQuery]);

  const activeEmployees = employees.filter((e) => e.status === "active");
  const totalSalary = activeEmployees.reduce((acc, e) => acc + e.salary, 0);

  // Feriepenger: use actual accrued values from employees.
  // feriepenger_accrued is the running total set by backend (12% of gross per month).
  const totalFeriepenger = employees.reduce(
    (acc, e) => acc + e.feriepenger,
    0
  );

  // Annual feriepenger liability = sum of each employee's monthly salary × 12% × 12 months
  const annualFeriepengerLiability = activeEmployees.reduce(
    (acc, e) => acc + Math.round(e.salary * 0.12 * 12),
    0
  );

  // Monthly feriepenger set-aside = sum of each active employee's salary × 12%
  const monthlyFeriepengerSetAside = activeEmployees.reduce(
    (acc, e) => acc + Math.round(e.salary * 0.12),
    0
  );

  // Months elapsed this year (for progress bar)
  const currentMonth = new Date().getMonth(); // 0-indexed

  const nextRun = payrollRuns.find((r) => r.status === "ready");
  const completedRuns = payrollRuns.filter((r) => r.status === "completed");

  // A-melding count: prefer real backend data, fall back to payrollRuns mock
  const ameldingSent = ameldingSubmissions.length > 0
    ? ameldingSubmissions.filter((s) => s.status === "submitted" || s.status === "accepted").length
    : completedRuns.filter((r) => r.ameldingStatus === "sent").length;

  // Accepted submissions for validation banner
  const ameldingAccepted = ameldingSubmissions.filter((s) => s.status === "accepted").length;
  const ameldingRejected = ameldingSubmissions.filter((s) => s.status === "rejected").length;

  const daysUntilPayroll = useMemo(() => {
    if (!nextRun) return null;
    const payDate = new Date(nextRun.date);
    const now = new Date();
    return Math.ceil(
      (payDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );
  }, [nextRun]);

  const totalMonthlyCost = useMemo(() => {
    if (!nextRun) return 0;
    return nextRun.totalCost;
  }, [nextRun]);

  // Build timeline dynamically from real A-melding submissions + payroll runs,
  // falling back to static data if no backend data available.
  const payrollTimeline = useMemo((): PayrollTimelineEvent[] => {
    if (ameldingSubmissions.length === 0) return fallbackTimeline;

    const events: PayrollTimelineEvent[] = [];
    const monthNames = [
      "januar", "februar", "mars", "april", "mai", "juni",
      "juli", "august", "september", "oktober", "november", "desember",
    ];

    // Add events from completed payroll runs
    for (const run of completedRuns) {
      events.push({
        id: `run-${run.id}`,
        action: `Lønnskjøring for ${run.month.toLowerCase()} beregnet og utbetalt`,
        timestamp: `${run.date} 06:00`,
        type: "completed" as const,
        icon: BanknoteIcon,
      });
    }

    // Add events from actual A-melding submissions
    for (const sub of ameldingSubmissions) {
      const [year, monthStr] = sub.periode.split("-");
      const monthIdx = parseInt(monthStr, 10) - 1;
      const monthName = monthNames[monthIdx] ?? monthStr;
      const ts = sub.submitted_at ?? sub.created_at;

      if (sub.status === "submitted" || sub.status === "accepted") {
        events.push({
          id: `amelding-${sub.id}`,
          action: `A-melding for ${monthName} ${sub.status === "accepted" ? "godkjent" : "sendt"} (${sub.employee_count} ansatte)`,
          timestamp: ts.replace("T", " ").slice(0, 16),
          type: "completed" as const,
          icon: sub.status === "accepted" ? CheckCircle2Icon : SendIcon,
        });
      } else if (sub.status === "rejected") {
        events.push({
          id: `amelding-${sub.id}`,
          action: `A-melding for ${monthName} avvist av Skatteetaten`,
          timestamp: ts.replace("T", " ").slice(0, 16),
          type: "completed" as const,
          icon: SendIcon,
        });
      }
    }

    // Add scheduled events for next payroll
    if (nextRun) {
      events.push({
        id: "sched-pay",
        action: `Utbetaling av ${nextRun.month.toLowerCase()} planlagt`,
        timestamp: `${nextRun.date} 06:00`,
        type: "scheduled" as const,
        icon: CalendarIcon,
      });

      // Next A-melding deadline (5th of month after payroll)
      const payDate = new Date(nextRun.date);
      const ameldingDeadline = new Date(payDate.getFullYear(), payDate.getMonth() + 1, 5);
      events.push({
        id: "sched-amelding",
        action: `A-melding for ${nextRun.month.split(" ")[0].toLowerCase()} sendes innen ${ameldingDeadline.toLocaleDateString("nb-NO", { day: "numeric", month: "short" })}`,
        timestamp: `${ameldingDeadline.toISOString().slice(0, 10)} 08:00`,
        type: "scheduled" as const,
        icon: SendIcon,
      });
    }

    // Sort by timestamp
    events.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
    return events;
  }, [ameldingSubmissions, completedRuns, nextRun]);

  const completedSteps = payrollTimeline.filter(
    (e) => e.type === "completed"
  ).length;
  const totalSteps = payrollTimeline.length;

  const tabs: { id: TabId; label: string; icon: typeof ListIcon }[] = [
    { id: "ansatte", label: "Ansatte", icon: UsersIcon },
    { id: "lonnskjoring", label: "Lønnskjøring", icon: BanknoteIcon },
    { id: "rapportering", label: "Rapportering", icon: BarChart3Icon },
  ];

  return (
    <div className="mx-auto max-w-[1200px] space-y-5 pb-12">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-end justify-between"
      >
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight">
            Lønn
          </h1>
          <p className="text-[13px] text-muted-foreground mt-0.5">
            {employees.length} ansatte · neste lønning{" "}
            {nextRun
              ? new Date(nextRun.date).toLocaleDateString("nb-NO", {
                  day: "numeric",
                  month: "long",
                })
              : "—"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Autonomy toggle */}
          <div className="flex items-center gap-0.5 p-0.5 rounded-lg bg-muted/60">
            <Button
              variant={autonomyMode === "assistant" ? "default" : "ghost"}
              size="sm"
              className="h-7 text-xs gap-1.5"
              onClick={() => setAutonomyMode("assistant")}
            >
              <SparklesIcon className="size-3" />
              Assistent
            </Button>
            <Button
              variant={autonomyMode === "autonomous" ? "default" : "ghost"}
              size="sm"
              className="h-7 text-xs gap-1.5"
              onClick={() => setAutonomyMode("autonomous")}
            >
              <BrainCircuitIcon className="size-3" />
              Autonom
            </Button>
          </div>
          <div className="w-px h-5 bg-border" />
          <AddEmployeeDialog onEmployeeCreated={fetchEmployees} />
        </div>
      </motion.div>

      {/* Summary strip */}
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.04 }}
        className="relative grid grid-cols-5 gap-px rounded-xl border bg-border overflow-hidden"
      >
        <div className="bg-card px-4 py-3">
          <div className="flex items-center gap-1.5">
            <UsersIcon className="size-3 text-[var(--primary)]" />
            <p className="text-[12px] uppercase tracking-wider text-muted-foreground/60 font-semibold">
              Ansatte
            </p>
          </div>
          <div className="flex items-baseline gap-1 mt-0.5">
            <p className="text-lg font-display font-bold tabular-nums leading-none">
              {activeEmployees.length}
            </p>
            <span className="text-[12px] text-muted-foreground">
              / {employees.length}
            </span>
          </div>
          <p className="text-[12px] text-muted-foreground mt-0.5">aktive</p>
        </div>
        <div className="bg-card px-4 py-3">
          <div className="flex items-center gap-1.5">
            <CalendarIcon className="size-3" />
            <p className="text-[12px] uppercase tracking-wider text-muted-foreground/60 font-semibold">
              Neste lønning
            </p>
          </div>
          <p
            className={cn(
              "text-lg font-display font-bold tabular-nums mt-0.5 leading-none",
              daysUntilPayroll != null && daysUntilPayroll <= 3
                ? "text-amber-600 dark:text-amber-400"
                : ""
            )}
          >
            {daysUntilPayroll != null ? `${daysUntilPayroll} dager` : "—"}
          </p>
          <p className="text-[12px] text-muted-foreground mt-0.5">
            {nextRun
              ? new Date(nextRun.date).toLocaleDateString("nb-NO", {
                  day: "numeric",
                  month: "short",
                })
              : ""}
          </p>
        </div>
        <div className="bg-card px-4 py-3">
          <div className="flex items-center gap-1.5">
            <BanknoteIcon className="size-3 text-emerald-500" />
            <p className="text-[12px] uppercase tracking-wider text-muted-foreground/60 font-semibold">
              Brutto utbetaling
            </p>
          </div>
          <p className="text-lg font-display font-bold tabular-nums mt-0.5 leading-none">
            {krFmt(totalSalary)}
          </p>
          <p className="text-[12px] text-muted-foreground mt-0.5">per måned</p>
        </div>
        <div className="bg-card px-4 py-3">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-1.5">
                  <WalletIcon className="size-3 text-rose-500" />
                  <p className="text-[12px] uppercase tracking-wider text-muted-foreground/60 font-semibold cursor-help border-b border-dashed border-muted-foreground/30 w-fit">
                    Total kostnad
                  </p>
                </div>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-[240px]">
                <p className="text-xs leading-relaxed">
                  Inkluderer bruttolønn, arbeidsgiveravgift (14,1%), OTP (2%) og
                  feriepenger (12%).
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <p className="text-lg font-display font-bold tabular-nums mt-0.5 leading-none text-[var(--primary)]">
            {krFmt(totalMonthlyCost)}
          </p>
          <p className="text-[12px] text-muted-foreground mt-0.5">per måned</p>
        </div>
        <div className="bg-card px-4 py-3">
          <div className="flex items-center gap-1.5">
            <UmbrellaIcon className="size-3 text-sky-500" />
            <p className="text-[12px] uppercase tracking-wider text-muted-foreground/60 font-semibold">
              Feriepenger
            </p>
          </div>
          <p className="text-lg font-display font-bold tabular-nums mt-0.5 leading-none">
            {krFmt(totalFeriepenger)}
          </p>
          <p className="text-[12px] text-muted-foreground mt-0.5">
            opptjent i år
          </p>
        </div>
      </motion.div>

      {/* Skatteetaten auth banner (if not connected) */}
      {!lonnAuthConnected && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.06 }}
          className="flex items-center gap-4 rounded-xl border border-amber-300/40 bg-gradient-to-r from-amber-50 to-transparent dark:from-amber-950/20 dark:to-transparent px-4 py-3"
        >
          <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30">
            <ShieldAlertIcon className="size-4 text-amber-600 dark:text-amber-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] leading-snug">
              <span className="font-semibold">Koble til Skatteetaten</span> for
              å hente skattekort og sende A-meldinger automatisk.
            </p>
          </div>
          <Button size="sm" className="h-7 text-xs gap-1.5 shrink-0">
            Koble til
          </Button>
        </motion.div>
      )}

      {/* Ciri status banner — Autonomous mode */}
      {autonomyMode === "autonomous" && nextRun && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 }}
          className="flex items-center gap-4 rounded-xl border border-[var(--primary)]/20 bg-gradient-to-r from-[var(--primary)]/[0.04] to-transparent px-4 py-3"
        >
          <div className="relative shrink-0">
            <CiriLogo size="sm" />
            <span className="absolute -bottom-0.5 -right-0.5 flex size-2.5">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex size-2.5 rounded-full bg-green-500" />
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] leading-snug">
              <span className="font-medium">
                Ciri har beregnet og validert lønnskjøring for{" "}
                {nextRun.month.toLowerCase()}.
              </span>{" "}
              {nextRun.lineItems.length} ansatte, kr {krFmt(nextRun.totalNet)}{" "}
              utbetales.{" "}
              <span className="text-[var(--primary)] font-medium">
                Utbetaling{" "}
                {new Date(nextRun.date).toLocaleDateString("nb-NO", {
                  day: "numeric",
                  month: "short",
                })}
                . A-melding sendes automatisk innen 5.{" "}
                {new Date(
                  new Date(nextRun.date).setMonth(
                    new Date(nextRun.date).getMonth() + 1
                  )
                ).toLocaleDateString("nb-NO", { month: "short" })}
                .
              </span>
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs gap-1.5"
              onClick={() => setPreviewOpen(true)}
            >
              <FileTextIcon className="size-3" />
              Se detaljer
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs text-muted-foreground"
            >
              <ClockIcon className="size-3 mr-1" />
              Utsett
            </Button>
          </div>
        </motion.div>
      )}

      {/* Ciri status banner — Assistant mode */}
      {autonomyMode === "assistant" && nextRun && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 }}
          className="flex items-center gap-4 rounded-xl border border-[var(--primary)]/20 bg-gradient-to-r from-[var(--primary)]/[0.04] to-transparent px-4 py-3"
        >
          <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[var(--primary)]/10">
            <BanknoteIcon className="size-4 text-[var(--primary)]" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[13px]">
              <span className="font-semibold">{nextRun.month}</span> er klar til
              utbetaling.{" "}
              <span className="font-medium">
                {nextRun.lineItems.length} ansatte · kr{" "}
                {krFmt(nextRun.totalNet)} netto
              </span>{" "}
              · utbetalingsdato{" "}
              {new Date(nextRun.date).toLocaleDateString("nb-NO", {
                day: "numeric",
                month: "long",
              })}
              .
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs gap-1.5"
              onClick={() => setPreviewOpen(true)}
            >
              <FileTextIcon className="size-3" />
              Forhåndsvis
            </Button>
            <Button size="sm" className="h-7 text-xs gap-1.5">
              <PlayIcon className="size-3" />
              Kjør lønn
            </Button>
          </div>
        </motion.div>
      )}

      {/* Tab navigation */}
      <div className="flex items-center gap-1 border-b">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "relative flex items-center gap-1.5 px-3 py-2 text-[13px] font-medium transition-colors rounded-t-md",
                isActive
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground/80"
              )}
            >
              <Icon className="size-3.5" />
              {tab.label}
              {isActive && (
                <motion.div
                  layoutId="lonn-tab-indicator"
                  className="absolute bottom-0 left-0 right-0 h-[2px] bg-[var(--primary)] rounded-full"
                  transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      <div className="min-h-[400px]">
        {/* ─── Ansatte tab ─── */}
        {activeTab === "ansatte" && (
          <motion.div
            key="ansatte"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className="space-y-4"
          >
            <div className="rounded-xl border bg-card overflow-hidden">
              <div className="px-5 py-3 border-b bg-muted/20 space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold">
                    Alle ansatte ({employees.length})
                  </h3>
                  <div className="flex items-center gap-3 text-[13px] text-muted-foreground">
                    <span>{activeEmployees.length} aktive</span>
                    <span>
                      {employees.length - activeEmployees.length} ferie/permisjon
                    </span>
                  </div>
                </div>
                <div className="relative">
                  <SearchIcon className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Søk etter ansatt..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full rounded-lg border bg-background py-1.5 pl-8 pr-3 text-[13px] outline-none ring-0 focus:ring-1 focus:ring-[var(--primary)]/30 transition-shadow placeholder:text-muted-foreground/60"
                  />
                </div>
              </div>
              {/* Compact table header */}
              <div className="hidden sm:grid grid-cols-[1fr_120px_80px_100px_80px] gap-4 px-5 py-2 border-b bg-muted/10 text-[12px] uppercase tracking-wider text-muted-foreground font-semibold">
                <span>Ansatt</span>
                <span className="text-right">Bruttolønn</span>
                <span className="text-right">Skatt %</span>
                <span className="text-right">Netto</span>
                <span className="text-right">Status</span>
              </div>
              <div className="divide-y divide-border/50">
                {filteredEmployees.length === 0 && (
                  <div className="px-5 py-8 text-center text-sm text-muted-foreground">
                    {searchQuery ? "Ingen ansatte funnet" : "Ingen ansatte enda"}
                  </div>
                )}
                {filteredEmployees.map((employee) => {
                  const netSalary = Math.round(
                    employee.salary * (1 - employee.taxRate / 100)
                  );
                  return (
                    <EmployeeDialog key={employee.id} employee={employee} onUpdated={fetchEmployees}>
                      <div className="group flex items-center gap-4 px-5 py-3 cursor-pointer transition-colors hover:bg-muted/30">
                        <div className="sm:grid sm:grid-cols-[1fr_120px_80px_100px_80px] sm:gap-4 sm:items-center flex-1">
                          {/* Name + position */}
                          <div className="flex items-center gap-3 min-w-0">
                            <EmployeeAvatar name={employee.name} avatarUrl={employee.avatarUrl} size={8} />
                            <div className="min-w-0">
                              <p className="text-[13px] font-medium truncate">
                                {employee.name}
                              </p>
                              <p className="text-[13px] text-muted-foreground truncate">
                                {employee.position} ·{" "}
                                {employee.employmentType === "fast"
                                  ? "Fast"
                                  : "Deltid"}
                              </p>
                            </div>
                          </div>
                          {/* Salary columns - hidden on mobile */}
                          <p className="hidden sm:block text-[13px] font-medium tabular-nums text-right">
                            kr {employee.salary.toLocaleString("nb-NO")}
                          </p>
                          <p className="hidden sm:block text-[13px] tabular-nums text-right text-muted-foreground">
                            {employee.taxRate}%
                          </p>
                          <p className="hidden sm:block text-[13px] font-medium tabular-nums text-right">
                            kr {netSalary.toLocaleString("nb-NO")}
                          </p>
                          <div className="hidden sm:flex justify-end">
                            {employee.status === "vacation" ? (
                              <Badge
                                variant="outline"
                                className="text-[12px] h-5 border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-400"
                              >
                                Ferie
                              </Badge>
                            ) : (
                              <Badge
                                variant="outline"
                                className="text-[12px] h-5 border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-400"
                              >
                                Aktiv
                              </Badge>
                            )}
                          </div>
                        </div>
                        <ChevronRightIcon className="size-3.5 text-muted-foreground opacity-0 group-hover:opacity-60 transition-opacity shrink-0" />
                      </div>
                    </EmployeeDialog>
                  );
                })}
              </div>
            </div>

            {/* Employee cost summary */}
            <div className="flex items-center gap-6 rounded-xl border bg-card px-5 py-3">
              <div className="flex items-center gap-2">
                <span className="text-[13px] text-muted-foreground">
                  Brutto mnd:
                </span>
                <span className="text-[13px] font-display font-semibold tabular-nums">
                  kr {krFmt(totalSalary)}
                </span>
              </div>
              <div className="w-px h-4 bg-border" />
              <div className="flex items-center gap-2">
                <span className="text-[13px] text-muted-foreground">
                  AGA (14,1%):
                </span>
                <span className="text-[13px] font-display font-semibold tabular-nums">
                  kr {krFmt(Math.round(totalSalary * 0.141))}
                </span>
              </div>
              <div className="w-px h-4 bg-border" />
              <div className="flex items-center gap-2">
                <span className="text-[13px] text-muted-foreground">
                  OTP (2%):
                </span>
                <span className="text-[13px] font-display font-semibold tabular-nums">
                  kr {krFmt(Math.round(totalSalary * 0.02))}
                </span>
              </div>
              <div className="w-px h-4 bg-border" />
              <div className="flex items-center gap-2">
                <span className="text-[13px] text-muted-foreground">
                  Total:
                </span>
                <span className="text-[13px] font-display font-bold tabular-nums text-[var(--primary)]">
                  kr {krFmt(totalMonthlyCost)}
                </span>
              </div>
            </div>
          </motion.div>
        )}

        {/* ─── Lønnskjøring tab ─── */}
        {activeTab === "lonnskjoring" && (
          <motion.div
            key="lonnskjoring"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className="space-y-5"
          >
            {/* Current/next payroll run */}
            {nextRun && <PayrollRunCard run={nextRun} isNext />}

            {/* Past runs */}
            {completedRuns.length > 0 && (
              <div className="rounded-xl border bg-card overflow-hidden">
                <div className="px-5 py-3 border-b bg-muted/20">
                  <h3 className="text-sm font-semibold">
                    Tidligere lønnskjøringer
                  </h3>
                </div>
                <div className="divide-y divide-border/50">
                  {completedRuns.map((run) => (
                    <div
                      key={run.id}
                      className="group flex items-center gap-4 px-5 py-3.5 cursor-pointer transition-colors hover:bg-muted/30"
                    >
                      <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30">
                        <CheckCircle2Icon className="size-4 text-emerald-600 dark:text-emerald-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-[13px] font-medium">{run.month}</p>
                          {autonomyMode === "autonomous" && (
                            <Badge
                              variant="secondary"
                              className="gap-0.5 text-[12px] h-4 px-1.5"
                            >
                              <SparklesIcon className="size-2.5" />
                              Ciri
                            </Badge>
                          )}
                        </div>
                        <p className="text-[13px] text-muted-foreground">
                          Utbetalt{" "}
                          {new Date(run.date).toLocaleDateString("nb-NO")} ·
                          A-melding sendt
                        </p>
                      </div>
                      <div className="hidden sm:grid grid-cols-3 gap-6 text-right">
                        <div>
                          <p className="text-[12px] text-muted-foreground">
                            Brutto
                          </p>
                          <p className="text-[13px] font-display font-medium tabular-nums">
                            {krFmt(run.totalGross)}
                          </p>
                        </div>
                        <div>
                          <p className="text-[12px] text-muted-foreground">
                            Netto
                          </p>
                          <p className="text-[13px] font-display font-medium tabular-nums">
                            {krFmt(run.totalNet)}
                          </p>
                        </div>
                        <div>
                          <p className="text-[12px] text-muted-foreground">
                            Total kost
                          </p>
                          <p className="text-[13px] font-display font-medium tabular-nums text-[var(--primary)]">
                            {krFmt(run.totalCost)}
                          </p>
                        </div>
                      </div>
                      <ChevronRightIcon className="size-3.5 text-muted-foreground opacity-0 group-hover:opacity-60 transition-opacity shrink-0" />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}

        {/* ─── Rapportering tab ─── */}
        {activeTab === "rapportering" && (
          <motion.div
            key="rapportering"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className="space-y-5"
          >
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-5">
              {/* Left: A-melding progress + feriepenger forecast */}
              <div className="space-y-4">
                {/* A-melding progress */}
                <div className="rounded-xl border bg-card overflow-hidden">
                  <div className="px-5 py-3 border-b bg-muted/20">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <SendIcon className="size-4 text-[var(--primary)]" />
                        <h3 className="text-sm font-semibold">
                          A-meldinger 2026
                        </h3>
                      </div>
                      <span className="text-[13px] text-muted-foreground">
                        {ameldingSent} av 12 sendt
                      </span>
                    </div>
                  </div>
                  <div className="p-5 space-y-4">
                    {/* Month grid — checks actual submissions by month */}
                    <div className="grid grid-cols-12 gap-1">
                      {Array.from({ length: 12 }, (_, i) => {
                        const monthNames = [
                          "Jan", "Feb", "Mar", "Apr", "Mai", "Jun",
                          "Jul", "Aug", "Sep", "Okt", "Nov", "Des",
                        ];
                        const monthPeriode = `2026-${String(i + 1).padStart(2, "0")}`;

                        // Check actual submissions first, fall back to sequential mock
                        const submission = ameldingSubmissions.find(
                          (s) => s.periode === monthPeriode
                        );
                        const isSent = submission
                          ? submission.status === "submitted" || submission.status === "accepted"
                          : i < ameldingSent;
                        const isRejected = submission?.status === "rejected";
                        const isNext = !isSent && !isRejected && (
                          submission ? false : i === ameldingSent
                        );

                        return (
                          <div key={i} className="text-center">
                            <div
                              className={cn(
                                "h-8 rounded-md border flex items-center justify-center text-[12px] font-medium transition-colors",
                                isSent &&
                                  "bg-emerald-100 dark:bg-emerald-900/30 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400",
                                isRejected &&
                                  "bg-red-100 dark:bg-red-900/30 border-red-200 dark:border-red-800 text-red-700 dark:text-red-400",
                                isNext &&
                                  "bg-[var(--primary)]/10 border-[var(--primary)]/30 text-[var(--primary)]",
                                !isSent && !isRejected && !isNext &&
                                  "bg-muted/30 text-muted-foreground/50"
                              )}
                            >
                              {isSent ? (
                                <CheckCircle2Icon className="size-3" />
                              ) : isRejected ? (
                                <XCircleIcon className="size-3" />
                              ) : isNext ? (
                                <ClockIcon className="size-3" />
                              ) : null}
                            </div>
                            <p className="text-[13px] text-muted-foreground mt-1">
                              {monthNames[i]}
                            </p>
                          </div>
                        );
                      })}
                    </div>

                    {/* Validation status — reflects actual submission statuses */}
                    {ameldingRejected > 0 ? (
                      <div className="flex items-center gap-3 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800/40 px-3 py-2">
                        <ShieldAlertIcon className="size-4 text-red-600 shrink-0" />
                        <p className="text-[12px] text-red-700 dark:text-red-400">
                          {ameldingRejected} A-melding{ameldingRejected > 1 ? "er" : ""} ble
                          avvist av Skatteetaten. Sjekk detaljene og korriger.
                        </p>
                      </div>
                    ) : ameldingSent > 0 ? (
                      <div className="flex items-center gap-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/40 px-3 py-2">
                        <CheckCircle2Icon className="size-4 text-emerald-600 shrink-0" />
                        <p className="text-[12px] text-emerald-700 dark:text-emerald-400">
                          {ameldingAccepted > 0
                            ? `${ameldingAccepted} av ${ameldingSent} A-meldinger er godkjent av Skatteetaten.`
                            : `Alle ${ameldingSent} sendte A-meldinger venter på behandling.`}
                          {" "}Ingen feil eller advarsler.
                        </p>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3 rounded-lg bg-muted/30 border border-border px-3 py-2">
                        <ClockIcon className="size-4 text-muted-foreground shrink-0" />
                        <p className="text-[12px] text-muted-foreground">
                          Ingen A-meldinger sendt ennå for 2026.
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Feriepenger forecast */}
                <div className="rounded-xl border bg-card overflow-hidden">
                  <div className="px-5 py-3 border-b bg-muted/20">
                    <div className="flex items-center gap-2">
                      <UmbrellaIcon className="size-4 text-sky-500" />
                      <h3 className="text-sm font-semibold">
                        Feriepenger-prognose
                      </h3>
                    </div>
                  </div>
                  <div className="p-5 space-y-3">
                    <div className="grid grid-cols-3 gap-4">
                      <div className="rounded-lg border bg-muted/20 p-3">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <p className="text-[12px] uppercase tracking-wider text-muted-foreground font-semibold cursor-help border-b border-dashed border-muted-foreground/30 w-fit">
                                Opptjent hittil
                              </p>
                            </TooltipTrigger>
                            <TooltipContent side="bottom" className="max-w-[220px]">
                              <p className="text-xs leading-relaxed">
                                Sum av feriepenger opptjent per ansatt hittil i år
                                (12% av brutto × antall måneder).
                              </p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                        <p className="text-xl font-display font-bold tabular-nums mt-1">
                          kr {krFmt(totalFeriepenger > 0 ? totalFeriepenger : monthlyFeriepengerSetAside * (currentMonth + 1))}
                        </p>
                      </div>
                      <div className="rounded-lg border bg-muted/20 p-3">
                        <p className="text-[12px] uppercase tracking-wider text-muted-foreground font-semibold">
                          Årlig forpliktelse
                        </p>
                        <p className="text-xl font-display font-bold tabular-nums mt-1 text-sky-600 dark:text-sky-400">
                          kr {krFmt(annualFeriepengerLiability)}
                        </p>
                      </div>
                      <div className="rounded-lg border bg-muted/20 p-3">
                        <p className="text-[12px] uppercase tracking-wider text-muted-foreground font-semibold">
                          Sett av / mnd
                        </p>
                        <p className="text-xl font-display font-bold tabular-nums mt-1">
                          kr {krFmt(monthlyFeriepengerSetAside)}
                        </p>
                      </div>
                    </div>
                    <p className="text-[13px] text-muted-foreground leading-relaxed">
                      Feriepenger utbetales i juni og erstatter vanlig lønn
                      under ferie. Ciri setter automatisk av 12% av brutto hver
                      måned slik at du unngår likviditetspresset i juni.
                    </p>
                    {/* Progress toward June payout */}
                    <div>
                      <div className="flex items-center justify-between text-[13px] mb-1">
                        <span className="text-muted-foreground">
                          Avsatt hittil ({new Date().toLocaleDateString("nb-NO", { month: "short" })})
                        </span>
                        <span className="font-medium tabular-nums">
                          kr {krFmt(totalFeriepenger > 0 ? totalFeriepenger : monthlyFeriepengerSetAside * (currentMonth + 1))} av
                          kr {krFmt(annualFeriepengerLiability)}
                        </span>
                      </div>
                      <Progress
                        value={annualFeriepengerLiability > 0
                          ? Math.round(((totalFeriepenger > 0 ? totalFeriepenger : monthlyFeriepengerSetAside * (currentMonth + 1)) / annualFeriepengerLiability) * 100)
                          : 0
                        }
                        className="h-1.5"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Right: Ciri activity timeline */}
              <div className="rounded-xl border bg-card overflow-hidden lg:self-start">
                <div className="px-4 py-3 border-b bg-muted/20">
                  <div className="flex items-center gap-2">
                    <ClockIcon className="size-3.5 text-muted-foreground" />
                    <h3 className="text-[13px] font-semibold">
                      Ciri-aktivitet
                    </h3>
                    <span className="text-[12px] text-muted-foreground ml-auto">
                      {completedSteps}/{totalSteps} fullført
                    </span>
                  </div>
                </div>
                <div className="p-3 max-h-[420px] overflow-y-auto">
                  <div className="relative">
                    <div className="absolute left-[11px] top-2 bottom-2 w-px bg-gradient-to-b from-emerald-400/60 via-[var(--primary)]/30 to-[var(--primary)]/15" />
                    <div className="space-y-0.5">
                      {payrollTimeline.map((event) => {
                        const Icon = event.icon;
                        const isScheduled = event.type === "scheduled";
                        return (
                          <div
                            key={event.id}
                            className="relative flex items-start gap-2.5 py-1.5 pl-0.5"
                          >
                            <div
                              className={cn(
                                "relative z-10 flex size-[22px] shrink-0 items-center justify-center rounded-full border bg-background",
                                isScheduled
                                  ? "border-dashed border-[var(--primary)]/40"
                                  : "border-emerald-400/60"
                              )}
                            >
                              <Icon
                                className={cn(
                                  "size-2.5",
                                  isScheduled
                                    ? "text-[var(--primary)]/60"
                                    : "text-emerald-600"
                                )}
                              />
                            </div>
                            <div className="flex-1 min-w-0 pt-0.5">
                              <p
                                className={cn(
                                  "text-[13px] leading-snug",
                                  isScheduled && "text-muted-foreground"
                                )}
                              >
                                {event.action}
                              </p>
                            </div>
                            <span className="text-[13px] text-muted-foreground tabular-nums shrink-0 pt-1">
                              {isScheduled
                                ? new Date(
                                    event.timestamp.replace(" ", "T")
                                  ).toLocaleDateString("nb-NO", {
                                    day: "numeric",
                                    month: "short",
                                  })
                                : event.timestamp.split(" ")[1]}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {/* Payroll preview/edit dialog */}
      {nextRun && (
        <PayrollPreviewDialog
          run={nextRun}
          open={previewOpen}
          onOpenChange={setPreviewOpen}
          isAutoMode={autonomyMode === "autonomous"}
        />
      )}

      <LearnMoreDocs sections={["lonn", "rapporter"]} />
    </div>
  );
}

// ============================================================================
// PAYROLL RUN CARD (used in Lønnskjøring tab)
// ============================================================================

function PayrollRunCard({
  run,
  isNext,
}: {
  run: PayrollRun;
  isNext?: boolean;
}) {
  return (
    <div className="rounded-xl border bg-card overflow-hidden">
      <div className="px-5 py-3 border-b bg-muted/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ReceiptIcon className="size-4 text-[var(--primary)]" />
            <h3 className="text-sm font-semibold">
              {run.month}
              {isNext && " — neste kjøring"}
            </h3>
          </div>
          <Badge
            variant="outline"
            className={cn(
              "text-[12px]",
              isNext
                ? "border-[var(--primary)]/30 text-[var(--primary)]"
                : "border-emerald-200 text-emerald-700"
            )}
          >
            {isNext ? "Klar til utbetaling" : "Fullført"}
          </Badge>
        </div>
      </div>
      <div className="p-5 space-y-4">
        {/* Per-employee breakdown */}
        <div className="rounded-lg border overflow-hidden">
          <div className="grid grid-cols-[1fr_100px_100px_100px] gap-4 px-4 py-2 bg-muted/20 text-[12px] uppercase tracking-wider text-muted-foreground font-semibold">
            <span>Ansatt</span>
            <span className="text-right">Brutto</span>
            <span className="text-right">Skattetrekk</span>
            <span className="text-right">Utbetalt</span>
          </div>
          <div className="divide-y divide-border/50">
            {run.lineItems.map((item) => (
              <div
                key={item.employeeId}
                className="grid grid-cols-[1fr_100px_100px_100px] gap-4 px-4 py-2.5"
              >
                <span className="text-[13px] font-medium truncate">
                  {item.employeeName}
                </span>
                <span className="text-[13px] tabular-nums text-right">
                  {krFmt(item.gross)}
                </span>
                <span className="text-[13px] tabular-nums text-right text-red-600 dark:text-red-400">
                  -{krFmt(item.skattetrekk)}
                </span>
                <span className="text-[13px] font-medium tabular-nums text-right">
                  {krFmt(item.net)}
                </span>
              </div>
            ))}
          </div>
          {/* Totals */}
          <div className="grid grid-cols-[1fr_100px_100px_100px] gap-4 px-4 py-2.5 border-t bg-muted/10">
            <span className="text-[13px] font-semibold">Sum</span>
            <span className="text-[13px] font-semibold tabular-nums text-right">
              {krFmt(run.totalGross)}
            </span>
            <span className="text-[13px] font-semibold tabular-nums text-right text-red-600 dark:text-red-400">
              -{krFmt(run.totalSkattetrekk)}
            </span>
            <span className="text-[13px] font-display font-bold tabular-nums text-right">
              {krFmt(run.totalNet)}
            </span>
          </div>
        </div>

        {/* Employer costs */}
        <div className="flex items-center gap-6 pt-2 border-t border-dashed border-border/60">
          <div className="flex items-center gap-2">
            <span className="text-[13px] text-muted-foreground">
              Arbeidsgiveravgift:
            </span>
            <span className="text-[13px] font-display font-semibold tabular-nums">
              kr {krFmt(run.totalArbeidsgiveravgift)}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[13px] text-muted-foreground">OTP:</span>
            <span className="text-[13px] font-display font-semibold tabular-nums">
              kr {krFmt(run.totalOtp)}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[13px] text-muted-foreground">
              Feriepenger:
            </span>
            <span className="text-[13px] font-display font-semibold tabular-nums">
              kr {krFmt(run.totalFeriepengerAccrual)}
            </span>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <span className="text-[13px] text-muted-foreground">
              Total kostnad:
            </span>
            <span className="text-[13px] font-display font-bold tabular-nums text-[var(--primary)]">
              kr {krFmt(run.totalCost)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
