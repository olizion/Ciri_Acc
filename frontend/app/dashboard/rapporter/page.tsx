"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { API_BASE_URL, COMPANY_ID } from "@/lib/api";
import { useCrystallize } from "@/lib/use-crystallize";
import { motion } from "framer-motion";
import {
  TrendingUpIcon,
  TrendingDownIcon,
  ScaleIcon,
  BookOpenIcon,
  ClipboardCheckIcon,
  FileCodeIcon,
  DownloadIcon,
  ArrowRightIcon,
  CheckCircle2Icon,
  AlertCircleIcon,
  ClockIcon,
  SparklesIcon,
  ReceiptIcon,
  UsersIcon,
  CalendarIcon,
  ShieldCheckIcon,
  BanknoteIcon,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import CiriLogo from "@/components/layout/ciri-logo";

// ── Types ──

interface ReportCard {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  href: string;
  icon: LucideIcon;
  accentClass: string;
  iconBgClass: string;
  metric?: { label: string; value: string; trend?: "up" | "down" | "neutral" };
  status: "ready" | "attention" | "upcoming";
  statusLabel: string;
}

interface ApiResultatResponse {
  total_gross: number;
  total_mva: number;
  accounts: { account_code: string; total: number; bilag_count: number }[];
  by_category: Record<string, number>;
}

// ── Helpers ──

function krFmt(n: number): string {
  return Math.abs(n).toLocaleString("nb-NO", { maximumFractionDigits: 0 });
}

const containerVariants = { hidden: {}, visible: { transition: { staggerChildren: 0.06 } } };
const itemVariants = {
  hidden: { opacity: 0, y: 12 } as const,
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.23, 1, 0.32, 1] } } as const,
};

// ── Status Pill ──

function StatusPill({ status, label }: { status: ReportCard["status"]; label: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold",
        status === "ready" && "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
        status === "attention" && "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
        status === "upcoming" && "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
      )}
    >
      {status === "ready" && <CheckCircle2Icon className="size-3" />}
      {status === "attention" && <AlertCircleIcon className="size-3" />}
      {status === "upcoming" && <ClockIcon className="size-3" />}
      {label}
    </span>
  );
}

// ── Primary Report Card (large, with metric) ──

