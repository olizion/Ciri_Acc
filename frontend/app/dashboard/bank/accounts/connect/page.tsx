"use client";

import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  CheckIcon,
  SearchIcon,
  ShieldCheckIcon,
  LockIcon,
  ExternalLinkIcon,
  BuildingIcon,
  CreditCardIcon,
  SparklesIcon,
  RefreshCwIcon,
  AlertCircleIcon,
  Loader2Icon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { API_BASE_URL } from "@/lib/api";
import CiriLogo from "@/components/layout/ciri-logo";
import Image from "next/image";

// ============================================================================
// TYPES
// ============================================================================

interface Bank {
  id: string;
  name: string;
  bic?: string;
  logo_url: string;
  popular: boolean;
  market_share?: number;
  description?: string;
  primary_color?: string;
}

interface BankAccount {
  id: string;
  name: string;
  account_number: string;
  balance: number;
  currency: string;
  type: "current" | "savings" | "credit";
}

type WizardStep = "select-bank" | "authorize" | "select-accounts" | "configure" | "complete";

// ============================================================================
// API Functions
// ============================================================================

/**
 * Fetch available banks from the backend API.
 * Uses Tink Open Banking (via Visa) for Norwegian bank connections.
 */
async function fetchBanks(): Promise<Bank[]> {
  const response = await fetch(`${API_BASE_URL}/api/bank/banks`);
  if (!response.ok) {
    throw new Error("Kunne ikke hente banker");
  }
  const data = await response.json();
  return data.map((bank: BankAPIResponse) => ({
    id: bank.id,
    name: bank.name,
    bic: bank.bic,
    logo_url: bank.logo_url,
    popular: bank.is_popular,
    market_share: bank.market_share,
    description: bank.description,
    primary_color: bank.primary_color,
  }));
}

interface BankAPIResponse {
  id: string;
  name: string;
  bic?: string;
  logo_url?: string;
  primary_color?: string;
  market_share?: number;
  description?: string;
  is_popular: boolean;
}

interface ConnectBankResponse {
  session_id: string;
  authorization_url: string;
}

/**
 * Start bank connection via Tink Open Banking.
 * Returns authorization URL for user to authenticate with BankID.
 */
async function startBankConnection(bankId: string): Promise<ConnectBankResponse> {
  const response = await fetch(`${API_BASE_URL}/api/bank/accounts/connect`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      bank_id: bankId,
      account_name: "Driftskonto",
      konto_number: "1920",
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || "Kunne ikke starte banktilkobling");
  }

  return response.json();
}

// Fallback banks for when API is unavailable (e.g., development without backend)
const fallbackBanks: Bank[] = [
  {
    id: "tink",
    name: "Tink (Alle banker)",
    logo_url: "/images/banks/tink.svg",
    popular: true,
    market_share: 100,
    description: "Koble til alle norske banker via Tink",
    primary_color: "#0055FF",
  },
];

const mockAccounts: BankAccount[] = [
  { id: "acc1", name: "Driftskonto", account_number: "1234.56.78901", balance: 847293.50, currency: "NOK", type: "current" },
  { id: "acc2", name: "Skattetrekk", account_number: "1234.56.78902", balance: 156000, currency: "NOK", type: "current" },
  { id: "acc3", name: "Sparekonto", account_number: "1234.56.78903", balance: 500000, currency: "NOK", type: "savings" },
];

// ============================================================================
// COMPONENTS
// ============================================================================

