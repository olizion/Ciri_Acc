"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShieldCheckIcon,
  LockIcon,
  ServerIcon,
  ScaleIcon,
  FileCheckIcon,
  GlobeIcon,
  CheckCircleIcon,
  ShieldIcon,
  KeyIcon,
  DatabaseIcon,
  FingerprintIcon,
  EyeOffIcon,
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
// ANIMATION 1: SECURITY LAYERS — multi-frame concrete security visualization
// ============================================================================

const SECURITY_FRAMES = [
  {
    icon: LockIcon,
    title: "Kryptering i transit",
    subtitle: "TLS 1.3 / HTTPS",
    visual: "transit",
    detail: "All kommunikasjon mellom din nettleser og Ciri er kryptert med TLS 1.3.",
  },
  {
    icon: DatabaseIcon,
    title: "Kryptering i hvile",
    subtitle: "AES-256",
    visual: "rest",
    detail: "Regnskapsdata lagres med AES-256-kryptering. Ingen kan lese data uten nøkkel.",
  },
  {
    icon: FingerprintIcon,
    title: "Tilgangskontroll",
    subtitle: "Autentisering",
    visual: "access",
    detail: "Kun autoriserte brukere har tilgang. Støtte for tofaktorautentisering.",
  },
  {
    icon: FileCheckIcon,
    title: "Revisjonsspor",
    subtitle: "SHA-256 signatur",
    visual: "audit",
    detail: "Hver endring logges med kryptografisk signatur. Uforanderlig historikk.",
  },
] as const;

