"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ZoomInIcon,
  ZoomOutIcon,
  Maximize2Icon,
  LayersIcon,
  NetworkIcon,
  CheckCircle2Icon,
  LockIcon,
  UnlockIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { ClusterInfo, ClusterStatsData, RuleStats } from "../types";
import { strengthLevelConfig, EASE_SMOOTH } from "../constants";
import { AnimatedNumber } from "./animated-number";
import { ClusterTooltip } from "./cluster-details";

// ============================================================================
// RadialNodeMap
// ============================================================================

const ZOOM_MIN = 0.5;
const ZOOM_MAX = 3;
const ZOOM_STEP = 0.12;

// Newtonian physics constants
const PHYS_DAMPING = 0.93;
const PHYS_RESTITUTION = 0.6;
const PHYS_COLLISION_PAD = 6;
const PHYS_VEL_THRESHOLD = 0.12;

interface NodePosition {
  cluster: ClusterInfo;
  baseX: number;
  baseY: number;
  dragX: number;
  dragY: number;
  origIdx: number;
}

interface RadialNodeMapProps {
  clusters: ClusterInfo[];
  hoveredIndex: number | null;
  onHover: (i: number | null) => void;
  onNodeClick?: (cluster: ClusterInfo) => void;
}

export function RadialNodeMap({
  clusters,
  hoveredIndex,
  onHover,
  onNodeClick,
}: RadialNodeMapProps) {
  const svgSize = 480;
  const cx = svgSize / 2;
  const cy = svgSize / 2;
  const hubRadius = 28;
  const orbits = { strong: 100, growing: 155, weak: 205 };

  // Pan / zoom state
  const containerRef = useRef<HTMLDivElement>(null);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const isPanning = useRef(false);
  const panStart = useRef({ x: 0, y: 0, panX: 0, panY: 0 });

  // Node drag state
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const dragStart = useRef({ x: 0, y: 0, nodeX: 0, nodeY: 0 });
  const clickStartRef = useRef<{ x: number; y: number; idx: number } | null>(null);

  // Tooltip state
  const [tooltip, setTooltip] = useState<{ cluster: ClusterInfo; x: number; y: number } | null>(null);

  // Compute base positions
  const basePositions = useMemo(() => {
    const byLevel: Record<string, { cluster: ClusterInfo; origIdx: number }[]> = {
      strong: [], growing: [], weak: [],
    };
    clusters.forEach((c, i) => {
      byLevel[c.strength_level || "weak"].push({ cluster: c, origIdx: i });
    });

    const result: NodePosition[] = [];
    (["strong", "growing", "weak"] as const).forEach((level) => {
      const items = byLevel[level];
      const orbitR = orbits[level];
      if (items.length === 0) return;
      const off = level === "strong" ? -Math.PI / 6 : level === "growing" ? Math.PI / 8 : Math.PI / 3;
      items.forEach((item, i) => {
        const angle = off + (2 * Math.PI * i) / items.length;
        result.push({
          cluster: item.cluster,
          baseX: cx + Math.cos(angle) * orbitR,
          baseY: cy + Math.sin(angle) * orbitR,
          dragX: 0,
          dragY: 0,
          origIdx: item.origIdx,
        });
      });
    });
    return result;
  }, [clusters, cx, cy]);

  // Physics state
  const [dragOffsets, setDragOffsets] = useState<Record<number, { x: number; y: number }>>({});
  const dragOffsetsRef = useRef<Record<number, { x: number; y: number }>>({});
  const velocitiesRef = useRef<Record<number, { vx: number; vy: number }>>({});
  const dragIdxRef = useRef<number | null>(null);
  const lastDragPosRef = useRef<{ x: number; y: number; t: number } | null>(null);
  const rafId = useRef<number>(0);
  const physicsRunning = useRef(false);
  const basePositionsRef = useRef(basePositions);
  const nodeSizeFnRef = useRef<(pts: number) => number>(() => 12);

  // Keep refs in sync
  useEffect(() => { dragOffsetsRef.current = dragOffsets; }, [dragOffsets]);
  useEffect(() => { dragIdxRef.current = dragIdx; }, [dragIdx]);
  useEffect(() => { basePositionsRef.current = basePositions; }, [basePositions]);

  const getNodePos = useCallback((node: NodePosition) => {
    const off = dragOffsets[node.origIdx];
    return {
      x: node.baseX + (off?.x || 0),
      y: node.baseY + (off?.y || 0),
    };
  }, [dragOffsets]);

  const maxPoints = Math.max(1, ...clusters.map((c) => c.total_points));
  const nodeSize = useCallback((pts: number) => 12 + (pts / maxPoints) * 18, [maxPoints]);
  useEffect(() => { nodeSizeFnRef.current = nodeSize; }, [nodeSize]);

  // Newtonian physics engine
  const physicsTick = useCallback(() => {
    const nodes = basePositionsRef.current;
    const offsets = { ...dragOffsetsRef.current };
    const vels = velocitiesRef.current;
    const currentDrag = dragIdxRef.current;
    const nsFn = nodeSizeFnRef.current;

    // Build world positions
    const world: { idx: number; x: number; y: number; r: number; mass: number }[] = [];
    nodes.forEach((node) => {
      const off = offsets[node.origIdx] || { x: 0, y: 0 };
      const r = nsFn(node.cluster.total_points);
      world.push({
        idx: node.origIdx,
        x: node.baseX + off.x,
        y: node.baseY + off.y,
        r,
        mass: r * r,
      });
    });

    // Pairwise collision detection & elastic response
    for (let i = 0; i < world.length; i++) {
      for (let j = i + 1; j < world.length; j++) {
        const a = world[i];
        const b = world[j];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 0.01;
        const minDist = a.r + b.r + PHYS_COLLISION_PAD;
        if (dist >= minDist) continue;

        const nx = dx / dist;
        const ny = dy / dist;
        const va = vels[a.idx] || { vx: 0, vy: 0 };
        const vb = vels[b.idx] || { vx: 0, vy: 0 };
        const relVn = (va.vx - vb.vx) * nx + (va.vy - vb.vy) * ny;

        const aFixed = currentDrag === a.idx;
        const bFixed = currentDrag === b.idx;
        const invA = aFixed ? 0 : 1 / a.mass;
        const invB = bFixed ? 0 : 1 / b.mass;
        const totalInv = invA + invB;

        // Impulse (only if approaching)
        if (relVn < 0 && totalInv > 0) {
          const imp = -(1 + PHYS_RESTITUTION) * relVn / totalInv;
          if (!aFixed) {
            if (!vels[a.idx]) vels[a.idx] = { vx: 0, vy: 0 };
            vels[a.idx].vx += imp * nx * invA;
            vels[a.idx].vy += imp * ny * invA;
          }
          if (!bFixed) {
            if (!vels[b.idx]) vels[b.idx] = { vx: 0, vy: 0 };
            vels[b.idx].vx -= imp * nx * invB;
            vels[b.idx].vy -= imp * ny * invB;
          }
        }

        // Positional separation (push apart)
        const overlap = minDist - dist;
        const sepInvA = aFixed ? 0 : 1;
        const sepInvB = bFixed ? 0 : 1;
        const sepTotal = sepInvA + sepInvB;
        if (sepTotal > 0) {
          if (!aFixed) {
            const oa = offsets[a.idx] || { x: 0, y: 0 };
            offsets[a.idx] = {
              x: oa.x - nx * overlap * (sepInvA / sepTotal),
              y: oa.y - ny * overlap * (sepInvA / sepTotal),
            };
          }
          if (!bFixed) {
            const ob = offsets[b.idx] || { x: 0, y: 0 };
            offsets[b.idx] = {
              x: ob.x + nx * overlap * (sepInvB / sepTotal),
              y: ob.y + ny * overlap * (sepInvB / sepTotal),
            };
          }
        }
      }
    }

    // Integrate velocity with damping
    let anyActive = false;
    nodes.forEach((node) => {
      if (currentDrag === node.origIdx) return;
      const v = vels[node.origIdx];
      if (!v) return;
      v.vx *= PHYS_DAMPING;
      v.vy *= PHYS_DAMPING;
      const off = offsets[node.origIdx] || { x: 0, y: 0 };
      offsets[node.origIdx] = { x: off.x + v.vx, y: off.y + v.vy };
      if (Math.abs(v.vx) > PHYS_VEL_THRESHOLD || Math.abs(v.vy) > PHYS_VEL_THRESHOLD) {
        anyActive = true;
      } else {
        v.vx = 0;
        v.vy = 0;
      }
    });

    dragOffsetsRef.current = offsets;
    setDragOffsets(offsets);

    if (anyActive || currentDrag !== null) {
      rafId.current = requestAnimationFrame(physicsTick);
    } else {
      physicsRunning.current = false;
    }
  }, []);

  const startPhysics = useCallback(() => {
    if (physicsRunning.current) return;
    physicsRunning.current = true;
    rafId.current = requestAnimationFrame(physicsTick);
  }, [physicsTick]);

  // Cleanup rAF on unmount
  useEffect(() => () => cancelAnimationFrame(rafId.current), []);

  // Pan handlers
  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if ((e.target as Element).closest("[data-cluster-node]")) return;
    isPanning.current = true;
    panStart.current = { x: e.clientX, y: e.clientY, panX: pan.x, panY: pan.y };
    (e.target as Element).setPointerCapture?.(e.pointerId);
  }, [pan]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    // Node drag -- move the dragged node & track velocity for collisions
    if (dragIdx !== null) {
      const dx = (e.clientX - dragStart.current.x) / zoom;
      const dy = (e.clientY - dragStart.current.y) / zoom;
      const newOff = { x: dragStart.current.nodeX + dx, y: dragStart.current.nodeY + dy };

      // Compute drag velocity from mouse delta
      const now = performance.now();
      const last = lastDragPosRef.current;
      if (last) {
        const dt = Math.max(now - last.t, 1) / 16; // normalise to ~60fps frame
        velocitiesRef.current[dragIdx] = {
          vx: (newOff.x - (dragOffsetsRef.current[dragIdx]?.x || 0)) / dt,
          vy: (newOff.y - (dragOffsetsRef.current[dragIdx]?.y || 0)) / dt,
        };
      }
      lastDragPosRef.current = { x: newOff.x, y: newOff.y, t: now };

      const updated = { ...dragOffsetsRef.current, [dragIdx]: newOff };
      dragOffsetsRef.current = updated;
      setDragOffsets(updated);
      setTooltip(null);

      // Ensure physics loop is running for collision detection
      startPhysics();
      return;
    }
    // Canvas pan
    if (!isPanning.current) return;
    const dx = e.clientX - panStart.current.x;
    const dy = e.clientY - panStart.current.y;
    setPan({ x: panStart.current.panX + dx, y: panStart.current.panY + dy });
  }, [dragIdx, zoom, startPhysics]);

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    isPanning.current = false;
    if (dragIdx !== null) {
      // Detect click vs drag: if pointer barely moved, treat as click
      const cs = clickStartRef.current;
      if (cs && onNodeClick) {
        const dx = e.clientX - cs.x;
        const dy = e.clientY - cs.y;
        if (Math.sqrt(dx * dx + dy * dy) < 5) {
          const node = basePositions.find((n) => n.origIdx === cs.idx);
          if (node) onNodeClick(node.cluster);
        }
      }
      clickStartRef.current = null;
      lastDragPosRef.current = null;
      setDragIdx(null);
    }
  }, [dragIdx, onNodeClick, basePositions]);

  // Zoom handler (non-passive so preventDefault works)
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP;
      setZoom((z) => Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, z + delta)));
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  const resetView = useCallback(() => {
    setPan({ x: 0, y: 0 });
    setZoom(1);
    setDragOffsets({});
    dragOffsetsRef.current = {};
    velocitiesRef.current = {};
  }, []);

  // Node pointer handlers
  const handleNodeDown = useCallback((e: React.PointerEvent, origIdx: number) => {
    e.stopPropagation();
    clickStartRef.current = { x: e.clientX, y: e.clientY, idx: origIdx };
    const existing = dragOffsetsRef.current[origIdx];
    dragStart.current = {
      x: e.clientX,
      y: e.clientY,
      nodeX: existing?.x || 0,
      nodeY: existing?.y || 0,
    };
    lastDragPosRef.current = null;
    velocitiesRef.current[origIdx] = { vx: 0, vy: 0 };
    setDragIdx(origIdx);
    (e.target as Element).setPointerCapture?.(e.pointerId);
    startPhysics();
  }, [startPhysics]);

  const handleNodeEnter = useCallback((e: React.PointerEvent, node: NodePosition) => {
    if (dragIdx !== null) return;
    onHover(node.origIdx);
    const rect = containerRef.current?.getBoundingClientRect();
    if (rect) {
      setTooltip({ cluster: node.cluster, x: e.clientX, y: e.clientY });
    }
  }, [dragIdx, onHover]);

  const handleNodeMove = useCallback((e: React.PointerEvent, node: NodePosition) => {
    if (dragIdx !== null) return;
    const rect = containerRef.current?.getBoundingClientRect();
    if (rect) {
      setTooltip({ cluster: node.cluster, x: e.clientX, y: e.clientY });
    }
  }, [dragIdx]);

  const handleNodeLeave = useCallback(() => {
    if (dragIdx !== null) return;
    onHover(null);
    setTooltip(null);
  }, [dragIdx, onHover]);

  const transformStr = `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`;

  return (
    <div
      ref={containerRef}
      className="relative mx-auto overflow-hidden select-none"
      style={{
        width: "100%",
        height: svgSize + 40,
        cursor: dragIdx !== null ? "grabbing" : isPanning.current ? "grabbing" : "grab",
        touchAction: "none",
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={() => { isPanning.current = false; clickStartRef.current = null; if (dragIdx !== null) { lastDragPosRef.current = null; setDragIdx(null); } }}
      onDoubleClick={resetView}
    >
      {/* Transform wrapper */}
      <div
        className="absolute inset-0 flex items-center justify-center"
        style={{ transform: transformStr, transformOrigin: "center center", willChange: "transform" }}
      >
        <svg
          width={svgSize}
          height={svgSize}
          viewBox={`0 0 ${svgSize} ${svgSize}`}
          className="overflow-visible"
        >
          <defs>
            <radialGradient id="hub-glow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.15" />
              <stop offset="100%" stopColor="var(--primary)" stopOpacity="0" />
            </radialGradient>
          </defs>

          {/* Orbit rings */}
          {(["strong", "growing", "weak"] as const).map((level, i) => (
            <motion.circle
              key={level}
              cx={cx} cy={cy} r={orbits[level]}
              fill="none" stroke="currentColor" strokeWidth={1}
              strokeDasharray="4 6"
              className="text-foreground/[0.06]"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 + i * 0.15, duration: 0.8, ease: EASE_SMOOTH }}
              style={{ transformOrigin: `${cx}px ${cy}px` }}
            />
          ))}

          {/* Connection lines */}
          {basePositions.map((node, i) => {
            const config = strengthLevelConfig[node.cluster.strength_level] || strengthLevelConfig.weak;
            const pos = getNodePos(node);
            const isHov = hoveredIndex === node.origIdx;
            return (
              <motion.line
                key={`line-${i}`}
                x1={cx} y1={cy} x2={pos.x} y2={pos.y}
                stroke={config.color}
                strokeWidth={isHov ? 2 : 1}
                strokeOpacity={isHov ? 0.6 : 0.12}
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 1 }}
                transition={{ delay: 0.6 + i * 0.07, duration: 0.6, ease: EASE_SMOOTH }}
              />
            );
          })}

          {/* Particles -- strong clusters only */}
          {basePositions
            .filter((n) => n.cluster.strength_level === "strong")
            .slice(0, 4)
            .map((node, i) => {
              const pos = getNodePos(node);
              return (
                <circle key={`particle-${i}`} r={2.5} fill={strengthLevelConfig.strong.color} opacity={0.7}>
                  <animateMotion
                    dur={`${2.5 + i * 0.5}s`} repeatCount="indefinite"
                    begin={`${1 + i * 0.6}s`}
                    path={`M${cx},${cy} L${pos.x},${pos.y}`}
                  />
                  <animate attributeName="opacity" values="0;0.8;0.8;0" dur={`${2.5 + i * 0.5}s`} repeatCount="indefinite" begin={`${1 + i * 0.6}s`} />
                </circle>
              );
            })}

          {/* Hub glow */}
          <circle cx={cx} cy={cy} r={hubRadius * 2.5} fill="url(#hub-glow)" />

          {/* Cluster nodes */}
          {basePositions.map((node, i) => {
            const config = strengthLevelConfig[node.cluster.strength_level] || strengthLevelConfig.weak;
            const pos = getNodePos(node);
            const r = nodeSize(node.cluster.total_points);
            const isHov = hoveredIndex === node.origIdx;
            const isDragging = dragIdx === node.origIdx;
            return (
              <g
                key={`node-${i}`}
                data-cluster-node=""
                onPointerDown={(e) => handleNodeDown(e, node.origIdx)}
                onPointerEnter={(e) => handleNodeEnter(e, node)}
                onPointerMove={(e) => handleNodeMove(e, node)}
                onPointerLeave={handleNodeLeave}
                style={{ cursor: isDragging ? "grabbing" : "pointer" }}
              >
                {/* Hover glow */}
                {(isHov || isDragging) && (
                  <circle cx={pos.x} cy={pos.y} r={r + 8} fill="none"
                    stroke={config.color} strokeWidth={2} opacity={0.4}
                    strokeDasharray={isDragging ? "3 3" : "none"}
                  />
                )}
                {/* Node body */}
                <motion.circle
                  cx={pos.x} cy={pos.y} r={r}
                  fill={config.color}
                  fillOpacity={isHov || isDragging ? 0.35 : 0.15}
                  stroke={config.color}
                  strokeWidth={isHov || isDragging ? 2.5 : 1.5}
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.8 + i * 0.08, type: "spring", stiffness: 260, damping: 18 }}
                  style={{ transformOrigin: `${pos.x}px ${pos.y}px` }}
                />
                {/* % label */}
                <motion.text
                  x={pos.x} y={pos.y}
                  textAnchor="middle" dominantBaseline="central"
                  fill={config.color}
                  fontSize={r > 16 ? 12 : 10}
                  fontWeight="700"
                  className="font-display select-none pointer-events-none"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 1 + i * 0.08 }}
                >
                  {Math.round(node.cluster.strength * 100)}
                </motion.text>
              </g>
            );
          })}

          {/* Hub */}
          <motion.circle
            cx={cx} cy={cy} r={hubRadius}
            fill="var(--primary)" fillOpacity={0.08}
            stroke="var(--primary)" strokeWidth={2} strokeOpacity={0.35}
            initial={{ scale: 0 }} animate={{ scale: 1 }}
            transition={{ delay: 0.3, type: "spring", stiffness: 200, damping: 16 }}
            style={{ transformOrigin: `${cx}px ${cy}px` }}
          />
          <circle cx={cx} cy={cy} r={hubRadius} fill="none" stroke="var(--primary)" strokeWidth={1.5} opacity={0.3}>
            <animate attributeName="r" values={`${hubRadius};${hubRadius * 1.8};${hubRadius * 1.8}`} dur="2.5s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.35;0;0" dur="2.5s" repeatCount="indefinite" />
          </circle>
          <motion.text x={cx} y={cy - 4} textAnchor="middle" dominantBaseline="central" fill="var(--primary)"
            fontSize={12} fontWeight="800" letterSpacing="0.05em"
            className="font-display select-none pointer-events-none"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}
          >CIRI</motion.text>
          <motion.text x={cx} y={cy + 10} textAnchor="middle" dominantBaseline="central" fill="var(--primary)"
            fontSize={8} fontWeight="600" letterSpacing="0.15em"
            className="select-none uppercase pointer-events-none"
            initial={{ opacity: 0 }} animate={{ opacity: 0.5 }} transition={{ delay: 0.7 }}
          >AI CORE</motion.text>

          {/* Orbit zone labels (inside SVG so they pan/zoom with content) */}
          {(["strong", "growing", "weak"] as const).map((level) => {
            const cfg = strengthLevelConfig[level];
            const r = orbits[level];
            const angle = -Math.PI / 2 - 0.35;
            const lx = cx + Math.cos(angle) * r;
            const ly = cy + Math.sin(angle) * r;
            return (
              <text
                key={`orbit-lbl-${level}`}
                x={lx} y={ly}
                textAnchor="middle" dominantBaseline="central"
                fill={cfg.color}
                fontSize={9}
                fontWeight="700"
                letterSpacing="0.1em"
                className="uppercase select-none pointer-events-none"
                opacity={0.7}
              >
                {cfg.label}
              </text>
            );
          })}
        </svg>
      </div>

      {/* Zoom controls -- top right */}
      <div className="absolute top-3 right-3 flex flex-col gap-1 z-10">
        <button
          onClick={() => setZoom((z) => Math.min(ZOOM_MAX, z + ZOOM_STEP * 2))}
          className="flex size-7 items-center justify-center rounded-lg border bg-card/80 backdrop-blur-sm text-muted-foreground hover:text-foreground hover:bg-card transition-colors"
          title="Zoom inn"
        >
          <ZoomInIcon className="size-3.5" />
        </button>
        <button
          onClick={() => setZoom((z) => Math.max(ZOOM_MIN, z - ZOOM_STEP * 2))}
          className="flex size-7 items-center justify-center rounded-lg border bg-card/80 backdrop-blur-sm text-muted-foreground hover:text-foreground hover:bg-card transition-colors"
          title="Zoom ut"
        >
          <ZoomOutIcon className="size-3.5" />
        </button>
        <button
          onClick={resetView}
          className="flex size-7 items-center justify-center rounded-lg border bg-card/80 backdrop-blur-sm text-muted-foreground hover:text-foreground hover:bg-card transition-colors"
          title="Tilbakestill visning"
        >
          <Maximize2Icon className="size-3.5" />
        </button>
      </div>

      {/* Zoom level indicator */}
      <div className="absolute bottom-3 left-3 z-10 text-[10px] font-mono text-muted-foreground/40 tabular-nums">
        {Math.round(zoom * 100)}%
      </div>

      {/* Rich tooltip -- HTML overlay */}
      <AnimatePresence>
        {tooltip && containerRef.current && (
          <ClusterTooltip
            key={tooltip.cluster.account_number}
            cluster={tooltip.cluster}
            screenX={tooltip.x}
            screenY={tooltip.y}
            containerRect={containerRef.current.getBoundingClientRect()}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ============================================================================
// GlobalHealthRing
// ============================================================================

interface GlobalHealthRingProps {
  clusters: ClusterInfo[];
}

export function GlobalHealthRing({ clusters }: GlobalHealthRingProps) {
  const strong = clusters.filter((c) => c.strength_level === "strong").length;
  const growing = clusters.filter((c) => c.strength_level === "growing").length;
  const weak = clusters.filter((c) => c.strength_level === "weak").length;
  const total = clusters.length || 1;
  const avg = clusters.length > 0
    ? Math.round((clusters.reduce((s, c) => s + c.strength, 0) / clusters.length) * 100)
    : 0;

  let avgLevel: string;
  if (avg >= 60) {
    avgLevel = "strong";
  } else if (avg >= 30) {
    avgLevel = "growing";
  } else {
    avgLevel = "weak";
  }

  const segments = [
    { count: strong, label: "Sterke", config: strengthLevelConfig.strong },
    { count: growing, label: "Vokser", config: strengthLevelConfig.growing },
    { count: weak, label: "Svake", config: strengthLevelConfig.weak },
  ];

  const size = 160;
  const strokeW = 14;
  const radius = (size - strokeW) / 2;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1, duration: 0.7, ease: EASE_SMOOTH }}
      className="rounded-2xl border bg-card p-5 overflow-hidden"
    >
      <div className="flex items-center gap-5">
        {/* Ring */}
        <div className="relative shrink-0" style={{ width: size, height: size }}>
          <svg width={size} height={size} className="-rotate-90">
            <circle
              cx={size / 2} cy={size / 2} r={radius}
              fill="none" strokeWidth={strokeW}
              stroke="currentColor" opacity={0.04}
            />
            {segments.map((seg, i) => {
              const pct = seg.count / total;
              const dash = circumference * pct;
              const gap = circumference - dash;
              const thisOffset = offset;
              offset += dash;
              if (seg.count === 0) return null;
              return (
                <motion.circle
                  key={i}
                  cx={size / 2} cy={size / 2} r={radius}
                  fill="none" strokeWidth={strokeW}
                  strokeLinecap="round"
                  stroke={seg.config.color}
                  strokeDasharray={`${dash} ${gap}`}
                  strokeDashoffset={-thisOffset}
                  initial={{ strokeDasharray: `0 ${circumference}` }}
                  animate={{ strokeDasharray: `${dash} ${gap}` }}
                  transition={{ delay: 0.4 + i * 0.2, duration: 1, ease: EASE_SMOOTH }}
                />
              );
            })}
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-3xl font-display font-bold leading-none tabular-nums">
              <AnimatedNumber value={total} duration={0.8} />
            </span>
            <span className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground/50 mt-1 font-semibold">
              klynger
            </span>
          </div>
        </div>

        {/* Stats column */}
        <div className="flex-1 min-w-0 space-y-3">
          {/* Average strength */}
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground/40 mb-1 truncate">
              Snitt-styrke
            </p>
            <div className="flex items-baseline gap-2 flex-wrap">
              <span
                className="text-2xl font-display font-bold tabular-nums leading-none"
                style={{ color: strengthLevelConfig[avgLevel].color }}
              >
                <AnimatedNumber value={avg} suffix="%" />
              </span>
              <span
                className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full whitespace-nowrap"
                style={{
                  backgroundColor: strengthLevelConfig[avgLevel].color + "15",
                  color: strengthLevelConfig[avgLevel].color,
                }}
              >
                {strengthLevelConfig[avgLevel].label}
              </span>
            </div>
          </div>
          {/* Breakdown legend */}
          <div className="space-y-1.5">
            {segments.map((seg, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.6 + i * 0.12, ease: EASE_SMOOTH }}
                className="flex items-center gap-2"
              >
                <div
                  className="size-2 rounded-full shrink-0"
                  style={{ backgroundColor: seg.config.color }}
                />
                <span className="text-[12px] text-muted-foreground flex-1 truncate">{seg.label}</span>
                <span
                  className="text-[13px] font-bold tabular-nums shrink-0"
                  style={{ color: seg.config.color }}
                >
                  {seg.count}
                </span>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ============================================================================
// AutonomyPathway
// ============================================================================

interface AutonomyPathwayProps {
  clusterStats: ClusterStatsData;
  ruleStats: RuleStats;
}

export function AutonomyPathway({
  clusterStats,
  ruleStats,
}: AutonomyPathwayProps) {
  const stepsCompleted = [
    ruleStats.active_rules >= 5,
    clusterStats.strong_clusters > 0,
    clusterStats.global_minimums_passed,
  ];
  const completedCount = stepsCompleted.filter(Boolean).length;
  const allDone = completedCount === 3;

  let growingProgressLabel: string;
  if (clusterStats.strong_clusters > 0) {
    growingProgressLabel = `${clusterStats.strong_clusters} sterke klynger`;
  } else if (clusterStats.growing_clusters > 0) {
    growingProgressLabel = `${clusterStats.growing_clusters} vokser -- nesten der`;
  } else {
    growingProgressLabel = "Ingen klynger enna";
  }

  const steps = [
    {
      icon: LayersIcon,
      title: "Opprett 5 regler",
      description: "Minimum 5 aktive avstemmingsregler for monstergjenkjenning",
      progress: `${ruleStats.active_rules} / 5 regler`,
      met: stepsCompleted[0],
    },
    {
      icon: NetworkIcon,
      title: "Bygg 1 sterk klynge",
      description: "Minst en klynge ma na <<sterk>> niva gjennom nok datapunkter",
      progress: growingProgressLabel,
      met: stepsCompleted[1],
    },
    {
      icon: allDone ? UnlockIcon : LockIcon,
      title: "Autonom bokforing",
      description: allDone
        ? `Ciri bokforer automatisk for ${clusterStats.strong_clusters} av ${clusterStats.total_clusters} klynger`
        : "Oppfyll kravene over for a aktivere autonom modus",
      progress: allDone
        ? `${clusterStats.strong_clusters} av ${clusterStats.total_clusters} klynger aktive`
        : "Last",
      met: stepsCompleted[2],
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2, duration: 0.6, ease: EASE_SMOOTH }}
      className="rounded-2xl border bg-card p-5 overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground/40">
          Krav for autonom bokforing
        </p>
        <span className="text-[11px] font-bold tabular-nums text-muted-foreground/30">
          {completedCount}/3
        </span>
      </div>

      {/* Progress bar */}
      <div className="relative h-1.5 rounded-full bg-muted/40 overflow-hidden mb-5">
        <motion.div
          className="absolute inset-y-0 left-0 rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${(completedCount / 3) * 100}%` }}
          transition={{ delay: 0.3, duration: 0.8, ease: EASE_SMOOTH }}
          style={{
            background: allDone
              ? `linear-gradient(90deg, ${strengthLevelConfig.strong.color}, ${strengthLevelConfig.strong.colorEnd})`
              : `linear-gradient(90deg, var(--primary), var(--primary))`,
          }}
        />
      </div>

      {/* Vertical steps */}
      <div className="space-y-0">
        {steps.map((step, i) => (
          <motion.div
            key={step.title}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 + i * 0.12, ease: EASE_SMOOTH }}
            className="relative flex gap-3"
          >
            {/* Vertical connector line */}
            {i < steps.length - 1 && (
              <div
                className="absolute left-[13px] top-[30px] w-px bottom-0"
                style={{
                  backgroundColor: step.met
                    ? strengthLevelConfig.strong.color + "30"
                    : "var(--border)",
                }}
              />
            )}

            {/* Step icon */}
            <div
              className={cn(
                "relative z-10 flex size-[26px] shrink-0 items-center justify-center rounded-lg transition-colors",
                step.met
                  ? "bg-sky-500/15 text-sky-600 dark:text-sky-400"
                  : "bg-muted/60 text-muted-foreground/30"
              )}
            >
              {step.met ? (
                <motion.div
                  initial={{ scale: 0, rotate: -90 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ delay: 0.6 + i * 0.15, type: "spring", stiffness: 300, damping: 14 }}
                >
                  <CheckCircle2Icon className="size-3.5" />
                </motion.div>
              ) : (
                <step.icon className="size-3.5" />
              )}
            </div>

            {/* Step content */}
            <div className={cn("flex-1 min-w-0 pb-4", i === steps.length - 1 && "pb-0")}>
              <p
                className={cn(
                  "text-[13px] font-semibold leading-tight",
                  step.met ? "text-foreground" : "text-muted-foreground/70"
                )}
              >
                {step.title}
              </p>
              <p className="text-[11px] text-muted-foreground/40 mt-0.5 leading-relaxed">
                {step.description}
              </p>
              <span
                className={cn(
                  "inline-block text-[10px] font-bold uppercase tracking-[0.08em] mt-1.5 px-1.5 py-[2px] rounded-md",
                  step.met
                    ? "bg-sky-500/10 text-sky-600 dark:text-sky-400"
                    : "bg-muted/50 text-muted-foreground/40"
                )}
              >
                {step.progress}
              </span>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
