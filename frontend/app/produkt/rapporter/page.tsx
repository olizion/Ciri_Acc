"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FileBarChartIcon,
  FileTextIcon,
  CheckCircleIcon,
  ScaleIcon,
  DownloadIcon,
  ClipboardListIcon,
  BarChart3Icon,
  SparklesIcon,
  CoffeeIcon,
  BookOpenIcon,
} from "lucide-react";
import {
  HeroSection,
  GlassSection,
  SolidSection,
  MarketingCTA,
  Reveal,
  SectionLabel,
  PageMetrics,
  FeatureGrid,
  BulletList,
  MARKETING_EASING,
  useMarketingViewport,
} from "@/lib/marketing-utils";
import { cn } from "@/lib/utils";

// ============================================================================
// ANIMATION 1: ÅRSREGNSKAP ASSEMBLY — concrete table building
// Shows resultatregnskap → balanse → combined årsregnskap
// ============================================================================

const RESULTAT_ROWS = [
  { label: "Salgsinntekter", value: "2 450 000", positive: true },
  { label: "Varekostnad", value: "980 000", positive: false },
  { label: "Lønnskostnader", value: "620 000", positive: false },
  { label: "Andre driftskostnader", value: "185 000", positive: false },
  { label: "Driftsresultat", value: "665 000", positive: true, bold: true },
];

const BALANSE_ROWS = [
  { label: "Bankinnskudd", value: "450 000", side: "left" as const },
  { label: "Kundefordringer", value: "120 000", side: "left" as const },
  { label: "Inventar", value: "80 000", side: "left" as const },
  { label: "Leverandørgjeld", value: "95 000", side: "right" as const },
  { label: "Egenkapital", value: "555 000", side: "right" as const },
];