function SecurityLayersAnimation() {
  const { ref: viewportRef, hasEntered } = useMarketingViewport();
  const [currentFrame, setCurrentFrame] = useState(0);
  const [showDetail, setShowDetail] = useState(false);
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
      let delay = 0;

      for (let i = 0; i < SECURITY_FRAMES.length; i++) {
        const frameStart = delay;
        schedule(() => {
          setCurrentFrame(i);
          setShowDetail(false);
        }, frameStart);
        schedule(() => setShowDetail(true), frameStart + 600);
        delay += 2800;
      }

      // Show "all complete" state briefly, then restart
      schedule(() => {
        setCurrentFrame(-1); // special "all done" state
        setShowDetail(true);
      }, delay);
      schedule(() => runCycle(), delay + 3000);
    };

    runCycle();
    return () => clearTimers();
  }, [hasEntered]);

  const frame =
    currentFrame >= 0 ? SECURITY_FRAMES[currentFrame] : null;

  return (
    <div ref={viewportRef} className="relative mx-auto max-w-md">
      <div className="relative overflow-hidden rounded-2xl border border-white/15 bg-white/[0.08] p-6 shadow-2xl backdrop-blur-3xl">
        <div className="pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-br from-white/30 via-transparent to-transparent" />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/60 to-transparent" />

        <div className="relative z-10">
          {/* Progress dots */}
          <div className="mb-5 flex items-center justify-center gap-2">
            {SECURITY_FRAMES.map((_, i) => (
              <motion.div
                key={i}
                animate={{
                  backgroundColor:
                    currentFrame === -1 || i <= currentFrame
                      ? "#3E715C"
                      : "rgba(138,154,142,0.2)",
                  scale: i === currentFrame ? 1.3 : 1,
                }}
                transition={{ duration: 0.3 }}
                className="h-2 w-2 rounded-full"
              />
            ))}
          </div>

          <AnimatePresence mode="wait">
            {frame ? (
              <motion.div
                key={currentFrame}
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -30 }}
                transition={{ duration: 0.4, ease: MARKETING_EASING }}
              >
                {/* Frame content */}
                <div className="flex flex-col items-center text-center">
                  {/* Icon */}
                  <motion.div
                    initial={{ scale: 0, rotate: -15 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{
                      type: "spring",
                      stiffness: 300,
                      damping: 15,
                      delay: 0.1,
                    }}
                    className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#3E715C]/10"
                  >
                    <frame.icon className="h-8 w-8 text-[#3E715C]" />
                  </motion.div>

                  <motion.p
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="text-lg font-medium text-[#1a2e23]"
                  >
                    {frame.title}
                  </motion.p>
                  <motion.p
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="mt-1 font-mono text-xs text-[#5B906F]"
                  >
                    {frame.subtitle}
                  </motion.p>

                  {/* Visual for each frame */}
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={
                      showDetail
                        ? { opacity: 1, y: 0 }
                        : { opacity: 0, y: 10 }
                    }
                    transition={{ duration: 0.4 }}
                    className="mt-5 w-full"
                  >
                    {frame.visual === "transit" && (
                      <div className="flex items-center justify-center gap-3">
                        <div className="rounded-lg border border-[#d4dbd6] bg-white/80 px-3 py-2">
                          <p className="text-[13px] text-[#8a9a8e]">Nettleser</p>
                          <p className="text-[12px] font-medium text-[#1a2e23]">
                            Faktura.pdf
                          </p>
                        </div>
                        <div className="flex items-center gap-1">
                          <motion.div
                            animate={{ x: [0, 4, 0] }}
                            transition={{
                              duration: 1,
                              repeat: Infinity,
                              ease: "easeInOut",
                            }}
                            className="h-px w-8 bg-gradient-to-r from-[#3E715C] to-[#5B906F]"
                          />
                          <LockIcon className="h-3 w-3 text-[#3E715C]" />
                          <motion.div
                            animate={{ x: [0, 4, 0] }}
                            transition={{
                              duration: 1,
                              repeat: Infinity,
                              ease: "easeInOut",
                              delay: 0.2,
                            }}
                            className="h-px w-8 bg-gradient-to-r from-[#5B906F] to-[#3E715C]"
                          />
                        </div>
                        <div className="rounded-lg border border-[#3E715C]/20 bg-[#3E715C]/5 px-3 py-2">
                          <p className="text-[13px] text-[#5B906F]">Ciri Server</p>
                          <p className="font-mono text-[12px] text-[#3E715C]">
                            TLS 1.3
                          </p>
                        </div>
                      </div>
                    )}

                    {frame.visual === "rest" && (
                      <div className="flex items-center justify-center gap-2">
                        {["Faktura", "Bilag", "Konto", "MVA"].map(
                          (item, i) => (
                            <motion.div
                              key={item}
                              initial={{ opacity: 0, y: 8 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: 0.1 * i }}
                              className="rounded-lg border border-[#3E715C]/15 bg-[#3E715C]/5 px-2.5 py-2 text-center"
                            >
                              <LockIcon className="mx-auto mb-1 h-2.5 w-2.5 text-[#3E715C]" />
                              <p className="font-mono text-[8px] text-[#8a9a8e]">
                                {item}
                              </p>
                            </motion.div>
                          )
                        )}
                      </div>
                    )}

                    {frame.visual === "access" && (
                      <div className="flex flex-col items-center gap-2">
                        {[
                          { step: "Passord verifisert", ok: true },
                          { step: "2FA-kode godkjent", ok: true },
                          { step: "Tilgang innvilget", ok: true },
                        ].map((item, i) => (
                          <motion.div
                            key={item.step}
                            initial={{ opacity: 0, x: -12 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.15 * i }}
                            className="flex items-center gap-2 rounded-lg border border-[#3E715C]/15 bg-[#3E715C]/5 px-4 py-1.5"
                          >
                            <CheckCircleIcon className="h-3 w-3 text-[#3E715C]" />
                            <span className="text-[12px] font-medium text-[#1a2e23]">
                              {item.step}
                            </span>
                          </motion.div>
                        ))}
                      </div>
                    )}

                    {frame.visual === "audit" && (
                      <div className="space-y-1.5">
                        {[
                          {
                            time: "14:32:01",
                            action: "Faktura #1042 opprettet",
                            hash: "a3d8c1...",
                          },
                          {
                            time: "14:32:15",
                            action: "MVA beregnet",
                            hash: "7b5f02...",
                          },
                          {
                            time: "14:33:02",
                            action: "Sendt til Altinn",
                            hash: "e6f912...",
                          },
                        ].map((entry, i) => (
                          <motion.div
                            key={entry.time}
                            initial={{ opacity: 0, x: -12 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.15 * i }}
                            className="flex items-center gap-3 rounded-lg bg-white/[0.06] px-3 py-1.5"
                          >
                            <span className="font-mono text-[13px] tabular-nums text-[#8a9a8e]">
                              {entry.time}
                            </span>
                            <span className="flex-1 text-[12px] text-[#4a5e52]">
                              {entry.action}
                            </span>
                            <span className="font-mono text-[8px] text-[#5B906F]">
                              {entry.hash}
                            </span>
                          </motion.div>
                        ))}
                      </div>
                    )}
                  </motion.div>

                  {/* Description */}
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={showDetail ? { opacity: 1 } : { opacity: 0 }}
                    transition={{ delay: 0.2 }}
                    className="mt-4 text-xs leading-relaxed text-[#4a5e52]"
                  >
                    {frame.detail}
                  </motion.p>
                </div>
              </motion.div>
            ) : (
              /* All complete state */
              <motion.div
                key="complete"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.5 }}
                className="flex flex-col items-center text-center"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{
                    type: "spring",
                    stiffness: 300,
                    damping: 15,
                    delay: 0.2,
                  }}
                  className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#3E715C]/10"
                >
                  <ShieldCheckIcon className="h-8 w-8 text-[#3E715C]" />
                </motion.div>

                <p className="text-lg font-medium text-[#1a2e23]">
                  Komplett sikkerhet
                </p>
                <p className="mt-1 text-xs text-[#8a9a8e]">
                  Alle 4 lag verifisert
                </p>

                <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
                  {SECURITY_FRAMES.map((f, i) => (
                    <motion.span
                      key={f.title}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.1 * i }}
                      className="flex items-center gap-1.5 rounded-full border border-[#3E715C]/20 bg-[#3E715C]/5 px-3 py-1 text-[12px] font-medium text-[#3E715C]"
                    >
                      <CheckCircleIcon className="h-2.5 w-2.5" />
                      {f.title}
                    </motion.span>
                  ))}
                </div>

                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 }}
                  className="mt-5 flex items-center gap-2 rounded-full bg-[#3E715C]/10 px-5 py-2.5"
                >
                  <ShieldCheckIcon className="h-4 w-4 text-[#3E715C]" />
                  <span className="text-sm font-medium text-[#3E715C]">
                    Dine data er trygge
                  </span>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// ANIMATION 2: DATA RESIDENCY MAP
