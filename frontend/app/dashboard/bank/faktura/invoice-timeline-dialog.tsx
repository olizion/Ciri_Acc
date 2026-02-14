"use client";

import { useState, useEffect } from "react";
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

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

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
      className="group flex items-center gap-2 rounded-xl border border-[#e2e8dd] bg-[#f8faf7] px-4 py-3 text-left transition-all hover:border-[#3E715C]/30 hover:bg-white active:scale-[0.98]"
    >
      <div className="min-w-0">
        <p className="text-[9px] font-bold tracking-[0.15em] uppercase text-[#96AFA8]">
          {label}
        </p>
        <p className="mt-0.5 truncate font-mono text-sm font-medium tracking-wide text-[#2d3a2e]">
          {value}
        </p>
      </div>
      <div
        className={cn(
          "ml-auto flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-all",
          copied
            ? "bg-emerald-50 text-emerald-600"
            : "text-[#96AFA8] group-hover:bg-[#3E715C]/10 group-hover:text-[#3E715C]"
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
              : "bg-[#f0f2ed] text-[#bfc7b8]"
          )}
        >
          <div className={cn(step.completed || step.active ? step.color : "text-[#bfc7b8]")}>
            {step.icon}
          </div>
        </div>
        {!isLast && (
          <div
            className={cn(
              "my-1 w-0.5 flex-1 min-h-[28px] rounded-full",
              step.completed ? "bg-[#3E715C]/20" : "bg-[#e2e8dd]"
            )}
          />
        )}
      </div>

      {/* Content */}
      <div className="pb-8">
        <p
          className={cn(
            "text-sm font-semibold leading-tight",
            step.completed || step.active ? "text-[#2d3a2e]" : "text-[#bfc7b8]"
          )}
        >
          {step.label}
        </p>
        <p
          className={cn(
            "mt-0.5 text-xs",
            step.completed || step.active ? "text-[#7a8a7c]" : "text-[#d1d5cb]"
          )}
        >
          {step.detail}
        </p>
        {step.time && (
          <p className="mt-1 font-mono text-[11px] tracking-wide text-[#96AFA8]">
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
  draft: { label: "Utkast", variant: "bg-gray-100 text-gray-600" },
  sent: { label: "Sendt", variant: "bg-blue-50 text-blue-700" },
  viewed: { label: "Åpnet", variant: "bg-[#f4f7f2] text-[#3E715C]" },
  paid: { label: "Betalt", variant: "bg-emerald-50 text-emerald-700" },
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

  useEffect(() => {
    if (preloadedInvoice) {
      setInvoice(preloadedInvoice);
      return;
    }
    if (!open || !invoiceId) return;
    setLoading(true);
    fetch(`${API_URL}/api/invoices/${invoiceId}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setInvoice(data))
      .finally(() => setLoading(false));
  }, [open, invoiceId, preloadedInvoice]);

  const steps: TimelineStep[] = invoice
    ? [
        {
          icon: <FileTextIcon className="h-4 w-4" />,
          label: "Faktura opprettet",
          detail: `${invoice.invoice_number} — ${invoice.description}`,
          time: fmtDateTime(invoice.created_at),
          completed: true,
          active: invoice.status === "draft",
          color: "text-[#5B906F]",
          bgColor: "bg-[#f4f7f2]",
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
          color: "text-blue-600",
          bgColor: "bg-blue-50",
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
          color: "text-[#3E715C]",
          bgColor: "bg-[#eef3eb]",
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
          color: "text-emerald-600",
          bgColor: "bg-emerald-50",
        },
      ]
    : [];

  const sc = STATUS_CONFIG[invoice?.status ?? "draft"] ?? STATUS_CONFIG.draft;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg gap-0 overflow-hidden rounded-2xl border-[#e2e8dd] p-0 sm:max-w-lg">
        {loading || !invoice ? (
          <div className="flex items-center justify-center py-20">
            <Loader2Icon className="h-6 w-6 animate-spin text-[#96AFA8]" />
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="border-b border-[#eef1eb] bg-gradient-to-br from-[#f8faf7] to-white px-7 pt-7 pb-6">
              <DialogHeader className="space-y-0">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-[10px] font-bold tracking-[0.18em] uppercase text-[#96AFA8]">
                      Faktura
                    </p>
                    <DialogTitle className="mt-1 font-serif text-2xl font-normal tracking-tight text-[#2d3a2e]">
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
                <div className="flex items-center gap-2 rounded-xl bg-white px-3 py-2.5 shadow-sm ring-1 ring-[#e2e8dd]">
                  <UserIcon className="h-3.5 w-3.5 text-[#96AFA8]" />
                  <div className="min-w-0">
                    <p className="truncate text-xs font-medium text-[#2d3a2e]">{invoice.customer_name}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 rounded-xl bg-white px-3 py-2.5 shadow-sm ring-1 ring-[#e2e8dd]">
                  <BanknoteIcon className="h-3.5 w-3.5 text-[#96AFA8]" />
                  <p className="truncate font-serif text-sm font-medium text-[#3E715C]">
                    {fmtAmount(invoice.total_amount)}
                  </p>
                </div>
                <div className="flex items-center gap-2 rounded-xl bg-white px-3 py-2.5 shadow-sm ring-1 ring-[#e2e8dd]">
                  <CalendarIcon className="h-3.5 w-3.5 text-[#96AFA8]" />
                  <p className="font-mono text-xs text-[#2d3a2e]">{fmtDate(invoice.due_date)}</p>
                </div>
              </div>
            </div>

            {/* Timeline */}
            <div className="px-7 pt-7 pb-2">
              <p className="mb-5 text-[10px] font-bold tracking-[0.18em] uppercase text-[#96AFA8]">
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
            <div className="border-t border-[#eef1eb] bg-[#f8faf7] px-7 py-5">
              <p className="mb-3 text-[10px] font-bold tracking-[0.18em] uppercase text-[#96AFA8]">
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
