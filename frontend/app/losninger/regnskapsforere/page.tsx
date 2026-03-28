"use client";
import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BriefcaseIcon,
  CheckCircleIcon,
  ZapIcon,
  ClockIcon,
  LayoutDashboardIcon,
  CodeIcon,
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
// CONSTANTS
// ============================================================================

const CLIENT_CARDS = [
  { name: "Berge Konsult AS", status: "green", detail: "23 bilag" },
  { name: "Nordlys Design", status: "green", detail: "12 bilag" },
  { name: "Fjord Catering", status: "amber", detail: "MVA frist 3 dager" },
  { name: "Kyst Elektro", status: "green", detail: "Alt ajour" },
  { name: "Vik Transport", status: "red", detail: "5 ubehandlede" },
  { name: "Storm Media AS", status: "green", detail: "18 bilag" },
] as const;

const TASK_LABELS = [
  "Berge Konsult",
  "Nordlys Design",
  "Fjord Catering",
  "Kyst Elektro",
  "Vik Transport",
  "Storm Media",
];

const TESTIMONIALS = [
  {
    quote:
      "Ciri har halvert tiden vi bruker pa bokforing for klientene vare.",
    name: "Maria S.",
    role: "Autorisert regnskapsforer",
  },
  {
    quote:
      "MVA-rapporteringen er sa mye enklere na. Ingen feil pa 8 maneder.",
    name: "Thomas K.",
    role: "Regnskapskontor",
  },
  {
    quote: "Med 35 klienter sparer vi over 200 timer i aret.",
    name: "Anne L.",
    role: "Daglig leder",
  },
];

const STATUS_COLORS: Record<string, string> = {
  green: "#3E715C",
  amber: "#d4a017",
  red: "#c0392b",
};

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
        <BulletList items={bullets} />
      </div>
    </Reveal>
  );
}

// ============================================================================
// ANIMATION 1: Multi-Client Dashboard
// ============================================================================

