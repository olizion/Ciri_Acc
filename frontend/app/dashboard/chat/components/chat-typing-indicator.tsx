"use client";

import { motion } from "framer-motion";
import CiriLogo from "@/components/layout/ciri-logo";

export function ChatTypingIndicator() {
  return (
    <motion.div
      className="flex items-start gap-3"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      transition={{ duration: 0.25 }}
    >
      <div className="mt-1 shrink-0">
        <CiriLogo size="sm" animated intensity="normal" showPulseRings />
      </div>

      <div className="flex items-center gap-3 rounded-2xl border-l-[3px] border-l-[var(--primary)] bg-white px-4 py-3 shadow-sm dark:bg-card">
        {/* Sinusoidal wave dots */}
        <div className="flex items-center gap-1">
          {[0, 1, 2].map((i) => (
            <motion.span
              key={i}
              className="size-2 rounded-full bg-[var(--primary)]"
              animate={{ y: [0, -6, 0] }}
              transition={{
                duration: 1.2,
                repeat: Infinity,
                ease: "easeInOut",
                delay: i * 0.15
              }}
            />
          ))}
        </div>

        {/* Shimmer text */}
        <span
          className="text-muted-foreground text-xs font-medium"
          style={{
            backgroundImage:
              "linear-gradient(90deg, var(--muted-foreground) 0%, var(--muted-foreground) 40%, var(--primary) 50%, var(--muted-foreground) 60%, var(--muted-foreground) 100%)",
            backgroundSize: "200% 100%",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            animation: "shimmer-sweep 2.5s ease-in-out infinite"
          }}
        >
          Ciri tenker...
        </span>

        <style jsx>{`
          @keyframes shimmer-sweep {
            0% { background-position: 200% center; }
            100% { background-position: -200% center; }
          }
        `}</style>
      </div>
    </motion.div>
  );
}
