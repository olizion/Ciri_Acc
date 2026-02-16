"use client";

import { useState, useMemo, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CheckCircle2Icon,
  PencilIcon,
  SparklesIcon,
  ChevronDownIcon,
  ShieldCheckIcon,
  LinkIcon,
  AlertTriangleIcon,
  FileTextIcon,
  ExternalLinkIcon,
  DownloadIcon,
  ImageIcon,
  UndoIcon,
  BuildingIcon,
  CalendarIcon,
  ReceiptIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import CiriLogo from "@/components/layout/ciri-logo";
import { formatCurrency } from "@/lib/currency-conversion";
import { getRevisionsForBilag } from "@/lib/bilag-store";
import { statusConfig, bilagTypeConfig, accountCodes, mvaCodes } from "../data/constants";
import CompanyLogo from "./company-logo";
import type { Bilag } from "../types";

// ── Account lookup ─────────────────────────────────

const ACCOUNT_NAMES: Record<string, string> = {
  "1200": "Maskiner og anlegg",
  "1280": "Kontormaskiner",
  "1500": "Kundefordringer",
  "1920": "Bankinnskudd",
  "2400": "Leverandørgjeld",
  "2700": "Utgående MVA, høy sats",
  "2701": "Utgående MVA, middels sats",
  "2702": "Utgående MVA, lav sats",
  "2706": "Utgående MVA, snudd avregning",
  "2710": "Inngående MVA, høy sats",
  "2711": "Inngående MVA, middels sats",
  "2712": "Inngående MVA, lav sats",
  "2715": "Inngående MVA, innførsel varer",
  "2716": "Inngående MVA, tjenester fra utlandet",
  "3000": "Salgsinntekter",
  "5000": "Lønn",
  "6300": "Leie lokaler",
  "6500": "Leie/lisens EDB-utstyr",
  "6540": "Programvare",
  "6800": "Kontorrekvisita",
  "6900": "Telefon",
  "7100": "Bilkostnader",
  "7140": "Reisekostnader",
  "7350": "Representasjon",
  "7500": "Forsikringer",
  "7700": "Annen driftskostnad",
};

function getAccountName(code: string): string {
  return ACCOUNT_NAMES[code] || `Konto ${code}`;
}

// MVA code → inngående/utgående account
const MVA_CODE_TO_ACCOUNT: Record<string, string | null> = {
  "1": "2710",
  "11": "2711",
  "13": "2712",
  "14": "2715",
  "15": "2715",
  "3": "2700",
  "31": "2701",
  "32": "2702",
  "0": null,
  "6": null,
  "81": "2715",
  "86": "2716",
  "91": "2710",
};

// ── Confidence Gauge (SVG ring) ────────────────────

function ConfidenceGauge({ confidence }: { confidence: number | undefined }) {
  const value = confidence ?? 0;
  const hasValue = confidence != null;

  const radius = 50;
  const circumference = 2 * Math.PI * radius;
  const progress = hasValue ? (value / 100) * circumference : 0;
  const remaining = circumference - progress;

  const color = !hasValue
    ? "hsl(var(--muted-foreground))"
    : value >= 90
      ? "#22c55e"
      : value >= 70
        ? "#f59e0b"
        : "#ef4444";

  const label = !hasValue
    ? "Ikke vurdert"
    : value >= 90
      ? "Høy sikkerhet"
      : value >= 70
        ? "Middels"
        : "Lav sikkerhet";

  return (
    <div className="flex flex-col items-center">
      <svg width="132" height="132" viewBox="0 0 132 132">
        {/* Background track */}
        <circle
          cx="66"
          cy="66"
          r={radius}
          fill="none"
          stroke="hsl(var(--muted) / 0.5)"
          strokeWidth="7"
        />
        {/* Progress arc */}
        {hasValue && (
          <circle
            cx="66"
            cy="66"
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth="7"
            strokeLinecap="round"
            strokeDasharray={`${progress} ${remaining}`}
            transform="rotate(-90 66 66)"
            style={{
              transition: "stroke-dasharray 0.7s ease-out",
              filter: `drop-shadow(0 0 6px ${color}30)`,
            }}
          />
        )}
        {/* Center value */}
        <text
          x="66"
          y="60"
          textAnchor="middle"
          dominantBaseline="central"
          fill="currentColor"
          className="text-foreground"
          fontSize="26"
          fontWeight="700"
          fontFamily="var(--font-display), system-ui"
        >
          {hasValue ? `${value}%` : "—"}
        </text>
        {/* Sublabel */}
        <text
          x="66"
          y="80"
          textAnchor="middle"
          fill="currentColor"
          className="text-muted-foreground"
          fontSize="11"
          fontWeight="500"
        >
          {label}
        </text>
      </svg>
    </div>
  );
}

// ── Journal Entry computation ──────────────────────

interface JournalEntry {
  type: "D" | "K";
  account: string;
  name: string;
  amount: number;
}

function computeJournalEntries(
  kontonummer: string,
  mvaKode: string,
  netAmount: number,
  mvaAmount: number,
  grossAmount: number,
): JournalEntry[] {
  const entries: JournalEntry[] = [];
  const isIncome = kontonummer.startsWith("3");
  const isReverseCharge = mvaKode === "81" || mvaKode === "86";

  if (isIncome) {
    entries.push({ type: "D", account: "1500", name: getAccountName("1500"), amount: grossAmount });
    entries.push({ type: "K", account: kontonummer, name: getAccountName(kontonummer), amount: netAmount });
    if (mvaAmount > 0) {
      const mvaAcct = MVA_CODE_TO_ACCOUNT[mvaKode] || "2700";
      entries.push({ type: "K", account: mvaAcct, name: getAccountName(mvaAcct), amount: mvaAmount });
    }
  } else if (isReverseCharge) {
    const reverseMva = Math.round(netAmount * 0.25 * 100) / 100;
    const inputAcct = mvaKode === "86" ? "2716" : "2715";
    entries.push({ type: "D", account: kontonummer, name: getAccountName(kontonummer), amount: netAmount });
    entries.push({ type: "D", account: inputAcct, name: getAccountName(inputAcct), amount: reverseMva });
    entries.push({ type: "K", account: "2706", name: getAccountName("2706"), amount: reverseMva });
    entries.push({ type: "K", account: "2400", name: getAccountName("2400"), amount: netAmount });
  } else {
    entries.push({ type: "D", account: kontonummer, name: getAccountName(kontonummer), amount: netAmount });
    if (mvaAmount > 0) {
      const mvaAcct = MVA_CODE_TO_ACCOUNT[mvaKode] || "2710";
      entries.push({ type: "D", account: mvaAcct, name: getAccountName(mvaAcct), amount: mvaAmount });
    }
    entries.push({ type: "K", account: "2400", name: getAccountName("2400"), amount: grossAmount });
  }

  return entries;
}

function JournalPreview({ entries }: { entries: JournalEntry[] }) {
  const totalDebit = entries
    .filter((e) => e.type === "D")
    .reduce((s, e) => s + e.amount, 0);
  const totalCredit = entries
    .filter((e) => e.type === "K")
    .reduce((s, e) => s + e.amount, 0);
  const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01;

  const fmt = (n: number) =>
    n.toLocaleString("nb-NO", { minimumFractionDigits: 0, maximumFractionDigits: 0 });

  return (
    <div className="rounded-lg border overflow-hidden">
      <div className="divide-y divide-border/50">
        {entries.map((entry, i) => (
          <div
            key={i}
            className="grid grid-cols-[32px_64px_1fr_100px] items-center gap-3 px-4 py-2.5"
          >
            <span
              className={cn(
                "font-mono text-sm font-bold text-center",
                entry.type === "D" ? "text-blue-600" : "text-orange-600",
              )}
            >
              {entry.type === "D" ? "D" : "K"}
            </span>
            <span className="font-mono text-sm text-muted-foreground">
              {entry.account}
            </span>
            <span className="truncate">{entry.name}</span>
            <span className="text-right font-mono tabular-nums font-medium">
              {fmt(entry.amount)}
            </span>
          </div>
        ))}
      </div>
      <div
        className={cn(
          "flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-t",
          isBalanced
            ? "bg-green-50/80 text-green-700 dark:bg-green-950/30 dark:text-green-400"
            : "bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-400",
        )}
      >
        {isBalanced ? (
          <>
            <CheckCircle2Icon className="size-4" />
            <span>
              Balanserer — D = K = kr {fmt(totalDebit)}
            </span>
          </>
        ) : (
          <>
            <AlertTriangleIcon className="size-4" />
            <span>
              Ubalansert — D: kr {fmt(totalDebit)} ≠ K: kr {fmt(totalCredit)}
            </span>
          </>
        )}
      </div>
    </div>
  );
}

// ── Decision Card ──────────────────────────────────

interface DecisionCardProps {
  label: string;
  displayValue: string;
  reasoning?: string;
  isOverridden: boolean;
  isEditing: boolean;
  onEdit: () => void;
  onReset: () => void;
  onCancel: () => void;
  disabled?: boolean;
  children?: React.ReactNode;
}

function DecisionCard({
  label,
  displayValue,
  reasoning,
  isOverridden,
  isEditing,
  onEdit,
  onReset,
  onCancel,
  disabled,
  children,
}: DecisionCardProps) {
  return (
    <div
      className={cn(
        "rounded-lg border p-4 transition-all",
        isOverridden &&
          "border-amber-300 bg-amber-50/50 dark:border-amber-800 dark:bg-amber-950/20",
        isEditing && "ring-2 ring-[var(--primary)]/30",
        !isEditing && !disabled && "hover:border-[var(--primary)]/40 hover:bg-[var(--primary)]/[0.02]",
      )}
    >
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          {label}
        </span>
        {isOverridden && !isEditing && (
          <Badge
            variant="outline"
            className="text-xs px-2 py-0.5 bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-900/40 dark:text-amber-400 dark:border-amber-700"
          >
            Overstyrt
          </Badge>
        )}
      </div>

      {isEditing ? (
        <div className="space-y-3">
          {children}
          <Button
            variant="ghost"
            size="sm"
            onClick={onCancel}
            className="text-sm text-muted-foreground"
          >
            Avbryt
          </Button>
        </div>
      ) : (
        <>
          <div className="flex items-center gap-3">
            <span className="font-mono text-base font-medium flex-1">{displayValue}</span>
          </div>
          {reasoning && (
            <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed">
              {reasoning}
            </p>
          )}

          {/* Edit / Reset buttons — prominent */}
          {!disabled && (
            <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border/50">
              <Button
                variant="outline"
                size="sm"
                onClick={onEdit}
                className="text-sm gap-1.5"
              >
                <PencilIcon className="size-3.5" />
                Endre {label.toLowerCase()}
              </Button>
              {isOverridden && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onReset}
                  className="text-sm text-amber-600 hover:text-amber-700 gap-1.5"
                >
                  <UndoIcon className="size-3.5" />
                  Tilbakestill til Ciri
                </Button>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ── Main Dialog ────────────────────────────────────

interface BilagDetailDialogProps {
  bilag: Bilag | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: (bilag: Bilag) => void;
  onApprove: (bilag: Bilag) => void;
  onManualPost: (bilag: Bilag) => void;
}

function BilagDetailDialog({
  bilag,
  open,
  onOpenChange,
  onComplete,
  onApprove,
  onManualPost,
}: BilagDetailDialogProps) {
  const [overrides, setOverrides] = useState<{
    kontonummer?: string;
    mvaKode?: string;
  }>({});
  const [editingField, setEditingField] = useState<"konto" | "mva" | null>(null);
  const [showAudit, setShowAudit] = useState(false);

  // Reset state when bilag changes
  useEffect(() => {
    setOverrides({});
    setEditingField(null);
    setShowAudit(false);
  }, [bilag?.id]);

  // Merge stored revisions (from MVA corrections)
  const mergedRevisjonslogg = useMemo(() => {
    if (!bilag) return [];
    const storedRevisions = getRevisionsForBilag(bilag.bilagsnummer);
    const all = [...bilag.revisjonslogg, ...storedRevisions];
    return all.sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
    );
  }, [bilag]);

  if (!bilag) return null;

  const status = statusConfig[bilag.status] ?? statusConfig.venter;
  const StatusIcon = status.icon;
  const type = bilagTypeConfig[bilag.bilagstype] ?? bilagTypeConfig.inngaende_faktura;

  // Effective values (user override or Ciri original)
  const effectiveKonto = overrides.kontonummer || bilag.kontonummer;
  const effectiveMvaKode = overrides.mvaKode || bilag.mvaKode;
  const effectiveMvaInfo =
    mvaCodes.find((k) => k.code === effectiveMvaKode) || mvaCodes[0];

  // Compute journal entries from effective values
  const journalEntries = computeJournalEntries(
    effectiveKonto,
    effectiveMvaKode,
    bilag.belopEksMva,
    bilag.mvaBelop,
    bilag.totalBelop,
  );

  // Build bilag with overrides for approval
  const bilagWithOverrides: Bilag = {
    ...bilag,
    ...(overrides.kontonummer && {
      kontonummer: overrides.kontonummer,
      kontonavn: getAccountName(overrides.kontonummer),
    }),
    ...(overrides.mvaKode && { mvaKode: overrides.mvaKode }),
  };

  // Per-field reasoning
  const accountReasoning = bilag.ciriExplanation
    ? bilag.ciriExplanation.length > 120
      ? bilag.ciriExplanation.slice(0, 120) + "…"
      : bilag.ciriExplanation
    : "Konto foreslått basert på fakturabeskrivelse";

  const mvaReasoning =
    effectiveMvaKode === "0" || effectiveMvaKode === "6"
      ? "Ingen MVA-fradrag for denne transaksjonen"
      : effectiveMvaKode === "86" || effectiveMvaKode === "81"
        ? "Snudd avregning — utenlandsk leverandør, MVA beregnes og føres som inngående og utgående"
        : `Standard MVA-behandling med ${effectiveMvaInfo.rate}% sats`;

  const isPosted = bilag.status === "bokfort";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="!w-[900px] !max-w-[900px] sm:!max-w-[900px] p-0 gap-0 overflow-hidden">
        {/* ── Header ────────────────────────────── */}
        <div className="flex items-center gap-4 px-6 pt-6 pb-4">
          <CompanyLogo
            domain={bilag.leverandorDomain}
            companyName={bilag.leverandor}
            size="lg"
          />
          <div className="flex-1 min-w-0">
            <DialogHeader className="space-y-1 text-left">
              <DialogTitle className="text-lg font-semibold truncate leading-tight">
                {bilag.leverandor}
              </DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground">
                #{bilag.bilagsnummer} · {type.label} ·{" "}
                {new Date(bilag.bilagsdato).toLocaleDateString("nb-NO", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </DialogDescription>
            </DialogHeader>
          </div>
          <Badge className={cn("border shrink-0 text-sm px-3 py-1", status.className)}>
            <StatusIcon className="mr-1.5 size-3.5" />
            {status.label}
          </Badge>
        </div>

        <ScrollArea className="max-h-[75vh]">
          <div className="px-6 pb-6 space-y-5">
            {/* ── Status banner ────────────────── */}
            {!isPosted && (
              <div
                className={cn(
                  "rounded-lg border p-4 flex items-start gap-3",
                  bilag.status === "trenger_gjennomgang" &&
                    "border-red-200 bg-red-50 dark:border-red-900/30 dark:bg-red-950/20",
                  bilag.status === "venter" &&
                    "border-amber-200 bg-amber-50 dark:border-amber-900/30 dark:bg-amber-950/20",
                  bilag.status === "venter_transaksjon" &&
                    "border-blue-200 bg-blue-50 dark:border-blue-900/30 dark:bg-blue-950/20",
                )}
              >
                <CiriLogo size="sm" className="shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-base font-medium">
                    {bilag.status === "trenger_gjennomgang" &&
                      "Jeg trenger din hjelp"}
                    {bilag.status === "venter" && "Klar for din godkjenning"}
                    {bilag.status === "venter_transaksjon" &&
                      "Venter på banktransaksjon"}
                  </p>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {bilag.ciriMessage || status.description}
                  </p>
                </div>
              </div>
            )}

            {/* ── Confidence + Amount ──────────── */}
            <div className="grid grid-cols-[auto_1fr] gap-5 items-center">
              <ConfidenceGauge confidence={bilag.ciriKonfidans} />

              <div className="rounded-lg border bg-gradient-to-br from-[var(--primary)]/[0.06] to-transparent p-5">
                <div className="font-display text-3xl font-bold tracking-tight">
                  kr {bilag.totalBelop.toLocaleString("nb-NO")}
                </div>
                <div className="mt-3 grid grid-cols-2 gap-x-6 gap-y-1.5 text-sm text-muted-foreground">
                  <span>Beløp eks. MVA</span>
                  <span className="text-right font-mono tabular-nums">
                    kr {bilag.belopEksMva.toLocaleString("nb-NO")}
                  </span>
                  <span>MVA ({bilag.mvaSats}%)</span>
                  <span className="text-right font-mono tabular-nums">
                    kr {bilag.mvaBelop.toLocaleString("nb-NO")}
                  </span>
                </div>

                {/* Currency conversion note */}
                {bilag.originalCurrency &&
                  bilag.originalCurrency !== "NOK" && (
                    <div className="mt-3 flex items-center gap-2 text-sm text-blue-600 bg-blue-50 rounded-md px-3 py-1.5 dark:bg-blue-950/30 dark:text-blue-400">
                      <span>
                        Konvertert fra{" "}
                        {formatCurrency(
                          bilag.originalAmount || 0,
                          bilag.originalCurrency,
                        )}
                      </span>
                      <span className="text-muted-foreground">
                        · Kurs {bilag.exchangeRate?.toFixed(4)}
                      </span>
                    </div>
                  )}
              </div>
            </div>

            {/* ── Supplier & Document Info ─────── */}
            <div className="rounded-lg border bg-muted/20 p-4">
              <div className="grid grid-cols-2 gap-x-6 gap-y-3">
                <div className="flex items-start gap-2.5">
                  <BuildingIcon className="size-4 text-muted-foreground mt-0.5 shrink-0" />
                  <div>
                    <span className="text-xs text-muted-foreground block">Leverandør</span>
                    <span className="text-sm font-medium">{bilag.leverandor}</span>
                    {bilag.leverandorOrgnr && (
                      <span className="text-xs text-muted-foreground block font-mono">
                        Org. {bilag.leverandorOrgnr}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-start gap-2.5">
                  <CalendarIcon className="size-4 text-muted-foreground mt-0.5 shrink-0" />
                  <div>
                    <span className="text-xs text-muted-foreground block">Datoer</span>
                    <span className="text-sm">
                      Bilagsdato:{" "}
                      {new Date(bilag.bilagsdato).toLocaleDateString("nb-NO", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </span>
                    <span className="text-xs text-muted-foreground block">
                      Registrert: {new Date(bilag.registreringsdato).toLocaleDateString("nb-NO")}
                    </span>
                  </div>
                </div>
                {(bilag.summary || bilag.beskrivelse) && (
                  <div className="col-span-2 flex items-start gap-2.5">
                    <ReceiptIcon className="size-4 text-muted-foreground mt-0.5 shrink-0" />
                    <div>
                      <span className="text-xs text-muted-foreground block">Beskrivelse</span>
                      <span className="text-sm">{bilag.summary || bilag.beskrivelse}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Original document */}
              {bilag.originalFilnavn && (
                <>
                  <Separator className="my-3" />
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      {bilag.originalFiltype?.includes("image") ? (
                        <ImageIcon className="size-4 text-muted-foreground" />
                      ) : (
                        <FileTextIcon className="size-4 text-muted-foreground" />
                      )}
                      <div>
                        <span className="text-sm">{bilag.originalFilnavn}</span>
                        <span className="text-xs text-muted-foreground ml-2">{bilag.originalFiltype}</span>
                      </div>
                    </div>
                    <div className="flex gap-1.5">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() =>
                          bilag.originalFilUrl &&
                          window.open(bilag.originalFilUrl, "_blank")
                        }
                        disabled={!bilag.originalFilUrl}
                      >
                        <ExternalLinkIcon className="size-3 mr-1.5" />
                        Vis
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => {
                          if (bilag.originalFilUrl && bilag.originalFilnavn) {
                            const a = document.createElement("a");
                            a.href = `${bilag.originalFilUrl}?download=true`;
                            a.download = bilag.originalFilnavn;
                            document.body.appendChild(a);
                            a.click();
                            document.body.removeChild(a);
                          }
                        }}
                        disabled={!bilag.originalFilUrl}
                      >
                        <DownloadIcon className="size-3 mr-1.5" />
                        Last ned
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* ── Ciri's full explanation ──────── */}
            {bilag.ciriExplanation && (
              <div className="flex items-start gap-3 rounded-lg border border-[var(--primary)]/20 bg-[var(--primary)]/[0.04] p-4">
                <SparklesIcon className="size-4 text-[var(--primary)] shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-[var(--primary)] mb-1">Ciri forklarer</p>
                  <p className="text-sm leading-relaxed text-foreground/70">
                    {bilag.ciriExplanation}
                  </p>
                </div>
              </div>
            )}

            {/* ── Ciri's Decisions ────────────── */}
            <div>
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
                <SparklesIcon className="size-3.5" />
                Ciri sine beslutninger
              </h3>
              <div className="space-y-3">
                {/* Account decision */}
                <DecisionCard
                  label="Konto"
                  displayValue={`${effectiveKonto} · ${getAccountName(effectiveKonto)}`}
                  reasoning={accountReasoning}
                  isOverridden={!!overrides.kontonummer}
                  isEditing={editingField === "konto"}
                  onEdit={() => setEditingField("konto")}
                  onReset={() =>
                    setOverrides((p) => ({ ...p, kontonummer: undefined }))
                  }
                  onCancel={() => setEditingField(null)}
                  disabled={isPosted}
                >
                  <Select
                    value={effectiveKonto}
                    onValueChange={(val) => {
                      setOverrides((p) => ({ ...p, kontonummer: val }));
                      setEditingField(null);
                    }}
                  >
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {accountCodes.map((a) => (
                        <SelectItem key={a.code} value={a.code}>
                          {a.code} · {a.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </DecisionCard>

                {/* MVA decision */}
                <DecisionCard
                  label="MVA-behandling"
                  displayValue={`Kode ${effectiveMvaKode} · ${effectiveMvaInfo.name}`}
                  reasoning={mvaReasoning}
                  isOverridden={!!overrides.mvaKode}
                  isEditing={editingField === "mva"}
                  onEdit={() => setEditingField("mva")}
                  onReset={() =>
                    setOverrides((p) => ({ ...p, mvaKode: undefined }))
                  }
                  onCancel={() => setEditingField(null)}
                  disabled={isPosted}
                >
                  <Select
                    value={effectiveMvaKode}
                    onValueChange={(val) => {
                      setOverrides((p) => ({ ...p, mvaKode: val }));
                      setEditingField(null);
                    }}
                  >
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {mvaCodes.map((m) => (
                        <SelectItem key={m.code} value={m.code}>
                          {m.code} · {m.name} ({m.rate}%)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </DecisionCard>
              </div>

              {/* Override responsibility disclaimer */}
              {(overrides.kontonummer || overrides.mvaKode) && (
                <div className="rounded-lg border border-amber-300 bg-amber-50/70 p-3.5 flex items-start gap-3 dark:border-amber-800 dark:bg-amber-950/30">
                  <AlertTriangleIcon className="size-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
                      Du har overstyrt Ciri sine forslag
                    </p>
                    <p className="text-sm text-amber-700 dark:text-amber-400 mt-0.5 leading-relaxed">
                      Ved å endre konto eller MVA-behandling tar du ansvar for at posteringen er korrekt
                      i henhold til norsk regnskapslov. Ciri kan ikke garantere riktigheten av manuelle endringer.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* ── Journal Preview ─────────────── */}
            <div>
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
                <FileTextIcon className="size-3.5" />
                Posteringsoversikt
              </h3>
              <JournalPreview entries={journalEntries} />
            </div>

            {/* ── Audit Trail (collapsible) ──── */}
            <div>
              <button
                onClick={() => setShowAudit(!showAudit)}
                className="flex items-center gap-2 w-full text-left text-sm text-muted-foreground hover:text-foreground transition-colors py-2"
              >
                <ChevronDownIcon
                  className={cn(
                    "size-4 transition-transform duration-200",
                    showAudit && "rotate-180",
                  )}
                />
                <span className="font-medium">Revisjonslogg</span>
                <Badge
                  variant="outline"
                  className="text-xs px-2 py-0 h-5"
                >
                  {mergedRevisjonslogg.length}
                </Badge>
              </button>
              {showAudit && (
                <div className="rounded-lg border divide-y divide-border/50 animate-in fade-in-0 slide-in-from-top-1 duration-200">
                  {mergedRevisjonslogg.map((entry, i) => (
                    <div
                      key={i}
                      className="flex items-start gap-3 p-3"
                    >
                      <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-muted mt-0.5">
                        {entry.bruker === "Ciri AI" ? (
                          <SparklesIcon className="size-3 text-[var(--primary)]" />
                        ) : (
                          <FileTextIcon className="size-3 text-muted-foreground" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium">{entry.handling}</p>
                        {entry.detaljer && (
                          <p className="text-sm text-muted-foreground">
                            {entry.detaljer}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground/70 mt-0.5">
                          {entry.bruker} ·{" "}
                          {new Date(entry.timestamp).toLocaleString("nb-NO")}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* ── Legal footer ────────────────── */}
            <div className="flex items-center gap-2 text-xs text-muted-foreground border-t pt-4">
              <ShieldCheckIcon className="size-4 text-[var(--primary)] shrink-0" />
              <span>
                Oppbevares til{" "}
                {new Date(bilag.oppbevaringsfrist).toLocaleDateString("nb-NO", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}{" "}
                iht. Bokføringsloven § 13
              </span>
            </div>
          </div>
        </ScrollArea>

        {/* ── Action bar ──────────────────────── */}
        <div className="flex items-center justify-between px-6 py-4 border-t bg-muted/30">
          <div className="flex items-center gap-2">
            {(overrides.kontonummer || overrides.mvaKode) && (
              <span className="text-xs text-amber-600 font-medium">
                {[overrides.kontonummer && "konto", overrides.mvaKode && "MVA"]
                  .filter(Boolean)
                  .join(" og ")}{" "}
                overstyrt
              </span>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Lukk
            </Button>
            {bilag.status === "trenger_gjennomgang" && (
              <Button onClick={() => onComplete(bilag)}>
                <PencilIcon className="mr-2 size-4" />
                Fullfør registrering
              </Button>
            )}
            {bilag.status === "venter" && (
              <Button
                onClick={() => onApprove(bilagWithOverrides)}
              >
                <CheckCircle2Icon className="mr-2 size-4" />
                Godkjenn og bokfør
              </Button>
            )}
            {bilag.status === "venter_transaksjon" && (
              <Button
                onClick={() => onManualPost(bilag)}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                <LinkIcon className="mr-2 size-4" />
                Koble til transaksjon
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default BilagDetailDialog;
