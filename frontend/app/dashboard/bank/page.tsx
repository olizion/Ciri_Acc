"use client";

import { useState, useMemo, useEffect, useCallback, Fragment } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import LearnMoreDocs from "@/components/learn-more-docs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  CheckCircle2Icon,
  AlertTriangleIcon,
  SearchIcon,
  UploadIcon,
  TagIcon,
  FileTextIcon,
  BuildingIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  RefreshCwIcon,
  ReceiptIcon,
  AlertCircleIcon,
  ChevronsUpDownIcon,
  WalletIcon,
  ChevronRightIcon,
  CopyIcon,
  HashIcon,
  CalendarIcon,
  ArrowRightLeftIcon,
  XIcon,
  SparklesIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import CiriLogo from "@/components/layout/ciri-logo";
import { API_BASE_URL } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import { useCiriActionListener } from "@/lib/ciri-actions";
import { useCrystallize } from "@/lib/use-crystallize";
import { RecurringOnboardingOverlay } from "./onboarding/recurring-onboarding-overlay";

// ============================================================================
// TYPES
// ============================================================================

type TransactionStatus = "posted" | "pending" | "missing_bilag" | "needs_category";
type TransactionCategory =
  | "inntekt" | "varekjop" | "lonn" | "kontor" | "reise"
  | "mva" | "privat" | "bank" | "forsikring" | "leie" | "ukategorisert";

type SortKey = "date" | "description" | "amount" | "category" | "status";
type SortDir = "asc" | "desc";

interface BilagMatch {
  id: string;
  filename: string;
  amount: number;
  date: string;
  supplier?: string;
}

interface Transaction {
  id: string;
  date: string;
  valueDate: string | null;
  description: string;
  rawDescription: string;
  merchantName: string | null;
  amount: number;
  currency: string;
  direction: string;
  category: TransactionCategory;
  status: TransactionStatus;
  reference: string | null;
  suggestedAccount: string | null;
  ciriConfidence: number | null;
  isPrivate: boolean;
  bilag?: BilagMatch;
}

interface BankAccount {
  id: string;
  name: string;
  accountNumber: string;
  balance: number;
  currency: string;
}

// ============================================================================
// API + CONFIG
// ============================================================================

const categoryConfig: Record<TransactionCategory, { label: string; dot: string }> = {
  inntekt:       { label: "Inntekt",     dot: "bg-emerald-500" },
  varekjop:      { label: "Varekjøp",    dot: "bg-orange-500" },
  lonn:          { label: "Lønn",        dot: "bg-blue-500" },
  kontor:        { label: "Kontor",      dot: "bg-purple-500" },
  reise:         { label: "Reise",       dot: "bg-teal-500" },
  mva:           { label: "MVA",         dot: "bg-amber-500" },
  privat:        { label: "Privat",      dot: "bg-slate-400" },
  bank:          { label: "Bank",        dot: "bg-indigo-500" },
  forsikring:    { label: "Forsikring",  dot: "bg-cyan-500" },
  leie:          { label: "Leie",        dot: "bg-violet-500" },
  ukategorisert: { label: "Ukategorisert", dot: "bg-red-400" },
};

const statusConfig: Record<TransactionStatus, { label: string; color: string; icon: typeof CheckCircle2Icon }> = {
  posted:         { label: "Postert",         color: "text-emerald-500", icon: CheckCircle2Icon },
  pending:        { label: "Venter",          color: "text-amber-500",   icon: RefreshCwIcon },
  missing_bilag:  { label: "Mangler bilag",   color: "text-red-500",     icon: AlertCircleIcon },
  needs_category: { label: "Trenger kategori", color: "text-amber-500",  icon: TagIcon },
};

// ============================================================================
// API MAPPERS
// ============================================================================

function mapStatus(s: string): TransactionStatus {
  switch (s) {
    case "matched": return "posted";
    case "suggested": return "pending";
    case "unmatched": return "missing_bilag";
    case "ignored": return "posted";
    default: return "needs_category";
  }
}

