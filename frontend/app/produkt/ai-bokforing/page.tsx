"use client";
import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BrainCircuitIcon, ScanSearchIcon, CheckCircleIcon,
  FileTextIcon, ShieldCheckIcon, SparklesIcon
} from "lucide-react";
import {
  HeroSection, GlassSection, SolidSection, MarketingCTA,
  Reveal, SectionLabel, MARKETING_EASING,
  PageMetrics, FeatureGrid, BulletList, useMarketingViewport,
} from "@/lib/marketing-utils";

// ============================================================================
// CONSTANTS
// ============================================================================

const INVOICE_FIELDS = [
  { label: "Leverandor", value: "Kontorrekvisita AS", confidence: "98%" },
  { label: "Belop", value: "kr 4 250,00", confidence: "96%" },
  { label: "MVA", value: "kr 1 062,50", confidence: "99%" },
  { label: "Dato", value: "15.01.2026", confidence: "100%" },
];

const JOURNAL_ENTRIES = [
  { konto: "6300", name: "Kontorrekvisita", debet: "4 250,00", kredit: "" },
  { konto: "2711", name: "Inng. MVA, hoy sats", debet: "1 062,50", kredit: "" },
  { konto: "2400", name: "Leverandorgjeld", debet: "", kredit: "5 312,50" },
];

const TIMELINE_STEPS = ["Mottatt", "Lest", "Kategorisert", "Bokfort"];

// ============================================================================
// HELPER: Reduced motion check
// ============================================================================

