"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  PlusIcon,
  SendIcon,
  EyeIcon,
  CheckCircle2Icon,
  FileTextIcon,
  XIcon,
  Loader2Icon,
  ExternalLinkIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { API_BASE_URL, COMPANY_ID } from "@/lib/api";
import { useCiriActionListener } from "@/lib/ciri-actions";
import { toast } from "sonner";
import InvoiceTimelineDialog from "./invoice-timeline-dialog";

// ============================================================================
// TYPES
// ============================================================================

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

type StatusFilter = "all" | "draft" | "sent" | "viewed" | "paid";

// ============================================================================
// INLINE CREATE FORM
// ============================================================================

function InvoiceCreateForm({
  onCreated,
  onCancel,
}: {
  onCreated: (inv: Invoice) => void;
  onCancel: () => void;
}) {
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [mvaRate, setMvaRate] = useState("25");
  const [dueDate, setDueDate] = useState("");
  const [bankAccount, setBankAccount] = useState("");
  const [kidNumber, setKidNumber] = useState("");
  const [loading, setLoading] = useState(false);
  const [sendAfter, setSendAfter] = useState(true);

  const numAmount = parseFloat(amount) || 0;
  const numMva = numAmount * (parseInt(mvaRate) / 100);
  const numTotal = numAmount + numMva;

  const canSubmit =
    customerName && customerEmail && description && numAmount > 0 && dueDate && bankAccount;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setLoading(true);
    try {
      // Create
      const createRes = await fetch(`${API_BASE_URL}/api/invoices`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer_name: customerName,
          customer_email: customerEmail,
          description,
          amount: numAmount,
          mva_rate: parseInt(mvaRate),
          due_date: dueDate,
          bank_account: bankAccount,
          kid_number: kidNumber || null,
          company_id: COMPANY_ID,
        }),
      });
      if (!createRes.ok) throw new Error();
      let invoice = await createRes.json();

      // Send email if opted in
      if (sendAfter) {
        const sendRes = await fetch(
          `${API_BASE_URL}/api/invoices/${invoice.id}/send`,
          { method: "POST" }
        );
        if (sendRes.ok) {
          invoice = await sendRes.json();
        }
      }

      onCreated(invoice);
    } catch {
      toast.error("Kunne ikke opprette faktura. Prøv igjen.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      className="overflow-hidden"
    >
      <div className="rounded-2xl border border-purple-100 bg-white p-6 shadow-sm">
        <div className="mb-5 flex items-center justify-between">
          <h3 className="font-display text-lg font-semibold tracking-tight">
            Ny faktura
          </h3>
          <button
            onClick={onCancel}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted"
          >
            <XIcon className="h-4 w-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <Label className="text-xs">Kundenavn</Label>
            <Input
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="Ola Nordmann AS"
              className="mt-1"
            />
          </div>
          <div>
            <Label className="text-xs">E-post</Label>
            <Input
              type="email"
              value={customerEmail}
              onChange={(e) => setCustomerEmail(e.target.value)}
              placeholder="faktura@kunde.no"
              className="mt-1"
            />
          </div>
          <div className="sm:col-span-2">
            <Label className="text-xs">Beskrivelse</Label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Konsulenttjenester februar 2026"
              className="mt-1"
            />
          </div>
          <div>
            <Label className="text-xs">Beløp eks. MVA (kr)</Label>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="10000"
              className="mt-1"
            />
          </div>
          <div>
            <Label className="text-xs">MVA-sats</Label>
            <Select value={mvaRate} onValueChange={setMvaRate}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="25">25%</SelectItem>
                <SelectItem value="15">15%</SelectItem>
                <SelectItem value="0">0% (fritatt)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Forfallsdato</Label>
            <Input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="mt-1"
            />
          </div>
          <div>
            <Label className="text-xs">Bankkonto</Label>
            <Input
              value={bankAccount}
              onChange={(e) => setBankAccount(e.target.value)}
              placeholder="1234 56 78901"
              className="mt-1"
            />
          </div>
          <div>
            <Label className="text-xs">KID-nummer (valgfritt)</Label>
            <Input
              value={kidNumber}
              onChange={(e) => setKidNumber(e.target.value)}
              placeholder="00012345"
              className="mt-1"
            />
          </div>
        </div>

        {/* Summary */}
        {numAmount > 0 && (
          <div className="mt-5 flex items-center gap-6 rounded-xl bg-purple-50/60 px-5 py-3 text-sm">
            <span className="text-muted-foreground">
              MVA: <strong className="text-foreground">kr {numMva.toLocaleString("nb-NO", { minimumFractionDigits: 2 })}</strong>
            </span>
            <span className="text-muted-foreground">
              Totalt: <strong className="text-lg text-purple-700">kr {numTotal.toLocaleString("nb-NO", { minimumFractionDigits: 2 })}</strong>
            </span>
          </div>
        )}

        <div className="mt-5 flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            <input
              type="checkbox"
              checked={sendAfter}
              onChange={(e) => setSendAfter(e.target.checked)}
              className="rounded border-gray-300"
            />
            Send e-post til kunden
          </label>
          <div className="ml-auto flex gap-2">
            <Button variant="ghost" size="sm" onClick={onCancel}>
              Avbryt
            </Button>
            <Button
              size="sm"
              onClick={handleSubmit}
              disabled={!canSubmit || loading}
              className="gap-2"
            >
              {loading ? (
                <Loader2Icon className="h-4 w-4 animate-spin" />
              ) : (
                <SendIcon className="h-4 w-4" />
              )}
              {sendAfter ? "Opprett og send" : "Opprett faktura"}
            </Button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ============================================================================
// STATUS BADGE
// ============================================================================

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; variant: string; icon: React.ReactNode }> = {
    draft: {
      label: "Utkast",
      variant: "bg-gray-100 text-gray-600",
      icon: <FileTextIcon className="h-3 w-3" />,
    },
    sent: {
      label: "Sendt",
      variant: "bg-blue-100 text-blue-700",
      icon: <SendIcon className="h-3 w-3" />,
    },
    viewed: {
      label: "Åpnet",
      variant: "bg-purple-100 text-purple-700",
      icon: <EyeIcon className="h-3 w-3" />,
    },
    paid: {
      label: "Betalt",
      variant: "bg-green-100 text-green-700",
      icon: <CheckCircle2Icon className="h-3 w-3" />,
    },
  };
  const c = config[status] || config.draft;
  return (
    <Badge
      variant="secondary"
      className={cn("gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium", c.variant)}
    >
      {c.icon}
      {c.label}
    </Badge>
  );
}

