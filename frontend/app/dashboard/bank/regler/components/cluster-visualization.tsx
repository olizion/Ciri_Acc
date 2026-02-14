"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { NetworkIcon } from "lucide-react";
import CiriLogo from "@/components/layout/ciri-logo";
import type { ClusterInfo, ClusterStatsData, RuleStats } from "../types";
import { strengthLevelConfig, EASE_SMOOTH } from "../constants";
import { AnimatedNumber } from "./animated-number";
import { ClusterDetailCard, ClusterDetailDialog } from "./cluster-details";
import { RadialNodeMap, GlobalHealthRing, AutonomyPathway } from "./cluster-visualizations";

// ============================================================================
// ClusterVisualization (main container)
// ============================================================================

interface ClusterVisualizationProps {
  clusterStats: ClusterStatsData;
  ruleStats: RuleStats;
  isLoading: boolean;
}

export function ClusterVisualization({
  clusterStats,
  ruleStats,
  isLoading,
}: ClusterVisualizationProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [selectedCluster, setSelectedCluster] = useState<ClusterInfo | null>(null);

  if (isLoading) {
    return (
      <div className="space-y-6">
        {/* Skeleton: hero strip */}
        <div className="grid grid-cols-4 gap-px rounded-2xl border bg-border overflow-hidden animate-pulse">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-card px-4 py-8" />
          ))}
        </div>
        {/* Skeleton: radial map */}
        <div className="rounded-2xl border bg-card animate-pulse flex items-center justify-center" style={{ height: 440 }}>
          <div className="size-32 rounded-full bg-muted/30" />
        </div>
        {/* Skeleton: cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="rounded-2xl border bg-card animate-pulse h-48" />
          ))}
        </div>
      </div>
    );
  }

  const clusters = clusterStats.clusters;
  const sorted = [...clusters].sort((a, b) => b.strength - a.strength);

  // Empty state
  if (clusters.length === 0) {
    return (
      <div className="space-y-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, ease: EASE_SMOOTH }}
          className="rounded-2xl border border-dashed border-muted-foreground/20 bg-card p-16 text-center"
        >
          <div className="mx-auto size-20 rounded-full bg-primary/5 flex items-center justify-center mb-5">
            <NetworkIcon className="size-9 text-primary/25" />
          </div>
          <h3 className="font-display text-lg font-semibold text-foreground/70">
            Ingen klynger enna
          </h3>
          <p className="text-[13px] text-muted-foreground/50 mt-2 max-w-md mx-auto leading-relaxed">
            Bekreft forslag pa avstemmingssiden for a bygge klynger. Hver bekreftelse styrker Ciris forstaelse av monstrene dine.
          </p>
        </motion.div>
        <AutonomyPathway clusterStats={clusterStats} ruleStats={ruleStats} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Hero metric strip */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: EASE_SMOOTH }}
      >
        <div className="grid grid-cols-4 gap-px rounded-2xl border bg-border overflow-hidden">
          {[
            { label: "Klynger", value: clusterStats.total_clusters },
            { label: "Datapunkter", value: clusterStats.total_data_points },
            {
              label: "Sterke",
              value: clusterStats.strong_clusters,
              hex: strengthLevelConfig.strong.color,
            },
            {
              label: "Vokser",
              value: clusterStats.growing_clusters,
              hex: strengthLevelConfig.growing.color,
            },
          ].map((m, mi) => (
            <motion.div
              key={m.label}
              className="bg-card px-4 py-5 text-center relative overflow-hidden"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: mi * 0.08, ease: EASE_SMOOTH }}
            >
              {m.hex && (
                <div
                  className="absolute inset-x-0 bottom-0 h-0.5"
                  style={{
                    background: `linear-gradient(90deg, transparent, ${m.hex}, transparent)`,
                    opacity: 0.35,
                  }}
                />
              )}
              <p
                className="text-2xl font-display font-bold tabular-nums leading-none"
                style={m.hex ? { color: m.hex } : undefined}
              >
                <AnimatedNumber value={m.value} duration={0.9} />
              </p>
              <p className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground/50 mt-1.5 font-semibold">
                {m.label}
              </p>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Radial Map + Health Ring */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-5 items-start">
        {/* Node map */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.15, duration: 0.7, ease: EASE_SMOOTH }}
          className="rounded-2xl border bg-card py-6 overflow-hidden"
        >
          <RadialNodeMap
            clusters={sorted}
            hoveredIndex={hoveredIndex}
            onHover={setHoveredIndex}
            onNodeClick={setSelectedCluster}
          />
        </motion.div>
        {/* Health ring sidebar */}
        <div className="space-y-4">
          <GlobalHealthRing clusters={clusters} />
          <AutonomyPathway clusterStats={clusterStats} ruleStats={ruleStats} />
        </div>
      </div>

      {/* Section header */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25, ease: EASE_SMOOTH }}
        className="flex items-center gap-3 pt-1"
      >
        <h3 className="text-sm font-display font-semibold">Alle klynger</h3>
        <div className="flex-1 h-px bg-border" />
        <span className="text-[10px] text-muted-foreground/35 tabular-nums font-medium">
          {clusters.length} totalt
        </span>
      </motion.div>

      {/* Cluster detail cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {sorted.map((cluster, i) => (
          <ClusterDetailCard
            key={`${cluster.account_number}-${cluster.category}`}
            cluster={cluster}
            index={i}
            isHovered={hoveredIndex === i}
            onHover={(h) => setHoveredIndex(h ? i : null)}
            onClick={() => setSelectedCluster(cluster)}
          />
        ))}
      </div>

      {/* Global minimums message */}
      {!clusterStats.global_minimums_passed && clusterStats.global_minimums_reason && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="rounded-2xl border border-dashed border-muted-foreground/15 bg-muted/8 p-6"
        >
          <div className="flex items-start gap-4">
            <CiriLogo size="sm" animated intensity="subtle" />
            <div>
              <p className="text-sm font-semibold text-foreground/75">
                Ciri er ikke klar for autonom bokforing enna
              </p>
              <p className="text-[13px] text-muted-foreground/60 mt-1 leading-relaxed">
                {clusterStats.global_minimums_reason}
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Cluster Detail Dialog */}
      <AnimatePresence>
        {selectedCluster && (
          <ClusterDetailDialog
            cluster={selectedCluster}
            allClusters={clusters}
            onClose={() => setSelectedCluster(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