function StepIndicator({
  steps,
  currentStep,
}: {
  steps: { id: WizardStep; label: string }[];
  currentStep: WizardStep;
}) {
  const currentIndex = steps.findIndex((s) => s.id === currentStep);

  return (
    <div className="flex items-center justify-center gap-2">
      {steps.map((step, index) => {
        const isCompleted = index < currentIndex;
        const isCurrent = step.id === currentStep;

        return (
          <div key={step.id} className="flex items-center gap-2">
            <div className="flex items-center gap-2">
              <motion.div
                animate={{
                  scale: isCurrent ? 1 : 0.9,
                  backgroundColor: isCompleted || isCurrent ? "var(--primary)" : "var(--muted)",
                }}
                className={cn(
                  "flex size-8 items-center justify-center rounded-full text-sm font-medium transition-colors",
                  isCompleted || isCurrent ? "text-white" : "text-muted-foreground"
                )}
              >
                {isCompleted ? <CheckIcon className="size-4" /> : index + 1}
              </motion.div>
              <span className={cn(
                "text-sm hidden sm:block",
                isCurrent ? "font-medium text-foreground" : "text-muted-foreground"
              )}>
                {step.label}
              </span>
            </div>
            {index < steps.length - 1 && (
              <div className={cn(
                "w-8 sm:w-12 h-0.5 rounded-full",
                index < currentIndex ? "bg-[var(--primary)]" : "bg-muted"
              )} />
            )}
          </div>
        );
      })}
    </div>
  );
}

function BankCard({
  bank,
  selected,
  onClick,
}: {
  bank: Bank;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <motion.button
      onClick={onClick}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className={cn(
        "relative flex flex-col items-center gap-3 rounded-2xl border-2 p-6 transition-all duration-200",
        selected
          ? "border-[var(--primary)] bg-[var(--primary)]/5 shadow-lg shadow-[var(--primary)]/10"
          : "border-border bg-card hover:border-[var(--primary)]/30 hover:bg-muted/30"
      )}
    >
      {selected && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="absolute -right-2 -top-2 flex size-6 items-center justify-center rounded-full bg-[var(--primary)] text-white ring-2 ring-background"
        >
          <CheckIcon className="size-3.5" />
        </motion.div>
      )}
      {bank.popular && bank.market_share && (
        <Badge
          variant="secondary"
          className="absolute -left-2 -top-2 text-xs"
          style={{ backgroundColor: bank.primary_color ? `${bank.primary_color}20` : undefined }}
        >
          {bank.market_share}% markedsandel
        </Badge>
      )}
      <div
        className="flex size-16 items-center justify-center rounded-xl bg-muted"
        style={{ backgroundColor: bank.primary_color ? `${bank.primary_color}10` : undefined }}
      >
        <BuildingIcon
          className="size-8"
          style={{ color: bank.primary_color || "var(--muted-foreground)" }}
        />
      </div>
      <div className="text-center">
        <p className="font-medium">{bank.name}</p>
        {bank.description ? (
          <p className="text-xs text-muted-foreground">{bank.description}</p>
        ) : bank.bic ? (
          <p className="text-xs text-muted-foreground font-mono">{bank.bic}</p>
        ) : null}
      </div>
    </motion.button>
  );
}

