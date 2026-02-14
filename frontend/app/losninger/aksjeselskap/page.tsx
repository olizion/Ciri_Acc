"use client";

import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import {
  BuildingIcon,
  FileTextIcon,
  CheckCircleIcon,
  ArrowRightIcon,
  ClipboardListIcon,
  BarChart3Icon,
  ClockIcon,
  UsersIcon,
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
} from "@/lib/marketing-utils";

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
// HELPER: FeatureText
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
        <BulletList items={bullets} />
      </div>
    </Reveal>
  );
}

// ============================================================================
// CONSTANTS
// ============================================================================

interface OrgNode {
  id: string;
  label: string;
  x: number;
  y: number;
  isCiri?: boolean;
}

const ORG_NODES: OrgNode[] = [
  { id: "styret", label: "Styret", x: 250, y: 40 },
  { id: "daglig-leder", label: "Daglig leder", x: 250, y: 130 },
  { id: "salg", label: "Salg", x: 80, y: 230 },
  { id: "drift", label: "Drift", x: 250, y: 230 },
  { id: "okonomi", label: "Okonomi", x: 420, y: 230, isCiri: true },
];

interface OrgEdge {
  from: string;
  to: string;
}

const ORG_EDGES: OrgEdge[] = [
  { from: "styret", to: "daglig-leder" },
  { from: "daglig-leder", to: "salg" },
  { from: "daglig-leder", to: "drift" },
  { from: "daglig-leder", to: "okonomi" },
];

const REPORT_CARDS = [
  { title: "Arsregnskap", color: "#3E715C", lines: ["Resultatregnskap", "Balanse", "Noter"] },
  { title: "MVA-oppgave", color: "#4a8068", lines: ["Termin 1-6", "Fradrag", "A betale"] },
  { title: "Styreprotokoll", color: "#7c5cbf", lines: ["Generalforsamling", "Vedtak", "Signatur"] },
  { title: "SAF-T fil", color: "#b8960c", lines: ["v1.30 format", "Kontoplan", "Posteringer"] },
];

const MANUAL_TASKS = [
  { label: "Bokforing", hours: 15 },
  { label: "MVA", hours: 8 },
  { label: "Arsoppgjor", hours: 10 },
  { label: "A-melding", hours: 7 },
];

const CIRI_TASKS = [
  { label: "Kontroll", hours: 1 },
  { label: "Godkjenning", hours: 1 },
];

const MANUAL_TOTAL = MANUAL_TASKS.reduce((s, t) => s + t.hours, 0);
const CIRI_TOTAL = CIRI_TASKS.reduce((s, t) => s + t.hours, 0);

// ============================================================================
// ANIMATION 1: Corporate Structure — Org chart with animated SVG lines
// ============================================================================

