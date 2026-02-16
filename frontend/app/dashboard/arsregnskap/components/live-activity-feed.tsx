"use client";

import { motion } from "framer-motion";
import { CheckCircle2Icon } from "lucide-react";
import CiriLogo from "@/components/layout/ciri-logo";
import type { CiriActivity } from "../types";
import { formatTimeAgo } from "../helpers";

export function LiveActivityFeed({ activities }: { activities: CiriActivity[] }) {
  const currentActivity = activities.find(a => a.status === "in_progress") || activities[0];
  const completedActivities = activities.filter(a => a.status === "completed").slice(0, 4);

  return (
    <div className="space-y-4">
      <div className="rounded-xl border-2 border-[var(--primary)]/20 bg-[var(--primary)]/5 p-4">
        <div className="flex items-center gap-3">
          <div className="relative">
            <CiriLogo size="sm" />
            <motion.div
              className="absolute -inset-1 rounded-full border-2 border-[var(--primary)]/40"
              animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0, 0.5] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <motion.div
                className="size-2 rounded-full bg-[var(--primary)]"
                animate={{ scale: [1, 1.3, 1] }}
                transition={{ duration: 1, repeat: Infinity }}
              />
              <span className="text-xs font-medium text-[var(--primary)]">Arbeider nå</span>
            </div>
            <p className="font-medium truncate">{currentActivity.task}</p>
          </div>
        </div>
      </div>
      <div className="space-y-2">
        {completedActivities.map((activity, index) => (
          <motion.div
            key={activity.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            className="flex items-center gap-3 text-sm"
          >
            <CheckCircle2Icon className="size-4 shrink-0 text-emerald-500" />
            <span className="flex-1 truncate text-muted-foreground">{activity.task}</span>
            <span className="text-xs text-muted-foreground shrink-0">
              {formatTimeAgo(activity.timestamp)}
            </span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
