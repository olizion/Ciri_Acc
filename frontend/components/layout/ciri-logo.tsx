"use client";

import Image from "next/image";
import { cn } from "@/lib/utils";
import { motion, useReducedMotion } from "framer-motion";
import { useMemo } from "react";

interface CiriLogoProps {
  className?: string;
  size?: "sm" | "md" | "lg" | "xl" | "hero";
  showText?: boolean;
  animated?: boolean;
  intensity?: "subtle" | "normal" | "dramatic";
  showPulseRings?: boolean;
}

const SIZES = {
  sm: { container: "size-8", image: 32, ring: 34, px: 32 },
  md: { container: "size-10", image: 40, ring: 44, px: 40 },
  lg: { container: "size-14", image: 56, ring: 60, px: 56 },
  xl: { container: "size-20", image: 80, ring: 86, px: 80 },
  hero: { container: "size-40", image: 160, ring: 168, px: 160 }
};

const INTENSITY_CONFIG = {
  subtle: {
    breatheScale: [1, 1.015, 1],
    breatheDuration: 5,
    kenBurnsDistance: 2,
    kenBurnsDuration: 14,
    glowOpacity: [0.15, 0.3, 0.15],
    glowSpread: "8px",
    glowDuration: 4,
    overlayRotateDuration: 10,
    overlayOpacity: 0.08
  },
  normal: {
    breatheScale: [1, 1.03, 1],
    breatheDuration: 4,
    kenBurnsDistance: 4,
    kenBurnsDuration: 12,
    glowOpacity: [0.2, 0.45, 0.2],
    glowSpread: "12px",
    glowDuration: 3,
    overlayRotateDuration: 8,
    overlayOpacity: 0.12
  },
  dramatic: {
    breatheScale: [1, 1.05, 1],
    breatheDuration: 3.5,
    kenBurnsDistance: 6,
    kenBurnsDuration: 10,
    glowOpacity: [0.3, 0.6, 0.3],
    glowSpread: "18px",
    glowDuration: 2.5,
    overlayRotateDuration: 6,
    overlayOpacity: 0.18
  }
};

export default function CiriLogo({
  className,
  size = "md",
  showText = false,
  animated = false,
  intensity = "normal",
  showPulseRings = false
}: CiriLogoProps) {
  const prefersReduced = useReducedMotion();
  const shouldAnimate = animated && !prefersReduced;
  const sizeConfig = SIZES[size];
  const config = INTENSITY_CONFIG[intensity];

  // Ken Burns keyframes — organic drift path through the painting
  const kenBurnsKeyframes = useMemo(() => {
    const d = config.kenBurnsDistance;
    return {
      x: [0, d, d * 0.5, -d * 0.3, -d, -d * 0.6, 0],
      y: [0, -d * 0.4, d * 0.7, d, -d * 0.2, -d * 0.8, 0]
    };
  }, [config.kenBurnsDistance]);

  // Static (non-animated) rendering — identical to original for backward compat
  if (!shouldAnimate) {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <div
          className={cn(
            "relative overflow-hidden rounded-full shadow-lg ring-2 ring-[var(--primary)]/20",
            sizeConfig.container
          )}
        >
          <Image
            src="/ciribakgrunn.png"
            alt="Ciri"
            width={sizeConfig.image}
            height={sizeConfig.image}
            className="size-full object-cover"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-[var(--primary)]/10" />
        </div>
        {showText && (
          <span className="font-display text-lg font-semibold tracking-tight">Ciri</span>
        )}
      </div>
    );
  }

  // Animated rendering — the living, breathing organism
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className="relative" style={{ width: sizeConfig.px, height: sizeConfig.px }}>
        {/* Pulse rings — concentric expanding rings */}
        {showPulseRings && (
          <>
            <motion.div
              className="absolute inset-0 rounded-full border-2 border-[var(--primary)]"
              animate={{
                scale: [1, 1.5, 1.5],
                opacity: [0.6, 0, 0]
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeOut"
              }}
            />
            <motion.div
              className="absolute inset-0 rounded-full border-2 border-[var(--primary)]"
              animate={{
                scale: [1, 1.5, 1.5],
                opacity: [0.6, 0, 0]
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeOut",
                delay: 0.7
              }}
            />
            <motion.div
              className="absolute inset-0 rounded-full border border-[var(--primary)]"
              animate={{
                scale: [1, 1.7, 1.7],
                opacity: [0.3, 0, 0]
              }}
              transition={{
                duration: 2.5,
                repeat: Infinity,
                ease: "easeOut",
                delay: 1.3
              }}
            />
          </>
        )}

        {/* Luminous glow layer — pulsing box-shadow behind the circle */}
        <motion.div
          className="absolute inset-0 rounded-full"
          animate={{
            opacity: config.glowOpacity
          }}
          transition={{
            duration: config.glowDuration,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          style={{
            boxShadow: `0 0 ${config.glowSpread} var(--primary), 0 0 calc(${config.glowSpread} * 2) var(--primary)`,
            willChange: "opacity"
          }}
        />

        {/* Breathing container — scales the whole orb */}
        <motion.div
          className={cn(
            "relative overflow-hidden rounded-full shadow-lg ring-2 ring-[var(--primary)]/30",
            sizeConfig.container
          )}
          animate={{
            scale: config.breatheScale
          }}
          transition={{
            duration: config.breatheDuration,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          style={{ willChange: "transform" }}
        >
          {/* Ken Burns pan — the image drifts organically inside the crop */}
          <motion.div
            className="absolute inset-0"
            animate={kenBurnsKeyframes}
            transition={{
              duration: config.kenBurnsDuration,
              repeat: Infinity,
              ease: "easeInOut"
            }}
            style={{
              // Slight upscale so panning doesn't reveal edges
              scale: 1.15,
              willChange: "transform"
            }}
          >
            <Image
              src="/ciribakgrunn.png"
              alt="Ciri"
              width={sizeConfig.image * 2}
              height={sizeConfig.image * 2}
              className="size-full object-cover"
              priority
            />
          </motion.div>

          {/* Gradient overlay shift — rotating highlight on the circle edge */}
          <motion.div
            className="absolute inset-0 rounded-full"
            animate={{ rotate: [0, 360] }}
            transition={{
              duration: config.overlayRotateDuration,
              repeat: Infinity,
              ease: "linear"
            }}
            style={{
              background: `conic-gradient(
                from 0deg,
                transparent 0%,
                transparent 60%,
                rgba(255,255,255,${config.overlayOpacity}) 75%,
                transparent 90%,
                transparent 100%
              )`,
              willChange: "transform"
            }}
          />

          {/* Static depth overlay */}
          <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-[var(--primary)]/10" />
        </motion.div>
      </div>

      {showText && (
        <span className="font-display text-lg font-semibold tracking-tight">Ciri</span>
      )}
    </div>
  );
}
