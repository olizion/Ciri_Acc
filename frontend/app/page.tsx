"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import {
  BrainCircuitIcon,
  LandmarkIcon,
  ReceiptIcon,
  CalculatorIcon,
  UsersIcon,
  FileBarChartIcon,
  ArrowRightIcon,
  ShieldCheckIcon,
  MailIcon,
  SparklesIcon,
  CheckIcon,
  ScanSearchIcon,
  LinkIcon,
  ZapIcon,
  LockIcon,
  ServerIcon,
  ScaleIcon,
  FileCheckIcon,
  BotIcon,
  HandIcon,
  FileSpreadsheetIcon,
  SendIcon
} from "lucide-react";
import CiriLogo from "@/components/layout/ciri-logo";
import MarketingNav from "@/components/marketing/marketing-nav";
import MarketingFooter from "@/components/marketing/marketing-footer";
import { cn } from "@/lib/utils";

// ============================================================================
// ANIMATED CHAT DEMO
// ============================================================================

const CHAT_CONVERSATIONS = [
  {
    userText: "Hva er omsetningen de siste 6 manedene?",
    botText: "Her er omsetningen for de siste 6 manedene:",
    type: "chart" as const,
    chart: [
      { month: "Sep", value: 142000 },
      { month: "Okt", value: 168000 },
      { month: "Nov", value: 195000 },
      { month: "Des", value: 231000 },
      { month: "Jan", value: 187000 },
      { month: "Feb", value: 214000 }
    ],
    summary: { total: "1 137 000", trend: "+12.4%", avg: "189 500" }
  },
  {
    userText: "Send faktura til Berge Konsult AS på kr 18 500",
    botText: "Faktura opprettet og sendt!",
    type: "invoice" as const,
    invoiceData: {
      to: "Berge Konsult AS",
      amount: "kr 18 500,00",
      mva: "kr 4 625,00",
      total: "kr 23 125,00",
      due: "21.03.2026",
      ref: "#2026-0134"
    }
  },
  {
    userText: "Hva skylder jeg i MVA denne terminen?",
    botText: "MVA-oversikt for 1. termin 2026:",
    type: "table" as const,
    tableRows: [
      { label: "Utgaende MVA (25%)", value: "kr 45 200" },
      { label: "Inngaende MVA", value: "kr 12 800" },
      { label: "A betale", value: "kr 32 400", highlight: true }
    ],
    footer: "Frist: 10. april 2026"
  }
];

const CHAT_TICK = 600;