// ============================================================================
// MAIN PAGE
// ============================================================================

export default function FakturaPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [filter, setFilter] = useState<StatusFilter>("all");
  const [showCreate, setShowCreate] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);

  // Ciri bubble action listeners
  useCiriActionListener("lag-faktura", useCallback(() => setShowCreate(true), []));
  useCiriActionListener("vis-sendte-fakturaer", useCallback(() => setFilter("sent"), []));
  useCiriActionListener("vis-ubetalte-fakturaer", useCallback(() => setFilter("viewed"), []));

  const fetchInvoices = useCallback(async () => {
    try {
      const url = new URL(`${API_BASE_URL}/api/invoices`);
      url.searchParams.set("company_id", COMPANY_ID);
      if (filter !== "all") url.searchParams.set("status", filter);

      const res = await fetch(url.toString());
      if (res.ok) {
        const data = await res.json();
        setInvoices(data.items);
      }
    } catch {
      toast.error("Kunne ikke hente fakturaer.");
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  const handleCreated = (inv: Invoice) => {
    setInvoices((prev) => [inv, ...prev]);
    setShowCreate(false);
  };

  const formatAmount = (n: number) =>
    `kr ${n.toLocaleString("nb-NO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString("nb-NO", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });

  const tabCounts = {
    all: invoices.length,
    draft: invoices.filter((i) => i.status === "draft").length,
    sent: invoices.filter((i) => i.status === "sent").length,
    viewed: invoices.filter((i) => i.status === "viewed").length,
    paid: invoices.filter((i) => i.status === "paid").length,
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight">
            Fakturaer
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Opprett og send fakturaer til kundene dine.
          </p>
        </div>
        <Button
          onClick={() => setShowCreate(!showCreate)}
          className="gap-2"
        >
          <PlusIcon className="h-4 w-4" />
          Ny faktura
        </Button>
      </div>

      {/* Create form */}
      <AnimatePresence>
        {showCreate && (
          <InvoiceCreateForm
            onCreated={handleCreated}
            onCancel={() => setShowCreate(false)}
          />
        )}
      </AnimatePresence>

      {/* Filter tabs */}
      <Tabs
        value={filter}
        onValueChange={(v) => setFilter(v as StatusFilter)}
      >
        <TabsList>
          <TabsTrigger value="all">Alle ({tabCounts.all})</TabsTrigger>
          <TabsTrigger value="draft">Utkast ({tabCounts.draft})</TabsTrigger>
          <TabsTrigger value="sent">Sendt ({tabCounts.sent})</TabsTrigger>
          <TabsTrigger value="viewed">Åpnet ({tabCounts.viewed})</TabsTrigger>
          <TabsTrigger value="paid">Betalt ({tabCounts.paid})</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Table */}
      <div className="rounded-2xl border bg-white shadow-sm dark:bg-card">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-[120px]">Fakturanr</TableHead>
              <TableHead>Kunde</TableHead>
              <TableHead className="text-right">Beløp</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Forfallsdato</TableHead>
              <TableHead className="w-[60px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="py-12 text-center text-muted-foreground">
                  <Loader2Icon className="mx-auto h-5 w-5 animate-spin" />
                </TableCell>
              </TableRow>
            ) : invoices.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-12 text-center text-muted-foreground">
                  <FileTextIcon className="mx-auto mb-2 h-8 w-8 text-muted-foreground/40" />
                  <p>Ingen fakturaer ennå</p>
                  <p className="text-xs">Klikk &quot;Ny faktura&quot; for å komme i gang.</p>
                </TableCell>
              </TableRow>
            ) : (
              invoices.map((inv) => (
                <TableRow
                  key={inv.id}
                  className="group cursor-pointer"
                  onClick={() => setSelectedInvoice(inv)}
                >
                  <TableCell className="font-medium">
                    {inv.invoice_number}
                  </TableCell>
                  <TableCell>
                    <div>
                      <span className="font-medium">{inv.customer_name}</span>
                      <p className="text-xs text-muted-foreground">
                        {inv.customer_email}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-semibold">
                    {formatAmount(inv.total_amount)}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={inv.status} />
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDate(inv.due_date)}
                  </TableCell>
                  <TableCell>
                    <a
                      href={`/faktura/${inv.view_token}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="invisible rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted group-hover:visible"
                    >
                      <ExternalLinkIcon className="h-4 w-4" />
                    </a>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Timeline dialog */}
      <InvoiceTimelineDialog
        invoiceId={selectedInvoice?.id ?? null}
        open={!!selectedInvoice}
        onOpenChange={(open) => {
          if (!open) setSelectedInvoice(null);
        }}
        preloadedInvoice={selectedInvoice}
      />

      <LearnMoreDocs sections={["faktura", "e-post"]} />
    </div>
  );
}
