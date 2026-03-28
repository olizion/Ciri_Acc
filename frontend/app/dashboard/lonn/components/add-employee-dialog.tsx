"use client";

import { useState, useMemo, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  PlusIcon,
  CheckCircle2Icon,
  SparklesIcon,
  UserIcon,
  AlertCircleIcon,
  ShieldCheckIcon,
  TableIcon,
  PercentIcon,
  WalletIcon,
  BriefcaseIcon,
  CalendarIcon,
  BanknoteIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
  Loader2Icon,
  CameraIcon,
} from "lucide-react";
import CiriLogo from "@/components/layout/ciri-logo";
import type { PersonnummerLookupResponse } from "../types";
import { API_URL } from "../constants";

// ============================================================================
// TAX CARD TYPE DISPLAY CONFIG
// ============================================================================

const TAX_TYPE_CONFIG: Record<string, { label: string; color: string; icon: typeof TableIcon }> = {
  tabelltrekk: {
    label: "Tabelltrekk",
    color: "text-emerald-600 dark:text-emerald-400",
    icon: TableIcon,
  },
  prosenttrekk: {
    label: "Prosenttrekk",
    color: "text-blue-600 dark:text-blue-400",
    icon: PercentIcon,
  },
  frikort: {
    label: "Frikort",
    color: "text-amber-600 dark:text-amber-400",
    icon: WalletIcon,
  },
  ukjent: {
    label: "Ukjent",
    color: "text-muted-foreground",
    icon: ShieldCheckIcon,
  },
};

// ============================================================================
// SALARY PREVIEW COMPONENT
// ============================================================================

function SalaryPreview({
  monthly,
  taxPct,
}: {
  monthly: number;
  taxPct: number;
}) {
  const tax = monthly * (taxPct / 100);
  const net = monthly - tax;
  const aga = monthly * 0.141;
  const otp = monthly * 0.02;
  const totalCost = monthly + aga + otp;

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      className="overflow-hidden"
    >
      <div className="rounded-xl border border-dashed border-[var(--primary)]/20 bg-[var(--primary)]/[0.02] p-4">
        <p className="mb-3 text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
          Lønnsestimat
        </p>
        <div className="grid grid-cols-3 gap-3">
          <div className="min-w-0">
            <p className="text-[10px] leading-tight text-muted-foreground">Netto/mnd</p>
            <p className="mt-0.5 font-display text-base tabular-nums">
              {Math.round(net).toLocaleString("nb-NO")}
            </p>
          </div>
          <div className="min-w-0">
            <p className="text-[10px] leading-tight text-muted-foreground">Skattetrekk</p>
            <p className="mt-0.5 font-display text-base tabular-nums text-red-500/80">
              -{Math.round(tax).toLocaleString("nb-NO")}
            </p>
          </div>
          <div className="min-w-0">
            <p className="text-[10px] leading-tight text-muted-foreground">Arb.giver tot.</p>
            <p className="mt-0.5 font-display text-base tabular-nums">
              {Math.round(totalCost).toLocaleString("nb-NO")}
            </p>
          </div>
        </div>
        <div className="mt-3 flex items-center gap-2 text-[10px] text-muted-foreground">
          <span>AGA 14,1%: {Math.round(aga).toLocaleString("nb-NO")}</span>
          <span className="opacity-30">|</span>
          <span>OTP 2%: {Math.round(otp).toLocaleString("nb-NO")}</span>
        </div>
      </div>
    </motion.div>
  );
}

// ============================================================================
// SKATTEKORT CARD COMPONENT
// ============================================================================