function CorporateStructureAnimation() {
  const prefersReduced = usePrefersReducedMotion();
  const [hasStarted, setHasStarted] = useState(false);
  const [visibleEdges, setVisibleEdges] = useState<number[]>([]);
  const [visibleNodes, setVisibleNodes] = useState<string[]>([]);
  const [ciriHighlight, setCiriHighlight] = useState(false);
  const timersRef = useRef<NodeJS.Timeout[]>([]);

  const clearTimers = () => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
  };

  const schedule = (fn: () => void, ms: number) => {
    const t = setTimeout(fn, ms);
    timersRef.current.push(t);
  };

  useEffect(() => {
    if (!hasStarted) return;
    if (prefersReduced) {
      setVisibleNodes(ORG_NODES.map((n) => n.id));
      setVisibleEdges(ORG_EDGES.map((_, i) => i));
      setCiriHighlight(true);
      return;
    }

    clearTimers();
    setVisibleNodes([]);
    setVisibleEdges([]);
    setCiriHighlight(false);

    // Phase 1: Show "Styret" node
    schedule(() => setVisibleNodes(["styret"]), 200);

    // Phase 2: Draw edge to "Daglig leder", then show node
    schedule(() => setVisibleEdges([0]), 600);
    schedule(() => setVisibleNodes((prev) => [...prev, "daglig-leder"]), 1100);

    // Phase 3: Draw edges to 3 departments staggered
    schedule(() => setVisibleEdges((prev) => [...prev, 1]), 1500);
    schedule(() => setVisibleNodes((prev) => [...prev, "salg"]), 2000);

    schedule(() => setVisibleEdges((prev) => [...prev, 2]), 2200);
    schedule(() => setVisibleNodes((prev) => [...prev, "drift"]), 2700);

    schedule(() => setVisibleEdges((prev) => [...prev, 3]), 2900);
    schedule(() => setVisibleNodes((prev) => [...prev, "okonomi"]), 3400);

    // Phase 4: Highlight "Okonomi" with Ciri
    schedule(() => setCiriHighlight(true), 3800);

    return () => clearTimers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasStarted, prefersReduced]);

  const nodeMap = Object.fromEntries(ORG_NODES.map((n) => [n.id, n]));

  const svgWidth = 500;
  const svgHeight = 280;
  const nodeWidth = 120;
  const nodeHeight = 40;

  // Convert SVG coordinates to percentages for responsive HTML overlays
  const toPercentNum = (val: number, total: number) => (val / total) * 100;

  return (
    <motion.div
      onViewportEnter={() => {
        if (!hasStarted) setHasStarted(true);
      }}
      viewport={{ once: true, margin: "-80px" }}
      className="flex justify-center"
    >
      {/* Aspect ratio container matching the SVG viewBox */}
      <div
        className="relative w-full max-w-[500px]"
        style={{ paddingBottom: `${(svgHeight / svgWidth) * 100}%` }}
      >
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="absolute inset-0 h-full w-full"
          aria-label="Organisasjonskart som bygger seg opp"
          role="img"
        >
          {/* Edges */}
          {ORG_EDGES.map((edge, i) => {
            const from = nodeMap[edge.from];
            const to = nodeMap[edge.to];
            if (!from || !to) return null;

            const x1 = from.x;
            const y1 = from.y + nodeHeight / 2;
            const x2 = to.x;
            const y2 = to.y - nodeHeight / 2;
            const midY = (y1 + y2) / 2;

            const pathD = `M ${x1} ${y1} C ${x1} ${midY}, ${x2} ${midY}, ${x2} ${y2}`;
            const isVisible = visibleEdges.includes(i);

            return (
              <motion.path
                key={`edge-${i}`}
                d={pathD}
                fill="none"
                stroke="#3E715C"
                strokeWidth={2}
                strokeLinecap="round"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={
                  isVisible
                    ? { pathLength: 1, opacity: 1 }
                    : prefersReduced
                      ? { pathLength: 1, opacity: 1 }
                      : { pathLength: 0, opacity: 0 }
                }
                transition={{ duration: 0.5, ease: MARKETING_EASING }}
              />
            );
          })}
        </svg>

        {/* Nodes rendered as HTML overlays with percentage-based positioning */}
        {ORG_NODES.map((node) => {
          const isVisible = visibleNodes.includes(node.id);
          const isHighlighted = node.isCiri && ciriHighlight;

          const leftPct = toPercentNum(node.x - nodeWidth / 2, svgWidth);
          const topPct = toPercentNum(node.y - nodeHeight / 2, svgHeight);
          const widthPct = toPercentNum(nodeWidth, svgWidth);
          const heightPct = toPercentNum(nodeHeight, svgHeight);

          return (
            <motion.div
              key={node.id}
              className="absolute"
              style={{
                left: `${leftPct}%`,
                top: `${topPct}%`,
                width: `${widthPct}%`,
                height: `${heightPct}%`,
              }}
              initial={prefersReduced ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.5 }}
              animate={
                isVisible
                  ? { opacity: 1, scale: isHighlighted ? 1.1 : 1 }
                  : prefersReduced
                    ? { opacity: 1, scale: 1 }
                    : { opacity: 0, scale: 0.5 }
              }
              transition={
                isHighlighted
                  ? { type: "spring", stiffness: 300, damping: 18 }
                  : { type: "spring", stiffness: 400, damping: 25 }
              }
            >
              <div
                className={`flex h-full items-center justify-center gap-2 rounded-xl border text-xs font-medium transition-shadow duration-300 ${
                  isHighlighted
                    ? "border-[#3E715C] bg-[#3E715C]/10 text-[#3E715C] shadow-lg shadow-[#3E715C]/20"
                    : "border-[#d4dbd6] bg-white text-[#1a2e23] shadow-sm"
                }`}
              >
                {isHighlighted && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 500, damping: 20, delay: 0.2 }}
                    className="flex h-5 w-5 items-center justify-center rounded-full bg-[#3E715C]"
                  >
                    <span className="text-[8px] font-bold text-white">C</span>
                  </motion.div>
                )}
                <span>{node.label}</span>
              </div>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}

