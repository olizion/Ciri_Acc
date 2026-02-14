"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  LandmarkIcon,
  CheckCircleIcon,
  AlertTriangleIcon,
  XCircleIcon,
  SearchIcon,
  ActivityIcon,
  TargetIcon,
  NetworkIcon,
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
// DATA
// ============================================================================

const bankTransactions = [
  { id: 0, description: "Kontorpartner AS", amount: "kr 4 250", date: "15.01" },
  { id: 1, description: "Telenor", amount: "kr 599", date: "16.01" },
  { id: 2, description: "Rema 1000", amount: "kr 342", date: "17.01" },
  { id: 3, description: "Ukjent betaling", amount: "kr 1 200", date: "18.01" },
];

const bilagCards = [
  { id: 0, description: "Kontorpartner AS", amount: "kr 4 250", date: "15.01" },
  { id: 1, description: "Telenor Norge", amount: "kr 599", date: "16.01" },
  { id: 2, description: "Rema 1000 Storo", amount: "kr 342", date: "17.01" },
  { id: 3, description: "Diverse", amount: "kr 1 200", date: "18.01" },
];

const matchColors = ["#5B906F", "#5B906F", "#5B906F", "#d97706"];

const weightFactors = [
  { label: "Belop", pct: 35 },
  { label: "Referanse", pct: 30 },
  { label: "Toleranse", pct: 20 },
  { label: "Leverandornavn", pct: 15 },
  { label: "Dato", pct: 15 },
];

// Training score data
const SCORE_FACTORS = [
  { label: "Belopsmatch", score: 98, weight: "35%" },
  { label: "Referansematch", score: 85, weight: "30%" },
  { label: "Datoproksimitet", score: 100, weight: "20%" },
  { label: "Navnelikhet", score: 72, weight: "15%" },
];

// Cluster data
const CLUSTERS = [
  {
    label: "Kontor",
    color: "#3E715C",
    cx: 120, cy: 80,
    points: [
      { x: 105, y: 65 }, { x: 135, y: 72 }, { x: 118, y: 90 },
      { x: 128, y: 85 }, { x: 110, y: 78 },
    ],
  },
  {
    label: "Tele",
    color: "#5B906F",
    cx: 300, cy: 90,
    points: [
      { x: 290, y: 78 }, { x: 310, y: 85 }, { x: 295, y: 98 },
      { x: 305, y: 95 },
    ],
  },
  {
    label: "Mat",
    color: "#8BB5A2",
    cx: 200, cy: 170,
    points: [
      { x: 188, y: 158 }, { x: 212, y: 165 }, { x: 195, y: 178 },
      { x: 208, y: 175 }, { x: 198, y: 168 },
    ],
  },
  {
    label: "Reise",
    color: "#2d5e4a",
    cx: 350, cy: 180,
    points: [
      { x: 340, y: 170 }, { x: 360, y: 175 }, { x: 348, y: 190 },
    ],
  },
];

// ============================================================================
// ANIMATION 1: MATCHING RADAR (kept — user likes this)
// ============================================================================

