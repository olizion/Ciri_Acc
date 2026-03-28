"use client";

import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import { ArrowRightIcon, CheckCircleIcon } from "lucide-react";
import CiriLogo from "@/components/layout/ciri-logo";
import { cn } from "@/lib/utils";

// ============================================================================
// CONSTANTS
// ============================================================================

export const MARKETING_EASING: [number, number, number, number] = [0.25, 0.46, 0.45, 0.94];

// ============================================================================
// VIEWPORT HOOK — reliable viewport detection with sync fallback
// ============================================================================

export function useMarketingViewport() {
  const ref = useRef<HTMLDivElement>(null);
  const [hasEntered, setHasEntered] = useState(false);

  useEffect(() => {
    if (hasEntered) return;
    const el = ref.current;
    if (!el) return;

    // Synchronous check: trigger immediately if already in viewport
    const rect = el.getBoundingClientRect();
    if (rect.top < window.innerHeight && rect.bottom > 0) {
      setHasEntered(true);
      return;
    }

    // Async fallback: IntersectionObserver for scroll-into-view
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setHasEntered(true);
          observer.disconnect();
        }
      },
      { rootMargin: "0px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasEntered]);

  return { ref, hasEntered };
}

// ============================================================================
// PAGE METRICS BAR — 4 stats right under hero
// ============================================================================

export interface MetricStat {
  value: string;
  numericTarget?: number;
  label: string;
  suffix?: string;
}

export function PageMetrics({ stats }: { stats: MetricStat[] }) {
  const { ref, hasEntered } = useMarketingViewport();
  const [counts, setCounts] = useState<number[]>(stats.map(() => 0));
  const started = useRef(false);

  useEffect(() => {
    if (!hasEntered || started.current) return;
    started.current = true;
    const duration = 2000;
    const totalFrames = 80;
    let frame = 0;
    const timer = setInterval(() => {
      frame++;
      const progress = Math.min(frame / totalFrames, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCounts(stats.map((s) => Math.floor(eased * (s.numericTarget ?? 0))));
      if (frame >= totalFrames) clearInterval(timer);
    }, duration / totalFrames);
    return () => clearInterval(timer);
  }, [hasEntered, stats]);

  return (
    <section className="px-4 py-3">
      <div ref={ref} className="mx-auto max-w-[var(--marketing-container)] overflow-hidden rounded-[2rem] border border-white/50 bg-white/70 shadow-sm backdrop-blur-xl">
        <div className="grid grid-cols-2 divide-x divide-[#d4dbd6] sm:grid-cols-4">
          {stats.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={false}
              animate={hasEntered ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
              transition={{ duration: 0.5, delay: hasEntered ? i * 0.1 : 0 }}
              className="px-6 py-8 text-center sm:py-10"
            >
              <p
                className={cn(
                  "text-2xl text-[#3E715C] sm:text-3xl",
                  stat.numericTarget && "tabular-nums"
                )}
              >
                {stat.numericTarget
                  ? `${counts[i].toLocaleString("nb-NO")}${stat.suffix ?? ""}`
                  : stat.value}
              </p>
              <p className="mt-1.5 text-xs tracking-wide text-[#8a9a8e]">
                {stat.label}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ============================================================================
// FEATURE GRID — 3-column card grid for feature highlights
// ============================================================================

export interface FeatureCard {
  icon: React.ReactNode;
  title: string;
  desc: string;
}

export function FeatureGrid({
  label,
  labelIcon,
  heading,
  headingAccent,
  description,
  features,
}: {
  label: string;
  labelIcon: React.ReactNode;
  heading: string;
  headingAccent: string;
  description: string;
  features: FeatureCard[];
}) {
  return (
    <SolidSection>
      <Reveal>
        <div className="text-center">
          <SectionLabel>
            {labelIcon}
            {label}
          </SectionLabel>
          <h2 className="mt-6 text-4xl font-normal tracking-tight text-[#1a2e23] sm:text-5xl">
            {heading} <span className="text-[#3E715C]">{headingAccent}</span>
          </h2>
          <p className="mx-auto mt-5 max-w-lg text-base text-[#4a5e52]">
            {description}
          </p>
        </div>
      </Reveal>

      <div className="mt-16 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {features.map((feature, i) => (
          <Reveal key={feature.title} delay={i * 0.06} className="h-full">
            <div className="flex h-full flex-col rounded-2xl border border-[#d4dbd6] bg-[#f5f7f2] p-7 sm:p-8">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-[#3E715C]">
                {feature.icon}
              </div>
              <h3 className="mt-5 text-lg text-[#1a2e23]">{feature.title}</h3>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-[#4a5e52]">
                {feature.desc}
              </p>
            </div>
          </Reveal>
        ))}
      </div>
    </SolidSection>
  );
}

// ============================================================================
// BULLET LIST — reusable check-mark bullet list
// ============================================================================

export function BulletList({ items }: { items: string[] }) {
  return (
    <ul className="mt-6 space-y-3">
      {items.map((b) => (
        <li key={b} className="flex items-start gap-3">
          <CheckCircleIcon className="mt-0.5 h-4 w-4 flex-shrink-0 text-[#3E715C]" />
          <span className="text-sm text-[#4a5e52]">{b}</span>
        </li>
      ))}
    </ul>
  );
}

// ============================================================================
// SCROLL REVEAL WRAPPER
// ============================================================================

export function Reveal({
  children,
  className,
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  const { ref, hasEntered } = useMarketingViewport();

  return (
    <motion.div
      ref={ref}
      initial={false}
      animate={hasEntered ? { opacity: 1, y: 0 } : { opacity: 0, y: 32 }}
      transition={{ duration: 0.7, delay: hasEntered ? delay : 0, ease: MARKETING_EASING }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// ============================================================================
// SECTION LABEL (pill)
// ============================================================================

export function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-[#3E715C]/20 bg-[#3E715C]/10 px-4 py-1.5 text-[13px] font-bold tracking-[0.15em] text-[#3E715C] uppercase">
      {children}
    </span>
  );
}

// ============================================================================
// GLASS SECTION — frosted glass container with gradient orbs
// ============================================================================

export function GlassSection({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className="px-4 py-3">
      <div className="relative mx-auto max-w-[var(--marketing-container)] overflow-hidden rounded-[2rem]">
        {/* Rich colorful background visible through the glass */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#2d5e4a]/12 via-[#e8ede9] to-[#5B906F]/15" />
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute top-0 -left-32 h-[500px] w-[500px] rounded-full bg-[#3E715C]/18 blur-[120px]" />
          <div className="absolute top-1/2 -right-20 h-96 w-96 -translate-y-1/2 rounded-full bg-[#5B906F]/14 blur-[100px]" />
          <div className="absolute bottom-0 left-1/3 h-80 w-80 rounded-full bg-[#8BB5A2]/10 blur-[100px]" />
          <div className="absolute top-1/4 left-1/2 h-64 w-64 -translate-x-1/2 rounded-full bg-[#3E715C]/8 blur-[80px]" />
          <div className="absolute top-1/6 right-1/4 h-40 w-40 rounded-full bg-[#4a8068]/10 blur-[60px]" />
          <div className="absolute bottom-1/4 left-1/4 h-36 w-36 rounded-full bg-[#6aaa88]/8 blur-[50px]" />
        </div>

        {/* Glass section container */}
        <div
          className={cn(
            "relative overflow-hidden rounded-[2rem] border border-white/20 bg-white/[0.12] px-8 py-20 backdrop-blur-2xl backdrop-saturate-[1.6] sm:px-12 sm:py-28",
            className
          )}
        >
          {/* Edge highlights */}
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/60 to-transparent" />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
          <div className="pointer-events-none absolute inset-y-0 left-0 w-px bg-gradient-to-b from-white/50 via-white/15 to-transparent" />
          <div className="pointer-events-none absolute inset-y-0 right-0 w-px bg-gradient-to-b from-white/10 via-transparent to-transparent" />
          {/* Specular corner glow */}
          <div className="pointer-events-none absolute inset-0 rounded-[2rem] bg-gradient-to-br from-white/25 via-transparent to-transparent" />

          <div className="relative z-10">{children}</div>
        </div>
      </div>
    </section>
  );
}

// ============================================================================
// SOLID SECTION — bordered white/cream card container
// ============================================================================

export function SolidSection({
  children,
  className,
  variant = "white",
}: {
  children: React.ReactNode;
  className?: string;
  variant?: "white" | "cream";
}) {
  return (
    <section className="px-4 py-3">
      <div
        className={cn(
          "mx-auto max-w-[var(--marketing-container)] overflow-hidden rounded-[2rem] border border-[#d4dbd6] px-8 py-20 shadow-sm sm:px-12 sm:py-28",
          variant === "cream" ? "bg-[#f5f7f2]" : "bg-white",
          className
        )}
      >
        {children}
      </div>
    </section>
  );
}

// ============================================================================
// HERO SECTION — background image hero with title/subtitle/CTA
// ============================================================================

export function HeroSection({
  backgroundImage,
  title,
  titleAccent,
  subtitle,
  ctaText,
  ctaHref,
}: {
  backgroundImage: string;
  title: string;
  titleAccent?: string;
  subtitle: string;
  ctaText: string;
  ctaHref: string;
}) {
  return (
    <section className="px-4 pt-28 pb-3 sm:pt-36">
      <div className="mx-auto max-w-[var(--marketing-container)]">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3, ease: MARKETING_EASING }}
          className="relative overflow-hidden rounded-[2rem] border border-[#d4dbd6] bg-[#f5f7f2] px-8 py-20 shadow-sm sm:px-16 sm:py-28 lg:px-24"
        >
          {/* Background painting inside card */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={backgroundImage}
            alt=""
            className="absolute inset-0 h-full w-full object-cover opacity-50"
          />

          {/* Content */}
          <div className="relative z-10 text-center">
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.5 }}
              className="text-3xl leading-[1.1] font-normal tracking-tight text-[#1a2e23] sm:text-4xl lg:text-5xl"
            >
              {title}
              {titleAccent && (
                <>
                  <br />
                  <span className="text-[#3E715C]">{titleAccent}</span>
                </>
              )}
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.65 }}
              className="mx-auto mt-5 max-w-lg text-sm leading-relaxed text-[#4a5e52] sm:text-base"
            >
              {subtitle}
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.8 }}
              className="mt-8 flex flex-wrap items-center justify-center gap-3"
            >
              <Link
                href={ctaHref}
                className="group flex items-center gap-2 rounded-full bg-[#3E715C] px-6 py-3 text-sm font-medium text-white transition-all hover:bg-[#5B906F] hover:shadow-xl hover:shadow-[#3E715C]/25"
              >
                {ctaText}
                <ArrowRightIcon className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

// ============================================================================
// MARKETING CTA — bottom CTA block with CiriLogo
// ============================================================================

export function MarketingCTA({
  title,
  titleAccent,
  subtitle,
  ctaText = "Kom i gang gratis",
  ctaHref = "/register",
}: {
  title: string;
  titleAccent: string;
  subtitle: string;
  ctaText?: string;
  ctaHref?: string;
}) {
  return (
    <section className="px-4 py-3 pb-6">
      <div className="relative mx-auto max-w-[var(--marketing-container)] overflow-hidden rounded-[2rem] border border-[#d4dbd6] bg-white shadow-sm">
        <div className="absolute inset-0">
          <Image
            src="/ciribakgrunn.png"
            alt=""
            fill
            className="object-cover opacity-[0.04]"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-white/80 via-transparent to-white/80" />
        </div>

        <div className="relative z-10 mx-auto max-w-3xl px-8 py-20 text-center sm:py-32">
          <Reveal>
            <CiriLogo
              size="lg"
              animated
              intensity="normal"
              showPulseRings
              className="mx-auto mb-8 justify-center"
            />
            <h2 className="text-4xl font-normal tracking-tight text-[#1a2e23] sm:text-6xl">
              {title}
              <br />
              <span className="text-[#3E715C]">{titleAccent}</span>
            </h2>
            <p className="mx-auto mt-6 max-w-md text-base text-[#4a5e52]">
              {subtitle}
            </p>
            <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
              <Link
                href={ctaHref}
                className="group flex items-center gap-2 rounded-full bg-[#3E715C] px-8 py-4 text-base font-medium text-white transition-all hover:bg-[#5B906F] hover:shadow-xl hover:shadow-[#3E715C]/30"
              >
                {ctaText}
                <ArrowRightIcon className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </div>
            <p className="mt-5 text-xs text-[#8a9a8e]">
              Ingen kredittkort nødvendig. Gratis i 14 dager.
            </p>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