function AarsregnskapAssemblyAnimation() {
  const { ref: viewportRef, hasEntered } = useMarketingViewport();
  // frame 0: resultatregnskap building, 1: balanse building, 2: combined årsregnskap
  const [frame, setFrame] = useState(0);
  const [visibleRows, setVisibleRows] = useState(0);
  const timersRef = useRef<NodeJS.Timeout[]>([]);

  const clearTimers = () => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
  };

  const schedule = (fn: () => void, ms: number) => {
    timersRef.current.push(setTimeout(fn, ms));
  };

  useEffect(() => {
    if (!hasEntered) return;

    const runCycle = () => {
      clearTimers();
      setFrame(0);
      setVisibleRows(0);

      // Frame 0: Resultatregnskap rows appear one by one
      RESULTAT_ROWS.forEach((_, i) => {
        schedule(() => setVisibleRows(i + 1), 400 + i * 500);
      });

      const afterResultat = 400 + RESULTAT_ROWS.length * 500 + 800;

      // Frame 1: Switch to Balanse
      schedule(() => {
        setFrame(1);
        setVisibleRows(0);
      }, afterResultat);

      BALANSE_ROWS.forEach((_, i) => {
        schedule(() => setVisibleRows(i + 1), afterResultat + 400 + i * 400);
      });

      const afterBalanse =
        afterResultat + 400 + BALANSE_ROWS.length * 400 + 800;

      // Frame 2: Combined årsregnskap
      schedule(() => {
        setFrame(2);
        setVisibleRows(0);
      }, afterBalanse);

      // Restart
      schedule(() => runCycle(), afterBalanse + 4000);
    };

    runCycle();
    return () => clearTimers();
  }, [hasEntered]);

  return (
    <div ref={viewportRef} className="relative mx-auto max-w-md">
      <div className="relative overflow-hidden rounded-2xl border border-white/15 bg-white/[0.08] p-6 shadow-2xl backdrop-blur-3xl">
        <div className="pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-br from-white/30 via-transparent to-transparent" />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/60 to-transparent" />

        <div className="relative z-10">
          <AnimatePresence mode="wait">
            {/* Frame 0: Resultatregnskap */}
            {frame === 0 && (
              <motion.div
                key="resultat"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.4 }}
              >
                {/* Header */}
                <div className="mb-4 flex items-center gap-3 border-b border-white/10 pb-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#3E715C]/10">
                    <BarChart3Icon className="h-4 w-4 text-[#3E715C]" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-[#1a2e23]">
                      Resultatregnskap
                    </p>
                    <p className="text-[12px] text-[#8a9a8e]">2025</p>
                  </div>
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      ease: "linear",
                    }}
                    className="ml-auto"
                  >
                    <SparklesIcon className="h-3.5 w-3.5 text-[#5B906F]" />
                  </motion.div>
                </div>

                {/* Rows */}
                <div className="space-y-1.5">
                  {RESULTAT_ROWS.map((row, i) => (
                    <motion.div
                      key={row.label}
                      initial={{ opacity: 0, x: -12 }}
                      animate={
                        i < visibleRows
                          ? { opacity: 1, x: 0 }
                          : { opacity: 0, x: -12 }
                      }
                      transition={{ duration: 0.35, ease: MARKETING_EASING }}
                      className={cn(
                        "flex items-center justify-between rounded-lg px-3 py-2",
                        row.bold
                          ? "border border-[#3E715C]/20 bg-[#3E715C]/5"
                          : "bg-white/[0.04]"
                      )}
                    >
                      <span
                        className={cn(
                          "text-xs",
                          row.bold
                            ? "font-semibold text-[#1a2e23]"
                            : "text-[#4a5e52]"
                        )}
                      >
                        {row.label}
                      </span>
                      <span
                        className={cn(
                          "font-mono text-xs tabular-nums",
                          row.bold
                            ? "font-semibold text-[#3E715C]"
                            : row.positive
                              ? "text-[#1a2e23]"
                              : "text-[#8a9a8e]"
                        )}
                      >
                        {row.positive ? "" : "- "}kr {row.value}
                      </span>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Frame 1: Balanse */}
            {frame === 1 && (
              <motion.div
                key="balanse"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.4 }}
              >
                <div className="mb-4 flex items-center gap-3 border-b border-white/10 pb-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10">
                    <ScaleIcon className="h-4 w-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-[#1a2e23]">
                      Balanse
                    </p>
                    <p className="text-[12px] text-[#8a9a8e]">
                      Per 31.12.2025
                    </p>
                  </div>
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      ease: "linear",
                    }}
                    className="ml-auto"
                  >
                    <SparklesIcon className="h-3.5 w-3.5 text-[#5B906F]" />
                  </motion.div>
                </div>

                {/* Two column labels */}
                <div className="mb-2 grid grid-cols-2 gap-2 px-3">
                  <span className="text-[12px] font-bold tracking-wider text-[#3E715C] uppercase">
                    Eiendeler
                  </span>
                  <span className="text-right text-[12px] font-bold tracking-wider text-[#d97706] uppercase">
                    Gjeld + EK
                  </span>
                </div>

                <div className="space-y-1.5">
                  {BALANSE_ROWS.map((row, i) => (
                    <motion.div
                      key={row.label}
                      initial={{ opacity: 0, x: row.side === "left" ? -12 : 12 }}
                      animate={
                        i < visibleRows
                          ? { opacity: 1, x: 0 }
                          : { opacity: 0, x: row.side === "left" ? -12 : 12 }
                      }
                      transition={{ duration: 0.35, ease: MARKETING_EASING }}
                      className={cn(
                        "flex items-center justify-between rounded-lg bg-white/[0.04] px-3 py-2",
                        row.side === "right" && "flex-row-reverse"
                      )}
                    >
                      <span className="text-xs text-[#4a5e52]">
                        {row.label}
                      </span>
                      <span
                        className={cn(
                          "font-mono text-xs tabular-nums",
                          row.side === "left"
                            ? "text-[#3E715C]"
                            : "text-[#d97706]"
                        )}
                      >
                        kr {row.value}
                      </span>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Frame 2: Combined Årsregnskap */}
            {frame === 2 && (
              <motion.div
                key="combined"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.5 }}
              >
                <div className="flex flex-col items-center text-center">
                  {/* Document icon */}
                  <motion.div
                    initial={{ scale: 0, rotate: -10 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{
                      type: "spring",
                      stiffness: 300,
                      damping: 15,
                      delay: 0.2,
                    }}
                    className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#3E715C]/10"
                  >
                    <BookOpenIcon className="h-8 w-8 text-[#3E715C]" />
                  </motion.div>

                  <motion.p
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="text-lg font-medium text-[#1a2e23]"
                  >
                    Årsregnskap 2025
                  </motion.p>
                  <motion.p
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                    className="mt-1 text-xs text-[#8a9a8e]"
                  >
                    Min Bedrift AS · Org. 999 888 777
                  </motion.p>

                  {/* Components included */}
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.7 }}
                    className="mt-5 flex flex-wrap items-center justify-center gap-2"
                  >
                    {[
                      { label: "Resultatregnskap", color: "#3E715C" },
                      { label: "Balanse", color: "#2d6a9f" },
                      { label: "Noter", color: "#7c3aed" },
                    ].map((doc) => (
                      <span
                        key={doc.label}
                        className="rounded-full border px-3 py-1 text-[12px] font-medium"
                        style={{
                          borderColor: `${doc.color}30`,
                          color: doc.color,
                          backgroundColor: `${doc.color}08`,
                        }}
                      >
                        {doc.label} ✓
                      </span>
                    ))}
                  </motion.div>

                  {/* Ready badge */}
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{
                      delay: 1,
                      type: "spring",
                      stiffness: 300,
                      damping: 15,
                    }}
                    className="mt-6 flex items-center gap-2 rounded-full bg-[#3E715C]/10 px-5 py-2.5"
                  >
                    <CheckCircleIcon className="h-4 w-4 text-[#3E715C]" />
                    <span className="text-sm font-medium text-[#3E715C]">
                      Klar for innsending til Brønnøysund
                    </span>
                  </motion.div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Frame indicator dots */}
          <div className="mt-5 flex items-center justify-center gap-2">
            {["Resultat", "Balanse", "Årsregnskap"].map((label, i) => (
              <span
                key={label}
                className={cn(
                  "rounded-full px-2.5 py-0.5 text-[13px] font-medium transition-colors",
                  frame === i
                    ? "bg-[#3E715C]/15 text-[#3E715C]"
                    : "text-[#8a9a8e]"
                )}
              >
                {label}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// ANIMATION 2: BALANCE EQUATION (Eiendeler = Gjeld + Egenkapital)
// ============================================================================

interface BalanceBlock {
  label: string;
  amount: number;
  displayAmount: string;
}

const EIENDELER_BLOCKS: BalanceBlock[] = [
  { label: "Bankinnskudd", amount: 450000, displayAmount: "kr 450 000" },
  { label: "Kundefordringer", amount: 120000, displayAmount: "kr 120 000" },
  { label: "Inventar", amount: 80000, displayAmount: "kr 80 000" },
];

const GJELD_BLOCKS: BalanceBlock[] = [
  { label: "Leverandørgjeld", amount: 95000, displayAmount: "kr 95 000" },
  { label: "Lån", amount: 200000, displayAmount: "kr 200 000" },
];

const EGENKAPITAL_BLOCKS: BalanceBlock[] = [
  { label: "Egenkapital", amount: 355000, displayAmount: "kr 355 000" },
];

function BalanceEquationAnimation() {
  const { ref: viewportRef, hasEntered } = useMarketingViewport();
  const [phase, setPhase] = useState(0);
  const timersRef = useRef<NodeJS.Timeout[]>([]);

  const clearTimers = () => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
  };
  const schedule = (fn: () => void, ms: number) => {
    timersRef.current.push(setTimeout(fn, ms));
  };

  useEffect(() => {
    if (!hasEntered) return;
    clearTimers();
    schedule(() => setPhase(1), 300);
    schedule(() => setPhase(2), 700);
    schedule(() => setPhase(3), 1100);
    schedule(() => setPhase(4), 1700);
    schedule(() => setPhase(5), 2100);
    schedule(() => setPhase(6), 2700);
    schedule(() => setPhase(7), 3300);
    return () => clearTimers();
  }, [hasEntered]);

  const eiendelerTotal = EIENDELER_BLOCKS.reduce((s, b) => s + b.amount, 0);
  const eiendelerShown = Math.min(phase, 3);
  const gjeldShown = Math.max(0, Math.min(phase - 3, 2));
  const egenkapitalShown = Math.max(0, Math.min(phase - 5, 1));

  const leftRunning = EIENDELER_BLOCKS.slice(0, eiendelerShown).reduce(
    (s, b) => s + b.amount,
    0
  );
  const rightGjeldRunning = GJELD_BLOCKS.slice(0, gjeldShown).reduce(
    (s, b) => s + b.amount,
    0
  );
  const rightEKRunning = EGENKAPITAL_BLOCKS.slice(0, egenkapitalShown).reduce(
    (s, b) => s + b.amount,
    0
  );
  const rightRunning = rightGjeldRunning + rightEKRunning;

  const isBalanced = phase >= 7;
  const diff = leftRunning - rightRunning;
  const maxDiff = eiendelerTotal;
  const tiltDeg = maxDiff > 0 ? (diff / maxDiff) * 6 : 0;

  const formatKr = (n: number) => {
    if (n === 0) return "kr 0";
    return `kr ${n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ")}`;
  };

  const renderBlock = (
    block: BalanceBlock,
    visible: boolean,
    color: string
  ) => (
    <motion.div
      key={block.label}
      initial={{ opacity: 0, y: -40, scale: 0.9 }}
      animate={
        visible
          ? { opacity: 1, y: 0, scale: 1 }
          : { opacity: 0, y: -40, scale: 0.9 }
      }
      transition={{ type: "spring", stiffness: 300, damping: 18 }}
      className="rounded-lg border px-3 py-2"
      style={{ borderColor: `${color}30`, backgroundColor: `${color}08` }}
    >
      <p className="text-[12px] text-[#8a9a8e]">{block.label}</p>
      <p
        className="font-mono text-xs font-medium tabular-nums"
        style={{ color }}
      >
        {block.displayAmount}
      </p>
    </motion.div>
  );

  return (
    <div ref={viewportRef} className="mx-auto max-w-xl">
      <div className="overflow-hidden rounded-2xl border border-[#d4dbd6] bg-white p-6 sm:p-8">
        {/* Column headers */}
        <div className="mb-4 grid grid-cols-[1fr_auto_1fr] items-start gap-3">
          <div className="text-center">
            <p className="text-[12px] font-bold tracking-wider text-[#3E715C] uppercase">
              Eiendeler
            </p>
            <p className="mt-1 font-mono text-lg font-normal tabular-nums text-[#3E715C]">
              {formatKr(leftRunning)}
            </p>
          </div>
          <div className="flex items-center justify-center pt-3">
            <motion.span
              animate={
                isBalanced
                  ? { color: "#3E715C", scale: [1, 1.2, 1] }
                  : { color: "#8a9a8e", scale: 1 }
              }
              transition={
                isBalanced
                  ? {
                      scale: {
                        duration: 0.6,
                        repeat: 2,
                        repeatType: "reverse",
                      },
                    }
                  : {}
              }
              className="text-xl font-medium"
            >
              =
            </motion.span>
          </div>
          <div className="text-center">
            <p className="text-[12px] font-bold tracking-wider text-[#4a5e52] uppercase">
              Gjeld + Egenkapital
            </p>
            <p className="mt-1 font-mono text-lg font-normal tabular-nums text-[#4a5e52]">
              {formatKr(rightRunning)}
            </p>
          </div>
        </div>

        {/* Block columns */}
        <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-3">
          <div className="space-y-2">
            {EIENDELER_BLOCKS.map((block, i) =>
              renderBlock(block, i < eiendelerShown, "#3E715C")
            )}
          </div>
          <div className="flex flex-col items-center justify-end pb-2">
            <div className="h-24 w-px bg-[#d4dbd6]" />
            <div className="h-3 w-3 rounded-full bg-[#d4dbd6]" />
          </div>
          <div className="space-y-2">
            {GJELD_BLOCKS.map((block, i) =>
              renderBlock(block, i < gjeldShown, "#d97706")
            )}
            {EGENKAPITAL_BLOCKS.map((block, i) =>
              renderBlock(block, i < egenkapitalShown, "#5B906F")
            )}
          </div>
        </div>

        {/* Balance beam */}
        <div className="mt-4 flex items-center justify-center">
          <motion.div
            animate={{ rotate: isBalanced ? 0 : tiltDeg }}
            transition={{ type: "spring", stiffness: 120, damping: 14 }}
            className="relative h-2 w-full max-w-md overflow-hidden rounded-full"
          >
            <div className="absolute inset-0 bg-[#f0f2ed]" />
            <motion.div
              className="absolute inset-0 rounded-full"
              animate={
                isBalanced
                  ? {
                      background: [
                        "linear-gradient(90deg, #3E715C 0%, #5B906F 100%)",
                        "linear-gradient(90deg, #5B906F 0%, #3E715C 100%)",
                      ],
                    }
                  : {
                      background:
                        "linear-gradient(90deg, #d4dbd6 0%, #d4dbd6 100%)",
                    }
              }
              transition={
                isBalanced
                  ? {
                      duration: 1.5,
                      repeat: Infinity,
                      repeatType: "reverse",
                    }
                  : {}
              }
            />
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={isBalanced ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
          transition={{ delay: 0.2, duration: 0.4 }}
          className="mt-3 flex items-center justify-center gap-2"
        >
          <CheckCircleIcon className="h-4 w-4 text-[#3E715C]" />
          <span className="text-xs font-medium text-[#3E715C]">
            Balansen stemmer
          </span>
        </motion.div>
      </div>
    </div>
  );
}

// ============================================================================
// ANIMATION 3: COMPLETENESS CHECKLIST
// ============================================================================

const CHECKLIST_ITEMS = [
  "Inntekter registrert",
  "Kostnader kategorisert",
  "Bankavstemming fullført",
  "MVA beregnet",
  "Avskrivninger bokført",
  "Periodelukking gjort",
  "Noter generert",
  "Årsregnskap klart",
];

function CompletenessChecklistAnimation() {
  const { ref: viewportRef, hasEntered } = useMarketingViewport();
  const [checkedCount, setCheckedCount] = useState(0);
  const timersRef = useRef<NodeJS.Timeout[]>([]);

  const clearTimers = () => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
  };
  const schedule = (fn: () => void, ms: number) => {
    timersRef.current.push(setTimeout(fn, ms));
  };

  useEffect(() => {
    if (!hasEntered) return;
    clearTimers();
    CHECKLIST_ITEMS.forEach((_, i) => {
      schedule(() => setCheckedCount(i + 1), 400 + i * 400);
    });
    return () => clearTimers();
  }, [hasEntered]);

  const progressPct = (checkedCount / CHECKLIST_ITEMS.length) * 100;
  const allDone = checkedCount === CHECKLIST_ITEMS.length;

  return (
    <div ref={viewportRef} className="relative mx-auto max-w-md">
      <motion.div
        animate={
          allDone
            ? {
                boxShadow: [
                  "0 0 0 0px rgba(62,113,92,0)",
                  "0 0 20px 4px rgba(62,113,92,0.25)",
                  "0 0 0 0px rgba(62,113,92,0)",
                ],
              }
            : { boxShadow: "0 0 0 0px rgba(62,113,92,0)" }
        }
        transition={
          allDone
            ? { duration: 2, repeat: Infinity, repeatType: "loop" }
            : {}
        }
        className="overflow-hidden rounded-2xl border border-white/15 bg-white/[0.08] p-6 shadow-2xl backdrop-blur-3xl"
      >
        <div className="pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-br from-white/30 via-transparent to-transparent" />

        <div className="relative z-10">
          {/* Progress bar */}
          <div className="mb-2 flex items-center justify-between">
            <p className="text-[12px] font-bold tracking-wider text-[#3E715C] uppercase">
              Fullstendighetskontroll
            </p>
            <span className="font-mono text-xs font-medium tabular-nums text-[#3E715C]">
              {Math.round(progressPct)}%
            </span>
          </div>
          <div className="mb-6 h-2 overflow-hidden rounded-full bg-white/10">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-[#3E715C] to-[#5B906F]"
              initial={{ width: "0%" }}
              animate={{ width: `${progressPct}%` }}
              transition={{ duration: 0.4, ease: MARKETING_EASING }}
            />
          </div>

          {/* Checklist */}
          <div className="space-y-2">
            {CHECKLIST_ITEMS.map((item, i) => {
              const isChecked = i < checkedCount;
              return (
                <motion.div
                  key={item}
                  initial={{ opacity: 0, x: -10 }}
                  animate={hasEntered ? { opacity: 1, x: 0 } : {}}
                  transition={{
                    delay: i * 0.06,
                    duration: 0.3,
                    ease: MARKETING_EASING,
                  }}
                  className={cn(
                    "flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors duration-300",
                    isChecked
                      ? "border border-[#3E715C]/15 bg-[#3E715C]/[0.06]"
                      : "border border-white/10 bg-white/[0.04]"
                  )}
                >
                  <div className="relative flex h-5 w-5 shrink-0 items-center justify-center">
                    <motion.div
                      animate={
                        isChecked
                          ? { backgroundColor: "#3E715C", scale: 1 }
                          : {
                              backgroundColor: "rgba(138,154,142,0.2)",
                              scale: 1,
                            }
                      }
                      transition={{
                        type: "spring",
                        stiffness: 400,
                        damping: 15,
                      }}
                      className="absolute inset-0 rounded-full"
                    />
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 12 12"
                      fill="none"
                      className="relative z-10"
                    >
                      <motion.path
                        d="M2.5 6L5 8.5L9.5 3.5"
                        stroke="white"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        initial={{ pathLength: 0, opacity: 0 }}
                        animate={
                          isChecked
                            ? { pathLength: 1, opacity: 1 }
                            : { pathLength: 0, opacity: 0 }
                        }
                        transition={{
                          pathLength: {
                            type: "spring",
                            stiffness: 300,
                            damping: 20,
                          },
                          opacity: { duration: 0.1 },
                        }}
                      />
                    </svg>
                  </div>

                  <span
                    className={cn(
                      "text-xs transition-colors duration-300",
                      isChecked
                        ? "font-medium text-[#1a2e23]"
                        : "text-[#8a9a8e]"
                    )}
                  >
                    {item}
                  </span>

                  {isChecked && (
                    <motion.span
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{
                        type: "spring",
                        stiffness: 400,
                        damping: 15,
                      }}
                      className="ml-auto text-[13px] tabular-nums text-[#5B906F]"
                    >
                      OK
                    </motion.span>
                  )}
                </motion.div>
              );
            })}
          </div>

          {/* Completion badge */}
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.9 }}
            animate={
              allDone
                ? { opacity: 1, y: 0, scale: 1 }
                : { opacity: 0, y: 10, scale: 0.9 }
            }
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
            className="mt-4 flex items-center justify-center gap-2 rounded-xl bg-[#3E715C]/10 px-4 py-3"
          >
            <CheckCircleIcon className="h-4 w-4 text-[#3E715C]" />
            <span className="text-sm font-medium text-[#3E715C]">
              Klar for innsending
            </span>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}

// ============================================================================
// PAGE
// ============================================================================

export default function RapporterPage() {
  return (
    <>
      {/* Hero */}
      <HeroSection
        backgroundImage="/ciribackground6.jpg"
        title="Rapporter som skriver seg selv."
        subtitle="Årsregnskap, balanse og resultat — generert automatisk og klart for innsending."
        ctaText="Generer ditt første årsregnskap"
        ctaHref="/register"
      />

      {/* Metrics */}
      <PageMetrics
        stats={[
          { value: "3 rapporter", label: "Resultat, balanse, noter" },
          { value: "NS 4102", label: "Norsk kontoplan" },
          { value: "PDF", label: "Ett-klikks eksport" },
          { value: "SAF-T", label: "Revisorklar eksport" },
        ]}
      />

      {/* Animation 1: Årsregnskap Assembly (Glass, centered) */}
      <GlassSection>
        <Reveal>
          <div className="text-center">
            <SectionLabel>
              <FileBarChartIcon className="h-3.5 w-3.5" />
              Automatiske årsrapporter
            </SectionLabel>
            <h2 className="mt-6 text-4xl font-normal tracking-tight text-[#1a2e23] sm:text-5xl">
              Komplett{" "}
              <span className="text-[#3E715C]">årsregnskap</span>
            </h2>
            <p className="mx-auto mt-5 max-w-lg text-base leading-relaxed text-[#4a5e52]">
              Ciri bygger resultatregnskap og balanse automatisk fra bokføringen
              din, og setter dem sammen til et komplett årsregnskap klart for
              Brønnøysund.
            </p>
          </div>
        </Reveal>
        <Reveal delay={0.15}>
          <div className="mt-12">
            <AarsregnskapAssemblyAnimation />
          </div>
        </Reveal>
        <Reveal delay={0.25}>
          <ul className="mx-auto mt-10 flex max-w-2xl flex-col gap-3 sm:flex-row sm:gap-8">
            {[
              "Resultatregnskap etter NS 4102",
              "Automatisk genererte noter",
              "Komplett sjekkliste for årsoppgjør",
            ].map((item) => (
              <li
                key={item}
                className="flex items-start gap-2 text-sm text-[#4a5e52]"
              >
                <CheckCircleIcon className="mt-0.5 h-4 w-4 shrink-0 text-[#5B906F]" />
                {item}
              </li>
            ))}
          </ul>
        </Reveal>
      </GlassSection>

      {/* Feature Grid (TextSection 1) */}
      <FeatureGrid
        label="Rapportfunksjoner"
        labelIcon={<FileBarChartIcon className="h-3.5 w-3.5" />}
        heading="Rapporter som"
        headingAccent="skriver seg selv"
        description="Årsregnskap, balanse og resultat — generert automatisk fra bokføringen."
        features={[
          {
            icon: <FileBarChartIcon className="h-5 w-5" />,
            title: "Årsregnskap",
            desc: "Komplett årsregnskap med resultat, balanse og noter generert automatisk.",
          },
          {
            icon: <ScaleIcon className="h-5 w-5" />,
            title: "Balansesjekk",
            desc: "Automatisk verifisering av at eiendeler = gjeld + egenkapital.",
          },
          {
            icon: <DownloadIcon className="h-5 w-5" />,
            title: "Eksport",
            desc: "Last ned som PDF eller eksporter SAF-T v1.30 for revisor.",
          },
        ]}
      />

      {/* Animation 2: Balance Equation (Solid cream, 2-col) */}
      <SolidSection variant="cream">
        <div className="grid items-center gap-16 lg:grid-cols-2">
          <Reveal>
            <div>
              <SectionLabel>
                <ScaleIcon className="h-3.5 w-3.5" />
                Balansesjekk
              </SectionLabel>
              <h2 className="mt-6 text-3xl font-normal tracking-tight text-[#1a2e23] sm:text-4xl">
                Eiendeler = Gjeld +{" "}
                <span className="text-[#3E715C]">Egenkapital</span>
              </h2>
              <p className="mt-5 max-w-md text-base leading-relaxed text-[#4a5e52]">
                Ciri verifiserer automatisk at balansen stemmer. Se i sanntid
                hvordan eiendeler, gjeld og egenkapital holder seg i likevekt.
              </p>
              <BulletList
                items={[
                  "Automatisk balansesjekk",
                  "Visuell fremstilling av likevekt",
                  "Varsling ved avvik",
                ]}
              />
            </div>
          </Reveal>
          <Reveal delay={0.15}>
            <div className="min-h-[320px] sm:min-h-[380px]">
              <BalanceEquationAnimation />
            </div>
          </Reveal>
        </div>
      </SolidSection>

      {/* TextSection 2: Simplicity / breathing room */}
      <SolidSection>
        <Reveal>
          <div className="text-center">
            <SectionLabel>
              <CoffeeIcon className="h-3.5 w-3.5" />
              Endelig enkelt
            </SectionLabel>
            <h2 className="mt-6 text-4xl font-normal tracking-tight text-[#1a2e23] sm:text-5xl">
              Årsregnskap{" "}
              <span className="text-[#3E715C]">uten revisorhonorar</span>
            </h2>
            <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-[#4a5e52]">
              De fleste småbedrifter betaler tusener for noe som burde vært
              automatisk. Ciri genererer resultatregnskap, balanse og noter — og
              sjekker at alt stemmer før du sender inn.
            </p>
          </div>
        </Reveal>
        <div className="mt-16 grid gap-4 sm:grid-cols-3">
          {[
            {
              icon: <BookOpenIcon className="h-5 w-5" />,
              title: "Alt på ett sted",
              desc: "Resultatregnskap, balanse og noter samlet i ett dokument, klart for innsending.",
            },
            {
              icon: <ClipboardListIcon className="h-5 w-5" />,
              title: "Sjekkliste inkludert",
              desc: "Ciri sjekker 8 punkter automatisk — ingenting glemmes.",
            },
            {
              icon: <FileTextIcon className="h-5 w-5" />,
              title: "SAF-T klar",
              desc: "Eksporter SAF-T v1.30 for revisor eller Skatteetaten med ett klikk.",
            },
          ].map((card, i) => (
            <Reveal key={card.title} delay={i * 0.08} className="h-full">
              <div className="flex h-full flex-col rounded-2xl border border-[#d4dbd6] bg-[#f5f7f2] p-7 sm:p-8">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-[#3E715C]">
                  {card.icon}
                </div>
                <h3 className="mt-5 text-lg text-[#1a2e23]">{card.title}</h3>
                <p className="mt-2 flex-1 text-sm leading-relaxed text-[#4a5e52]">
                  {card.desc}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </SolidSection>

      {/* Animation 3: Completeness Checklist (Glass, 2-col) */}
      <GlassSection>
        <div className="grid items-center gap-16 lg:grid-cols-2">
          <Reveal>
            <div>
              <SectionLabel>
                <ClipboardListIcon className="h-3.5 w-3.5" />
                Sjekkliste
              </SectionLabel>
              <h2 className="mt-6 text-3xl font-normal tracking-tight text-[#1a2e23] sm:text-4xl">
                Ingenting{" "}
                <span className="text-[#3E715C]">glemmes</span>
              </h2>
              <p className="mt-5 max-w-md text-base leading-relaxed text-[#4a5e52]">
                Ciris sjekkliste sikrer at alle steg er utført før du sender inn
                årsregnskapet. Fra inntekter til noter — alt er dekket.
              </p>
              <BulletList
                items={[
                  "8-punkts fullstendighetskontroll",
                  "Automatisk flagging av mangler",
                  "Trygg innsending hver gang",
                ]}
              />
            </div>
          </Reveal>
          <Reveal delay={0.15}>
            <div className="min-h-[320px] sm:min-h-[380px]">
              <CompletenessChecklistAnimation />
            </div>
          </Reveal>
        </div>
      </GlassSection>

      {/* CTA */}
      <MarketingCTA
        title="Klar til å generere"
        titleAccent="årsregnskapet?"
        subtitle="Automatisk rapportgenerering på under ett minutt."
        ctaText="Generer ditt første årsregnskap"
      />
    </>
  );
}
