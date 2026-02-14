"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import LearnMoreDocs from "@/components/learn-more-docs";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from "@/components/ui/tooltip";
import {
  PlusIcon,
  CheckCircle2Icon,
  CalendarIcon,
  ChevronRightIcon,
  SparklesIcon,
  UserIcon,
  SunIcon,
  SendIcon,
  UmbrellaIcon,
  BanknoteIcon,
  MailIcon,
  PhoneIcon,
  FileTextIcon,
  PencilIcon,
  DownloadIcon,
  AlertCircleIcon
} from "lucide-react";
import { cn } from "@/lib/utils";
import CiriLogo from "@/components/layout/ciri-logo";

interface Employee {
  id: string;
  name: string;
  position: string;
  email: string;
  phone: string;
  personnummer: string;
  salary: number;
  taxRate: number;
  taxTable: string;
  status: "active" | "vacation";
  employmentType: "fast" | "deltid";
  startDate: string;
  feriepenger: number;
  vacationDays: { used: number; total: number };
  bankAccount: string;
}

interface PayslipRecord {
  id: string;
  month: string;
  gross: number;
  net: number;
  date: string;
}

const employees: Employee[] = [
  {
    id: "1",
    name: "Henrik Berge",
    position: "Daglig leder",
    email: "henrik@firma.no",
    phone: "+47 912 34 567",
    personnummer: "150485 *****",
    salary: 65000,
    taxRate: 34,
    taxTable: "7100",
    status: "active",
    employmentType: "fast",
    startDate: "2020-03-01",
    feriepenger: 78000,
    vacationDays: { used: 5, total: 25 },
    bankAccount: "1234 56 *****"
  },
  {
    id: "2",
    name: "Maria Olsen",
    position: "Utvikler",
    email: "maria@firma.no",
    phone: "+47 923 45 678",
    personnummer: "220392 *****",
    salary: 55000,
    taxRate: 30,
    taxTable: "7100",
    status: "active",
    employmentType: "fast",
    startDate: "2021-08-15",
    feriepenger: 66000,
    vacationDays: { used: 8, total: 25 },
    bankAccount: "2345 67 *****"
  },
  {
    id: "3",
    name: "Erik Hansen",
    position: "Designer",
    email: "erik@firma.no",
    phone: "+47 934 56 789",
    personnummer: "080590 *****",
    salary: 52000,
    taxRate: 28,
    taxTable: "7100",
    status: "vacation",
    employmentType: "fast",
    startDate: "2022-01-10",
    feriepenger: 62400,
    vacationDays: { used: 12, total: 25 },
    bankAccount: "3456 78 *****"
  },
  {
    id: "4",
    name: "Sofie Nilsen",
    position: "Markedsfører",
    email: "sofie@firma.no",
    phone: "+47 945 67 890",
    personnummer: "121195 *****",
    salary: 48000,
    taxRate: 26,
    taxTable: "7100",
    status: "active",
    employmentType: "deltid",
    startDate: "2023-04-01",
    feriepenger: 57600,
    vacationDays: { used: 3, total: 15 },
    bankAccount: "4567 89 *****"
  }
];

const payslipHistory: PayslipRecord[] = [
  { id: "1", month: "Januar 2026", gross: 65000, net: 42900, date: "2026-01-25" },
  { id: "2", month: "Desember 2025", gross: 65000, net: 42900, date: "2025-12-23" },
  { id: "3", month: "November 2025", gross: 65000, net: 42900, date: "2025-11-25" }
];