function AccountCard({
  account,
  selected,
  onClick,
}: {
  account: BankAccount;
  selected: boolean;
  onClick: () => void;
}) {
  const typeLabels = {
    current: "Brukskonto",
    savings: "Sparekonto",
    credit: "Kredittkonto",
  };

  return (
    <motion.button
      onClick={onClick}
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
      className={cn(
        "relative flex items-center gap-4 rounded-xl border-2 p-4 transition-all text-left w-full",
        selected
          ? "border-[var(--primary)] bg-[var(--primary)]/5"
          : "border-border bg-card hover:border-[var(--primary)]/30"
      )}
    >
      <div className={cn(
        "flex size-12 items-center justify-center rounded-xl",
        selected ? "bg-[var(--primary)]/10" : "bg-muted"
      )}>
        {account.type === "credit" ? (
          <CreditCardIcon className={cn("size-6", selected ? "text-[var(--primary)]" : "text-muted-foreground")} />
        ) : (
          <BuildingIcon className={cn("size-6", selected ? "text-[var(--primary)]" : "text-muted-foreground")} />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-medium">{account.name}</p>
          <Badge variant="outline" className="text-xs">{typeLabels[account.type]}</Badge>
        </div>
        <p className="text-sm text-muted-foreground font-mono">{account.account_number}</p>
      </div>
      <div className="text-right">
        <p className="font-display text-lg font-semibold">
          kr {account.balance.toLocaleString("nb-NO", { minimumFractionDigits: 2 })}
        </p>
        <p className="text-xs text-muted-foreground">{account.currency}</p>
      </div>
      <div className={cn(
        "flex size-6 items-center justify-center rounded-full border-2 transition-colors",
        selected
          ? "border-[var(--primary)] bg-[var(--primary)] text-white"
          : "border-muted-foreground/30"
      )}>
        {selected && <CheckIcon className="size-3.5" />}
      </div>
    </motion.button>
  );
}

function SecurityBadge() {
  return (
    <div className="flex items-center gap-3 rounded-xl border bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800 p-4">
      <div className="flex size-10 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
        <ShieldCheckIcon className="size-5 text-emerald-600 dark:text-emerald-400" />
      </div>
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">Sikker banktilkobling</p>
          <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-400 border-0">
            PSD2
          </Badge>
        </div>
        <p className="text-xs text-emerald-600/70 dark:text-emerald-400/70">
          PSD2-regulert via Tink (Visa). Alle norske banker støttet.
        </p>
      </div>
      <LockIcon className="size-5 text-emerald-600 dark:text-emerald-400" />
    </div>
  );
}

// ============================================================================
// STEP COMPONENTS
// ============================================================================

function SelectBankStep({
  selectedBank,
  onSelectBank,
  onNext,
  banks,
  isLoading,
  error,
}: {
  selectedBank: Bank | null;
  onSelectBank: (bank: Bank) => void;
  onNext: () => void;
  banks: Bank[];
  isLoading: boolean;
  error: string | null;
}) {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredBanks = banks.filter((bank) =>
    bank.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    bank.bic?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const popularBanks = filteredBanks.filter((b) => b.popular);
  const otherBanks = filteredBanks.filter((b) => !b.popular);

  return (
    <div className="space-y-6">
      <div className="text-center max-w-lg mx-auto">
        <h2 className="font-display text-2xl font-bold">Velg din bank</h2>
        <p className="text-muted-foreground mt-2">
          Ciri bruker Tink (Visa) for sikker banktilkobling.
          Du vil bli sendt til bankens nettside for å godkjenne tilgangen med BankID.
        </p>
      </div>

      <div className="relative max-w-md mx-auto">
        <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 size-5 text-muted-foreground" />
        <Input
          placeholder="Søk etter bank..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-12 h-12 text-base rounded-xl"
        />
      </div>

      {isLoading && (
        <div className="flex flex-col items-center justify-center py-12 gap-4">
          <Loader2Icon className="size-8 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Henter tilgjengelige banker...</p>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-3 rounded-xl border border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-950/20 p-4">
          <AlertCircleIcon className="size-5 text-red-600 dark:text-red-400" />
          <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
        </div>
      )}

      {!isLoading && !error && popularBanks.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-muted-foreground">Anbefalt</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {popularBanks.map((bank) => (
              <BankCard
                key={bank.id}
                bank={bank}
                selected={selectedBank?.id === bank.id}
                onClick={() => onSelectBank(bank)}
              />
            ))}
          </div>
        </div>
      )}

      {!isLoading && !error && otherBanks.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-muted-foreground">Andre banker</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-4">
            {otherBanks.map((bank) => (
              <BankCard
                key={bank.id}
                bank={bank}
                selected={selectedBank?.id === bank.id}
                onClick={() => onSelectBank(bank)}
              />
            ))}
          </div>
        </div>
      )}

      <SecurityBadge />

      <div className="flex justify-end">
        <Button
          size="lg"
          disabled={!selectedBank || isLoading}
          onClick={onNext}
          className="min-w-[200px]"
        >
          Fortsett
          <ArrowRightIcon className="size-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}

