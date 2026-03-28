"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  FileTextIcon,
  SendIcon,
  EyeIcon,
  CheckCircle2Icon,
  ExternalLinkIcon,
  Loader2Icon,
  CopyIcon,
  CheckIcon,
  UserIcon,
  CalendarIcon,
  BanknoteIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { API_BASE_URL } from "@/lib/api";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";

interface Invoice {
  id: string;
  invoice_number: string;
  customer_name: string;
  customer_email: string;
  description: string;
  amount: number;
  mva_rate: number;
  mva_amount: number;
  total_amount: number;
  due_date: string;
  bank_account: string;
  kid_number: string | null;
  view_token: string;
  status: string;
  sent_at: string | null;
  viewed_at: string | null;
  viewed_count: number;
  paid_at: string | null;
  created_at: string;
}

// ============================================================================
// HELPERS
// ============================================================================

function fmtDate(iso: string) {
  const d = new Date(iso);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}.${mm}.${yyyy}`;
}

function fmtDateTime(iso: string) {
  const d = new Date(iso);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  const hh = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  return `${dd}.${mm}.${yyyy} kl. ${hh}:${min}`;
}

function fmtAmount(n: number) {
  return `kr ${n.toLocaleString("nb-NO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// ============================================================================
// COPY PILL
// ============================================================================

function CopyPill({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button
      onClick={copy}
      className="group flex items-center gap-2 rounded-xl border border-border bg-muted/50 px-4 py-3 text-left transition-all hover:border-primary/30 hover:bg-card active:scale-[0.98]"
    >
      <div className="min-w-0">
        <p className="text-[13px] font-bold tracking-[0.15em] uppercase text-muted-foreground">
          {label}
        </p>
        <p className="mt-0.5 truncate font-mono text-sm font-medium tracking-wide text-foreground">
          {value}
        </p>
      </div>
      <div
        className={cn(
          "ml-auto flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-all",
          copied
            ? "bg-emerald-50 text-emerald-600"
            : "text-muted-foreground group-hover:bg-[#3E715C]/10 group-hover:text-[#3E715C]"
        )}
      >
        {copied ? <CheckIcon className="h-3.5 w-3.5" /> : <CopyIcon className="h-3.5 w-3.5" />}
      </div>
    </button>
  );
}

// ============================================================================
// TIMELINE STEP
// ============================================================================

interface TimelineStep {
  icon: React.ReactNode;
  label: string;
  detail: string;
  time: string | null;
  completed: boolean;
  active: boolean;
  color: string;
  bgColor: string;
}

function TimelineItem({
  step,
  isLast,
  index,
}: {
  step: TimelineStep;
  isLast: boolean;
  index: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -16 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.35, delay: 0.15 + index * 0.08 }}
      className="flex gap-4"
    >
      {/* Line + dot */}
      <div className="flex flex-col items-center">
        <div
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-all",
            step.completed || step.active
              ? step.bgColor
              : "bg-muted text-muted-foreground/40"
          )}
        >
          <div className={cn(step.completed || step.active ? step.color : "text-muted-foreground/40")}>
            {step.icon}
          </div>
        </div>
        {!isLast && (
          <div
            className={cn(
              "my-1 w-0.5 flex-1 min-h-[28px] rounded-full",
              step.completed ? "bg-primary/20" : "bg-border"
            )}
          />
        )}
      </div>

      {/* Content */}
      <div className="pb-8">
        <p
          className={cn(
            "text-sm font-semibold leading-tight",
            step.completed || step.active ? "text-foreground" : "text-muted-foreground/40"
          )}
        >
          {step.label}
        </p>
        <p
          className={cn(
            "mt-0.5 text-xs",
            step.completed || step.active ? "text-muted-foreground" : "text-muted-foreground/30"
          )}
        >
          {step.detail}
        </p>
        {step.time && (
          <p className="mt-1 font-mono text-[13px] tracking-wide text-muted-foreground">
            {step.time}
          </p>
        )}
      </div>
    </motion.div>
  );
}