// Employee Detail Dialog
function EmployeeDialog({ employee, children }: { employee: Employee; children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);

  const netSalary = employee.salary * (1 - employee.taxRate / 100);
  const arbeidsgiveravgift = employee.salary * 0.141;
  const otp = employee.salary * 0.02;
  const totalCost = employee.salary + arbeidsgiveravgift + otp;

  const initials = employee.name.split(" ").map(n => n[0]).join("");
  const employmentYears = Math.floor((new Date().getTime() - new Date(employee.startDate).getTime()) / (1000 * 60 * 60 * 24 * 365));

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader className="pb-4">
          <div className="flex items-start gap-4">
            <div className="flex size-14 shrink-0 items-center justify-center rounded-full bg-[var(--primary)]/10 font-display text-lg font-bold text-[var(--primary)]">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <DialogTitle className="font-display text-xl flex items-center gap-2">
                {employee.name}
                {employee.status === "vacation" && (
                  <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-400">
                    <SunIcon className="mr-1 size-3" />
                    På ferie
                  </Badge>
                )}
              </DialogTitle>
              <DialogDescription className="mt-1">
                {employee.position} · {employee.employmentType === "fast" ? "Fast ansatt" : "Deltid"} · {employmentYears > 0 ? `${employmentYears} år i bedriften` : "Nyansatt"}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Contact Info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-3 text-sm">
              <MailIcon className="size-4 text-muted-foreground" />
              <span className="truncate">{employee.email}</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <PhoneIcon className="size-4 text-muted-foreground" />
              <span>{employee.phone}</span>
            </div>
          </div>

          <Separator />

          {/* Salary Breakdown */}
          <div>
            <h4 className="text-sm font-medium mb-3">Lønnsdetaljer</h4>
            <div className="rounded-xl border bg-muted/30 p-4 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Bruttolønn</span>
                <span className="font-medium tabular-nums">kr {employee.salary.toLocaleString("nb-NO")}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Skattetrekk ({employee.taxRate}%)</span>
                <span className="tabular-nums text-red-600 dark:text-red-400">- kr {Math.round(employee.salary * employee.taxRate / 100).toLocaleString("nb-NO")}</span>
              </div>
              <Separator />
              <div className="flex justify-between">
                <span className="font-medium">Utbetalt</span>
                <span className="font-display text-lg font-bold tabular-nums">kr {Math.round(netSalary).toLocaleString("nb-NO")}</span>
              </div>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-3">
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">Arbeidsgiveravgift</p>
                <p className="font-medium tabular-nums">kr {Math.round(arbeidsgiveravgift).toLocaleString("nb-NO")}</p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">OTP (2%)</p>
                <p className="font-medium tabular-nums">kr {Math.round(otp).toLocaleString("nb-NO")}</p>
              </div>
            </div>

            <p className="mt-3 text-xs text-muted-foreground text-center">
              Total månedskostnad: <span className="font-medium text-foreground">kr {Math.round(totalCost).toLocaleString("nb-NO")}</span>
            </p>
          </div>

          <Separator />

          {/* Vacation & Feriepenger */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h4 className="text-sm font-medium mb-2">Feriedager</h4>
              <div className="flex items-baseline gap-1">
                <span className="font-display text-2xl font-bold">{employee.vacationDays.total - employee.vacationDays.used}</span>
                <span className="text-sm text-muted-foreground">av {employee.vacationDays.total} gjenstår</span>
              </div>
              <Progress
                value={(employee.vacationDays.used / employee.vacationDays.total) * 100}
                className="h-1.5 mt-2"
              />
            </div>
            <div>
              <h4 className="text-sm font-medium mb-2">Feriepenger</h4>
              <div className="flex items-baseline gap-1">
                <span className="font-display text-2xl font-bold">kr {(employee.feriepenger / 1000).toFixed(0)}k</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">Utbetales juni 2026</p>
            </div>
          </div>

          <Separator />

          {/* Recent Payslips */}
          <div>
            <h4 className="text-sm font-medium mb-3">Siste lønnslipper</h4>
            <div className="space-y-2">
              {payslipHistory.map((slip) => (
                <div
                  key={slip.id}
                  className="flex items-center justify-between rounded-lg border p-3 hover:bg-muted/30 transition-colors cursor-pointer group"
                >
                  <div className="flex items-center gap-3">
                    <FileTextIcon className="size-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">{slip.month}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(slip.date).toLocaleDateString("nb-NO")}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium tabular-nums">kr {slip.net.toLocaleString("nb-NO")}</span>
                    <DownloadIcon className="size-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter className="mt-6">
          <Button variant="outline" size="sm">
            <PencilIcon className="mr-2 size-4" />
            Rediger
          </Button>
          <DialogClose asChild>
            <Button size="sm">Lukk</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// API base URL
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// Types for API response
interface PersonnummerLookupResponse {
  personnummer_masked: string;
  name: string | null;
  first_name: string | null;
  last_name: string | null;
  tax_card_type: string;
  tax_table: string | null;
  tax_percentage: number | null;
  tax_municipality: string | null;
  has_frikort: boolean;
  frikort_amount: number | null;
  frikort_remaining: number | null;
  fetched_at: string;
  source: string;
}

// Add Employee Dialog with Ciri integration
function AddEmployeeDialog() {
  const [step, setStep] = useState<"input" | "fetching" | "confirm" | "error">("input");
  const [personnummer, setPersonnummer] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fetchedData, setFetchedData] = useState<PersonnummerLookupResponse | null>(null);

  // Form fields for confirm step
  const [position, setPosition] = useState("");
  const [salary, setSalary] = useState("");

  const handleFetch = async () => {
    if (personnummer.length >= 11) {
      setStep("fetching");
      setError(null);

      try {
        const response = await fetch(`${API_URL}/api/employees/lookup`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ personnummer: personnummer.replace(/\s/g, "") }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.detail || "Kunne ikke hente informasjon");
        }

        const data: PersonnummerLookupResponse = await response.json();
        setFetchedData(data);
        setStep("confirm");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Noe gikk galt");
        setStep("error");
      }
    }
  };

  const handleClose = () => {
    setIsOpen(false);
    setTimeout(() => {
      setStep("input");
      setPersonnummer("");
      setFetchedData(null);
      setError(null);
      setPosition("");
      setSalary("");
    }, 200);
  };

  const handleCreate = async () => {
    if (!fetchedData) return;

    try {
      const nameParts = fetchedData.name?.split(" ") || ["", ""];
      const firstName = fetchedData.first_name || nameParts[0] || "";
      const lastName = fetchedData.last_name || nameParts.slice(1).join(" ") || "";

      const response = await fetch(`${API_URL}/api/employees/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          personnummer: personnummer.replace(/\s/g, ""),
          first_name: firstName,
          last_name: lastName,
          position: position,
          monthly_salary: parseFloat(salary),
          start_date: new Date().toISOString().split("T")[0],
          tax_table: fetchedData.tax_table,
          tax_percentage: fetchedData.tax_percentage,
        }),
      });

      if (!response.ok) {
        throw new Error("Kunne ikke opprette ansatt");
      }

      handleClose();
      // In production, you would refresh the employee list here
    } catch (err) {
      setError(err instanceof Error ? err.message : "Noe gikk galt");
    }
  };

  const formatPersonnummer = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 11);
    if (digits.length > 6) {
      return `${digits.slice(0, 6)} ${digits.slice(6)}`;
    }
    return digits;
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <PlusIcon className="mr-2 size-4" />
          Legg til
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display">
            {step === "input" && "Legg til ansatt"}
            {step === "fetching" && "Henter informasjon..."}
            {step === "confirm" && "Bekreft ansatt"}
          </DialogTitle>
          <DialogDescription>
            {step === "input" && "Skriv inn fødselsnummer, så henter Ciri resten."}
            {step === "fetching" && "Ciri sjekker Skatteetaten"}
            {step === "confirm" && "Kontroller at informasjonen stemmer"}
          </DialogDescription>
        </DialogHeader>

        <AnimatePresence mode="wait">
          {step === "input" && (
            <motion.div
              key="input"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-4 py-4"
            >
              <div className="space-y-2">
                <Label htmlFor="personnummer">Fødselsnummer</Label>
                <Input
                  id="personnummer"
                  placeholder="DDMMÅÅ XXXXX"
                  value={formatPersonnummer(personnummer)}
                  onChange={(e) => setPersonnummer(e.target.value.replace(/\s/g, ""))}
                  className="font-mono text-lg tracking-wider"
                  maxLength={12}
                />
                <p className="text-xs text-muted-foreground">
                  11 siffer
                </p>
              </div>
            </motion.div>
          )}

          {step === "fetching" && (
            <motion.div
              key="fetching"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center py-12"
            >
              <div className="relative">
                <CiriLogo size="lg" />
                <motion.div
                  className="absolute -inset-3 rounded-full border-2 border-[var(--primary)]/20"
                  animate={{ scale: [1, 1.15, 1], opacity: [0.5, 0, 0.5] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                />
              </div>
              <p className="mt-4 text-sm text-muted-foreground">
                Henter skattekort og informasjon...
              </p>
            </motion.div>
          )}

          {step === "error" && (
            <motion.div
              key="error"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="py-8 text-center"
            >
              <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
                <AlertCircleIcon className="size-6 text-red-600 dark:text-red-400" />
              </div>
              <p className="mt-4 font-medium text-red-600 dark:text-red-400">
                {error}
              </p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => setStep("input")}
              >
                Prøv igjen
              </Button>
            </motion.div>
          )}

          {step === "confirm" && fetchedData && (
            <motion.div
              key="confirm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-4 py-4"
            >
              <div className="rounded-xl border bg-muted/30 p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-full bg-[var(--primary)]/10">
                    <UserIcon className="size-5 text-[var(--primary)]" />
                  </div>
                  <div>
                    <p className="font-medium">{fetchedData.name || "Ukjent navn"}</p>
                    <p className="text-sm text-muted-foreground">
                      {fetchedData.personnummer_masked}
                    </p>
                  </div>
                  {fetchedData.source === "mock" && (
                    <Badge variant="outline" className="ml-auto text-xs">
                      Testdata
                    </Badge>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2 border-t">
                  <div>
                    <p className="text-xs text-muted-foreground">Skattetrekk</p>
                    <p className="font-medium">{fetchedData.tax_percentage}%</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Tabelltrekk</p>
                    <p className="font-medium">{fetchedData.tax_table || "-"}</p>
                  </div>
                </div>

                {fetchedData.has_frikort && (
                  <div className="pt-2 border-t">
                    <p className="text-xs text-muted-foreground">Frikort</p>
                    <p className="font-medium">
                      kr {fetchedData.frikort_remaining?.toLocaleString("nb-NO")} gjenstår
                    </p>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="position">Stilling</Label>
                <Input
                  id="position"
                  placeholder="f.eks. Utvikler"
                  value={position}
                  onChange={(e) => setPosition(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="salary">Månedslønn</Label>
                <Input
                  id="salary"
                  placeholder="f.eks. 50000"
                  type="number"
                  value={salary}
                  onChange={(e) => setSalary(e.target.value)}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <DialogFooter>
          {step === "input" && (
            <>
              <DialogClose asChild>
                <Button variant="ghost">Avbryt</Button>
              </DialogClose>
              <Button onClick={handleFetch} disabled={personnummer.length < 11}>
                <SparklesIcon className="mr-2 size-4" />
                Hent info
              </Button>
            </>
          )}
          {step === "confirm" && (
            <>
              <Button variant="ghost" onClick={() => setStep("input")}>
                Tilbake
              </Button>
              <Button
                onClick={handleCreate}
                disabled={!position || !salary}
              >
                <CheckCircle2Icon className="mr-2 size-4" />
                Legg til
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Simple Employee Row
function EmployeeRow({ employee, index }: { employee: Employee; index: number }) {
  const initials = employee.name.split(" ").map(n => n[0]).join("");

  return (
    <EmployeeDialog employee={employee}>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.05 }}
        className="group flex items-center gap-4 py-4 border-b last:border-0 cursor-pointer hover:bg-muted/30 -mx-4 px-4 transition-colors"
      >
        <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[var(--primary)]/10 font-medium text-[var(--primary)] text-sm">
          {initials}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-medium truncate">{employee.name}</p>
            {employee.status === "vacation" && (
              <TooltipProvider delayDuration={0}>
                <Tooltip>
                  <TooltipTrigger>
                    <SunIcon className="size-4 text-amber-500" />
                  </TooltipTrigger>
                  <TooltipContent>På ferie</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
          <p className="text-sm text-muted-foreground truncate">{employee.position}</p>
        </div>

        <p className="font-medium tabular-nums text-right">
          kr {employee.salary.toLocaleString("nb-NO")}
        </p>

        <ChevronRightIcon className="size-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
      </motion.div>
    </EmployeeDialog>
  );
}

// Stat Card Component
function StatCard({
  icon: Icon,
  label,
  value,
  subtext,
  iconBg = "bg-[var(--primary)]/10",
  iconColor = "text-[var(--primary)]"
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  subtext?: string;
  iconBg?: string;
  iconColor?: string;
}) {
  return (
    <div className="flex items-center gap-4">
      <div className={cn("flex size-11 shrink-0 items-center justify-center rounded-xl", iconBg)}>
        <Icon className={cn("size-5", iconColor)} />
      </div>
      <div>
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="font-display text-xl font-bold">{value}</p>
        {subtext && <p className="text-xs text-muted-foreground">{subtext}</p>}
      </div>
    </div>
  );
}

export default function LonnPage() {
  const activeEmployees = employees.filter(e => e.status === "active");
  const totalSalary = activeEmployees.reduce((acc, emp) => acc + emp.salary, 0);
  const totalFeriepenger = employees.reduce((acc, emp) => acc + emp.feriepenger, 0);

  const nextPayroll = new Date("2026-02-25");
  const daysUntilPayroll = Math.ceil((nextPayroll.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));

  const ameldingSent = 1;

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
      >
        <h1 className="font-display text-3xl font-bold tracking-tight">Lønn</h1>
        <p className="text-muted-foreground mt-2">
          {employees.length} ansatte i bedriften
        </p>
      </motion.div>

      {/* Stats Row */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Card>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 sm:gap-4">
              <StatCard
                icon={CalendarIcon}
                label="Neste lønning"
                value={nextPayroll.toLocaleDateString("nb-NO", { day: "numeric", month: "short" })}
                subtext={`om ${daysUntilPayroll} dager`}
              />
              <StatCard
                icon={BanknoteIcon}
                label="Månedlig utbetaling"
                value={`kr ${totalSalary.toLocaleString("nb-NO")}`}
                iconBg="bg-emerald-100 dark:bg-emerald-900/30"
                iconColor="text-emerald-600 dark:text-emerald-400"
              />
              <StatCard
                icon={UmbrellaIcon}
                label="Opptjente feriepenger"
                value={`kr ${totalFeriepenger.toLocaleString("nb-NO")}`}
                iconBg="bg-sky-100 dark:bg-sky-900/30"
                iconColor="text-sky-600 dark:text-sky-400"
              />
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Employees */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-lg font-semibold">Ansatte</h2>
          <AddEmployeeDialog />
        </div>

        <Card>
          <CardContent className="p-4">
            {employees.map((employee, index) => (
              <EmployeeRow key={employee.id} employee={employee} index={index} />
            ))}
          </CardContent>
        </Card>
      </motion.div>

      {/* A-melding Progress */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4 mb-4">
              <div className="flex size-11 items-center justify-center rounded-xl bg-violet-100 dark:bg-violet-900/30">
                <SendIcon className="size-5 text-violet-600 dark:text-violet-400" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <p className="font-medium">A-meldinger 2026</p>
                  <span className="text-sm text-muted-foreground">{ameldingSent} av 12</span>
                </div>
              </div>
            </div>
            <Progress value={(ameldingSent / 12) * 100} className="h-2" />
            <div className="flex justify-between mt-2 text-xs text-muted-foreground">
              <span>Jan</span>
              <span>Jun</span>
              <span>Des</span>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Ciri Status */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="flex items-center gap-3 rounded-xl border bg-muted/30 p-4"
      >
        <CiriLogo size="sm" />
        <p className="flex-1 text-sm">
          <span className="font-medium">Ciri håndterer</span>
          <span className="text-muted-foreground"> A-melding, skattetrekk og feriepenger automatisk.</span>
        </p>
        <Badge variant="outline" className="shrink-0 border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-400">
          <CheckCircle2Icon className="mr-1 size-3" />
          Oppdatert
        </Badge>
      </motion.div>

      <LearnMoreDocs sections={["lonn", "rapporter"]} />
    </div>
  );
}
