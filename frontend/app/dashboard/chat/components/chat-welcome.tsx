"use client";

import { motion } from "framer-motion";
import {
  FileTextIcon,
  CalculatorIcon,
  TrendingUpIcon,
  UsersIcon,
  HelpCircleIcon
} from "lucide-react";
import CiriLogo from "@/components/layout/ciri-logo";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

interface ChatWelcomeProps {
  onSendMessage: (query: string) => void;
}

interface SuggestionItem {
  icon: LucideIcon;
  label: string;
  query: string;
}

const suggestions: SuggestionItem[] = [
  { icon: FileTextIcon, label: "Vis siste bilag", query: "Vis de siste bilagene som er bokført" },
  { icon: CalculatorIcon, label: "MVA-status", query: "Hva er MVA-status for denne terminen?" },
  { icon: TrendingUpIcon, label: "Resultat hittil i år", query: "Vis resultat hittil i år" },
  { icon: UsersIcon, label: "Lønnsoversikt", query: "Gi meg en oversikt over lønnskostnader" },
  { icon: HelpCircleIcon, label: "Forklar balansen", query: "Forklar balanserapporten min" }
];

// Fixed particle positions to avoid hydration mismatch
const PARTICLES = [
  { left: "15%", bottom: "20%", size: 5, delay: 0, duration: 7 },
  { left: "72%", bottom: "10%", size: 7, delay: 1.5, duration: 9 },
  { left: "40%", bottom: "30%", size: 4, delay: 3, duration: 8 },
  { left: "85%", bottom: "15%", size: 6, delay: 0.8, duration: 10 },
  { left: "28%", bottom: "5%", size: 5, delay: 2.2, duration: 7.5 }
];

export function ChatWelcome({ onSendMessage }: ChatWelcomeProps) {
  return (
    <motion.div
      className="flex h-full flex-col items-center justify-center px-4"
      exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.3 } }}
    >
      {/* Ambient particles */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {PARTICLES.map((p, i) => (
          <motion.div
            key={i}
            className="absolute rounded-full bg-[var(--primary)]"
            style={{
              left: p.left,
              bottom: p.bottom,
              width: p.size,
              height: p.size,
              opacity: 0
            }}
            animate={{
              y: [0, -120, -200],
              opacity: [0, 0.12, 0]
            }}
            transition={{
              duration: p.duration,
              repeat: Infinity,
              delay: p.delay,
              ease: "easeOut"
            }}
          />
        ))}
      </div>

      {/* Hero avatar */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 20, delay: 0.1 }}
      >
        <CiriLogo size="hero" animated intensity="dramatic" showPulseRings />
      </motion.div>

      {/* Greeting */}
      <motion.h2
        className="font-display mt-8 text-4xl font-bold tracking-tight"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
      >
        Hei!
      </motion.h2>
      <motion.p
        className="text-muted-foreground mt-2 text-lg"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.6 }}
      >
        Hva kan jeg hjelpe deg med?
      </motion.p>

      {/* Suggestion cards */}
      <div className="mt-10 grid w-full max-w-2xl gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {suggestions.map((s, i) => (
          <motion.button
            key={s.label}
            onClick={() => onSendMessage(s.query)}
            className={cn(
              "group flex items-center gap-3 rounded-2xl border border-[var(--primary)]/10",
              "bg-white/80 px-4 py-3.5 text-left backdrop-blur-sm",
              "transition-shadow hover:shadow-lg hover:shadow-[var(--primary)]/10",
              "dark:bg-card/80"
            )}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              type: "spring",
              stiffness: 300,
              damping: 24,
              delay: 0.4 + i * 0.08
            }}
            whileHover={{ y: -2 }}
          >
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[var(--primary)]/10 transition-colors group-hover:bg-[var(--primary)]/20">
              <s.icon className="size-5 text-[var(--primary)]" />
            </div>
            <span className="text-sm font-medium">{s.label}</span>
          </motion.button>
        ))}
      </div>
    </motion.div>
  );
}
