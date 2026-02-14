"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ReceiptIcon,
  SendIcon,
  EyeIcon,
  CheckCircleIcon,
  MailIcon,
  ClockIcon,
  BrainIcon,
  SparklesIcon,
  FilterIcon,
  DownloadIcon,
  UsersIcon,
} from "lucide-react";
import {
  HeroSection,
  GlassSection,
  SolidSection,
  MarketingCTA,
  Reveal,
  SectionLabel,
  MARKETING_EASING,
  PageMetrics,
  FeatureGrid,
  BulletList,
  useMarketingViewport,
} from "@/lib/marketing-utils";
import { cn } from "@/lib/utils";

// ============================================================================
// ANIMATION 1: INVOICE LIFECYCLE
// ============================================================================

const LIFECYCLE_STOPS = [
  { label: "Utkast", icon: ReceiptIcon, color: "#8a9a8e" },
  { label: "Sendt", icon: SendIcon, color: "#3E715C" },
  { label: "Sett", icon: EyeIcon, color: "#5B906F" },
  { label: "Betalt", icon: CheckCircleIcon, color: "#2d5e4a" },
] as const;

function InvoiceLifecycleAnimation() {
  const [activeStop, setActiveStop] = useState(-1);
  const { ref: viewportRef, hasEntered } = useMarketingViewport();
  const [showNotification, setShowNotification] = useState(false);
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
      setActiveStop(-1);
      setShowNotification(false);

      schedule(() => setActiveStop(0), 400);
      schedule(() => setActiveStop(1), 1400);
      schedule(() => {
        setActiveStop(2);
        setShowNotification(true);
      }, 2400);
      schedule(() => {
        setActiveStop(3);
        setShowNotification(false);
      }, 3600);
      schedule(() => {
        setActiveStop(-1);
        setShowNotification(false);
      }, 6000);
      schedule(() => runCycle(), 6400);
    };

    runCycle();
    return () => clearTimers();
  }, [hasEntered]);

  const svgWidth = 480;
  const svgHeight = 160;
  const stopY = 80;
  const stopSpacing = svgWidth / (LIFECYCLE_STOPS.length + 1);

  const getDotX = () => {
    if (activeStop < 0) return stopSpacing;
    return stopSpacing * (activeStop + 1);
  };

  const getTrailWidth = () => {
    if (activeStop < 0) return 0;
    return getDotX() - stopSpacing;
  };

  return (
    <div ref={viewportRef} className="relative mx-auto max-w-lg">
      <div className="relative overflow-hidden rounded-2xl border border-white/15 bg-white/[0.08] p-6 shadow-2xl backdrop-blur-3xl">
        <div className="pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-br from-white/30 via-transparent to-transparent" />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/60 to-transparent" />

        <div className="relative z-10">
          <svg
            viewBox={`0 0 ${svgWidth} ${svgHeight}`}
            className="w-full"
            style={{ maxHeight: 180 }}
          >
            <defs>
              <linearGradient id="fk-trailGrad" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#3E715C" stopOpacity="0" />
                <stop offset="100%" stopColor="#3E715C" stopOpacity="0.6" />
              </linearGradient>
              <filter id="fk-glowDot">
                <feGaussianBlur stdDeviation="4" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* Connecting line */}
            <line
              x1={stopSpacing}
              y1={stopY}
              x2={stopSpacing * LIFECYCLE_STOPS.length}
              y2={stopY}
              stroke="#d4dbd6"
              strokeWidth="2"
              strokeDasharray="6 4"
            />

            {/* Trail */}
            {activeStop >= 0 && (
              <motion.rect
                x={stopSpacing}
                y={stopY - 2}
                height={4}
                rx={2}
                initial={{ width: 0 }}
                animate={{ width: Math.max(0, getTrailWidth()) }}
                transition={{ duration: 0.6, ease: MARKETING_EASING }}
                fill="url(#fk-trailGrad)"
              />
            )}

            {/* Stop nodes */}
            {LIFECYCLE_STOPS.map((stop, i) => {
              const cx = stopSpacing * (i + 1);
              const isActive = i <= activeStop;
              const isCurrentStop = i === activeStop;

              return (
                <g key={stop.label}>
                  {isCurrentStop && (
                    <motion.circle
                      cx={cx}
                      cy={stopY}
                      r={28}
                      fill="none"
                      stroke={stop.color}
                      strokeWidth="1.5"
                      initial={{ opacity: 0, r: 20 }}
                      animate={{ opacity: [0, 0.4, 0], r: [20, 32, 32] }}
                      transition={{ duration: 1, repeat: Infinity }}
                    />
                  )}
                  <motion.circle
                    cx={cx}
                    cy={stopY}
                    r={22}
                    fill={isActive ? stop.color : "#f0f2ed"}
                    initial={{ scale: 1 }}
                    animate={
                      isCurrentStop ? { scale: [1, 1.12, 1] } : { scale: 1 }
                    }
                    transition={isCurrentStop ? { duration: 0.5 } : {}}
                    style={{ transformOrigin: `${cx}px ${stopY}px` }}
                  />
                  <motion.circle
                    cx={cx}
                    cy={stopY}
                    r={6}
                    fill={isActive ? "white" : "#8a9a8e"}
                    initial={{ opacity: 0.6 }}
                    animate={{ opacity: isActive ? 1 : 0.6 }}
                  />
                  <motion.text
                    x={cx}
                    y={stopY + 40}
                    textAnchor="middle"
                    fontSize="11"
                    fontWeight={isActive ? "600" : "400"}
                    fill={isActive ? "#1a2e23" : "#8a9a8e"}
                    initial={{ opacity: 0.5 }}
                    animate={{ opacity: isActive ? 1 : 0.5 }}
                  >
                    {stop.label}
                  </motion.text>
                </g>
              );
            })}

            {/* Animated glowing dot */}
            {activeStop >= 0 && (
              <motion.circle
                cx={getDotX()}
                cy={stopY}
                r={5}
                fill="#5B906F"
                filter="url(#fk-glowDot)"
                initial={{ cx: stopSpacing }}
                animate={{ cx: getDotX() }}
                transition={{ duration: 0.6, ease: MARKETING_EASING }}
              />
            )}
          </svg>

          {/* Notification badge */}
          <AnimatePresence>
            {showNotification && (
              <motion.div
                initial={{ opacity: 0, y: 8, scale: 0.8 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ type: "spring", stiffness: 400, damping: 20 }}
                className="absolute top-3 right-6 flex items-center gap-1.5 rounded-full border border-[#5B906F]/20 bg-white/90 px-3 py-1.5 shadow-lg backdrop-blur-md"
              >
                <EyeIcon className="h-3 w-3 text-[#5B906F]" />
                <span className="text-[10px] font-medium text-[#1a2e23]">
                  Åpnet kl 14:32
                </span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Stop icon cards */}
      <div className="mt-4 grid grid-cols-4 gap-2">
        {LIFECYCLE_STOPS.map((stop, i) => {
          const isActive = i <= activeStop;
          const isCurrentStop = i === activeStop;
          const Icon = stop.icon;

          return (
            <motion.div
              key={stop.label}
              initial={{ opacity: 0.5 }}
              animate={{
                opacity: isActive ? 1 : 0.5,
                scale: isCurrentStop ? 1.05 : 1,
              }}
              transition={{ duration: 0.3 }}
              className={cn(
                "flex flex-col items-center gap-1.5 rounded-xl border px-2 py-3 transition-colors",
                isActive
                  ? "border-[#3E715C]/20 bg-[#3E715C]/5"
                  : "border-[#d4dbd6]/40 bg-white/40"
              )}
            >
              <Icon
                className={cn(
                  "h-4 w-4",
                  isActive ? "text-[#3E715C]" : "text-[#8a9a8e]"
                )}
              />
              <span
                className={cn(
                  "text-[10px] font-medium",
                  isActive ? "text-[#1a2e23]" : "text-[#8a9a8e]"
                )}
              >
                {stop.label}
              </span>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================================
// ANIMATION 2: INVOICE BUILDER
// ============================================================================

function InvoiceBuilderAnimation() {
  const [phase, setPhase] = useState(0);
  const { ref: viewportRef, hasEntered } = useMarketingViewport();
  const [typedCompany, setTypedCompany] = useState("");
  const [typedCustomer, setTypedCustomer] = useState("");
  const [countedTotal, setCountedTotal] = useState(0);
  const [sent, setSent] = useState(false);
  const timersRef = useRef<NodeJS.Timeout[]>([]);

  const companyName = "Min Bedrift AS";
  const customerName = "Berge Konsult AS";
  const targetTotal = 23125;

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
      setPhase(0);
      setTypedCompany("");
      setTypedCustomer("");
      setCountedTotal(0);
      setSent(false);

      schedule(() => setPhase(1), 400);
      schedule(() => setPhase(2), 1800);
      schedule(() => setPhase(3), 3000);
      schedule(() => setPhase(4), 3600);
      schedule(() => setPhase(5), 4200);
      schedule(() => setPhase(6), 5400);
      schedule(() => setSent(true), 6000);
      schedule(() => {
        setPhase(0);
        setTypedCompany("");
        setTypedCustomer("");
        setCountedTotal(0);
        setSent(false);
      }, 8500);
      schedule(() => runCycle(), 9000);
    };

    runCycle();
    return () => clearTimers();
  }, [hasEntered]);

  useEffect(() => {
    if (phase !== 1) return;
    let charIndex = 0;
    const interval = setInterval(() => {
      charIndex++;
      setTypedCompany(companyName.slice(0, charIndex));
      if (charIndex >= companyName.length) clearInterval(interval);
    }, 60);
    return () => clearInterval(interval);
  }, [phase]);

  useEffect(() => {
    if (phase !== 2) return;
    let charIndex = 0;
    const interval = setInterval(() => {
      charIndex++;
      setTypedCustomer(customerName.slice(0, charIndex));
      if (charIndex >= customerName.length) clearInterval(interval);
    }, 60);
    return () => clearInterval(interval);
  }, [phase]);

  useEffect(() => {
    if (phase < 5) return;
    const duration = 800;
    const frames = 40;
    let frame = 0;
    const timer = setInterval(() => {
      frame++;
      const progress = Math.min(frame / frames, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCountedTotal(Math.round(targetTotal * eased));
      if (frame >= frames) clearInterval(timer);
    }, duration / frames);
    return () => clearInterval(timer);
  }, [phase]);

  const formatNOK = (amount: number) =>
    `kr ${amount.toLocaleString("nb-NO")},00`;

  return (
    <div ref={viewportRef} className="relative mx-auto max-w-md">
      <motion.div
        animate={
          sent
            ? { scale: 0.3, opacity: 0, y: -60 }
            : { scale: 1, opacity: 1, y: 0 }
        }
        transition={
          sent
            ? { duration: 0.6, ease: MARKETING_EASING }
            : { duration: 0.3 }
        }
        className="relative overflow-hidden rounded-2xl border border-[#d4dbd6] bg-white p-6 shadow-lg"
      >
        {/* Invoice header */}
        <div className="mb-6 flex items-start justify-between border-b border-[#f0f2ed] pb-4">
          <div>
            <p className="text-[10px] font-bold tracking-wider text-[#8a9a8e] uppercase">
              Fra
            </p>
            <p className="mt-1 h-5 font-mono text-sm font-medium text-[#1a2e23]">
              {phase >= 1 ? typedCompany : ""}
              {phase === 1 && (
                <motion.span
                  animate={{ opacity: [1, 0] }}
                  transition={{ repeat: Infinity, duration: 0.6 }}
                  className="ml-0.5 inline-block h-4 w-px bg-[#3E715C] align-middle"
                />
              )}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-bold tracking-wider text-[#8a9a8e] uppercase">
              Til
            </p>
            <p className="mt-1 h-5 font-mono text-sm font-medium text-[#1a2e23]">
              {phase >= 2 ? typedCustomer : ""}
              {phase === 2 && (
                <motion.span
                  animate={{ opacity: [1, 0] }}
                  transition={{ repeat: Infinity, duration: 0.6 }}
                  className="ml-0.5 inline-block h-4 w-px bg-[#3E715C] align-middle"
                />
              )}
            </p>
          </div>
        </div>

        {/* Line items */}
        <div className="space-y-2">
          <div className="grid grid-cols-3 gap-2 px-3 text-[10px] font-bold tracking-wider text-[#8a9a8e] uppercase">
            <span className="col-span-2">Beskrivelse</span>
            <span className="text-right">Beløp</span>
          </div>

          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={
              phase >= 3
                ? { opacity: 1, x: 0 }
                : { opacity: 0, x: -20 }
            }
            transition={{ duration: 0.4, ease: MARKETING_EASING }}
            className="grid grid-cols-3 gap-2 rounded-xl border border-[#f0f2ed] bg-[#f5f7f2]/50 px-3 py-2.5"
          >
            <div className="col-span-2">
              <p className="text-xs font-medium text-[#1a2e23]">
                Konsulenttjenester
              </p>
              <p className="text-[10px] text-[#8a9a8e]">
                10 timer × kr 1 850
              </p>
            </div>
            <p className="text-right font-mono text-xs font-medium tabular-nums text-[#1a2e23]">
              kr 18 500,00
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={
              phase >= 4
                ? { opacity: 1, x: 0 }
                : { opacity: 0, x: -20 }
            }
            transition={{ duration: 0.4, delay: 0.1, ease: MARKETING_EASING }}
            className="grid grid-cols-3 gap-2 rounded-xl border border-[#d4dbd6]/30 bg-white px-3 py-2.5"
          >
            <p className="col-span-2 text-xs text-[#4a5e52]">MVA 25%</p>
            <p className="text-right font-mono text-xs tabular-nums text-[#4a5e52]">
              kr 4 625,00
            </p>
          </motion.div>
        </div>

        {/* Total */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={phase >= 5 ? { opacity: 1 } : { opacity: 0 }}
          transition={{ duration: 0.4 }}
          className="mt-4 flex items-center justify-between border-t border-[#d4dbd6] pt-4"
        >
          <span className="text-sm font-semibold text-[#1a2e23]">Total</span>
          <span className="font-mono text-lg font-semibold tabular-nums text-[#1a2e23]">
            {phase >= 5 ? formatNOK(countedTotal) : ""}
          </span>
        </motion.div>

        {/* Send button */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={phase >= 6 ? { opacity: 1 } : { opacity: 0 }}
          className="mt-6"
        >
          <motion.button
            animate={
              phase >= 6 && !sent
                ? {
                    boxShadow: [
                      "0 0 0 0 rgba(62,113,92,0)",
                      "0 0 20px 4px rgba(62,113,92,0.3)",
                      "0 0 0 0 rgba(62,113,92,0)",
                    ],
                  }
                : {}
            }
            transition={
              phase >= 6 && !sent
                ? { duration: 1.5, repeat: Infinity }
                : {}
            }
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#3E715C] px-4 py-3 text-sm font-medium text-white"
          >
            <SendIcon className="h-4 w-4" />
            Send faktura
          </motion.button>
        </motion.div>
      </motion.div>

      {/* Flying mail icon */}
      <AnimatePresence>
        {sent && (
          <motion.div
            initial={{ scale: 0.5, opacity: 0, y: 0 }}
            animate={{ scale: 1, opacity: [0, 1, 1, 0], y: -120 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.2, ease: MARKETING_EASING }}
            className="absolute inset-x-0 top-1/2 flex justify-center"
          >
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#3E715C] shadow-xl shadow-[#3E715C]/30">
              <MailIcon className="h-7 w-7 text-white" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ============================================================================
// ANIMATION 3: INVOICE CLUSTER LEARNING
// Shows how Ciri learns invoice patterns through clustering and matching
// ============================================================================

const INVOICE_CLUSTERS = [
  {
    id: "konsulent",
    label: "Konsulent",
    cx: 110,
    cy: 90,
    color: "#3E715C",
    points: [
      { x: 95, y: 75 },
      { x: 120, y: 80 },
      { x: 100, y: 105 },
      { x: 125, y: 95 },
    ],
  },
  {
    id: "prosjekt",
    label: "Prosjekt",
    cx: 370,
    cy: 85,
    color: "#2d5e4a",
    points: [
      { x: 355, y: 70 },
      { x: 380, y: 78 },
      { x: 360, y: 100 },
      { x: 385, y: 92 },
      { x: 370, y: 72 },
    ],
  },
  {
    id: "abonnement",
    label: "Abonnement",
    cx: 140,
    cy: 230,
    color: "#5B906F",
    points: [
      { x: 125, y: 218 },
      { x: 150, y: 222 },
      { x: 130, y: 242 },
    ],
  },
  {
    id: "engangs",
    label: "Engangs",
    cx: 350,
    cy: 235,
    color: "#8BB5A2",
    points: [
      { x: 335, y: 220 },
      { x: 358, y: 228 },
      { x: 340, y: 248 },
      { x: 362, y: 242 },
    ],
  },
];

// Scattered initial positions for the dots
const SCATTERED_POSITIONS = [
  { x: 60, y: 160 },
  { x: 180, y: 50 },
  { x: 300, y: 200 },
  { x: 420, y: 130 },
  { x: 140, y: 260 },
  { x: 250, y: 80 },
  { x: 380, y: 260 },
  { x: 100, y: 140 },
  { x: 320, y: 60 },
  { x: 200, y: 180 },
  { x: 440, y: 220 },
  { x: 70, y: 240 },
  { x: 350, y: 150 },
  { x: 150, y: 120 },
  { x: 280, y: 250 },
  { x: 400, y: 80 },
];

function InvoiceLearningAnimation() {
  const [phase, setPhase] = useState(0);
  const { ref: viewportRef, hasEntered } = useMarketingViewport();
  const [matchScore, setMatchScore] = useState(0);
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
      setPhase(0);
      setMatchScore(0);

      // Phase 1: Dots cluster together
      schedule(() => setPhase(1), 600);
      // Phase 2: Labels + boundaries appear
      schedule(() => setPhase(2), 2200);
      // Phase 3: New invoice enters
      schedule(() => setPhase(3), 3400);
      // Phase 4: Match found, score counts up
      schedule(() => setPhase(4), 4800);
      // Reset
      schedule(() => {
        setPhase(0);
        setMatchScore(0);
      }, 8000);
      schedule(() => runCycle(), 8400);
    };

    runCycle();
    return () => clearTimers();
  }, [hasEntered]);

  // Count up match score when phase 4 starts
  useEffect(() => {
    if (phase < 4) return;
    const duration = 600;
    const frames = 30;
    let frame = 0;
    const target = 94;
    const timer = setInterval(() => {
      frame++;
      const progress = Math.min(frame / frames, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setMatchScore(Math.round(target * eased));
      if (frame >= frames) clearInterval(timer);
    }, duration / frames);
    return () => clearInterval(timer);
  }, [phase]);

  // Build a flat list of all dots with their scattered and clustered positions
  const allDots: {
    scattered: { x: number; y: number };
    clustered: { x: number; y: number };
    color: string;
    clusterLabel: string;
  }[] = [];

  let scatterIdx = 0;
  INVOICE_CLUSTERS.forEach((cluster) => {
    cluster.points.forEach((pt) => {
      allDots.push({
        scattered: SCATTERED_POSITIONS[scatterIdx % SCATTERED_POSITIONS.length],
        clustered: pt,
        color: cluster.color,
        clusterLabel: cluster.id,
      });
      scatterIdx++;
    });
  });

  // New incoming invoice position
  const newInvoiceStart = { x: 490, y: 160 };
  const newInvoiceEnd = { x: 125, y: 95 }; // Near konsulent cluster

  return (
    <div ref={viewportRef} className="relative mx-auto max-w-xl">
      <div className="relative overflow-hidden rounded-2xl border border-white/15 bg-white/[0.08] p-6 shadow-2xl backdrop-blur-3xl">
        <div className="pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-br from-white/30 via-transparent to-transparent" />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/60 to-transparent" />

        <div className="relative z-10">
          <svg viewBox="0 0 500 310" className="w-full" style={{ maxHeight: 340 }}>
            <defs>
              <filter id="fk-dotGlow">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
              <filter id="fk-newGlow">
                <feGaussianBlur stdDeviation="5" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* Cluster boundaries (dashed circles) — appear in phase 2+ */}
            {INVOICE_CLUSTERS.map((cluster) => (
              <motion.circle
                key={`boundary-${cluster.id}`}
                cx={cluster.cx}
                cy={cluster.cy}
                r={42}
                fill="none"
                stroke={cluster.color}
                strokeWidth="1"
                strokeDasharray="4 3"
                initial={{ opacity: 0 }}
                animate={{ opacity: phase >= 2 ? 0.4 : 0 }}
                transition={{ duration: 0.6 }}
              />
            ))}

            {/* Cluster labels — appear in phase 2+ */}
            {INVOICE_CLUSTERS.map((cluster) => (
              <motion.text
                key={`label-${cluster.id}`}
                x={cluster.cx}
                y={cluster.cy - 50}
                textAnchor="middle"
                fontSize="10"
                fontWeight="600"
                fill={cluster.color}
                initial={{ opacity: 0, y: 5 }}
                animate={{
                  opacity: phase >= 2 ? 1 : 0,
                  y: phase >= 2 ? 0 : 5,
                }}
                transition={{ duration: 0.5 }}
              >
                {cluster.label}
              </motion.text>
            ))}

            {/* All invoice dots */}
            {allDots.map((dot, i) => {
              const pos = phase >= 1 ? dot.clustered : dot.scattered;
              return (
                <motion.circle
                  key={`dot-${i}`}
                  r={5}
                  fill={phase >= 1 ? dot.color : "#b0bcb4"}
                  initial={{ cx: dot.scattered.x, cy: dot.scattered.y, opacity: 0.6 }}
                  animate={{
                    cx: pos.x,
                    cy: pos.y,
                    opacity: phase >= 1 ? 0.85 : 0.5,
                  }}
                  transition={{
                    duration: 1.2,
                    delay: i * 0.04,
                    ease: MARKETING_EASING,
                  }}
                />
              );
            })}

            {/* New incoming invoice — phase 3+ */}
            {phase >= 3 && (
              <>
                {/* Connecting dashed line to cluster */}
                {phase >= 4 && (
                  <motion.line
                    x1={newInvoiceEnd.x}
                    y1={newInvoiceEnd.y}
                    x2={INVOICE_CLUSTERS[0].cx}
                    y2={INVOICE_CLUSTERS[0].cy}
                    stroke="#3E715C"
                    strokeWidth="1"
                    strokeDasharray="3 3"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 0.5 }}
                    transition={{ duration: 0.4 }}
                  />
                )}

                {/* The new invoice dot */}
                <motion.circle
                  r={7}
                  fill="#3E715C"
                  filter="url(#fk-newGlow)"
                  initial={{ cx: newInvoiceStart.x, cy: newInvoiceStart.y }}
                  animate={{
                    cx: phase >= 4 ? newInvoiceEnd.x : 380,
                    cy: phase >= 4 ? newInvoiceEnd.y : 160,
                  }}
                  transition={{ duration: 1, ease: MARKETING_EASING }}
                />

                {/* Pulse ring on new dot */}
                <motion.circle
                  r={14}
                  fill="none"
                  stroke="#3E715C"
                  strokeWidth="1.5"
                  initial={{ cx: newInvoiceStart.x, cy: newInvoiceStart.y }}
                  animate={{
                    cx: phase >= 4 ? newInvoiceEnd.x : 380,
                    cy: phase >= 4 ? newInvoiceEnd.y : 160,
                    r: [10, 20, 20],
                    opacity: [0.6, 0, 0],
                  }}
                  transition={{
                    cx: { duration: 1, ease: MARKETING_EASING },
                    cy: { duration: 1, ease: MARKETING_EASING },
                    r: { duration: 1.2, repeat: Infinity },
                    opacity: { duration: 1.2, repeat: Infinity },
                  }}
                />

                {/* "Ny faktura" label */}
                {phase === 3 && (
                  <motion.text
                    x={380}
                    y={145}
                    textAnchor="middle"
                    fontSize="9"
                    fontWeight="500"
                    fill="#3E715C"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.4, delay: 0.3 }}
                  >
                    Ny faktura
                  </motion.text>
                )}
              </>
            )}

            {/* Match result badge — phase 4 */}
            {phase >= 4 && (
              <motion.g
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.3 }}
              >
                <rect
                  x={190}
                  y={120}
                  width={120}
                  height={48}
                  rx={12}
                  fill="white"
                  stroke="#3E715C"
                  strokeWidth="1"
                  opacity={0.95}
                />
                <text
                  x={250}
                  y={139}
                  textAnchor="middle"
                  fontSize="9"
                  fontWeight="600"
                  fill="#3E715C"
                >
                  Gjenkjent mønster
                </text>
                <text
                  x={250}
                  y={157}
                  textAnchor="middle"
                  fontSize="16"
                  fontWeight="700"
                  fill="#2d5e4a"
                  className="tabular-nums"
                >
                  {matchScore}%
                </text>
              </motion.g>
            )}
          </svg>

          {/* Status indicator below SVG */}
          <div className="mt-3 flex items-center justify-center gap-2">
            <AnimatePresence mode="wait">
              {phase < 1 && (
                <motion.span
                  key="idle"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 0.6 }}
                  exit={{ opacity: 0 }}
                  className="text-xs text-[#8a9a8e]"
                >
                  Historiske fakturaer
                </motion.span>
              )}
              {phase >= 1 && phase < 3 && (
                <motion.span
                  key="clustering"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex items-center gap-1.5 text-xs font-medium text-[#3E715C]"
                >
                  <BrainIcon className="h-3 w-3" />
                  Ciri grupperer mønstre
                </motion.span>
              )}
              {phase >= 3 && phase < 4 && (
                <motion.span
                  key="matching"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex items-center gap-1.5 text-xs font-medium text-[#5B906F]"
                >
                  <SparklesIcon className="h-3 w-3" />
                  Analyserer ny faktura...
                </motion.span>
              )}
              {phase >= 4 && (
                <motion.span
                  key="matched"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex items-center gap-1.5 text-xs font-medium text-[#2d5e4a]"
                >
                  <CheckCircleIcon className="h-3 w-3" />
                  Faktura auto-kategorisert som Konsulent
                </motion.span>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// PAGE
// ============================================================================

export default function FaktureringPage() {
  return (
    <>
      {/* Hero */}
      <HeroSection
        backgroundImage="/ciribackground3.jpg"
        title="Profesjonelle fakturaer."
        titleAccent="Null stress."
        subtitle="Opprett, send og spor fakturaer. Fra utkast til betalt — Ciri har kontroll."
        ctaText="Lag din første faktura"
        ctaHref="/register"
      />

      {/* Metrics */}
      <PageMetrics
        stats={[
          { value: "Gratis", label: "Ingen fakturakostnad" },
          { value: "KID", label: "Automatisk generert" },
          { value: "Sporing", label: "Se når kunden leser" },
          { value: "Auto", label: "Purring ved forfall" },
        ]}
      />

      {/* Animation 1: Invoice Lifecycle (Glass, centered) */}
      <GlassSection>
        <Reveal>
          <div className="text-center">
            <SectionLabel>
              <ReceiptIcon className="h-3.5 w-3.5" />
              Fakturaløpet
            </SectionLabel>
            <h2 className="mt-6 text-4xl font-normal tracking-tight text-[#1a2e23] sm:text-5xl">
              Full <span className="text-[#3E715C]">sporbarhet</span>
            </h2>
            <p className="mx-auto mt-5 max-w-lg text-base leading-relaxed text-[#4a5e52]">
              Fra det øyeblikket du oppretter en faktura til kunden betaler — du
              vet alltid status. Automatiske purringer når fristen nærmer seg.
            </p>
          </div>
        </Reveal>
        <Reveal delay={0.15}>
          <div className="mt-12">
            <InvoiceLifecycleAnimation />
          </div>
        </Reveal>
        <Reveal delay={0.25}>
          <ul className="mx-auto mt-10 flex max-w-2xl flex-col gap-3 sm:flex-row sm:gap-8">
            {[
              "KID-nummer generert automatisk",
              "Åpningssporing — se når kunden leser",
              "Automatiske betalingspåminnelser",
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
        label="Fakturafunksjoner"
        labelIcon={<ReceiptIcon className="h-3.5 w-3.5" />}
        heading="Profesjonelle fakturaer"
        headingAccent="uten ekstra kostnad"
        description="Alt du trenger for å sende, spore og følge opp fakturaer."
        features={[
          {
            icon: <ReceiptIcon className="h-5 w-5" />,
            title: "KID-nummer",
            desc: "Automatisk generering av KID-nummer for enkel betaling og sporing.",
          },
          {
            icon: <EyeIcon className="h-5 w-5" />,
            title: "Åpningssporing",
            desc: "Se når kunden åpner fakturaen. Få varsling i sanntid.",
          },
          {
            icon: <ClockIcon className="h-5 w-5" />,
            title: "Automatisk purring",
            desc: "Ciri sender purring automatisk når betalingsfristen er passert.",
          },
        ]}
      />

      {/* Animation 2: Invoice Builder (Solid cream, 2-col) */}
      <SolidSection variant="cream">
        <div className="grid items-center gap-16 lg:grid-cols-2">
          <Reveal delay={0.15} className="order-2 lg:order-1">
            <div className="min-h-[400px] sm:min-h-[440px]">
              <InvoiceBuilderAnimation />
            </div>
          </Reveal>
          <Reveal className="order-1 lg:order-2">
            <div>
              <SectionLabel>
                <SendIcon className="h-3.5 w-3.5" />
                Fakturabygger
              </SectionLabel>
              <h2 className="mt-6 text-3xl font-normal tracking-tight text-[#1a2e23] sm:text-4xl">
                Automatisk MVA{" "}
                <span className="text-[#3E715C]">og purring</span>
              </h2>
              <p className="mt-5 max-w-md text-base leading-relaxed text-[#4a5e52]">
                MVA beregnes automatisk basert på varelinje og kundens status.
                Forfallsdato settes, og Ciri sender purring om betaling uteblir.
              </p>
              <BulletList
                items={[
                  "MVA beregnet per varelinje",
                  "Automatisk purring ved forfall",
                  "Kundehistorikk og betalingsoversikt",
                ]}
              />
            </div>
          </Reveal>
        </div>
      </SolidSection>

      {/* TextSection 2: Oversikt i sanntid (replacing horrible donut animation) */}
      <SolidSection>
        <Reveal>
          <div className="text-center">
            <SectionLabel>
              <ClockIcon className="h-3.5 w-3.5" />
              Fakturaoversikt
            </SectionLabel>
            <h2 className="mt-6 text-4xl font-normal tracking-tight text-[#1a2e23] sm:text-5xl">
              Oversikt i{" "}
              <span className="text-[#3E715C]">sanntid</span>
            </h2>
            <p className="mx-auto mt-5 max-w-lg text-base leading-relaxed text-[#4a5e52]">
              Se hele fakturaen porteføljen din i ett blikk. Filtrer på status,
              kunde eller periode — og eksporter direkte til regnskapet.
            </p>
          </div>
        </Reveal>
        <div className="mt-16 grid gap-4 sm:grid-cols-3">
          {[
            {
              icon: <FilterIcon className="h-5 w-5" />,
              title: "Smart filtrering",
              desc: "Filtrer på betalt, ventende eller forfalt. Drill ned per kunde, periode eller beløp.",
            },
            {
              icon: <UsersIcon className="h-5 w-5" />,
              title: "Kundehistorikk",
              desc: "Se betalingshistorikk per kunde. Identifiser trege betalere og følg opp proaktivt.",
            },
            {
              icon: <DownloadIcon className="h-5 w-5" />,
              title: "Eksport til regnskap",
              desc: "Eksporter fakturaer til PDF, CSV eller direkte til regnskapssystemet med ett klikk.",
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

      {/* Animation 3: Invoice Learning (Glass, centered) */}
      <GlassSection>
        <Reveal>
          <div className="text-center">
            <SectionLabel>
              <BrainIcon className="h-3.5 w-3.5" />
              Mønstergjenkjenning
            </SectionLabel>
            <h2 className="mt-6 text-4xl font-normal tracking-tight text-[#1a2e23] sm:text-5xl">
              Smartere for{" "}
              <span className="text-[#3E715C]">hver faktura</span>
            </h2>
            <p className="mx-auto mt-5 max-w-lg text-base leading-relaxed text-[#4a5e52]">
              Ciri lærer fra historiske fakturaer og grupperer mønstre. Nye
              fakturaer matches automatisk, slik at kategorisering og kontoføring
              skjer uten manuelt arbeid.
            </p>
          </div>
        </Reveal>
        <Reveal delay={0.15}>
          <div className="mt-12">
            <InvoiceLearningAnimation />
          </div>
        </Reveal>
        <Reveal delay={0.25}>
          <ul className="mx-auto mt-10 flex max-w-2xl flex-col gap-3 sm:flex-row sm:gap-8">
            {[
              "Lærer fra hver eneste faktura",
              "Auto-kategorisering av kundetyper",
              "Smartere forslag over tid",
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

      {/* CTA */}
      <MarketingCTA
        title="Klar til å sende"
        titleAccent="profesjonelle fakturaer?"
        subtitle="Opprett din første faktura på under ett minutt."
        ctaText="Lag din første faktura"
      />
    </>
  );
}