function MatchingRadarAnimation() {
  const [phase, setPhase] = useState(0);
  const { ref: viewportRef, hasEntered } = useMarketingViewport();
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
      schedule(() => setPhase(1), 600);
      schedule(() => setPhase(2), 1600);
      schedule(() => setPhase(3), 2200);
      schedule(() => setPhase(4), 2800);
      schedule(() => setPhase(5), 3400);
      schedule(() => setPhase(0), 7000);
      schedule(() => runCycle(), 7200);
    };

    runCycle();
    return () => clearTimers();
  }, [hasEntered]);

  const isMatchVisible = (matchIndex: number) => phase >= matchIndex + 2;

  return (
    <div ref={viewportRef} className="relative mx-auto max-w-2xl">
      <div className="relative overflow-hidden rounded-2xl border border-white/15 bg-white/[0.08] p-5 shadow-2xl backdrop-blur-3xl sm:p-8">
        <div className="pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-br from-white/30 via-transparent to-transparent" />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/60 to-transparent" />

        <div className="relative z-10">
          <div className="grid grid-cols-[1fr_64px_1fr] items-start gap-2 sm:gap-4">
            {/* Bank transactions */}
            <div>
              <p className="mb-3 text-[10px] font-bold tracking-[0.15em] text-[#8a9a8e] uppercase">
                Banktransaksjoner
              </p>
              <div className="space-y-2">
                {bankTransactions.map((tx, i) => (
                  <motion.div
                    key={tx.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={hasEntered ? { opacity: 1, x: 0 } : {}}
                    transition={{ delay: 0.1 + i * 0.08, duration: 0.5, ease: MARKETING_EASING }}
                    className={cn(
                      "rounded-xl border px-3 py-2.5 transition-colors duration-500",
                      isMatchVisible(i)
                        ? i === 3 ? "border-amber-300/40 bg-amber-50/60" : "border-emerald-300/40 bg-emerald-50/60"
                        : "border-white/10 bg-white/[0.06]"
                    )}
                  >
                    <p className="truncate text-[11px] font-medium text-[#1a2e23]">{tx.description}</p>
                    <div className="mt-0.5 flex items-center justify-between">
                      <span className="text-[10px] text-[#8a9a8e]">{tx.date}</span>
                      <span className="text-[11px] font-medium tabular-nums text-[#4a5e52]">{tx.amount}</span>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Center column: radar pulse + lines */}
            <div className="relative flex flex-col items-center justify-center self-stretch">
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                <AnimatePresence>
                  {phase === 1 && (
                    <>
                      <motion.div
                        initial={{ scale: 0.2, opacity: 0.9 }}
                        animate={{ scale: 3, opacity: 0 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 1, ease: "easeOut" }}
                        className="absolute top-1/2 left-1/2 h-10 w-10 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-[#3E715C]/50"
                      />
                      <motion.div
                        initial={{ scale: 0.2, opacity: 0.7 }}
                        animate={{ scale: 2.5, opacity: 0 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 1, delay: 0.15, ease: "easeOut" }}
                        className="absolute top-1/2 left-1/2 h-10 w-10 -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#3E715C]/30"
                      />
                    </>
                  )}
                </AnimatePresence>
                <motion.div
                  animate={{ scale: phase === 1 ? [1, 1.4, 1] : 1 }}
                  transition={{ duration: 0.6 }}
                  className="relative z-10 h-3 w-3 rounded-full bg-[#3E715C]"
                />
              </div>

              <svg className="pointer-events-none absolute inset-0 h-full w-full" style={{ overflow: "visible" }} preserveAspectRatio="none">
                {[0, 1, 2, 3].map((i) => {
                  const headerOffset = 24;
                  const cardHeight = 54;
                  const gap = 8;
                  const yCenter = headerOffset + i * (cardHeight + gap) + cardHeight / 2;
                  return (
                    <line
                      key={i}
                      x1="0" y1={yCenter} x2="64" y2={yCenter}
                      stroke={matchColors[i]}
                      strokeWidth={2}
                      strokeLinecap="round"
                      strokeDasharray="80"
                      strokeDashoffset={isMatchVisible(i) ? 0 : 80}
                      opacity={isMatchVisible(i) ? 0.8 : 0}
                      style={{ transition: "stroke-dashoffset 0.6s ease-out, opacity 0.4s ease-out" }}
                    />
                  );
                })}
              </svg>
            </div>

            {/* Bilag column */}
            <div>
              <p className="mb-3 text-[10px] font-bold tracking-[0.15em] text-[#8a9a8e] uppercase">Bilag</p>
              <div className="space-y-2">
                {bilagCards.map((bilag, i) => (
                  <motion.div
                    key={bilag.id}
                    initial={{ opacity: 0, x: 20 }}
                    animate={hasEntered ? { opacity: 1, x: 0 } : {}}
                    transition={{ delay: 0.1 + i * 0.08, duration: 0.5, ease: MARKETING_EASING }}
                    className={cn(
                      "rounded-xl border px-3 py-2.5 transition-colors duration-500",
                      isMatchVisible(i)
                        ? i === 3 ? "border-amber-300/40 bg-amber-50/60" : "border-emerald-300/40 bg-emerald-50/60"
                        : "border-white/10 bg-white/[0.06]"
                    )}
                  >
                    <p className="truncate text-[11px] font-medium text-[#1a2e23]">{bilag.description}</p>
                    <div className="mt-0.5 flex items-center justify-between">
                      <span className="text-[10px] text-[#8a9a8e]">{bilag.date}</span>
                      <span className="text-[11px] font-medium tabular-nums text-[#4a5e52]">{bilag.amount}</span>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>

          {/* Match badges */}
          <div className="relative min-h-[40px]">
            <AnimatePresence>
              {phase >= 2 && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  transition={{ duration: 0.4 }}
                  className="mt-5 flex flex-wrap items-center justify-center gap-2"
                >
                  {[0, 1, 2, 3].map((i) => {
                    if (!isMatchVisible(i)) return null;
                    const isAmber = matchColors[i] === "#d97706";
                    return (
                      <motion.div
                        key={i}
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: "spring", stiffness: 400, damping: 15 }}
                        className={cn(
                          "flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-medium",
                          isAmber ? "bg-amber-50 text-amber-600" : "bg-emerald-50 text-emerald-600"
                        )}
                      >
                        {isAmber ? <AlertTriangleIcon className="h-3 w-3" /> : <CheckCircleIcon className="h-3 w-3" />}
                        {isAmber ? "Usikker" : "Match"}
                      </motion.div>
                    );
                  })}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// ANIMATION 2: TRAINING SCORE — Shows exactness scoring per factor
// ============================================================================

function TrainingScoreAnimation() {
  const { ref: viewportRef, hasEntered } = useMarketingViewport();
  const [visibleFactors, setVisibleFactors] = useState(0);
  const [showTotal, setShowTotal] = useState(false);
  const [showVerdict, setShowVerdict] = useState(false);
  const [totalScore, setTotalScore] = useState(0);
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
      setVisibleFactors(0);
      setShowTotal(false);
      setShowVerdict(false);
      setTotalScore(0);

      SCORE_FACTORS.forEach((_, i) => {
        schedule(() => setVisibleFactors(i + 1), 400 + i * 600);
      });

      const totalTime = 400 + SCORE_FACTORS.length * 600 + 400;
      schedule(() => {
        setShowTotal(true);
        // Animate total score
        const target = 91;
        const duration = 800;
        const frames = 40;
        let frame = 0;
        const interval = setInterval(() => {
          frame++;
          const progress = Math.min(frame / frames, 1);
          const eased = 1 - Math.pow(1 - progress, 3);
          setTotalScore(Math.round(target * eased));
          if (frame >= frames) clearInterval(interval);
        }, duration / frames);
        timersRef.current.push(interval as unknown as NodeJS.Timeout);
      }, totalTime);

      schedule(() => setShowVerdict(true), totalTime + 1200);
      schedule(() => runCycle(), totalTime + 4500);
    };

    runCycle();
    return () => clearTimers();
  }, [hasEntered]);

  return (
    <div ref={viewportRef} className="mx-auto max-w-sm">
      <div className="overflow-hidden rounded-2xl border border-[#d4dbd6] bg-white p-6">
        {/* Header: transaction pair being scored */}
        <div className="mb-5 flex items-center justify-between border-b border-[#d4dbd6]/50 pb-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#3E715C]/10">
              <TargetIcon className="h-4 w-4 text-[#3E715C]" />
            </div>
            <div>
              <p className="text-xs font-medium text-[#1a2e23]">Matching-poeng</p>
              <p className="text-[10px] text-[#8a9a8e]">Kontorpartner AS vs Banktransaksjon</p>
            </div>
          </div>
        </div>

        {/* Scoring factors */}
        <div className="space-y-3">
          {SCORE_FACTORS.map((factor, i) => {
            const isVisible = i < visibleFactors;
            const barColor = factor.score >= 90 ? "#3E715C" : factor.score >= 70 ? "#d97706" : "#dc2626";

            return (
              <motion.div
                key={factor.label}
                initial={{ opacity: 0, x: -15 }}
                animate={isVisible ? { opacity: 1, x: 0 } : { opacity: 0, x: -15 }}
                transition={{ duration: 0.4, ease: MARKETING_EASING }}
              >
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-[11px] font-medium text-[#4a5e52]">{factor.label}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] text-[#8a9a8e]">{factor.weight}</span>
                    <motion.span
                      initial={{ opacity: 0 }}
                      animate={isVisible ? { opacity: 1 } : { opacity: 0 }}
                      transition={{ delay: 0.3 }}
                      className="text-xs font-semibold tabular-nums"
                      style={{ color: barColor }}
                    >
                      {factor.score}%
                    </motion.span>
                  </div>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-[#f0f2ed]">
                  <motion.div
                    initial={{ width: "0%" }}
                    animate={isVisible ? { width: `${factor.score}%` } : { width: "0%" }}
                    transition={{ duration: 0.8, delay: 0.1, ease: MARKETING_EASING }}
                    className="h-full rounded-full"
                    style={{ backgroundColor: barColor }}
                  />
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Total score */}
        <AnimatePresence>
          {showTotal && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="mt-5 flex items-center justify-between rounded-xl border border-[#3E715C]/20 bg-[#3E715C]/5 px-4 py-3"
            >
              <span className="text-sm font-medium text-[#1a2e23]">Totalpoeng</span>
              <span className="text-xl font-semibold tabular-nums text-[#3E715C]">{totalScore}%</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Verdict */}
        <div className="mt-3 min-h-[40px]">
          <AnimatePresence>
            {showVerdict && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
                className="flex items-center justify-center gap-2 rounded-xl bg-emerald-50 px-4 py-2.5"
              >
                <CheckCircleIcon className="h-4 w-4 text-emerald-600" />
                <span className="text-xs font-medium text-emerald-700">Automatisk godkjent</span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// ANIMATION 3: CLUSTER LEARNING — Shows how patterns cluster over time
// ============================================================================

function ClusterLearningAnimation() {
  const { ref: viewportRef, hasEntered } = useMarketingViewport();
  const [phase, setPhase] = useState(0);
  // Phase 0: scattered, 1: clustering, 2: labeled, 3: new point assigned
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
      schedule(() => setPhase(1), 800);
      schedule(() => setPhase(2), 2400);
      schedule(() => setPhase(3), 3800);
      schedule(() => setPhase(0), 7000);
      schedule(() => runCycle(), 7400);
    };

    runCycle();
    return () => clearTimers();
  }, [hasEntered]);

  // Scattered positions (phase 0)
  const scatteredPositions = [
    { x: 80, y: 50 }, { x: 340, y: 40 }, { x: 200, y: 100 },
    { x: 150, y: 170 }, { x: 280, y: 150 }, { x: 100, y: 120 },
    { x: 320, y: 100 }, { x: 220, y: 60 }, { x: 170, y: 140 },
    { x: 350, y: 170 }, { x: 260, y: 80 }, { x: 130, y: 90 },
    { x: 300, y: 130 }, { x: 190, y: 180 }, { x: 240, y: 160 },
    { x: 110, y: 160 }, { x: 360, y: 60 },
  ];

  // Build clustered positions from CLUSTERS data
  const clusteredPositions: { x: number; y: number; cluster: number }[] = [];
  CLUSTERS.forEach((cluster, ci) => {
    cluster.points.forEach((p) => {
      clusteredPositions.push({ x: p.x, y: p.y, cluster: ci });
    });
  });
  // Pad to match scattered count
  while (clusteredPositions.length < scatteredPositions.length) {
    const ci = clusteredPositions.length % CLUSTERS.length;
    const c = CLUSTERS[ci];
    clusteredPositions.push({
      x: c.cx + (Math.random() - 0.5) * 30,
      y: c.cy + (Math.random() - 0.5) * 30,
      cluster: ci,
    });
  }

  // New point that gets assigned (phase 3)
  const newPoint = { startX: 420, startY: 120, endX: 305, endY: 92 };

  return (
    <div ref={viewportRef} className="relative mx-auto max-w-lg">
      <div className="relative overflow-hidden rounded-2xl border border-white/15 bg-white/[0.08] p-6 shadow-2xl backdrop-blur-3xl">
        <div className="pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-br from-white/30 via-transparent to-transparent" />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/60 to-transparent" />

        <div className="relative z-10">
          <svg viewBox="0 0 440 220" className="w-full" style={{ maxHeight: 260 }}>
            {/* Cluster boundaries (phase 2+) */}
            {phase >= 2 && CLUSTERS.map((cluster, ci) => (
              <motion.circle
                key={`boundary-${ci}`}
                cx={cluster.cx}
                cy={cluster.cy}
                r={40}
                fill={cluster.color}
                fillOpacity={0.06}
                stroke={cluster.color}
                strokeWidth={1}
                strokeOpacity={0.2}
                strokeDasharray="4 3"
                initial={{ opacity: 0, r: 20 }}
                animate={{ opacity: 1, r: 40 }}
                transition={{ duration: 0.6, delay: ci * 0.1 }}
              />
            ))}

            {/* Data points */}
            {scatteredPositions.map((sp, i) => {
              const cp = clusteredPositions[i];
              const isClustered = phase >= 1;
              const tx = isClustered ? cp.x : sp.x;
              const ty = isClustered ? cp.y : sp.y;
              const clusterColor = isClustered ? CLUSTERS[cp.cluster].color : "#8a9a8e";

              return (
                <motion.circle
                  key={`dot-${i}`}
                  cx={sp.x}
                  cy={sp.y}
                  r={4}
                  fill={clusterColor}
                  initial={{ cx: sp.x, cy: sp.y, opacity: 0 }}
                  animate={{
                    cx: tx,
                    cy: ty,
                    opacity: hasEntered ? 0.85 : 0,
                  }}
                  transition={{
                    cx: { duration: 1.2, delay: i * 0.03, ease: MARKETING_EASING },
                    cy: { duration: 1.2, delay: i * 0.03, ease: MARKETING_EASING },
                    opacity: { duration: 0.4, delay: i * 0.02 },
                  }}
                />
              );
            })}

            {/* Cluster labels (phase 2+) */}
            {phase >= 2 && CLUSTERS.map((cluster, ci) => (
              <motion.g
                key={`label-${ci}`}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 + ci * 0.12, duration: 0.4 }}
              >
                <rect
                  x={cluster.cx - 24}
                  y={cluster.cy - 30}
                  width={48}
                  height={18}
                  rx={6}
                  fill="white"
                  stroke={cluster.color}
                  strokeWidth={1}
                  opacity={0.9}
                />
                <text
                  x={cluster.cx}
                  y={cluster.cy - 18}
                  textAnchor="middle"
                  fill={cluster.color}
                  fontSize="9"
                  fontWeight="600"
                >
                  {cluster.label}
                </text>
              </motion.g>
            ))}

            {/* New point being assigned (phase 3) */}
            {phase >= 3 && (
              <>
                <motion.circle
                  cx={newPoint.startX}
                  cy={newPoint.startY}
                  r={5}
                  fill="#d97706"
                  stroke="#d97706"
                  strokeWidth={2}
                  strokeOpacity={0.3}
                  initial={{ cx: newPoint.startX, cy: newPoint.startY, opacity: 0 }}
                  animate={{ cx: newPoint.endX, cy: newPoint.endY, opacity: 1 }}
                  transition={{ duration: 0.8, ease: MARKETING_EASING }}
                />
                <motion.line
                  x1={newPoint.startX}
                  y1={newPoint.startY}
                  x2={newPoint.endX}
                  y2={newPoint.endY}
                  stroke="#d97706"
                  strokeWidth={1}
                  strokeDasharray="4 3"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 0.4 }}
                  transition={{ delay: 0.4, duration: 0.4 }}
                />
                {/* Label for new point */}
                <motion.g
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.8 }}
                >
                  <rect
                    x={newPoint.startX - 30}
                    y={newPoint.startY - 24}
                    width={60}
                    height={16}
                    rx={4}
                    fill="#d97706"
                    fillOpacity={0.1}
                    stroke="#d97706"
                    strokeWidth={0.5}
                  />
                  <text
                    x={newPoint.startX}
                    y={newPoint.startY - 13}
                    textAnchor="middle"
                    fill="#d97706"
                    fontSize="8"
                    fontWeight="500"
                  >
                    Ny transaksjon
                  </text>
                </motion.g>
              </>
            )}
          </svg>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// PAGE
// ============================================================================

export default function BankavstemmingPage() {
  return (
    <>
      {/* Hero */}
      <HeroSection
        backgroundImage="/ciribackground2.jpg"
        title="Banken og bilagene."
        titleAccent="Endelig i sync."
        subtitle="Ciri matcher transaksjoner mot bilag automatisk med smart konfidensscoring."
        ctaText="Koble til banken din"
        ctaHref="/register"
      />

      {/* Metrics */}
      <PageMetrics
        stats={[
          { value: "2 500+", numericTarget: 2500, suffix: "+", label: "Banker tilkoblet" },
          { value: "98%", label: "Automatisk matching" },
          { value: "5-faktor", label: "Intelligent matching" },
          { value: "Daglig", label: "Automatisk synkronisering" },
        ]}
      />

      {/* Animation 1: Matching Radar (Glass, centered) */}
      <GlassSection>
        <Reveal>
          <div className="text-center">
            <SectionLabel>
              <SearchIcon className="h-3.5 w-3.5" />
              Smart matching
            </SectionLabel>
            <h2 className="mt-6 text-4xl font-normal tracking-tight text-[#1a2e23] sm:text-5xl">
              Flerfaktor-<span className="text-[#3E715C]">matching</span>
            </h2>
            <p className="mx-auto mt-5 max-w-lg text-base leading-relaxed text-[#4a5e52]">
              Ciri bruker fem faktorer for a matche: belop (35%), referanse
              (30%), toleranse (20%), leverandornavn (15%) og dato (15%).
            </p>
          </div>
        </Reveal>
        <Reveal delay={0.15}>
          <div className="mt-12">
            <MatchingRadarAnimation />
          </div>
        </Reveal>
        <Reveal delay={0.25}>
          <ul className="mx-auto mt-10 flex max-w-2xl flex-col gap-3 sm:flex-row sm:gap-8">
            {weightFactors.map((factor) => (
              <li key={factor.label} className="flex items-start gap-2 text-sm text-[#4a5e52]">
                <CheckCircleIcon className="mt-0.5 h-4 w-4 shrink-0 text-[#5B906F]" />
                {factor.label} ({factor.pct}%)
              </li>
            ))}
          </ul>
        </Reveal>
      </GlassSection>

      {/* Text breathing: Feature Grid */}
      <FeatureGrid
        label="Avstemmingsfunksjoner"
        labelIcon={<LandmarkIcon className="h-3.5 w-3.5" />}
        heading="Bankavstemming"
        headingAccent="pa autopilot"
        description="Ciri matcher transaksjoner automatisk med 5-faktor analyse."
        features={[
          {
            icon: <SearchIcon className="h-5 w-5" />,
            title: "Smart matching",
            desc: "5-faktor matching med belop, referanse, toleranse, leverandornavn og dato.",
          },
          {
            icon: <ActivityIcon className="h-5 w-5" />,
            title: "Konfidensscoring",
            desc: "Gronne, gule og rode terskler gir deg full kontroll over automatiske godkjenninger.",
          },
          {
            icon: <LandmarkIcon className="h-5 w-5" />,
            title: "2 500+ banker",
            desc: "Integrasjon med GoCardless og Tink gir tilgang til alle norske banker.",
          },
        ]}
      />

      {/* Animation 2: Training Score (Solid cream, 2-col) */}
      <SolidSection variant="cream">
        <div className="grid items-center gap-16 lg:grid-cols-2">
          <Reveal delay={0.15} className="order-2 lg:order-1">
            <div className="min-h-[320px] sm:min-h-[360px]">
              <TrainingScoreAnimation />
            </div>
          </Reveal>
          <Reveal className="order-1 lg:order-2">
            <div>
              <SectionLabel>
                <TargetIcon className="h-3.5 w-3.5" />
                Presisjonstrening
              </SectionLabel>
              <h2 className="mt-6 text-3xl font-normal tracking-tight text-[#1a2e23] sm:text-4xl">
                Noyaktig scoring for{" "}
                <span className="text-[#3E715C]">hver transaksjon</span>
              </h2>
              <p className="mt-5 max-w-md text-base leading-relaxed text-[#4a5e52]">
                Hver transaksjon scores pa fire faktorer. Jo hoyere totalpoeng,
                jo sikrere er matchingen. Over 85% godkjennes automatisk.
              </p>
              <BulletList
                items={[
                  "Belopsmatch med toleranse",
                  "Referansenummer-sammenligning",
                  "Datoproksimitet innen 3 dager",
                  "Leverandornavnlikhet via AI",
                ]}
              />
            </div>
          </Reveal>
        </div>
      </SolidSection>

      {/* Text breathing: Bank connections (replaces animation) */}
      <SolidSection>
        <Reveal>
          <div className="mx-auto max-w-2xl text-center">
            <SectionLabel>
              <LandmarkIcon className="h-3.5 w-3.5" />
              Bank-integrasjoner
            </SectionLabel>
            <h2 className="mt-6 text-3xl font-normal tracking-tight text-[#1a2e23] sm:text-4xl">
              Koble til over{" "}
              <span className="text-[#3E715C]">2 500 banker</span>
            </h2>
            <p className="mx-auto mt-5 max-w-lg text-base leading-relaxed text-[#4a5e52]">
              Koble til over 2 500 banker i Europa via GoCardless og Tink.
              Sikker tilkobling med bankens egen godkjenning. PSD2-sertifisert
              og klar pa under 2 minutter.
            </p>
          </div>
        </Reveal>
        <Reveal delay={0.1}>
          <div className="mx-auto mt-10 grid max-w-2xl gap-4 sm:grid-cols-3">
            {[
              { title: "GoCardless", desc: "Direkte bankforbindelse med over 2 300 banker i 30+ land" },
              { title: "Tink", desc: "Open banking-plattform med PSD2-sertifisering og bankID" },
              { title: "PSD2-sikker", desc: "All bankdata overfort med bankens egen godkjenning" },
            ].map((item) => (
              <div key={item.title} className="rounded-xl border border-[#d4dbd6] bg-[#f5f7f2] p-5">
                <p className="text-sm font-medium text-[#1a2e23]">{item.title}</p>
                <p className="mt-2 text-xs leading-relaxed text-[#4a5e52]">{item.desc}</p>
              </div>
            ))}
          </div>
        </Reveal>
      </SolidSection>

      {/* Animation 3: Cluster Learning (Glass, 2-col) */}
      <GlassSection>
        <div className="grid items-center gap-16 lg:grid-cols-2">
          <Reveal className="order-1">
            <div>
              <SectionLabel>
                <NetworkIcon className="h-3.5 w-3.5" />
                Klyngelaering
              </SectionLabel>
              <h2 className="mt-6 text-3xl font-normal tracking-tight text-[#1a2e23] sm:text-4xl">
                Smartere <span className="text-[#3E715C]">over tid</span>
              </h2>
              <p className="mt-5 max-w-md text-base leading-relaxed text-[#4a5e52]">
                Ciri grupperer lignende transaksjoner i klynger og laerer monstrene
                dine. Nye transaksjoner tilordnes automatisk til riktig klynge.
                Etter 3 maneder er de fleste bedrifter over 95% automatisk avstemt.
              </p>
              <BulletList
                items={[
                  "Automatisk klyngegjenkjenning",
                  "Nye transaksjoner tilordnes intelligent",
                  "Mal: 98% automatisk innen 6 maneder",
                ]}
              />
            </div>
          </Reveal>
          <Reveal delay={0.15} className="order-2">
            <div className="min-h-[280px] sm:min-h-[320px]">
              <ClusterLearningAnimation />
            </div>
          </Reveal>
        </div>
      </GlassSection>

      {/* CTA */}
      <MarketingCTA
        title="Klar til a koble til"
        titleAccent="banken din?"
        subtitle="Automatisk avstemming fra dag en. Koble til pa under 2 minutter."
        ctaText="Koble til banken din"
      />
    </>
  );
}