function AnimatedChatDemo() {
  const [convoIdx, setConvoIdx] = useState(0);
  const [step, setStep] = useState(-1);
  const [showData, setShowData] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [fading, setFading] = useState(false);
  const timersRef = useRef<NodeJS.Timeout[]>([]);

  const clearTimers = () => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
  };

  const schedule = (fn: () => void, ms: number) => {
    timersRef.current.push(setTimeout(fn, ms));
  };

  const runCycle = (idx: number) => {
    clearTimers();
    setFading(false);
    setStep(-1);
    setShowData(false);
    setIsTyping(false);
    setConvoIdx(idx);

    // User message appears
    schedule(() => setStep(0), 2 * CHAT_TICK);
    // Typing indicator
    schedule(() => setIsTyping(true), 4 * CHAT_TICK);
    // Bot message
    schedule(() => {
      setIsTyping(false);
      setStep(1);
    }, 7 * CHAT_TICK);
    // Show data (chart/table/invoice)
    schedule(() => setShowData(true), 8 * CHAT_TICK);
    // Fade out and restart with next conversation
    schedule(() => setFading(true), 18 * CHAT_TICK);
    schedule(() => {
      const next = (idx + 1) % CHAT_CONVERSATIONS.length;
      runCycle(next);
    }, 19 * CHAT_TICK);
  };

  useEffect(() => {
    if (!hasStarted) return;
    runCycle(0);
    return () => clearTimers();
  }, [hasStarted]);

  const convo = CHAT_CONVERSATIONS[convoIdx];

  return (
    <motion.div
      onViewportEnter={() => {
        if (!hasStarted) setHasStarted(true);
      }}
      viewport={{ once: true, margin: "-100px" }}
      className="relative overflow-hidden rounded-3xl border border-white/15 bg-white/[0.08] p-5 shadow-2xl shadow-black/5 backdrop-blur-3xl backdrop-saturate-[2] sm:p-6">
      {/* ── Glass layers ── */}
      {/* Static specular — top-left corner bloom */}
      <div className="pointer-events-none absolute inset-0 rounded-3xl bg-gradient-to-br from-white/40 via-transparent to-transparent" />
      {/* Edge highlights — crisp light catch on rims */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/70 to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 left-0 w-px bg-gradient-to-b from-white/60 via-white/20 to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-px bg-gradient-to-b from-white/15 via-transparent to-transparent" />

      {/* Header */}
      <div className="relative z-10 flex items-center gap-3 border-b border-white/15 pb-4">
        <div className="h-8 w-8 shrink-0 overflow-hidden rounded-full shadow-lg ring-2 shadow-black/10 ring-white/30">
          <Image
            src="/ciribakgrunn.png"
            alt="Ciri"
            width={32}
            height={32}
            className="h-full w-full object-cover"
          />
        </div>
        <div>
          <p className="text-sm font-medium text-[#1a2e23]">Snakk med Ciri</p>
          <p className="text-[12px] text-[#5B906F]">Online</p>
        </div>
      </div>

      {/* Messages */}
      <motion.div
        animate={{ opacity: fading ? 0 : 1 }}
        transition={{ duration: 0.4 }}
        className="relative z-10 mt-5 space-y-4 overflow-hidden"
        style={{ height: 400 }}>
        {/* Greeting */}
        <div className="flex gap-3">
          <div className="h-7 w-7 shrink-0 overflow-hidden rounded-full">
            <Image
              src="/ciribakgrunn.png"
              alt=""
              width={28}
              height={28}
              className="h-full w-full object-cover"
            />
          </div>
          <div className="relative overflow-hidden rounded-2xl rounded-tl-md border border-white/15 bg-white/[0.1] px-4 py-3 text-sm text-[#4a5e52] backdrop-blur-2xl">
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-transparent" />
            <span className="relative">Hei! Hva kan jeg hjelpe deg med?</span>
          </div>
        </div>

        {/* User question */}
        <AnimatePresence>
          {step >= 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex justify-end">
              <div className="relative overflow-hidden rounded-2xl rounded-tr-md border border-[#3E715C]/30 bg-[#3E715C]/60 px-4 py-3 text-sm text-white shadow-lg shadow-[#3E715C]/25 backdrop-blur-2xl">
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/15 via-transparent to-transparent" />
                <span className="relative">{convo.userText}</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Typing indicator */}
        <AnimatePresence>
          {isTyping && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex gap-3">
              <div className="h-7 w-7 shrink-0 overflow-hidden rounded-full">
                <Image
                  src="/ciribakgrunn.png"
                  alt=""
                  width={28}
                  height={28}
                  className="h-full w-full object-cover"
                />
              </div>
              <div className="relative overflow-hidden rounded-2xl rounded-tl-md border border-white/15 bg-white/[0.1] px-4 py-3 backdrop-blur-2xl">
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-transparent" />
                <div className="relative flex items-center gap-1.5">
                  {[0, 1, 2].map((i) => (
                    <motion.div
                      key={i}
                      animate={{ y: [0, -4, 0] }}
                      transition={{ duration: 0.6, delay: i * 0.15, repeat: Infinity }}
                      className="h-1.5 w-1.5 rounded-full bg-[#8a9a8e]"
                    />
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Bot reply */}
        <AnimatePresence>
          {step >= 1 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex gap-3">
              <div className="h-7 w-7 shrink-0 overflow-hidden rounded-full">
                <Image
                  src="/ciribakgrunn.png"
                  alt=""
                  width={28}
                  height={28}
                  className="h-full w-full object-cover"
                />
              </div>
              <div className="relative flex-1 overflow-hidden rounded-2xl rounded-tl-md border border-white/15 bg-white/[0.1] px-4 py-3 backdrop-blur-2xl">
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-transparent" />
                <div className="relative">
                  <p className="text-sm text-[#4a5e52]">{convo.botText}</p>

                  {/* Chart response */}
                  {convo.type === "chart" && (
                    <>
                      <div className="mt-3 flex items-end gap-2" style={{ height: 112 }}>
                        {convo.chart.map((bar, i) => {
                          const max = Math.max(...convo.chart.map((b) => b.value));
                          const barHeight = Math.round((bar.value / max) * 90);
                          return (
                            <div
                              key={bar.month}
                              className="flex h-full flex-1 flex-col items-center justify-end">
                              <motion.div
                                initial={{ height: 0 }}
                                animate={showData ? { height: barHeight } : { height: 0 }}
                                transition={{
                                  duration: 0.6,
                                  delay: i * 0.1,
                                  ease: [0.25, 0.46, 0.45, 0.94]
                                }}
                                className="w-full rounded-t-md bg-gradient-to-t from-[#3E715C]/80 to-[#5B906F]/70 backdrop-blur-md"
                              />
                              <span className="mt-1.5 text-[13px] text-[#8a9a8e]">{bar.month}</span>
                            </div>
                          );
                        })}
                      </div>
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={showData ? { opacity: 1 } : { opacity: 0 }}
                        transition={{ delay: 0.8 }}
                        className="mt-3 grid grid-cols-3 gap-2 rounded-xl border border-white/10 bg-white/[0.08] p-2.5 backdrop-blur-xl">
                        <div className="text-center">
                          <p className="text-[13px] text-[#8a9a8e]">Totalt</p>
                          <p className="text-xs font-medium text-[#1a2e23]">
                            kr {convo.summary.total}
                          </p>
                        </div>
                        <div className="text-center">
                          <p className="text-[13px] text-[#8a9a8e]">Trend</p>
                          <p className="text-xs font-medium text-[#3E715C]">
                            {convo.summary.trend}
                          </p>
                        </div>
                        <div className="text-center">
                          <p className="text-[13px] text-[#8a9a8e]">Snitt/mnd</p>
                          <p className="text-xs font-medium text-[#1a2e23]">
                            kr {convo.summary.avg}
                          </p>
                        </div>
                      </motion.div>
                    </>
                  )}

                  {/* Invoice response */}
                  {convo.type === "invoice" && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={showData ? { opacity: 1 } : { opacity: 0 }}
                      transition={{ duration: 0.4 }}
                      className="mt-3 space-y-1.5 rounded-xl border border-white/10 bg-white/[0.08] p-3 backdrop-blur-xl">
                      <div className="flex items-center justify-between">
                        <span className="text-[13px] text-[#8a9a8e]">Til</span>
                        <span className="text-[13px] font-medium text-[#1a2e23]">
                          {convo.invoiceData.to}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[13px] text-[#8a9a8e]">Beløp</span>
                        <span className="text-[13px] text-[#1a2e23]">
                          {convo.invoiceData.amount}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[13px] text-[#8a9a8e]">MVA (25%)</span>
                        <span className="text-[13px] text-[#1a2e23]">{convo.invoiceData.mva}</span>
                      </div>
                      <div className="flex items-center justify-between border-t border-white/15 pt-1.5">
                        <span className="text-[13px] font-medium text-[#8a9a8e]">Totalt</span>
                        <span className="text-xs font-medium text-[#3E715C]">
                          {convo.invoiceData.total}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[13px] text-[#8a9a8e]">Forfall</span>
                        <span className="text-[13px] text-[#1a2e23]">{convo.invoiceData.due}</span>
                      </div>
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={showData ? { opacity: 1, scale: 1 } : {}}
                        transition={{ delay: 0.6 }}
                        className="mt-1 flex items-center justify-center gap-1.5 rounded-lg border border-[#3E715C]/20 bg-[#3E715C]/10 py-1.5 backdrop-blur-lg">
                        <CheckIcon className="h-3 w-3 text-[#3E715C]" />
                        <span className="text-[12px] font-medium text-[#3E715C]">
                          Sendt til {convo.invoiceData.to}
                        </span>
                      </motion.div>
                    </motion.div>
                  )}

                  {/* Table response */}
                  {convo.type === "table" && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={showData ? { opacity: 1 } : { opacity: 0 }}
                      transition={{ duration: 0.4 }}
                      className="mt-3 space-y-1.5">
                      {convo.tableRows.map((row) => (
                        <div
                          key={row.label}
                          className={cn(
                            "flex items-center justify-between rounded-lg px-3 py-1.5 text-[13px] backdrop-blur-xl",
                            row.highlight
                              ? "border border-[#3E715C]/20 bg-[#3E715C]/10 font-medium text-[#1a2e23]"
                              : "border border-white/10 bg-white/[0.08] text-[#4a5e52]"
                          )}>
                          <span>{row.label}</span>
                          <span className={row.highlight ? "font-medium text-[#3E715C]" : ""}>
                            {row.value}
                          </span>
                        </div>
                      ))}
                      <p className="mt-1 text-[13px] text-[#8a9a8e]">{convo.footer}</p>
                    </motion.div>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Input */}
      <div className="relative z-10 mt-5 overflow-hidden rounded-xl border border-white/15 bg-white/[0.08] backdrop-blur-2xl">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-white/10 via-transparent to-transparent" />
        <div className="relative flex items-center gap-2 px-4 py-3">
          <p className="flex-1 text-sm text-[#8a9a8e]/80">Skriv en melding...</p>
          <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-[#3E715C]/20 bg-[#3E715C]/50 text-white shadow-md shadow-[#3E715C]/15 backdrop-blur-xl">
            <ArrowRightIcon className="h-3.5 w-3.5" />
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ============================================================================
// EMAIL AUTOMATION PIPELINE ANIMATION
// ============================================================================

const PIPELINE_STEPS = [
  { label: "E-post mottatt", sublabel: "faktura.pdf", icon: "mail" },
  { label: "OCR-skanning", sublabel: "Leser innhold...", icon: "scan" },
  { label: "Bankmatching", sublabel: "Verifiserer betaling", icon: "link" },
  { label: "Bokført!", sublabel: "Konto 6300", icon: "check" }
] as const;

function EmailPipelineAnimation() {
  const [activeStep, setActiveStep] = useState(-1);
  const [hasStarted, setHasStarted] = useState(false);

  useEffect(() => {
    if (!hasStarted) return;
    const timers: NodeJS.Timeout[] = [];
    PIPELINE_STEPS.forEach((_, i) => {
      timers.push(setTimeout(() => setActiveStep(i), 600 + i * 1400));
    });
    // Loop: restart after finishing
    timers.push(
      setTimeout(
        () => {
          setActiveStep(-1);
          setTimeout(() => setHasStarted(false), 300);
          setTimeout(() => setHasStarted(true), 800);
        },
        600 + PIPELINE_STEPS.length * 1400 + 2000
      )
    );
    return () => timers.forEach(clearTimeout);
  }, [hasStarted]);

  const iconMap = {
    mail: <MailIcon className="h-5 w-5" />,
    scan: <ScanSearchIcon className="h-5 w-5" />,
    link: <LandmarkIcon className="h-5 w-5" />,
    check: <CheckIcon className="h-5 w-5" />
  };

  return (
    <motion.div
      onViewportEnter={() => {
        if (!hasStarted) setHasStarted(true);
      }}
      viewport={{ once: false, margin: "-80px" }}
      className="relative flex flex-col items-center gap-0">
      {/* Fake email card at top */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={activeStep >= 0 ? { opacity: 1, y: 0 } : { opacity: 0.4, y: -10 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-[280px] rounded-2xl border border-[#d4dbd6] bg-white p-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#3E715C]/10 text-[#5B906F]">
            <MailIcon className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-medium text-[#1a2e23]">Leverandør AS</p>
            <p className="text-[12px] text-[#8a9a8e]">Faktura #2024-0847</p>
          </div>
          <div className="rounded-lg bg-red-50 px-2 py-0.5">
            <p className="text-[13px] font-medium text-red-500">PDF</p>
          </div>
        </div>
        <div className="mt-3 flex items-center justify-between rounded-lg bg-white/[0.08] px-3 py-2 backdrop-blur-lg">
          <span className="text-[12px] text-[#8a9a8e]">Beløp</span>
          <span className="text-xs font-medium text-[#1a2e23]">kr 24 500,00</span>
        </div>
      </motion.div>

      {/* Pipeline steps */}
      <div className="flex flex-col items-center gap-0 py-2">
        {PIPELINE_STEPS.map((step, i) => {
          const isActive = activeStep >= i;
          const isCurrent = activeStep === i;
          return (
            <div key={step.label} className="flex flex-col items-center">
              {/* Connector line */}
              <motion.div
                initial={{ height: 0 }}
                animate={isActive ? { height: 24 } : { height: 24 }}
                className="w-px"
                style={{ backgroundColor: isActive ? "#3E715C" : "#d4dbd6" }}
              />
              {/* Step node */}
              <motion.div
                initial={{ scale: 0.8, opacity: 0.3 }}
                animate={
                  isCurrent
                    ? { scale: 1.05, opacity: 1 }
                    : isActive
                      ? { scale: 1, opacity: 1 }
                      : { scale: 0.85, opacity: 0.35 }
                }
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
                className={cn(
                  "flex items-center gap-3 rounded-2xl border px-4 py-3 transition-colors",
                  isCurrent
                    ? "border-[#3E715C]/40 bg-[#3E715C]/10 shadow-md shadow-[#3E715C]/10"
                    : isActive
                      ? "border-[#3E715C]/20 bg-[#f5f7f2]"
                      : "border-[#d4dbd6] bg-white"
                )}>
                <div
                  className={cn(
                    "flex h-9 w-9 items-center justify-center rounded-xl transition-colors",
                    isCurrent
                      ? "bg-[#3E715C] text-white"
                      : isActive
                        ? "bg-[#3E715C]/15 text-[#5B906F]"
                        : "bg-[#f5f7f2] text-[#8a9a8e]"
                  )}>
                  {isActive && i === PIPELINE_STEPS.length - 1 ? (
                    <CheckIcon className="h-5 w-5" />
                  ) : (
                    iconMap[step.icon]
                  )}
                </div>
                <div>
                  <p
                    className={cn(
                      "text-xs font-medium",
                      isActive ? "text-[#1a2e23]" : "text-[#8a9a8e]"
                    )}>
                    {step.label}
                  </p>
                  <p className="text-[12px] text-[#8a9a8e]">{step.sublabel}</p>
                </div>
                {isCurrent && (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    className="ml-auto h-4 w-4 rounded-full border-2 border-[#3E715C] border-t-transparent"
                  />
                )}
                {isActive && !isCurrent && (
                  <div className="ml-auto flex h-5 w-5 items-center justify-center rounded-full bg-[#3E715C]">
                    <CheckIcon className="h-3 w-3 text-white" />
                  </div>
                )}
              </motion.div>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}

// ============================================================================
// MARKETING BUBBLE WITH PREDEFINED Q&A
// ============================================================================

const DEMO_QUERIES = [
  {
    question: "Vis omsetning siste 6 mnd",
    answer: "Her er omsetningen for siste 6 maneder:",
    type: "chart" as const,
    chartData: [
      { label: "Sep", value: 142 },
      { label: "Okt", value: 168 },
      { label: "Nov", value: 195 },
      { label: "Des", value: 231 },
      { label: "Jan", value: 187 },
      { label: "Feb", value: 214 }
    ],
    footer: "Totalt: kr 1 137 000 — Trend: +12.4%"
  },
  {
    question: "MVA-status denne terminen",
    answer: "MVA-oversikt for 1. termin 2026:",
    type: "table" as const,
    tableData: [
      { label: "Utgaende MVA (25%)", value: "kr 45 200" },
      { label: "Inngaende MVA", value: "kr 12 800" },
      { label: "A betale", value: "kr 32 400", highlight: true }
    ],
    footer: "Frist: 10. april 2026"
  },
  {
    question: "Største utgiftsposter",
    answer: "Topp 5 utgiftskategorier hittil i år:",
    type: "bar" as const,
    barData: [
      { label: "Lønn", value: 82, amount: "kr 492 000" },
      { label: "Husleie", value: 45, amount: "kr 270 000" },
      { label: "Programvare", value: 28, amount: "kr 168 000" },
      { label: "Forsikring", value: 15, amount: "kr 90 000" },
      { label: "Reklame", value: 12, amount: "kr 72 000" }
    ],
    footer: "Totale utgifter: kr 1 092 000"
  },
  {
    question: "Hvor mye har jeg tjent i år?",
    answer: "Resultatoversikt for 2026:",
    type: "summary" as const,
    summaryData: [
      { label: "Inntekter", value: "kr 1 137 000", color: "#3E715C" },
      { label: "Utgifter", value: "kr 1 092 000", color: "#8a9a8e" },
      { label: "Resultat", value: "kr 45 000", color: "#3E715C", bold: true }
    ],
    footer: "Resultatmargin: 3.9%"
  }
];

function CiriMarketingBubble({
  ciriOpen,
  setCiriOpen
}: {
  ciriOpen: boolean;
  setCiriOpen: (v: boolean) => void;
}) {
  const [selectedQuery, setSelectedQuery] = useState<number | null>(null);
  const [showAnswer, setShowAnswer] = useState(false);
  const [isThinking, setIsThinking] = useState(false);

  const handleQuery = (idx: number) => {
    setSelectedQuery(idx);
    setIsThinking(true);
    setShowAnswer(false);
    setTimeout(() => {
      setIsThinking(false);
      setShowAnswer(true);
    }, 1200);
  };

  const handleBack = () => {
    setSelectedQuery(null);
    setShowAnswer(false);
    setIsThinking(false);
  };

  // Reset state when bubble closes
  useEffect(() => {
    if (!ciriOpen) {
      setSelectedQuery(null);
      setShowAnswer(false);
      setIsThinking(false);
    }
  }, [ciriOpen]);

  const query = selectedQuery !== null ? DEMO_QUERIES[selectedQuery] : null;

  return (
    <div className="fixed right-8 bottom-8 z-50">
      <AnimatePresence>
        {ciriOpen && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.95 }}
            transition={{ duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="absolute right-0 bottom-[4.5rem] w-80 overflow-hidden rounded-2xl border border-white/40 bg-white/70 shadow-xl shadow-[#3E715C]/10 backdrop-blur-xl">
            {/* Header */}
            <div className="flex items-center gap-3 border-b border-[#d4dbd6] px-4 py-3">
              <div className="h-8 w-8 shrink-0 overflow-hidden rounded-full ring-1 ring-[#3E715C]/20">
                <Image
                  src="/ciribakgrunn.png"
                  alt=""
                  width={32}
                  height={32}
                  className="h-full w-full object-cover"
                />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-[#1a2e23]">Ciri Demo</p>
                <p className="text-[12px] text-[#5B906F]">Prov meg — klikk et sporsmal</p>
              </div>
              {selectedQuery !== null && (
                <button
                  onClick={handleBack}
                  className="rounded-lg px-2 py-1 text-[12px] font-medium text-[#3E715C] transition-colors hover:bg-[#3E715C]/5">
                  Tilbake
                </button>
              )}
            </div>

            {/* Content */}
            <div className="p-4">
              <AnimatePresence mode="wait">
                {selectedQuery === null ? (
                  /* Question chips */
                  <motion.div
                    key="questions"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-2">
                    <p className="mb-3 text-xs text-[#8a9a8e]">Hva vil du se?</p>
                    {DEMO_QUERIES.map((q, i) => (
                      <motion.button
                        key={q.question}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.06 }}
                        onClick={() => handleQuery(i)}
                        className="flex w-full items-center gap-2 rounded-xl border border-[#d4dbd6] bg-[#f5f7f2] px-4 py-3 text-left text-sm text-[#4a5e52] transition-all hover:border-[#3E715C]/30 hover:bg-[#3E715C]/5 hover:text-[#1a2e23]">
                        <SparklesIcon className="h-3.5 w-3.5 shrink-0 text-[#5B906F]" />
                        {q.question}
                      </motion.button>
                    ))}
                    <div className="pt-2 text-center">
                      <Link
                        href="/register"
                        className="inline-flex items-center gap-1 text-xs font-medium text-[#3E715C] transition-colors hover:text-[#5B906F]">
                        Prov Ciri gratis <ArrowRightIcon className="h-3 w-3" />
                      </Link>
                    </div>
                  </motion.div>
                ) : (
                  /* Answer view */
                  <motion.div
                    key={`answer-${selectedQuery}`}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="space-y-3">
                    {/* User question */}
                    <div className="flex justify-end">
                      <div className="rounded-2xl rounded-tr-md bg-[#3E715C] px-3 py-2 text-xs text-white">
                        {query!.question}
                      </div>
                    </div>

                    {/* Thinking */}
                    {isThinking && (
                      <div className="flex gap-2">
                        <div className="h-6 w-6 shrink-0 overflow-hidden rounded-full">
                          <Image
                            src="/ciribakgrunn.png"
                            alt=""
                            width={24}
                            height={24}
                            className="h-full w-full object-cover"
                          />
                        </div>
                        <div className="flex items-center gap-1 rounded-2xl rounded-tl-md border border-[#d4dbd6] bg-[#f5f7f2] px-3 py-2">
                          {[0, 1, 2].map((j) => (
                            <motion.div
                              key={j}
                              animate={{ y: [0, -3, 0] }}
                              transition={{ duration: 0.5, delay: j * 0.12, repeat: Infinity }}
                              className="h-1.5 w-1.5 rounded-full bg-[#8a9a8e]"
                            />
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Bot answer */}
                    {showAnswer && query && (
                      <motion.div
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex gap-2">
                        <div className="h-6 w-6 shrink-0 overflow-hidden rounded-full">
                          <Image
                            src="/ciribakgrunn.png"
                            alt=""
                            width={24}
                            height={24}
                            className="h-full w-full object-cover"
                          />
                        </div>
                        <div className="flex-1 rounded-2xl rounded-tl-md border border-[#d4dbd6] bg-[#f5f7f2] px-3 py-3">
                          <p className="text-xs text-[#4a5e52]">{query.answer}</p>

                          {/* Chart type */}
                          {query.type === "chart" && "chartData" in query && (
                            <div className="mt-2 flex h-20 items-end gap-1.5">
                              {query.chartData.map((d, i) => (
                                <div
                                  key={d.label}
                                  className="flex flex-1 flex-col items-center gap-1">
                                  <motion.div
                                    initial={{ height: 0 }}
                                    animate={{ height: `${(d.value / 231) * 100}%` }}
                                    transition={{ duration: 0.5, delay: i * 0.08 }}
                                    className="w-full rounded-t bg-gradient-to-t from-[#3E715C] to-[#5B906F]"
                                  />
                                  <span className="text-[8px] text-[#8a9a8e]">{d.label}</span>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Table type */}
                          {query.type === "table" && "tableData" in query && (
                            <div className="mt-2 space-y-1.5">
                              {query.tableData.map((row) => (
                                <div
                                  key={row.label}
                                  className={cn(
                                    "flex items-center justify-between rounded-lg px-2.5 py-1.5 text-[13px]",
                                    row.highlight
                                      ? "bg-[#3E715C]/10 font-medium text-[#1a2e23]"
                                      : "text-[#4a5e52]"
                                  )}>
                                  <span>{row.label}</span>
                                  <span
                                    className={row.highlight ? "font-medium text-[#3E715C]" : ""}>
                                    {row.value}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Horizontal bar type */}
                          {query.type === "bar" && "barData" in query && (
                            <div className="mt-2 space-y-2">
                              {query.barData.map((d, i) => (
                                <div key={d.label} className="space-y-0.5">
                                  <div className="flex items-center justify-between text-[12px]">
                                    <span className="text-[#4a5e52]">{d.label}</span>
                                    <span className="text-[#8a9a8e]">{d.amount}</span>
                                  </div>
                                  <div className="h-2 rounded-full bg-[#d4dbd6]/50">
                                    <motion.div
                                      initial={{ width: 0 }}
                                      animate={{ width: `${d.value}%` }}
                                      transition={{ duration: 0.6, delay: i * 0.1 }}
                                      className="h-full rounded-full bg-gradient-to-r from-[#3E715C] to-[#5B906F]"
                                    />
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Summary type */}
                          {query.type === "summary" && "summaryData" in query && (
                            <div className="mt-2 space-y-1.5">
                              {query.summaryData.map((d) => (
                                <div
                                  key={d.label}
                                  className={cn(
                                    "flex items-center justify-between rounded-lg px-2.5 py-2 text-[13px]",
                                    d.bold ? "bg-[#3E715C]/10" : ""
                                  )}>
                                  <span
                                    className={
                                      d.bold ? "font-medium text-[#1a2e23]" : "text-[#4a5e52]"
                                    }>
                                    {d.label}
                                  </span>
                                  <span
                                    style={{ color: d.color }}
                                    className={d.bold ? "font-medium" : ""}>
                                    {d.value}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Footer */}
                          <p className="mt-2 text-[12px] text-[#8a9a8e]">{query.footer}</p>
                        </div>
                      </motion.div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        onClick={() => setCiriOpen(!ciriOpen)}
        className="group relative flex h-14 w-14 items-center justify-center rounded-full bg-white/70 shadow-lg ring-1 shadow-[#3E715C]/15 ring-white/50 backdrop-blur-lg transition-shadow hover:shadow-xl hover:shadow-[#3E715C]/20"
        initial={{ opacity: 0, scale: 0 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 1.2, type: "spring", stiffness: 200, damping: 15 }}>
        <motion.div
          className="absolute inset-0 rounded-full border-2 border-[#3E715C]/25"
          animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0, 0.5] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute inset-0 rounded-full border border-[#3E715C]/15"
          animate={{ scale: [1, 1.35, 1], opacity: [0.3, 0, 0.3] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", delay: 0.6 }}
        />
        <motion.div
          animate={{ scale: [1, 1.06, 1] }}
          transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}>
          <div className="h-10 w-10 overflow-hidden rounded-full">
            <Image
              src="/ciribakgrunn.png"
              alt="Ciri"
              width={40}
              height={40}
              className="h-full w-full object-cover"
            />
          </div>
        </motion.div>
      </motion.button>
    </div>
  );
}

// ============================================================================
// SCROLL REVEAL WRAPPER
// ============================================================================

function Reveal({
  children,
  className,
  delay = 0
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 32 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.7, delay, ease: [0.25, 0.46, 0.45, 0.94] }}
      className={className}>
      {children}
    </motion.div>
  );
}

// ============================================================================
// METRICS BAR WITH ANIMATED COUNTERS
// ============================================================================

function MetricsBar() {
  const [hasEntered, setHasEntered] = useState(false);
  const [counts, setCounts] = useState({ banks: 0, pct: 0 });
  const started = useRef(false);

  useEffect(() => {
    if (!hasEntered || started.current) return;
    started.current = true;
    const duration = 2000;
    const totalFrames = 80;
    let frame = 0;
    const timer = setInterval(() => {
      frame++;
      const progress = Math.min(frame / totalFrames, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCounts({
        banks: Math.floor(eased * 2500),
        pct: Math.floor(eased * 100)
      });
      if (frame >= totalFrames) clearInterval(timer);
    }, duration / totalFrames);
    return () => clearInterval(timer);
  }, [hasEntered]);

  const stats = [
    {
      value: `${counts.banks.toLocaleString("nb-NO")}+`,
      label: "Banker tilkoblet",
      animated: true
    },
    { value: "Automatisk", label: "MVA-beregning", animated: false },
    { value: "SAF-T", label: "Sertifisert eksport", animated: false },
    { value: `${counts.pct}%`, label: "Norsk datalagring", animated: true }
  ];

  return (
    <motion.div
      onViewportEnter={() => setHasEntered(true)}
      viewport={{ once: true, margin: "-50px" }}
      className="grid grid-cols-2 divide-x divide-[#d4dbd6] sm:grid-cols-4">
      {stats.map((stat, i) => (
        <motion.div
          key={stat.label}
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: i * 0.1 }}
          className="px-6 py-8 text-center sm:py-10">
          <p className={cn("text-2xl text-[#3E715C] sm:text-3xl", stat.animated && "tabular-nums")}>
            {stat.value}
          </p>
          <p className="mt-1.5 text-xs tracking-wide text-[#8a9a8e]">{stat.label}</p>
        </motion.div>
      ))}
    </motion.div>
  );
}

// ============================================================================
// AUTONOMOUS SHOWCASE — INTERACTIVE MODE + CAPABILITY SELECTOR
// ============================================================================

type AutonomousMode = "autonom" | "assistent";
type Capability = "faktura" | "mva" | "lonn" | "arsregnskap" | "bokforing" | "bank";

const SHOWCASE_TICK = 600;

const CAPABILITIES: { key: Capability; label: string; icon: React.ReactNode }[] = [
  { key: "faktura", label: "Faktura", icon: <SendIcon className="h-3.5 w-3.5" /> },
  { key: "mva", label: "MVA", icon: <CalculatorIcon className="h-3.5 w-3.5" /> },
  { key: "lonn", label: "Lønn", icon: <UsersIcon className="h-3.5 w-3.5" /> },
  {
    key: "arsregnskap",
    label: "Årsregnskap",
    icon: <FileSpreadsheetIcon className="h-3.5 w-3.5" />
  },
  { key: "bokforing", label: "Bokføring", icon: <BrainCircuitIcon className="h-3.5 w-3.5" /> },
  { key: "bank", label: "Bank", icon: <LandmarkIcon className="h-3.5 w-3.5" /> }
];

// --- Per-capability animation renderers ---

function ShowcaseFaktura({ phase, mode }: { phase: number; mode: AutonomousMode }) {
  const isAuto = mode === "autonom";
  return (
    <div className="space-y-2">
      {/* Invoice card */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={phase >= 1 ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.4 }}
        className="rounded-xl border border-white/15 bg-white/[0.08] p-3 backdrop-blur-xl">
        <div className="mb-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-[#3E715C]/10">
              <ReceiptIcon className="h-3 w-3 text-[#5B906F]" />
            </div>
            <div>
              <p className="text-[13px] font-medium text-[#1a2e23]">Faktura #2026-0134</p>
              <p className="text-[13px] text-[#8a9a8e]">Berge Konsult AS</p>
            </div>
          </div>
          <motion.span
            initial={{ opacity: 0, scale: 0.8 }}
            animate={phase >= 1 ? { opacity: 1, scale: 1 } : {}}
            transition={{ delay: 0.3 }}
            className="rounded-full bg-amber-50 px-2 py-0.5 text-[13px] font-medium text-amber-600">
            {phase >= 3 ? "Betalt" : phase >= 2 ? "Sendt" : "Ny"}
          </motion.span>
        </div>
        <div className="space-y-0.5">
          {[
            { label: "Beløp", value: "kr 18 500,00" },
            { label: "MVA (25%)", value: "kr 4 625,00" },
            { label: "Totalt", value: "kr 23 125,00", bold: true },
            { label: "Forfall", value: "21.03.2026" }
          ].map((row, i) => (
            <motion.div
              key={row.label}
              initial={{ opacity: 0 }}
              animate={phase >= 1 ? { opacity: 1 } : {}}
              transition={{ delay: 0.15 + i * 0.08 }}
              className={cn(
                "flex items-center justify-between rounded-lg px-3 py-1 text-[13px]",
                row.bold
                  ? "bg-white/[0.1] font-medium text-[#1a2e23] backdrop-blur-lg"
                  : "text-[#4a5e52]"
              )}>
              <span className="text-[13px] text-[#8a9a8e]">{row.label}</span>
              <span className={row.bold ? "font-medium text-[#3E715C]" : ""}>{row.value}</span>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Phase 2: Sending */}
      <AnimatePresence>
        {phase >= 2 && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
            className="flex items-center gap-3 rounded-xl border border-white/15 bg-white/[0.08] px-3 py-2.5 backdrop-blur-xl">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50">
              <MailIcon className="h-3.5 w-3.5 text-blue-500" />
            </div>
            <div className="flex-1">
              <p className="text-[13px] font-medium text-[#1a2e23]">
                {isAuto ? "Sendt automatisk" : "Sendt etter godkjenning"}
              </p>
              <p className="text-[13px] text-[#8a9a8e]">E-post levert kl. 09:14</p>
            </div>
            {!isAuto && phase === 2 && (
              <motion.div
                animate={{ scale: [1, 1.08, 1] }}
                transition={{ duration: 1.2, repeat: Infinity }}
                className="rounded-lg bg-[#3E715C] px-2.5 py-1 text-[13px] font-medium text-white">
                Godkjenn
              </motion.div>
            )}
            {(isAuto || phase > 2) && (
              <div className="flex h-5 w-5 items-center justify-center rounded-full bg-[#3E715C]">
                <CheckIcon className="h-3 w-3 text-white" />
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Phase 3: Payment */}
      <AnimatePresence>
        {phase >= 3 && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex items-center gap-3 rounded-xl border border-[#3E715C]/15 bg-[#3E715C]/[0.06] px-3 py-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#3E715C]">
              <CheckIcon className="h-3.5 w-3.5 text-white" />
            </div>
            <div className="flex-1">
              <p className="text-[13px] font-medium text-[#3E715C]">
                {isAuto ? "Betaling mottatt og matchet" : "Betaling registrert"}
              </p>
              <p className="text-[13px] text-[#8a9a8e]">kr 23 125,00 fra Berge Konsult AS</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ShowcaseMva({ phase, mode }: { phase: number; mode: AutonomousMode }) {
  const isAuto = mode === "autonom";
  return (
    <div className="space-y-2">
      {/* MVA calculation card */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={phase >= 1 ? { opacity: 1 } : {}}
        className="rounded-xl border border-white/15 bg-white/[0.08] p-3 backdrop-blur-xl">
        <div className="mb-2 flex items-center gap-2">
          <CalculatorIcon className="h-3.5 w-3.5 text-[#5B906F]" />
          <p className="text-[13px] font-medium text-[#1a2e23]">MVA-oppgave — 1. termin 2026</p>
        </div>
        <div className="space-y-1">
          {[
            { label: "Utgaende MVA (25%)", value: "kr 45 200" },
            { label: "Inngaende MVA", value: "kr 12 800" }
          ].map((row, i) => (
            <motion.div
              key={row.label}
              initial={{ opacity: 0, x: -10 }}
              animate={phase >= 1 ? { opacity: 1, x: 0 } : {}}
              transition={{ delay: i * 0.15 }}
              className="flex items-center justify-between rounded-lg bg-white/[0.08] px-3 py-1.5 backdrop-blur-lg">
              <span className="text-[12px] text-[#4a5e52]">{row.label}</span>
              <span className="text-[13px] font-medium text-[#1a2e23]">{row.value}</span>
            </motion.div>
          ))}
          <motion.div
            initial={{ opacity: 0 }}
            animate={phase >= 1 ? { opacity: 1 } : {}}
            transition={{ delay: 0.35 }}
            className="flex items-center justify-between rounded-lg bg-[#3E715C]/10 px-3 py-1.5">
            <span className="text-[12px] font-medium text-[#1a2e23]">A betale</span>
            <span className="text-xs font-medium text-[#3E715C]">kr 32 400</span>
          </motion.div>
        </div>
      </motion.div>

      {/* Phase 2: Form / review */}
      <AnimatePresence>
        {phase >= 2 && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="rounded-xl border border-white/15 bg-white/[0.08] p-3 backdrop-blur-xl">
            <div className="mb-1.5 flex items-center justify-between">
              <p className="text-[13px] font-medium text-[#1a2e23]">RF-0002 Skattemelding</p>
              <span className="text-[13px] text-[#8a9a8e]">Frist: 10. april</span>
            </div>
            <div className="space-y-1">
              {[
                "Post 1: Avgiftspliktig omsetning",
                "Post 4: Inngaende MVA",
                "Post 9: Sum — kr 32 400"
              ].map((field, i) => (
                <motion.div
                  key={field}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.12 }}
                  className="flex items-center gap-2 rounded-lg bg-white/[0.08] px-3 py-1 backdrop-blur-lg">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.2 + i * 0.12, type: "spring" }}
                    className="flex h-3.5 w-3.5 items-center justify-center rounded bg-[#3E715C]/20">
                    <CheckIcon className="h-2.5 w-2.5 text-[#3E715C]" />
                  </motion.div>
                  <span className="text-[12px] text-[#4a5e52]">{field}</span>
                </motion.div>
              ))}
            </div>
            {!isAuto && phase === 2 && (
              <motion.div
                animate={{ scale: [1, 1.04, 1] }}
                transition={{ duration: 1.5, repeat: Infinity }}
                className="mt-2 flex items-center justify-center gap-2 rounded-lg bg-[#3E715C] py-1.5 text-[13px] font-medium text-white">
                <SendIcon className="h-3 w-3" />
                Send til Altinn
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Phase 3: Submitted */}
      <AnimatePresence>
        {phase >= 3 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="flex items-center justify-center gap-2 rounded-xl bg-[#3E715C]/10 py-2.5">
            <CheckIcon className="h-4 w-4 text-[#3E715C]" />
            <span className="text-[13px] font-medium text-[#3E715C]">
              {isAuto ? "Sendt og kvittert — automatisk" : "Sendt til Altinn — godkjent"}
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ShowcaseLonn({ phase, mode }: { phase: number; mode: AutonomousMode }) {
  const isAuto = mode === "autonom";
  const employees = [
    { name: "Ola Nordmann", brutto: "42 000", netto: "31 200" },
    { name: "Kari Hansen", brutto: "38 500", netto: "28 800" },
    { name: "Per Olsen", brutto: "45 000", netto: "33 400" }
  ];
  return (
    <div className="space-y-2">
      {/* Employee cards */}
      <div className="space-y-1">
        {employees.map((emp, i) => (
          <motion.div
            key={emp.name}
            initial={{ opacity: 0, x: -16 }}
            animate={phase >= 1 ? { opacity: 1, x: 0 } : {}}
            transition={{ delay: i * 0.12, type: "spring", stiffness: 250, damping: 20 }}
            className="flex items-center gap-3 rounded-xl border border-white/15 bg-white/[0.08] px-3 py-2 backdrop-blur-xl">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-white/[0.1] text-[13px] font-medium text-[#5B906F] backdrop-blur-lg">
              {emp.name
                .split(" ")
                .map((n) => n[0])
                .join("")}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-medium text-[#1a2e23]">{emp.name}</p>
              <p className="text-[13px] text-[#8a9a8e]">Brutto: {emp.brutto}</p>
            </div>
            <motion.div
              initial={{ opacity: 0 }}
              animate={phase >= 2 ? { opacity: 1 } : {}}
              transition={{ delay: 0.1 + i * 0.1 }}
              className="text-right">
              <p className="text-[13px] font-medium text-[#3E715C]">kr {emp.netto}</p>
              <p className="text-[8px] text-[#8a9a8e]">Netto</p>
            </motion.div>
          </motion.div>
        ))}
      </div>

      {/* Approval step for assistent */}
      {!isAuto && phase === 2 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex items-center justify-center">
          <motion.div
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            className="rounded-lg bg-[#3E715C] px-4 py-1.5 text-[13px] font-medium text-white">
            Godkjenn lønnsslipp
          </motion.div>
        </motion.div>
      )}

      {/* A-melding + notification */}
      <AnimatePresence>
        {phase >= 3 && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="rounded-xl border border-[#3E715C]/15 bg-[#3E715C]/[0.06] p-2.5">
            <div className="flex items-center gap-3">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#3E715C]">
                <FileCheckIcon className="h-3.5 w-3.5 text-white" />
              </div>
              <div className="flex-1">
                <p className="text-[13px] font-medium text-[#1a2e23]">A-melding sendt</p>
                <p className="text-[13px] text-[#8a9a8e]">Rapportert til Skatteetaten for februar</p>
              </div>
              <div className="flex h-5 w-5 items-center justify-center rounded-full bg-[#3E715C]">
                <CheckIcon className="h-3 w-3 text-white" />
              </div>
            </div>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="mt-1.5 flex items-center gap-1.5 pl-10">
              <MailIcon className="h-3 w-3 text-[#8a9a8e]" />
              <span className="text-[13px] text-[#8a9a8e]">3 lønnsslipper sendt på e-post</span>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ShowcaseArsregnskap({ phase, mode }: { phase: number; mode: AutonomousMode }) {
  const isAuto = mode === "autonom";
  const docs = [
    {
      title: "Resultatregnskap",
      detail: "Inntekter: kr 2.4M — Kostnader: kr 1.8M",
      color: "bg-emerald-50 text-emerald-600"
    },
    {
      title: "Balanse",
      detail: "Eiendeler: kr 3.1M — Gjeld: kr 1.2M",
      color: "bg-blue-50 text-blue-600"
    },
    {
      title: "Noter",
      detail: "12 noter — Regnskapsprinsipper",
      color: "bg-violet-50 text-violet-600"
    }
  ];
  return (
    <div className="space-y-2">
      {/* Document cards stagger in */}
      <div className="grid gap-1.5">
        {docs.map((doc, i) => (
          <motion.div
            key={doc.title}
            initial={{ opacity: 0, y: 16, rotateX: -10 }}
            animate={phase >= 1 ? { opacity: 1, y: 0, rotateX: 0 } : {}}
            transition={{ delay: i * 0.18, type: "spring", stiffness: 200, damping: 18 }}
            className="flex items-center gap-3 rounded-xl border border-white/15 bg-white/[0.08] px-3 py-2.5 backdrop-blur-xl">
            <div className={cn("flex h-8 w-8 items-center justify-center rounded-lg", doc.color)}>
              <FileSpreadsheetIcon className="h-3.5 w-3.5" />
            </div>
            <div className="flex-1">
              <p className="text-[13px] font-medium text-[#1a2e23]">{doc.title}</p>
              <motion.p
                initial={{ opacity: 0 }}
                animate={phase >= 2 ? { opacity: 1 } : {}}
                transition={{ delay: 0.1 + i * 0.1 }}
                className="text-[13px] text-[#8a9a8e]">
                {doc.detail}
              </motion.p>
            </div>
            {!isAuto && phase === 2 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 + i * 0.1 }}
                className="h-4 w-4 rounded border border-white/20"
              />
            )}
            {(isAuto ? phase >= 2 : phase >= 3) && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 400, damping: 15, delay: i * 0.08 }}
                className="flex h-5 w-5 items-center justify-center rounded-full bg-[#3E715C]">
                <CheckIcon className="h-3 w-3 text-white" />
              </motion.div>
            )}
          </motion.div>
        ))}
      </div>

      {/* Approval button for assistent */}
      {!isAuto && phase === 2 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex justify-center">
          <motion.div
            animate={{ scale: [1, 1.04, 1] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            className="rounded-lg bg-[#3E715C] px-4 py-1.5 text-[13px] font-medium text-white">
            Godkjenn og signer
          </motion.div>
        </motion.div>
      )}

      {/* Submitted */}
      <AnimatePresence>
        {phase >= 3 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="flex items-center justify-center gap-2 rounded-xl bg-[#3E715C]/10 py-2.5">
            <ShieldCheckIcon className="h-4 w-4 text-[#3E715C]" />
            <span className="text-[13px] font-medium text-[#3E715C]">
              Levert til Bronnysundregistrene
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ShowcaseBokforing({ phase, mode }: { phase: number; mode: AutonomousMode }) {
  const isAuto = mode === "autonom";
  return (
    <div className="space-y-2">
      {/* Document with scan line */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={phase >= 1 ? { opacity: 1, y: 0 } : {}}
        className="relative overflow-hidden rounded-xl border border-white/15 bg-white/[0.08] p-3 backdrop-blur-xl">
        <div className="mb-2 flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-red-50">
            <ReceiptIcon className="h-3 w-3 text-red-400" />
          </div>
          <div>
            <p className="text-[13px] font-medium text-[#1a2e23]">Faktura #2024-0847</p>
            <p className="text-[13px] text-[#8a9a8e]">Leverandør AS — faktura.pdf</p>
          </div>
        </div>
        {/* Scan line */}
        {phase === 1 && (
          <motion.div
            initial={{ top: "20%" }}
            animate={{ top: "90%" }}
            transition={{ duration: 1.2, ease: "linear" }}
            className="absolute right-3 left-3 z-10 h-0.5 bg-gradient-to-r from-transparent via-[#3E715C] to-transparent"
          />
        )}
        {/* Extracted fields */}
        <div className="space-y-0.5">
          {[
            { label: "Leverandør", value: "Leverandør AS" },
            { label: "Beløp", value: "kr 24 500,00" },
            { label: "MVA (25%)", value: "kr 6 125,00" },
            { label: "Forfallsdato", value: "15.03.2026" }
          ].map((field, i) => (
            <motion.div
              key={field.label}
              initial={{ opacity: 0.2 }}
              animate={phase >= 2 ? { opacity: 1 } : { opacity: 0.2 }}
              transition={{ delay: phase >= 2 ? i * 0.1 : 0 }}
              className="flex items-center justify-between rounded-lg bg-white/[0.08] px-3 py-1 backdrop-blur-lg">
              <span className="text-[13px] text-[#8a9a8e]">{field.label}</span>
              <motion.span
                className="text-[13px] font-medium text-[#1a2e23]"
                initial={{ opacity: 0, x: -5 }}
                animate={phase >= 2 ? { opacity: 1, x: 0 } : {}}
                transition={{ delay: phase >= 2 ? 0.1 + i * 0.1 : 0 }}>
                {field.value}
              </motion.span>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Suggestion / account selection for assistent */}
      {!isAuto && phase === 2 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex items-center gap-3 rounded-xl border border-amber-200/60 bg-amber-50/80 px-3 py-2.5">
          <HandIcon className="h-3.5 w-3.5 shrink-0 text-amber-600" />
          <div className="flex-1">
            <p className="text-[13px] font-medium text-[#1a2e23]">Forslag: Konto 6300?</p>
            <p className="text-[13px] text-[#8a9a8e]">Kontorrekvisita — bekreft eller endre</p>
          </div>
          <motion.div
            animate={{ scale: [1, 1.08, 1] }}
            transition={{ duration: 1.2, repeat: Infinity }}
            className="rounded-lg bg-[#3E715C] px-2.5 py-1 text-[13px] font-medium text-white">
            Bekreft
          </motion.div>
        </motion.div>
      )}

      {/* Journal entry */}
      <AnimatePresence>
        {phase >= 3 && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="rounded-xl border border-white/15 bg-white/[0.08] p-3 backdrop-blur-xl">
            <div className="mb-1.5 flex items-center justify-between">
              <p className="text-[13px] font-medium text-[#1a2e23]">Bilagsjournal</p>
              <span className="rounded-full bg-[#3E715C]/10 px-2 py-0.5 text-[13px] font-medium text-[#3E715C]">
                {isAuto ? "Automatisk" : "Bekreftet"}
              </span>
            </div>
            <div className="mb-1 grid grid-cols-4 gap-1 px-2">
              {["Dato", "Konto", "Debet", "Kredit"].map((h) => (
                <span
                  key={h}
                  className={cn(
                    "text-[8px] text-[#8a9a8e]",
                    (h === "Debet" || h === "Kredit") && "text-right"
                  )}>
                  {h}
                </span>
              ))}
            </div>
            {[
              { date: "15.02", account: "6300", debet: "24 500", kredit: "" },
              { date: "15.02", account: "2710", debet: "6 125", kredit: "" },
              { date: "15.02", account: "2400", debet: "", kredit: "30 625" }
            ].map((row, i) => (
              <motion.div
                key={row.account}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.15 }}
                className="mb-0.5 grid grid-cols-4 gap-1 rounded-lg bg-white/[0.08] px-2 py-1 backdrop-blur-lg">
                <span className="text-[12px] text-[#4a5e52]">{row.date}</span>
                <span className="text-[12px] font-medium text-[#1a2e23]">{row.account}</span>
                <span className="text-right text-[12px] text-[#1a2e23]">{row.debet}</span>
                <span className="text-right text-[12px] text-[#1a2e23]">{row.kredit}</span>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ShowcaseBank({ phase, mode }: { phase: number; mode: AutonomousMode }) {
  const isAuto = mode === "autonom";
  const transactions = [
    { desc: "Elkjop AS", amount: "-kr 4 299", matched: true },
    { desc: "Telenor Norge", amount: "-kr 899", matched: true },
    { desc: "Ukjent betaling", amount: "-kr 1 250", matched: false }
  ];
  return (
    <div className="space-y-2">
      {/* Bank header */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={phase >= 1 ? { opacity: 1 } : {}}
        className="flex items-center gap-3 rounded-xl border border-white/15 bg-white/[0.08] px-3 py-2.5 backdrop-blur-xl">
        <LandmarkIcon className="h-3.5 w-3.5 text-[#5B906F]" />
        <div className="flex-1">
          <p className="text-[13px] font-medium text-[#1a2e23]">DNB — Driftskonto</p>
          <p className="text-[13px] text-[#8a9a8e]">47 nye transaksjoner via PSD2</p>
        </div>
        {phase >= 1 && (
          <motion.div
            animate={phase === 1 ? { rotate: 360 } : {}}
            transition={phase === 1 ? { duration: 1, repeat: Infinity, ease: "linear" } : {}}
            className={cn(
              "h-4 w-4 rounded-full border-2",
              phase === 1 ? "border-[#3E715C] border-t-transparent" : "border-[#3E715C]"
            )}>
            {phase > 1 && <CheckIcon className="h-3 w-3 text-[#3E715C]" />}
          </motion.div>
        )}
      </motion.div>

      {/* Transaction matching */}
      <div className="space-y-1">
        {transactions.map((tx, i) => (
          <motion.div
            key={tx.desc}
            initial={{ opacity: 0, x: -12 }}
            animate={phase >= 2 ? { opacity: 1, x: 0 } : {}}
            transition={{ delay: i * 0.12, type: "spring", stiffness: 250, damping: 20 }}
            className="flex items-center gap-3 rounded-xl border border-white/15 bg-white/[0.08] px-3 py-2 backdrop-blur-xl">
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-medium text-[#1a2e23]">{tx.desc}</p>
              <p className="text-[12px] text-[#8a9a8e]">{tx.amount}</p>
            </div>
            {phase >= 2 && tx.matched && (
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={phase >= 2 ? { scale: 1, opacity: 1 } : {}}
                transition={{ delay: 0.3 + i * 0.1, type: "spring" }}
                className="flex items-center gap-1.5">
                <div className="h-px w-4 bg-[#3E715C]/40" />
                <div className="flex items-center gap-1 rounded-lg bg-[#3E715C]/10 px-2 py-0.5">
                  <LinkIcon className="h-2.5 w-2.5 text-[#3E715C]" />
                  <span className="text-[8px] font-medium text-[#3E715C]">Matchet</span>
                </div>
              </motion.div>
            )}
            {phase >= 2 && !tx.matched && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="rounded-lg bg-amber-50 px-2 py-0.5">
                <span className="text-[8px] font-medium text-amber-600">Sjekk</span>
              </motion.div>
            )}
          </motion.div>
        ))}
      </div>

      {/* Approval for assistent */}
      {!isAuto && phase === 2 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex justify-center">
          <motion.div
            animate={{ scale: [1, 1.04, 1] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            className="rounded-lg bg-[#3E715C] px-4 py-1.5 text-[13px] font-medium text-white">
            Bekreft alle matcher
          </motion.div>
        </motion.div>
      )}

      {/* Reconciled */}
      <AnimatePresence>
        {phase >= 3 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="flex items-center justify-between rounded-xl border border-[#3E715C]/15 bg-[#3E715C]/10 px-3 py-2.5">
            <div className="flex items-center gap-2">
              <CheckIcon className="h-4 w-4 text-[#3E715C]" />
              <span className="text-[13px] font-medium text-[#3E715C]">Avstemming fullfort</span>
            </div>
            <span className="text-[13px] font-medium text-[#3E715C]">kr 284 320</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// --- Main showcase component ---

const CAPABILITY_RENDERERS: Record<
  Capability,
  (props: { phase: number; mode: AutonomousMode }) => React.ReactNode
> = {
  faktura: (p) => <ShowcaseFaktura {...p} />,
  mva: (p) => <ShowcaseMva {...p} />,
  lonn: (p) => <ShowcaseLonn {...p} />,
  arsregnskap: (p) => <ShowcaseArsregnskap {...p} />,
  bokforing: (p) => <ShowcaseBokforing {...p} />,
  bank: (p) => <ShowcaseBank {...p} />
};

function AutonomousShowcase() {
  const [mode, setMode] = useState<AutonomousMode>("autonom");
  const [capability, setCapability] = useState<Capability>("faktura");
  const [phase, setPhase] = useState(0);
  const [hasStarted, setHasStarted] = useState(false);
  const timersRef = useRef<NodeJS.Timeout[]>([]);

  const clearTimers = () => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
  };

  const schedule = (fn: () => void, ms: number) => {
    timersRef.current.push(setTimeout(fn, ms));
  };

  const runAnimation = () => {
    clearTimers();
    setPhase(0);
    schedule(() => setPhase(1), 1 * SHOWCASE_TICK);
    schedule(() => setPhase(2), 5 * SHOWCASE_TICK);
    schedule(() => setPhase(3), 9 * SHOWCASE_TICK);
    // Hold then restart
    schedule(() => {
      setPhase(0);
      schedule(() => runAnimation(), SHOWCASE_TICK);
    }, 17 * SHOWCASE_TICK);
  };

  useEffect(() => {
    if (!hasStarted) return;
    runAnimation();
    return () => clearTimers();
  }, [mode, capability, hasStarted]);

  return (
    <motion.div
      onViewportEnter={() => {
        if (!hasStarted) setHasStarted(true);
      }}
      viewport={{ once: true, margin: "-80px" }}>
      {/* Mode toggle */}
      <div className="flex justify-center">
        <div className="inline-flex rounded-full border border-white/15 bg-white/[0.1] p-1 backdrop-blur-2xl">
          {(["autonom", "assistent"] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={cn(
                "relative flex items-center gap-2 rounded-full px-5 py-2 text-xs font-medium transition-all duration-200",
                mode === m
                  ? "bg-[#3E715C]/70 text-white shadow-lg shadow-[#3E715C]/20 backdrop-blur-xl"
                  : "text-[#4a5e52] hover:text-[#1a2e23]"
              )}>
              {m === "autonom" ? (
                <BotIcon className="h-3.5 w-3.5" />
              ) : (
                <HandIcon className="h-3.5 w-3.5" />
              )}
              {m === "autonom" ? "Autonom" : "Assistent"}
            </button>
          ))}
        </div>
      </div>

      {/* Capability pills */}
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        {CAPABILITIES.map((cap) => (
          <button
            key={cap.key}
            onClick={() => setCapability(cap.key)}
            className={cn(
              "flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-[13px] font-medium transition-all duration-200",
              capability === cap.key
                ? "border-[#3E715C]/25 bg-[#3E715C]/15 text-[#3E715C] backdrop-blur-xl"
                : "border-white/15 bg-white/[0.1] text-[#8a9a8e] backdrop-blur-xl hover:border-white/25 hover:text-[#4a5e52]"
            )}>
            {cap.icon}
            {cap.label}
          </button>
        ))}
      </div>

      {/* Animation area */}
      <div className="mx-auto mt-8 max-w-lg">
        <div className="relative overflow-hidden rounded-2xl border border-white/15 bg-white/[0.08] p-5 shadow-xl shadow-black/5 backdrop-blur-3xl backdrop-saturate-[2] sm:p-6">
          {/* Glass layers */}
          <div className="pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-br from-white/40 via-transparent to-transparent" />
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/70 to-transparent" />
          <div className="pointer-events-none absolute inset-y-0 left-0 w-px bg-gradient-to-b from-white/60 via-white/20 to-transparent" />

          {/* Mini header */}
          <div className="relative z-10 mb-5 flex items-center gap-3 border-b border-white/15 pb-4">
            <div className="h-7 w-7 shrink-0 overflow-hidden rounded-full shadow-lg ring-2 shadow-black/10 ring-white/30">
              <Image
                src="/ciribakgrunn.png"
                alt="Ciri"
                width={28}
                height={28}
                className="h-full w-full object-cover"
              />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-[#1a2e23]">
                {CAPABILITIES.find((c) => c.key === capability)?.label}
              </p>
              <p className="text-[12px] text-[#8a9a8e]">
                {mode === "autonom" ? "Autonom modus" : "Assistent-modus"}
              </p>
            </div>
            <span
              className={cn(
                "rounded-full border px-2.5 py-1 text-[13px] font-bold tracking-[0.08em] uppercase backdrop-blur-xl",
                mode === "autonom"
                  ? "border-[#3E715C]/20 bg-[#3E715C]/10 text-[#3E715C]"
                  : "border-white/15 bg-white/[0.1] text-[#8a9a8e]"
              )}>
              {mode === "autonom" ? "Auto" : "Manuell"}
            </span>
          </div>

          {/* Per-capability animation — fixed height, no layout shift */}
          <div className="relative z-10 h-[340px] overflow-hidden">
            <AnimatePresence mode="wait">
              <motion.div
                key={`${mode}-${capability}`}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.25 }}
                className="absolute inset-0">
                {CAPABILITY_RENDERERS[capability]({ phase, mode })}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ============================================================================
// SECTION LABEL
// ============================================================================

function SectionLabel({ children }: { children: React.ReactNode; variant?: "dark" | "light" }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-[#3E715C]/20 bg-[#3E715C]/10 px-4 py-1.5 text-[13px] font-bold tracking-[0.15em] text-[#3E715C] uppercase">
      {children}
    </span>
  );
}

// ============================================================================
// HOME PAGE
// ============================================================================

export default function HomePage() {
  const [ciriOpen, setCiriOpen] = useState(false);

  return (
    <div
      className="bg-white text-[#1a2e23]"
      style={{ fontFamily: "var(--font-hedvig-letters-serif), Georgia, serif" }}>
      <MarketingNav />

      {/* ================================================================ */}
      {/* HERO                                                             */}
      {/* ================================================================ */}
      <section className="px-4 pt-28 pb-3 sm:pt-36">
        <div className="mx-auto max-w-[var(--marketing-container)]">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="relative overflow-hidden rounded-[2rem] border border-[#d4dbd6] bg-[#f5f7f2] px-8 py-20 shadow-sm sm:px-16 sm:py-28 lg:px-24">
            {/* Background painting inside card */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/ciribakgrunn.png"
              alt=""
              className="absolute inset-0 h-full w-full object-cover opacity-50"
            />

            {/* Content */}
            <div className="relative z-10 text-center">
              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.5 }}
                className="text-3xl leading-[1.1] font-normal tracking-tight text-[#1a2e23] sm:text-4xl lg:text-5xl">
                Regnskapet som
                <br />
                <span className="text-[#3E715C]">tenker</span> for deg
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.65 }}
                className="mx-auto mt-5 max-w-md text-sm leading-relaxed text-[#4a5e52] sm:text-base">
                Ciri automatiserer bokføring, MVA og faktura — slik at du kan fokusere på det du
                gjør best.
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.8 }}
                className="mt-8 flex flex-wrap items-center justify-center gap-3">
                <Link
                  href="/register"
                  className="group flex items-center gap-2 rounded-full bg-[#3E715C] px-6 py-3 text-sm font-medium text-white transition-all hover:bg-[#5B906F] hover:shadow-xl hover:shadow-[#3E715C]/25">
                  Kom i gang gratis
                  <ArrowRightIcon className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </Link>
                <Link
                  href="/dashboard"
                  className="rounded-full border border-[#d4dbd6] px-6 py-3 text-sm text-[#4a5e52] transition-all hover:border-[#3E715C]/40 hover:bg-[#f5f7f2] hover:text-[#1a2e23]">
                  Se alle funksjoner
                </Link>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ================================================================ */}
      {/* METRICS BAR                                                      */}
      {/* ================================================================ */}
      <section className="px-4 py-3">
        <div className="mx-auto max-w-[var(--marketing-container)] overflow-hidden rounded-[2rem] border border-white/50 bg-white/70 shadow-sm backdrop-blur-xl">
          <MetricsBar />
        </div>
      </section>

      {/* ================================================================ */}
      {/* AUTONOMOUS ACCOUNTANT — INTERACTIVE SHOWCASE                    */}
      {/* ================================================================ */}
      <section className="px-4 py-3">
        <div className="relative mx-auto max-w-[var(--marketing-container)] overflow-hidden rounded-[2rem]">
          {/* Rich colorful background visible through the glass */}
          <div className="absolute inset-0 bg-gradient-to-br from-[#2d5e4a]/12 via-[#e8ede9] to-[#5B906F]/15" />
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute top-0 -left-32 h-[500px] w-[500px] rounded-full bg-[#3E715C]/18 blur-[120px]" />
            <div className="absolute top-1/2 -right-20 h-96 w-96 -translate-y-1/2 rounded-full bg-[#5B906F]/14 blur-[100px]" />
            <div className="absolute bottom-0 left-1/3 h-80 w-80 rounded-full bg-[#8BB5A2]/10 blur-[100px]" />
            <div className="absolute top-1/4 left-1/2 h-64 w-64 -translate-x-1/2 rounded-full bg-[#3E715C]/8 blur-[80px]" />
            <div className="absolute top-1/6 right-1/4 h-40 w-40 rounded-full bg-[#4a8068]/10 blur-[60px]" />
            <div className="absolute bottom-1/4 left-1/4 h-36 w-36 rounded-full bg-[#6aaa88]/8 blur-[50px]" />
          </div>

          {/* Glass section container */}
          <div className="relative overflow-hidden rounded-[2rem] border border-white/20 bg-white/[0.12] px-8 py-20 backdrop-blur-2xl backdrop-saturate-[1.6] sm:px-12 sm:py-28">
            {/* Edge highlights */}
            <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/60 to-transparent" />
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
            <div className="pointer-events-none absolute inset-y-0 left-0 w-px bg-gradient-to-b from-white/50 via-white/15 to-transparent" />
            <div className="pointer-events-none absolute inset-y-0 right-0 w-px bg-gradient-to-b from-white/10 via-transparent to-transparent" />
            {/* Specular corner glow */}
            <div className="pointer-events-none absolute inset-0 rounded-[2rem] bg-gradient-to-br from-white/25 via-transparent to-transparent" />

            <div className="relative z-10">
              <Reveal>
                <div className="text-center">
                  <SectionLabel>
                    <BrainCircuitIcon className="h-3.5 w-3.5" />
                    Autonom regnskapsfører
                  </SectionLabel>
                  <h2 className="mt-6 text-4xl font-normal tracking-tight text-[#1a2e23] sm:text-5xl">
                    Ciri gjør regnskapet <span className="text-[#3E715C]">for deg</span>
                  </h2>
                  <p className="mx-auto mt-5 max-w-lg text-base leading-relaxed text-[#4a5e52]">
                    Velg modus og se hvordan Ciri håndterer hver del av regnskapet.
                  </p>
                </div>
              </Reveal>

              <Reveal delay={0.1}>
                <div className="mt-12">
                  <AutonomousShowcase />
                </div>
              </Reveal>
            </div>
          </div>
        </div>
      </section>

      {/* ================================================================ */}
      {/* FEATURES GRID                                                    */}
      {/* ================================================================ */}
      <section className="px-4 py-3">
        <div className="mx-auto max-w-[var(--marketing-container)] overflow-hidden rounded-[2rem] border border-[#d4dbd6] bg-white px-8 py-20 shadow-sm sm:px-12 sm:py-28">
          <Reveal>
            <div className="text-center">
              <SectionLabel>
                <SparklesIcon className="h-3.5 w-3.5" />
                Alt du trenger
              </SectionLabel>
              <h2 className="mt-6 text-4xl font-normal tracking-tight text-[#1a2e23] sm:text-5xl">
                En plattform. Hele regnskapet.
              </h2>
              <p className="mx-auto mt-5 max-w-lg text-base text-[#4a5e52]">
                Fra bilag til årsregnskap — Ciri håndterer det meste automatisk og gir deg full
                kontroll over økonomien.
              </p>
            </div>
          </Reveal>

          <div className="mt-16 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                icon: <BrainCircuitIcon className="h-5 w-5" />,
                title: "AI Bokføring",
                desc: "Ciri kategoriserer, konterer og bokfører bilag automatisk med AI som lærer av dine valg.",
                href: "/produkt/ai-bokforing"
              },
              {
                icon: <LandmarkIcon className="h-5 w-5" />,
                title: "Bankavstemming",
                desc: "Transaksjoner matches automatisk mot bilag. Smart matching med konfidensscoring.",
                href: "/produkt/bankavstemming"
              },
              {
                icon: <ReceiptIcon className="h-5 w-5" />,
                title: "Faktura",
                desc: "Opprett og send profesjonelle fakturaer. Sporing av apning, betaling og purring.",
                href: "/produkt/fakturering"
              },
              {
                icon: <CalculatorIcon className="h-5 w-5" />,
                title: "MVA-håndtering",
                desc: "Automatisk MVA-beregning med støtte for 25%, 15%, 12% og 0%. Klar for innsending.",
                href: "/produkt/mva"
              },
              {
                icon: <UsersIcon className="h-5 w-5" />,
                title: "Lønn og A-melding",
                desc: "Registrer ansatte, hent skattekort automatisk og generer A-melding til Skatteetaten.",
                href: "/produkt/lonn"
              },
              {
                icon: <FileBarChartIcon className="h-5 w-5" />,
                title: "Rapporter",
                desc: "Årsregnskap, balanse, resultat og hovedbok — generert automatisk som PDF.",
                href: "/produkt/rapporter"
              }
            ].map((feature, i) => (
              <Reveal key={feature.title} delay={i * 0.06} className="h-full">
                <Link
                  href={feature.href}
                  className="group flex h-full flex-col rounded-2xl border border-[#d4dbd6] bg-[#f5f7f2] p-7 transition-all hover:border-[#3E715C]/25 hover:shadow-xl hover:shadow-[#3E715C]/5 sm:p-8">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-[#3E715C] transition-colors group-hover:bg-[#3E715C] group-hover:text-white">
                    {feature.icon}
                  </div>
                  <h3 className="mt-5 text-lg text-[#1a2e23]">{feature.title}</h3>
                  <p className="mt-2 flex-1 text-sm leading-relaxed text-[#4a5e52]">
                    {feature.desc}
                  </p>
                  <div className="mt-5 flex items-center gap-1.5 text-xs font-medium text-[#3E715C] opacity-0 transition-opacity group-hover:opacity-100">
                    Les mer
                    <ArrowRightIcon className="h-3 w-3" />
                  </div>
                </Link>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ================================================================ */}
      {/* AI CHAT SHOWCASE                                                 */}
      {/* ================================================================ */}
      <section className="px-4 py-3">
        <div className="relative mx-auto max-w-[var(--marketing-container)] overflow-hidden rounded-[2rem]">
          {/* Rich colorful background — this is what you see THROUGH the glass */}
          <div className="absolute inset-0 bg-gradient-to-br from-[#2d5e4a]/12 via-[#e8ede9] to-[#5B906F]/15" />
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute top-0 -left-32 h-[500px] w-[500px] rounded-full bg-[#3E715C]/18 blur-[120px]" />
            <div className="absolute top-1/2 -right-20 h-96 w-96 -translate-y-1/2 rounded-full bg-[#5B906F]/14 blur-[100px]" />
            <div className="absolute bottom-0 left-1/3 h-80 w-80 rounded-full bg-[#8BB5A2]/10 blur-[100px]" />
            <div className="absolute top-1/4 left-1/2 h-64 w-64 -translate-x-1/2 rounded-full bg-[#3E715C]/8 blur-[80px]" />
            {/* Small accent orbs */}
            <div className="absolute top-1/6 right-1/4 h-40 w-40 rounded-full bg-[#4a8068]/10 blur-[60px]" />
            <div className="absolute bottom-1/4 left-1/4 h-36 w-36 rounded-full bg-[#6aaa88]/8 blur-[50px]" />
          </div>

          {/* Glass section container */}
          <div className="relative overflow-hidden rounded-[2rem] border border-white/20 bg-white/[0.12] px-8 py-20 backdrop-blur-2xl backdrop-saturate-[1.6] sm:px-12 sm:py-28">
            {/* Edge highlights */}
            <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/60 to-transparent" />
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
            <div className="pointer-events-none absolute inset-y-0 left-0 w-px bg-gradient-to-b from-white/50 via-white/15 to-transparent" />
            <div className="pointer-events-none absolute inset-y-0 right-0 w-px bg-gradient-to-b from-white/10 via-transparent to-transparent" />
            {/* Specular corner glow */}
            <div className="pointer-events-none absolute inset-0 rounded-[2rem] bg-gradient-to-br from-white/25 via-transparent to-transparent" />

            <div className="relative z-10 grid items-center gap-16 lg:grid-cols-2">
              {/* Text */}
              <Reveal>
                <div>
                  <SectionLabel>
                    <BrainCircuitIcon className="h-3.5 w-3.5" />
                    AI-assistent
                  </SectionLabel>
                  <h2 className="mt-6 text-4xl font-normal tracking-tight text-[#1a2e23] sm:text-5xl">
                    Spør Ciri om
                    <br />
                    <span className="text-[#3E715C]">hva som helst</span>
                  </h2>
                  <p className="mt-5 max-w-md text-base leading-relaxed text-[#4a5e52]">
                    &laquo;Hva er MVA-status for denne terminen?&raquo; &laquo;Vis siste
                    bilag&raquo; &laquo;Lag en faktura til Ola Nordmann&raquo; — Ciri forstår norsk
                    regnskap.
                  </p>
                  <ul className="mt-8 space-y-3">
                    {[
                      "Kontekstbevisst — vet hvilken side du er på",
                      "Lager fakturaer direkte fra chatten",
                      "Forklarer regnskap på enkelt norsk",
                      "Henter rapporter og tall i sanntid"
                    ].map((item) => (
                      <li key={item} className="flex items-start gap-3 text-sm text-[#4a5e52]">
                        <CheckIcon className="mt-0.5 h-4 w-4 shrink-0 text-[#5B906F]" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </Reveal>

              {/* Animated chat demo */}
              <Reveal delay={0.2}>
                <div className="relative">
                  {/* Intense blobs behind the chat card for maximum glass refraction */}
                  <div className="pointer-events-none absolute -inset-16">
                    <div className="absolute top-1/4 left-0 h-72 w-72 rounded-full bg-[#3E715C]/25 blur-[80px]" />
                    <div className="absolute top-1/3 right-0 h-60 w-60 rounded-full bg-[#5B906F]/20 blur-[70px]" />
                    <div className="absolute bottom-0 left-1/3 h-56 w-56 rounded-full bg-[#8BB5A2]/15 blur-[60px]" />
                    <div className="absolute right-1/4 bottom-1/4 h-44 w-44 rounded-full bg-[#4a8068]/12 blur-[50px]" />
                    <div className="absolute top-0 left-1/2 h-36 w-36 -translate-x-1/2 rounded-full bg-[#3E715C]/10 blur-[40px]" />
                  </div>
                  <AnimatedChatDemo />
                </div>
              </Reveal>
            </div>
          </div>
        </div>
      </section>

      {/* ================================================================ */}
      {/* EMAIL AUTOMATION                                                 */}
      {/* ================================================================ */}
      <section className="px-4 py-3">
        <div className="mx-auto max-w-[var(--marketing-container)] overflow-hidden rounded-[2rem] border border-[#d4dbd6] bg-white px-8 py-20 shadow-sm sm:px-12 sm:py-28">
          <div className="grid items-center gap-16 lg:grid-cols-2">
            {/* Pipeline animation */}
            <Reveal>
              <EmailPipelineAnimation />
            </Reveal>

            {/* Text */}
            <Reveal delay={0.15}>
              <div>
                <SectionLabel>
                  <MailIcon className="h-3.5 w-3.5" />
                  E-post automatisering
                </SectionLabel>
                <h2 className="mt-6 text-4xl font-normal tracking-tight text-[#1a2e23] sm:text-5xl">
                  Innboksen din, <span className="text-[#3E715C]">automatisert</span>
                </h2>
                <p className="mt-5 max-w-md text-base leading-relaxed text-[#4a5e52]">
                  Koble til Gmail eller Outlook. Ciri leser fakturaer fra e-posten din, kjorer OCR,
                  matcher mot banktransaksjoner og bokforer — helt automatisk.
                </p>
                <div className="mt-8 space-y-4">
                  {[
                    {
                      title: "Henter vedlegg automatisk",
                      desc: "PDF- og bildefakturaer plukkes opp fra innboksen."
                    },
                    {
                      title: "AI-drevet OCR",
                      desc: "Claude Vision leser leverandør, beløp, MVA og KID."
                    },
                    {
                      title: "Smart matching",
                      desc: "Matcher bilag mot banktransaksjoner med konfidensscoring."
                    }
                  ].map((item) => (
                    <div key={item.title} className="flex gap-3">
                      <div className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#3E715C]/15 text-[#5B906F]">
                        <CheckIcon className="h-3 w-3" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-[#1a2e23]">{item.title}</p>
                        <p className="text-xs text-[#8a9a8e]">{item.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <Link
                  href="/produkt/e-post"
                  className="group mt-8 inline-flex items-center gap-2 text-sm font-medium text-[#3E715C] transition-colors hover:text-[#5B906F]">
                  Les mer om automatisering
                  <ArrowRightIcon className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                </Link>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ================================================================ */}
      {/* SECURITY                                                         */}
      {/* ================================================================ */}
      <section className="px-4 py-3">
        <div className="mx-auto max-w-[var(--marketing-container)] overflow-hidden rounded-[2rem] border border-[#d4dbd6] bg-[#f5f7f2] px-8 py-20 shadow-sm sm:px-12 sm:py-28">
          <Reveal>
            <div className="text-center">
              <SectionLabel>
                <ShieldCheckIcon className="h-3.5 w-3.5" />
                Sikkerhet og samsvar
              </SectionLabel>
              <h2 className="mt-6 text-4xl font-normal tracking-tight text-[#1a2e23] sm:text-5xl">
                Bygget for norsk <span className="text-[#3E715C]">regelverk</span>
              </h2>
            </div>
          </Reveal>

          <div className="mt-16 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                icon: <ScaleIcon className="h-5 w-5" />,
                title: "Bokføringsloven",
                desc: "Full etterlevelse av norsk bokføringslov og god regnskapsskikk."
              },
              {
                icon: <FileCheckIcon className="h-5 w-5" />,
                title: "SAF-T eksport",
                desc: "Standard Audit File v1.30 for Skatteetaten — klar med ett klikk."
              },
              {
                icon: <LockIcon className="h-5 w-5" />,
                title: "GDPR",
                desc: "Fullstendig personvern med kryptering og rett til sletting."
              },
              {
                icon: <ServerIcon className="h-5 w-5" />,
                title: "Norsk lagring",
                desc: "All data lagres på servere i EØS. Ingen data forlater Norge."
              }
            ].map((item, i) => (
              <Reveal key={item.title} delay={i * 0.08} className="h-full">
                <div className="flex h-full flex-col rounded-2xl border border-white/50 bg-white/60 p-7 text-center shadow-sm backdrop-blur-lg transition-all hover:border-[#3E715C]/25 hover:shadow-lg hover:shadow-[#3E715C]/5">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#3E715C]/10 text-[#5B906F]">
                    {item.icon}
                  </div>
                  <h3 className="mt-4 text-base text-[#1a2e23]">{item.title}</h3>
                  <p className="mt-2 flex-1 text-xs leading-relaxed text-[#8a9a8e]">{item.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>

          <Reveal delay={0.3}>
            <div className="mt-8 text-center">
              <Link
                href="/produkt/sikkerhet"
                className="group inline-flex items-center gap-2 text-sm text-[#3E715C] transition-colors hover:text-[#5B906F]">
                Les mer om sikkerhet
                <ArrowRightIcon className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ================================================================ */}
      {/* FINAL CTA                                                        */}
      {/* ================================================================ */}
      <section className="px-4 py-3 pb-6">
        <div className="relative mx-auto max-w-[var(--marketing-container)] overflow-hidden rounded-[2rem] border border-[#d4dbd6] bg-white shadow-sm">
          {/* Background painting, very subtle on light */}
          <div className="absolute inset-0">
            <Image src="/ciribakgrunn.png" alt="" fill className="object-cover opacity-[0.04]" />
            <div className="absolute inset-0 bg-gradient-to-b from-white/80 via-transparent to-white/80" />
          </div>

          <div className="relative z-10 mx-auto max-w-3xl px-8 py-20 text-center sm:py-32">
            <Reveal>
              <CiriLogo
                size="lg"
                animated
                intensity="normal"
                showPulseRings
                className="mx-auto mb-8 justify-center"
              />
              <h2 className="text-4xl font-normal tracking-tight text-[#1a2e23] sm:text-6xl">
                Klar til å automatisere
                <br />
                <span className="text-[#3E715C]">regnskapet?</span>
              </h2>
              <p className="mx-auto mt-6 max-w-md text-base text-[#4a5e52]">
                Bli med hundrevis av norske bedrifter som har gatt over til smartere regnskap med
                Ciri.
              </p>
              <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
                <Link
                  href="/register"
                  className="group flex items-center gap-2 rounded-full bg-[#3E715C] px-8 py-4 text-base font-medium text-white transition-all hover:bg-[#5B906F] hover:shadow-xl hover:shadow-[#3E715C]/30">
                  Kom i gang gratis
                  <ArrowRightIcon className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </Link>
              </div>
              <p className="mt-5 text-xs text-[#8a9a8e]">
                Ingen kredittkort nødvendig. Gratis i 14 dager.
              </p>
            </Reveal>
          </div>
        </div>
      </section>

      <MarketingFooter />

      {/* ================================================================ */}
      {/* FLOATING CIRI BUBBLE WITH DEMO Q&A                               */}
      {/* ================================================================ */}
      <CiriMarketingBubble ciriOpen={ciriOpen} setCiriOpen={setCiriOpen} />
    </div>
  );
}
