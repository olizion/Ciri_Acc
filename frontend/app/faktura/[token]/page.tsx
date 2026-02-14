"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import Image from "next/image";
import {
  CheckIcon,
  CopyIcon,
  FileTextIcon,
  CalendarIcon,
  ShieldCheckIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface PublicInvoice {
  invoice_number: string;
  company_name: string;
  customer_name: string;
  description: string;
  amount: number;
  mva_rate: number;
  mva_amount: number;
  total_amount: number;
  due_date: string;
  bank_account: string;
  kid_number: string | null;
  status: string;
}

// ============================================================================
// COPY CARD — large, tactile, unmissable
// ============================================================================

function CopyCard({
  label,
  value,
  rawValue,
  mono,
  accent,
  delay = 0,
}: {
  label: string;
  value: string;
  rawValue?: string;
  mono?: boolean;
  accent?: boolean;
  delay?: number;
}) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    await navigator.clipboard.writeText(rawValue ?? value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2200);
  };

  return (
    <motion.button
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.45, delay, ease: [0.25, 0.46, 0.45, 0.94] }}
      onClick={copy}
      className={cn(
        "group relative flex w-full items-center justify-between overflow-hidden rounded-2xl border text-left transition-all duration-200 active:scale-[0.98]",
        accent
          ? "border-[#3E715C]/20 bg-gradient-to-r from-[#f4f7f2] to-white px-6 py-5 hover:border-[#3E715C]/40 hover:shadow-lg hover:shadow-[#3E715C]/8"
          : "border-[#e2e8dd] bg-white px-6 py-5 hover:border-[#3E715C]/25 hover:shadow-lg hover:shadow-[#3E715C]/6"
      )}
    >
      {/* Hover shimmer */}
      <div className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-[#3E715C]/[0.03] to-transparent transition-transform duration-700 group-hover:translate-x-full" />

      <div className="relative min-w-0">
        <p className="text-[10px] font-bold tracking-[0.18em] uppercase text-[#96AFA8]">
          {label}
        </p>
        <p
          className={cn(
            "mt-2 truncate text-[#2d3a2e]",
            mono
              ? "font-mono text-lg tracking-[0.08em] font-medium"
              : accent
                ? "font-serif text-2xl tracking-tight"
                : "font-serif text-lg"
          )}
        >
          {value}
        </p>
      </div>

      <div
        className={cn(
          "relative ml-4 flex h-12 w-12 shrink-0 items-center justify-center rounded-xl transition-all duration-200",
          copied
            ? "scale-110 bg-emerald-50 text-emerald-600"
            : "bg-[#f0f2ed] text-[#96AFA8] group-hover:bg-[#3E715C] group-hover:text-white group-hover:shadow-md group-hover:shadow-[#3E715C]/20"
        )}
      >
        {copied ? (
          <motion.div
            initial={{ scale: 0, rotate: -90 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 400, damping: 15 }}
          >
            <CheckIcon className="h-5 w-5" />
          </motion.div>
        ) : (
          <CopyIcon className="h-4.5 w-4.5 transition-transform group-hover:scale-110" />
        )}
      </div>
    </motion.button>
  );
}

// ============================================================================
// HELPERS
// ============================================================================

