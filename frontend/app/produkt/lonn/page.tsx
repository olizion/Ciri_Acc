"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  UsersIcon,
  FileTextIcon,
  CheckCircleIcon,
  CreditCardIcon,
  SendIcon,
  ShieldCheckIcon,
  CalendarIcon,
  ClipboardCheckIcon,
  CoffeeIcon,
  AlertTriangleIcon,
  BanknoteIcon,
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
// ANIMATION 1: PAYROLL AUTOPILOT — step-by-step automated flow
// ============================================================================

const PAYROLL_STEPS = [
  {
    icon: CreditCardIcon,
    idle: "Hente skattekort",
    done: "Tabell 7100, 36%",
  },
  {
    icon: BanknoteIcon,
    idle: "Beregne brutto",
    done: "kr 45 000 brutto",
  },
  {
    icon: AlertTriangleIcon,
    idle: "Trekke skatt og avgifter",
    done: "kr 19 755 i trekk",
  },
  {
    icon: FileTextIcon,
    idle: "Generere lønnsslipp",
    done: "PDF sendt til ansatt",
  },
  {
    icon: SendIcon,
    idle: "Sende A-melding",
    done: "Levert til Skatteetaten",
  },
] as const;

function PayrollAutopilotAnimation() {
  const { ref: viewportRef, hasEntered } = useMarketingViewport();
  const [activeStep, setActiveStep] = useState(-1);
  const [spinningStep, setSpinningStep] = useState(-1);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [employeeIndex, setEmployeeIndex] = useState(0);
  const [allDone, setAllDone] = useState(false);
  const timersRef = useRef<NodeJS.Timeout[]>([]);

  const employees = [
    { name: "Ola Nordmann", role: "Utvikler" },
    { name: "Kari Hansen", role: "Designer" },
    { name: "Erik Berg", role: "Konsulent" },
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

    const runEmployee = (eIdx: number) => {
      clearTimers();
      setActiveStep(-1);
      setSpinningStep(-1);
      setCompletedSteps([]);
      setAllDone(false);
      setEmployeeIndex(eIdx);

      PAYROLL_STEPS.forEach((_, i) => {
        const spinStart = 500 + i * 900;
        const completeTime = spinStart + 600;

        schedule(() => {
          setActiveStep(i);
          setSpinningStep(i);
        }, spinStart);

        schedule(() => {
          setSpinningStep(-1);
          setCompletedSteps((prev) => [...prev, i]);
        }, completeTime);
      });

      const totalTime = 500 + PAYROLL_STEPS.length * 900 + 400;
      schedule(() => setAllDone(true), totalTime);

      const nextIdx = (eIdx + 1) % employees.length;
      schedule(() => runEmployee(nextIdx), totalTime + 2500);
    };

    runEmployee(0);
    return () => clearTimers();
  }, [hasEntered]);

  const currentEmployee = employees[employeeIndex];

  return (
    <div ref={viewportRef} className="relative mx-auto max-w-md">
      <div className="relative overflow-hidden rounded-2xl border border-white/15 bg-white/[0.08] p-6 shadow-2xl backdrop-blur-3xl">
        <div className="pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-br from-white/30 via-transparent to-transparent" />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/60 to-transparent" />

        <div className="relative z-10">
          {/* Employee header */}
          <AnimatePresence mode="wait">
            <motion.div
              key={employeeIndex}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              transition={{ duration: 0.4 }}
              className="mb-5 flex items-center justify-between border-b border-white/10 pb-4"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#3E715C]/10">
                  <UsersIcon className="h-4 w-4 text-[#3E715C]" />
                </div>
                <div>
                  <p className="text-sm font-medium text-[#1a2e23]">
                    {currentEmployee.name}
                  </p>
                  <p className="text-[12px] text-[#8a9a8e]">
                    {currentEmployee.role}
                  </p>
                </div>
              </div>
              <div
                className={cn(
                  "rounded-full px-3 py-1 text-[12px] font-semibold transition-colors",
                  allDone
                    ? "bg-[#3E715C]/15 text-[#3E715C]"
                    : "bg-[#f5f7f2] text-[#8a9a8e]"
                )}
              >
                {allDone ? "Ferdig ✓" : "Behandler..."}
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Step timeline */}
          <div className="space-y-1.5">
            {PAYROLL_STEPS.map((step, i) => {
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
                  className="flex items-center gap-3 rounded-xl border border-white/10 px-4 py-2.5"
                >
                  <div className="relative flex h-7 w-7 shrink-0 items-center justify-center">
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
                        className="flex h-5 w-5 items-center justify-center rounded-full bg-[#3E715C]"
                      >
                        <CheckCircleIcon className="h-3 w-3 text-white" />
                      </motion.div>
                    ) : (
                      <div className="flex h-5 w-5 items-center justify-center rounded-full bg-[#f0f2ed]">
                        <Icon className="h-2.5 w-2.5 text-[#8a9a8e]" />
                      </div>
                    )}
                  </div>

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

          {/* All done badge */}
          <AnimatePresence>
            {allDone && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="mt-4 flex items-center justify-center gap-2 rounded-xl bg-[#3E715C]/8 px-4 py-2.5"
              >
                <CoffeeIcon className="h-3.5 w-3.5 text-[#3E715C]" />
                <span className="text-[12px] font-medium text-[#3E715C]">
                  Neste ansatt behandles automatisk
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
// ANIMATION 2: PAYSLIP BREAKDOWN
// ============================================================================

function PayslipBreakdownAnimation() {
  const { ref: viewportRef, hasEntered } = useMarketingViewport();
  const [phase, setPhase] = useState(0);
  const [nettoDisplay, setNettoDisplay] = useState(0);
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

    schedule(() => setPhase(1), 800);
    schedule(() => setPhase(2), 1800);
    schedule(() => setPhase(3), 2800);
    schedule(() => setPhase(4), 3800);

    return () => clearTimers();
  }, [hasEntered]);

  useEffect(() => {
    if (phase < 4) {
      setNettoDisplay(0);
      return;
    }

    const target = 25245;
    const duration = 1200;
    const frames = 60;
    let frame = 0;
    const timer = setInterval(() => {
      frame++;
      const progress = Math.min(frame / frames, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setNettoDisplay(Math.round(target * eased));
      if (frame >= frames) clearInterval(timer);
    }, duration / frames);

    return () => clearInterval(timer);
  }, [phase]);

  const deductions = [
    {
      label: "Skatt (34%)",
      amount: "- kr 15 300",
      tint: "red" as const,
      bgClass: "bg-red-50/80 border-red-200/40",
    },
    {
      label: "Trygdeavgift (7.9%)",
      amount: "- kr 3 555",
      tint: "orange" as const,
      bgClass: "bg-orange-50/80 border-orange-200/40",
    },
    {
      label: "Pensjon (2%)",
      amount: "- kr 900",
      tint: "amber" as const,
      bgClass: "bg-amber-50/80 border-amber-200/40",
    },
  ];

  return (
    <div ref={viewportRef} className="mx-auto max-w-sm">
      <div className="overflow-hidden rounded-2xl border border-[#d4dbd6] bg-white p-8">
        {/* Brutto */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={hasEntered ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, ease: MARKETING_EASING }}
          className="mb-6 text-center"
        >
          <p className="text-[12px] font-bold tracking-wider text-[#8a9a8e] uppercase">
            Bruttolønn
          </p>
          <p className="mt-1 text-3xl font-normal tabular-nums text-[#1a2e23]">
            kr 45 000
          </p>
        </motion.div>

        <div className="mb-4 h-px bg-[#d4dbd6]" />

        {/* Deduction layers */}
        <div className="space-y-2" style={{ perspective: "600px" }}>
          {deductions.map((d, i) => {
            const isActive = phase >= i + 1;
            return (
              <motion.div
                key={d.label}
                initial={{ opacity: 0, rotateX: 0, y: 0 }}
                animate={
                  isActive
                    ? { opacity: 1, rotateX: -8, y: i * 4 }
                    : hasEntered
                      ? { opacity: 0.3, rotateX: 0, y: 0 }
                      : { opacity: 0, rotateX: 0, y: 0 }
                }
                transition={{ duration: 0.6, ease: MARKETING_EASING }}
                style={{ transformOrigin: "top center" }}
                className={cn(
                  "flex items-center justify-between rounded-xl border px-4 py-3 transition-colors",
                  isActive ? d.bgClass : "border-[#d4dbd6]/30 bg-[#f5f7f2]"
                )}
              >
                <span className="text-xs font-medium text-[#4a5e52]">
                  {d.label}
                </span>
                <motion.span
                  initial={{ opacity: 0, x: 10 }}
                  animate={isActive ? { opacity: 1, x: 0 } : {}}
                  transition={{ delay: 0.2, duration: 0.4 }}
                  className={cn(
                    "font-mono text-xs font-medium tabular-nums",
                    d.tint === "red" && "text-red-500",
                    d.tint === "orange" && "text-orange-500",
                    d.tint === "amber" && "text-amber-600"
                  )}
                >
                  {d.amount}
                </motion.span>
              </motion.div>
            );
          })}
        </div>

        {/* Netto */}
        <div className="mt-6 min-h-[72px] overflow-hidden">
          <AnimatePresence>
            {phase >= 4 && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
                className="rounded-xl border border-emerald-200/60 bg-emerald-50/70 px-4 py-4 text-center"
              >
                <p className="text-[12px] font-bold tracking-wider text-emerald-600 uppercase">
                  Netto til utbetaling
                </p>
                <motion.p
                  animate={{ scale: [1, 1.04, 1] }}
                  transition={{
                    duration: 1.5,
                    repeat: 2,
                    ease: "easeInOut",
                  }}
                  className="mt-1 text-2xl font-normal tabular-nums text-emerald-700"
                >
                  kr {nettoDisplay.toLocaleString("nb-NO")}
                </motion.p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// ANIMATION 3: A-MELDING DELIVERY — structured step flow
// ============================================================================

const AMELDING_FIELDS = [
  { label: "Arbeidsforhold", value: "3 ansatte" },
  { label: "Inntekt og trekk", value: "kr 135 000 / kr 59 265" },
  { label: "Arbeidsgiveravgift", value: "kr 19 035" },
  { label: "Feriepenger avsatt", value: "kr 16 200" },
  { label: "Periode", value: "Januar 2026" },
] as const;

function AMeldingDeliveryAnimation() {
  const { ref: viewportRef, hasEntered } = useMarketingViewport();
  const [filledFields, setFilledFields] = useState<number[]>([]);
  const [spinningField, setSpinningField] = useState(-1);
  const [showValidated, setShowValidated] = useState(false);
  const [showSent, setShowSent] = useState(false);
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
      setSpinningField(-1);
      setShowValidated(false);
      setShowSent(false);

      AMELDING_FIELDS.forEach((_, i) => {
        const spinStart = 400 + i * 700;
        const fillTime = spinStart + 450;

        schedule(() => setSpinningField(i), spinStart);
        schedule(() => {
          setSpinningField(-1);
          setFilledFields((prev) => [...prev, i]);
        }, fillTime);
      });

      const allFilledTime = 400 + AMELDING_FIELDS.length * 700 + 300;

      schedule(() => setShowValidated(true), allFilledTime);
      schedule(() => setShowSent(true), allFilledTime + 1200);
      schedule(() => runCycle(), allFilledTime + 4500);
    };

    runCycle();
    return () => clearTimers();
  }, [hasEntered]);

  return (
    <div ref={viewportRef} className="mx-auto max-w-md">
      <div className="overflow-hidden rounded-2xl border border-white/15 bg-white/[0.08] p-6 shadow-2xl backdrop-blur-3xl">
        <div className="pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-br from-white/30 via-transparent to-transparent" />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/60 to-transparent" />

        <div className="relative z-10">
          {/* Header */}
          <div className="mb-5 flex items-center gap-3 border-b border-white/10 pb-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#3E715C]/10">
              <ClipboardCheckIcon className="h-4 w-4 text-[#3E715C]" />
            </div>
            <div>
              <p className="text-sm font-medium text-[#1a2e23]">A-melding</p>
              <p className="text-[12px] text-[#8a9a8e]">
                Månedlig rapportering til Skatteetaten
              </p>
            </div>
          </div>

          {/* Fields */}
          <div className="space-y-1.5">
            {AMELDING_FIELDS.map((field, i) => {
              const isFilled = filledFields.includes(i);
              const isSpinning = spinningField === i;

              return (
                <motion.div
                  key={field.label}
                  animate={{
                    opacity: isFilled || isSpinning ? 1 : 0.5,
                    backgroundColor: isFilled
                      ? "rgba(62, 113, 92, 0.06)"
                      : "rgba(245, 247, 242, 0.2)",
                  }}
                  transition={{ duration: 0.3 }}
                  className="flex items-center justify-between rounded-lg border border-white/10 px-4 py-2.5"
                >
                  <span className="text-xs text-[#4a5e52]">{field.label}</span>
                  <div className="flex items-center gap-2">
                    {isSpinning && (
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{
                          duration: 0.5,
                          repeat: Infinity,
                          ease: "linear",
                        }}
                        className="h-3 w-3 rounded-full border-2 border-[#3E715C]/20 border-t-[#3E715C]"
                      />
                    )}
                    <motion.span
                      initial={{ opacity: 0, x: 8 }}
                      animate={
                        isFilled
                          ? { opacity: 1, x: 0 }
                          : { opacity: 0, x: 8 }
                      }
                      transition={{ duration: 0.3 }}
                      className="text-xs font-medium tabular-nums text-[#1a2e23]"
                    >
                      {field.value}
                    </motion.span>
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* Validation + send */}
          <div className="mt-5 flex min-h-[44px] items-center justify-center">
            <AnimatePresence mode="wait">
              {showSent ? (
                <motion.div
                  key="sent"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ type: "spring", stiffness: 300, damping: 15 }}
                  className="flex items-center gap-2 rounded-full bg-[#3E715C]/10 px-5 py-2.5"
                >
                  <CheckCircleIcon className="h-4 w-4 text-[#3E715C]" />
                  <span className="text-sm font-medium text-[#3E715C]">
                    Levert til Skatteetaten
                  </span>
                </motion.div>
              ) : showValidated ? (
                <motion.div
                  key="validated"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.4 }}
                  className="flex items-center gap-2 rounded-full bg-emerald-50 px-4 py-2"
                >
                  <ShieldCheckIcon className="h-3.5 w-3.5 text-emerald-600" />
                  <span className="text-xs font-medium text-emerald-700">
                    Validering bestått — sender...
                  </span>
                </motion.div>
              ) : null}
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

export default function LonnPage() {
  return (
    <>
      {/* Hero */}
      <HeroSection
        backgroundImage="/ciribackground5.jpg"
        title="Lønn som kjører seg selv."
        subtitle="Skattekort, lønnsberegning og A-melding — automatisert fra start til slutt. Du slipper å tenke på det."
        ctaText="Sett opp lønnskjøring"
        ctaHref="/register"
      />

      {/* Metrics */}
      <PageMetrics
        stats={[
          { value: "A-melding", label: "Automatisk hver måned" },
          { value: "Skattekort", label: "Hentet fra Skatteetaten" },
          { value: "OTP", label: "Pensjonsberegning inkl." },
          { value: "Feriepenger", label: "Automatisk avsatt" },
        ]}
      />

      {/* Animation 1: Payroll Autopilot (Glass, centered) */}
      <GlassSection>
        <Reveal>
          <div className="text-center">
            <SectionLabel>
              <UsersIcon className="h-3.5 w-3.5" />
              Automatisk lønnskjøring
            </SectionLabel>
            <h2 className="mt-6 text-4xl font-normal tracking-tight text-[#1a2e23] sm:text-5xl">
              Fra skattekort til{" "}
              <span className="text-[#3E715C]">lønnsslipp</span>
            </h2>
            <p className="mx-auto mt-5 max-w-lg text-base leading-relaxed text-[#4a5e52]">
              Ciri henter skattekort, beregner lønn, trekker skatt og avgifter,
              genererer lønnsslipp og sender A-melding — for hver ansatt,
              automatisk.
            </p>
          </div>
        </Reveal>
        <Reveal delay={0.15}>
          <div className="mt-12">
            <PayrollAutopilotAnimation />
          </div>
        </Reveal>
        <Reveal delay={0.25}>
          <ul className="mx-auto mt-10 flex max-w-2xl flex-col gap-3 sm:flex-row sm:gap-8">
            {[
              "Automatisk henting av skattekort",
              "Tabell A og B støttet",
              "OTP og feriepenger beregnet",
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
        label="Lønnsfunksjoner"
        labelIcon={<UsersIcon className="h-3.5 w-3.5" />}
        heading="Lønn og A-melding"
        headingAccent="på autopilot"
        description="Registrer ansatte, beregn lønn og send A-melding — alt automatisk."
        features={[
          {
            icon: <CreditCardIcon className="h-5 w-5" />,
            title: "Lønnsslipp",
            desc: "Automatisk generering av lønnsslipp med alle obligatoriske felter.",
          },
          {
            icon: <FileTextIcon className="h-5 w-5" />,
            title: "A-melding",
            desc: "Månedlig rapportering til Skatteetaten generert og klar for innsending.",
          },
          {
            icon: <UsersIcon className="h-5 w-5" />,
            title: "Ansattregister",
            desc: "Komplett oversikt over ansatte med skattekort, lønn og arbeidsavtaler.",
          },
        ]}
      />

      {/* Animation 2: Payslip Breakdown (Solid cream, 2-col) */}
      <SolidSection variant="cream">
        <div className="grid items-center gap-16 lg:grid-cols-2">
          <Reveal>
            <div>
              <SectionLabel>
                <CreditCardIcon className="h-3.5 w-3.5" />
                Lønnsberegning
              </SectionLabel>
              <h2 className="mt-6 text-3xl font-normal tracking-tight text-[#1a2e23] sm:text-4xl">
                Detaljert{" "}
                <span className="text-[#3E715C]">lønnsberegning</span>
              </h2>
              <p className="mt-5 max-w-md text-base leading-relaxed text-[#4a5e52]">
                Se nøyaktig hvordan bruttolønn blir til netto. Skatt,
                trygdeavgift og pensjon — alt beregnes automatisk etter
                gjeldende satser.
              </p>
              <BulletList
                items={[
                  "Skatt beregnet etter riktig tabell",
                  "Trygdeavgift og pensjon inkludert",
                  "Feriepenger avsatt automatisk",
                ]}
              />
            </div>
          </Reveal>
          <Reveal delay={0.15}>
            <div className="min-h-[320px] sm:min-h-[380px]">
              <PayslipBreakdownAnimation />
            </div>
          </Reveal>
        </div>
      </SolidSection>

      {/* TextSection 2: Pain points / breathing room */}
      <SolidSection>
        <Reveal>
          <div className="text-center">
            <SectionLabel>
              <CoffeeIcon className="h-3.5 w-3.5" />
              Slippe hodepinen
            </SectionLabel>
            <h2 className="mt-6 text-4xl font-normal tracking-tight text-[#1a2e23] sm:text-5xl">
              Lønn er{" "}
              <span className="text-[#3E715C]">komplisert nok</span>
            </h2>
            <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-[#4a5e52]">
              Norske småbedriftseiere bruker timer på skattekort, A-melding,
              feriepenger og arbeidsgiveravgift. Med Ciri slipper du alt det —
              og kan fokusere på det du faktisk driver med.
            </p>
          </div>
        </Reveal>
        <div className="mt-16 grid gap-4 sm:grid-cols-3">
          {[
            {
              icon: <CalendarIcon className="h-5 w-5" />,
              title: "Aldri glem A-meldingen",
              desc: "Hver måned, automatisk. Du får bare en bekreftelse når den er levert.",
            },
            {
              icon: <ShieldCheckIcon className="h-5 w-5" />,
              title: "Riktig skatt, alltid",
              desc: "Skattekort hentes automatisk. Endringer fanges opp med en gang.",
            },
            {
              icon: <BanknoteIcon className="h-5 w-5" />,
              title: "Feriepenger under kontroll",
              desc: "Avsettes automatisk etter loven. Utbetales i juni uten manuelt arbeid.",
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

      {/* Animation 3: A-Melding Delivery (Glass, 2-col) */}
      <GlassSection>
        <div className="grid items-center gap-16 lg:grid-cols-2">
          <Reveal>
            <div>
              <SectionLabel>
                <ClipboardCheckIcon className="h-3.5 w-3.5" />
                A-melding levering
              </SectionLabel>
              <h2 className="mt-6 text-3xl font-normal tracking-tight text-[#1a2e23] sm:text-4xl">
                Full kontroll over{" "}
                <span className="text-[#3E715C]">lønnskjøring</span>
              </h2>
              <p className="mt-5 max-w-md text-base leading-relaxed text-[#4a5e52]">
                A-meldingen fylles ut automatisk med arbeidsforhold, inntekt,
                trekk og arbeidsgiveravgift. Validert og sendt — helt uten din
                innsats.
              </p>
              <BulletList
                items={[
                  "Månedlig A-melding automatisk",
                  "Kvittering fra Skatteetaten",
                  "Oversikt over alle innleveringer",
                ]}
              />
            </div>
          </Reveal>
          <Reveal delay={0.15}>
            <div className="min-h-[320px] sm:min-h-[380px]">
              <AMeldingDeliveryAnimation />
            </div>
          </Reveal>
        </div>
      </GlassSection>

      {/* CTA */}
      <MarketingCTA
        title="Klar til å automatisere"
        titleAccent="lønnskjøringen?"
        subtitle="Sett opp lønnsystemet på under 10 minutter. Ciri tar seg av resten."
        ctaText="Sett opp lønnskjøring"
      />
    </>
  );
}
