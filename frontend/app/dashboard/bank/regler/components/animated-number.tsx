"use client";

import { useState, useEffect, memo } from "react";

// ============================================================================
// AnimatedNumber
// ============================================================================

interface AnimatedNumberProps {
  value: number;
  suffix?: string;
  duration?: number;
}

export const AnimatedNumber = memo(function AnimatedNumber({
  value,
  suffix = "",
  duration = 1.2,
}: AnimatedNumberProps) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    let cancelled = false;
    const start = performance.now();
    const tick = (now: number) => {
      if (cancelled) return;
      const progress = Math.min((now - start) / (duration * 1000), 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(eased * value));
      if (progress < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
    return () => { cancelled = true; };
  }, [value, duration]);
  return <>{display}{suffix}</>;
});