function formatAmount(n: number) {
  return n.toLocaleString("nb-NO", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatDate(iso: string) {
  const d = new Date(iso);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}.${mm}.${yyyy}`;
}

// ============================================================================
// PAGE
// ============================================================================

export default function PublicInvoicePage() {
  const params = useParams();
  const token = params.token as string;
  const [invoice, setInvoice] = useState<PublicInvoice | null>(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_URL}/api/invoices/public/${token}`)
      .then((res) => {
        if (!res.ok) throw new Error();
        return res.json();
      })
      .then(setInvoice)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f0f2ed]">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
          className="h-8 w-8 rounded-full border-[3px] border-[#e2e8dd] border-t-[#3E715C]"
        />
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-5 bg-[#f0f2ed] p-8 text-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[#e2e8dd]">
          <FileTextIcon className="h-9 w-9 text-[#96AFA8]" />
        </div>
        <h1 className="font-serif text-2xl text-[#2d3a2e]">
          Faktura ikke funnet
        </h1>
        <p className="max-w-xs text-sm leading-relaxed text-[#7a8a7c]">
          Denne lenken er ugyldig eller fakturaen er slettet.
        </p>
      </div>
    );
  }

  const isPaid = invoice.status === "paid";

  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* ================================================================ */}
      {/* BACKGROUND — the painting as an atmospheric full-bleed hero      */}
      {/* ================================================================ */}
      <div className="pointer-events-none fixed inset-0">
        {/* The painting — fills the entire screen */}
        <Image
          src="/ciribakgrunn.png"
          alt=""
          fill
          className="object-cover"
          priority
        />
        {/* Light scrim so text stays readable */}
        <div className="absolute inset-0 bg-[#1e3830]/20" />
      </div>

      {/* ================================================================ */}
      {/* CONTENT                                                          */}
      {/* ================================================================ */}
      <div className="relative z-10 flex flex-col items-center px-5 pb-16 pt-10 sm:pt-14">
        {/* ---- Top branding on the painting ---- */}
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="mb-6 flex items-center gap-3"
        >
          <div className="h-9 w-9 overflow-hidden rounded-full ring-2 ring-white/30 shadow-lg">
            <Image
              src="/ciribakgrunn.png"
              alt="Ciri"
              width={36}
              height={36}
              className="h-full w-full object-cover"
              priority
            />
          </div>
          <div>
            <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-white/60">
              Faktura
            </p>
            <p className="font-serif text-sm text-white/90">
              {invoice.company_name}
            </p>
          </div>
        </motion.div>

        {/* ---- Hero amount — floating on the painting ---- */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="mb-2 text-center"
        >
          {isPaid && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-emerald-500/20 px-3.5 py-1.5 text-xs font-semibold text-emerald-100 backdrop-blur-md"
            >
              <CheckIcon className="h-3.5 w-3.5" />
              Betalt
            </motion.div>
          )}
          <p className="text-[11px] font-semibold tracking-[0.25em] uppercase text-white/40">
            {isPaid ? "Betalt beløp" : "Å betale"}
          </p>
          <h1
            className="mt-2 font-serif text-5xl font-normal tracking-tight text-white sm:text-6xl"
            style={{ textShadow: "0 2px 20px rgba(0,0,0,0.15)" }}
          >
            kr {formatAmount(invoice.total_amount)}
          </h1>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.25 }}
          className="mb-10 flex items-center gap-2 text-xs text-white/40"
        >
          <CalendarIcon className="h-3 w-3" />
          <span>Forfaller {formatDate(invoice.due_date)}</span>
        </motion.div>

        {/* ---- Main card — the practical stuff ---- */}
        <div className="w-full max-w-md">
          {/* Payment copy fields */}
          <div className="space-y-3">
            <CopyCard
              label="Kontonummer"
              value={invoice.bank_account}
              mono
              accent
              delay={0.3}
            />
            {invoice.kid_number && (
              <CopyCard
                label="KID-nummer"
                value={invoice.kid_number}
                mono
                accent
                delay={0.38}
              />
            )}
            <CopyCard
              label="Beløp å betale"
              value={`kr ${formatAmount(invoice.total_amount)}`}
              rawValue={formatAmount(invoice.total_amount)}
              accent
              delay={0.46}
            />
            <CopyCard
              label="Forfallsdato"
              value={formatDate(invoice.due_date)}
              delay={0.54}
            />
          </div>

          {/* MVA breakdown — quiet detail */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.62 }}
            className="mt-5 flex items-center justify-center gap-3 text-[11px] text-[#96AFA8]"
          >
            <span>Eks. MVA: kr {formatAmount(invoice.amount)}</span>
            <span className="text-[#CFCEA1]">·</span>
            <span>MVA {invoice.mva_rate}%: kr {formatAmount(invoice.mva_amount)}</span>
          </motion.div>

          {/* ---- Golden divider ---- */}
          <motion.div
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: 0.6, delay: 0.68 }}
            className="mx-auto mt-8 h-px w-3/4 bg-gradient-to-r from-transparent via-[#CFCEA1]/50 to-transparent"
          />

          {/* ---- Ciri summary card ---- */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.7 }}
            className="mt-8 rounded-2xl border border-[#e2e8dd] bg-white p-5"
          >
            <div className="flex gap-4">
              <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full shadow-md ring-2 ring-[#3E715C]/15">
                <Image
                  src="/ciribakgrunn.png"
                  alt="Ciri"
                  width={40}
                  height={40}
                  className="h-full w-full object-cover"
                />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className="text-sm font-semibold text-[#2d3a2e]">
                    {invoice.company_name}
                  </p>
                  <ShieldCheckIcon className="h-3.5 w-3.5 text-[#5B906F]" />
                </div>
                <p className="mt-1 text-[13px] text-[#5a6b5d]">
                  {invoice.description}
                </p>
              </div>
            </div>
            <div className="mt-4 flex items-center gap-4 border-t border-[#eef1eb] pt-3 text-[11px] text-[#96AFA8]">
              <span>{invoice.invoice_number}</span>
              <span className="text-[#CFCEA1]">·</span>
              <span>Til {invoice.customer_name}</span>
              <span className="text-[#CFCEA1]">·</span>
              <span>Eks. MVA: kr {formatAmount(invoice.amount)}</span>
            </div>
          </motion.div>

          {/* Footer */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.85 }}
            className="mt-8 text-center font-serif text-sm italic text-white/70"
            style={{ textShadow: "0 1px 8px rgba(0,0,0,0.2)" }}
          >
            Sendt via Ciri
          </motion.p>
        </div>
      </div>
    </div>
  );
}
