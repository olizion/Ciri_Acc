"use client";
import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import {
  UserIcon,
  ClockIcon,
  CheckCircleIcon,
  CalculatorIcon,
  ZapIcon,
  TrendingUpIcon,
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
// CONSTANTS
// ============================================================================

const SOLO_DAY_EVENTS = [
  {
    time: "09:00",
    label: "Faktura mottatt",
    icon: "mail",
    tag: null,
    tagColor: null,
  },
  {
    time: "09:01",
    label: "OCR ferdig",
    icon: "scan",
    tag: null,
    tagColor: null,
  },
  {
    time: "09:02",
    label: "Bokfort automatisk",
    icon: "book",
    tag: "Konto 6300",
    tagColor: "#3E715C",
  },
  {
    time: "12:00",
    label: "MVA beregnet",
    icon: "calculator",
    tag: "kr 1 062,50",
    tagColor: "#5B906F",
  },
  {
    time: "17:00",
    label: "Dagsrapport klar",
    icon: "chart",
    tag: null,
    tagColor: null,
  },
];

const EXPENSES = [
  { label: "Kontorrekvisita", amount: "kr 450", path: "full", percent: null },
  { label: "Lunsj", amount: "kr 180", path: "none", percent: null },
  { label: "Mobiltelefon", amount: "kr 399", path: "partial", percent: "50%" },
  { label: "Programvare", amount: "kr 990", path: "full", percent: null },
  { label: "Kaffebar-mote", amount: "kr 320", path: "partial", percent: null },
  { label: "Parkering", amount: "kr 85", path: "full", percent: null },
];

const COMPARISON_BARS = [
  {
    label: "Manuelt (Excel)",
    width: 95,
    detail: "12 timer/mnd",
    color: "#dc2626",
    icon: "clock",
  },
  {
    label: "Regnskapsforer",
    width: 40,
    detail: "5 timer/mnd + kr 3 500",
    color: "#d97706",
    icon: "user",
  },
  {
    label: "Ciri",
    width: 8,
    detail: "1 time/mnd + kr 149",
    color: "#5B906F",
    icon: "zap",
  },
];

// ============================================================================
// ANIMATION 1: Solo Day Timeline
// ============================================================================

function SoloDayAnimation() {
  const prefersReduced = usePrefersReducedMotion();
  const [hasStarted, setHasStarted] = useState(false);
  const [visibleEvents, setVisibleEvents] = useState(0);
  const [dotProgress, setDotProgress] = useState(0);
  const timersRef = useRef<NodeJS.Timeout[]>([]);
  const frameRef = useRef<number>(0);

  const clearTimers = () => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
    if (frameRef.current) {
      cancelAnimationFrame(frameRef.current);
      frameRef.current = 0;
    }
  };

  const schedule = (fn: () => void, ms: number) => {
    const t = setTimeout(fn, ms);
    timersRef.current.push(t);
  };

  useEffect(() => {
    if (!hasStarted) return;

    if (prefersReduced) {
      setVisibleEvents(SOLO_DAY_EVENTS.length);
      setDotProgress(1);
      return;
    }

    const runCycle = () => {
      clearTimers();
      setVisibleEvents(0);
      setDotProgress(0);

      SOLO_DAY_EVENTS.forEach((_, i) => {
        schedule(() => {
          setVisibleEvents(i + 1);
          // Animate dot to the position of this event
          const targetProgress = (i + 1) / SOLO_DAY_EVENTS.length;
          const duration = 500;
          const startTime = performance.now();
          const startProgress = i / SOLO_DAY_EVENTS.length;

          const tick = (now: number) => {
            const elapsed = now - startTime;
            const t = Math.min(elapsed / duration, 1);
            const eased = 1 - Math.pow(1 - t, 3);
            setDotProgress(startProgress + (targetProgress - startProgress) * eased);
            if (t < 1) {
              frameRef.current = requestAnimationFrame(tick);
            }
          };
          frameRef.current = requestAnimationFrame(tick);
        }, i * 600);
      });

      // Loop after pause
      schedule(() => {
        setVisibleEvents(0);
        setDotProgress(0);
        schedule(() => runCycle(), 600);
      }, SOLO_DAY_EVENTS.length * 600 + 4000);
    };

    runCycle();
    return () => clearTimers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasStarted, prefersReduced]);

  useEffect(() => {
    return () => clearTimers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const renderIcon = (icon: string) => {
    const cls = "h-4 w-4";
    switch (icon) {
      case "mail":
        return (
          <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect width="20" height="16" x="2" y="4" rx="2" />
            <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
          </svg>
        );
      case "scan":
        return (
          <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 7V5a2 2 0 0 1 2-2h2" />
            <path d="M17 3h2a2 2 0 0 1 2 2v2" />
            <path d="M21 17v2a2 2 0 0 1-2 2h-2" />
            <path d="M7 21H5a2 2 0 0 1-2-2v-2" />
            <line x1="7" x2="17" y1="12" y2="12" />
          </svg>
        );
      case "book":
        return (
          <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" />
          </svg>
        );
      case "calculator":
        return <CalculatorIcon className={cls} />;
      case "chart":
        return <TrendingUpIcon className={cls} />;
      default:
        return null;
    }
  };

  // Mini bar chart for the last event
  const miniBarHeights = [40, 65, 50, 80, 60];

  return (
    <motion.div
      onViewportEnter={() => { if (!hasStarted) setHasStarted(true); }}
      viewport={{ once: true, margin: "-80px" }}
      className="relative mx-auto w-full max-w-sm"
    >
      <div className="overflow-hidden rounded-2xl border border-white/15 bg-white/[0.08] p-6 backdrop-blur-xl">
        <div className="pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-br from-white/25 via-transparent to-transparent" />

        <div className="relative z-10">
          {/* Vertical timeline */}
          <div className="relative ml-3">
            {/* Timeline track */}
            <div className="absolute top-0 bottom-0 left-[18px] w-[2px] bg-[#d4dbd6]/40" />

            {/* Glowing dot */}
            <motion.div
              className="absolute left-[18px] z-20 h-3 w-3 -translate-x-[5px] rounded-full bg-[#3E715C]"
              style={{
                top: `${dotProgress * 100}%`,
                boxShadow: "0 0 12px 4px rgba(91,144,111,0.5), 0 0 24px 8px rgba(91,144,111,0.2)",
              }}
            />

            {/* Events */}
            <div className="space-y-6">
              {SOLO_DAY_EVENTS.map((event, i) => (
                <motion.div
                  key={event.time}
                  initial={prefersReduced ? { opacity: 1, x: 0 } : { opacity: 0, x: -24 }}
                  animate={
                    i < visibleEvents
                      ? { opacity: 1, x: 0 }
                      : prefersReduced
                        ? { opacity: 1, x: 0 }
                        : { opacity: 0, x: -24 }
                  }
                  transition={{ type: "spring", stiffness: 300, damping: 25 }}
                  className="relative flex items-start gap-4 pl-10"
                >
                  {/* Node circle on the timeline */}
                  <div
                    className={`absolute left-[10px] top-1 flex h-4 w-4 items-center justify-center rounded-full transition-colors duration-300 ${
                      i < visibleEvents ? "bg-[#3E715C]" : "border border-[#d4dbd6] bg-white"
                    }`}
                  >
                    {i < visibleEvents && (
                      <CheckCircleIcon className="h-2.5 w-2.5 text-white" />
                    )}
                  </div>

                  {/* Event content */}
                  <div className="flex-1 rounded-xl border border-white/10 bg-white/[0.06] px-4 py-3 backdrop-blur-lg">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold tracking-wider text-[#3E715C] tabular-nums">
                        {event.time}
                      </span>
                      <span className="text-[10px] text-[#8a9a8e]">—</span>
                      <span className="text-xs font-medium text-[#1a2e23]">
                        {event.label}
                      </span>
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                      <span className="text-[#5B906F]">
                        {renderIcon(event.icon)}
                      </span>

                      {/* Contextual details */}
                      {event.icon === "mail" && i < visibleEvents && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: 0.2 }}
                          className="rounded-md bg-[#3E715C]/10 px-2 py-0.5"
                        >
                          <span className="text-[10px] font-medium text-[#3E715C]">
                            faktura.pdf
                          </span>
                        </motion.div>
                      )}

                      {event.icon === "scan" && i < visibleEvents && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ type: "spring", stiffness: 400, damping: 15, delay: 0.2 }}
                        >
                          <CheckCircleIcon className="h-4 w-4 text-[#3E715C]" />
                        </motion.div>
                      )}

                      {event.tag && i < visibleEvents && (
                        <motion.span
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: 0.25 }}
                          className="rounded-md px-2 py-0.5 text-[10px] font-semibold text-white"
                          style={{ backgroundColor: event.tagColor ?? "#3E715C" }}
                        >
                          {event.tag}
                        </motion.span>
                      )}

                      {event.icon === "chart" && i < visibleEvents && (
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: 0.2 }}
                          className="flex items-end gap-[2px]"
                        >
                          {miniBarHeights.map((h, bi) => (
                            <motion.div
                              key={bi}
                              initial={{ height: 0 }}
                              animate={{ height: h * 0.2 }}
                              transition={{ delay: 0.3 + bi * 0.08, duration: 0.3 }}
                              className="w-[4px] rounded-sm bg-[#5B906F]"
                            />
                          ))}
                        </motion.div>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ============================================================================
