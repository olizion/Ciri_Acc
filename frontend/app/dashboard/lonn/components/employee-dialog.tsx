"use client";

import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import {
  SunIcon,
  MailIcon,
  PhoneIcon,
  PencilIcon,
  CameraIcon,
  Loader2Icon,
  CheckIcon,
  XIcon,
  UserIcon,
  BriefcaseIcon,
  BanknoteIcon,
  SaveIcon,
} from "lucide-react";
import type { Employee } from "../types";
import { payslipHistory } from "../data/payslips";
import { PayslipListItem } from "./payslip-list-item";
import { API_URL } from "../constants";

// ============================================================================
// PHONE FORMATTING — Norwegian format: XXX XX XXX
// ============================================================================

/** Format a phone string for display: "12345678" → "123 45 678" */
function formatPhone(value: string | undefined | null): string {
  if (!value) return "—";
  const digits = value.replace(/\D/g, "");
  if (digits.length === 0) return "—";
  // Handle +47 prefix
  const hasCountryCode = value.trim().startsWith("+47") || digits.startsWith("47") && digits.length > 8;
  const local = hasCountryCode ? digits.replace(/^47/, "") : digits;
  if (local.length <= 3) return local;
  if (local.length <= 5) return `${local.slice(0, 3)} ${local.slice(3)}`;
  return `${local.slice(0, 3)} ${local.slice(3, 5)} ${local.slice(5, 8)}`;
}

/** Format phone input as-you-type, stripping to digits and inserting spaces */
function formatPhoneInput(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 8);
  if (digits.length <= 3) return digits;
  if (digits.length <= 5) return `${digits.slice(0, 3)} ${digits.slice(3)}`;
  return `${digits.slice(0, 3)} ${digits.slice(3, 5)} ${digits.slice(5)}`;
}

/** Extract raw digits from a formatted phone string */
function phoneDigits(formatted: string): string {
  return formatted.replace(/\D/g, "");
}

interface EmployeeDialogProps {
  employee: Employee;
  children: React.ReactNode;
  onUpdated?: () => void | Promise<void>;
}

