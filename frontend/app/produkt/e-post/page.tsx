"use client";

import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import {
  MailIcon,
  ScanSearchIcon,
  CheckCircleIcon,
  CopyIcon,
  FileTextIcon,
  ZapIcon,
  ActivityIcon,
  ScanIcon,
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

// ============================================================================
// ANIMATION 1: EMAIL PIPELINE
// ============================================================================

function EmailPipelineAnimation() {
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
      schedule(() => setPhase(1), 400);
      schedule(() => setPhase(2), 1200);
      schedule(() => setPhase(3), 2000);
      schedule(() => setPhase(4), 2800);
      schedule(() => setPhase(5), 3600);
      schedule(() => setPhase(0), 6400);
      schedule(() => runCycle(), 6600);
    };
    runCycle();
    return () => clearTimers();
  }, [hasEntered]);

  const tags = [
    { label: "Leverandor", color: "#3E715C" },
    { label: "kr 12 400", color: "#5B906F" },
    { label: "MVA 25%", color: "#4a8068" },
  ];

  return (
    <div ref={viewportRef} className="relative mx-auto max-w-2xl">

      <div className="relative overflow-hidden rounded-2xl border border-white/15 bg-white/[0.08] p-6 shadow-2xl backdrop-blur-3xl sm:p-8">
        {/* Glass layers */}
        <div className="pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-br from-white/30 via-transparent to-transparent" />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/60 to-transparent" />

        <div className="relative z-10">
          {/* Pipeline stages */}
          <div className="flex items-center justify-between gap-2 sm:gap-4">
            {/* Stage 1: Email Envelope */}
            <div className="flex flex-1 flex-col items-center gap-2">
              <motion.div
                initial={{ opacity: 0, rotateX: -90 }}
                animate={
                  phase >= 1
                    ? { opacity: 1, rotateX: 0 }
                    : { opacity: 0.3, rotateX: -90 }
                }
                transition={{
                  duration: 0.6,
                  ease: MARKETING_EASING,
                }}
                style={{ perspective: 400 }}
                className="flex h-14 w-14 items-center justify-center rounded-xl border border-[#3E715C]/20 bg-[#3E715C]/10 sm:h-16 sm:w-16"
              >
                <MailIcon className="h-6 w-6 text-[#3E715C] sm:h-7 sm:w-7" />
              </motion.div>
              <span className="text-[13px] font-medium tracking-wider text-[#8a9a8e] uppercase sm:text-[12px]">
                E-post
              </span>
            </div>

            {/* Connector 1->2 */}
            <motion.div
              initial={{ scaleX: 0, opacity: 0 }}
              animate={
                phase >= 2
                  ? { scaleX: 1, opacity: 1 }
                  : { scaleX: 0, opacity: 0 }
              }
              transition={{ duration: 0.4, ease: MARKETING_EASING }}
              className="mt-[-20px] hidden h-px w-8 origin-left bg-gradient-to-r from-[#3E715C]/40 to-[#3E715C]/20 sm:block lg:w-12"
            />

            {/* Stage 2: PDF Attachment */}
            <div className="flex flex-1 flex-col items-center gap-2">
              <motion.div
                initial={{ opacity: 0, y: -20, x: -10 }}
                animate={
                  phase >= 2
                    ? { opacity: 1, y: 0, x: 0 }
                    : { opacity: 0.15, y: -20, x: -10 }
                }
                transition={{
                  duration: 0.5,
                  ease: MARKETING_EASING,
                }}
                className="flex h-14 w-14 items-center justify-center rounded-xl border border-[#5B906F]/20 bg-[#5B906F]/10 sm:h-16 sm:w-16"
              >
                <FileTextIcon className="h-6 w-6 text-[#5B906F] sm:h-7 sm:w-7" />
              </motion.div>
              <span className="text-[13px] font-medium tracking-wider text-[#8a9a8e] uppercase sm:text-[12px]">
                Vedlegg
              </span>
            </div>

            {/* Connector 2->3 */}
            <motion.div
              initial={{ scaleX: 0, opacity: 0 }}
              animate={
                phase >= 3
                  ? { scaleX: 1, opacity: 1 }
                  : { scaleX: 0, opacity: 0 }
              }
              transition={{ duration: 0.4, ease: MARKETING_EASING }}
              className="mt-[-20px] hidden h-px w-8 origin-left bg-gradient-to-r from-[#5B906F]/40 to-[#5B906F]/20 sm:block lg:w-12"
            />

            {/* Stage 3: OCR Scan */}
            <div className="flex flex-1 flex-col items-center gap-2">
              <div className="relative">
                <motion.div
                  initial={{ opacity: 0.15 }}
                  animate={
                    phase >= 3 ? { opacity: 1 } : { opacity: 0.15 }
                  }
                  transition={{ duration: 0.4 }}
                  className="flex h-14 w-14 items-center justify-center rounded-xl border border-[#4a8068]/20 bg-[#4a8068]/10 sm:h-16 sm:w-16"
                >
                  <ScanSearchIcon className="h-6 w-6 text-[#4a8068] sm:h-7 sm:w-7" />
                </motion.div>
                {/* Scan line */}
                {phase === 3 && (
                  <motion.div
                    initial={{ left: 0 }}
                    animate={{ left: "100%" }}
                    transition={{ duration: 0.7, ease: "easeInOut" }}
                    className="pointer-events-none absolute inset-y-0 z-20 w-0.5 bg-[#3E715C] shadow-[0_0_8px_rgba(62,113,92,0.6)]"
                  />
                )}
                {/* OCR badge */}
                <motion.span
                  initial={{ opacity: 0, scale: 0.6 }}
                  animate={
                    phase >= 3
                      ? { opacity: 1, scale: 1 }
                      : { opacity: 0, scale: 0.6 }
                  }
                  transition={{
                    delay: 0.2,
                    type: "spring",
                    stiffness: 400,
                    damping: 15,
                  }}
                  className="absolute -top-2 -right-2 rounded-full bg-[#3E715C] px-1.5 py-0.5 text-[8px] font-bold text-white"
                >
                  OCR
                </motion.span>
              </div>
              <span className="text-[13px] font-medium tracking-wider text-[#8a9a8e] uppercase sm:text-[12px]">
                OCR
              </span>
            </div>

            {/* Connector 3->4 */}
            <motion.div
              initial={{ scaleX: 0, opacity: 0 }}
              animate={
                phase >= 4
                  ? { scaleX: 1, opacity: 1 }
                  : { scaleX: 0, opacity: 0 }
              }
              transition={{ duration: 0.4, ease: MARKETING_EASING }}
              className="mt-[-20px] hidden h-px w-8 origin-left bg-gradient-to-r from-[#4a8068]/40 to-[#4a8068]/20 sm:block lg:w-12"
            />

            {/* Stage 4: Data Fields */}
            <div className="flex flex-1 flex-col items-center gap-2">
              <motion.div
                initial={{ opacity: 0.15 }}
                animate={
                  phase >= 4 ? { opacity: 1 } : { opacity: 0.15 }
                }
                transition={{ duration: 0.4 }}
                className="flex h-14 w-14 flex-col items-center justify-center gap-0.5 rounded-xl border border-[#6aaa88]/20 bg-[#6aaa88]/10 sm:h-16 sm:w-16"
              >
                {tags.map((tag, i) => (
                  <motion.span
                    key={tag.label}
                    initial={{ opacity: 0, x: 10 }}
                    animate={
                      phase >= 4
                        ? { opacity: 1, x: 0 }
                        : { opacity: 0, x: 10 }
                    }
                    transition={{
                      delay: i * 0.12,
                      duration: 0.3,
                      ease: MARKETING_EASING,
                    }}
                    className="rounded-full px-1 py-px text-[6px] font-medium text-white sm:text-[7px]"
                    style={{ backgroundColor: tag.color }}
                  >
                    {tag.label}
                  </motion.span>
                ))}
              </motion.div>
              <span className="text-[13px] font-medium tracking-wider text-[#8a9a8e] uppercase sm:text-[12px]">
                Data
              </span>
            </div>

            {/* Connector 4->5 */}
            <motion.div
              initial={{ scaleX: 0, opacity: 0 }}
              animate={
                phase >= 5
                  ? { scaleX: 1, opacity: 1 }
                  : { scaleX: 0, opacity: 0 }
              }
              transition={{ duration: 0.4, ease: MARKETING_EASING }}
              className="mt-[-20px] hidden h-px w-8 origin-left bg-gradient-to-r from-[#6aaa88]/40 to-[#6aaa88]/20 sm:block lg:w-12"
            />

            {/* Stage 5: Bokfort stamp */}
            <div className="flex flex-1 flex-col items-center gap-2">
              <motion.div
                initial={{ opacity: 0.15, scale: 0.6 }}
                animate={
                  phase >= 5
                    ? { opacity: 1, scale: [1.15, 1] }
                    : { opacity: 0.15, scale: 0.6 }
                }
                transition={{
                  duration: 0.5,
                  ease: MARKETING_EASING,
                }}
                className="flex h-14 w-14 items-center justify-center rounded-xl border border-emerald-300/30 bg-emerald-50/80 sm:h-16 sm:w-16"
              >
                <CheckCircleIcon className="h-6 w-6 text-emerald-600 sm:h-7 sm:w-7" />
              </motion.div>
              <motion.span
                initial={{ opacity: 0 }}
                animate={
                  phase >= 5 ? { opacity: 1 } : { opacity: 0 }
                }
                className="text-[13px] font-bold tracking-wider text-emerald-600 uppercase sm:text-[12px]"
              >
                Bokfort
              </motion.span>
            </div>
          </div>

          {/* Progress bar under pipeline */}
          <div className="relative mx-auto mt-6 h-1 max-w-md overflow-hidden rounded-full bg-[#d4dbd6]/30">
            <motion.div
              initial={{ width: "0%" }}
              animate={{ width: `${Math.min(phase, 5) * 20}%` }}
              transition={{ duration: 0.5, ease: MARKETING_EASING }}
              className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-[#3E715C] to-[#5B906F]"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// ANIMATION 2: DUPLICATE DETECTOR
// ============================================================================

function DuplicateDetectorAnimation() {
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
      schedule(() => setPhase(1), 400);   // Magnifying glass appears, starts left
      schedule(() => setPhase(2), 1600);  // Magnifying glass moves to center
      schedule(() => setPhase(3), 2800);  // Duplicate detected - right card glows red
      schedule(() => setPhase(4), 3800);  // Right card dissolves, left gets checkmark
      schedule(() => setPhase(0), 6600);
      schedule(() => runCycle(), 6800);
    };
    runCycle();
    return () => clearTimers();
  }, [hasEntered]);

  const invoiceData = {
    number: "Faktura #2026-0089",
    supplier: "Kontorpartner AS",
    amount: "kr 4 250",
  };

  return (
    <div ref={viewportRef} className="mx-auto max-w-md">

      <div className="relative overflow-hidden rounded-2xl border border-[#d4dbd6] bg-white p-6 sm:p-8">
        {/* The two invoice cards */}
        <div className="relative flex items-stretch gap-4">
          {/* Left card (original) */}
          <div className="relative flex-1 overflow-hidden rounded-xl border border-[#d4dbd6] bg-[#f5f7f2] p-4">
            <div className="space-y-2">
              <div className="flex items-center gap-1.5">
                <FileTextIcon className="h-3.5 w-3.5 text-[#8a9a8e]" />
                <span className="text-[12px] font-medium text-[#4a5e52]">
                  {invoiceData.number}
                </span>
              </div>
              <p className="text-xs font-medium text-[#1a2e23]">
                {invoiceData.supplier}
              </p>
              <p className="text-lg font-medium tabular-nums text-[#1a2e23]">
                {invoiceData.amount}
              </p>
              <div className="flex items-center gap-1">
                <div className="h-1.5 w-16 rounded-full bg-[#d4dbd6]" />
                <div className="h-1.5 w-10 rounded-full bg-[#d4dbd6]" />
              </div>
            </div>
            {/* Green checkmark badge */}
            <motion.div
              initial={{ opacity: 0, scale: 0 }}
              animate={
                phase >= 4
                  ? { opacity: 1, scale: 1 }
                  : { opacity: 0, scale: 0 }
              }
              transition={{
                type: "spring",
                stiffness: 400,
                damping: 15,
              }}
              className="absolute -top-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500 shadow-lg shadow-emerald-500/30"
            >
              <CheckCircleIcon className="h-4 w-4 text-white" />
            </motion.div>
          </div>

          {/* Right card (duplicate) */}
          <motion.div
            initial={{ opacity: 1, scale: 1 }}
            animate={
              phase >= 4
                ? { opacity: 0, scale: 0.7 }
                : phase >= 3
                  ? { opacity: 1, scale: 1 }
                  : { opacity: 1, scale: 1 }
            }
            transition={{
              duration: 0.6,
              ease: MARKETING_EASING,
            }}
            className="relative flex-1 overflow-hidden rounded-xl border border-[#d4dbd6] bg-[#f5f7f2] p-4"
          >
            {/* Red glow overlay for duplicate */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={
                phase >= 3 && phase < 4
                  ? { opacity: 1 }
                  : { opacity: 0 }
              }
              transition={{ duration: 0.4 }}
              className="pointer-events-none absolute inset-0 rounded-xl border-2 border-red-400/60 bg-red-50/30"
            />
            <div className="space-y-2">
              <div className="flex items-center gap-1.5">
                <CopyIcon className="h-3.5 w-3.5 text-[#8a9a8e]" />
                <span className="text-[12px] font-medium text-[#4a5e52]">
                  {invoiceData.number}
                </span>
              </div>
              <p className="text-xs font-medium text-[#1a2e23]">
                {invoiceData.supplier}
              </p>
              <p className="text-lg font-medium tabular-nums text-[#1a2e23]">
                {invoiceData.amount}
              </p>
              <div className="flex items-center gap-1">
                <div className="h-1.5 w-16 rounded-full bg-[#d4dbd6]" />
                <div className="h-1.5 w-10 rounded-full bg-[#d4dbd6]" />
              </div>
            </div>
            {/* Duplicate badge */}
            <motion.div
              initial={{ opacity: 0, scale: 0 }}
              animate={
                phase >= 3 && phase < 4
                  ? { opacity: 1, scale: 1 }
                  : { opacity: 0, scale: 0 }
              }
              transition={{
                type: "spring",
                stiffness: 400,
                damping: 15,
              }}
              className="absolute -top-1 -right-1 rounded-full bg-red-500 px-2 py-0.5 text-[8px] font-bold text-white shadow-lg shadow-red-500/30"
            >
              DUPLIKAT
            </motion.div>
          </motion.div>

          {/* Magnifying glass overlay */}
          <motion.div
            initial={{ opacity: 0, x: "-20%", y: "-50%" }}
            animate={
              phase >= 1 && phase < 4
                ? phase >= 2
                  ? { opacity: 1, x: "calc(50% - 16px)", y: "-50%" }
                  : { opacity: 1, x: "-20%", y: "-50%" }
                : { opacity: 0, x: "-20%", y: "-50%" }
            }
            transition={{ duration: 0.8, ease: MARKETING_EASING }}
            className="pointer-events-none absolute top-1/2 left-0 z-20"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/90 shadow-lg ring-2 ring-[#3E715C]/30">
              <ScanSearchIcon className="h-4 w-4 text-[#3E715C]" />
            </div>
          </motion.div>
        </div>

        {/* Status text */}
        <div className="mt-4 text-center">
          <motion.p
            key={phase >= 4 ? "resolved" : phase >= 3 ? "found" : "scanning"}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="text-xs font-medium"
          >
            {phase >= 4 ? (
              <span className="text-emerald-600">
                Duplikat fjernet. Original beholdt.
              </span>
            ) : phase >= 3 ? (
              <span className="text-red-500">
                Duplikat oppdaget! Fjerner kopi...
              </span>
            ) : phase >= 1 ? (
              <span className="text-[#4a5e52]">
                Skanner for duplikater...
              </span>
            ) : (
              <span className="text-[#8a9a8e]">
                Venter pa nye fakturaer
              </span>
            )}
          </motion.p>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// ANIMATION 3: PROCESSING DASHBOARD
// ============================================================================

function AnimatedCounter({
  target,
  decimals = 0,
  suffix = "",
  active,
}: {
  target: number;
  decimals?: number;
  suffix?: string;
  active: boolean;
}) {
  const [value, setValue] = useState(0);
  const frameRef = useRef<number>(0);

  useEffect(() => {
    if (!active) {
      setValue(0);
      return;
    }
    const duration = 1400;
    const startTime = performance.now();

    const tick = () => {
      const elapsed = performance.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(eased * target);
      if (progress < 1) {
        frameRef.current = requestAnimationFrame(tick);
      }
    };
    frameRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameRef.current);
  }, [active, target]);

  return (
    <span className="tabular-nums">
      {value.toFixed(decimals)}
      {suffix}
    </span>
  );
}

function ProcessingDashboardAnimation() {
  const { ref: viewportRef, hasEntered } = useMarketingViewport();
  const sparklineRef = useRef<SVGPathElement>(null);

  // Sparkline data points (7 days)
  const dataPoints = [12, 28, 19, 35, 42, 38, 47];
  const maxVal = Math.max(...dataPoints);
  const svgW = 280;
  const svgH = 60;
  const padding = 8;

  const points = dataPoints.map((v, i) => ({
    x: padding + (i / (dataPoints.length - 1)) * (svgW - padding * 2),
    y: svgH - padding - (v / maxVal) * (svgH - padding * 2),
  }));

  const pathD = points
    .map((p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`))
    .join(" ");

  useEffect(() => {
    if (!hasEntered || !sparklineRef.current) return;
    const path = sparklineRef.current;
    const length = path.getTotalLength();
    path.style.strokeDasharray = `${length}`;
    path.style.strokeDashoffset = `${length}`;
    // Force reflow
    path.getBoundingClientRect();
    path.style.transition = "stroke-dashoffset 1.5s ease-out 0.8s";
    path.style.strokeDashoffset = "0";
  }, [hasEntered]);

  const stats = [
    {
      label: "Behandlet i dag",
      value: 47,
      decimals: 0,
      suffix: "",
      icon: <MailIcon className="h-3.5 w-3.5" />,
    },
    {
      label: "Suksessrate",
      value: 98.2,
      decimals: 1,
      suffix: "%",
      icon: <CheckCircleIcon className="h-3.5 w-3.5" />,
    },
    {
      label: "Gjennomsnitt",
      value: 3.4,
      decimals: 1,
      suffix: "s",
      icon: <ZapIcon className="h-3.5 w-3.5" />,
    },
    {
      label: "I ko",
      value: 2,
      decimals: 0,
      suffix: "",
      icon: <ActivityIcon className="h-3.5 w-3.5" />,
    },
  ];

  return (
    <div ref={viewportRef} className="relative mx-auto max-w-lg">
      <div className="relative overflow-hidden rounded-2xl border border-white/15 bg-white/[0.08] p-6 shadow-2xl backdrop-blur-3xl">
        {/* Glass layers */}
        <div className="pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-br from-white/30 via-transparent to-transparent" />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/60 to-transparent" />

        <div className="relative z-10">
          {/* Dashboard header */}
          <div className="mb-5 flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#3E715C]/10">
              <ActivityIcon className="h-3.5 w-3.5 text-[#5B906F]" />
            </div>
            <div>
              <p className="text-xs font-medium text-[#1a2e23]">
                E-post behandling
              </p>
              <p className="text-[12px] text-[#8a9a8e]">Siste 24 timer</p>
            </div>
          </div>

          {/* 2x2 stat cards */}
          <div className="grid grid-cols-2 gap-3">
            {stats.map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={
                  hasEntered
                    ? { opacity: 1, y: 0, scale: 1 }
                    : {}
                }
                transition={{
                  delay: 0.2 + i * 0.12,
                  type: "spring",
                  stiffness: 200,
                  damping: 20,
                }}
                className="overflow-hidden rounded-xl border border-white/10 bg-white/[0.06] p-3 backdrop-blur-lg"
              >
                <div className="mb-1.5 flex items-center gap-1.5">
                  <div className="text-[#5B906F]">{stat.icon}</div>
                  <span className="text-[13px] font-medium tracking-wider text-[#8a9a8e] uppercase">
                    {stat.label}
                  </span>
                </div>
                <p className="text-xl font-medium text-[#1a2e23]">
                  <AnimatedCounter
                    target={stat.value}
                    decimals={stat.decimals}
                    suffix={stat.suffix}
                    active={hasEntered}
                  />
                </p>
              </motion.div>
            ))}
          </div>

          {/* Sparkline graph */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={hasEntered ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: 0.8, duration: 0.5 }}
            className="mt-4 overflow-hidden rounded-xl border border-white/10 bg-white/[0.06] p-3 backdrop-blur-lg"
          >
            <div className="mb-2 flex items-center justify-between">
              <span className="text-[13px] font-medium tracking-wider text-[#8a9a8e] uppercase">
                Siste 7 dager
              </span>
              <span className="text-[12px] tabular-nums text-[#5B906F]">
                +18%
              </span>
            </div>
            <svg
              viewBox={`0 0 ${svgW} ${svgH}`}
              className="w-full"
              preserveAspectRatio="none"
            >
              {/* Grid lines */}
              {[0.25, 0.5, 0.75].map((frac) => (
                <line
                  key={frac}
                  x1={padding}
                  y1={svgH * frac}
                  x2={svgW - padding}
                  y2={svgH * frac}
                  stroke="#d4dbd6"
                  strokeWidth="0.5"
                  strokeDasharray="4 4"
                  opacity="0.3"
                />
              ))}
              {/* Area fill */}
              <motion.path
                d={`${pathD} L ${points[points.length - 1].x} ${svgH - padding} L ${points[0].x} ${svgH - padding} Z`}
                fill="url(#sparkGradient)"
                initial={{ opacity: 0 }}
                animate={hasEntered ? { opacity: 0.3 } : {}}
                transition={{ delay: 2.2, duration: 0.5 }}
              />
              {/* Line */}
              <path
                ref={sparklineRef}
                d={pathD}
                fill="none"
                stroke="#3E715C"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              {/* Data point dots */}
              {points.map((p, i) => (
                <motion.circle
                  key={i}
                  cx={p.x}
                  cy={p.y}
                  r="3"
                  fill="#3E715C"
                  stroke="white"
                  strokeWidth="1.5"
                  initial={{ opacity: 0, scale: 0 }}
                  animate={
                    hasEntered ? { opacity: 1, scale: 1 } : {}
                  }
                  transition={{
                    delay: 2.0 + i * 0.1,
                    type: "spring",
                    stiffness: 400,
                    damping: 15,
                  }}
                />
              ))}
              <defs>
                <linearGradient
                  id="sparkGradient"
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop offset="0%" stopColor="#3E715C" />
                  <stop
                    offset="100%"
                    stopColor="#3E715C"
                    stopOpacity="0"
                  />
                </linearGradient>
              </defs>
            </svg>
            {/* Day labels */}
            <div className="mt-1 flex justify-between px-1">
              {["Man", "Tir", "Ons", "Tor", "Fre", "Lor", "Son"].map(
                (day) => (
                  <span
                    key={day}
                    className="text-[8px] text-[#8a9a8e]"
                  >
                    {day}
                  </span>
                )
              )}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// PAGE
// ============================================================================

export default function EpostPage() {
  return (
    <>
      {/* Hero */}
      <HeroSection
        backgroundImage="/ciribackground7.jpg"
        title="Innboksen din jobber for deg."
        subtitle="Koble til Gmail eller Outlook. Ciri henter fakturaer, kjorer OCR og bokforer — automatisk."
        ctaText="Koble til e-posten din"
        ctaHref="/register"
      />

      {/* Metrics */}
      <PageMetrics
        stats={[
          { value: "Gmail + Outlook", label: "E-postintegrasjoner" },
          { value: "Auto-OCR", label: "Vedlegg leses automatisk" },
          { value: "Duplikatsjekk", label: "Ingen doble bilag" },
          { value: "24/7", label: "Kontinuerlig overvaking" },
        ]}
      />

      {/* Section 1: Email Pipeline Animation (centered, Glass) */}
      <GlassSection>
        <Reveal>
          <div className="text-center">
            <SectionLabel>
              <MailIcon className="h-3.5 w-3.5" />
              Automatisk fakturainnhenting
            </SectionLabel>
            <h2 className="mt-6 text-4xl font-normal tracking-tight text-[#1a2e23] sm:text-5xl">
              Fra innboks til{" "}
              <span className="text-[#3E715C]">hovedbok</span>
            </h2>
            <p className="mx-auto mt-5 max-w-lg text-base leading-relaxed text-[#4a5e52]">
              E-post inn. Vedlegg ut. OCR kjorer. Data ekstraheres.
              Bokforing ferdig — alt uten et eneste klikk.
            </p>
          </div>
        </Reveal>
        <Reveal delay={0.15}>
          <div className="mt-12 min-h-[200px] overflow-hidden">
            <EmailPipelineAnimation />
          </div>
        </Reveal>
        <Reveal delay={0.25}>
          <ul className="mx-auto mt-10 flex max-w-2xl flex-col gap-3 sm:flex-row sm:gap-8">
            {[
              "Gmail og Outlook stottet",
              "OAuth 2.0 — ingen passord",
              "Kun vedlegg leses, ikke e-postinnhold",
            ].map((item) => (
              <li key={item} className="flex items-start gap-2 text-sm text-[#4a5e52]">
                <CheckCircleIcon className="mt-0.5 h-4 w-4 shrink-0 text-[#5B906F]" />
                {item}
              </li>
            ))}
          </ul>
        </Reveal>
      </GlassSection>

      {/* FeatureGrid */}
      <FeatureGrid
        label="E-postfunksjoner"
        labelIcon={<MailIcon className="h-3.5 w-3.5" />}
        heading="Innboksen din"
        headingAccent="jobber for deg"
        description="Ciri leser e-post, trekker ut vedlegg og bokforer bilag automatisk."
        features={[
          { icon: <MailIcon className="h-5 w-5" />, title: "OAuth-integrasjon", desc: "Sikker tilkobling til Gmail og Outlook uten a dele passord." },
          { icon: <ScanIcon className="h-5 w-5" />, title: "Automatisk OCR", desc: "Vedlegg leses og tolkes automatisk med Claude Vision AI." },
          { icon: <CopyIcon className="h-5 w-5" />, title: "Duplikatdeteksjon", desc: "Ciri gjenkjenner duplikater og hindrer dobbel bokforing." },
        ]}
      />

      {/* Section 2: Duplicate Detector (SolidSection cream, 2-col: anim + text) */}
      <SolidSection variant="cream">
        <div className="grid items-center gap-16 lg:grid-cols-2">
          <Reveal delay={0.15}>
            <div className="min-h-[320px] sm:min-h-[380px] overflow-hidden">
              <DuplicateDetectorAnimation />
            </div>
          </Reveal>
          <Reveal>
            <div>
              <SectionLabel>
                <ScanSearchIcon className="h-3.5 w-3.5" />
                AI-kategorisering
              </SectionLabel>
              <h2 className="mt-6 text-3xl font-normal tracking-tight text-[#1a2e23] sm:text-4xl">
                Smartere for{" "}
                <span className="text-[#3E715C]">hver faktura</span>
              </h2>
              <p className="mt-5 max-w-md text-base leading-relaxed text-[#4a5e52]">
                Ciri laerer fra dine korreksjoner og kategoriserer stadig
                bedre. Flersidig stotte for lange fakturaer.
              </p>
              <BulletList
                items={[
                  "Laerer fra dine rettelser",
                  "Flersidig PDF-stotte",
                  "Duplikatdeteksjon i sanntid",
                ]}
              />
            </div>
          </Reveal>
        </div>
      </SolidSection>

      {/* Section 3: Processing Dashboard (GlassSection, 2-col: text + anim) */}
      <GlassSection>
        <div className="grid items-center gap-16 lg:grid-cols-2">
          <Reveal>
            <div>
              <SectionLabel>
                <ActivityIcon className="h-3.5 w-3.5" />
                Full oversikt
              </SectionLabel>
              <h2 className="mt-6 text-3xl font-normal tracking-tight text-[#1a2e23] sm:text-4xl">
                Alt pa{" "}
                <span className="text-[#3E715C]">ett dashbord</span>
              </h2>
              <p className="mt-5 max-w-md text-base leading-relaxed text-[#4a5e52]">
                Se alle behandlede e-poster, status og statistikk. Filtrer
                pa dato, leverandor eller status.
              </p>
              <BulletList
                items={[
                  "Sanntidsstatistikk",
                  "Feilrapportering med detaljer",
                  "Historikk og sokefilter",
                ]}
              />
            </div>
          </Reveal>
          <Reveal delay={0.15}>
            <div className="min-h-[320px] sm:min-h-[380px] overflow-hidden">
              <ProcessingDashboardAnimation />
            </div>
          </Reveal>
        </div>
      </GlassSection>

      {/* CTA */}
      <MarketingCTA
        title="Klar til a automatisere"
        titleAccent="e-posten din?"
        subtitle="Koble til pa under ett minutt. Ingen installasjon nodvendig."
        ctaText="Koble til e-posten din"
      />
    </>
  );
}
