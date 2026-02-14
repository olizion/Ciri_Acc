"use client";

import { memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ActivityIcon,
  StoreIcon,
  ShieldCheckIcon,
  ArrowUpDownIcon,
  TargetIcon,
  ArrowUpIcon,
  XIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { ClusterInfo } from "../types";
import { strengthLevelConfig, categoryLabels, EASE_SMOOTH } from "../constants";
import { AnimatedNumber } from "./animated-number";

// ============================================================================
// ClusterTooltip
// ============================================================================

interface ClusterTooltipProps {
  cluster: ClusterInfo;
  screenX: number;
  screenY: number;
  containerRect: DOMRect;
}

export const ClusterTooltip = memo(function ClusterTooltip({
  cluster,
  screenX,
  screenY,
  containerRect,
}: ClusterTooltipProps) {
  const config = strengthLevelConfig[cluster.strength_level] || strengthLevelConfig.weak;
  const label = categoryLabels[cluster.category] || cluster.category;
  const pct = Math.round(cluster.strength * 100);
  const reliability =
    cluster.total_points > 0
      ? Math.max(0, Math.round(((cluster.total_points - cluster.overridden_count) / cluster.total_points) * 100))
      : 100;

  let orbitLabel: string;
  if (cluster.strength_level === "strong") {
    orbitLabel = "Naer kjernen";
  } else if (cluster.strength_level === "growing") {
    orbitLabel = "Midtre bane";
  } else {
    orbitLabel = "Ytre bane";
  }

  // Mini ring
  const rs = 32;
  const sw = 3;
  const rr = (rs - sw) / 2;
  const circ = 2 * Math.PI * rr;

  // Position tooltip -- keep it inside container bounds
  const tooltipW = 280;
  const tooltipH = 320;
  const relX = screenX - containerRect.left;
  const relY = screenY - containerRect.top;

  let left = relX + 20;
  let top = relY - tooltipH / 2;

  // Flip left if overflowing right
  if (left + tooltipW > containerRect.width) left = relX - tooltipW - 20;
  // Clamp vertical
  if (top < 8) top = 8;
  if (top + tooltipH > containerRect.height - 8) top = containerRect.height - tooltipH - 8;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.92, y: 6 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.12 } }}
      transition={{ duration: 0.2, ease: [0.22, 0.68, 0.36, 1] }}
      className="absolute z-50 pointer-events-none"
      style={{ left, top, width: tooltipW }}
    >
      <div
        className="rounded-2xl border p-4 backdrop-blur-xl"
        style={{
          background: "color-mix(in srgb, var(--popover) 85%, transparent)",
          borderColor: config.color + "30",
          boxShadow: `0 0 0 1px ${config.color}10, 0 20px 60px -12px rgba(0,0,0,0.25), 0 0 40px -8px ${config.color}15`,
        }}
      >
        {/* Glow accent line at top */}
        <div
          className="absolute inset-x-0 top-0 h-[2px] rounded-t-2xl"
          style={{ background: `linear-gradient(90deg, transparent, ${config.color}, transparent)` }}
        />

        {/* Header row */}
        <div className="flex items-start gap-3 mb-3">
          {/* Mini strength ring */}
          <div className="relative shrink-0" style={{ width: rs, height: rs }}>
            <svg width={rs} height={rs} className="-rotate-90">
              <circle cx={rs / 2} cy={rs / 2} r={rr} fill="none" strokeWidth={sw} stroke="currentColor" opacity={0.08} />
              <circle
                cx={rs / 2} cy={rs / 2} r={rr} fill="none" strokeWidth={sw}
                strokeLinecap="round" stroke={config.color}
                strokeDasharray={circ}
                strokeDashoffset={circ * (1 - cluster.strength)}
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-[10px] font-bold tabular-nums" style={{ color: config.color }}>
                {pct}
              </span>
            </div>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h4 className="text-[13px] font-display font-bold text-[var(--popover-foreground)] truncate">
                {label}
              </h4>
              <span
                className="text-[9px] font-bold uppercase tracking-[0.1em] px-1.5 py-[1px] rounded-full shrink-0"
                style={{ backgroundColor: config.color + "20", color: config.color }}
              >
                {config.label}
              </span>
            </div>
            <p className="text-[11px] text-[var(--muted-foreground)] font-mono mt-0.5">
              {cluster.account_number}{cluster.account_name ? ` -- ${cluster.account_name}` : ""}
            </p>
          </div>
        </div>

        {/* Strength bar */}
        <div className="relative h-1.5 rounded-full overflow-hidden mb-3" style={{ backgroundColor: config.color + "12" }}>
          <div
            className="absolute inset-y-0 left-0 rounded-full"
            style={{
              width: `${Math.max(pct, 3)}%`,
              background: `linear-gradient(90deg, ${config.color}, ${config.colorEnd})`,
            }}
          />
        </div>

        {/* Metrics grid */}
        <div className="grid grid-cols-3 gap-1.5 mb-3">
          {[
            { icon: ActivityIcon, val: cluster.total_points, lbl: "Datapunkter" },
            { icon: StoreIcon, val: cluster.distinct_merchants, lbl: "Leverandorer" },
            { icon: ShieldCheckIcon, val: `${reliability}%`, lbl: "Palitelighet" },
          ].map((m) => (
            <div
              key={m.lbl}
              className="text-center py-1.5 rounded-lg"
              style={{ backgroundColor: config.color + "08" }}
            >
              <m.icon className="size-3 mx-auto mb-0.5" style={{ color: config.color, opacity: 0.6 }} />
              <p className="text-xs font-bold tabular-nums text-[var(--popover-foreground)]">{m.val}</p>
              <p className="text-[8px] uppercase tracking-[0.1em] font-semibold" style={{ color: config.color, opacity: 0.6 }}>
                {m.lbl}
              </p>
            </div>
          ))}
        </div>

        {/* Detail rows */}
        <div className="space-y-1.5 mb-3">
          <div className="flex items-center gap-2 text-[11px]">
            <ArrowUpDownIcon className="size-3 text-[var(--muted-foreground)]" style={{ opacity: 0.5 }} />
            <span className="text-[var(--muted-foreground)]">
              {cluster.dominant_direction === "debit" ? "Utbetalinger" : "Innbetalinger"} · {cluster.amount_range}
            </span>
          </div>
          <div className="flex items-center gap-2 text-[11px]">
            <TargetIcon className="size-3" style={{ color: config.color, opacity: 0.6 }} />
            <span style={{ color: config.color }}>
              {config.label} klynge · {orbitLabel}
            </span>
          </div>
        </div>

        {/* Merchant pills */}
        {cluster.example_merchants.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {cluster.example_merchants.slice(0, 5).map((m, i) => (
              <span
                key={i}
                className="text-[10px] font-medium px-2 py-0.5 rounded-full text-[var(--popover-foreground)]"
                style={{ backgroundColor: config.color + "10", border: `1px solid ${config.color}18` }}
              >
                {m}
              </span>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
});

// ============================================================================
// ClusterDetailDialog
// ============================================================================

interface ClusterDetailDialogProps {
  cluster: ClusterInfo;
  allClusters: ClusterInfo[];
  onClose: () => void;
}

export function ClusterDetailDialog({
  cluster,
  allClusters,
  onClose,
}: ClusterDetailDialogProps) {
  const config = strengthLevelConfig[cluster.strength_level] || strengthLevelConfig.weak;
  const label = categoryLabels[cluster.category] || cluster.category;
  const pct = Math.round(cluster.strength * 100);
  const reliability =
    cluster.total_points > 0
      ? Math.max(0, Math.round(((cluster.total_points - cluster.overridden_count) / cluster.total_points) * 100))
      : 100;

  let orbitLabel: string;
  if (cluster.strength_level === "strong") {
    orbitLabel = "Naer kjernen -- Indre bane";
  } else if (cluster.strength_level === "growing") {
    orbitLabel = "Midtre bane -- Voksende";
  } else {
    orbitLabel = "Ytre bane -- Under utvikling";
  }

  // Large ring params
  const rs = 120;
  const sw = 8;
  const rr = (rs - sw) / 2;
  const circ = 2 * Math.PI * rr;

  // Mini orbital params
  const orbSize = 140;
  const orbCx = orbSize / 2;
  const orbCy = orbSize / 2;
  const orbRadii = { strong: 28, growing: 42, weak: 56 };

  // Find this cluster's position among all clusters at same strength level
  const siblings = allClusters.filter((c) => c.strength_level === cluster.strength_level);
  const myIdx = siblings.findIndex(
    (c) => c.account_number === cluster.account_number && c.category === cluster.category
  );
  const myAngle = siblings.length > 0 ? (2 * Math.PI * Math.max(myIdx, 0)) / siblings.length - Math.PI / 2 : 0;
  const myOrbitR = orbRadii[cluster.strength_level];

  return (
    <AnimatePresence>
      <motion.div
        key="cluster-dialog-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        {/* Backdrop */}
        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

        {/* Dialog card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.92, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10, transition: { duration: 0.15 } }}
          transition={{ duration: 0.35, ease: [0.22, 0.68, 0.36, 1] }}
          className="relative w-full max-w-lg rounded-3xl border overflow-hidden"
          style={{
            background: "color-mix(in srgb, var(--card) 92%, transparent)",
            borderColor: config.color + "25",
            boxShadow: `0 0 0 1px ${config.color}08, 0 32px 80px -16px rgba(0,0,0,0.35), 0 0 60px -8px ${config.color}12`,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Top glow band */}
          <div
            className="absolute inset-x-0 top-0 h-[3px]"
            style={{ background: `linear-gradient(90deg, transparent, ${config.color}, ${config.colorEnd}, transparent)` }}
          />
          {/* Ambient glow behind ring */}
          <div
            className="absolute top-12 left-1/2 -translate-x-1/2 size-40 rounded-full opacity-20 blur-3xl pointer-events-none"
            style={{ backgroundColor: config.color }}
          />

          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-10 flex size-8 items-center justify-center rounded-xl bg-muted/40 backdrop-blur-sm text-muted-foreground/60 hover:text-foreground hover:bg-muted/60 transition-colors"
          >
            <XIcon className="size-4" />
          </button>

          <div className="relative p-8 pt-10">
            {/* Header: Ring + Title */}
            <div className="flex items-center gap-6 mb-6">
              {/* Large animated strength ring */}
              <div className="relative shrink-0" style={{ width: rs, height: rs }}>
                <svg width={rs} height={rs} className="-rotate-90">
                  <circle
                    cx={rs / 2} cy={rs / 2} r={rr}
                    fill="none" strokeWidth={sw}
                    stroke="currentColor" opacity={0.05}
                  />
                  <motion.circle
                    cx={rs / 2} cy={rs / 2} r={rr}
                    fill="none" strokeWidth={sw}
                    strokeLinecap="round" stroke={config.color}
                    strokeDasharray={circ}
                    initial={{ strokeDashoffset: circ }}
                    animate={{ strokeDashoffset: circ * (1 - cluster.strength) }}
                    transition={{ delay: 0.2, duration: 1.2, ease: [0.22, 0.68, 0.36, 1] }}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-3xl font-display font-bold tabular-nums leading-none" style={{ color: config.color }}>
                    {pct}
                  </span>
                  <span className="text-[8px] uppercase tracking-[0.15em] font-bold mt-1" style={{ color: config.color, opacity: 0.6 }}>
                    Styrke
                  </span>
                </div>
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2.5 mb-1">
                  <h2 className="text-xl font-display font-bold text-foreground truncate">
                    {label}
                  </h2>
                  <span
                    className="text-[10px] font-bold uppercase tracking-[0.1em] px-2.5 py-[3px] rounded-full shrink-0"
                    style={{ backgroundColor: config.color + "18", color: config.color }}
                  >
                    {config.label}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground/60 font-mono mb-2">
                  {cluster.account_number}{cluster.account_name ? ` -- ${cluster.account_name}` : ""}
                </p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground/50">
                  <TargetIcon className="size-3" style={{ color: config.color, opacity: 0.6 }} />
                  <span>{orbitLabel}</span>
                </div>
              </div>
            </div>

            {/* Strength gauge */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] font-bold uppercase tracking-[0.1em] text-muted-foreground/40">
                  Klyngestyrke
                </span>
                <span className="text-xs font-bold tabular-nums" style={{ color: config.color }}>
                  {pct}%
                </span>
              </div>
              <div className="relative h-2.5 rounded-full overflow-hidden" style={{ backgroundColor: config.color + "10" }}>
                {/* Zone markers */}
                <div className="absolute inset-y-0 left-[33%] w-px" style={{ backgroundColor: config.color + "15" }} />
                <div className="absolute inset-y-0 left-[66%] w-px" style={{ backgroundColor: config.color + "15" }} />
                <motion.div
                  className="absolute inset-y-0 left-0 rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.max(pct, 2)}%` }}
                  transition={{ delay: 0.3, duration: 0.8, ease: [0.22, 0.68, 0.36, 1] }}
                  style={{ background: `linear-gradient(90deg, ${config.color}, ${config.colorEnd})` }}
                />
              </div>
              <div className="flex justify-between mt-1">
                <span className="text-[9px] text-muted-foreground/30">Svak</span>
                <span className="text-[9px] text-muted-foreground/30">Vokser</span>
                <span className="text-[9px] text-muted-foreground/30">Sterk</span>
              </div>
            </div>

            {/* Metrics grid */}
            <div className="grid grid-cols-4 gap-2 mb-6">
              {[
                { icon: ActivityIcon, val: cluster.total_points, lbl: "Datapunkter" },
                { icon: StoreIcon, val: cluster.distinct_merchants, lbl: "Leverandorer" },
                { icon: ShieldCheckIcon, val: `${reliability}%`, lbl: "Palitelighet" },
                { icon: ArrowUpDownIcon, val: cluster.overridden_count, lbl: "Overstyrt" },
              ].map((m) => (
                <motion.div
                  key={m.lbl}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4, duration: 0.4 }}
                  className="text-center py-3 rounded-xl"
                  style={{ backgroundColor: config.color + "06", border: `1px solid ${config.color}0A` }}
                >
                  <m.icon className="size-3.5 mx-auto mb-1" style={{ color: config.color, opacity: 0.5 }} />
                  <p className="text-[15px] font-bold tabular-nums text-foreground">{m.val}</p>
                  <p className="text-[9px] uppercase tracking-[0.1em] font-semibold mt-0.5" style={{ color: config.color, opacity: 0.5 }}>
                    {m.lbl}
                  </p>
                </motion.div>
              ))}
            </div>

            {/* Direction + Range row */}
            <div className="grid grid-cols-2 gap-3 mb-6">
              <div className="rounded-xl p-3" style={{ backgroundColor: config.color + "06", border: `1px solid ${config.color}0A` }}>
                <p className="text-[10px] font-bold uppercase tracking-[0.1em] mb-2" style={{ color: config.color, opacity: 0.5 }}>
                  Retning
                </p>
                <div className="flex items-center gap-2">
                  <div
                    className="flex size-7 items-center justify-center rounded-lg"
                    style={{ backgroundColor: config.color + "15" }}
                  >
                    <ArrowUpIcon
                      className="size-3.5"
                      style={{
                        color: config.color,
                        transform: cluster.dominant_direction === "debit" ? "rotate(180deg)" : "none",
                      }}
                    />
                  </div>
                  <div>
                    <p className="text-[13px] font-semibold text-foreground">
                      {cluster.dominant_direction === "debit" ? "Utbetalinger" : "Innbetalinger"}
                    </p>
                    <p className="text-[11px] text-muted-foreground/50">Dominerende retning</p>
                  </div>
                </div>
              </div>
              <div className="rounded-xl p-3" style={{ backgroundColor: config.color + "06", border: `1px solid ${config.color}0A` }}>
                <p className="text-[10px] font-bold uppercase tracking-[0.1em] mb-2" style={{ color: config.color, opacity: 0.5 }}>
                  Belopsintervall
                </p>
                <p className="text-[13px] font-semibold text-foreground mt-1">
                  {cluster.amount_range || "Ikke tilgjengelig"}
                </p>
                <p className="text-[10px] text-muted-foreground/50 mt-0.5">Typisk transaksjonsbelop</p>
              </div>
            </div>

            {/* Bottom row: Merchants + Mini orbital */}
            <div className="grid grid-cols-[1fr_auto] gap-5 items-end">
              {/* Merchants */}
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground/40 mb-2">
                  Leverandorer i klyngen
                </p>
                {cluster.example_merchants.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {cluster.example_merchants.map((m, i) => (
                      <motion.span
                        key={i}
                        initial={{ opacity: 0, scale: 0.85 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.5 + i * 0.05, type: "spring", stiffness: 300, damping: 15 }}
                        className="text-xs font-medium px-2.5 py-1 rounded-lg text-foreground/70"
                        style={{ backgroundColor: config.color + "0C", border: `1px solid ${config.color}15` }}
                      >
                        {m}
                      </motion.span>
                    ))}
                  </div>
                ) : (
                  <p className="text-[12px] text-muted-foreground/40 italic">Ingen leverandorer registrert</p>
                )}
              </div>

              {/* Mini orbital position indicator */}
              <div className="shrink-0" style={{ width: orbSize, height: orbSize }}>
                <svg width={orbSize} height={orbSize} className="overflow-visible">
                  {/* Orbit rings */}
                  {(["strong", "growing", "weak"] as const).map((lvl) => (
                    <circle
                      key={lvl}
                      cx={orbCx} cy={orbCy} r={orbRadii[lvl]}
                      fill="none" stroke="currentColor" strokeWidth={1}
                      strokeDasharray="3 5" opacity={0.08}
                    />
                  ))}
                  {/* Hub */}
                  <circle cx={orbCx} cy={orbCy} r={6} fill="var(--primary)" fillOpacity={0.15} stroke="var(--primary)" strokeWidth={1} strokeOpacity={0.3} />
                  <text x={orbCx} y={orbCy + 0.5} textAnchor="middle" dominantBaseline="central" fill="var(--primary)" fontSize={5} fontWeight="800" className="font-display select-none">C</text>
                  {/* Other clusters as dim dots */}
                  {allClusters
                    .filter((c) => c.account_number !== cluster.account_number || c.category !== cluster.category)
                    .map((c, ci) => {
                      const lvl = c.strength_level || "weak";
                      const sibs = allClusters.filter((s) => s.strength_level === lvl);
                      const idx = sibs.findIndex((s) => s.account_number === c.account_number && s.category === c.category);
                      const a = sibs.length > 0 ? (2 * Math.PI * Math.max(idx, 0)) / sibs.length - Math.PI / 2 : 0;
                      const oR = orbRadii[lvl];
                      return (
                        <circle
                          key={ci}
                          cx={orbCx + Math.cos(a) * oR}
                          cy={orbCy + Math.sin(a) * oR}
                          r={3}
                          fill={strengthLevelConfig[lvl].color}
                          fillOpacity={0.2}
                        />
                      );
                    })}
                  {/* THIS cluster -- highlighted */}
                  <motion.circle
                    cx={orbCx + Math.cos(myAngle) * myOrbitR}
                    cy={orbCy + Math.sin(myAngle) * myOrbitR}
                    r={6}
                    fill={config.color}
                    fillOpacity={0.3}
                    stroke={config.color}
                    strokeWidth={2}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.4, type: "spring", stiffness: 300, damping: 14 }}
                    style={{ transformOrigin: `${orbCx + Math.cos(myAngle) * myOrbitR}px ${orbCy + Math.sin(myAngle) * myOrbitR}px` }}
                  />
                  {/* Orbit zone labels */}
                  {(["strong", "growing", "weak"] as const).map((lvl) => {
                    const cfg = strengthLevelConfig[lvl];
                    return (
                      <text
                        key={`lbl-${lvl}`}
                        x={orbCx + orbRadii[lvl] + 4}
                        y={orbCy - 2}
                        fill={cfg.color}
                        fontSize={6}
                        fontWeight="600"
                        opacity={0.5}
                        className="select-none"
                      >
                        {cfg.label}
                      </text>
                    );
                  })}
                </svg>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// ============================================================================