// ============================================================================
// ANIMATION 2: Multi-Report Generator — Printer metaphor
// ============================================================================

function MultiReportAnimation() {
  const prefersReduced = usePrefersReducedMotion();
  const [hasStarted, setHasStarted] = useState(false);
  const [feedPhase, setFeedPhase] = useState(0); // 0=idle, 1=feeding, 2=processing, 3=outputting
  const [visibleReports, setVisibleReports] = useState<number[]>([]);
  const [processingDots, setProcessingDots] = useState(0);
  const timersRef = useRef<NodeJS.Timeout[]>([]);
  const dotIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const clearTimers = () => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
    if (dotIntervalRef.current) {
      clearInterval(dotIntervalRef.current);
      dotIntervalRef.current = null;
    }
  };

  const schedule = (fn: () => void, ms: number) => {
    const t = setTimeout(fn, ms);
    timersRef.current.push(t);
  };

  useEffect(() => {
    if (!hasStarted) return;
    if (prefersReduced) {
      setFeedPhase(3);
      setVisibleReports([0, 1, 2, 3]);
      return;
    }

    const runCycle = () => {
      clearTimers();
      setFeedPhase(0);
      setVisibleReports([]);
      setProcessingDots(0);

      // Phase 1: Data blocks feed in
      schedule(() => setFeedPhase(1), 300);

      // Phase 2: Processing
      schedule(() => {
        setFeedPhase(2);
        let dotCount = 0;
        dotIntervalRef.current = setInterval(() => {
          dotCount = (dotCount + 1) % 4;
          setProcessingDots(dotCount);
        }, 350);
      }, 1600);

      // Phase 3: Reports emerge one by one
      schedule(() => {
        setFeedPhase(3);
        if (dotIntervalRef.current) {
          clearInterval(dotIntervalRef.current);
          dotIntervalRef.current = null;
        }
      }, 3200);

      schedule(() => setVisibleReports([0]), 3400);
      schedule(() => setVisibleReports([0, 1]), 3800);
      schedule(() => setVisibleReports([0, 1, 2]), 4200);
      schedule(() => setVisibleReports([0, 1, 2, 3]), 4600);

      // Restart cycle
      schedule(() => runCycle(), 8500);
    };

    runCycle();
    return () => clearTimers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasStarted, prefersReduced]);

  const inputBlocks = [
    { color: "#3E715C", label: "Bilag" },
    { color: "#5B906F", label: "Poster" },
    { color: "#8BB5A2", label: "Lonn" },
    { color: "#4a8068", label: "Bank" },
    { color: "#2d5e4a", label: "MVA" },
  ];

  return (
    <motion.div
      onViewportEnter={() => {
        if (!hasStarted) setHasStarted(true);
      }}
      viewport={{ once: true, margin: "-80px" }}
      className="mx-auto max-w-lg"
    >
      <div className="overflow-hidden rounded-2xl border border-[#d4dbd6] bg-white p-6 shadow-sm">
        {/* Stage: Input -> Processing -> Output */}
        <div className="flex items-center gap-3">
          {/* Input zone: colored blocks feeding in */}
          <div className="relative flex w-24 flex-shrink-0 flex-col items-end gap-1.5 overflow-hidden">
            {inputBlocks.map((block, i) => (
              <motion.div
                key={block.label}
                initial={prefersReduced ? { x: 0, opacity: 1 } : { x: -60, opacity: 0 }}
                animate={
                  feedPhase >= 1
                    ? feedPhase >= 2
                      ? { x: 60, opacity: 0 }
                      : { x: 0, opacity: 1 }
                    : prefersReduced
                      ? { x: 0, opacity: 1 }
                      : { x: -60, opacity: 0 }
                }
                transition={{
                  duration: 0.5,
                  delay: feedPhase === 1 ? i * 0.08 : feedPhase === 2 ? i * 0.06 : 0,
                  ease: MARKETING_EASING,
                }}
                className="flex items-center gap-1.5 rounded-md px-2 py-1"
                style={{ backgroundColor: `${block.color}15` }}
              >
                <div
                  className="h-2 w-2 rounded-sm"
                  style={{ backgroundColor: block.color }}
                />
                <span className="text-[9px] font-medium text-[#4a5e52]">{block.label}</span>
              </motion.div>
            ))}
          </div>

          {/* Arrow pointing right */}
          <motion.div
            animate={{ opacity: feedPhase >= 1 ? 1 : 0.3 }}
            className="flex-shrink-0"
          >
            <ArrowRightIcon className="h-4 w-4 text-[#8a9a8e]" />
          </motion.div>

          {/* Processing box */}
          <motion.div
            animate={
              feedPhase === 2
                ? {
                    borderColor: "rgba(62, 113, 92, 0.5)",
                    boxShadow: "0 0 16px rgba(62, 113, 92, 0.15)",
                  }
                : {
                    borderColor: "rgba(212, 219, 214, 0.5)",
                    boxShadow: "0 0 0px transparent",
                  }
            }
            transition={{ duration: 0.3 }}
            className="flex h-20 w-20 flex-shrink-0 flex-col items-center justify-center rounded-xl border bg-[#f5f7f2]"
          >
            {feedPhase === 2 ? (
              <>
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                >
                  <BarChart3Icon className="h-5 w-5 text-[#3E715C]" />
                </motion.div>
                <span className="mt-1 text-[8px] font-medium text-[#8a9a8e]">
                  Genererer{".".repeat(processingDots)}
                </span>
              </>
            ) : (
              <>
                <BarChart3Icon className="h-5 w-5 text-[#8a9a8e]" />
                <span className="mt-1 text-[8px] font-medium text-[#8a9a8e]">Ciri</span>
              </>
            )}
          </motion.div>

          {/* Arrow pointing right */}
          <motion.div
            animate={{ opacity: feedPhase >= 3 ? 1 : 0.3 }}
            className="flex-shrink-0"
          >
            <ArrowRightIcon className="h-4 w-4 text-[#8a9a8e]" />
          </motion.div>

          {/* Output: tiny indicator */}
          <div className="flex flex-shrink-0 items-center">
            <motion.div
              animate={feedPhase >= 3 ? { scale: 1, opacity: 1 } : { scale: 0.8, opacity: 0.3 }}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-[#3E715C]/10"
            >
              <FileTextIcon className="h-4 w-4 text-[#3E715C]" />
            </motion.div>
          </div>
        </div>

        {/* Report cards fanning out */}
        <div className="mt-6 grid grid-cols-2 gap-3">
          {REPORT_CARDS.map((report, i) => {
            const isVisible = visibleReports.includes(i);
            return (
              <motion.div
                key={report.title}
                initial={prefersReduced ? { opacity: 1, y: 0, scale: 1 } : { opacity: 0, y: 20, scale: 0.9 }}
                animate={
                  isVisible
                    ? { opacity: 1, y: 0, scale: 1 }
                    : prefersReduced
                      ? { opacity: 1, y: 0, scale: 1 }
                      : { opacity: 0, y: 20, scale: 0.9 }
                }
                transition={{
                  type: "spring",
                  stiffness: 300,
                  damping: 22,
                }}
                className="overflow-hidden rounded-xl border border-[#d4dbd6]/50"
              >
                {/* Color header stripe */}
                <div
                  className="px-3 py-2"
                  style={{ backgroundColor: `${report.color}12` }}
                >
                  <div className="flex items-center gap-2">
                    <div
                      className="h-2.5 w-2.5 rounded-sm"
                      style={{ backgroundColor: report.color }}
                    />
                    <span
                      className="text-[10px] font-bold tracking-wider uppercase"
                      style={{ color: report.color }}
                    >
                      {report.title}
                    </span>
                  </div>
                </div>
                {/* Mini preview lines */}
                <div className="space-y-1 px-3 py-2">
                  {report.lines.map((line) => (
                    <div key={line} className="flex items-center gap-1.5">
                      <div className="h-px w-2 bg-[#d4dbd6]" />
                      <span className="text-[8px] text-[#8a9a8e]">{line}</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}

// ============================================================================
// ANIMATION 3: Time Comparison — Manual vs Ciri hours
// ============================================================================

function TimeComparisonAnimation() {
  const prefersReduced = usePrefersReducedMotion();
  const [hasStarted, setHasStarted] = useState(false);
  const [manualFill, setManualFill] = useState(0);
  const [ciriFill, setCiriFill] = useState(0);
  const [showBadge, setShowBadge] = useState(false);
  const [animatedManualHours, setAnimatedManualHours] = useState(0);
  const [animatedCiriHours, setAnimatedCiriHours] = useState(0);
  const timersRef = useRef<NodeJS.Timeout[]>([]);
  const manualFrameRef = useRef<number>(0);
  const ciriFrameRef = useRef<number>(0);

  const clearTimers = () => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
    if (manualFrameRef.current) cancelAnimationFrame(manualFrameRef.current);
    if (ciriFrameRef.current) cancelAnimationFrame(ciriFrameRef.current);
  };

  const schedule = (fn: () => void, ms: number) => {
    const t = setTimeout(fn, ms);
    timersRef.current.push(t);
  };

  // Animate a counter from 0 to target
  const animateCounter = (
    target: number,
    duration: number,
    setter: (val: number) => void,
    frameRef: React.MutableRefObject<number>
  ) => {
    const startTime = performance.now();
    const tick = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setter(Math.round(target * eased));
      if (progress < 1) {
        frameRef.current = requestAnimationFrame(tick);
      }
    };
    frameRef.current = requestAnimationFrame(tick);
  };

  useEffect(() => {
    if (!hasStarted) return;
    if (prefersReduced) {
      setManualFill(100);
      setCiriFill(100);
      setShowBadge(true);
      setAnimatedManualHours(MANUAL_TOTAL);
      setAnimatedCiriHours(CIRI_TOTAL);
      return;
    }

    clearTimers();
    setManualFill(0);
    setCiriFill(0);
    setShowBadge(false);
    setAnimatedManualHours(0);
    setAnimatedCiriHours(0);

    // Start manual bar fill (slow)
    schedule(() => {
      setManualFill(100);
      animateCounter(MANUAL_TOTAL, 2200, setAnimatedManualHours, manualFrameRef);
    }, 400);

    // Start Ciri bar fill (fast) after manual starts
    schedule(() => {
      setCiriFill(100);
      animateCounter(CIRI_TOTAL, 600, setAnimatedCiriHours, ciriFrameRef);
    }, 1000);

    // Show savings badge
    schedule(() => setShowBadge(true), 2800);

    return () => clearTimers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasStarted, prefersReduced]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (manualFrameRef.current) cancelAnimationFrame(manualFrameRef.current);
      if (ciriFrameRef.current) cancelAnimationFrame(ciriFrameRef.current);
    };
  }, []);

  const savingsPercent = Math.round(((MANUAL_TOTAL - CIRI_TOTAL) / MANUAL_TOTAL) * 100);

  return (
    <motion.div
      onViewportEnter={() => {
        if (!hasStarted) setHasStarted(true);
      }}
      viewport={{ once: true, margin: "-80px" }}
      className="mx-auto w-full max-w-lg"
    >
      <div className="overflow-hidden rounded-2xl border border-white/15 bg-white/[0.08] p-6 backdrop-blur-xl sm:p-8">
        {/* Manual bar */}
        <div className="mb-8">
          <div className="mb-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ClockIcon className="h-4 w-4 text-[#b87333]" />
              <span className="text-sm font-medium text-[#1a2e23]">Manuelt</span>
            </div>
            <span className="text-lg font-semibold tabular-nums text-[#b87333]">
              {animatedManualHours} timer/ar
            </span>
          </div>
          <div className="h-6 w-full overflow-hidden rounded-full bg-[#d4dbd6]/30">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-[#c97a3a] to-[#b87333]"
              initial={{ width: "0%" }}
              animate={{ width: `${manualFill}%` }}
              transition={{
                duration: prefersReduced ? 0 : 2.2,
                ease: MARKETING_EASING,
              }}
            />
          </div>
          {/* Breakdown */}
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1">
            {MANUAL_TASKS.map((task) => (
              <span key={task.label} className="text-[10px] text-[#8a9a8e]">
                {task.label} {task.hours}t
              </span>
            ))}
          </div>
        </div>

        {/* Ciri bar */}
        <div className="mb-8">
          <div className="mb-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-4 w-4 items-center justify-center rounded-full bg-[#3E715C]">
                <span className="text-[7px] font-bold text-white">C</span>
              </div>
              <span className="text-sm font-medium text-[#1a2e23]">Med Ciri</span>
            </div>
            <span className="text-lg font-semibold tabular-nums text-[#3E715C]">
              {animatedCiriHours} timer/ar
            </span>
          </div>
          <div className="h-6 w-full overflow-hidden rounded-full bg-[#d4dbd6]/30">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-[#5B906F] to-[#3E715C]"
              initial={{ width: "0%" }}
              animate={{
                width: `${(CIRI_TOTAL / MANUAL_TOTAL) * ciriFill}%`,
              }}
              transition={{
                duration: prefersReduced ? 0 : 0.6,
                ease: MARKETING_EASING,
              }}
            />
          </div>
          {/* Breakdown */}
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1">
            {CIRI_TASKS.map((task) => (
              <span key={task.label} className="text-[10px] text-[#8a9a8e]">
                {task.label} {task.hours}t
              </span>
            ))}
          </div>
        </div>

        {/* Savings badge */}
        <div className="flex justify-center">
          <motion.div
            initial={prefersReduced ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.5 }}
            animate={
              showBadge
                ? { opacity: 1, scale: 1 }
                : prefersReduced
                  ? { opacity: 1, scale: 1 }
                  : { opacity: 0, scale: 0.5 }
            }
            transition={
              prefersReduced
                ? { duration: 0 }
                : { type: "spring", stiffness: 250, damping: 15 }
            }
            className="flex items-center gap-3 rounded-2xl border border-[#3E715C]/20 bg-[#3E715C]/8 px-6 py-3"
          >
            <CheckCircleIcon className="h-5 w-5 text-[#3E715C]" />
            <div>
              <span className="text-2xl font-semibold tabular-nums text-[#3E715C]">
                {savingsPercent}%
              </span>
              <span className="ml-2 text-sm text-[#4a5e52]">tidsbesparelse</span>
            </div>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}

// ============================================================================
// MAIN PAGE
// ============================================================================

export default function AksjeselskapPage() {
  return (
    <>
      {/* Hero */}
      <HeroSection
        backgroundImage="/ciribackground1.jpg"
        title="Komplett regnskap for AS."
        subtitle="Arsoppgjor, styreprotokoll og alt du trenger — automatisert og klar for innsending."
        ctaText="Kom i gang med Ciri for AS"
        ctaHref="/register"
      />

      {/* Metrics */}
      <PageMetrics stats={[
        { value: "Komplett", label: "AS-regnskap" },
        { value: "Arsoppgjor", label: "Generert automatisk" },
        { value: "40→2 timer", label: "Tidsbesparelse per ar" },
        { value: "Styreprotokoll", label: "Ferdig utfylt" },
      ]} />

      {/* Section 1: Corporate Structure (Glass, centered) */}
      <GlassSection>
        <Reveal>
          <div className="text-center">
            <SectionLabel>
              <BuildingIcon className="h-3.5 w-3.5" />
              Strukturert for vekst
            </SectionLabel>
            <h2 className="mt-6 text-4xl font-normal tracking-tight text-[#1a2e23] sm:text-5xl">
              Organisert regnskap{" "}
              <span className="text-[#3E715C]">for AS</span>
            </h2>
            <p className="mx-auto mt-5 max-w-lg text-base leading-relaxed text-[#4a5e52]">
              Ciri forstaar aksjeselskapets struktur og tilpasser regnskapet deretter.
            </p>
          </div>
        </Reveal>
        <Reveal delay={0.15}>
          <div className="mt-12">
            <CorporateStructureAnimation />
          </div>
        </Reveal>
        <Reveal delay={0.25}>
          <ul className="mx-auto mt-10 flex max-w-2xl flex-col gap-3 sm:flex-row sm:gap-8">
            {["Resultatregnskap etter god regnskapsskikk", "Balanse med full kontospesifikasjon", "Automatiske noter og spesifikasjoner"].map((item) => (
              <li key={item} className="flex items-start gap-2 text-sm text-[#4a5e52]">
                <CheckCircleIcon className="mt-0.5 h-4 w-4 shrink-0 text-[#5B906F]" />
                {item}
              </li>
            ))}
          </ul>
        </Reveal>
      </GlassSection>

      {/* Feature Grid */}
      <FeatureGrid
        label="For aksjeselskap"
        labelIcon={<BuildingIcon className="h-3.5 w-3.5" />}
        heading="Komplett regnskap"
        headingAccent="for AS"
        description="Fra daglig bokforing til arsoppgjor — Ciri dekker alle behov for aksjeselskap."
        features={[
          { icon: <FileTextIcon className="h-5 w-5" />, title: "Arsoppgjor", desc: "Komplett arsregnskap med resultat, balanse og noter generert automatisk." },
          { icon: <UsersIcon className="h-5 w-5" />, title: "Styreprotokoll", desc: "Ferdig utfylte styreprotokoller for arsoppgjor og utbytte." },
          { icon: <ClipboardListIcon className="h-5 w-5" />, title: "Bronnoysund", desc: "Klar for innsending til Bronnoysundregistrene med alle nodvendige vedlegg." },
        ]}
      />

      {/* Section 2: Multi-Report Generator (Solid Cream, 2-col) */}
      <SolidSection variant="cream">
        <div className="mx-auto max-w-5xl">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <Reveal delay={0.15}>
              <div className="min-h-[320px] sm:min-h-[380px]">
                <MultiReportAnimation />
              </div>
            </Reveal>
            <FeatureText
              heading="Styreprotokoll og Bronnoysund"
              description="Generer styreprotokoller for generalforsamling og styremeter. Send arsregnskap direkte til Bronnoysundregistrene."
              bullets={[
                "Styreprotokoll-maler",
                "Direkte innsending til Bronnoysund",
                "Aksjonaerregister",
                "Utbytte-beregning",
              ]}
            />
          </div>
        </div>
      </SolidSection>

      {/* Section 3: Time Comparison (Glass, 2-col) */}
      <GlassSection>
        <div className="mx-auto max-w-5xl">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <FeatureText
              heading="Spar 38 timer i aret"
              description="Norske aksjeselskap bruker i snitt 40 timer arlig pa regnskap. Med Ciri er det under 2 timer — tid du kan bruke pa forretningen."
              bullets={[
                "Full automatisering fra bilag til arsoppgjor",
                "Kontinuerlig bokforing hele aret",
                "Ingen manuell dataregistrering",
              ]}
            />
            <Reveal delay={0.15}>
              <div className="min-h-[320px] sm:min-h-[380px]">
                <TimeComparisonAnimation />
              </div>
            </Reveal>
          </div>
        </div>
      </GlassSection>

      {/* CTA */}
      <MarketingCTA
        title="Klar til a effektivisere"
        titleAccent="regnskapet for AS?"
        subtitle="Komplett regnskapslosning for aksjeselskap. Prov gratis i 14 dager."
        ctaText="Kom i gang med Ciri for AS"
      />
    </>
  );
}
