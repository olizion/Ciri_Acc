"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  SendIcon,
  CheckCircle2Icon,
  Loader2Icon,
  FileTextIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { API_BASE_URL, COMPANY_ID } from "@/lib/api";

export function InvoiceFormCard() {
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [mvaRate, setMvaRate] = useState("25");
  const [dueDate, setDueDate] = useState("");
  const [bankAccount, setBankAccount] = useState("");
  const [kidNumber, setKidNumber] = useState("");

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const numAmount = parseFloat(amount) || 0;
  const numMva = numAmount * (parseInt(mvaRate) / 100);
  const numTotal = numAmount + numMva;

  const canSubmit =
    customerName && customerEmail && description && numAmount > 0 && dueDate && bankAccount;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setLoading(true);
    setError(null);

    try {
      // Step 1: Create the invoice
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

      if (!createRes.ok) {
        const errBody = await createRes.text();
        console.error("Invoice create failed:", createRes.status, errBody);
        setError("Kunne ikke opprette faktura. Sjekk at alle felt er fylt ut.");
        return;
      }

      const invoice = await createRes.json();

      // Step 2: Try to send email (non-fatal if it fails)
      try {
        const sendRes = await fetch(
          `${API_BASE_URL}/api/invoices/${invoice.id}/send`,
          { method: "POST" }
        );
        if (sendRes.ok) {
          setSuccess(
            `Faktura ${invoice.invoice_number} er sendt til ${customerEmail}`
          );
          return;
        }
      } catch {
        // Email send failed — not fatal
      }

      // Email didn't send, but invoice was created
      setSuccess(
        `Faktura ${invoice.invoice_number} er opprettet (e-post ikke konfigurert)`
      );
    } catch (err) {
      console.error("Invoice error:", err);
      setError("Kunne ikke koble til serveren. Er backend kjørende?");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="rounded-2xl border border-green-200 bg-green-50 p-5"
      >
        <div className="flex items-center gap-3">
          <CheckCircle2Icon className="h-6 w-6 text-green-600" />
          <div>
            <p className="font-semibold text-green-900">{success}</p>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-purple-100 bg-white p-5 shadow-sm dark:border-border dark:bg-card"
    >
      <div className="mb-4 flex items-center gap-2">
        <FileTextIcon className="h-5 w-5 text-purple-500" />
        <h3 className="font-display text-sm font-semibold">Ny faktura</h3>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs">Kundenavn</Label>
          <Input
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            placeholder="Ola Nordmann AS"
            className="mt-1 h-9 text-sm"
          />
        </div>
        <div>
          <Label className="text-xs">E-post</Label>
          <Input
            type="email"
            value={customerEmail}
            onChange={(e) => setCustomerEmail(e.target.value)}
            placeholder="faktura@kunde.no"
            className="mt-1 h-9 text-sm"
          />
        </div>
        <div className="col-span-2">
          <Label className="text-xs">Beskrivelse</Label>
          <Input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Konsulenttjenester februar 2026"
            className="mt-1 h-9 text-sm"
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
            className="mt-1 h-9 text-sm"
          />
        </div>
        <div>
          <Label className="text-xs">MVA-sats</Label>
          <Select value={mvaRate} onValueChange={setMvaRate}>
            <SelectTrigger className="mt-1 h-9 text-sm">
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
            className="mt-1 h-9 text-sm"
          />
        </div>
        <div>
          <Label className="text-xs">Bankkonto</Label>
          <Input
            value={bankAccount}
            onChange={(e) => setBankAccount(e.target.value)}
            placeholder="1234 56 78901"
            className="mt-1 h-9 text-sm"
          />
        </div>
        <div className="col-span-2">
          <Label className="text-xs">KID-nummer (valgfritt)</Label>
          <Input
            value={kidNumber}
            onChange={(e) => setKidNumber(e.target.value)}
            placeholder="00012345"
            className="mt-1 h-9 text-sm"
          />
        </div>
      </div>

      {/* Summary + submit */}
      <div className="mt-4 flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          {numAmount > 0 && (
            <>
              MVA: kr {numMva.toLocaleString("nb-NO", { minimumFractionDigits: 2 })} &middot;{" "}
              <span className="font-semibold text-purple-700">
                Totalt: kr {numTotal.toLocaleString("nb-NO", { minimumFractionDigits: 2 })}
              </span>
            </>
          )}
        </div>
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
          Send faktura
        </Button>
      </div>

      {error && (
        <p className="mt-2 text-xs text-red-600">{error}</p>
      )}
    </motion.div>
  );
}