// ============================================================================
// STATUS CONFIG
// ============================================================================

const STATUS_CONFIG: Record<string, { label: string; variant: string }> = {
  draft: { label: "Utkast", variant: "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300" },
  sent: { label: "Sendt", variant: "bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300" },
  viewed: { label: "Åpnet", variant: "bg-[#f4f7f2] dark:bg-emerald-950/30 text-[#3E715C] dark:text-emerald-400" },
  paid: { label: "Betalt", variant: "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300" },
};

// ============================================================================
// DIALOG
// ============================================================================

export default function InvoiceTimelineDialog({
  invoiceId,
  open,
  onOpenChange,
  preloadedInvoice,
}: {
  invoiceId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preloadedInvoice?: Invoice | null;
}) {
  const [invoice, setInvoice] = useState<Invoice | null>(preloadedInvoice ?? null);
  const [loading, setLoading] = useState(false);
  const queryClient = useQueryClient();

  const fetchInvoice = useCallback(async (id: string) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/invoices/${id}`);
      if (res.ok) {
        const data = await res.json();
        setInvoice(data);
      }
    } catch {
      // keep existing data on error
    }
  }, []);

  // Show preloaded data immediately, then fetch fresh data in background
  useEffect(() => {
    if (!open || !invoiceId) return;

    if (preloadedInvoice) {
      setInvoice(preloadedInvoice);
      // Always fetch fresh data to catch status changes (e.g. viewed)
      fetchInvoice(invoiceId);
    } else {
      setLoading(true);
      fetchInvoice(invoiceId).finally(() => setLoading(false));
    }
  }, [open, invoiceId, preloadedInvoice, fetchInvoice]);

  // Poll for updates while dialog is open (every 5s)
  useEffect(() => {
    if (!open || !invoiceId) return;
    const interval = setInterval(() => fetchInvoice(invoiceId), 5000);
    return () => clearInterval(interval);
  }, [open, invoiceId, fetchInvoice]);

  // Invalidate the invoice list when dialog closes so table reflects changes
  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      if (!nextOpen) {
        queryClient.invalidateQueries({ queryKey: queryKeys.invoices.all });
      }
      onOpenChange(nextOpen);
    },
    [onOpenChange, queryClient],
  );

  const steps: TimelineStep[] = invoice
    ? [
        {
          icon: <FileTextIcon className="h-4 w-4" />,
          label: "Faktura opprettet",
          detail: `${invoice.invoice_number} — ${invoice.description}`,
          time: fmtDateTime(invoice.created_at),
          completed: true,
          active: invoice.status === "draft",
          color: "text-[#5B906F] dark:text-emerald-400",
          bgColor: "bg-[#f4f7f2] dark:bg-emerald-950/30",
        },
        {
          icon: <SendIcon className="h-4 w-4" />,
          label: "Sendt til kunde",
          detail: invoice.sent_at
            ? `E-post sendt til ${invoice.customer_email}`
            : `Venter på utsending til ${invoice.customer_email}`,
          time: invoice.sent_at ? fmtDateTime(invoice.sent_at) : null,
          completed: !!invoice.sent_at,
          active: invoice.status === "sent",
          color: "text-blue-600 dark:text-blue-400",
          bgColor: "bg-blue-50 dark:bg-blue-950/30",
        },
        {
          icon: <EyeIcon className="h-4 w-4" />,
          label: "Åpnet av kunde",
          detail: invoice.viewed_at
            ? `${invoice.customer_name} har åpnet fakturaen${invoice.viewed_count > 1 ? ` (${invoice.viewed_count} ganger)` : ""}`
            : "Kunden har ikke åpnet fakturaen ennå",
          time: invoice.viewed_at ? fmtDateTime(invoice.viewed_at) : null,
          completed: !!invoice.viewed_at,
          active: invoice.status === "viewed",
          color: "text-[#3E715C] dark:text-emerald-400",
          bgColor: "bg-[#eef3eb] dark:bg-emerald-950/20",
        },
        {
          icon: <CheckCircle2Icon className="h-4 w-4" />,
          label: "Betalt",
          detail: invoice.paid_at
            ? `${fmtAmount(invoice.total_amount)} mottatt`
            : "Venter på betaling",
          time: invoice.paid_at ? fmtDateTime(invoice.paid_at) : null,
          completed: !!invoice.paid_at,
          active: invoice.status === "paid",
          color: "text-emerald-600 dark:text-emerald-400",
          bgColor: "bg-emerald-50 dark:bg-emerald-950/30",
        },
      ]
    : [];

  const sc = STATUS_CONFIG[invoice?.status ?? "draft"] ?? STATUS_CONFIG.draft;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg gap-0 overflow-hidden rounded-2xl border-border p-0 sm:max-w-lg">
        {loading || !invoice ? (
          <div className="flex items-center justify-center py-20">
            <Loader2Icon className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="border-b border-border bg-gradient-to-br from-muted/50 to-card px-7 pt-7 pb-6">
              <DialogHeader className="space-y-0">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-[12px] font-bold tracking-[0.18em] uppercase text-muted-foreground">
                      Faktura
                    </p>
                    <DialogTitle className="mt-1 font-serif text-2xl font-normal tracking-tight text-foreground">
                      {invoice.invoice_number}
                    </DialogTitle>
                  </div>
                  <Badge
                    variant="secondary"
                    className={cn("rounded-full px-3 py-1 text-xs font-semibold", sc.variant)}
                  >
                    {sc.label}
                  </Badge>
                </div>
              </DialogHeader>

              {/* Quick info */}
              <div className="mt-5 grid grid-cols-3 gap-3">
                <div className="flex items-center gap-2 rounded-xl bg-card px-3 py-2.5 shadow-sm ring-1 ring-border">
                  <UserIcon className="h-3.5 w-3.5 text-muted-foreground" />
                  <div className="min-w-0">
                    <p className="truncate text-xs font-medium text-foreground">{invoice.customer_name}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 rounded-xl bg-card px-3 py-2.5 shadow-sm ring-1 ring-border">
                  <BanknoteIcon className="h-3.5 w-3.5 text-muted-foreground" />
                  <p className="truncate text-sm font-medium text-primary">
                    {fmtAmount(invoice.total_amount)}
                  </p>
                </div>
                <div className="flex items-center gap-2 rounded-xl bg-card px-3 py-2.5 shadow-sm ring-1 ring-border">
                  <CalendarIcon className="h-3.5 w-3.5 text-muted-foreground" />
                  <p className="font-mono text-xs text-foreground">{fmtDate(invoice.due_date)}</p>
                </div>
              </div>
            </div>

            {/* Timeline */}
            <div className="px-7 pt-7 pb-2">
              <p className="mb-5 text-[12px] font-bold tracking-[0.18em] uppercase text-muted-foreground">
                Tidslinje
              </p>
              <div>
                {steps.map((step, i) => (
                  <TimelineItem
                    key={i}
                    step={step}
                    isLast={i === steps.length - 1}
                    index={i}
                  />
                ))}
              </div>
            </div>

            {/* Payment info */}
            <div className="border-t border-border bg-muted/50 px-7 py-5">
              <p className="mb-3 text-[12px] font-bold tracking-[0.18em] uppercase text-muted-foreground">
                Betalingsdetaljer
              </p>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <CopyPill label="Kontonummer" value={invoice.bank_account} />
                {invoice.kid_number && (
                  <CopyPill label="KID" value={invoice.kid_number} />
                )}
                <CopyPill label="Beløp" value={fmtAmount(invoice.total_amount)} />
                <CopyPill label="Forfallsdato" value={fmtDate(invoice.due_date)} />
              </div>
              <div className="mt-4 flex justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2 text-xs"
                  asChild
                >
                  <a
                    href={`/faktura/${invoice.view_token}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <ExternalLinkIcon className="h-3.5 w-3.5" />
                    Åpne kundevisning
                  </a>
                </Button>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