function SkattekortCard({
  data,
  firstName,
  lastName,
  onFirstNameChange,
  onLastNameChange,
}: {
  data: PersonnummerLookupResponse;
  firstName: string;
  lastName: string;
  onFirstNameChange: (v: string) => void;
  onLastNameChange: (v: string) => void;
}) {
  const typeConfig = TAX_TYPE_CONFIG[data.tax_card_type] || TAX_TYPE_CONFIG.ukjent;
  const TypeIcon = typeConfig.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="relative overflow-hidden rounded-2xl border bg-gradient-to-br from-card via-card to-[var(--primary)]/[0.03]"
    >
      {/* Subtle pattern overlay */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.015]"
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)`,
          backgroundSize: "24px 24px",
        }}
      />

      {/* Header strip */}
      <div className="relative border-b bg-[var(--primary)]/[0.04] px-5 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheckIcon className="size-4 text-[var(--primary)]" />
            <span className="text-[11px] font-semibold uppercase tracking-[0.15em] text-[var(--primary)]">
              Skattekort {new Date().getFullYear()}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {data.source === "skatteetaten" ? (
              <Badge
                variant="outline"
                className="border-emerald-500/30 bg-emerald-500/5 text-[10px] text-emerald-600 dark:text-emerald-400"
              >
                <CheckCircle2Icon className="mr-1 size-3" />
                Verifisert
              </Badge>
            ) : (
              <Badge variant="outline" className="text-[10px]">
                Testdata
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="space-y-4 p-6">
        {/* Identity row */}
        <motion.div
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.15, duration: 0.4 }}
          className="flex items-start gap-4"
        >
          <div className="mt-1 flex size-12 shrink-0 items-center justify-center rounded-full bg-[var(--primary)]/10 ring-2 ring-[var(--primary)]/5">
            <UserIcon className="size-5 text-[var(--primary)]" />
          </div>
          <div className="min-w-0 flex-1 space-y-2">
            {data.name ? (
              <p className="truncate font-display text-lg font-semibold tracking-tight">
                {data.name}
              </p>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <Input
                  placeholder="Fornavn"
                  value={firstName}
                  onChange={(e) => onFirstNameChange(e.target.value)}
                  className="h-8 text-sm"
                />
                <Input
                  placeholder="Etternavn"
                  value={lastName}
                  onChange={(e) => onLastNameChange(e.target.value)}
                  className="h-8 text-sm"
                />
              </div>
            )}
            <p className="font-mono text-sm tracking-wider text-muted-foreground">
              {data.personnummer_masked}
            </p>
          </div>
        </motion.div>

        {/* Tax info grid */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, duration: 0.4 }}
          className="grid grid-cols-3 gap-3"
        >
          {/* Tax type */}
          <div className="rounded-xl bg-muted/40 px-4 py-3">
            <div className="mb-1.5 flex items-center gap-1.5">
              <TypeIcon className={`size-3.5 ${typeConfig.color}`} />
              <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                Type
              </p>
            </div>
            <p className={`font-display text-sm font-semibold ${typeConfig.color}`}>
              {typeConfig.label}
            </p>
          </div>

          {/* Table / Percentage */}
          {data.tax_table && (
            <div className="rounded-xl bg-muted/40 px-4 py-3">
              <div className="mb-1.5 flex items-center gap-1.5">
                <TableIcon className="size-3.5 text-muted-foreground" />
                <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                  Tabell
                </p>
              </div>
              <p className="font-display text-sm font-semibold">{data.tax_table}</p>
            </div>
          )}

          {data.tax_percentage != null && (
            <div className="rounded-xl bg-muted/40 px-4 py-3">
              <div className="mb-1.5 flex items-center gap-1.5">
                <PercentIcon className="size-3.5 text-muted-foreground" />
                <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                  Trekk
                </p>
              </div>
              <p className="font-display text-sm font-semibold">{data.tax_percentage}%</p>
            </div>
          )}

          {/* Municipality */}
          {data.tax_municipality && (
            <div className="rounded-xl bg-muted/40 px-4 py-3">
              <p className="mb-1.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                Kommune
              </p>
              <p className="font-display text-sm font-semibold">{data.tax_municipality}</p>
            </div>
          )}
        </motion.div>

        {/* Frikort section */}
        {data.has_frikort && data.frikort_amount && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35, duration: 0.4 }}
            className="rounded-xl border border-amber-500/20 bg-amber-500/[0.04] p-3"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <WalletIcon className="size-4 text-amber-600 dark:text-amber-400" />
                <span className="text-xs font-medium">Frikort</span>
              </div>
              <span className="font-display text-sm font-semibold">
                kr {data.frikort_remaining?.toLocaleString("nb-NO") ?? data.frikort_amount.toLocaleString("nb-NO")} gjenstår
              </span>
            </div>
            {data.frikort_remaining != null && data.frikort_amount > 0 && (
              <div className="mt-2">
                <div className="h-1.5 overflow-hidden rounded-full bg-amber-200/30 dark:bg-amber-900/30">
                  <motion.div
                    className="h-full rounded-full bg-amber-500/60"
                    initial={{ width: 0 }}
                    animate={{
                      width: `${Math.max(5, (data.frikort_remaining / data.frikort_amount) * 100)}%`,
                    }}
                    transition={{ delay: 0.5, duration: 0.8, ease: "easeOut" }}
                  />
                </div>
                <div className="mt-1 flex justify-between text-[10px] text-muted-foreground">
                  <span>Brukt: kr {(data.frikort_amount - data.frikort_remaining).toLocaleString("nb-NO")}</span>
                  <span>Totalt: kr {data.frikort_amount.toLocaleString("nb-NO")}</span>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </div>

      {/* Footer timestamp */}
      <div className="border-t bg-muted/20 px-5 py-2">
        <p className="text-[10px] text-muted-foreground">
          Hentet {new Date(data.fetched_at).toLocaleString("nb-NO", {
            day: "numeric",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })}
          {data.source === "skatteetaten" && " fra Skatteetaten"}
        </p>
      </div>
    </motion.div>
  );
}

// ============================================================================
// MAIN DIALOG
// ============================================================================

export function AddEmployeeDialog({ onEmployeeCreated }: { onEmployeeCreated?: () => void | Promise<void> } = {}) {
  const [step, setStep] = useState<"input" | "fetching" | "confirm" | "error">("input");
  const [personnummer, setPersonnummer] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fetchedData, setFetchedData] = useState<PersonnummerLookupResponse | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Employee name (editable — Folkeregisteret not enabled)
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");

  // Employment form fields
  const [position, setPosition] = useState("");
  const [salary, setSalary] = useState("");
  const [employmentType, setEmploymentType] = useState("fast");
  const [startDate, setStartDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [payDay, setPayDay] = useState("15");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const salaryNum = useMemo(() => parseFloat(salary) || 0, [salary]);
  const taxPct = useMemo(
    () => fetchedData?.tax_percentage ?? 30,
    [fetchedData]
  );

  const handleFetch = useCallback(async () => {
    const clean = personnummer.replace(/\s/g, "");
    if (clean.length < 11) return;

    setStep("fetching");
    setError(null);

    try {
      const response = await fetch(`${API_URL}/api/employees/lookup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ personnummer: clean }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Kunne ikke hente informasjon");
      }

      const data: PersonnummerLookupResponse = await response.json();
      setFetchedData(data);
      // Pre-populate name if available from Folkeregisteret
      if (data.first_name) setFirstName(data.first_name);
      if (data.last_name) setLastName(data.last_name);
      setStep("confirm");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Noe gikk galt");
      setStep("error");
    }
  }, [personnummer]);

  const handleClose = useCallback(() => {
    setIsOpen(false);
    setTimeout(() => {
      setStep("input");
      setPersonnummer("");
      setFetchedData(null);
      setError(null);
      setFirstName("");
      setLastName("");
      setPosition("");
      setSalary("");
      setEmploymentType("fast");
      setStartDate(new Date().toISOString().split("T")[0]);
      setPayDay("15");
      setAvatarFile(null);
      setAvatarPreview(null);
      setIsSubmitting(false);
    }, 200);
  }, []);

  const handleCreate = useCallback(async () => {
    if (!fetchedData || isSubmitting) return;
    setIsSubmitting(true);

    try {
      const response = await fetch(`${API_URL}/api/employees/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          personnummer: personnummer.replace(/\s/g, ""),
          first_name: firstName,
          last_name: lastName,
          position,
          employment_type: employmentType,
          monthly_salary: salaryNum,
          start_date: startDate,
          pay_day: parseInt(payDay),
          tax_card_type: fetchedData.tax_card_type,
          tax_table: fetchedData.tax_table,
          tax_percentage: fetchedData.tax_percentage,
          tax_municipality: fetchedData.tax_municipality,
          frikort_amount: fetchedData.frikort_amount,
        }),
      });

      const resData = await response.json();
      if (!response.ok) {
        throw new Error(resData.detail || "Kunne ikke opprette ansatt");
      }

      // Upload avatar if selected
      if (avatarFile && resData.id) {
        const formData = new FormData();
        formData.append("file", avatarFile);
        await fetch(`${API_URL}/api/employees/${resData.id}/avatar`, {
          method: "PUT",
          body: formData,
        });
      }

      await onEmployeeCreated?.();
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Noe gikk galt");
      setIsSubmitting(false);
    }
  }, [fetchedData, isSubmitting, personnummer, firstName, lastName, position, employmentType, salaryNum, startDate, payDay, avatarFile, onEmployeeCreated, handleClose]);

  const formatPersonnummer = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 11);
    if (digits.length > 6) {
      return `${digits.slice(0, 6)} ${digits.slice(6)}`;
    }
    return digits;
  };

  const canSubmit = firstName.trim() && lastName.trim() && position.trim() && salaryNum > 0 && !isSubmitting;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <PlusIcon className="mr-2 size-4" />
          Legg til
        </Button>
      </DialogTrigger>
      <DialogContent
        className={
          step === "confirm"
            ? "sm:max-w-[800px] p-0 gap-0 overflow-hidden"
            : "sm:max-w-md"
        }
      >
        <AnimatePresence mode="wait">
          {/* ================================================================
              STEP 1: PERSONNUMMER INPUT
              ================================================================ */}
          {step === "input" && (
            <motion.div
              key="input"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              <DialogHeader className="px-6 pt-6">
                <DialogTitle className="font-display">Legg til ansatt</DialogTitle>
                <DialogDescription>
                  Skriv inn fødselsnummer, så henter Ciri skattekort fra Skatteetaten.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 px-6 py-6">
                <div className="space-y-2">
                  <Label htmlFor="personnummer" className="text-xs font-medium">
                    Fødselsnummer
                  </Label>
                  <Input
                    id="personnummer"
                    placeholder="DDMMÅÅ XXXXX"
                    value={formatPersonnummer(personnummer)}
                    onChange={(e) => setPersonnummer(e.target.value.replace(/\s/g, ""))}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && personnummer.replace(/\s/g, "").length >= 11) {
                        handleFetch();
                      }
                    }}
                    className="h-12 font-mono text-xl tracking-[0.2em]"
                    maxLength={12}
                    autoFocus
                  />
                  <p className="text-[11px] text-muted-foreground">
                    11 siffer — skatteinfo hentes automatisk
                  </p>
                </div>
              </div>

              <DialogFooter className="border-t px-6 py-4">
                <Button variant="ghost" onClick={handleClose}>
                  Avbryt
                </Button>
                <Button
                  onClick={handleFetch}
                  disabled={personnummer.replace(/\s/g, "").length < 11}
                >
                  <SparklesIcon className="mr-2 size-4" />
                  Hent skattekort
                </Button>
              </DialogFooter>
            </motion.div>
          )}

          {/* ================================================================
              STEP 2: FETCHING ANIMATION
              ================================================================ */}
          {step === "fetching" && (
            <motion.div
              key="fetching"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center px-6 py-16"
            >
              <div className="relative">
                <CiriLogo size="lg" animated intensity="dramatic" showPulseRings />
              </div>
              <motion.p
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="mt-6 text-sm text-muted-foreground"
              >
                Kobler til Skatteetaten...
              </motion.p>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.8 }}
                className="mt-2 flex items-center gap-1.5 text-[11px] text-muted-foreground/60"
              >
                <ShieldCheckIcon className="size-3" />
                <span>Maskinporten-autentisert</span>
              </motion.div>
            </motion.div>
          )}

          {/* ================================================================
              STEP 3: ERROR
              ================================================================ */}
          {step === "error" && (
            <motion.div
              key="error"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="px-6 py-12 text-center"
            >
              <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
                <AlertCircleIcon className="size-7 text-red-600 dark:text-red-400" />
              </div>
              <p className="mt-4 font-display font-medium text-red-600 dark:text-red-400">
                Kunne ikke hente skattekort
              </p>
              <p className="mt-1 text-sm text-muted-foreground">{error}</p>
              <div className="mt-6 flex justify-center gap-3">
                <Button variant="ghost" onClick={handleClose}>
                  Avbryt
                </Button>
                <Button variant="outline" onClick={() => setStep("input")}>
                  <ArrowLeftIcon className="mr-2 size-4" />
                  Prøv igjen
                </Button>
              </div>
            </motion.div>
          )}

          {/* ================================================================
              STEP 4: CONFIRM — THE MAIN EVENT
              ================================================================ */}
          {step === "confirm" && fetchedData && (
            <motion.div
              key="confirm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              {/* Header */}
              <div className="border-b px-6 py-4">
                <div className="flex items-center gap-3">
                  <div className="flex size-8 items-center justify-center rounded-full bg-emerald-500/10">
                    <CheckCircle2Icon className="size-4 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div>
                    <h2 className="font-display text-lg font-semibold tracking-tight">
                      Skattekort hentet
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      Fyll ut ansettelsesdetaljer for å fullføre
                    </p>
                  </div>
                </div>
              </div>

              {/* Two-column layout */}
              <div className="grid sm:grid-cols-2 divide-y sm:divide-x sm:divide-y-0">
                {/* Left: Tax card */}
                <div className="p-6">
                  <SkattekortCard
                    data={fetchedData}
                    firstName={firstName}
                    lastName={lastName}
                    onFirstNameChange={setFirstName}
                    onLastNameChange={setLastName}
                  />
                </div>

                {/* Right: Employment form */}
                <div className="space-y-4 p-6">
                  <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="space-y-4"
                  >
                    {/* Avatar upload */}
                    <div className="flex items-center gap-3">
                      <input
                        ref={avatarInputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        className="hidden"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) {
                            setAvatarFile(f);
                            const reader = new FileReader();
                            reader.onload = (ev) => setAvatarPreview(ev.target?.result as string);
                            reader.readAsDataURL(f);
                          }
                          e.target.value = "";
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => avatarInputRef.current?.click()}
                        className="group relative flex size-12 shrink-0 items-center justify-center rounded-full bg-muted/60 ring-2 ring-border/50 transition-colors hover:bg-muted overflow-hidden"
                      >
                        {avatarPreview ? (
                          <img src={avatarPreview} alt="" className="size-full object-cover" />
                        ) : (
                          <CameraIcon className="size-5 text-muted-foreground group-hover:text-foreground transition-colors" />
                        )}
                      </button>
                      <div className="min-w-0">
                        <button
                          type="button"
                          onClick={() => avatarInputRef.current?.click()}
                          className="text-xs font-medium text-[var(--primary)] hover:underline"
                        >
                          {avatarPreview ? "Bytt bilde" : "Legg til profilbilde"}
                        </button>
                        <p className="text-[10px] text-muted-foreground">Valgfritt. JPG, PNG, WebP.</p>
                      </div>
                    </div>

                    {/* Position */}
                    <div className="space-y-1.5">
                      <Label htmlFor="position" className="flex items-center gap-1.5 text-xs">
                        <BriefcaseIcon className="size-3 text-muted-foreground" />
                        Stilling
                      </Label>
                      <Input
                        id="position"
                        placeholder="f.eks. Utvikler, Regnskapsfører"
                        value={position}
                        onChange={(e) => setPosition(e.target.value)}
                        autoFocus
                      />
                    </div>

                    {/* Salary + Pay day */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label htmlFor="salary" className="flex items-center gap-1.5 text-xs">
                          <BanknoteIcon className="size-3 text-muted-foreground" />
                          Månedslønn (brutto)
                        </Label>
                        <div className="relative">
                          <Input
                            id="salary"
                            placeholder="50 000"
                            type="number"
                            value={salary}
                            onChange={(e) => setSalary(e.target.value)}
                            className="pr-10"
                          />
                          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                            kr
                          </span>
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="flex items-center gap-1.5 text-xs">
                          <BanknoteIcon className="size-3 text-muted-foreground" />
                          Lønnsdag
                        </Label>
                        <Select value={payDay} onValueChange={setPayDay}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {[1, 5, 10, 12, 15, 20, 25, 28].map((d) => (
                              <SelectItem key={d} value={String(d)}>
                                {d}. hver mnd
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Employment type + Start date */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label className="flex items-center gap-1.5 text-xs">
                          <UserIcon className="size-3 text-muted-foreground" />
                          Ansettelsestype
                        </Label>
                        <Select value={employmentType} onValueChange={setEmploymentType}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="fast">Fast</SelectItem>
                            <SelectItem value="deltid">Deltid</SelectItem>
                            <SelectItem value="vikar">Vikar</SelectItem>
                            <SelectItem value="laerling">Lærling</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="startDate" className="flex items-center gap-1.5 text-xs">
                          <CalendarIcon className="size-3 text-muted-foreground" />
                          Startdato
                        </Label>
                        <Input
                          id="startDate"
                          type="date"
                          value={startDate}
                          onChange={(e) => setStartDate(e.target.value)}
                        />
                      </div>
                    </div>

                    {/* Salary preview */}
                    {salaryNum > 0 && (
                      <SalaryPreview monthly={salaryNum} taxPct={taxPct} />
                    )}
                  </motion.div>
                </div>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between border-t px-6 py-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setStep("input");
                    setFetchedData(null);
                  }}
                >
                  <ArrowLeftIcon className="mr-2 size-4" />
                  Tilbake
                </Button>

                <div className="flex items-center gap-2">
                  {error && (
                    <p className="text-xs text-red-500">{error}</p>
                  )}
                  <Button onClick={handleCreate} disabled={!canSubmit}>
                    {isSubmitting ? (
                      <Loader2Icon className="mr-2 size-4 animate-spin" />
                    ) : (
                      <CheckCircle2Icon className="mr-2 size-4" />
                    )}
                    {isSubmitting ? "Oppretter..." : "Legg til ansatt"}
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}
