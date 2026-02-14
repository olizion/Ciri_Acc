"use client";

import CiriLogo from "@/components/layout/ciri-logo";

export function ChatHeader() {
  return (
    <div className="flex items-center gap-3 border-b border-[var(--primary)]/10 pb-4">
      <CiriLogo size="md" animated intensity="subtle" />
      <div className="flex flex-col">
        <h1 className="font-display text-lg font-semibold tracking-tight leading-tight">
          Snakk med Ciri
        </h1>
        <div className="flex items-center gap-1.5">
          <span className="relative flex size-2">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
          </span>
          <span className="text-muted-foreground text-xs">Online</span>
        </div>
      </div>
    </div>
  );
}
