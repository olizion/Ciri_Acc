"use client";

import { useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ACTIVITY_TIMELINE } from "../mock-data";
import type { ActivityEvent } from "../mock-data";
import { CHART_COLORS } from "../chart-theme";
import { cn } from "@/lib/utils";
import {
  BrainCircuitIcon,
  ShieldCheckIcon,
  RefreshCwIcon,
  LayersIcon,
  FileCheckIcon,
  LinkIcon,
  ScanSearchIcon,
  ClockIcon,
  CalendarClockIcon,
  AlertCircleIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  XIcon,
} from "lucide-react";

const typeConfig: Record<
  ActivityEvent["type"],
  { icon: typeof BrainCircuitIcon; bg: string; fg: string; label: string }
> = {
  batch_complete: {
    icon: BrainCircuitIcon,
    bg: "bg-[var(--primary)]/10",
    fg: "text-[var(--primary)]",
    label: "AI Batch",
  },
  rule_fired: {
    icon: ShieldCheckIcon,
    bg: "bg-amber-500/10",
    fg: "text-amber-600",
    label: "Regel",
  },
  user_override: {
    icon: RefreshCwIcon,
    bg: "bg-purple-500/10",
    fg: "text-purple-600",
    label: "Overstyring",
  },
  cluster_update: {
    icon: LayersIcon,
    bg: "bg-blue-500/10",
    fg: "text-blue-600",
    label: "Klynge",
  },
  bilag_posted: {
    icon: FileCheckIcon,
    bg: "bg-emerald-500/10",
    fg: "text-emerald-600",
    label: "Bokført",
  },
  match_suggested: {
    icon: LinkIcon,
    bg: "bg-orange-500/10",
    fg: "text-orange-600",
    label: "Match",
  },
  surveillance_sweep: {
    icon: ScanSearchIcon,
    bg: "bg-muted",
    fg: "text-muted-foreground",
    label: "Sveip",
  },
  batch_scheduled: {
    icon: CalendarClockIcon,
    bg: "bg-[var(--primary)]/5",
    fg: "text-[var(--primary)]/60",
    label: "Planlagt",
  },
  mva_deadline: {
    icon: AlertCircleIcon,
    bg: "bg-red-500/10",
    fg: "text-red-600",
    label: "Frist",
  },
};

function formatTimestamp(ts: string, planned?: boolean) {
  const d = new Date(ts);
  const day = d.getDate();
  const month = d.toLocaleDateString("nb-NO", { month: "short" });
  const time = d.toLocaleTimeString("nb-NO", {
    hour: "2-digit",
    minute: "2-digit",
  });
  if (planned) return `${day}. ${month}`;
  return `${day}. ${month} ${time}`;
}