function MultiClientDashboardAnimation() {
  const prefersReduced = usePrefersReducedMotion();
  const [hasStarted, setHasStarted] = useState(false);
  const [scanProgress, setScanProgress] = useState(-1);
  const [pulsedCards, setPulsedCards] = useState<Set<number>>(new Set());
  const [zoomedCard, setZoomedCard] = useState<number | null>(null);
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
    setScanProgress(-1);
    setPulsedCards(new Set());
    setZoomedCard(null);

    // Scan beam moves across 3 rows (2 cards per row)
    // Row 0: cards 0,1 | Row 1: cards 2,3 | Row 2: cards 4,5
    schedule(() => {
      setScanProgress(0);
      setPulsedCards(new Set([0, 1]));
    }, 400);

    schedule(() => {
      setScanProgress(1);
      setPulsedCards(new Set([0, 1, 2, 3]));
    }, 1200);

    schedule(() => {
      setScanProgress(2);
      setPulsedCards(new Set([0, 1, 2, 3, 4, 5]));
    }, 2000);

    // Scan complete
    schedule(() => {
      setScanProgress(3);
    }, 2800);

    // Zoom into Fjord Catering (index 2) for detail
    schedule(() => {
      setZoomedCard(2);
    }, 3400);

    // Zoom back out
    schedule(() => {
      setZoomedCard(null);
    }, 5400);

    // Reset and loop
    schedule(() => {
      setScanProgress(-1);
      setPulsedCards(new Set());
      setZoomedCard(null);
      schedule(() => runCycle(), 600);
    }, 7000);
  };

  useEffect(() => {
    if (!hasStarted) return;
    if (prefersReduced) {
      setScanProgress(3);
      setPulsedCards(new Set([0, 1, 2, 3, 4, 5]));
      return;
    }
    runCycle();
    return () => clearTimers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasStarted, prefersReduced]);

  const scanBeamRow = scanProgress >= 0 && scanProgress < 3 ? scanProgress : -1;

  return (
    <motion.div
      onViewportEnter={() => {
        if (!hasStarted) setHasStarted(true);
      }}
      viewport={{ once: true, margin: "-80px" }}
      className="flex flex-col items-center"
    >
      <div className="relative w-full max-w-md overflow-hidden">
        {/* Grid of client cards */}
        <div className="grid grid-cols-2 gap-3">
          {CLIENT_CARDS.map((client, i) => {
            const isPulsed = pulsedCards.has(i);
            const isZoomed = zoomedCard === i;

            return (
              <motion.div
                key={client.name}
                animate={{
                  scale: isZoomed ? 1.15 : 1,
                  zIndex: isZoomed ? 20 : 1,
                }}
                transition={{
                  type: "spring",
                  stiffness: 300,
                  damping: 25,
                }}
                className="relative overflow-hidden rounded-xl border border-[#d4dbd6]/40 bg-white/60 p-4 backdrop-blur-sm"
                style={{
                  boxShadow: isZoomed
                    ? "0 8px 32px rgba(62,113,92,0.2)"
                    : "none",
                }}
              >
                {/* Status dot */}
                <div className="mb-2 flex items-center gap-2">
                  <motion.div
                    animate={
                      isPulsed && !prefersReduced
                        ? {
                            scale: [1, 1.4, 1],
                            opacity: [1, 0.7, 1],
                          }
                        : {}
                    }
                    transition={{ duration: 0.5 }}
                    className="h-2.5 w-2.5 rounded-full"
                    style={{
                      backgroundColor: STATUS_COLORS[client.status],
                    }}
                  />
                  <span className="truncate text-xs font-semibold text-[#1a2e23]">
                    {client.name}
                  </span>
                </div>
                <span className="text-[13px] text-[#4a5e52]">
                  {client.detail}
                </span>

                {/* Zoom detail overlay for Fjord Catering */}
                <AnimatePresence>
                  {isZoomed && i === 2 && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.3 }}
                      className="absolute inset-0 flex flex-col justify-center rounded-xl border-2 border-[#d4a017]/40 bg-white/95 p-4 backdrop-blur-md"
                    >
                      <div className="mb-1 flex items-center gap-2">
                        <div
                          className="h-2.5 w-2.5 rounded-full"
                          style={{ backgroundColor: STATUS_COLORS.amber }}
                        />
                        <span className="text-xs font-bold text-[#1a2e23]">
                          Fjord Catering
                        </span>
                      </div>
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[12px] text-[#8a9a8e]">
                            MVA-frist
                          </span>
                          <span className="text-[12px] font-semibold text-[#d4a017]">
                            3 dager
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-[12px] text-[#8a9a8e]">
                            Bilag
                          </span>
                          <span className="text-[12px] font-semibold text-[#1a2e23]">
                            7 ubehandlede
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-[12px] text-[#8a9a8e]">
                            Status
                          </span>
                          <span className="text-[12px] font-semibold text-[#d4a017]">
                            Krever handling
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>

        {/* Scan beam — horizontal glowing line that sweeps vertically */}
        <AnimatePresence>
          {scanBeamRow >= 0 && !prefersReduced && (
            <motion.div
              key={`scan-${scanBeamRow}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="pointer-events-none absolute right-0 left-0 z-10 h-[2px]"
              style={{
                top: `${(scanBeamRow * 100) / 3 + 100 / 6}%`,
                background:
                  "linear-gradient(90deg, transparent 0%, #5B906F 20%, #3E715C 50%, #5B906F 80%, transparent 100%)",
                boxShadow:
                  "0 0 16px 4px rgba(91,144,111,0.5), 0 0 40px 8px rgba(91,144,111,0.2)",
              }}
            />
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

// ============================================================================
// ANIMATION 2: Efficiency Multiplier
// ============================================================================

function EfficiencyMultiplierAnimation() {
  const prefersReduced = usePrefersReducedMotion();
  const [hasStarted, setHasStarted] = useState(false);
  const [seqProgress, setSeqProgress] = useState<number[]>(
    Array(6).fill(0)
  );
  const [parProgress, setParProgress] = useState<number[]>(
    Array(6).fill(0)
  );
  const [showMultiplier, setShowMultiplier] = useState(false);
  const timersRef = useRef<NodeJS.Timeout[]>([]);
  const seqFrameRef = useRef<number>(0);
  const parFrameRef = useRef<number>(0);

  const clearTimers = () => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
    if (seqFrameRef.current) cancelAnimationFrame(seqFrameRef.current);
    if (parFrameRef.current) cancelAnimationFrame(parFrameRef.current);
  };

  const schedule = (fn: () => void, ms: number) => {
    const t = setTimeout(fn, ms);
    timersRef.current.push(t);
  };

  // Sequential animation: tasks complete one after another (~4 seconds total)
  const runSequentialAnimation = () => {
    const totalDuration = 4000;
    const perTask = totalDuration / 6;
    const startTime = performance.now();

    const tick = (now: number) => {
      const elapsed = now - startTime;
      const newProgress = Array(6).fill(0);

      for (let i = 0; i < 6; i++) {
        const taskStart = i * perTask;
        const taskElapsed = elapsed - taskStart;
        if (taskElapsed <= 0) {
          newProgress[i] = 0;
        } else if (taskElapsed >= perTask) {
          newProgress[i] = 100;
        } else {
          newProgress[i] = (taskElapsed / perTask) * 100;
        }
      }

      setSeqProgress([...newProgress]);

      if (elapsed < totalDuration) {
        seqFrameRef.current = requestAnimationFrame(tick);
      } else {
        setSeqProgress(Array(6).fill(100));
      }
    };

    seqFrameRef.current = requestAnimationFrame(tick);
  };

  // Parallel animation: all tasks complete simultaneously (~1 second total)
  const runParallelAnimation = () => {
    const totalDuration = 1000;
    const startTime = performance.now();

    const tick = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min((elapsed / totalDuration) * 100, 100);
      setParProgress(Array(6).fill(progress));

      if (elapsed < totalDuration) {
        parFrameRef.current = requestAnimationFrame(tick);
      } else {
        setParProgress(Array(6).fill(100));
      }
    };

    parFrameRef.current = requestAnimationFrame(tick);
  };

  const runCycle = () => {
    clearTimers();
    setSeqProgress(Array(6).fill(0));
    setParProgress(Array(6).fill(0));
    setShowMultiplier(false);

    // Start sequential
    schedule(() => {
      runSequentialAnimation();
    }, 400);

    // Start parallel (at the same time)
    schedule(() => {
      runParallelAnimation();
    }, 400);

    // Show multiplier after sequential completes
    schedule(() => {
      setShowMultiplier(true);
    }, 4800);

    // Reset and loop
    schedule(() => {
      setShowMultiplier(false);
      setSeqProgress(Array(6).fill(0));
      setParProgress(Array(6).fill(0));
      schedule(() => runCycle(), 600);
    }, 8000);
  };

  useEffect(() => {
    if (!hasStarted) return;
    if (prefersReduced) {
      setSeqProgress(Array(6).fill(100));
      setParProgress(Array(6).fill(100));
      setShowMultiplier(true);
      return;
    }
    runCycle();
    return () => clearTimers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasStarted, prefersReduced]);

  useEffect(() => {
    return () => clearTimers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <motion.div
      onViewportEnter={() => {
        if (!hasStarted) setHasStarted(true);
      }}
      viewport={{ once: true, margin: "-80px" }}
      className="flex flex-col items-center gap-6"
    >
      <div className="flex w-full max-w-lg flex-col gap-4 sm:flex-row sm:gap-6">
        {/* Left side: Sequential (dimmer) */}
        <div className="flex-1 rounded-xl border border-[#d4dbd6] bg-white/40 p-4">
          <div className="mb-3 flex items-center gap-2">
            <ClockIcon className="h-3.5 w-3.5 text-[#8a9a8e]" />
            <span className="text-[13px] font-bold tracking-wider text-[#8a9a8e] uppercase">
              For
            </span>
          </div>
          <div className="space-y-2.5 opacity-60">
            {TASK_LABELS.map((label, i) => (
              <div key={`seq-${label}`} className="space-y-1">
                <span className="text-[12px] text-[#4a5e52]">{label}</span>
                <div className="h-2 overflow-hidden rounded-full bg-[#e8ede9]">
                  <div
                    className="h-full rounded-full bg-[#8a9a8e] transition-[width] duration-100 ease-linear"
                    style={{ width: `${seqProgress[i]}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-3 text-right">
            <span className="text-[12px] font-medium text-[#8a9a8e]">
              ~4 sek
            </span>
          </div>
        </div>

        {/* Right side: Parallel (brighter) */}
        <div className="flex-1 rounded-xl border border-[#3E715C]/30 bg-white/70 p-4">
          <div className="mb-3 flex items-center gap-2">
            <ZapIcon className="h-3.5 w-3.5 text-[#3E715C]" />
            <span className="text-[13px] font-bold tracking-wider text-[#3E715C] uppercase">
              Etter
            </span>
          </div>
          <div className="space-y-2.5">
            {TASK_LABELS.map((label, i) => (
              <div key={`par-${label}`} className="space-y-1">
                <span className="text-[12px] text-[#4a5e52]">{label}</span>
                <div className="h-2 overflow-hidden rounded-full bg-[#e8ede9]">
                  <div
                    className="h-full rounded-full bg-[#3E715C] transition-[width] duration-100 ease-linear"
                    style={{ width: `${parProgress[i]}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-3 text-right">
            <span className="text-[12px] font-medium text-[#3E715C]">
              ~1 sek
            </span>
          </div>
        </div>
      </div>

      {/* 5x Multiplier */}
      <div className="min-h-[80px] overflow-hidden">
        <AnimatePresence>
          {showMultiplier && (
            <motion.div
              initial={prefersReduced ? { scale: 1, opacity: 1 } : { scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{
                type: "spring",
                stiffness: 300,
                damping: 15,
              }}
              className="flex flex-col items-center gap-1"
            >
              <span className="text-5xl font-bold tracking-tight text-[#3E715C]">
                5x
              </span>
              <span className="text-xs font-medium tracking-wider text-[#4a5e52]">
                5x raskere med Ciri
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

// ============================================================================
// ANIMATION 3: Testimonial Carousel
// ============================================================================

function TestimonialCarouselAnimation() {
  const prefersReduced = usePrefersReducedMotion();
  const [activeIndex, setActiveIndex] = useState(0);
  const [hasStarted, setHasStarted] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!hasStarted) return;
    if (prefersReduced) return;

    intervalRef.current = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % TESTIMONIALS.length);
    }, 4000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [hasStarted, prefersReduced]);

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  return (
    <motion.div
      onViewportEnter={() => {
        if (!hasStarted) setHasStarted(true);
      }}
      viewport={{ once: true, margin: "-80px" }}
      className="flex flex-col items-center gap-6"
    >
      {/* Quote card container */}
      <div className="relative h-48 w-full max-w-md overflow-hidden sm:h-44">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeIndex}
            initial={prefersReduced ? { opacity: 1 } : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={prefersReduced ? { opacity: 1 } : { opacity: 0 }}
            transition={{ duration: 0.5, ease: MARKETING_EASING }}
            className="absolute inset-0 flex flex-col items-center justify-center rounded-2xl border border-[#d4dbd6]/40 bg-white/60 px-8 py-6 text-center backdrop-blur-sm"
          >
            {/* Quote mark */}
            <span
              className="mb-3 block text-4xl leading-none font-serif text-[#3E715C]/30"
              aria-hidden="true"
            >
              &ldquo;
            </span>

            {/* Quote text */}
            <p className="text-sm leading-relaxed text-[#1a2e23] italic sm:text-base">
              {TESTIMONIALS[activeIndex].quote}
            </p>

            {/* Attribution */}
            <div className="mt-4">
              <span className="text-xs font-semibold text-[#3E715C]">
                {TESTIMONIALS[activeIndex].name}
              </span>
              <span className="text-xs text-[#8a9a8e]">
                {" "}
                &mdash; {TESTIMONIALS[activeIndex].role}
              </span>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Indicator dots */}
      <div className="flex items-center gap-2" role="tablist" aria-label="Testimonials">
        {TESTIMONIALS.map((_, i) => (
          <button
            key={i}
            onClick={() => {
              setActiveIndex(i);
              // Reset interval on manual click
              if (intervalRef.current) clearInterval(intervalRef.current);
              if (!prefersReduced) {
                intervalRef.current = setInterval(() => {
                  setActiveIndex((prev) => (prev + 1) % TESTIMONIALS.length);
                }, 4000);
              }
            }}
            role="tab"
            aria-selected={i === activeIndex}
            aria-label={`Sitat ${i + 1}`}
            className={`h-2 rounded-full transition-all duration-300 ${
              i === activeIndex
                ? "w-6 bg-[#3E715C]"
                : "w-2 bg-[#d4dbd6] hover:bg-[#8a9a8e]"
            }`}
          />
        ))}
      </div>
    </motion.div>
  );
}

// ============================================================================
// MAIN PAGE
// ============================================================================

export default function RegnskapsforerePage() {
  return (
    <>
      {/* Hero */}
      <HeroSection
        backgroundImage="/ciribackground4.jpg"
        title="Ditt superkraft-verktoy."
        subtitle="Administrer alle klienter fra ett dashboard. Automatiser det repetitive. Fokuser pa radgivning."
        ctaText="Prov Ciri for regnskapskontoret"
        ctaHref="/register"
      />

      {/* Metrics */}
      <PageMetrics stats={[
        { value: "Multi-klient", label: "Flere bedrifter samtidig" },
        { value: "5x", label: "Raskere arbeid" },
        { value: "API", label: "Full tilgang" },
        { value: "Sanntid", label: "Klientstatus live" },
      ]} />

      {/* Section 1: Multi-Client Dashboard (Glass, centered) */}
      <GlassSection>
        <Reveal>
          <div className="text-center">
            <SectionLabel>
              <BriefcaseIcon className="h-3.5 w-3.5" />
              Klientoversikt
            </SectionLabel>
            <h2 className="mt-6 text-4xl font-normal tracking-tight text-[#1a2e23] sm:text-5xl">
              Alle klienter,{" "}
              <span className="text-[#3E715C]">ett dashboard</span>
            </h2>
            <p className="mx-auto mt-5 max-w-lg text-base leading-relaxed text-[#4a5e52]">
              Se status for alle klienter i sanntid. Frister, ubehandlede bilag og varsler — alt pa ett sted.
            </p>
          </div>
        </Reveal>
        <Reveal delay={0.15}>
          <div className="mt-12 min-h-[320px] overflow-hidden sm:min-h-[380px]">
            <MultiClientDashboardAnimation />
          </div>
        </Reveal>
        <Reveal delay={0.25}>
          <ul className="mx-auto mt-10 flex max-w-2xl flex-col gap-3 sm:flex-row sm:gap-8">
            {["Fristkalender pa tvers av klienter", "Automatiske varsler ved problemer", "Prioriteringsliste for oppgaver"].map((item) => (
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
        label="For regnskapsforere"
        labelIcon={<BriefcaseIcon className="h-3.5 w-3.5" />}
        heading="Ditt"
        headingAccent="superkraft-verktoy"
        description="Handter flere klienter, automatiser rutinearbeid og lever bedre tjenester."
        features={[
          { icon: <LayoutDashboardIcon className="h-5 w-5" />, title: "Klientoversikt", desc: "Se status pa alle klienter i sanntid. Frister, mangler og handlinger i ett blikk." },
          { icon: <ZapIcon className="h-5 w-5" />, title: "Masseoperasjoner", desc: "Kjor MVA-oppgjor, arsoppgjor og rapporter for flere klienter samtidig." },
          { icon: <CodeIcon className="h-5 w-5" />, title: "API-tilgang", desc: "Full REST API for integrasjon med egne systemer og arbeidsflyter." },
        ]}
      />

      {/* Section 2: Efficiency Multiplier (Solid Cream, 2-col) */}
      <SolidSection variant="cream">
        <div className="mx-auto max-w-5xl">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <Reveal delay={0.15}>
              <div className="min-h-[320px] overflow-hidden sm:min-h-[380px]">
                <EfficiencyMultiplierAnimation />
              </div>
            </Reveal>
            <FeatureText
              heading="API og automatisering"
              description="Full API-tilgang for integrasjon med eksisterende systemer. Bulk-operasjoner og tilpassede arbeidsflyter."
              bullets={[
                "REST API med full dokumentasjon",
                "Bulk-import og eksport",
                "Webhook-varsler",
                "Tilpassede rapportmaler",
              ]}
            />
          </div>
        </div>
      </SolidSection>

      {/* Section 3: Testimonial Carousel (Glass, 2-col) */}
      <GlassSection>
        <div className="mx-auto max-w-5xl">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <FeatureText
              heading="Bygget for profesjonelle"
              description="Ciri er utviklet i samarbeid med norske regnskapsforere. Vi forstaar hverdagen din."
              bullets={[
                "Autorisert regnskapsforer-modus",
                "Klientportal for dokumentdeling",
                "Revisjonsvennlig sporbarhet",
              ]}
            />
            <Reveal delay={0.15}>
              <div className="min-h-[320px] sm:min-h-[380px]">
                <TestimonialCarouselAnimation />
              </div>
            </Reveal>
          </div>
        </div>
      </GlassSection>

      {/* CTA */}
      <MarketingCTA
        title="Klar til a superlade"
        titleAccent="regnskapskontoret?"
        subtitle="Administrer flere klienter pa kortere tid. Prov gratis i 14 dager."
        ctaText="Prov Ciri for regnskapskontoret"
      />
    </>
  );
}
