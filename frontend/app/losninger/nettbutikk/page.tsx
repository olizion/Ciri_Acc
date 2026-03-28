"use client";

import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import {
  StoreIcon,
  ShoppingCartIcon,
  ShoppingBagIcon,
  CheckCircleIcon,
  RefreshCwIcon,
  LinkIcon,
  ActivityIcon,
  CreditCardIcon,
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
// ANIMATION 1: INTEGRATION ORBIT
// ============================================================================

const INTEGRATIONS = [
  { name: "Shopify", color: "#3E715C", angle: 0 },
  { name: "WooCommerce", color: "#7B5EA7", angle: 90 },
  { name: "Klarna", color: "#E8788A", angle: 180 },
  { name: "Vipps", color: "#D4803A", angle: 270 },
] as const;

const ORBIT_RADIUS = 120;
const ORBIT_DURATION_BASE = 12; // seconds per revolution

function IntegrationOrbitAnimation() {
  const [hasEntered, setHasEntered] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [pulseCenter, setPulseCenter] = useState(false);
  const timersRef = useRef<NodeJS.Timeout[]>([]);
  const prefersReducedMotion = useRef(false);

  useEffect(() => {
    prefersReducedMotion.current = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
  }, []);

  const clearTimers = () => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
  };

  const schedule = (fn: () => void, ms: number) => {
    timersRef.current.push(setTimeout(fn, ms));
  };

  // Pulse effect cycle: highlight each integration in sequence
  useEffect(() => {
    if (!hasEntered || prefersReducedMotion.current) return;

    const runPulseCycle = () => {
      clearTimers();

      INTEGRATIONS.forEach((_, i) => {
        schedule(() => {
          setActiveIndex(i);
          setPulseCenter(true);
        }, i * 2200);

        schedule(() => {
          setPulseCenter(false);
        }, i * 2200 + 600);

        schedule(() => {
          setActiveIndex(-1);
        }, i * 2200 + 1400);
      });

      schedule(() => runPulseCycle(), INTEGRATIONS.length * 2200 + 800);
    };

    runPulseCycle();
    return () => clearTimers();
  }, [hasEntered]);

  // Calculate static positions for reduced-motion fallback
  const getStaticPosition = (index: number) => {
    const angleRad =
      ((INTEGRATIONS[index].angle - 90) * Math.PI) / 180;
    return {
      x: Math.cos(angleRad) * ORBIT_RADIUS,
      y: Math.sin(angleRad) * ORBIT_RADIUS,
    };
  };

  return (
    <motion.div
      onViewportEnter={() => setHasEntered(true)}
      viewport={{ once: true, margin: "-100px" }}
      className="relative mx-auto max-w-md"
    >
      <div className="relative overflow-hidden rounded-2xl border border-white/15 bg-white/[0.08] p-6 shadow-2xl backdrop-blur-3xl sm:p-8">
        {/* Glass layers */}
        <div className="pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-br from-white/30 via-transparent to-transparent" />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/60 to-transparent" />

        <div className="relative z-10 flex items-center justify-center py-8">
          {/* Orbit container */}
          <div
            className="relative"
            style={{
              width: ORBIT_RADIUS * 2 + 80,
              height: ORBIT_RADIUS * 2 + 80,
            }}
          >
            {/* Orbit track */}
            <div
              className="absolute rounded-full border border-dashed border-[#3E715C]/15"
              style={{
                top: 40,
                left: 40,
                width: ORBIT_RADIUS * 2,
                height: ORBIT_RADIUS * 2,
              }}
            />

            {/* Center Ciri logo */}
            <motion.div
              animate={
                pulseCenter
                  ? { scale: [1, 1.12, 1] }
                  : { scale: 1 }
              }
              transition={{ duration: 0.5, ease: MARKETING_EASING }}
              className="absolute flex h-[60px] w-[60px] items-center justify-center rounded-full border-2 border-[#3E715C]/30 bg-gradient-to-br from-[#3E715C] to-[#5B906F] shadow-lg shadow-[#3E715C]/20"
              style={{
                top: ORBIT_RADIUS + 40 - 30,
                left: ORBIT_RADIUS + 40 - 30,
              }}
            >
              <span className="text-xl font-bold text-white">C</span>
              {/* Pulse ring on data arrival */}
              {pulseCenter && (
                <motion.div
                  initial={{ opacity: 0.6, scale: 1 }}
                  animate={{ opacity: 0, scale: 2 }}
                  transition={{ duration: 0.8 }}
                  className="absolute inset-0 rounded-full border-2 border-[#3E715C]/40"
                />
              )}
            </motion.div>

            {/* Data stream lines (SVG) */}
            <svg
              className="pointer-events-none absolute inset-0"
              width={ORBIT_RADIUS * 2 + 80}
              height={ORBIT_RADIUS * 2 + 80}
            >
              {INTEGRATIONS.map((integration, i) => {
                const pos = getStaticPosition(i);
                const cx = ORBIT_RADIUS + 40;
                const cy = ORBIT_RADIUS + 40;
                const ix = cx + pos.x;
                const iy = cy + pos.y;
                const isActive = activeIndex === i;

                return (
                  <motion.line
                    key={integration.name}
                    x1={ix}
                    y1={iy}
                    x2={cx}
                    y2={cy}
                    stroke={integration.color}
                    strokeWidth={2}
                    strokeLinecap="round"
                    initial={{ opacity: 0, pathLength: 0 }}
                    animate={
                      isActive
                        ? { opacity: 0.7, pathLength: 1 }
                        : { opacity: 0, pathLength: 0 }
                    }
                    transition={{ duration: 0.5, ease: MARKETING_EASING }}
                  />
                );
              })}
            </svg>

            {/* Orbiting integration icons */}
            {INTEGRATIONS.map((integration, i) => {
              const staticPos = getStaticPosition(i);
              const isReduced = prefersReducedMotion.current;
              const isActive = activeIndex === i;

              return (
                <motion.div
                  key={integration.name}
                  className="absolute"
                  style={{
                    top: ORBIT_RADIUS + 40 - 22,
                    left: ORBIT_RADIUS + 40 - 22,
                  }}
                  initial={{
                    x: staticPos.x,
                    y: staticPos.y,
                    opacity: 0,
                  }}
                  animate={
                    hasEntered
                      ? isReduced
                        ? {
                            x: staticPos.x,
                            y: staticPos.y,
                            opacity: 1,
                          }
                        : {
                            opacity: 1,
                          }
                      : { opacity: 0 }
                  }
                  transition={{ delay: i * 0.15, duration: 0.5 }}
                >
                  {/* Animated orbit wrapper for non-reduced-motion */}
                  <motion.div
                    animate={
                      hasEntered && !isReduced
                        ? {
                            rotate: 360,
                          }
                        : {}
                    }
                    transition={
                      hasEntered && !isReduced
                        ? {
                            duration: ORBIT_DURATION_BASE + i * 2,
                            repeat: Infinity,
                            ease: "linear",
                          }
                        : {}
                    }
                    style={
                      !isReduced
                        ? {
                            width: ORBIT_RADIUS * 2,
                            height: ORBIT_RADIUS * 2,
                            position: "relative" as const,
                            top: -ORBIT_RADIUS + 22,
                            left: -ORBIT_RADIUS + 22,
                          }
                        : {
                            transform: `translate(${staticPos.x}px, ${staticPos.y}px)`,
                          }
                    }
                  >
                    <div
                      style={
                        !isReduced
                          ? {
                              position: "absolute" as const,
                              top: 0,
                              left: ORBIT_RADIUS - 22,
                            }
                          : {}
                      }
                    >
                      {/* Counter-rotate to keep text upright */}
                      <motion.div
                        animate={
                          hasEntered && !isReduced
                            ? { rotate: -360 }
                            : {}
                        }
                        transition={
                          hasEntered && !isReduced
                            ? {
                                duration: ORBIT_DURATION_BASE + i * 2,
                                repeat: Infinity,
                                ease: "linear",
                              }
                            : {}
                        }
                        className="flex h-11 w-11 flex-col items-center justify-center rounded-xl border shadow-md"
                        style={{
                          backgroundColor: `${integration.color}18`,
                          borderColor: `${integration.color}30`,
                          boxShadow: isActive
                            ? `0 0 16px ${integration.color}40`
                            : undefined,
                        }}
                      >
                        <LinkIcon
                          className="h-3.5 w-3.5"
                          style={{ color: integration.color }}
                        />
                        <span
                          className="mt-0.5 text-[6px] font-bold leading-none"
                          style={{ color: integration.color }}
                        >
                          {integration.name}
                        </span>
                      </motion.div>
                    </div>
                  </motion.div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ============================================================================
// ANIMATION 2: ORDER-TO-BOKFORING PIPELINE
// ============================================================================

const PIPELINE_STAGES = [
  {
    label: "Ordre mottatt",
    icon: ShoppingCartIcon,
    detail: "#4521",
    color: "#3E715C",
  },
  {
    label: "Betaling bekreftet",
    icon: CreditCardIcon,
    detail: "Godkjent",
    color: "#5B906F",
  },
  {
    label: "MVA beregnet",
    icon: ActivityIcon,
    detail: "25%",
    color: "#4a8068",
  },
  {
    label: "Bokfort",
    icon: CheckCircleIcon,
    detail: "Konto 3000",
    color: "#3E715C",
  },
] as const;

function OrderPipelineAnimation() {
  const [stage, setStage] = useState(-1);
  const [progress, setProgress] = useState(-1);
  const [complete, setComplete] = useState(false);
  const [hasEntered, setHasEntered] = useState(false);
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
      setStage(-1);
      setProgress(-1);
      setComplete(false);

      let cumulative = 400;

      PIPELINE_STAGES.forEach((_, i) => {
        // Activate stage
        schedule(() => setStage(i), cumulative);
        cumulative += 200;

        // Start progress bar fill
        schedule(() => setProgress(i), cumulative);
        cumulative += 900;
      });

      // Show complete
      schedule(() => setComplete(true), cumulative);

      // Reset
      schedule(() => {
        setStage(-1);
        setProgress(-1);
        setComplete(false);
      }, cumulative + 3000);

      schedule(() => runCycle(), cumulative + 3200);
    };

    runCycle();
    return () => clearTimers();
  }, [hasEntered]);

  return (
    <motion.div
      onViewportEnter={() => setHasEntered(true)}
      viewport={{ once: true, margin: "-100px" }}
      className="mx-auto max-w-2xl"
    >
      <div className="relative overflow-hidden rounded-2xl border border-[#d4dbd6] bg-white p-6 sm:p-8">
        {/* Order info card */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={hasEntered ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
          className="mb-6 rounded-xl border border-[#d4dbd6] bg-[#f5f7f2] p-4"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#3E715C]/10">
                <ShoppingCartIcon className="h-4 w-4 text-[#3E715C]" />
              </div>
              <div>
                <p className="text-xs font-medium text-[#1a2e23]">
                  Ordre #4521
                </p>
                <p className="text-[12px] text-[#8a9a8e]">Ola Nordmann</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm font-medium tabular-nums text-[#1a2e23]">
                kr 1 598
              </p>
              <p className="text-[12px] text-[#8a9a8e]">
                2x Wireless Headset
              </p>
            </div>
          </div>
        </motion.div>

        {/* Pipeline stages */}
        <div className="grid grid-cols-4 gap-2 sm:gap-4">
          {PIPELINE_STAGES.map((s, i) => {
            const Icon = s.icon;
            const isActive = stage >= i;
            const isCurrentStage = stage === i;

            return (
              <motion.div
                key={s.label}
                initial={{ opacity: 0.3 }}
                animate={
                  isActive
                    ? { opacity: 1 }
                    : { opacity: 0.3 }
                }
                transition={{ duration: 0.3, ease: MARKETING_EASING }}
                className="flex flex-col items-center gap-2"
              >
                {/* Stage icon */}
                <motion.div
                  animate={
                    isCurrentStage
                      ? { scale: [1, 1.1, 1] }
                      : { scale: 1 }
                  }
                  transition={{
                    duration: 0.5,
                    ease: MARKETING_EASING,
                  }}
                  className="flex h-12 w-12 items-center justify-center rounded-xl border sm:h-14 sm:w-14"
                  style={{
                    backgroundColor: isActive
                      ? `${s.color}18`
                      : "#f5f7f2",
                    borderColor: isActive
                      ? `${s.color}30`
                      : "#d4dbd6",
                  }}
                >
                  <Icon
                    className="h-5 w-5 sm:h-6 sm:w-6"
                    style={{
                      color: isActive ? s.color : "#8a9a8e",
                    }}
                  />
                </motion.div>

                {/* Stage label */}
                <span
                  className="text-center text-[8px] font-medium tracking-wider uppercase sm:text-[13px]"
                  style={{
                    color: isActive ? s.color : "#8a9a8e",
                  }}
                >
                  {s.label}
                </span>

                {/* Detail tag */}
                <motion.span
                  initial={{ opacity: 0, scale: 0.7 }}
                  animate={
                    isActive
                      ? { opacity: 1, scale: 1 }
                      : { opacity: 0, scale: 0.7 }
                  }
                  transition={{
                    type: "spring",
                    stiffness: 400,
                    damping: 15,
                  }}
                  className="rounded-full px-2 py-0.5 text-[8px] font-bold text-white sm:text-[13px]"
                  style={{ backgroundColor: s.color }}
                >
                  {s.detail}
                </motion.span>

                {/* Progress bar */}
                <div className="h-1 w-full overflow-hidden rounded-full bg-[#d4dbd6]/30">
                  <motion.div
                    initial={{ width: "0%" }}
                    animate={
                      progress >= i
                        ? { width: "100%" }
                        : { width: "0%" }
                    }
                    transition={{
                      duration: 0.7,
                      ease: MARKETING_EASING,
                    }}
                    className="h-full rounded-full"
                    style={{
                      background: `linear-gradient(90deg, ${s.color}, ${s.color}cc)`,
                    }}
                  />
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Complete badge */}
        <motion.div
          initial={{ opacity: 0, scale: 0.6, y: 8 }}
          animate={
            complete
              ? { opacity: 1, scale: 1, y: 0 }
              : { opacity: 0, scale: 0.6, y: 8 }
          }
          transition={{
            type: "spring",
            stiffness: 400,
            damping: 15,
          }}
          className="mt-5 flex items-center justify-center gap-2"
        >
          <div className="flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 shadow-sm">
            <CheckCircleIcon className="h-4 w-4 text-emerald-600" />
            <span className="text-xs font-bold tracking-wider text-emerald-700 uppercase">
              Ferdig!
            </span>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}

// ============================================================================
// ANIMATION 3: LIVE COUNTER WITH SPARKLINE
// ============================================================================

function AnimatedCounter({
  target,
  active,
  duration = 1600,
  suffix = "",
  formatNumber = false,
}: {
  target: number;
  active: boolean;
  duration?: number;
  suffix?: string;
  formatNumber?: boolean;
}) {
  const [value, setValue] = useState(0);
  const frameRef = useRef<number>(0);

  useEffect(() => {
    if (!active) {
      setValue(0);
      return;
    }

    const startTime = performance.now();

    const tick = () => {
      const elapsed = performance.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(eased * target));
      if (progress < 1) {
        frameRef.current = requestAnimationFrame(tick);
      }
    };

    frameRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameRef.current);
  }, [active, target, duration]);

  const display = formatNumber
    ? value.toLocaleString("nb-NO")
    : value.toString();

  return (
    <span className="tabular-nums">
      {display}
      {suffix}
    </span>
  );
}

function LiveCounterAnimation() {
  const [hasEntered, setHasEntered] = useState(false);
  const sparklineRef = useRef<SVGPathElement>(null);

  // Sparkline: 30-day order volume data
  const dataPoints = [
    42, 58, 35, 71, 89, 65, 93, 78, 102, 84, 96, 110, 88, 75, 120,
    95, 108, 130, 115, 98, 142, 125, 138, 155, 128, 148, 162, 145,
    158, 170,
  ];
  const maxVal = Math.max(...dataPoints);
  const svgW = 560;
  const svgH = 120;
  const padding = 12;

  const points = dataPoints.map((v, i) => ({
    x: padding + (i / (dataPoints.length - 1)) * (svgW - padding * 2),
    y: svgH - padding - (v / maxVal) * (svgH - padding * 2),
  }));

  // Smooth curve through points using quadratic bezier
  const pathD = points
    .map((p, i) => {
      if (i === 0) return `M ${p.x} ${p.y}`;
      const prev = points[i - 1];
      const cpx = (prev.x + p.x) / 2;
      return `Q ${cpx} ${prev.y}, ${p.x} ${p.y}`;
    })
    .join(" ");

  // Find peak indices for animated dots
  const peakIndices = dataPoints.reduce<number[]>((peaks, val, i) => {
    if (i === 0 || i === dataPoints.length - 1) return peaks;
    if (val > dataPoints[i - 1] && val > dataPoints[i + 1]) {
      peaks.push(i);
    }
    return peaks;
  }, []);

  useEffect(() => {
    if (!hasEntered || !sparklineRef.current) return;
    const path = sparklineRef.current;
    const length = path.getTotalLength();
    path.style.strokeDasharray = `${length}`;
    path.style.strokeDashoffset = `${length}`;
    // Force reflow
    path.getBoundingClientRect();
    path.style.transition = "stroke-dashoffset 2s ease-out 0.6s";
    path.style.strokeDashoffset = "0";
  }, [hasEntered]);

  const miniStats = [
    { label: "I dag", value: 47, suffix: " ordrer" },
    { label: "Denne uken", value: 312, suffix: " ordrer" },
    { label: "Denne maneden", value: 2847, suffix: " ordrer" },
  ];

  return (
    <motion.div
      onViewportEnter={() => setHasEntered(true)}
      viewport={{ once: true, margin: "-100px" }}
      className="relative mx-auto max-w-xl"
    >
      <div className="relative overflow-hidden rounded-2xl border border-white/15 bg-white/[0.08] p-6 shadow-2xl backdrop-blur-3xl sm:p-8">
        {/* Glass layers */}
        <div className="pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-br from-white/30 via-transparent to-transparent" />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/60 to-transparent" />

        <div className="relative z-10">
          {/* Large counter */}
          <div className="text-center">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={hasEntered ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, ease: MARKETING_EASING }}
            >
              <p className="text-4xl font-medium tracking-tight text-[#1a2e23] sm:text-5xl">
                <AnimatedCounter
                  target={2847}
                  active={hasEntered}
                  duration={2000}
                  formatNumber
                />
              </p>
              <p className="mt-2 text-sm font-medium text-[#4a5e52]">
                ordrer synkronisert
              </p>
            </motion.div>
          </div>

          {/* Sparkline chart */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={hasEntered ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: 0.4, duration: 0.5 }}
            className="mt-8 overflow-hidden rounded-xl border border-white/10 bg-white/[0.06] p-4 backdrop-blur-lg"
          >
            <div className="mb-2 flex items-center justify-between">
              <span className="text-[13px] font-medium tracking-wider text-[#8a9a8e] uppercase">
                Ordrevolum siste 30 dager
              </span>
              <span className="text-[12px] tabular-nums text-[#5B906F]">
                +24%
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

              {/* Area fill under the sparkline */}
              <motion.path
                d={`${pathD} L ${points[points.length - 1].x} ${svgH - padding} L ${points[0].x} ${svgH - padding} Z`}
                fill="url(#nettbutikkSparkGradient)"
                initial={{ opacity: 0 }}
                animate={hasEntered ? { opacity: 0.25 } : {}}
                transition={{ delay: 2.4, duration: 0.6 }}
              />

              {/* Self-drawing sparkline */}
              <path
                ref={sparklineRef}
                d={pathD}
                fill="none"
                stroke="#3E715C"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {/* Animated dots at peaks */}
              {peakIndices.map((pi, di) => (
                <motion.circle
                  key={pi}
                  cx={points[pi].x}
                  cy={points[pi].y}
                  r="4"
                  fill="#3E715C"
                  stroke="white"
                  strokeWidth="2"
                  initial={{ opacity: 0, scale: 0 }}
                  animate={
                    hasEntered ? { opacity: 1, scale: 1 } : {}
                  }
                  transition={{
                    delay: 2.6 + di * 0.15,
                    type: "spring",
                    stiffness: 400,
                    damping: 15,
                  }}
                />
              ))}

              {/* Peak value labels */}
              {peakIndices.map((pi, di) => (
                <motion.text
                  key={`label-${pi}`}
                  x={points[pi].x}
                  y={points[pi].y - 10}
                  textAnchor="middle"
                  fill="#3E715C"
                  fontSize="9"
                  fontWeight="600"
                  initial={{ opacity: 0 }}
                  animate={hasEntered ? { opacity: 0.7 } : {}}
                  transition={{ delay: 2.8 + di * 0.15, duration: 0.4 }}
                >
                  {dataPoints[pi]}
                </motion.text>
              ))}

              <defs>
                <linearGradient
                  id="nettbutikkSparkGradient"
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
          </motion.div>

          {/* Mini stat cards */}
          <div className="mt-4 grid grid-cols-3 gap-3">
            {miniStats.map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 16, scale: 0.95 }}
                animate={
                  hasEntered
                    ? { opacity: 1, y: 0, scale: 1 }
                    : {}
                }
                transition={{
                  delay: 0.8 + i * 0.15,
                  type: "spring",
                  stiffness: 200,
                  damping: 20,
                }}
                className="overflow-hidden rounded-xl border border-white/10 bg-white/[0.06] p-3 text-center backdrop-blur-lg"
              >
                <span className="text-[13px] font-medium tracking-wider text-[#8a9a8e] uppercase">
                  {stat.label}
                </span>
                <p className="mt-1 text-base font-medium text-[#1a2e23] sm:text-lg">
                  <AnimatedCounter
                    target={stat.value}
                    active={hasEntered}
                    duration={1400 + i * 300}
                    formatNumber
                  />
                </p>
                <span className="text-[13px] text-[#8a9a8e]">
                  {stat.suffix.trim()}
                </span>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
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
// PAGE
// ============================================================================

export default function NettbutikkPage() {
  return (
    <>
      <HeroSection
        backgroundImage="/ciribackground6.jpg"
        title="Nettbutikk-regnskap pa autopilot."
        subtitle="Koble til Shopify, WooCommerce eller Klarna. Ciri synkroniserer ordrer og bokforer automatisk."
        ctaText="Koble til nettbutikken din"
        ctaHref="/register"
      />

      {/* Metrics */}
      <PageMetrics stats={[
        { value: "Shopify", label: "Direkte integrasjon" },
        { value: "WooCommerce", label: "Full stotte" },
        { value: "Klarna", label: "Oppgjorsavstemming" },
        { value: "Flervaluta", label: "Automatisk konvertering" },
      ]} />

      {/* Section 1: Integration Orbit (Glass, centered) */}
      <GlassSection>
        <Reveal>
          <div className="text-center">
            <SectionLabel>
              <StoreIcon className="h-3.5 w-3.5" />
              Alle integrasjoner, ett sted
            </SectionLabel>
            <h2 className="mt-6 text-4xl font-normal tracking-tight text-[#1a2e23] sm:text-5xl">
              Alle integrasjoner,{" "}
              <span className="text-[#3E715C]">ett sted</span>
            </h2>
            <p className="mx-auto mt-5 max-w-lg text-base leading-relaxed text-[#4a5e52]">
              Hver ordre synkroniseres automatisk. Flervaluta stottet med automatisk NOK-konvertering ved bokforing.
            </p>
          </div>
        </Reveal>
        <Reveal delay={0.15}>
          <div className="mt-12">
            <IntegrationOrbitAnimation />
          </div>
        </Reveal>
        <Reveal delay={0.25}>
          <ul className="mx-auto mt-10 flex max-w-2xl flex-col gap-3 sm:flex-row sm:gap-8">
            {["Shopify, WooCommerce, Klarna og Vipps", "Automatisk valutakonvertering", "Ordrehistorikk tilgjengelig i sanntid"].map((item) => (
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
        label="For nettbutikker"
        labelIcon={<ShoppingCartIcon className="h-3.5 w-3.5" />}
        heading="Nettbutikk-regnskap"
        headingAccent="pa autopilot"
        description="Synkroniser ordrer, handter retur og avstem Klarna — automatisk."
        features={[
          { icon: <ShoppingBagIcon className="h-5 w-5" />, title: "Ordresynkronisering", desc: "Ordrer fra Shopify og WooCommerce synkroniseres og bokfores i sanntid." },
          { icon: <RefreshCwIcon className="h-5 w-5" />, title: "Returhandtering", desc: "Returer og kreditnotaer bokfores automatisk ved retur i nettbutikken." },
          { icon: <CreditCardIcon className="h-5 w-5" />, title: "Klarna-avstemming", desc: "Automatisk avstemming av Klarna-oppgjor mot ordrer og bankkonto." },
        ]}
      />

      {/* Section 2: Order Pipeline (Solid Cream, 2-col) */}
      <SolidSection variant="cream">
        <div className="mx-auto max-w-5xl">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <Reveal delay={0.15}>
              <div className="min-h-[320px] sm:min-h-[380px]">
                <OrderPipelineAnimation />
              </div>
            </Reveal>
            <FeatureText
              heading="Returer og oppgjor"
              description="Ciri handterer returer, Klarna-oppgjor og delbetaling automatisk. Ingen manuell bokforing nodvendig."
              bullets={[
                "Automatisk returbehandling",
                "Klarna-oppgjorsavsteming",
                "Delbetalinger og avdrag",
                "Gebyr-beregning inkludert",
              ]}
            />
          </div>
        </div>
      </SolidSection>

      {/* Section 3: Live Counter (Glass, 2-col) */}
      <GlassSection>
        <div className="mx-auto max-w-5xl">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <FeatureText
              heading="Skalerer med deg"
              description="Fra 10 ordrer til 10 000 — Ciri handterer volumet. Ingen ekstra oppsett nodvendig nar du vokser."
              bullets={[
                "Ubegrenset antall ordrer",
                "Ingen ekstra kostnad per ordre",
                "Automatisk skalering",
              ]}
            />
            <Reveal delay={0.15}>
              <div className="min-h-[320px] sm:min-h-[380px]">
                <LiveCounterAnimation />
              </div>
            </Reveal>
          </div>
        </div>
      </GlassSection>

      {/* CTA */}
      <MarketingCTA
        title="Klar til a automatisere"
        titleAccent="nettbutikk-regnskapet?"
        subtitle="Koble til pa under 5 minutter. Stotter alle store plattformer."
        ctaText="Koble til nettbutikken din"
      />
    </>
  );
}