function AuthorizeStep({
  bank,
  onBack,
  onNext,
  onError,
}: {
  bank: Bank;
  onBack: () => void;
  onNext: () => void;
  onError: (error: string) => void;
}) {
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAuthorize = async () => {
    setIsRedirecting(true);
    setError(null);

    try {
      // Call the backend API to start bank connection
      const result = await startBankConnection(bank.id);

      // Store session ID for callback handling
      sessionStorage.setItem("bank_session_id", result.session_id);

      // Redirect to bank's authorization page (Tink Link)
      window.location.href = result.authorization_url;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Ukjent feil oppstod";
      setError(errorMessage);
      onError(errorMessage);
      setIsRedirecting(false);
    }
  };

  // Determine display name - for Tink, show "din bank" instead
  const displayName = bank.id === "tink" ? "din bank" : bank.name;

  return (
    <div className="space-y-6 max-w-lg mx-auto text-center">
      <div className="flex size-20 items-center justify-center rounded-2xl bg-muted mx-auto">
        <BuildingIcon className="size-10 text-muted-foreground" />
      </div>

      <div>
        <h2 className="font-display text-2xl font-bold">Koble til {bank.name}</h2>
        <p className="text-muted-foreground mt-2">
          Du vil nå bli sendt til Tink for å velge bank og logge inn med BankID.
          Tilkoblingen skjer via Tink (Visa) - PSD2-regulert og sikkert.
        </p>
      </div>

      {error && (
        <div className="flex items-center gap-3 rounded-xl border border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-950/20 p-4 text-left">
          <AlertCircleIcon className="size-5 text-red-600 dark:text-red-400 shrink-0" />
          <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
        </div>
      )}

      <Card className="text-left">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-start gap-3">
            <CheckIcon className="size-5 text-emerald-500 mt-0.5 shrink-0" />
            <div>
              <p className="font-medium text-sm">Les kontoinformasjon</p>
              <p className="text-xs text-muted-foreground">Saldo og transaksjoner</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <CheckIcon className="size-5 text-emerald-500 mt-0.5 shrink-0" />
            <div>
              <p className="font-medium text-sm">Automatisk synkronisering</p>
              <p className="text-xs text-muted-foreground">Opptil 4 ganger daglig i 90 dager</p>
            </div>
          </div>
          <div className="flex items-start gap-3 opacity-50">
            <AlertCircleIcon className="size-5 text-muted-foreground mt-0.5 shrink-0" />
            <div>
              <p className="font-medium text-sm">Ingen betalingstilgang</p>
              <p className="text-xs text-muted-foreground">Ciri kan ikke gjøre betalinger</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <SecurityBadge />

      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack} disabled={isRedirecting}>
          <ArrowLeftIcon className="size-4 mr-2" />
          Tilbake
        </Button>
        <Button
          size="lg"
          onClick={handleAuthorize}
          disabled={isRedirecting}
          className="min-w-[200px]"
        >
          {isRedirecting ? (
            <>
              <Loader2Icon className="size-4 mr-2 animate-spin" />
              Starter tilkobling...
            </>
          ) : (
            <>
              Start tilkobling
              <ExternalLinkIcon className="size-4 ml-2" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

function SelectAccountsStep({
  accounts,
  selectedAccounts,
  onToggleAccount,
  onBack,
  onNext,
}: {
  accounts: BankAccount[];
  selectedAccounts: string[];
  onToggleAccount: (id: string) => void;
  onBack: () => void;
  onNext: () => void;
}) {
  return (
    <div className="space-y-6">
      <div className="text-center max-w-lg mx-auto">
        <div className="flex size-16 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30 mx-auto mb-4">
          <CheckIcon className="size-8 text-emerald-600 dark:text-emerald-400" />
        </div>
        <h2 className="font-display text-2xl font-bold">Tilkobling vellykket!</h2>
        <p className="text-muted-foreground mt-2">
          Velg hvilke kontoer du vil koble til Ciri for automatisk bankavstemming.
        </p>
      </div>

      <div className="space-y-3 max-w-2xl mx-auto">
        {accounts.map((account) => (
          <AccountCard
            key={account.id}
            account={account}
            selected={selectedAccounts.includes(account.id)}
            onClick={() => onToggleAccount(account.id)}
          />
        ))}
      </div>

      <div className="text-center text-sm text-muted-foreground">
        {selectedAccounts.length} av {accounts.length} kontoer valgt
      </div>

      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack}>
          <ArrowLeftIcon className="size-4 mr-2" />
          Tilbake
        </Button>
        <Button
          size="lg"
          disabled={selectedAccounts.length === 0}
          onClick={onNext}
          className="min-w-[200px]"
        >
          Fortsett
          <ArrowRightIcon className="size-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}

function ConfigureStep({
  selectedAccounts,
  accounts,
  onBack,
  onComplete,
}: {
  selectedAccounts: string[];
  accounts: BankAccount[];
  onBack: () => void;
  onComplete: () => void;
}) {
  const [configs, setConfigs] = useState<Record<string, { name: string; konto: string }>>({});

  const selectedAccountObjects = accounts.filter((a) => selectedAccounts.includes(a.id));

  const updateConfig = (accountId: string, field: "name" | "konto", value: string) => {
    setConfigs((prev) => ({
      ...prev,
      [accountId]: {
        ...prev[accountId],
        [field]: value,
      },
    }));
  };

  return (
    <div className="space-y-6">
      <div className="text-center max-w-lg mx-auto">
        <h2 className="font-display text-2xl font-bold">Konfigurer kontoer</h2>
        <p className="text-muted-foreground mt-2">
          Gi kontoene et navn og koble dem til riktig konto i kontoplanen (NS 4102).
        </p>
      </div>

      <div className="space-y-4 max-w-2xl mx-auto">
        {selectedAccountObjects.map((account) => (
          <Card key={account.id}>
            <CardContent className="p-4 space-y-4">
              <div className="flex items-center gap-4">
                <div className="flex size-10 items-center justify-center rounded-lg bg-muted">
                  <BuildingIcon className="size-5 text-muted-foreground" />
                </div>
                <div className="flex-1">
                  <p className="font-medium">{account.name}</p>
                  <p className="text-sm text-muted-foreground font-mono">{account.account_number}</p>
                </div>
                <p className="font-semibold">
                  kr {account.balance.toLocaleString("nb-NO", { minimumFractionDigits: 2 })}
                </p>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Kontonavn i Ciri</Label>
                  <Input
                    placeholder={account.name}
                    value={configs[account.id]?.name || ""}
                    onChange={(e) => updateConfig(account.id, "name", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Kontonummer (NS 4102)</Label>
                  <Select
                    value={configs[account.id]?.konto || "1920"}
                    onValueChange={(value) => updateConfig(account.id, "konto", value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1920">1920 - Bank, driftskonto</SelectItem>
                      <SelectItem value="1950">1950 - Bankinnskudd for skattetrekk</SelectItem>
                      <SelectItem value="1940">1940 - Andre bankinnskudd</SelectItem>
                      <SelectItem value="1960">1960 - Kontantkasse</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack}>
          <ArrowLeftIcon className="size-4 mr-2" />
          Tilbake
        </Button>
        <Button
          size="lg"
          onClick={onComplete}
          className="min-w-[200px]"
        >
          Fullfør tilkobling
          <CheckIcon className="size-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}

function CompleteStep({ bank }: { bank: Bank }) {
  return (
    <div className="space-y-8 max-w-lg mx-auto text-center">
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", duration: 0.5 }}
        className="relative"
      >
        <div className="flex size-24 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30 mx-auto">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring" }}
          >
            <CheckIcon className="size-12 text-emerald-600 dark:text-emerald-400" />
          </motion.div>
        </div>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="absolute -right-4 top-0"
        >
          <SparklesIcon className="size-8 text-[var(--primary)]" />
        </motion.div>
      </motion.div>

      <div>
        <h2 className="font-display text-2xl font-bold">Banken er koblet til!</h2>
        <p className="text-muted-foreground mt-2">
          {bank.name} er nå koblet til Ciri. Transaksjoner vil bli hentet automatisk
          og Ciri begynner å foreslå avstemminger.
        </p>
      </div>

      <Card className="text-left">
        <CardContent className="p-4 space-y-4">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-lg bg-[var(--primary)]/10">
              <CiriLogo size="sm" />
            </div>
            <div>
              <p className="font-medium text-sm">Ciri jobber i bakgrunnen</p>
              <p className="text-xs text-muted-foreground">
                Transaksjoner importeres og matches automatisk med bilag
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-col sm:flex-row justify-center gap-3">
        <Button variant="outline" asChild>
          <a href="/dashboard/bank">
            Tilbake til bank
          </a>
        </Button>
        <Button asChild>
          <a href="/dashboard/bank/avstemming">
            Gå til avstemming
            <ArrowRightIcon className="size-4 ml-2" />
          </a>
        </Button>
      </div>
    </div>
  );
}

// ============================================================================
// MAIN PAGE
// ============================================================================

export default function ConnectBankPage() {
  const [step, setStep] = useState<WizardStep>("select-bank");
  const [selectedBank, setSelectedBank] = useState<Bank | null>(null);
  const [selectedAccounts, setSelectedAccounts] = useState<string[]>([]);

  const [bankError, setBankError] = useState<string | null>(null);

  const steps: { id: WizardStep; label: string }[] = [
    { id: "select-bank", label: "Velg bank" },
    { id: "authorize", label: "Godkjenn" },
    { id: "select-accounts", label: "Velg kontoer" },
    { id: "configure", label: "Konfigurer" },
    { id: "complete", label: "Ferdig" },
  ];

  // Fetch banks
  const { data: banks = fallbackBanks, isLoading: isLoadingBanks, error: banksError } = useQuery({
    queryKey: ["bank", "banks"],
    queryFn: async () => {
      const fetched = await fetchBanks();
      return fetched.length > 0 ? fetched : fallbackBanks;
    },
  });

  // Show error if fetch failed (fallback data still used)
  useEffect(() => {
    if (banksError) {
      setBankError("Kunne ikke hente banker fra serveren. Bruker forhåndsdefinerte banker.");
    }
  }, [banksError]);

  const toggleAccount = (id: string) => {
    setSelectedAccounts((prev) =>
      prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id]
    );
  };

  const handleAuthError = (error: string) => {
    setBankError(error);
  };

  return (
    <div className="mx-auto max-w-4xl space-y-8 pb-12">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6"
      >
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <a href="/dashboard/bank">
              <ArrowLeftIcon className="size-4" />
            </a>
          </Button>
          <div>
            <h1 className="font-display text-2xl font-bold tracking-tight">Koble til bank</h1>
            <p className="text-muted-foreground">
              Koble banken din til Ciri for automatisk avstemming
            </p>
          </div>
        </div>

        {step !== "complete" && (
          <StepIndicator steps={steps} currentStep={step} />
        )}
      </motion.div>

      {/* Step Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.2 }}
        >
          {step === "select-bank" && (
            <SelectBankStep
              selectedBank={selectedBank}
              onSelectBank={setSelectedBank}
              onNext={() => setStep("authorize")}
              banks={banks}
              isLoading={isLoadingBanks}
              error={bankError}
            />
          )}

          {step === "authorize" && selectedBank && (
            <AuthorizeStep
              bank={selectedBank}
              onBack={() => setStep("select-bank")}
              onNext={() => setStep("select-accounts")}
              onError={handleAuthError}
            />
          )}

          {step === "select-accounts" && (
            <SelectAccountsStep
              accounts={mockAccounts}
              selectedAccounts={selectedAccounts}
              onToggleAccount={toggleAccount}
              onBack={() => setStep("authorize")}
              onNext={() => setStep("configure")}
            />
          )}

          {step === "configure" && (
            <ConfigureStep
              selectedAccounts={selectedAccounts}
              accounts={mockAccounts}
              onBack={() => setStep("select-accounts")}
              onComplete={() => setStep("complete")}
            />
          )}

          {step === "complete" && selectedBank && (
            <CompleteStep bank={selectedBank} />
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