// ============================================================================

function DataResidencyMapAnimation() {
  const { ref: viewportRef, hasEntered } = useMarketingViewport();
  const [dashOffset, setDashOffset] = useState(0);
  const animFrameRef = useRef<number>(0);

  useEffect(() => {
    if (!hasEntered) return;

    let offset = 0;
    const animate = () => {
      offset -= 0.5;
      setDashOffset(offset);
      animFrameRef.current = requestAnimationFrame(animate);
    };
    animFrameRef.current = requestAnimationFrame(animate);

    return () => cancelAnimationFrame(animFrameRef.current);
  }, [hasEntered]);

  const scandinaviaPath =
    "M180,40 L185,35 L195,30 L200,25 L210,28 L215,35 L220,30 L230,32 L240,28 " +
    "L250,30 L255,38 L250,48 L255,55 L260,52 L270,55 L275,65 L270,75 " +
    "L265,85 L268,95 L265,105 L260,115 L255,125 L250,135 L245,145 " +
    "L240,155 L235,165 L228,175 L220,180 L212,178 L205,182 L198,185 " +
    "L190,182 L185,175 L180,168 L175,160 L172,150 L170,140 L168,130 " +
    "L170,120 L172,110 L175,100 L178,90 L180,80 L178,70 L175,60 L178,50 Z";

  const finlandPath =
    "M270,55 L280,50 L290,48 L298,52 L302,60 L305,70 L308,80 " +
    "L305,90 L302,100 L298,110 L295,120 L290,128 L285,135 " +
    "L278,140 L270,138 L265,130 L262,120 L260,115 L265,105 " +
    "L268,95 L265,85 L270,75 L275,65 Z";

  const denmarkPath =
    "M195,185 L200,190 L210,195 L220,192 L225,188 L228,185 " +
    "L225,195 L218,200 L210,202 L200,200 L195,195 Z";

  const netherlandsPath =
    "M175,210 L180,205 L188,208 L195,212 L192,218 L185,220 L178,218 Z";

  const germanyPath =
    "M195,200 L210,202 L220,200 L230,205 L240,210 L245,220 " +
    "L240,230 L230,235 L220,232 L210,228 L200,225 L192,218 " +
    "L195,212 L195,200 Z";

  const eosBorderPath =
    "M140,25 C160,15 200,10 260,15 C320,20 350,50 355,90 " +
    "C360,130 350,170 340,200 C330,230 300,250 260,255 " +
    "C220,260 180,250 155,235 C130,220 120,190 125,160 " +
    "C130,130 135,100 138,70 C140,50 140,35 140,25";

  const oslo = { x: 200, y: 168 };
  const amsterdam = { x: 180, y: 212 };

  return (
    <div ref={viewportRef} className="mx-auto max-w-md">
      <div className="relative overflow-hidden rounded-2xl border border-[#d4dbd6] bg-white p-6">
        <div className="relative z-10">
          <svg viewBox="0 0 400 280" className="w-full">
            <defs>
              <filter id="sk-serverGlow">
                <feGaussianBlur stdDeviation="4" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
              <linearGradient id="sk-dataFlow" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#3E715C" />
                <stop offset="100%" stopColor="#5B906F" />
              </linearGradient>
            </defs>

            <rect width="400" height="280" fill="#f5f7f2" opacity="0.5" />

            <motion.path
              d={eosBorderPath}
              fill="none"
              stroke="#3E715C"
              strokeWidth="2"
              strokeDasharray="8 4"
              opacity={0.4}
              initial={{ pathLength: 0 }}
              animate={hasEntered ? { pathLength: 1 } : {}}
              transition={{ duration: 2, ease: "easeInOut" }}
            />

            <rect x="340" y="0" width="60" height="280" fill="#1a2e23" opacity="0.06" />
            <rect x="0" y="240" width="400" height="40" fill="#1a2e23" opacity="0.04" />

            <motion.g
              initial={{ opacity: 0 }}
              animate={hasEntered ? { opacity: 1 } : {}}
              transition={{ delay: 1.5, duration: 0.6 }}
            >
              <text x="330" y="145" textAnchor="middle" fill="#3E715C" fontSize="10" fontWeight="600" opacity="0.6">
                EØS-sone
              </text>
            </motion.g>

            {[
              { d: scandinaviaPath, delay: 0.3, opacity: 0.12 },
              { d: finlandPath, delay: 0.5, opacity: 0.08 },
              { d: denmarkPath, delay: 0.6, opacity: 0.1 },
              { d: netherlandsPath, delay: 0.7, opacity: 0.1 },
              { d: germanyPath, delay: 0.8, opacity: 0.08 },
            ].map((country, i) => (
              <motion.path
                key={i}
                d={country.d}
                fill="#3E715C"
                fillOpacity={country.opacity}
                stroke="#3E715C"
                strokeWidth="1"
                strokeOpacity="0.3"
                initial={{ opacity: 0 }}
                animate={hasEntered ? { opacity: 1 } : {}}
                transition={{ delay: country.delay, duration: 0.8 }}
              />
            ))}

            <line
              x1={oslo.x}
              y1={oslo.y}
              x2={amsterdam.x}
              y2={amsterdam.y}
              stroke="url(#sk-dataFlow)"
              strokeWidth="1.5"
              strokeDasharray="6 4"
              strokeDashoffset={dashOffset}
              opacity="0.6"
            />

            {/* Oslo */}
            <motion.g
              initial={{ opacity: 0, scale: 0 }}
              animate={hasEntered ? { opacity: 1, scale: 1 } : {}}
              transition={{ delay: 1, type: "spring", stiffness: 300, damping: 15 }}
            >
              <motion.circle
                cx={oslo.x}
                cy={oslo.y}
                r={12}
                fill="none"
                stroke="#3E715C"
                strokeWidth="1"
                animate={
                  hasEntered
                    ? { opacity: [0, 0.5, 0], r: [8, 18, 18] }
                    : {}
                }
                transition={{ duration: 2, repeat: Infinity, ease: "easeOut", delay: 1.2 }}
              />
              <circle cx={oslo.x} cy={oslo.y} r={7} fill="#3E715C" filter="url(#sk-serverGlow)" />
              <circle cx={oslo.x} cy={oslo.y} r={3} fill="white" opacity="0.8" />
              <rect x={oslo.x + 12} y={oslo.y - 10} width="36" height="18" rx="4" fill="white" stroke="#d4dbd6" strokeWidth="0.5" />
              <text x={oslo.x + 30} y={oslo.y + 2} textAnchor="middle" fill="#1a2e23" fontSize="9" fontWeight="600">
                Oslo
              </text>
            </motion.g>

            {/* Amsterdam */}
            <motion.g
              initial={{ opacity: 0, scale: 0 }}
              animate={hasEntered ? { opacity: 1, scale: 1 } : {}}
              transition={{ delay: 1.3, type: "spring", stiffness: 300, damping: 15 }}
            >
              <motion.circle
                cx={amsterdam.x}
                cy={amsterdam.y}
                r={12}
                fill="none"
                stroke="#5B906F"
                strokeWidth="1"
                animate={
                  hasEntered
                    ? { opacity: [0, 0.4, 0], r: [8, 16, 16] }
                    : {}
                }
                transition={{ duration: 2.5, repeat: Infinity, ease: "easeOut", delay: 1.6 }}
              />
              <circle cx={amsterdam.x} cy={amsterdam.y} r={6} fill="#5B906F" filter="url(#sk-serverGlow)" />
              <circle cx={amsterdam.x} cy={amsterdam.y} r={2.5} fill="white" opacity="0.8" />
              <rect x={amsterdam.x - 60} y={amsterdam.y - 10} width="54" height="18" rx="4" fill="white" stroke="#d4dbd6" strokeWidth="0.5" />
              <text x={amsterdam.x - 33} y={amsterdam.y + 2} textAnchor="middle" fill="#1a2e23" fontSize="9" fontWeight="600">
                Amsterdam
              </text>
            </motion.g>
          </svg>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// ANIMATION 3: COMPLIANCE BADGES
// ============================================================================

const BADGES = [
  { title: "Bokføringsloven", icon: ScaleIcon, color: "#3E715C" },
  { title: "GDPR", icon: LockIcon, color: "#5B906F" },
  { title: "SAF-T v1.30", icon: FileCheckIcon, color: "#4a8068" },
  { title: "Norsk lagring", icon: ServerIcon, color: "#2d5e4a" },
] as const;

function ComplianceBadgesAnimation() {
  const { ref: viewportRef, hasEntered } = useMarketingViewport();
  const [visibleBadges, setVisibleBadges] = useState<number[]>([]);
  const [showBanner, setShowBanner] = useState(false);
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
    setVisibleBadges([]);
    setShowBanner(false);

    schedule(() => setVisibleBadges([0]), 300);
    schedule(() => setVisibleBadges([0, 1]), 700);
    schedule(() => setVisibleBadges([0, 1, 2]), 1100);
    schedule(() => setVisibleBadges([0, 1, 2, 3]), 1500);
    schedule(() => setShowBanner(true), 2100);

    return () => clearTimers();
  }, [hasEntered]);

  return (
    <div ref={viewportRef} className="relative mx-auto max-w-md">
      <div className="relative overflow-hidden rounded-2xl border border-white/15 bg-white/[0.08] p-8 shadow-2xl backdrop-blur-3xl">
        <div className="pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-br from-white/30 via-transparent to-transparent" />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/60 to-transparent" />

        <div className="relative z-10">
          <div className="grid grid-cols-2 gap-5">
            {BADGES.map((badge, i) => {
              const isVisible = visibleBadges.includes(i);
              const Icon = badge.icon;

              return (
                <motion.div
                  key={badge.title}
                  initial={{ opacity: 0, scale: 0, rotate: -12 }}
                  animate={
                    isVisible
                      ? {
                          opacity: 1,
                          scale: [0, 1.2, 1],
                          rotate: [-12, 4, 0],
                        }
                      : { opacity: 0, scale: 0, rotate: -12 }
                  }
                  transition={{
                    duration: 0.5,
                    ease: [0.34, 1.56, 0.64, 1],
                  }}
                  className="flex flex-col items-center gap-3 rounded-xl border border-[#d4dbd6]/50 bg-white/80 px-4 py-6 text-center shadow-sm"
                >
                  <div
                    className="flex h-14 w-14 items-center justify-center rounded-full"
                    style={{ backgroundColor: `${badge.color}15` }}
                  >
                    <Icon className="h-6 w-6" style={{ color: badge.color }} />
                  </div>
                  <span className="text-xs font-semibold text-[#1a2e23]">
                    {badge.title}
                  </span>
                </motion.div>
              );
            })}
          </div>

          <motion.div
            initial={{ height: 0, opacity: 0, marginTop: 0 }}
            animate={
              showBanner
                ? { height: "auto", opacity: 1, marginTop: 20 }
                : { height: 0, opacity: 0, marginTop: 0 }
            }
            transition={{ duration: 0.6, ease: MARKETING_EASING }}
            className="overflow-hidden"
          >
            <div className="flex items-center justify-center gap-2 rounded-xl bg-[#3E715C]/10 px-4 py-3.5">
              <CheckCircleIcon className="h-4 w-4 text-[#3E715C]" />
              <span className="text-sm font-medium text-[#3E715C]">
                Godkjent for norsk næringsliv
              </span>
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

export default function SikkerhetPage() {
  return (
    <>
      {/* Hero */}
      <HeroSection
        backgroundImage="/ciribackground8.jpg"
        title="Trygghet bygget inn."
        subtitle="Norsk datalagring, GDPR-samsvar og Bokføringsloven — sikkerhet er ikke et tillegg, det er fundamentet."
        ctaText="Les om vår sikkerhetspolicy"
        ctaHref="#sikkerhetspolicy"
      />

      {/* Metrics */}
      <PageMetrics
        stats={[
          { value: "AES-256", label: "Kryptografisk standard" },
          { value: "5 år", label: "Lovpålagt oppbevaring" },
          { value: "GDPR", label: "Fullstendig etterlevelse" },
          { value: "EØS", label: "Norsk datalagring" },
        ]}
      />

      {/* Animation 1: Security Layers (Glass, centered) */}
      <GlassSection>
        <Reveal>
          <div className="text-center">
            <SectionLabel>
              <ShieldCheckIcon className="h-3.5 w-3.5" />
              Sikkerhet i alle lag
            </SectionLabel>
            <h2 className="mt-6 text-4xl font-normal tracking-tight text-[#1a2e23] sm:text-5xl">
              Fire lag med{" "}
              <span className="text-[#3E715C]">beskyttelse</span>
            </h2>
            <p className="mx-auto mt-5 max-w-lg text-base leading-relaxed text-[#4a5e52]">
              Fra kryptering i transit til uforanderlige revisjonsspor — dine
              regnskapsdata er beskyttet i hvert eneste ledd.
            </p>
          </div>
        </Reveal>
        <Reveal delay={0.15}>
          <div className="mt-12">
            <SecurityLayersAnimation />
          </div>
        </Reveal>
        <Reveal delay={0.25}>
          <ul className="mx-auto mt-10 flex max-w-2xl flex-col gap-3 sm:flex-row sm:gap-8">
            {[
              "TLS 1.3 i alle forbindelser",
              "AES-256 kryptering i hvile",
              "SHA-256 revisjonsspor",
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
        label="Sikkerhetsfunksjoner"
        labelIcon={<ShieldIcon className="h-3.5 w-3.5" />}
        heading="Trygghet"
        headingAccent="bygget inn"
        description="Ciri er bygget fra bunnen av med sikkerhet og etterlevelse i fokus."
        features={[
          {
            icon: <LockIcon className="h-5 w-5" />,
            title: "Kryptering",
            desc: "All data krypteres med AES-256 både i transit og i ro.",
          },
          {
            icon: <ShieldCheckIcon className="h-5 w-5" />,
            title: "Bokføringsloven",
            desc: "10 prinsipper for god bokføring innebygd i alle prosesser.",
          },
          {
            icon: <GlobeIcon className="h-5 w-5" />,
            title: "Norsk datalagring",
            desc: "All data lagres i EØS-sertifiserte datasentre i Norge.",
          },
        ]}
      />

      {/* Animation 2: Data Residency Map (Solid cream, 2-col) */}
      <SolidSection variant="cream">
        <div className="grid items-center gap-16 lg:grid-cols-2">
          <Reveal delay={0.15}>
            <div className="min-h-[320px] overflow-hidden sm:min-h-[380px]">
              <DataResidencyMapAnimation />
            </div>
          </Reveal>
          <Reveal>
            <div>
              <SectionLabel>
                <GlobeIcon className="h-3.5 w-3.5" />
                Norsk datalagring
              </SectionLabel>
              <h2 className="mt-6 text-3xl font-normal tracking-tight text-[#1a2e23] sm:text-4xl">
                SAF-T og{" "}
                <span className="text-[#3E715C]">revisjonsspor</span>
              </h2>
              <p className="mt-5 max-w-md text-base leading-relaxed text-[#4a5e52]">
                Hver endring logges med SHA-256 signatur. SAF-T v1.30 eksport
                sikrer at revisorer og Skatteetaten får korrekt data.
              </p>
              <BulletList
                items={[
                  "SHA-256 signatur på alle endringer",
                  "Uforanderlig revisjonsspor",
                  "SAF-T v1.30 klart for eksport",
                ]}
              />
            </div>
          </Reveal>
        </div>
      </SolidSection>

      {/* TextSection 2: Data ownership / breathing room */}
      <SolidSection>
        <Reveal>
          <div className="text-center">
            <SectionLabel>
              <EyeOffIcon className="h-3.5 w-3.5" />
              Dine data, ditt eierskap
            </SectionLabel>
            <h2 className="mt-6 text-4xl font-normal tracking-tight text-[#1a2e23] sm:text-5xl">
              Vi selger{" "}
              <span className="text-[#3E715C]">aldri data</span>
            </h2>
            <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-[#4a5e52]">
              Du eier alltid dataene dine. Full rett til eksport og sletting i
              henhold til GDPR. Ciri lever av å gi deg verdi — ikke av å selge
              informasjonen din.
            </p>
          </div>
        </Reveal>
        <div className="mt-16 grid gap-4 sm:grid-cols-3">
          {[
            {
              icon: <KeyIcon className="h-5 w-5" />,
              title: "Full eksportrett",
              desc: "Last ned alle data når som helst. Ingen innlåsing eller skjulte begrensninger.",
            },
            {
              icon: <EyeOffIcon className="h-5 w-5" />,
              title: "Rett til sletting",
              desc: "Be om sletting av alle data i henhold til GDPR artikkel 17.",
            },
            {
              icon: <ShieldIcon className="h-5 w-5" />,
              title: "Årlig sikkerhetsrevisjon",
              desc: "Ekstern sikkerhetsrevisjon hvert år for å sikre etterlevelse.",
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

      {/* Animation 3: Compliance Badges (Glass, 2-col) */}
      <GlassSection>
        <div className="grid items-center gap-16 lg:grid-cols-2">
          <Reveal>
            <div>
              <SectionLabel>
                <ScaleIcon className="h-3.5 w-3.5" />
                Samsvar og rettigheter
              </SectionLabel>
              <h2 className="mt-6 text-3xl font-normal tracking-tight text-[#1a2e23] sm:text-4xl">
                Godkjent for{" "}
                <span className="text-[#3E715C]">norsk næringsliv</span>
              </h2>
              <p className="mt-5 max-w-md text-base leading-relaxed text-[#4a5e52]">
                Ciri oppfyller alle krav fra Bokføringsloven, GDPR, SAF-T og
                norske krav til datalagring. Bygget for å gi deg trygghet.
              </p>
              <BulletList
                items={[
                  "Bokføringsloven fullstendig etterlevd",
                  "GDPR-samsvar verifisert",
                  "SAF-T v1.30 sertifisert",
                  "EØS-sertifiserte datasentre",
                ]}
              />
            </div>
          </Reveal>
          <Reveal delay={0.15}>
            <div className="min-h-[320px] overflow-hidden sm:min-h-[380px]">
              <ComplianceBadgesAnimation />
            </div>
          </Reveal>
        </div>
      </GlassSection>

      {/* CTA */}
      <MarketingCTA
        title="Trygg på at dataene dine"
        titleAccent="er sikre?"
        subtitle="Norsk lagring, full kryptering og GDPR-samsvar. Alltid."
        ctaText="Les mer om sikkerhet"
      />
    </>
  );
}