export function EmployeeDialog({ employee, children, onUpdated }: EmployeeDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<"view" | "edit">("view");
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Edit form state
  const [editFirstName, setEditFirstName] = useState("");
  const [editLastName, setEditLastName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editPosition, setEditPosition] = useState("");
  const [editSalary, setEditSalary] = useState("");
  const [editEmploymentType, setEditEmploymentType] = useState("");
  const [editPayDay, setEditPayDay] = useState("");
  const [editBankAccount, setEditBankAccount] = useState("");
  const [previewAvatar, setPreviewAvatar] = useState<string | null>(null);

  const netSalary = employee.salary * (1 - employee.taxRate / 100);
  const arbeidsgiveravgift = employee.salary * 0.141;
  const otp = employee.salary * 0.02;
  const totalCost = employee.salary + arbeidsgiveravgift + otp;

  const nameParts = employee.name.split(" ");
  const initials = nameParts.map((n) => n[0]).join("");
  const employmentYears = Math.floor(
    (new Date().getTime() - new Date(employee.startDate).getTime()) /
      (1000 * 60 * 60 * 24 * 365)
  );

  // Is this a DB employee (has UUID-style id)?
  const isDbEmployee = employee.id.includes("-");

  const enterEditMode = useCallback(() => {
    const parts = employee.name.split(" ");
    setEditFirstName(parts[0] || "");
    setEditLastName(parts.slice(1).join(" ") || "");
    setEditEmail(employee.email || "");
    setEditPhone(formatPhoneInput(employee.phone || ""));
    setEditPosition(employee.position);
    setEditSalary(String(employee.salary));
    setEditEmploymentType(employee.employmentType);
    setEditPayDay("15");
    setEditBankAccount(employee.bankAccount || "");
    setPreviewAvatar(null);
    setError(null);
    setMode("edit");
  }, [employee]);

  const handleSave = useCallback(async () => {
    if (!isDbEmployee) return;
    setIsSaving(true);
    setError(null);

    try {
      const res = await fetch(`${API_URL}/api/employees/${employee.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          first_name: editFirstName,
          last_name: editLastName,
          email: editEmail || null,
          phone: phoneDigits(editPhone) || null,
          position: editPosition,
          monthly_salary: parseFloat(editSalary),
          employment_type: editEmploymentType,
          pay_day: parseInt(editPayDay),
          bank_account: editBankAccount || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || "Kunne ikke oppdatere");
      }

      await onUpdated?.();
      setMode("view");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Noe gikk galt");
    } finally {
      setIsSaving(false);
    }
  }, [
    isDbEmployee, employee.id, editFirstName, editLastName, editEmail,
    editPhone, editPosition, editSalary, editEmploymentType, editPayDay,
    editBankAccount, onUpdated,
  ]);

  const handleAvatarUpload = useCallback(async (file: File) => {
    if (!isDbEmployee) return;
    setIsUploadingAvatar(true);

    // Show preview immediately
    const reader = new FileReader();
    reader.onload = (e) => setPreviewAvatar(e.target?.result as string);
    reader.readAsDataURL(file);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch(`${API_URL}/api/employees/${employee.id}/avatar`, {
        method: "PUT",
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || "Kunne ikke laste opp bilde");
      }

      await onUpdated?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Opplasting feilet");
      setPreviewAvatar(null);
    } finally {
      setIsUploadingAvatar(false);
    }
  }, [isDbEmployee, employee.id, onUpdated]);

  const handleClose = () => {
    setIsOpen(false);
    setTimeout(() => {
      setMode("view");
      setError(null);
      // Don't clear previewAvatar here — let it persist so the table row
      // shows the uploaded image until the parent re-renders with fresh data
    }, 200);
  };

  // Use preview if available, otherwise the prop from parent (which updates on fetchEmployees)
  const avatarSrc = previewAvatar || employee.avatarUrl;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) handleClose(); else setIsOpen(true); }}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-lg p-0 gap-0 overflow-hidden">
        <AnimatePresence mode="wait">
          {/* ================================================================
              VIEW MODE
              ================================================================ */}
          {mode === "view" && (
            <motion.div
              key="view"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.15 }}
            >
              <DialogHeader className="px-6 pt-6 pb-4">
                <div className="flex items-start gap-4">
                  {/* Avatar */}
                  <div className="relative group">
                    {avatarSrc ? (
                      <img
                        src={avatarSrc}
                        alt={employee.name}
                        className="size-14 shrink-0 rounded-full object-cover ring-2 ring-[var(--primary)]/10"
                      />
                    ) : (
                      <div className="flex size-14 shrink-0 items-center justify-center rounded-full bg-[var(--primary)]/10 font-display text-lg font-bold text-[var(--primary)]">
                        {initials}
                      </div>
                    )}
                    {isDbEmployee && (
                      <>
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          className="hidden"
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (f) handleAvatarUpload(f);
                            e.target.value = "";
                          }}
                        />
                        <button
                          onClick={() => fileInputRef.current?.click()}
                          className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50 opacity-0 transition-opacity group-hover:opacity-100"
                          disabled={isUploadingAvatar}
                        >
                          {isUploadingAvatar ? (
                            <Loader2Icon className="size-5 animate-spin text-white" />
                          ) : (
                            <CameraIcon className="size-5 text-white" />
                          )}
                        </button>
                      </>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <DialogTitle className="font-display text-xl flex items-center gap-2">
                      {employee.name}
                      {employee.status === "vacation" && (
                        <Badge
                          variant="outline"
                          className="border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-400"
                        >
                          <SunIcon className="mr-1 size-3" />
                          På ferie
                        </Badge>
                      )}
                    </DialogTitle>
                    <DialogDescription className="mt-1">
                      {employee.position} ·{" "}
                      {employee.employmentType === "fast" ? "Fast ansatt" : "Deltid"} ·{" "}
                      {employmentYears > 0 ? `${employmentYears} år i bedriften` : "Nyansatt"}
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>

              <div className="space-y-6 px-6 pb-2">
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-3 text-sm">
                    <MailIcon className="size-4 text-muted-foreground" />
                    <span className="truncate">{employee.email || "—"}</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <PhoneIcon className="size-4 text-muted-foreground" />
                    <span>{formatPhone(employee.phone)}</span>
                  </div>
                </div>

                <Separator />

                <div>
                  <h4 className="text-sm font-medium mb-3">Lønnsdetaljer</h4>
                  <div className="rounded-xl border bg-muted/30 p-4 space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Bruttolønn</span>
                      <span className="font-medium tabular-nums">
                        kr {employee.salary.toLocaleString("nb-NO")}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">
                        Skattetrekk ({employee.taxRate}%)
                      </span>
                      <span className="tabular-nums text-red-600 dark:text-red-400">
                        - kr{" "}
                        {Math.round(
                          (employee.salary * employee.taxRate) / 100
                        ).toLocaleString("nb-NO")}
                      </span>
                    </div>
                    <Separator />
                    <div className="flex justify-between">
                      <span className="font-medium">Utbetalt</span>
                      <span className="font-display text-lg font-bold tabular-nums">
                        kr {Math.round(netSalary).toLocaleString("nb-NO")}
                      </span>
                    </div>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-3">
                    <div className="rounded-lg border p-3">
                      <p className="text-xs text-muted-foreground">Arbeidsgiveravgift</p>
                      <p className="font-medium tabular-nums">
                        kr {Math.round(arbeidsgiveravgift).toLocaleString("nb-NO")}
                      </p>
                    </div>
                    <div className="rounded-lg border p-3">
                      <p className="text-xs text-muted-foreground">OTP (2%)</p>
                      <p className="font-medium tabular-nums">
                        kr {Math.round(otp).toLocaleString("nb-NO")}
                      </p>
                    </div>
                  </div>

                  <p className="mt-3 text-xs text-muted-foreground text-center">
                    Total månedskostnad:{" "}
                    <span className="font-medium text-foreground">
                      kr {Math.round(totalCost).toLocaleString("nb-NO")}
                    </span>
                  </p>
                </div>

                <Separator />

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="text-sm font-medium mb-2">Feriedager</h4>
                    <div className="flex items-baseline gap-1">
                      <span className="font-display text-2xl font-bold">
                        {employee.vacationDays.total - employee.vacationDays.used}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        av {employee.vacationDays.total} gjenstår
                      </span>
                    </div>
                    <Progress
                      value={
                        (employee.vacationDays.used / employee.vacationDays.total) * 100
                      }
                      className="h-1.5 mt-2"
                    />
                  </div>
                  <div>
                    <h4 className="text-sm font-medium mb-2">Feriepenger</h4>
                    <div className="flex items-baseline gap-1">
                      <span className="font-display text-2xl font-bold">
                        kr {(employee.feriepenger / 1000).toFixed(0)}k
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Utbetales juni 2026
                    </p>
                  </div>
                </div>

                <Separator />

                <div>
                  <h4 className="text-sm font-medium mb-3">Siste lønnslipper</h4>
                  <div className="space-y-2">
                    {payslipHistory.map((slip) => (
                      <PayslipListItem key={slip.id} slip={slip} />
                    ))}
                  </div>
                </div>
              </div>

              <DialogFooter className="border-t px-6 py-4">
                {isDbEmployee && (
                  <Button variant="outline" size="sm" onClick={enterEditMode}>
                    <PencilIcon className="mr-2 size-4" />
                    Rediger
                  </Button>
                )}
                <DialogClose asChild>
                  <Button size="sm">Lukk</Button>
                </DialogClose>
              </DialogFooter>
            </motion.div>
          )}

          {/* ================================================================
              EDIT MODE
              ================================================================ */}
          {mode === "edit" && (
            <motion.div
              key="edit"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <div className="border-b px-6 py-4">
                <div className="flex items-center gap-3">
                  <PencilIcon className="size-4 text-[var(--primary)]" />
                  <div>
                    <h2 className="font-display text-lg font-semibold tracking-tight">
                      Rediger ansatt
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      Oppdater informasjon for {employee.name}
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-5 px-6 py-5">
                {/* Avatar upload */}
                <div className="flex items-center gap-4">
                  <div className="relative group">
                    {avatarSrc ? (
                      <img
                        src={avatarSrc}
                        alt="Avatar"
                        className="size-16 rounded-full object-cover ring-2 ring-[var(--primary)]/10"
                      />
                    ) : (
                      <div className="flex size-16 items-center justify-center rounded-full bg-[var(--primary)]/10 font-display text-xl font-bold text-[var(--primary)]">
                        {initials}
                      </div>
                    )}
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) handleAvatarUpload(f);
                        e.target.value = "";
                      }}
                    />
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50 opacity-0 transition-opacity group-hover:opacity-100"
                      disabled={isUploadingAvatar}
                    >
                      {isUploadingAvatar ? (
                        <Loader2Icon className="size-5 animate-spin text-white" />
                      ) : (
                        <CameraIcon className="size-5 text-white" />
                      )}
                    </button>
                  </div>
                  <div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploadingAvatar}
                    >
                      <CameraIcon className="mr-2 size-3.5" />
                      {avatarSrc ? "Bytt bilde" : "Last opp bilde"}
                    </Button>
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      JPG, PNG eller WebP. Maks 5 MB.
                    </p>
                  </div>
                </div>

                <Separator />

                {/* Name */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="flex items-center gap-1.5 text-xs">
                      <UserIcon className="size-3 text-muted-foreground" />
                      Fornavn
                    </Label>
                    <Input
                      value={editFirstName}
                      onChange={(e) => setEditFirstName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="flex items-center gap-1.5 text-xs">
                      Etternavn
                    </Label>
                    <Input
                      value={editLastName}
                      onChange={(e) => setEditLastName(e.target.value)}
                    />
                  </div>
                </div>

                {/* Contact */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="flex items-center gap-1.5 text-xs">
                      <MailIcon className="size-3 text-muted-foreground" />
                      E-post
                    </Label>
                    <Input
                      type="email"
                      placeholder="navn@firma.no"
                      value={editEmail}
                      onChange={(e) => setEditEmail(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="flex items-center gap-1.5 text-xs">
                      <PhoneIcon className="size-3 text-muted-foreground" />
                      Telefon
                    </Label>
                    <Input
                      placeholder="XXX XX XXX"
                      value={editPhone}
                      onChange={(e) => setEditPhone(formatPhoneInput(e.target.value))}
                      maxLength={10}
                    />
                  </div>
                </div>

                <Separator />

                {/* Position + Employment type */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="flex items-center gap-1.5 text-xs">
                      <BriefcaseIcon className="size-3 text-muted-foreground" />
                      Stilling
                    </Label>
                    <Input
                      value={editPosition}
                      onChange={(e) => setEditPosition(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Ansettelsestype</Label>
                    <Select value={editEmploymentType} onValueChange={setEditEmploymentType}>
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
                </div>

                {/* Salary + Pay day + Bank */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1.5">
                    <Label className="flex items-center gap-1.5 text-xs">
                      <BanknoteIcon className="size-3 text-muted-foreground" />
                      Månedslønn
                    </Label>
                    <Input
                      type="number"
                      value={editSalary}
                      onChange={(e) => setEditSalary(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Lønnsdag</Label>
                    <Select value={editPayDay} onValueChange={setEditPayDay}>
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
                  <div className="space-y-1.5">
                    <Label className="text-xs">Bankkonto</Label>
                    <Input
                      placeholder="1234 56 78901"
                      value={editBankAccount}
                      onChange={(e) => setEditBankAccount(e.target.value)}
                    />
                  </div>
                </div>

                {error && (
                  <p className="text-sm text-red-500">{error}</p>
                )}
              </div>

              <div className="flex items-center justify-between border-t px-6 py-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => { setMode("view"); setError(null); }}
                >
                  <XIcon className="mr-2 size-4" />
                  Avbryt
                </Button>
                <Button
                  size="sm"
                  onClick={handleSave}
                  disabled={isSaving || !editFirstName.trim() || !editLastName.trim() || !editPosition.trim()}
                >
                  {isSaving ? (
                    <Loader2Icon className="mr-2 size-4 animate-spin" />
                  ) : (
                    <SaveIcon className="mr-2 size-4" />
                  )}
                  {isSaving ? "Lagrer..." : "Lagre endringer"}
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}