function mapCategory(c: string): TransactionCategory {
  const valid: TransactionCategory[] = [
    "inntekt","varekjop","lonn","kontor","reise","mva",
    "privat","bank","forsikring","leie","ukategorisert",
  ];
  return valid.includes(c as TransactionCategory) ? (c as TransactionCategory) : "ukategorisert";
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapApiTransaction(tx: any): Transaction {
  return {
    id: tx.id,
    date: tx.booking_date,
    valueDate: tx.value_date || null,
    description: tx.cleaned_description || tx.merchant_name || tx.raw_description || "",
    rawDescription: tx.raw_description || "",
    merchantName: tx.merchant_name || null,
    amount: Number(tx.amount),
    currency: tx.currency || "NOK",
    direction: tx.direction || (Number(tx.amount) < 0 ? "debit" : "credit"),
    category: mapCategory(tx.category),
    status: mapStatus(tx.reconciliation_status),
    reference: tx.reference || null,
    suggestedAccount: tx.suggested_account || null,
    ciriConfidence: tx.ciri_confidence != null ? Number(tx.ciri_confidence) : null,
    isPrivate: tx.is_private || false,
    bilag: tx.match
      ? {
          id: tx.match.bilag_number || tx.match.id,
          filename: tx.match.bilag_description || "bilag.pdf",
          amount: Number(tx.amount),
          date: tx.booking_date,
        }
      : undefined,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapApiAccount(acc: any): BankAccount {
  return {
    id: acc.id,
    name: acc.account_name || acc.bank_name || "Konto",
    accountNumber: acc.account_number || acc.iban || "",
    balance: Number(acc.current_balance) || 0,
    currency: acc.currency || "NOK",
  };
}

function fmtNOK(n: number, decimals = 2) {
  return Math.abs(n).toLocaleString("nb-NO", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("nb-NO", { day: "2-digit", month: "2-digit", year: "2-digit" });
}

function fmtDateLong(d: string) {
  return new Date(d).toLocaleDateString("nb-NO", { day: "2-digit", month: "long", year: "numeric" });
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

function AccountBar({
  accounts, selected, onSelect, lastSyncAt,
}: {
  accounts: BankAccount[];
  selected: BankAccount;
  onSelect: (a: BankAccount) => void;
  lastSyncAt: string | null;
}) {
  return (
    <div className="flex items-center gap-5">
      <div className="flex items-center gap-2">
        {accounts.map((acc) => {
          const active = acc.id === selected.id;
          return (
            <button
              key={acc.id}
              onClick={() => onSelect(acc)}
              className={cn(
                "flex items-center gap-2.5 rounded-lg border px-3 py-2 text-left transition-all",
                active
                  ? "border-[var(--primary)]/40 bg-[var(--primary)]/5 shadow-sm"
                  : "border-transparent hover:bg-muted/60"
              )}
            >
              <div className={cn("flex size-8 items-center justify-center rounded-md", active ? "bg-[var(--primary)]/10" : "bg-muted")}>
                <BuildingIcon className={cn("size-4", active ? "text-[var(--primary)]" : "text-muted-foreground")} />
              </div>
              <div>
                <p className="text-[13px] font-medium leading-none">{acc.name}</p>
                <p className="mt-0.5 font-mono text-[13px] text-muted-foreground">{acc.accountNumber}</p>
              </div>
            </button>
          );
        })}
      </div>
      <div className="ml-auto flex items-center gap-4">
        <div className="text-right">
          <p className="font-mono text-2xl font-semibold tracking-tight tabular-nums">
            {selected.balance.toLocaleString("nb-NO", { minimumFractionDigits: 2 })}
            <span className="ml-1 text-sm font-normal text-muted-foreground">NOK</span>
          </p>
          <p className="text-[13px] text-muted-foreground">
            {lastSyncAt
              ? `Sist oppdatert ${new Date(lastSyncAt).toLocaleString("nb-NO", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}`
              : "Open Banking"}
          </p>
        </div>
        <Button variant="outline" size="icon" className="size-8 shrink-0" onClick={() => window.location.reload()}>
          <RefreshCwIcon className="size-3.5" />
        </Button>
      </div>
    </div>
  );
}

function SortableHeader({
  label, sortKey, currentSort, currentDir, onSort, className,
}: {
  label: string; sortKey: SortKey; currentSort: SortKey; currentDir: SortDir;
  onSort: (k: SortKey) => void; className?: string;
}) {
  const active = currentSort === sortKey;
  return (
    <TableHead className={cn("select-none border-x border-border/50 bg-muted/30 px-3", className)}>
      <button
        onClick={() => onSort(sortKey)}
        className={cn(
          "inline-flex items-center gap-1 text-[13px] font-semibold uppercase tracking-wider transition-colors",
          active ? "text-foreground" : "text-muted-foreground hover:text-foreground"
        )}
      >
        {label}
        {active ? (
          currentDir === "asc" ? <ArrowUpIcon className="size-3" /> : <ArrowDownIcon className="size-3" />
        ) : (
          <ChevronsUpDownIcon className="size-3 opacity-40" />
        )}
      </button>
    </TableHead>
  );
}

function DetailField({ label, value, mono }: { label: string; value: string | null | undefined; mono?: boolean }) {
  if (!value) return null;
  return (
    <div className="space-y-0.5">
      <p className="text-[12px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={cn("text-[13px]", mono && "font-mono")}>{value}</p>
    </div>
  );
}

function TransactionRow({
  tx, isExpanded, onToggle, isHighlighted,
}: {
  tx: Transaction; isExpanded: boolean; onToggle: () => void; isHighlighted?: boolean;
}) {
  const isExpense = tx.amount < 0;
  const cat = categoryConfig[tx.category] ?? categoryConfig.ukategorisert;
  const st = statusConfig[tx.status] ?? statusConfig.needs_category;
  const StIcon = st.icon;

  return (
    <Fragment>
      <TableRow
        id={`tx-${tx.id}`}
        onClick={onToggle}
        className={cn(
          "group cursor-pointer transition-colors",
          isExpanded ? "bg-muted/40" : "hover:bg-muted/20",
          isHighlighted && "ring-2 ring-[var(--primary)]/40 bg-[var(--primary)]/5 animate-[highlightFade_2s_ease-out_forwards]",
        )}
      >
        {/* Expand indicator */}
        <TableCell className="w-[32px] border-x border-border/50 px-2 py-2.5 text-center">
          <ChevronRightIcon className={cn("size-3.5 text-muted-foreground transition-transform", isExpanded && "rotate-90")} />
        </TableCell>

        {/* Date */}
        <TableCell className="w-[85px] border-x border-border/50 px-3 py-2.5">
          <span className="font-mono text-[13px] tabular-nums">{fmtDate(tx.date)}</span>
        </TableCell>

        {/* Value date */}
        <TableCell className="w-[85px] border-x border-border/50 px-3 py-2.5">
          <span className="font-mono text-[12px] text-muted-foreground tabular-nums">
            {tx.valueDate ? fmtDate(tx.valueDate) : "—"}
          </span>
        </TableCell>

        {/* Description */}
        <TableCell className="border-x border-border/50 px-3 py-2.5">
          <div className="flex items-center gap-2 min-w-0">
            <span className="truncate text-sm">{tx.description}</span>
            {tx.bilag && (
              <TooltipProvider delayDuration={200}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <FileTextIcon className="size-3.5 shrink-0 text-[var(--primary)]" />
                  </TooltipTrigger>
                  <TooltipContent side="top" className="text-xs">Bilag: {tx.bilag.id}</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
            {tx.isPrivate && (
              <Badge variant="outline" className="h-4 px-1 text-[13px] shrink-0 border-slate-300 text-slate-500">PRIVAT</Badge>
            )}
          </div>
        </TableCell>

        {/* Category */}
        <TableCell className="w-[130px] border-x border-border/50 px-3 py-2.5">
          <div className="flex items-center gap-1.5">
            <div className={cn("size-2 rounded-full shrink-0", cat.dot)} />
            <span className="text-[13px]">{cat.label}</span>
          </div>
        </TableCell>

        {/* Status */}
        <TableCell className="w-[120px] border-x border-border/50 px-3 py-2.5">
          <div className="flex items-center gap-1.5">
            <StIcon className={cn("size-3.5 shrink-0", st.color)} />
            <span className="text-[12px] text-muted-foreground">{st.label}</span>
          </div>
        </TableCell>

        {/* Direction */}
        <TableCell className="w-[50px] border-x border-border/50 px-2 py-2.5 text-center">
          <Badge
            variant="outline"
            className={cn(
              "h-5 px-1.5 text-[12px] font-mono font-semibold",
              isExpense
                ? "border-red-200 text-red-600 dark:border-red-800 dark:text-red-400"
                : "border-emerald-200 text-emerald-600 dark:border-emerald-800 dark:text-emerald-400"
            )}
          >
            {isExpense ? "UT" : "INN"}
          </Badge>
        </TableCell>

        {/* Amount */}
        <TableCell className="w-[140px] border-x border-border/50 px-3 py-2.5 text-right">
          <span className={cn(
            "font-mono text-sm font-semibold tabular-nums",
            isExpense ? "text-foreground" : "text-emerald-600 dark:text-emerald-400"
          )}>
            {isExpense ? "−" : "+"}{fmtNOK(tx.amount)}
          </span>
          <span className="ml-1 text-[13px] text-muted-foreground">{tx.currency}</span>
        </TableCell>
      </TableRow>

      {/* Expanded detail row */}
      <AnimatePresence>
        {isExpanded && (
          <TableRow className="bg-muted/20 hover:bg-muted/20">
            <TableCell colSpan={8} className="border-x border-border/50 p-0">
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="overflow-hidden"
              >
                <div className="grid grid-cols-2 gap-x-8 gap-y-4 border-t border-dashed border-border/60 px-6 py-4 lg:grid-cols-4">
                  <DetailField label="Transaksjons-ID" value={tx.id.slice(0, 8) + "..."} mono />
                  <DetailField label="Bokføringsdato" value={fmtDateLong(tx.date)} />
                  <DetailField label="Verdidato" value={tx.valueDate ? fmtDateLong(tx.valueDate) : "Ikke oppgitt"} />
                  <DetailField label="Retning" value={tx.direction === "debit" ? "Debet (utgående)" : "Kredit (innkommende)"} />
                  <DetailField label="Rå beskrivelse" value={tx.rawDescription} mono />
                  <DetailField label="Forretningsnavn" value={tx.merchantName} />
                  <DetailField label="Referanse" value={tx.reference || "Ingen"} mono />
                  <DetailField label="Foreslått konto" value={tx.suggestedAccount || "Ikke foreslått"} mono />
                  {tx.ciriConfidence != null && (
                    <div className="space-y-0.5">
                      <p className="text-[12px] font-semibold uppercase tracking-wider text-muted-foreground">Ciri-konfidens</p>
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-20 rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full rounded-full bg-[var(--primary)]"
                            style={{ width: `${Math.round(tx.ciriConfidence * 100)}%` }}
                          />
                        </div>
                        <span className="font-mono text-[12px]">{Math.round(tx.ciriConfidence * 100)}%</span>
                      </div>
                    </div>
                  )}
                  {tx.bilag && (
                    <div className="space-y-0.5">
                      <p className="text-[12px] font-semibold uppercase tracking-wider text-muted-foreground">Bilag</p>
                      <div className="flex items-center gap-1.5">
                        <FileTextIcon className="size-3.5 text-[var(--primary)]" />
                        <span className="text-[13px] font-medium">{tx.bilag.id}</span>
                      </div>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2 border-t border-dashed border-border/60 px-6 py-3">
                  <Button variant="outline" size="sm" className="h-7 gap-1.5 text-xs">
                    <UploadIcon className="size-3" />Last opp bilag
                  </Button>
                  <Button variant="outline" size="sm" className="h-7 gap-1.5 text-xs">
                    <TagIcon className="size-3" />Endre kategori
                  </Button>
                  <Button variant="outline" size="sm" className="h-7 gap-1.5 text-xs">
                    <CopyIcon className="size-3" />Kopier ID
                  </Button>
                  {!tx.isPrivate && (
                    <Button variant="ghost" size="sm" className="h-7 gap-1.5 text-xs ml-auto text-muted-foreground">
                      <XIcon className="size-3" />Marker privat
                    </Button>
                  )}
                </div>
              </motion.div>
            </TableCell>
          </TableRow>
        )}
      </AnimatePresence>
    </Fragment>
  );
}

function MissingBilagRow({ tx, index }: { tx: Transaction; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03 }}
      className="group flex items-center gap-4 border-b px-4 py-3 last:border-0 hover:bg-muted/30 transition-colors"
    >
      <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-red-50 dark:bg-red-950/30">
        <AlertTriangleIcon className="size-4 text-red-500" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{tx.description}</p>
        <p className="text-[12px] text-muted-foreground">
          {fmtDateLong(tx.date)}
          {tx.merchantName && tx.merchantName !== tx.description && (
            <span className="ml-2 text-muted-foreground/60">({tx.merchantName})</span>
          )}
        </p>
      </div>
      <span className="font-mono text-sm font-semibold tabular-nums shrink-0">
        −{fmtNOK(tx.amount)}
      </span>
      <Button variant="outline" size="sm" className="h-7 gap-1.5 px-2.5 text-xs shrink-0 opacity-70 transition-opacity group-hover:opacity-100">
        <UploadIcon className="size-3" />Last opp
      </Button>
    </motion.div>
  );
}

// ============================================================================
// MAIN PAGE
// ============================================================================

export default function BankPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [selectedAccount, setSelectedAccount] = useState<BankAccount | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [highlightedTxId, setHighlightedTxId] = useState<string | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortKey, setSortKey] = useState<SortKey>("date");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  // Ciri bubble action listeners
  useCiriActionListener("uavstemt", useCallback(() => router.push("/dashboard/bank/avstemming"), [router]));
  useCiriActionListener("vis-manglende-bilag-bank", useCallback(() => setStatusFilter("missing_bilag"), []));

  // Fetch accounts
  const { data: accountsData } = useQuery({
    queryKey: queryKeys.bank.accounts,
    queryFn: async () => {
      const res = await fetch(`${API_BASE_URL}/api/bank/accounts`);
      if (!res.ok) return { accounts: [] as BankAccount[], lastSyncAt: null as string | null };
      const raw = await res.json();
      return {
        accounts: raw.map(mapApiAccount) as BankAccount[],
        lastSyncAt: raw[0]?.last_sync_at as string | null ?? null,
      };
    },
  });
  const accounts = accountsData?.accounts ?? [];
  const lastSyncAt = accountsData?.lastSyncAt ?? null;

  // Auto-select first account
  useEffect(() => {
    if (accounts.length > 0 && !selectedAccount) {
      setSelectedAccount(accounts[0]);
    }
  }, [accounts, selectedAccount]);

  // Fetch transactions
  const { data: allTransactions = [], isLoading } = useQuery({
    queryKey: queryKeys.bank.transactions,
    queryFn: async () => {
      const res = await fetch(`${API_BASE_URL}/api/bank/transactions?limit=200`);
      if (!res.ok) return [] as Transaction[];
      const raw = await res.json();
      return raw.map(mapApiTransaction) as Transaction[];
    },
  });

  const crystallize = useCrystallize(isLoading);

  // Deep link: auto-expand and scroll to transaction from ?tx= param
  const txIdParam = searchParams.get("tx");
  useEffect(() => {
    if (!txIdParam || allTransactions.length === 0) return;
    const exists = allTransactions.some((t) => t.id === txIdParam);
    if (!exists) return;

    setExpandedId(txIdParam);
    setHighlightedTxId(txIdParam);

    const timer = setTimeout(() => {
      const el = document.getElementById(`tx-${txIdParam}`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }, 300);

    router.replace("/dashboard/bank", { scroll: false });

    const highlightTimer = setTimeout(() => {
      setHighlightedTxId(null);
    }, 2000);

    return () => {
      clearTimeout(timer);
      clearTimeout(highlightTimer);
    };
  }, [txIdParam, allTransactions, router]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(key === "date" ? "desc" : "asc");
    }
  };

  const filtered = useMemo(() => {
    let txs = allTransactions.filter((t) => {
      if (searchQuery && !t.description.toLowerCase().includes(searchQuery.toLowerCase()) && !t.rawDescription.toLowerCase().includes(searchQuery.toLowerCase()))
        return false;
      if (categoryFilter !== "all" && t.category !== categoryFilter) return false;
      if (statusFilter !== "all" && t.status !== statusFilter) return false;
      return true;
    });
    txs.sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case "date": cmp = a.date.localeCompare(b.date); break;
        case "description": cmp = a.description.localeCompare(b.description, "nb-NO"); break;
        case "amount": cmp = a.amount - b.amount; break;
        case "category": cmp = a.category.localeCompare(b.category); break;
        case "status": cmp = a.status.localeCompare(b.status); break;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
    return txs;
  }, [allTransactions, searchQuery, categoryFilter, statusFilter, sortKey, sortDir]);

  const missingBilag = useMemo(
    () => allTransactions.filter((t) => t.status === "missing_bilag" && t.amount < 0),
    [allTransactions]
  );

  const sumIn = allTransactions.filter((t) => t.amount > 0).reduce((s, t) => s + t.amount, 0);
  const sumOut = Math.abs(allTransactions.filter((t) => t.amount < 0).reduce((s, t) => s + t.amount, 0));

  // Loading
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="text-center space-y-3">
          <RefreshCwIcon className="size-6 mx-auto animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Henter bankdata...</p>
        </div>
      </div>
    );
  }

  // Empty
  if (!selectedAccount || accounts.length === 0) {
    return (
      <div className="space-y-8 pb-12">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight">Transaksjoner</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Bank og avstemming</p>
        </div>
        <div className="rounded-xl border-2 border-dashed p-16 text-center">
          <WalletIcon className="size-10 mx-auto text-muted-foreground/40 mb-4" />
          <h2 className="font-display text-lg font-semibold mb-1">Ingen bankkontoer tilkoblet</h2>
          <p className="text-sm text-muted-foreground mb-6 max-w-sm mx-auto">
            Koble til banken din for å se transaksjoner og avstemme automatisk.
          </p>
          <Button asChild>
            <a href="/dashboard/bank/accounts/connect">Koble til bank</a>
          </Button>
        </div>
      </div>
    );
  }

  // Main
  return (
    <div className="space-y-5 pb-12">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className={`space-y-4 ${crystallize(1)}`}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold tracking-tight">Transaksjoner</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Bank og avstemming</p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 text-xs"
              onClick={() => setShowOnboarding(true)}
            >
              <SparklesIcon className="size-3.5" />
              Gjentakende
            </Button>
            <div className="size-6 rounded-full overflow-hidden ring-1 ring-border">
              <CiriLogo size="sm" />
            </div>
          </div>
        </div>
        <AccountBar accounts={accounts} selected={selectedAccount} onSelect={setSelectedAccount} lastSyncAt={lastSyncAt} />
      </motion.div>

      {/* Tabs */}
      <Tabs defaultValue="transactions" className={`space-y-4 ${crystallize(2)}`}>
        <div className="flex items-center justify-between gap-4">
          <TabsList className="h-9">
            <TabsTrigger value="transactions" className="gap-1.5 px-3 text-xs">
              <ReceiptIcon className="size-3.5" />
              Transaksjoner
              <Badge variant="secondary" className="ml-1 h-4 min-w-[18px] px-1 text-[12px] font-semibold">
                {allTransactions.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="missing" className="gap-1.5 px-3 text-xs">
              <AlertTriangleIcon className="size-3.5" />
              Mangler bilag
              {missingBilag.length > 0 && (
                <Badge className="ml-1 h-4 min-w-[18px] px-1 text-[12px] font-semibold bg-red-500 text-white hover:bg-red-500">
                  {missingBilag.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>
          <div className="hidden sm:flex items-center gap-3 text-[12px] text-muted-foreground">
            <span className="flex items-center gap-1">
              <ArrowDownIcon className="size-3 text-emerald-500" />
              Inn <span className="font-mono font-medium text-emerald-600 dark:text-emerald-400">+{fmtNOK(sumIn, 0)}</span>
            </span>
            <span className="text-border">|</span>
            <span className="flex items-center gap-1">
              <ArrowUpIcon className="size-3 text-muted-foreground" />
              Ut <span className="font-mono font-medium">{fmtNOK(sumOut, 0)}</span>
            </span>
          </div>
        </div>

        {/* ──────── TAB: All Transactions ──────── */}
        <TabsContent value="transactions" className="space-y-3">
          {/* Filter bar */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative flex-1 max-w-sm">
              <SearchIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
              <Input
                placeholder="Søk i beskrivelse..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-8 pl-8 text-xs"
              />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="h-8 w-[140px] text-xs">
                <SelectValue placeholder="Kategori" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs">Alle kategorier</SelectItem>
                {Object.entries(categoryConfig).map(([key, cfg]) => (
                  <SelectItem key={key} value={key} className="text-xs">
                    <div className="flex items-center gap-1.5">
                      <div className={cn("size-1.5 rounded-full", cfg.dot)} />{cfg.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-8 w-[150px] text-xs">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs">Alle statuser</SelectItem>
                {Object.entries(statusConfig).map(([key, cfg]) => (
                  <SelectItem key={key} value={key} className="text-xs">
                    <div className="flex items-center gap-1.5">
                      <cfg.icon className={cn("size-3", cfg.color)} />{cfg.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span className="ml-auto text-[13px] text-muted-foreground tabular-nums font-mono">
              {filtered.length} / {allTransactions.length} transaksjoner
            </span>
          </div>

          {/* Table */}
          <div className="rounded-lg border border-border bg-card overflow-hidden">
            <Table className="border-collapse">
              <TableHeader>
                <TableRow className="hover:bg-transparent border-b-2 border-border">
                  <TableHead className="w-[32px] border-x border-border/50 bg-muted/30 px-2">
                    <span className="sr-only">Utvid</span>
                  </TableHead>
                  <SortableHeader label="Dato" sortKey="date" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} className="w-[85px]" />
                  <TableHead className="w-[85px] border-x border-border/50 bg-muted/30 px-3">
                    <span className="text-[13px] font-semibold uppercase tracking-wider text-muted-foreground">Verdi</span>
                  </TableHead>
                  <SortableHeader label="Beskrivelse" sortKey="description" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} />
                  <SortableHeader label="Kategori" sortKey="category" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} className="w-[130px]" />
                  <SortableHeader label="Status" sortKey="status" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} className="w-[120px]" />
                  <TableHead className="w-[50px] border-x border-border/50 bg-muted/30 px-2 text-center">
                    <span className="text-[13px] font-semibold uppercase tracking-wider text-muted-foreground">
                      <ArrowRightLeftIcon className="size-3 mx-auto" />
                    </span>
                  </TableHead>
                  <SortableHeader label="Beløp" sortKey="amount" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} className="w-[140px] text-right" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length > 0 ? (
                  filtered.map((tx) => (
                    <TransactionRow
                      key={tx.id}
                      tx={tx}
                      isExpanded={expandedId === tx.id}
                      onToggle={() => setExpandedId(expandedId === tx.id ? null : tx.id)}
                      isHighlighted={highlightedTxId === tx.id}
                    />
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={8} className="h-24 text-center text-sm text-muted-foreground">
                      Ingen transaksjoner funnet
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* ──────── TAB: Missing Bilag ──────── */}
        <TabsContent value="missing" className="space-y-3">
          <div className="flex items-center gap-3 rounded-lg border border-red-200 bg-red-50/50 dark:border-red-900/40 dark:bg-red-950/20 px-4 py-3">
            <div className="flex size-8 items-center justify-center rounded-md bg-red-100 dark:bg-red-900/40">
              <AlertTriangleIcon className="size-4 text-red-600 dark:text-red-400" />
            </div>
            <div className="flex-1">
              <p className="text-[13px] font-medium text-red-800 dark:text-red-300">
                {missingBilag.length} {missingBilag.length === 1 ? "transaksjon" : "transaksjoner"} mangler bilag
              </p>
              <p className="text-[13px] text-red-600/70 dark:text-red-400/60">
                Last opp kvitteringer for å fullføre bokføringen
              </p>
            </div>
            <span className="font-mono text-sm font-semibold text-red-700 dark:text-red-400 tabular-nums">
              −{fmtNOK(missingBilag.reduce((s, t) => s + Math.abs(t.amount), 0))}
            </span>
          </div>
          <div className="rounded-lg border bg-card overflow-hidden">
            {missingBilag.length > 0 ? (
              missingBilag.map((tx, i) => <MissingBilagRow key={tx.id} tx={tx} index={i} />)
            ) : (
              <div className="py-16 text-center">
                <div className="flex size-12 items-center justify-center rounded-full bg-emerald-50 dark:bg-emerald-950/30 mx-auto mb-3">
                  <CheckCircle2Icon className="size-5 text-emerald-500" />
                </div>
                <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">Alle transaksjoner har bilag</p>
                <p className="text-xs text-muted-foreground mt-1">Ingenting å gjøre her</p>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      <LearnMoreDocs sections={["bank", "bokforing"]} />

      {/* Recurring transactions onboarding overlay */}
      <AnimatePresence>
        {showOnboarding && (
          <RecurringOnboardingOverlay onClose={() => setShowOnboarding(false)} />
        )}
      </AnimatePresence>
    </div>
  );
}
