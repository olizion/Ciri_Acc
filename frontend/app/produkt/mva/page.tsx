"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CalculatorIcon,
  FileTextIcon,
  CalendarIcon,
  CheckCircleIcon,
  SendIcon,
  ClipboardCheckIcon,
  FolderOpenIcon,
  ShieldCheckIcon,
  BellIcon,
  CoffeeIcon,
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
// ANIMATION 1: MVA AUTOPILOT — termin flow showing automatic melding
// ============================================================================

const AUTOPILOT_STEPS = [
  {
    icon: FolderOpenIcon,
    idle: "Samle bilag",
    done: "23 bilag funnet",
  },
  {
    icon: CalculatorIcon,
    idle: "Beregne MVA",
    done: "kr 47 650 å betale",
  },
  {
    icon: ClipboardCheckIcon,
    idle: "Fylle ut RF-0002",
    done: "Skjema validert",
  },
  {
    icon: SendIcon,
    idle: "Sende til Altinn",
    done: "Levert og bekreftet",
  },
] as const;

function MVAAutopilotAnimation() {
  const { ref: viewportRef, hasEntered } = useMarketingViewport();
  const [activeStep, setActiveStep] = useState(-1);
  const [spinningStep, setSpinningStep] = useState(-1);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [terminIndex, setTerminIndex] = useState(0);
  const [allDone, setAllDone] = useState(false);
  const timersRef = useRef<NodeJS.Timeout[]>([]);

  const terminer = [
    { label: "5. termin", months: "Sep–Okt 2025" },
    { label: "6. termin", months: "Nov–Des 2025" },
    { label: "1. termin", months: "Jan–Feb 2026" },
  ];

  const clearTimers = () => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
  };

  const schedule = (fn: () => void, ms: number) => {
    timersRef.current.push(setTimeout(fn, ms));
  };

  useEffect(() => {
    if (!hasEntered) return;

    const runTermin = (tIdx: number) => {
      clearTimers();
      setActiveStep(-1);
      setSpinningStep(-1);
      setCompletedSteps([]);
      setAllDone(false);
      setTerminIndex(tIdx);

      AUTOPILOT_STEPS.forEach((_, i) => {
        const spinStart = 600 + i * 1100;
        const completeTime = spinStart + 700;

        schedule(() => {
          setActiveStep(i);
          setSpinningStep(i);
        }, spinStart);

        schedule(() => {
          setSpinningStep(-1);
          setCompletedSteps((prev) => [...prev, i]);
        }, completeTime);
      });

      const totalTime = 600 + AUTOPILOT_STEPS.length * 1100 + 400;

      schedule(() => setAllDone(true), totalTime);

      // Move to next termin or restart
      const nextIdx = (tIdx + 1) % terminer.length;
      schedule(() => runTermin(nextIdx), totalTime + 3000);
    };

    runTermin(0);
    return () => clearTimers();
  }, [hasEntered]);

  const currentTermin = terminer[terminIndex];

  return (
    <div ref={viewportRef} className="relative mx-auto max-w-md">
      <div className="relative overflow-hidden rounded-2xl border border-white/15 bg-white/[0.08] p-6 shadow-2xl backdrop-blur-3xl">
        <div className="pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-br from-white/30 via-transparent to-transparent" />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/60 to-transparent" />

        <div className="relative z-10">
          {/* Termin header */}
          <AnimatePresence mode="wait">
            <motion.div
              key={terminIndex}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              transition={{ duration: 0.4 }}
              className="mb-6 flex items-center justify-between border-b border-white/10 pb-4"
            >
              <div>
                <p className="text-sm font-medium text-[#1a2e23]">
                  {currentTermin.label}
                </p>
                <p className="text-[12px] text-[#8a9a8e]">
                  {currentTermin.months}
                </p>
              </div>
              <div
                className={cn(
                  "rounded-full px-3 py-1 text-[12px] font-semibold transition-colors",
                  allDone
                    ? "bg-[#3E715C]/15 text-[#3E715C]"
                    : "bg-[#f5f7f2] text-[#8a9a8e]"
                )}
              >
                {allDone ? "Levert ✓" : "Behandler..."}
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Step timeline */}
          <div className="space-y-1.5">
            {AUTOPILOT_STEPS.map((step, i) => {
              const isActive = activeStep >= i;
              const isCompleted = completedSteps.includes(i);
              const isSpinning = spinningStep === i;
              const Icon = step.icon;

              return (
                <motion.div
                  key={step.idle}
                  initial={{ opacity: 0.4 }}
                  animate={{
                    opacity: isActive ? 1 : 0.4,
                    backgroundColor: isCompleted
                      ? "rgba(62, 113, 92, 0.06)"
                      : "rgba(245, 247, 242, 0.3)",
                  }}
                  transition={{ duration: 0.3 }}
                  className="flex items-center gap-3 rounded-xl border border-white/10 px-4 py-3"
                >
                  {/* Status indicator */}
                  <div className="relative flex h-8 w-8 shrink-0 items-center justify-center">
                    {isSpinning ? (
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{
                          duration: 0.6,
                          repeat: Infinity,
                          ease: "linear",
                        }}
                        className="h-5 w-5 rounded-full border-2 border-[#3E715C]/20 border-t-[#3E715C]"
                      />
                    ) : isCompleted ? (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{
                          type: "spring",
                          stiffness: 400,
                          damping: 15,
                        }}
                        className="flex h-6 w-6 items-center justify-center rounded-full bg-[#3E715C]"
                      >
                        <CheckCircleIcon className="h-3.5 w-3.5 text-white" />
                      </motion.div>
                    ) : (
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#f0f2ed]">
                        <Icon className="h-3 w-3 text-[#8a9a8e]" />
                      </div>
                    )}
                  </div>

                  {/* Label */}
                  <div className="min-w-0 flex-1">
                    <AnimatePresence mode="wait">
                      {isCompleted ? (
                        <motion.p
                          key="done"
                          initial={{ opacity: 0, x: 8 }}
                          animate={{ opacity: 1, x: 0 }}
                          className="text-xs font-medium text-[#3E715C]"
                        >
                          {step.done}
                        </motion.p>
                      ) : (
                        <motion.p
                          key="idle"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className={cn(
                            "text-xs",
                            isSpinning
                              ? "font-medium text-[#1a2e23]"
                              : "text-[#8a9a8e]"
                          )}
                        >
                          {step.idle}
                          {isSpinning && "..."}
                        </motion.p>
                      )}
                    </AnimatePresence>
                  </div>

                </motion.div>
              );
            })}
          </div>

          {/* "Du trenger ikke gjøre noe" badge */}
          <AnimatePresence>
            {allDone && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="mt-5 flex items-center justify-center gap-2 rounded-xl bg-[#3E715C]/8 px-4 py-3"
              >
                <CoffeeIcon className="h-4 w-4 text-[#3E715C]" />
                <span className="text-xs font-medium text-[#3E715C]">
                  Du trenger ikke gjøre noe — Ciri ordner alt
                </span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// ANIMATION 2: RF-0002 FORM FILLER
// ============================================================================

const FORM_FIELDS = [
  { label: "Post 1: Innenlands omsetning", value: "kr 245 000" },
  { label: "Post 4: MVA 25%", value: "kr 61 250" },
  { label: "Post 6: MVA 15%", value: "kr 4 800" },
  { label: "Post 11: Inngående MVA", value: "kr 18 400" },
  { label: "Post 14: Fradragsberettiget", value: "kr 18 400" },
  { label: "Å betale", value: "kr 47 650", highlight: true },
] as const;

function FormFillerAnimation() {
  const { ref: viewportRef, hasEntered } = useMarketingViewport();
  const [filledFields, setFilledFields] = useState<number[]>([]);
  const [spinningField, setSpinningField] = useState<number | null>(null);
  const [showButton, setShowButton] = useState(false);
  const [buttonGlow, setButtonGlow] = useState(false);
  const [showCheckmark, setShowCheckmark] = useState(false);
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
      setFilledFields([]);
      setSpinningField(null);
      setShowButton(false);
      setButtonGlow(false);
      setShowCheckmark(false);

      FORM_FIELDS.forEach((_, i) => {
        const spinStart = 400 + i * 800;
        const fillTime = spinStart + 500;

        schedule(() => setSpinningField(i), spinStart);
        schedule(() => {
          setSpinningField(null);
          setFilledFields((prev) => [...prev, i]);
        }, fillTime);
      });

      const allFilledTime = 400 + FORM_FIELDS.length * 800 + 300;

      schedule(() => setShowButton(true), allFilledTime);
      schedule(() => setButtonGlow(true), allFilledTime + 600);
      schedule(() => {
        setButtonGlow(false);
        setShowCheckmark(true);
      }, allFilledTime + 1400);
      schedule(() => runCycle(), allFilledTime + 4000);
    };

    runCycle();
    return () => clearTimers();
  }, [hasEntered]);

  return (
    <div ref={viewportRef} className="mx-auto max-w-md">
      <div className="overflow-hidden rounded-2xl border border-[#d4dbd6] bg-white p-6 shadow-sm">
        {/* Form header */}
        <div className="mb-5 flex items-center gap-3 border-b border-[#d4dbd6]/50 pb-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#3E715C]/10">
            <ClipboardCheckIcon className="h-4 w-4 text-[#3E715C]" />
          </div>
          <div>
            <p className="text-sm font-medium text-[#1a2e23]">
              RF-0002 MVA-melding
            </p>
            <p className="text-[12px] text-[#8a9a8e]">Termin 1 / 2026</p>
          </div>
        </div>

        {/* Form fields */}
        <div className="space-y-2">
          {FORM_FIELDS.map((field, i) => {
            const isFilled = filledFields.includes(i);
            const isSpinning = spinningField === i;
            const isHighlight = "highlight" in field && field.highlight;

            return (
              <motion.div
                key={field.label}
                animate={
                  isFilled
                    ? {
                        backgroundColor: isHighlight
                          ? "rgba(91, 144, 111, 0.08)"
                          : "rgba(245, 247, 242, 0.8)",
                        borderColor: isHighlight
                          ? "rgba(62, 113, 92, 0.3)"
                          : "rgba(212, 219, 214, 0.5)",
                      }
                    : {
                        backgroundColor: "rgba(245, 247, 242, 0.4)",
                        borderColor: "rgba(212, 219, 214, 0.3)",
                      }
                }
                transition={{ duration: 0.3 }}
                className="flex items-center justify-between rounded-xl border px-4 py-2.5"
              >
                <span
                  className={cn(
                    "text-xs",
                    isFilled && isHighlight
                      ? "font-semibold text-[#3E715C]"
                      : "text-[#4a5e52]"
                  )}
                >
                  {field.label}
                </span>
                <div className="flex items-center gap-2">
                  {isSpinning && (
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{
                        duration: 0.5,
                        repeat: Infinity,
                        ease: "linear",
                      }}
                      className="h-3.5 w-3.5 rounded-full border-2 border-[#3E715C]/20 border-t-[#3E715C]"
                    />
                  )}
                  <motion.span
                    initial={{ opacity: 0, x: 10 }}
                    animate={
                      isFilled
                        ? { opacity: 1, x: 0 }
                        : { opacity: 0, x: 10 }
                    }
                    transition={{ duration: 0.3 }}
                    className={cn(
                      "text-xs font-medium tabular-nums",
                      isHighlight ? "text-[#3E715C]" : "text-[#1a2e23]"
                    )}
                  >
                    {field.value}
                  </motion.span>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Send button + checkmark */}
        <div className="mt-5 flex min-h-[42px] items-center justify-center overflow-hidden">
          <AnimatePresence mode="wait">
            {showCheckmark ? (
              <motion.div
                key="check"
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ type: "spring", stiffness: 300, damping: 15 }}
                className="flex items-center gap-2 rounded-full bg-[#3E715C]/10 px-5 py-2.5"
              >
                <CheckCircleIcon className="h-4 w-4 text-[#3E715C]" />
                <span className="text-sm font-medium text-[#3E715C]">
                  Sendt til Altinn
                </span>
              </motion.div>
            ) : showButton ? (
              <motion.button
                key="btn"
                initial={{ opacity: 0, y: 10 }}
                animate={{
                  opacity: 1,
                  y: 0,
                  boxShadow: buttonGlow
                    ? "0 0 24px rgba(62, 113, 92, 0.4), 0 0 48px rgba(62, 113, 92, 0.2)"
                    : "0 0 0px transparent",
                }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.4 }}
                className="flex items-center gap-2 rounded-full bg-[#3E715C] px-5 py-2.5 text-sm font-medium text-white"
              >
                <SendIcon className="h-3.5 w-3.5" />
                Send til Altinn
              </motion.button>
            ) : (
              <div key="spacer" className="h-[42px]" />
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// ANIMATION 3: TAX CALENDAR WHEEL
// ============================================================================

const TERMS = [
  { label: "1. termin", shortLabel: "1", months: "Jan-Feb", color: "#2d5e4a" },
  { label: "2. termin", shortLabel: "2", months: "Mar-Apr", color: "#3E715C" },
  { label: "3. termin", shortLabel: "3", months: "Mai-Jun", color: "#4a8068" },
  { label: "4. termin", shortLabel: "4", months: "Jul-Aug", color: "#5B906F" },
  { label: "5. termin", shortLabel: "5", months: "Sep-Okt", color: "#6aaa88" },
  { label: "6. termin", shortLabel: "6", months: "Nov-Des", color: "#8BB5A2" },
];

function getCurrentTermIndex(): number {
  const month = new Date().getMonth();
  return Math.floor(month / 2);
}

function TaxCalendarAnimation() {
  const { ref: viewportRef, hasEntered } = useMarketingViewport();
  const [countdown, setCountdown] = useState(42);
  const countdownRef = useRef<NodeJS.Timeout | null>(null);

  const currentTerm = getCurrentTermIndex();

  const termsWithStatus = TERMS.map((term, i) => ({
    ...term,
    past: i < currentTerm,
    current: i === currentTerm,
  }));

  useEffect(() => {
    if (!hasEntered) return;

    countdownRef.current = setInterval(() => {
      setCountdown((prev) => (prev <= 1 ? 42 : prev - 1));
    }, 3000);

    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, [hasEntered]);

  const size = 260;
  const center = size / 2;
  const outerRadius = 110;
  const innerRadius = 60;

  function describeArc(
    cx: number,
    cy: number,
    outerR: number,
    innerR: number,
    startAngle: number,
    endAngle: number
  ): string {
    const startRad = ((startAngle - 90) * Math.PI) / 180;
    const endRad = ((endAngle - 90) * Math.PI) / 180;

    const outerStart = {
      x: cx + outerR * Math.cos(startRad),
      y: cy + outerR * Math.sin(startRad),
    };
    const outerEnd = {
      x: cx + outerR * Math.cos(endRad),
      y: cy + outerR * Math.sin(endRad),
    };
    const innerStart = {
      x: cx + innerR * Math.cos(endRad),
      y: cy + innerR * Math.sin(endRad),
    };
    const innerEnd = {
      x: cx + innerR * Math.cos(startRad),
      y: cy + innerR * Math.sin(startRad),
    };

    const largeArc = endAngle - startAngle > 180 ? 1 : 0;

    return [
      `M ${outerStart.x} ${outerStart.y}`,
      `A ${outerR} ${outerR} 0 ${largeArc} 1 ${outerEnd.x} ${outerEnd.y}`,
      `L ${innerStart.x} ${innerStart.y}`,
      `A ${innerR} ${innerR} 0 ${largeArc} 0 ${innerEnd.x} ${innerEnd.y}`,
      "Z",
    ].join(" ");
  }

  function getLabelPosition(index: number) {
    const midAngle = index * 60 + 30;
    const midRad = ((midAngle - 90) * Math.PI) / 180;
    const labelRadius = (outerRadius + innerRadius) / 2;
    return {
      x: center + labelRadius * Math.cos(midRad),
      y: center + labelRadius * Math.sin(midRad),
    };
  }

  function getCheckPosition(index: number) {
    const midAngle = index * 60 + 30;
    const midRad = ((midAngle - 90) * Math.PI) / 180;
    const checkRadius = outerRadius + 16;
    return {
      x: center + checkRadius * Math.cos(midRad),
      y: center + checkRadius * Math.sin(midRad),
    };
  }

  return (
    <div ref={viewportRef} className="relative mx-auto max-w-sm">
      <div className="relative overflow-hidden rounded-2xl border border-white/15 bg-white/[0.08] p-8 shadow-2xl backdrop-blur-3xl">
        <div className="pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-br from-white/30 via-transparent to-transparent" />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/60 to-transparent" />

        <div className="relative z-10 flex flex-col items-center">
          <motion.div
            initial={{ rotate: -15, opacity: 0 }}
            animate={hasEntered ? { rotate: 0, opacity: 1 } : {}}
            transition={{ duration: 1.2, ease: MARKETING_EASING }}
          >
            <svg
              width={size}
              height={size}
              viewBox={`0 0 ${size} ${size}`}
              className="overflow-visible"
            >
              {termsWithStatus.map((term, i) => {
                const startAngle = i * 60;
                const endAngle = (i + 1) * 60;
                const gap = 2;

                return (
                  <g key={term.label}>
                    <motion.path
                      d={describeArc(
                        center,
                        center,
                        outerRadius,
                        innerRadius,
                        startAngle + gap / 2,
                        endAngle - gap / 2
                      )}
                      fill={term.color}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={
                        hasEntered
                          ? { opacity: term.current ? 1 : 0.7, scale: 1 }
                          : {}
                      }
                      transition={{
                        delay: 0.2 + i * 0.1,
                        duration: 0.5,
                        ease: MARKETING_EASING,
                      }}
                      className={term.current ? "drop-shadow-lg" : ""}
                    />

                    {term.current && hasEntered && (
                      <motion.path
                        d={describeArc(
                          center,
                          center,
                          outerRadius + 4,
                          innerRadius - 4,
                          startAngle + gap / 2,
                          endAngle - gap / 2
                        )}
                        fill="none"
                        stroke={term.color}
                        strokeWidth={2}
                        initial={{ opacity: 0 }}
                        animate={{
                          opacity: [0, 0.5, 0],
                          scale: [1, 1.04, 1],
                        }}
                        transition={{
                          duration: 2,
                          repeat: Infinity,
                          ease: "easeInOut",
                        }}
                      />
                    )}

                    {(() => {
                      const pos = getLabelPosition(i);
                      return (
                        <motion.text
                          x={pos.x}
                          y={pos.y}
                          textAnchor="middle"
                          dominantBaseline="central"
                          className="pointer-events-none select-none text-[13px] font-bold fill-white"
                          initial={{ opacity: 0 }}
                          animate={hasEntered ? { opacity: 1 } : {}}
                          transition={{ delay: 0.5 + i * 0.1 }}
                        >
                          {term.shortLabel}
                        </motion.text>
                      );
                    })()}

                    {term.past &&
                      hasEntered &&
                      (() => {
                        const pos = getCheckPosition(i);
                        return (
                          <motion.g
                            key={`check-${i}`}
                            initial={{ opacity: 0, scale: 0 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{
                              delay: 0.8 + i * 0.15,
                              type: "spring",
                              stiffness: 300,
                              damping: 15,
                            }}
                          >
                            <circle
                              cx={pos.x}
                              cy={pos.y}
                              r={8}
                              fill="#3E715C"
                              opacity={0.15}
                            />
                            <path
                              d={`M ${pos.x - 3} ${pos.y} L ${pos.x - 0.5} ${pos.y + 2.5} L ${pos.x + 3.5} ${pos.y - 2}`}
                              fill="none"
                              stroke="#3E715C"
                              strokeWidth={1.5}
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </motion.g>
                        );
                      })()}
                  </g>
                );
              })}

              <circle
                cx={center}
                cy={center}
                r={innerRadius - 6}
                fill="white"
                opacity={0.9}
              />
            </svg>

            {/* Center countdown */}
            <div
              className="absolute flex flex-col items-center justify-center"
              style={{
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%)",
                width: innerRadius * 2 - 24,
                height: innerRadius * 2 - 24,
              }}
            >
              <span className="text-[12px] text-[#8a9a8e]">Neste frist</span>
              <motion.span
                key={countdown}
                initial={{ scale: 1.15 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 400, damping: 20 }}
                className="text-2xl font-normal tabular-nums text-[#1a2e23]"
              >
                {countdown}
              </motion.span>
              <span className="text-[12px] text-[#8a9a8e]">dager</span>
            </div>
          </motion.div>

          {/* Term labels */}
          <div className="mt-6 grid grid-cols-3 gap-x-4 gap-y-2">
            {termsWithStatus.map((term, i) => (
              <motion.div
                key={term.label}
                initial={{ opacity: 0, y: 8 }}
                animate={hasEntered ? { opacity: 1, y: 0 } : {}}
                transition={{ delay: 0.6 + i * 0.08 }}
                className={cn(
                  "flex items-center gap-1.5 rounded-md px-2 py-1",
                  term.current && "bg-[#3E715C]/8"
                )}
              >
                <div
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{ backgroundColor: term.color }}
                />
                <div className="min-w-0">
                  <p
                    className={cn(
                      "truncate text-[13px] font-medium",
                      term.current ? "text-[#3E715C]" : "text-[#4a5e52]"
                    )}
                  >
                    {term.label}
                  </p>
                  <p className="text-[8px] text-[#8a9a8e]">{term.months}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// PAGE
// ============================================================================

export default function MVAPage() {
  return (
    <>
      {/* Hero */}
      <HeroSection
        backgroundImage="/ciribackground4.jpg"
        title="MVA på autopilot."
        subtitle="Aldri bekymre deg for MVA igjen. Ciri beregner, fyller ut og sender inn — hver eneste termin."
        ctaText="Start MVA-håndtering"
        ctaHref="/register"
      />

      {/* Metrics */}
      <PageMetrics
        stats={[
          { value: "6 terminer", label: "Automatisk hvert år" },
          { value: "RF-0002", label: "Klar for Altinn" },
          { value: "SAF-T", label: "Sertifisert eksport" },
          { value: "0 min", label: "Manuelt arbeid" },
        ]}
      />

      {/* Animation 1: MVA Autopilot (Glass, centered) */}
      <GlassSection>
        <Reveal>
          <div className="text-center">
            <SectionLabel>
              <ShieldCheckIcon className="h-3.5 w-3.5" />
              Automatisk MVA-melding
            </SectionLabel>
            <h2 className="mt-6 text-4xl font-normal tracking-tight text-[#1a2e23] sm:text-5xl">
              Hver termin,{" "}
              <span className="text-[#3E715C]">automatisk levert</span>
            </h2>
            <p className="mx-auto mt-5 max-w-lg text-base leading-relaxed text-[#4a5e52]">
              Ciri samler bilag, beregner MVA, fyller ut skjemaet og sender til
              Altinn — uten at du løfter en finger. Seks ganger i året, helt
              automatisk.
            </p>
          </div>
        </Reveal>
        <Reveal delay={0.15}>
          <div className="mt-12">
            <MVAAutopilotAnimation />
          </div>
        </Reveal>
        <Reveal delay={0.25}>
          <ul className="mx-auto mt-10 flex max-w-2xl flex-col gap-3 sm:flex-row sm:gap-8">
            {[
              "Automatisk bilaginnsamling",
              "RF-0002 utfylt og validert",
              "Sendt til Altinn uten manuelt arbeid",
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
        label="MVA-funksjoner"
        labelIcon={<CalculatorIcon className="h-3.5 w-3.5" />}
        heading="MVA-håndtering"
        headingAccent="helt automatisk"
        description="Fra bilag til MVA-oppgjør — Ciri beregner, kategoriserer og rapporterer."
        features={[
          {
            icon: <CalculatorIcon className="h-5 w-5" />,
            title: "Automatisk beregning",
            desc: "MVA beregnes automatisk basert på bilagstype med støtte for alle norske satser.",
          },
          {
            icon: <FileTextIcon className="h-5 w-5" />,
            title: "Fradragsveiviser",
            desc: "Interaktiv guide som hjelper deg å finne riktig fradragskode for hvert bilag.",
          },
          {
            icon: <SendIcon className="h-5 w-5" />,
            title: "Altinn-innsending",
            desc: "RF-0002 ferdig utfylt og klar for innsending direkte til Skatteetaten.",
          },
        ]}
      />

      {/* Animation 2: Form Filler (Solid cream, 2-col) */}
      <SolidSection variant="cream">
        <div className="grid items-center gap-16 lg:grid-cols-2">
          <Reveal>
            <div>
              <SectionLabel>
                <FileTextIcon className="h-3.5 w-3.5" />
                RF-0002 MVA-melding
              </SectionLabel>
              <h2 className="mt-6 text-3xl font-normal tracking-tight text-[#1a2e23] sm:text-4xl">
                Automatisk utfylt{" "}
                <span className="text-[#3E715C]">MVA-melding</span>
              </h2>
              <p className="mt-5 max-w-md text-base leading-relaxed text-[#4a5e52]">
                Ciri fyller ut RF-0002 automatisk basert på bokføringen din. Alt
                valideres før du sender inn til Skatteetaten via Altinn.
              </p>
              <BulletList
                items={[
                  "SAF-T v1.30 sertifisert eksport",
                  "Direkte innsending til Altinn",
                  "Automatisk validering for feil",
                ]}
              />
            </div>
          </Reveal>
          <Reveal delay={0.15}>
            <div className="min-h-[320px] sm:min-h-[380px]">
              <FormFillerAnimation />
            </div>
          </Reveal>
        </div>
      </SolidSection>

      {/* TextSection 2: Relief / breathing room */}
      <SolidSection>
        <Reveal>
          <div className="text-center">
            <SectionLabel>
              <CoffeeIcon className="h-3.5 w-3.5" />
              Slipp å bekymre deg
            </SectionLabel>
            <h2 className="mt-6 text-4xl font-normal tracking-tight text-[#1a2e23] sm:text-5xl">
              Endelig kan du{" "}
              <span className="text-[#3E715C]">slappe av</span>
            </h2>
            <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-[#4a5e52]">
              MVA-frister, skjemaer og rapportering er det norske
              småbedriftseiere frykter mest. Med Ciri skjer alt automatisk — du
              får bare en bekreftelse når meldingen er levert.
            </p>
          </div>
        </Reveal>
        <div className="mt-16 grid gap-4 sm:grid-cols-3">
          {[
            {
              icon: <BellIcon className="h-5 w-5" />,
              title: "Automatiske påminnelser",
              desc: "Ciri varsler deg i god tid før fristen, men du trenger ikke gjøre noe.",
            },
            {
              icon: <ShieldCheckIcon className="h-5 w-5" />,
              title: "Feilfri rapportering",
              desc: "Automatisk validering sikrer at alt er korrekt før innsending.",
            },
            {
              icon: <CalendarIcon className="h-5 w-5" />,
              title: "Seks terminer, null stress",
              desc: "Hver termin håndteres automatisk. Du får bare en kvittering.",
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

      {/* Animation 3: Tax Calendar (Glass, 2-col) */}
      <GlassSection>
        <div className="grid items-center gap-16 lg:grid-cols-2">
          <Reveal>
            <div>
              <SectionLabel>
                <CalendarIcon className="h-3.5 w-3.5" />
                Aldri glem en frist
              </SectionLabel>
              <h2 className="mt-6 text-3xl font-normal tracking-tight text-[#1a2e23] sm:text-4xl">
                Aldri glem en{" "}
                <span className="text-[#3E715C]">frist</span>
              </h2>
              <p className="mt-5 max-w-md text-base leading-relaxed text-[#4a5e52]">
                Ciri varsler deg før MVA-fristen. Se oversikt over alle
                terminer, hva som er levert og hva som venter.
              </p>
              <BulletList
                items={[
                  "Automatiske fristpåminnelser",
                  "Oversikt over alle 6 terminer",
                  "Historikk over tidligere innleveringer",
                ]}
              />
            </div>
          </Reveal>
          <Reveal delay={0.15}>
            <div className="min-h-[320px] sm:min-h-[380px]">
              <TaxCalendarAnimation />
            </div>
          </Reveal>
        </div>
      </GlassSection>

      {/* CTA */}
      <MarketingCTA
        title="Klar til å glemme"
        titleAccent="MVA-stresset?"
        subtitle="Automatisk beregning, rapportering og innsending. Seks ganger i året, null manuelt arbeid."
        ctaText="Start MVA-håndtering"
      />
    </>
  );
}
