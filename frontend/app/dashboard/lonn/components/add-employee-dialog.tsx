"use client";

import { useState } from "react";
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
  DialogClose
} from "@/components/ui/dialog";
import {
  PlusIcon,
  CheckCircle2Icon,
  SparklesIcon,
  UserIcon,
  AlertCircleIcon
} from "lucide-react";
import CiriLogo from "@/components/layout/ciri-logo";
import type { PersonnummerLookupResponse } from "../types";
import { API_URL } from "../constants";

export function AddEmployeeDialog() {
  const [step, setStep] = useState<"input" | "fetching" | "confirm" | "error">("input");
  const [personnummer, setPersonnummer] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fetchedData, setFetchedData] = useState<PersonnummerLookupResponse | null>(null);

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