// ClusterDetailCard
// ============================================================================

interface ClusterDetailCardProps {
  cluster: ClusterInfo;
  index: number;
  isHovered: boolean;
  onHover: (hovered: boolean) => void;
  onClick?: () => void;
}

export function ClusterDetailCard({
  cluster,
  index,
  isHovered,
  onHover,
  onClick,
}: ClusterDetailCardProps) {
  const config = strengthLevelConfig[cluster.strength_level] || strengthLevelConfig.weak;
  const pct = Math.round(cluster.strength * 100);
  const label = categoryLabels[cluster.category] || cluster.category;
  const reliability =
    cluster.total_points > 0
      ? Math.max(0, Math.round(((cluster.total_points - cluster.overridden_count) / cluster.total_points) * 100))
      : 100;

  // Mini ring params
  const ringSize = 44;
  const ringStroke = 3.5;
  const ringR = (ringSize - ringStroke) / 2;
  const ringCirc = 2 * Math.PI * ringR;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, rotateX: -6 }}
      animate={{ opacity: 1, y: 0, rotateX: 0 }}
      transition={{ delay: 0.15 + index * 0.1, type: "spring", stiffness: 180, damping: 20 }}
      onMouseEnter={() => onHover(true)}
      onMouseLeave={() => onHover(false)}
      onClick={onClick}
      className={cn(
        "group relative rounded-2xl border bg-card p-5 transition-all duration-300",
        onClick && "cursor-pointer",
        isHovered
          ? "shadow-lg dark:shadow-black/30 scale-[1.01]"
          : "hover:shadow-md hover:shadow-black/[0.04]"
      )}
      style={isHovered ? {
        boxShadow: `0 8px 30px ${config.color}15, 0 2px 8px ${config.color}08`,
        borderColor: config.color + "30",
      } : undefined}
    >
      {/* Top accent line */}
      <div
        className="absolute inset-x-0 top-0 h-[2px] rounded-t-2xl"
        style={{
          background: `linear-gradient(90deg, ${config.color}, ${config.colorEnd}, transparent)`,
          opacity: isHovered ? 1 : 0.5,
          transition: "opacity 0.3s",
        }}
      />

      <div className="flex items-start gap-4">
        {/* Mini strength ring */}
        <div className="relative shrink-0" style={{ width: ringSize, height: ringSize }}>
          <svg width={ringSize} height={ringSize} className="-rotate-90">
            <circle
              cx={ringSize / 2} cy={ringSize / 2} r={ringR}
              fill="none" strokeWidth={ringStroke}
              stroke="currentColor" opacity={0.06}
            />
            <motion.circle
              cx={ringSize / 2} cy={ringSize / 2} r={ringR}
              fill="none" strokeWidth={ringStroke}
              strokeLinecap="round"
              stroke={config.color}
              strokeDasharray={ringCirc}
              initial={{ strokeDashoffset: ringCirc }}
              animate={{ strokeDashoffset: ringCirc * (1 - cluster.strength) }}
              transition={{ delay: 0.5 + index * 0.1, duration: 1, ease: EASE_SMOOTH }}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span
              className="text-[11px] font-bold tabular-nums"
              style={{ color: config.color }}
            >
              <AnimatedNumber value={pct} duration={0.8 + index * 0.1} />
            </span>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <h4 className="text-[14px] font-display font-semibold text-foreground truncate">
              {label}
            </h4>
            <span
              className="text-[9px] font-bold uppercase tracking-[0.1em] px-2 py-[2px] rounded-full shrink-0"
              style={{ backgroundColor: config.color + "15", color: config.color }}
            >
              {config.label}
            </span>
          </div>
          <p className="text-[12px] text-muted-foreground/60 font-mono">
            {cluster.account_number}{cluster.account_name ? ` -- ${cluster.account_name}` : ""}
          </p>
        </div>
      </div>

      {/* Strength bar */}
      <div className="relative h-2 rounded-full bg-muted/40 overflow-hidden mt-4 mb-3">
        <div className="absolute inset-y-0 left-[33%] w-px bg-foreground/[0.04]" />
        <div className="absolute inset-y-0 left-[66%] w-px bg-foreground/[0.04]" />
        <motion.div
          className="absolute inset-y-0 left-0 rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${Math.max(pct, 2)}%` }}
          transition={{ delay: 0.4 + index * 0.1, duration: 1, ease: EASE_SMOOTH }}
          style={{ background: `linear-gradient(90deg, ${config.color}, ${config.colorEnd})` }}
        />
      </div>

      {/* Metrics row */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { val: cluster.total_points, label: "Datapunkter" },
          { val: cluster.distinct_merchants, label: "Leverandorer" },
          { val: reliability, label: "Palitelighet", suffix: "%" },
        ].map((m) => (
          <div key={m.label} className="text-center py-1.5 rounded-lg bg-muted/25">
            <p className="text-[13px] font-bold tabular-nums text-foreground/80">
              {m.val}{m.suffix || ""}
            </p>
            <p className="text-[9px] uppercase tracking-[0.1em] text-muted-foreground/40 font-medium mt-0.5">
              {m.label}
            </p>
          </div>
        ))}
      </div>

      {/* Merchant pills */}
      {cluster.example_merchants.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {cluster.example_merchants.slice(0, 5).map((m, mi) => (
            <motion.span
              key={mi}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{
                delay: 0.7 + index * 0.1 + mi * 0.05,
                type: "spring",
                stiffness: 400,
                damping: 15,
              }}
              className="text-[10px] font-medium px-2 py-0.5 rounded-full border bg-card text-muted-foreground/60"
            >
              {m}
            </motion.span>
          ))}
        </div>
      )}
    </motion.div>
  );
}