function sortedEvents() {
  const now = new Date();
  const past = ACTIVITY_TIMELINE.filter(
    (e) => !e.planned && new Date(e.timestamp) <= now
  );
  const future = ACTIVITY_TIMELINE.filter(
    (e) => e.planned || new Date(e.timestamp) > now
  );
  past.sort(
    (a, b) =>
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
  future.sort(
    (a, b) =>
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );
  return [...past, ...future];
}

export function ActivityTimeline() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);
  const [selectedEvent, setSelectedEvent] = useState<ActivityEvent | null>(
    null
  );

  const events = sortedEvents();
  const firstPlannedIdx = events.findIndex((e) => e.planned);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    const el = scrollRef.current;
    if (!el) return;
    setIsDragging(true);
    setStartX(e.clientX - el.offsetLeft);
    setScrollLeft(el.scrollLeft);
    el.setPointerCapture(e.pointerId);
  }, []);

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isDragging) return;
      const el = scrollRef.current;
      if (!el) return;
      e.preventDefault();
      const x = e.clientX - el.offsetLeft;
      const walk = (x - startX) * 1.5;
      el.scrollLeft = scrollLeft - walk;
    },
    [isDragging, startX, scrollLeft]
  );

  const handlePointerUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const scrollBy = (dir: number) => {
    scrollRef.current?.scrollBy({ left: dir * 260, behavior: "smooth" });
  };

  return (
    <Card className="overflow-hidden">
      {/* Top highlight */}
      <div
        className="h-px"
        style={{
          background: `linear-gradient(to right, transparent, ${CHART_COLORS.primary}30, transparent)`,
        }}
      />

      <div className="px-4 pt-4 pb-2 sm:px-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div
              className="flex h-7 w-7 items-center justify-center rounded-lg"
              style={{ backgroundColor: `${CHART_COLORS.primary}15` }}
            >
              <ClockIcon
                className="h-3.5 w-3.5"
                style={{ color: CHART_COLORS.primary }}
              />
            </div>
            <span className="text-sm font-semibold">
              Aktivitetstidslinje
            </span>
            <Badge variant="outline" className="text-xs">
              {events.length} hendelser
            </Badge>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => scrollBy(-1)}
              className="flex h-7 w-7 items-center justify-center rounded-lg transition-colors hover:bg-muted"
            >
              <ChevronLeftIcon className="h-4 w-4 text-muted-foreground" />
            </button>
            <button
              onClick={() => scrollBy(1)}
              className="flex h-7 w-7 items-center justify-center rounded-lg transition-colors hover:bg-muted"
            >
              <ChevronRightIcon className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>
        </div>
      </div>

      <CardContent className="relative px-0">
        {/* Horizontal scrollable track */}
        <div
          ref={scrollRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
          className={cn(
            "flex gap-0 overflow-x-auto px-6 pb-4 scrollbar-none",
            isDragging ? "cursor-grabbing select-none" : "cursor-grab"
          )}
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {events.map((event, i) => {
            const config = typeConfig[event.type];
            const Icon = config.icon;
            const isPlanned = !!event.planned;
            const isSelected = selectedEvent?.id === event.id;
            const showDivider = firstPlannedIdx === i && i > 0;

            return (
              <div key={event.id} className="flex items-stretch">
                {showDivider && (
                  <div className="relative mx-2 flex flex-col items-center justify-center">
                    <div className="h-full w-px bg-[var(--primary)]/30" />
                    <span className="absolute top-1/2 -translate-y-1/2 whitespace-nowrap rounded-full bg-[var(--primary)]/10 px-2 py-0.5 text-xs font-semibold text-[var(--primary)]">
                      NÅ
                    </span>
                  </div>
                )}

                <motion.button
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.04, duration: 0.25 }}
                  onClick={() =>
                    setSelectedEvent(isSelected ? null : event)
                  }
                  className={cn(
                    "group relative flex w-[220px] shrink-0 flex-col items-center gap-2 rounded-xl px-3 py-4 transition-all duration-200",
                    isSelected
                      ? "bg-[var(--primary)]/10 ring-1 ring-[var(--primary)]/30"
                      : "hover:bg-muted/40",
                    isPlanned && "opacity-70"
                  )}
                >
                  <div className="absolute left-0 right-0 top-[42px] h-px bg-border" />

                  <div
                    className={cn(
                      "relative z-10 flex h-10 w-10 items-center justify-center rounded-full border-2 border-background transition-transform duration-200 group-hover:scale-110",
                      config.bg,
                      isPlanned &&
                        "border-dashed border-muted-foreground/30"
                    )}
                  >
                    <Icon className={cn("h-4 w-4", config.fg)} />
                    {isPlanned && (
                      <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-[var(--primary)]/50" />
                    )}
                  </div>

                  <Badge
                    variant={isPlanned ? "outline" : "secondary"}
                    className={cn(
                      "text-xs",
                      isPlanned && "border-dashed"
                    )}
                  >
                    {config.label}
                  </Badge>

                  <p className="line-clamp-2 text-center text-sm font-medium leading-tight">
                    {event.title}
                  </p>

                  <p className="text-xs text-muted-foreground">
                    {formatTimestamp(event.timestamp, isPlanned)}
                  </p>
                </motion.button>
              </div>
            );
          })}
        </div>

        {/* Fade edges */}
        <div className="pointer-events-none absolute inset-y-0 left-0 w-8 bg-gradient-to-r from-card to-transparent" />
        <div className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-card to-transparent" />

        {/* Detail panel */}
        <AnimatePresence>
          {selectedEvent && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="mx-6 mt-2 rounded-xl border border-slate-100 bg-gradient-to-br from-white to-slate-50/50 p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div
                      className={cn(
                        "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
                        typeConfig[selectedEvent.type].bg
                      )}
                    >
                      {(() => {
                        const Ic = typeConfig[selectedEvent.type].icon;
                        return (
                          <Ic
                            className={cn(
                              "h-4 w-4",
                              typeConfig[selectedEvent.type].fg
                            )}
                          />
                        );
                      })()}
                    </div>
                    <div>
                      <p className="font-display text-sm font-semibold">
                        {selectedEvent.title}
                      </p>
                      <p className="mt-0.5 text-sm leading-relaxed text-muted-foreground">
                        {selectedEvent.description}
                      </p>
                      <p className="mt-1.5 text-xs text-muted-foreground/60">
                        {formatTimestamp(
                          selectedEvent.timestamp,
                          selectedEvent.planned
                        )}
                        {selectedEvent.planned && " · Planlagt"}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedEvent(null)}
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-colors hover:bg-muted"
                  >
                    <XIcon className="h-3.5 w-3.5 text-muted-foreground" />
                  </button>
                </div>

                {selectedEvent.metadata && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {Object.entries(selectedEvent.metadata).map(
                      ([key, val]) => (
                        <div
                          key={key}
                          className="rounded-lg bg-white/60 border border-slate-100 px-2.5 py-1 text-xs"
                        >
                          <span className="text-muted-foreground">
                            {key}:{" "}
                          </span>
                          <span className="font-medium">
                            {typeof val === "number" && key === "cost"
                              ? `kr ${val.toFixed(3)}`
                              : typeof val === "number" &&
                                  key === "durationMs"
                                ? `${(val / 1000).toFixed(1)}s`
                                : String(val)}
                          </span>
                        </div>
                      )
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
}