function PrimaryReportCard({ report }: { report: ReportCard }) {
  const Icon = report.icon;
  return (
    <Link href={report.href} className="group block">
      <div className="relative h-full rounded-xl border bg-card overflow-hidden transition-all duration-200 hover:shadow-lg hover:border-[var(--primary)]/30 hover:-translate-y-0.5">
        {/* Accent bar */}
        <div className={cn("absolute inset-x-0 top-0 h-[3px]", report.accentClass)} />

        <div className="p-5 pt-6 space-y-4">
          {/* Header row */}
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className={cn("flex size-10 items-center justify-center rounded-lg", report.iconBgClass)}>
                <Icon className="size-5" />
              </div>
              <div>
                <h3 className="text-[15px] font-semibold leading-tight group-hover:text-[var(--primary)] transition-colors">
                  {report.title}
                </h3>
                <p className="text-[12px] text-muted-foreground mt-0.5">{report.subtitle}</p>
              </div>
            </div>
            <StatusPill status={report.status} label={report.statusLabel} />
          </div>

          {/* Description */}
          <p className="text-[13px] text-muted-foreground leading-relaxed">
            {report.description}
          </p>

          {/* Metric preview */}
          {report.metric && (
            <div className="flex items-end justify-between pt-2 border-t border-border/50">
              <div>
                <p className="text-[11px] text-muted-foreground/70 uppercase tracking-wider font-semibold">
                  {report.metric.label}
                </p>
                <p className="text-xl font-display font-bold tabular-nums mt-0.5">
                  kr {report.metric.value}
                </p>
              </div>
              <ArrowRightIcon className="size-4 text-muted-foreground/40 group-hover:text-[var(--primary)] group-hover:translate-x-0.5 transition-all" />
            </div>
          )}

          {/* No metric — just arrow */}
          {!report.metric && (
            <div className="flex items-center justify-end pt-2 border-t border-border/50">
              <span className="text-[12px] text-muted-foreground/60 group-hover:text-[var(--primary)] transition-colors flex items-center gap-1">
                Vis rapport
                <ArrowRightIcon className="size-3 group-hover:translate-x-0.5 transition-transform" />
              </span>
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}

// ── Secondary Report Card (compact) ──

function SecondaryReportCard({ report }: { report: ReportCard }) {
  const Icon = report.icon;
  return (
    <Link href={report.href} className="group block">
      <div className="flex items-center gap-4 rounded-xl border bg-card px-4 py-3.5 transition-all duration-200 hover:shadow-md hover:border-[var(--primary)]/30 hover:-translate-y-0.5">
        <div className={cn("flex size-9 shrink-0 items-center justify-center rounded-lg", report.iconBgClass)}>
          <Icon className="size-4" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-[13px] font-semibold group-hover:text-[var(--primary)] transition-colors">
              {report.title}
            </h3>
            <StatusPill status={report.status} label={report.statusLabel} />
          </div>
          <p className="text-[12px] text-muted-foreground mt-0.5 truncate">{report.description}</p>
        </div>
        <ArrowRightIcon className="size-4 shrink-0 text-muted-foreground/30 group-hover:text-[var(--primary)] group-hover:translate-x-0.5 transition-all" />
      </div>
    </Link>
  );
}

// ── Quick Action Button ──

function QuickAction({
  icon: Icon,
  label,
  sublabel,
  href,
  onClick,
}: {
  icon: LucideIcon;
  label: string;
  sublabel: string;
  href?: string;
  onClick?: () => void;
}) {
  const inner = (
    <div className="group flex items-center gap-3 rounded-lg border border-dashed border-border/60 bg-muted/20 px-4 py-3 transition-all hover:border-[var(--primary)]/40 hover:bg-[var(--primary)]/[0.03] cursor-pointer">
      <div className="flex size-8 items-center justify-center rounded-md bg-[var(--primary)]/10">
        <Icon className="size-4 text-[var(--primary)]" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-medium">{label}</p>
        <p className="text-[11px] text-muted-foreground">{sublabel}</p>
      </div>
    </div>
  );

  if (href) return <Link href={href}>{inner}</Link>;
  return <button onClick={onClick} className="w-full text-left">{inner}</button>;
}

// ══════════════════════════════════════════════════════════════════
// MAIN PAGE
// ══════════════════════════════════════════════════════════════════

export default function RapporterPage() {
  // Fetch resultat data for live metrics
  const { data: resultatData, isLoading } = useQuery({
    queryKey: queryKeys.reports.resultat({ year: "2025", companyId: COMPANY_ID }),
    queryFn: async () => {
      const res = await fetch(
        `${API_BASE_URL}/api/reports/bilag/resultat?company_id=${COMPANY_ID}&year=2025`
      );
      if (!res.ok) return null;
      return res.json() as Promise<ApiResultatResponse>;
    },
  });

  const crystallize = useCrystallize(isLoading);

  // Compute live metrics
  const totalInntekter = useMemo(() => {
    if (!resultatData?.accounts) return 0;
    return resultatData.accounts
      .filter((a) => a.account_code >= "3000" && a.account_code < "4000")
      .reduce((s, a) => s + Math.abs(a.total), 0);
  }, [resultatData]);

  const totalKostnader = useMemo(() => {
    if (!resultatData?.accounts) return 0;
    return resultatData.accounts
      .filter((a) => a.account_code >= "4000" && a.account_code < "8000")
      .reduce((s, a) => s + Math.abs(a.total), 0);
  }, [resultatData]);

  const driftsresultat = totalInntekter - totalKostnader;
  const bilagCount = resultatData?.accounts.reduce((s, a) => s + a.bilag_count, 0) ?? 0;

  // ── Report definitions ──

  const primaryReports: ReportCard[] = [
    {
      id: "resultat",
      title: "Resultatregnskap",
      subtitle: "Inntekter og kostnader",
      description:
        "Oversikt over bedriftens inntekter og kostnader, brutt ned per konto og m\u00e5ned. Viser om du g\u00e5r med overskudd eller underskudd.",
      href: "/dashboard/resultat",
      icon: TrendingUpIcon,
      accentClass: "bg-gradient-to-r from-emerald-500 to-emerald-400",
      iconBgClass: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
      metric: {
        label: "Driftsresultat 2025",
        value: krFmt(driftsresultat),
        trend: driftsresultat >= 0 ? "up" : "down",
      },
      status: "ready",
      statusLabel: "Oppdatert",
    },
    {
      id: "balanse",
      title: "Balanse",
      subtitle: "Eiendeler, gjeld og egenkapital",
      description:
        "Viser hva bedriften eier, skylder og har igjen. Et \u00f8yeblikksbilde av den \u00f8konomiske stillingen p\u00e5 en gitt dato.",
      href: "/dashboard/balanse",
      icon: ScaleIcon,
      accentClass: "bg-gradient-to-r from-blue-500 to-blue-400",
      iconBgClass: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
      metric: {
        label: "Bokf\u00f8rte bilag",
        value: String(bilagCount),
      },
      status: "ready",
      statusLabel: "Oppdatert",
    },
    {
      id: "arsregnskap",
      title: "\u00c5rsregnskap",
      subtitle: "Fullstendig \u00e5rsoppgj\u00f8r",
      description:
        "Det endelige regnskapet for \u00e5ret \u2014 med sjekkliste, manglende bilag og klart for innsending til Altinn.",
      href: "/dashboard/arsregnskap",
      icon: ClipboardCheckIcon,
      accentClass: "bg-gradient-to-r from-[var(--primary)] to-[var(--primary)]/70",
      iconBgClass: "bg-[var(--primary)]/10 text-[var(--primary)]",
      status: "upcoming",
      statusLabel: "2025 ikke startet",
    },
  ];

  const secondaryReports: ReportCard[] = [
    {
      id: "hovedbok",
      title: "Hovedbok",
      subtitle: "",
      description: "Alle posteringer gruppert per konto med s\u00f8k og filtrering",
      href: "/dashboard/hovedbok",
      icon: BookOpenIcon,
      accentClass: "",
      iconBgClass: "bg-muted text-muted-foreground",
      status: "ready",
      statusLabel: "Oppdatert",
    },
    {
      id: "lonn",
      title: "L\u00f8nnsrapporter",
      subtitle: "",
      description: "L\u00f8nnskj\u00f8ringer, a-meldinger og feriepenger",
      href: "/dashboard/lonn",
      icon: UsersIcon,
      accentClass: "",
      iconBgClass: "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400",
      status: "ready",
      statusLabel: "Oppdatert",
    },
    {
      id: "mva",
      title: "MVA-oppgave",
      subtitle: "",
      description: "Termin\u00e5r oversikt og innrapportering av merverdiavgift",
      href: "/dashboard/rapporter",
      icon: ReceiptIcon,
      accentClass: "",
      iconBgClass: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
      status: "upcoming",
      statusLabel: "Kommer snart",
    },
  ];

  // ── SAF-T download handler ──
  const handleSaftDownload = async () => {
    const url = `${API_BASE_URL}/api/reports/saft/export?period_start=2025-01-01&period_end=2025-12-31`;
    const res = await fetch(url);
    if (!res.ok) {
      const err = await res.json();
      alert(err.message || "SAF-T-eksport feilet");
      return;
    }
    const blob = await res.blob();
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `SAF-T_2025-01-01_2025-12-31.xml`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <div className="mx-auto max-w-[1100px] space-y-8 pb-16">
      {/* ── Header ── */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-1"
      >
        <h1 className="font-display text-3xl font-bold tracking-tight">
          Rapporter
        </h1>
        <p className="text-[15px] text-muted-foreground">
          Alt regnskapet ditt samlet p\u00e5 \u00e9n plass. Velg en rapport for \u00e5 se detaljer.
        </p>
      </motion.div>

      {/* ── Ciri Status Banner ── */}
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="flex items-center gap-4 rounded-xl border border-emerald-200/60 dark:border-emerald-800/30 bg-gradient-to-r from-emerald-50/80 to-transparent dark:from-emerald-950/20 px-5 py-4"
      >
        <div className="relative shrink-0">
          <CiriLogo size="sm" />
          <span className="absolute -bottom-0.5 -right-0.5 flex size-2.5">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex size-2.5 rounded-full bg-emerald-500" />
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[13px] leading-snug">
            <span className="font-semibold">
              {bilagCount} bilag bokf\u00f8rt i 2025.
            </span>{" "}
            Resultatregnskap og balanse er oppdatert.{" "}
            {driftsresultat >= 0 ? (
              <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                Driftsresultat: kr {krFmt(driftsresultat)} i pluss.
              </span>
            ) : (
              <span className="text-amber-600 dark:text-amber-400 font-medium">
                Driftsresultat: kr {krFmt(driftsresultat)} i minus.
              </span>
            )}
          </p>
        </div>
        <ShieldCheckIcon className="size-5 text-emerald-500/60 shrink-0" />
      </motion.div>

      {/* ── Primary Reports Grid ── */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <div className="flex items-center gap-2 mb-4">
          <h2 className="text-[11px] uppercase tracking-[0.08em] font-semibold text-muted-foreground/60">
            Finansrapporter
          </h2>
          <div className="flex-1 h-px bg-border/50" />
        </div>

        <div className={cn("grid gap-4 sm:grid-cols-2 lg:grid-cols-3", crystallize(1))}>
          {primaryReports.map((report) => (
            <motion.div key={report.id} variants={itemVariants}>
              <PrimaryReportCard report={report} />
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* ── Secondary Reports ── */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <div className="flex items-center gap-2 mb-4">
          <h2 className="text-[11px] uppercase tracking-[0.08em] font-semibold text-muted-foreground/60">
            Andre rapporter
          </h2>
          <div className="flex-1 h-px bg-border/50" />
        </div>

        <div className={cn("grid gap-3 sm:grid-cols-2 lg:grid-cols-3", crystallize(2))}>
          {secondaryReports.map((report) => (
            <motion.div key={report.id} variants={itemVariants}>
              <SecondaryReportCard report={report} />
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* ── Quick Actions ── */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
      >
        <div className="flex items-center gap-2 mb-4">
          <h2 className="text-[11px] uppercase tracking-[0.08em] font-semibold text-muted-foreground/60">
            Hurtighandlinger
          </h2>
          <div className="flex-1 h-px bg-border/50" />
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <QuickAction
            icon={FileCodeIcon}
            label="Last ned SAF-T"
            sublabel="Standard revisjonsfil (XML) for 2025"
            onClick={handleSaftDownload}
          />
          <QuickAction
            icon={DownloadIcon}
            label="Eksporter resultat til Excel"
            sublabel="Resultatregnskap med alle kontoer"
            href="/dashboard/resultat"
          />
          <QuickAction
            icon={CalendarIcon}
            label="Forbered \u00e5rsoppgj\u00f8r"
            sublabel="Sjekkliste og manglende bilag"
            href="/dashboard/arsregnskap"
          />
        </div>
      </motion.div>

      {/* ── Footer: What is what ── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.35 }}
        className="rounded-xl border bg-muted/20 px-6 py-5"
      >
        <div className="flex items-start gap-3 mb-4">
          <SparklesIcon className="size-4 text-[var(--primary)] mt-0.5 shrink-0" />
          <div>
            <h3 className="text-[13px] font-semibold">Ny til regnskap?</h3>
            <p className="text-[12px] text-muted-foreground mt-0.5">
              Her er en kort guide til hva de ulike rapportene betyr.
            </p>
          </div>
        </div>
        <div className="grid gap-x-8 gap-y-3 sm:grid-cols-2 lg:grid-cols-3 pl-7">
          {[
            {
              term: "Resultatregnskap",
              def: "Viser om bedriften tjener eller taper penger i en periode. Inntekter minus kostnader.",
            },
            {
              term: "Balanse",
              def: "Et \u00f8yeblikksbilde av hva bedriften eier (eiendeler) og skylder (gjeld) p\u00e5 en dato.",
            },
            {
              term: "\u00c5rsregnskap",
              def: "Den offisielle oppsummeringen som sendes til Br\u00f8nn\u00f8ysund hvert \u00e5r.",
            },
            {
              term: "Hovedbok",
              def: "Detaljert logg over alle transaksjoner sortert per konto.",
            },
            {
              term: "SAF-T",
              def: "Standardfil som Skatteetaten kan be om ved kontroll. Ciri genererer den automatisk.",
            },
            {
              term: "MVA-oppgave",
              def: "Oversikt over moms du har krevd inn og betalt, som rapporteres annenhver m\u00e5ned.",
            },
          ].map((item) => (
            <div key={item.term}>
              <dt className="text-[12px] font-semibold">{item.term}</dt>
              <dd className="text-[11px] text-muted-foreground leading-snug mt-0.5">
                {item.def}
              </dd>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