// ANIMATION 2: Expense Categorizer
// ============================================================================

function ExpenseCategorizerAnimation() {
  const prefersReduced = usePrefersReducedMotion();
  const [hasStarted, setHasStarted] = useState(false);
  const [activeExpenseIndex, setActiveExpenseIndex] = useState(-1);
  const [sortedExpenses, setSortedExpenses] = useState<
    { label: string; amount: string; path: string; percent: string | null; settled: boolean }[]
  >([]);
  const [orbPulse, setOrbPulse] = useState(false);
  const [totals, setTotals] = useState({ full: 0, partial: 0, none: 0 });
  const timersRef = useRef<NodeJS.Timeout[]>([]);

  const clearTimers = () => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
  };

  const schedule = (fn: () => void, ms: number) => {
    const t = setTimeout(fn, ms);
    timersRef.current.push(t);
  };

  // Parse kr amount to number
  const parseAmount = (str: string) => {
    return parseInt(str.replace(/[^0-9]/g, ""), 10) || 0;
  };

  useEffect(() => {
    if (!hasStarted) return;

    if (prefersReduced) {
      const settled = EXPENSES.map((e) => ({ ...e, settled: true }));
      setSortedExpenses(settled);
      setActiveExpenseIndex(EXPENSES.length);
      const t = { full: 0, partial: 0, none: 0 };
      EXPENSES.forEach((e) => {
        const amt = parseAmount(e.amount);
        if (e.path === "full") t.full += amt;
        else if (e.path === "partial") t.partial += amt;
        else t.none += amt;
      });
      setTotals(t);
      return;
    }

    const runCycle = () => {
      clearTimers();
      setActiveExpenseIndex(-1);
      setSortedExpenses([]);
      setOrbPulse(false);
      setTotals({ full: 0, partial: 0, none: 0 });

      EXPENSES.forEach((expense, i) => {
        const baseDelay = i * 1000;

        // Show expense dropping to orb
        schedule(() => {
          setActiveExpenseIndex(i);
        }, baseDelay);

        // Orb pulse
        schedule(() => {
          setOrbPulse(true);
        }, baseDelay + 350);

        // Sort to path
        schedule(() => {
          setOrbPulse(false);
          setSortedExpenses((prev) => [...prev, { ...expense, settled: true }]);
          setTotals((prev) => {
            const amt = parseAmount(expense.amount);
            if (expense.path === "full") return { ...prev, full: prev.full + amt };
            if (expense.path === "partial") return { ...prev, partial: prev.partial + amt };
            return { ...prev, none: prev.none + amt };
          });
        }, baseDelay + 650);
      });

      // Reset after viewing
      const totalDuration = EXPENSES.length * 1000 + 4000;
      schedule(() => {
        setActiveExpenseIndex(-1);
        setSortedExpenses([]);
        setOrbPulse(false);
        setTotals({ full: 0, partial: 0, none: 0 });
        schedule(() => runCycle(), 600);
      }, totalDuration);
    };

    runCycle();
    return () => clearTimers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasStarted, prefersReduced]);

  useEffect(() => {
    return () => clearTimers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pathColors = {
    full: "#3E715C",
    partial: "#d97706",
    none: "#dc2626",
  };

  const pathLabels = {
    full: "Fullt fradrag",
    partial: "Delvis fradrag",
    none: "Ikke fradrag",
  };

  const currentExpense = activeExpenseIndex >= 0 && activeExpenseIndex < EXPENSES.length
    ? EXPENSES[activeExpenseIndex]
    : null;

  return (
    <motion.div
      onViewportEnter={() => { if (!hasStarted) setHasStarted(true); }}
      viewport={{ once: true, margin: "-80px" }}
      className="mx-auto w-full max-w-lg"
    >
      <div className="overflow-hidden rounded-2xl border border-[#d4dbd6] bg-white p-6 shadow-sm">
        {/* Incoming expense */}
        <div className="relative mb-6 flex h-14 items-center justify-center">
          {currentExpense && (
            <motion.div
              key={`expense-${activeExpenseIndex}`}
              initial={{ opacity: 0, y: -30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              className="rounded-xl border border-[#d4dbd6] bg-[#f5f7f2] px-4 py-2"
            >
              <span className="text-xs font-medium text-[#1a2e23]">
                {currentExpense.label}
              </span>
              <span className="ml-2 text-[11px] tabular-nums text-[#4a5e52]">
                {currentExpense.amount}
              </span>
              {currentExpense.percent && (
                <span className="ml-1 text-[10px] text-[#d97706]">
                  ({currentExpense.percent})
                </span>
              )}
            </motion.div>
          )}
        </div>

        {/* Ciri Orb */}
        <div className="relative mb-6 flex justify-center">
          <motion.div
            animate={
              orbPulse
                ? { scale: [1, 1.3, 1], boxShadow: ["0 0 0px rgba(91,144,111,0.3)", "0 0 24px rgba(91,144,111,0.6)", "0 0 0px rgba(91,144,111,0.3)"] }
                : { scale: 1 }
            }
            transition={{ duration: 0.35 }}
            className="flex h-12 w-12 items-center justify-center rounded-full"
            style={{
              background: "linear-gradient(135deg, #3E715C, #5B906F, #8BB5A2)",
              boxShadow: "0 0 16px rgba(91,144,111,0.3)",
            }}
          >
            <ZapIcon className="h-5 w-5 text-white" />
          </motion.div>

          {/* Branching lines */}
          <div className="pointer-events-none absolute top-full left-1/2 flex -translate-x-1/2 gap-0">
            {/* Left branch (full) */}
            <svg width="80" height="30" className="overflow-visible" style={{ marginLeft: -80 }}>
              <line x1="80" y1="0" x2="30" y2="30" stroke="#3E715C" strokeWidth="2" strokeDasharray="4 3" opacity="0.4" />
            </svg>
            {/* Center branch (partial) */}
            <svg width="40" height="30" className="overflow-visible" style={{ marginLeft: -20 }}>
              <line x1="20" y1="0" x2="20" y2="30" stroke="#d97706" strokeWidth="2" strokeDasharray="4 3" opacity="0.4" />
            </svg>
            {/* Right branch (none) */}
            <svg width="80" height="30" className="overflow-visible" style={{ marginLeft: -40 }}>
              <line x1="0" y1="0" x2="50" y2="30" stroke="#dc2626" strokeWidth="2" strokeDasharray="4 3" opacity="0.4" />
            </svg>
          </div>
        </div>

        {/* Three paths */}
        <div className="mt-10 grid grid-cols-3 gap-3">
          {(["full", "partial", "none"] as const).map((pathKey) => {
            const color = pathColors[pathKey];
            const label = pathLabels[pathKey];
            const pathExpenses = sortedExpenses.filter((e) => e.path === pathKey);
            const total = pathKey === "full" ? totals.full : pathKey === "partial" ? totals.partial : totals.none;

            return (
              <div key={pathKey} className="flex flex-col items-center">
                {/* Path label */}
                <div
                  className="mb-3 rounded-full px-3 py-1 text-[10px] font-bold tracking-wide uppercase"
                  style={{
                    backgroundColor: `${color}15`,
                    color: color,
                  }}
                >
                  {label}
                </div>

                {/* Sorted expenses in this path */}
                <div className="min-h-[120px] w-full space-y-1.5">
                  {pathExpenses.map((exp, i) => (
                    <motion.div
                      key={`${exp.label}-${i}`}
                      initial={prefersReduced ? { opacity: 1, y: 0 } : { opacity: 0, y: -12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ type: "spring", stiffness: 300, damping: 25 }}
                      className="rounded-lg border px-2 py-1.5 text-center"
                      style={{
                        borderColor: `${color}30`,
                        backgroundColor: `${color}08`,
                      }}
                    >
                      <p className="text-[10px] font-medium text-[#1a2e23] leading-tight">
                        {exp.label}
                      </p>
                      <p
                        className="text-[10px] font-semibold tabular-nums"
                        style={{ color }}
                      >
                        {exp.amount}
                      </p>
                    </motion.div>
                  ))}
                </div>

                {/* Running total */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={total > 0 ? { opacity: 1 } : { opacity: 0 }}
                  className="mt-2 rounded-lg border border-[#d4dbd6] bg-[#f5f7f2] px-3 py-1.5 text-center"
                >
                  <span className="text-[9px] font-medium tracking-wider text-[#8a9a8e] uppercase">
                    Totalt
                  </span>
                  <p
                    className="text-xs font-semibold tabular-nums"
                    style={{ color }}
                  >
                    kr {total.toLocaleString("nb-NO")}
                  </p>
                </motion.div>
              </div>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}

// ============================================================================
// ANIMATION 3: Efficiency Comparison
// ============================================================================

function EfficiencyComparisonAnimation() {
  const prefersReduced = usePrefersReducedMotion();
  const [hasStarted, setHasStarted] = useState(false);
  const [visibleBars, setVisibleBars] = useState(0);
  const [showCallout, setShowCallout] = useState(false);
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
      setVisibleBars(COMPARISON_BARS.length);
      setShowCallout(true);
      return;
    }

    clearTimers();
    setVisibleBars(0);
    setShowCallout(false);

    COMPARISON_BARS.forEach((_, i) => {
      schedule(() => {
        setVisibleBars(i + 1);
      }, i * 300);
    });

    // Show callout after all bars
    schedule(() => {
      setShowCallout(true);
    }, COMPARISON_BARS.length * 300 + 800);

    return () => clearTimers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasStarted, prefersReduced]);

  useEffect(() => {
    return () => clearTimers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const renderBarIcon = (icon: string) => {
    const cls = "h-4 w-4";
    switch (icon) {
      case "clock":
        return <ClockIcon className={cls} />;
      case "user":
        return <UserIcon className={cls} />;
      case "zap":
        return <ZapIcon className={cls} />;
      default:
        return null;
    }
  };

  return (
    <motion.div
      onViewportEnter={() => { if (!hasStarted) setHasStarted(true); }}
      viewport={{ once: true, margin: "-80px" }}
      className="mx-auto w-full max-w-xl"
    >
      <div className="overflow-hidden rounded-2xl border border-white/15 bg-white/[0.08] p-6 shadow-2xl backdrop-blur-3xl sm:p-8">
        <div className="pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-br from-white/25 via-transparent to-transparent" />

        <div className="relative z-10 space-y-6">
          {COMPARISON_BARS.map((bar, i) => (
            <div key={bar.label} className="space-y-2">
              {/* Label row */}
              <div className="flex items-center gap-2">
                <span style={{ color: bar.color }}>{renderBarIcon(bar.icon)}</span>
                <span className="text-sm font-medium text-[#1a2e23]">
                  {bar.label}
                </span>
              </div>

              {/* Bar */}
              <div className="relative h-8 overflow-hidden rounded-lg bg-[#f0f2ed]/60">
                <motion.div
                  initial={{ width: 0 }}
                  animate={
                    i < visibleBars
                      ? { width: `${bar.width}%` }
                      : { width: 0 }
                  }
                  transition={{
                    duration: prefersReduced ? 0 : 1,
                    ease: MARKETING_EASING,
                  }}
                  className="absolute inset-y-0 left-0 flex items-center rounded-lg px-3"
                  style={{ backgroundColor: `${bar.color}20` }}
                >
                  <motion.div
                    className="absolute inset-y-0 left-0 rounded-lg"
                    style={{ backgroundColor: bar.color, width: "100%" }}
                    initial={{ opacity: 0.15 }}
                    animate={i < visibleBars ? { opacity: 0.2 } : { opacity: 0 }}
                  />
                </motion.div>

                {/* Detail label */}
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={i < visibleBars ? { opacity: 1 } : { opacity: 0 }}
                  transition={{ delay: prefersReduced ? 0 : 0.6 }}
                  className="absolute inset-y-0 right-3 flex items-center text-xs font-semibold tabular-nums"
                  style={{ color: bar.color }}
                >
                  {bar.detail}
                </motion.span>

                {/* Filled colored bar */}
                <motion.div
                  initial={{ width: 0 }}
                  animate={
                    i < visibleBars
                      ? { width: `${bar.width}%` }
                      : { width: 0 }
                  }
                  transition={{
                    duration: prefersReduced ? 0 : 1,
                    ease: MARKETING_EASING,
                  }}
                  className="absolute inset-y-0 left-0 rounded-lg"
                  style={{ backgroundColor: bar.color, opacity: 0.15 }}
                />

                {/* Accent edge */}
                <motion.div
                  initial={{ width: 0 }}
                  animate={
                    i < visibleBars
                      ? { width: `${bar.width}%` }
                      : { width: 0 }
                  }
                  transition={{
                    duration: prefersReduced ? 0 : 1,
                    ease: MARKETING_EASING,
                  }}
                  className="absolute inset-y-0 left-0 rounded-lg"
                  style={{ borderLeft: `3px solid ${bar.color}` }}
                />
              </div>
            </div>
          ))}

          {/* Savings callout */}
          <motion.div
            initial={prefersReduced ? { opacity: 1, y: 0 } : { opacity: 0, y: 12 }}
            animate={
              showCallout
                ? { opacity: 1, y: 0 }
                : prefersReduced
                  ? { opacity: 1, y: 0 }
                  : { opacity: 0, y: 12 }
            }
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="relative overflow-hidden rounded-xl border border-[#3E715C]/20 bg-[#3E715C]/10 px-5 py-4 text-center"
          >
            {/* Pulse background */}
            {showCallout && !prefersReduced && (
              <motion.div
                className="absolute inset-0 rounded-xl bg-[#3E715C]/5"
                animate={{ opacity: [0.3, 0.6, 0.3] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              />
            )}
            <div className="relative z-10">
              <p className="text-xs font-medium tracking-wider text-[#3E715C] uppercase">
                Du sparer
              </p>
              <p className="mt-1 text-2xl font-semibold text-[#3E715C]">
                11 timer/mnd
              </p>
              <p className="mt-0.5 text-[11px] text-[#5B906F]">
                og over kr 3 000 sammenlignet med regnskapsforer
              </p>
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

export default function EnkeltpersonforetakPage() {
  return (
    <>
      {/* Hero */}
      <HeroSection
        backgroundImage="/ciribackground9.jpg"
        title="Regnskap for deg som jobber alene."
        subtitle="Enkelt, rimelig og automatisk. Ciri gir deg tid til det du faktisk tjener penger pa."
        ctaText="Start gratis som ENK"
        ctaHref="/register"
      />

      {/* Metrics */}
      <PageMetrics
        stats={[
          { value: "Fra kr 0", label: "Gratis oppstart" },
          { value: "ENK", label: "Skreddersydd for deg" },
          { value: "Automatisk", label: "Fradragsberegning" },
          { value: "Naringsinntekt", label: "Korrekt rapportert" },
        ]}
      />

      {/* Section 1: Solo Day Timeline (centered, Glass) */}
      <GlassSection>
        <Reveal>
          <div className="text-center">
            <SectionLabel>
              <UserIcon className="h-3.5 w-3.5" />
              En dag med Ciri
            </SectionLabel>
            <h2 className="mt-6 text-4xl font-normal tracking-tight text-[#1a2e23] sm:text-5xl">
              Fra faktura til{" "}
              <span className="text-[#3E715C]">ferdig bokfort</span>
            </h2>
            <p className="mx-auto mt-5 max-w-lg text-base leading-relaxed text-[#4a5e52]">
              Ciri tar seg av hele dagen automatisk. Fra fakturamottak til
              dagsrapport — uten at du lofter en finger.
            </p>
          </div>
        </Reveal>
        <Reveal delay={0.15}>
          <div className="mt-12 min-h-[400px] overflow-hidden">
            <SoloDayAnimation />
          </div>
        </Reveal>
        <Reveal delay={0.25}>
          <ul className="mx-auto mt-10 flex max-w-2xl flex-col gap-3 sm:flex-row sm:gap-8">
            {["Naeringsoppgave (RF-1175)", "Hjemmekontor-fradrag", "Forenklet selvangivelse"].map((item) => (
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
        label="For enkeltpersonforetak"
        labelIcon={<UserIcon className="h-3.5 w-3.5" />}
        heading="Regnskap for deg"
        headingAccent="som jobber alene"
        description="Ciri tar seg av regnskapet sa du kan fokusere pa det du er god pa."
        features={[
          { icon: <CalculatorIcon className="h-5 w-5" />, title: "Naringsinntekt", desc: "Automatisk beregning av naringsinntekt og personinntekt for skattemeldingen." },
          { icon: <ZapIcon className="h-5 w-5" />, title: "Fradragsoptimalisering", desc: "Ciri finner fradrag du ikke visste om — hjemmekontor, bil, telefon og mer." },
          { icon: <TrendingUpIcon className="h-5 w-5" />, title: "Enkel oversikt", desc: "Se inntekter, utgifter og resultat i sanntid. Ingen regnskapskunnskap krevd." },
        ]}
      />

      {/* Section 2: Expense Categorizer (SolidSection cream, 2-col: anim + text) */}
      <SolidSection variant="cream">
        <div className="grid items-center gap-16 lg:grid-cols-2">
          <Reveal delay={0.15}>
            <div className="min-h-[320px] sm:min-h-[380px] overflow-hidden">
              <ExpenseCategorizerAnimation />
            </div>
          </Reveal>
          <Reveal>
            <div>
              <SectionLabel>
                <CalculatorIcon className="h-3.5 w-3.5" />
                Smart fradragskategorisering
              </SectionLabel>
              <h2 className="mt-6 text-3xl font-normal tracking-tight text-[#1a2e23] sm:text-4xl">
                Enkel prising,{" "}
                <span className="text-[#3E715C]">smart fradrag</span>
              </h2>
              <p className="mt-5 max-w-md text-base leading-relaxed text-[#4a5e52]">
                Ciri for enkeltpersonforetak koster fra kr 149/mnd. Ingen
                skjulte kostnader, ingen bindingstid.
              </p>
              <BulletList
                items={[
                  "Ubegrenset bilag",
                  "MVA-beregning inkludert",
                  "E-poststotte inkludert",
                ]}
              />
            </div>
          </Reveal>
        </div>
      </SolidSection>

      {/* Section 3: Efficiency Comparison (GlassSection, 2-col: text + anim) */}
      <GlassSection>
        <div className="grid items-center gap-16 lg:grid-cols-2">
          <Reveal>
            <div>
              <SectionLabel>
                <TrendingUpIcon className="h-3.5 w-3.5" />
                Spar tid og penger
              </SectionLabel>
              <h2 className="mt-6 text-3xl font-normal tracking-tight text-[#1a2e23] sm:text-4xl">
                Mer tid til det{" "}
                <span className="text-[#3E715C]">som betyr noe</span>
              </h2>
              <p className="mt-5 max-w-md text-base leading-relaxed text-[#4a5e52]">
                De fleste enkeltpersonforetak bruker 10-15 timer i maneden pa
                regnskap. Med Ciri er det ned til under 1 time.
              </p>
              <BulletList
                items={[
                  "Automatisk fra dag en",
                  "Ingen regnskapskunnskap krevd",
                  "Support pa norsk",
                ]}
              />
            </div>
          </Reveal>
          <Reveal delay={0.15}>
            <div className="min-h-[320px] sm:min-h-[380px] overflow-hidden">
              <EfficiencyComparisonAnimation />
            </div>
          </Reveal>
        </div>
      </GlassSection>

      {/* CTA */}
      <MarketingCTA
        title="Klar til a forenkle"
        titleAccent="regnskapet ditt?"
        subtitle="Gratis i 14 dager. Perfekt for deg som driver alene."
        ctaText="Start gratis som ENK"
      />
    </>
  );
}