function usePrefersReducedMotion() {
  const [prefersReduced, setPrefersReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReduced(mq.matches);
    const handler = (e: MediaQueryListEvent) => setPrefersReduced(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);
  return prefersReduced;
}

// ============================================================================
// ANIMATION 1: Document Scanner — Centered, shimmer effect
// ============================================================================

function DocumentScannerAnimation() {
  const prefersReduced = usePrefersReducedMotion();
  const [phase, setPhase] = useState<0 | 1 | 2 | 3>(0);
  const { ref: viewportRef, hasEntered: hasStarted } = useMarketingViewport();
  const timersRef = useRef<NodeJS.Timeout[]>([]);

  const clearTimers = () => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
  };

  const schedule = (fn: () => void, ms: number) => {
    const t = setTimeout(fn, ms);
    timersRef.current.push(t);
  };

  const runCycle = () => {
    clearTimers();
    setPhase(0);
    schedule(() => setPhase(1), 400);
    schedule(() => setPhase(2), 2200);
    schedule(() => setPhase(3), 4000);
    schedule(() => {
      setPhase(0);
      schedule(() => runCycle(), 600);
    }, 7000);
  };

  useEffect(() => {
    if (!hasStarted) return;
    if (prefersReduced) {
      setPhase(3);
      return;
    }
    runCycle();
    return () => clearTimers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasStarted, prefersReduced]);

  return (
    <div ref={viewportRef} className="flex flex-col items-center">
      {/* Centered document card */}
      <div className="relative mx-auto w-full max-w-xs">
        <div className="relative overflow-hidden rounded-2xl border border-white/15 bg-white/[0.08] p-6 backdrop-blur-xl">
          {/* Shimmer sweep (AI reading) */}
          <AnimatePresence>
            {phase === 1 && (
              <motion.div
                key="shimmer"
                initial={{ x: "-100%" }}
                animate={{ x: "300%" }}
                exit={{ opacity: 0 }}
                transition={{ duration: 1.8, ease: "easeInOut" }}
                className="pointer-events-none absolute inset-y-0 left-0 z-20 w-1/3"
                style={{
                  background:
                    "linear-gradient(90deg, transparent 0%, rgba(91,144,111,0.08) 30%, rgba(91,144,111,0.18) 50%, rgba(91,144,111,0.08) 70%, transparent 100%)",
                }}
              />
            )}
          </AnimatePresence>

          {/* Document header */}
          <div className="mb-5 flex items-center gap-2">
            <FileTextIcon className="h-4 w-4 text-[#3E715C]" />
            <span className="text-xs font-semibold tracking-wide text-[#3E715C] uppercase">
              Faktura
            </span>
            <AnimatePresence>
              {phase >= 1 && phase < 3 && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className="ml-auto flex items-center gap-1 rounded-full bg-[#3E715C]/10 px-2 py-0.5"
                >
                  <SparklesIcon className="h-2.5 w-2.5 text-[#3E715C]" />
                  <span className="text-[13px] font-medium text-[#3E715C]">AI leser</span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Invoice fields with inline confidence */}
          <div className="space-y-4">
            {INVOICE_FIELDS.map((field, i) => (
              <div key={field.label} className="space-y-1">
                <span className="text-[12px] font-medium tracking-wider text-[#8a9a8e] uppercase">
                  {field.label}
                </span>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-[#1a2e23]">
                    {field.value}
                  </span>
                  <AnimatePresence>
                    {phase >= 2 && (
                      <motion.span
                        initial={{ opacity: 0, scale: 0 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{
                          type: "spring",
                          stiffness: 500,
                          damping: 20,
                          delay: i * 0.1,
                        }}
                        className="flex items-center gap-1 rounded-full bg-[#3E715C]/10 px-2 py-0.5 text-[13px] font-bold text-[#3E715C]"
                      >
                        <CheckCircleIcon className="h-2.5 w-2.5" />
                        {field.confidence}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </div>
                <motion.div
                  className="h-px bg-[#d4dbd6]"
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: phase >= 1 ? 1 : 0 }}
                  transition={{ duration: 0.4, delay: i * 0.08 }}
                  style={{ transformOrigin: "left" }}
                />
              </div>
            ))}
          </div>

          {/* Bokfort stamp */}
          <AnimatePresence>
            {phase === 3 && (
              <motion.div
                initial={{ opacity: 0, scale: 0.5, rotate: -12 }}
                animate={{ opacity: 1, scale: 1, rotate: -6 }}
                exit={{ opacity: 0 }}
                transition={{ type: "spring", stiffness: 400, damping: 20 }}
                className="absolute top-4 right-4 z-30 rounded-lg border-2 border-[#3E715C] bg-[#3E715C]/10 px-3 py-1.5"
              >
                <span className="text-xs font-bold tracking-wider text-[#3E715C]">
                  Bokfort &#10003;
                </span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Status timeline below — centered */}
      <div className="mt-8 flex items-center justify-center gap-0">
        {TIMELINE_STEPS.map((step, i) => {
          const stepPhases = [0, 1, 2, 3];
          const isActive = phase >= stepPhases[i];
          const isPast = phase > stepPhases[i];
          return (
            <div key={step} className="flex items-center">
              <div className="flex flex-col items-center gap-1.5">
                <motion.div
                  initial={prefersReduced ? { scale: 1 } : { scale: 0 }}
                  animate={isActive ? { scale: 1 } : prefersReduced ? { scale: 1 } : { scale: 0 }}
                  transition={{ type: "spring", stiffness: 500, damping: 20 }}
                  className={`flex h-7 w-7 items-center justify-center rounded-full ${
                    isActive
                      ? "bg-[#3E715C] text-white"
                      : "border border-[#d4dbd6] bg-white text-[#8a9a8e]"
                  }`}
                >
                  {isActive ? (
                    <CheckCircleIcon className="h-3.5 w-3.5" />
                  ) : (
                    <span className="text-[12px] font-medium">{i + 1}</span>
                  )}
                </motion.div>
                <span className="text-[12px] font-medium text-[#4a5e52]">
                  {step}
                </span>
              </div>
              {i < TIMELINE_STEPS.length - 1 && (
                <div className="mx-1 h-px w-8 overflow-hidden sm:mx-2 sm:w-12 md:w-16">
                  <motion.div
                    initial={prefersReduced ? { scaleX: 1 } : { scaleX: 0 }}
                    animate={isPast ? { scaleX: 1 } : prefersReduced ? { scaleX: 1 } : { scaleX: 0 }}
                    transition={{ duration: 0.4, ease: MARKETING_EASING }}
                    className="h-full w-full bg-[#3E715C]"
                    style={{ transformOrigin: "left" }}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================================
// ANIMATION 2: Confidence Ring — Clean, no orbiting dots
// ============================================================================

function ConfidenceWheelAnimation() {
  const prefersReduced = usePrefersReducedMotion();
  const [mode, setMode] = useState<"first" | "trained">("first");
  const { ref: viewportRef, hasEntered: hasStarted } = useMarketingViewport();
  const [animatedPct, setAnimatedPct] = useState(0);
  const frameRef = useRef<number>(0);

  const targetPct = mode === "first" ? 82 : 98.5;

  useEffect(() => {
    if (!hasStarted) return;
    if (prefersReduced) {
      setAnimatedPct(targetPct);
      return;
    }

    const startVal = animatedPct;
    const diff = targetPct - startVal;
    const duration = 1200;
    const startTime = performance.now();

    const tick = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setAnimatedPct(startVal + diff * eased);
      if (progress < 1) {
        frameRef.current = requestAnimationFrame(tick);
      }
    };

    frameRef.current = requestAnimationFrame(tick);
    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasStarted, targetPct, prefersReduced]);

  useEffect(() => {
    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, []);

  const size = 200;
  const strokeWidth = 10;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (animatedPct / 100) * circumference;

  return (
    <div ref={viewportRef} className="flex flex-col items-center gap-8">
      {/* SVG Ring — clean, no orbiting dots */}
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="rotate-[-90deg]">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="#d4dbd6"
            strokeWidth={strokeWidth}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="#3E715C"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            style={{
              transition: prefersReduced
                ? "none"
                : "stroke-dashoffset 0.05s linear",
            }}
          />
        </svg>

        {/* Center text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-semibold tabular-nums text-[#1a2e23]">
            {animatedPct.toFixed(1)}%
          </span>
          <span className="text-[12px] font-medium tracking-wider text-[#8a9a8e] uppercase">
            Konfidenspoeng
          </span>
        </div>
      </div>

      {/* Toggle */}
      <div className="flex items-center gap-2 rounded-full border border-[#d4dbd6] bg-white/80 p-1">
        <button
          onClick={() => setMode("first")}
          className={`rounded-full px-4 py-2 text-xs font-medium transition-all ${
            mode === "first"
              ? "bg-[#3E715C] text-white shadow-sm"
              : "text-[#4a5e52] hover:bg-[#f5f7f2]"
          }`}
        >
          Forste gang
        </button>
        <button
          onClick={() => setMode("trained")}
          className={`rounded-full px-4 py-2 text-xs font-medium transition-all ${
            mode === "trained"
              ? "bg-[#3E715C] text-white shadow-sm"
              : "text-[#4a5e52] hover:bg-[#f5f7f2]"
          }`}
        >
          Etter 3 maneder
        </button>
      </div>

      {/* Improvement indicator */}
      <AnimatePresence mode="wait">
        <motion.div
          key={mode}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.3 }}
          className="text-center"
        >
          <p className="text-sm text-[#4a5e52]">
            {mode === "first"
              ? "Noyaktighet fra forste bilag — ingen opplaring nodvendig"
              : "Ciri laerer av dine korrigeringer og forbedres kontinuerlig"}
          </p>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

// ============================================================================
// ANIMATION 3: Journal Entry Waterfall
// ============================================================================

function JournalWaterfallAnimation() {
  const prefersReduced = usePrefersReducedMotion();
  const [phase, setPhase] = useState<0 | 1 | 2>(0);
  const { ref: viewportRef, hasEntered: hasStarted } = useMarketingViewport();
  const [visibleRows, setVisibleRows] = useState(0);
  const [timelineStep, setTimelineStep] = useState(-1);
  const timersRef = useRef<NodeJS.Timeout[]>([]);

  const clearTimers = () => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
  };

  const schedule = (fn: () => void, ms: number) => {
    const t = setTimeout(fn, ms);
    timersRef.current.push(t);
  };

  const runCycle = () => {
    clearTimers();
    setPhase(0);
    setVisibleRows(0);
    setTimelineStep(-1);

    schedule(() => {
      setPhase(1);
      setVisibleRows(1);
    }, 300);
    schedule(() => setVisibleRows(2), 600);
    schedule(() => setVisibleRows(3), 900);

    schedule(() => {
      setPhase(2);
      setTimelineStep(0);
    }, 1600);
    schedule(() => setTimelineStep(1), 2100);
    schedule(() => setTimelineStep(2), 2600);
    schedule(() => setTimelineStep(3), 3100);

    schedule(() => {
      setPhase(0);
      setVisibleRows(0);
      setTimelineStep(-1);
      schedule(() => runCycle(), 600);
    }, 7000);
  };

  useEffect(() => {
    if (!hasStarted) return;
    if (prefersReduced) {
      setPhase(2);
      setVisibleRows(JOURNAL_ENTRIES.length);
      setTimelineStep(TIMELINE_STEPS.length - 1);
      return;
    }
    runCycle();
    return () => clearTimers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasStarted, prefersReduced]);

  return (
    <div ref={viewportRef} className="flex flex-col gap-8">
      {/* Journal Table */}
      <div className="overflow-hidden rounded-2xl border border-white/15 bg-white/[0.08] backdrop-blur-xl">
        <div className="grid grid-cols-4 gap-2 border-b border-[#d4dbd6]/30 px-5 py-3">
          <span className="text-[12px] font-bold tracking-wider text-[#8a9a8e] uppercase">Konto</span>
          <span className="text-[12px] font-bold tracking-wider text-[#8a9a8e] uppercase">Navn</span>
          <span className="text-right text-[12px] font-bold tracking-wider text-[#8a9a8e] uppercase">Debet</span>
          <span className="text-right text-[12px] font-bold tracking-wider text-[#8a9a8e] uppercase">Kredit</span>
        </div>
        <div className="divide-y divide-[#d4dbd6]/20">
          {JOURNAL_ENTRIES.map((entry, i) => (
            <motion.div
              key={entry.konto}
              initial={prefersReduced ? { opacity: 1, y: 0 } : { opacity: 0, y: -40 }}
              animate={
                i < visibleRows
                  ? { opacity: 1, y: 0 }
                  : prefersReduced
                    ? { opacity: 1, y: 0 }
                    : { opacity: 0, y: -40 }
              }
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              className="grid grid-cols-4 gap-2 px-5 py-3"
            >
              <span className="rounded-md bg-[#3E715C]/10 px-2 py-0.5 text-center text-xs font-semibold text-[#3E715C]">
                {entry.konto}
              </span>
              <span className="text-sm text-[#1a2e23]">{entry.name}</span>
              <span className="text-right text-sm font-medium text-[#1a2e23]">{entry.debet}</span>
              <span className="text-right text-sm font-medium text-[#1a2e23]">{entry.kredit}</span>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Timeline */}
      <div className="flex items-center justify-between px-2">
        {["Mottatt", "Lest", "Kategorisert", "Bokfort"].map((step, i) => (
          <div key={step} className="flex items-center">
            <div className="flex flex-col items-center gap-1.5">
              <motion.div
                initial={prefersReduced ? { scale: 1 } : { scale: 0 }}
                animate={
                  i <= timelineStep
                    ? { scale: 1 }
                    : prefersReduced
                      ? { scale: 1 }
                      : { scale: 0 }
                }
                transition={{ type: "spring", stiffness: 500, damping: 20 }}
                className={`flex h-7 w-7 items-center justify-center rounded-full ${
                  i <= timelineStep
                    ? "bg-[#3E715C] text-white"
                    : "border border-[#d4dbd6] bg-white text-[#8a9a8e]"
                }`}
              >
                {i <= timelineStep ? (
                  <CheckCircleIcon className="h-3.5 w-3.5" />
                ) : (
                  <span className="text-[12px] font-medium">{i + 1}</span>
                )}
              </motion.div>
              <span className="text-[12px] font-medium text-[#4a5e52]">{step}</span>
            </div>
            {i < 3 && (
              <div className="mx-1 h-px w-8 overflow-hidden sm:mx-2 sm:w-12 md:w-16">
                <motion.div
                  initial={prefersReduced ? { scaleX: 1 } : { scaleX: 0 }}
                  animate={
                    i < timelineStep
                      ? { scaleX: 1 }
                      : prefersReduced
                        ? { scaleX: 1 }
                        : { scaleX: 0 }
                  }
                  transition={{ duration: 0.4, ease: MARKETING_EASING }}
                  className="h-full w-full bg-[#3E715C]"
                  style={{ transformOrigin: "left" }}
                />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// TEXT SECTION HELPER
// ============================================================================

function FeatureText({
  heading,
  description,
  bullets,
}: {
  heading: string;
  description: string;
  bullets: string[];
}) {
  return (
    <Reveal>
      <div className="max-w-lg">
        <h3 className="text-2xl font-normal tracking-tight text-[#1a2e23] sm:text-3xl">
          {heading}
        </h3>
        <p className="mt-4 leading-relaxed text-[#4a5e52]">{description}</p>
        <ul className="mt-6 space-y-3">
          {bullets.map((b) => (
            <li key={b} className="flex items-start gap-3">
              <CheckCircleIcon className="mt-0.5 h-4 w-4 flex-shrink-0 text-[#3E715C]" />
              <span className="text-sm text-[#4a5e52]">{b}</span>
            </li>
          ))}
        </ul>
      </div>
    </Reveal>
  );
}

// ============================================================================
// MAIN PAGE — with text breathing sections
// ============================================================================

export default function AIBokforingPage() {
  return (
    <>
      {/* Hero */}
      <HeroSection
        backgroundImage="/ciribackground1.jpg"
        title="Bilag inn. Bokforing ut."
        subtitle="Claude AI leser, kategoriserer og bokforer bilagene dine — slik at du slipper."
        ctaText="Prov AI-bokforing gratis"
        ctaHref="/register"
      />

      {/* Metrics */}
      <PageMetrics
        stats={[
          { value: "98.5%", label: "Treffsikkerhet" },
          { value: "5 sek", label: "Behandlingstid per bilag" },
          { value: "24/7", label: "Automatisk bokforing" },
          { value: "100%", label: "Sporbarhet" },
        ]}
      />

      {/* Animation 1: Document Scanner (Glass, centered) */}
      <GlassSection>
        <Reveal>
          <div className="text-center">
            <SectionLabel>
              <ScanSearchIcon className="h-3.5 w-3.5" />
              Automatisk dokumentlesing
            </SectionLabel>
            <h2 className="mt-6 text-4xl font-normal tracking-tight text-[#1a2e23] sm:text-5xl">
              AI-drevet <span className="text-[#3E715C]">dokumentlesing</span>
            </h2>
            <p className="mx-auto mt-5 max-w-lg text-base leading-relaxed text-[#4a5e52]">
              Ciri bruker Claude Vision til a lese alle typer fakturaer — PDF,
              bilde og skannet dokument. Flerspraklig og flervaluta.
            </p>
          </div>
        </Reveal>
        <Reveal delay={0.15}>
          <div className="mt-12">
            <DocumentScannerAnimation />
          </div>
        </Reveal>
        <Reveal delay={0.25}>
          <ul className="mx-auto mt-10 flex max-w-2xl flex-col gap-3 sm:flex-row sm:gap-8">
            {[
              "PDF, JPG, PNG og skannet dokument",
              "Automatisk valutakonvertering til NOK",
              "Flerspraklig — norsk, engelsk, svensk, dansk",
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

      {/* Text breathing: Feature Grid */}
      <FeatureGrid
        label="Kjernefunksjoner"
        labelIcon={<BrainCircuitIcon className="h-3.5 w-3.5" />}
        heading="Alt du trenger for"
        headingAccent="smartere bokforing"
        description="Fra bilag til regnskap — Ciri automatiserer hele flyten med AI."
        features={[
          {
            icon: <ScanSearchIcon className="h-5 w-5" />,
            title: "Flerformat OCR",
            desc: "PDF, JPG, PNG og skannede dokumenter leses automatisk med Claude Vision AI.",
          },
          {
            icon: <FileTextIcon className="h-5 w-5" />,
            title: "Automatisk kontering",
            desc: "Ciri velger riktig konto basert pa bilagstype, leverandor og historikk.",
          },
          {
            icon: <ShieldCheckIcon className="h-5 w-5" />,
            title: "Revisjonsspor",
            desc: "SHA-256-signatur og komplett sporbarhet fra mottak til bokforing. 5 ars lagring.",
          },
        ]}
      />

      {/* Animation 2: Confidence Ring (Solid Cream, 2-col) */}
      <SolidSection variant="cream">
        <div className="grid items-center gap-16 lg:grid-cols-2">
          <Reveal delay={0.15} className="order-2 lg:order-1">
            <div className="min-h-[400px] sm:min-h-[440px]">
              <ConfidenceWheelAnimation />
            </div>
          </Reveal>
          <Reveal className="order-1 lg:order-2">
            <FeatureText
              heading="Revisjonsspor og etterlevelse"
              description="Hvert bilag far et komplett revisjonsspor med SHA-256 signatur. Ciri lagrer alt i 5 ar i henhold til Bokforingsloven."
              bullets={[
                "SHA-256 signatur pa hvert bilag",
                "5 ars oppbevaringsplikt oppfylt",
                "Full sporbarhet fra mottak til bokforing",
              ]}
            />
          </Reveal>
        </div>
      </SolidSection>

      {/* Text breathing section */}
      <SolidSection>
        <Reveal>
          <div className="mx-auto max-w-2xl text-center">
            <SectionLabel>
              <BrainCircuitIcon className="h-3.5 w-3.5" />
              Kontinuerlig forbedring
            </SectionLabel>
            <h2 className="mt-6 text-3xl font-normal tracking-tight text-[#1a2e23] sm:text-4xl">
              Jo mer du bruker Ciri, jo{" "}
              <span className="text-[#3E715C]">smartere blir den</span>
            </h2>
            <p className="mx-auto mt-5 max-w-lg text-base leading-relaxed text-[#4a5e52]">
              Ciri laerer fra dine korrigeringer og bygger en dyp forstaelse
              av kontoplanen din. Etter noen fa bilag forstar den monstrene
              og kategoriserer automatisk med hoy presisjon.
            </p>
          </div>
        </Reveal>
        <Reveal delay={0.1}>
          <ul className="mx-auto mt-8 flex max-w-lg flex-col gap-3">
            {[
              "Laerer fra dine manuelle korrigeringer",
              "Bygger leverandorprofiler over tid",
              "Forstar kontoplanen din etter 3 maneder",
              "Automatisk debet/kredit-fordeling basert pa historikk",
            ].map((item) => (
              <li key={item} className="flex items-start gap-3">
                <CheckCircleIcon className="mt-0.5 h-4 w-4 shrink-0 text-[#5B906F]" />
                <span className="text-sm text-[#4a5e52]">{item}</span>
              </li>
            ))}
          </ul>
        </Reveal>
      </SolidSection>

      {/* Animation 3: Journal Waterfall (Glass, 2-col) */}
      <GlassSection>
        <div className="grid items-center gap-16 lg:grid-cols-2">
          <Reveal className="order-1">
            <FeatureText
              heading="Intelligent kategorisering"
              description="Ciri laerer av dine valg og blir smartere over tid. Etter noen fa bilag forstar den kontoplanen din."
              bullets={[
                "Laerer fra dine korrigeringer",
                "Stotter NS 4102 kontoplan",
                "Automatisk debet/kredit-fordeling",
              ]}
            />
          </Reveal>
          <Reveal delay={0.15} className="order-2">
            <div className="min-h-[320px] sm:min-h-[360px]">
              <JournalWaterfallAnimation />
            </div>
          </Reveal>
        </div>
      </GlassSection>

      {/* CTA */}
      <MarketingCTA
        title="Klar til a automatisere"
        titleAccent="bokforingen?"
        subtitle="Bli med hundrevis av norske bedrifter som lar AI gjore jobben."
        ctaText="Prov AI-bokforing gratis"
      />
    </>
  );
}
