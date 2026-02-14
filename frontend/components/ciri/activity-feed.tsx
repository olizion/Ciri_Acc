"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  MailIcon,
  FileTextIcon,
  CheckCircle2Icon,
  AlertCircleIcon,
  TagIcon,
  LinkIcon,
  RefreshCwIcon,
  SparklesIcon,
  InboxIcon,
  ClockIcon
} from "lucide-react";
import { cn } from "@/lib/utils";
import CiriLogo from "@/components/layout/ciri-logo";

// ============================================================================
// TYPES
// ============================================================================

interface CiriActivity {
  id: string;
  type: string;
  title: string;
  description: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

interface ActivityFeedProps {
  className?: string;
  maxItems?: number;
  showHeader?: boolean;
  compact?: boolean;
}

// ============================================================================
// ACTIVITY TYPE CONFIG
// ============================================================================

const activityTypeConfig: Record<string, {
  icon: typeof MailIcon;
  color: string;
  bg: string;
}> = {
  email_received: {
    icon: MailIcon,
    color: "text-blue-600 dark:text-blue-400",
    bg: "bg-blue-100 dark:bg-blue-900/30"
  },
  email_ignored: {
    icon: InboxIcon,
    color: "text-slate-500 dark:text-slate-400",
    bg: "bg-slate-100 dark:bg-slate-800/30"
  },
  bilag_processed: {
    icon: FileTextIcon,
    color: "text-emerald-600 dark:text-emerald-400",
    bg: "bg-emerald-100 dark:bg-emerald-900/30"
  },
  bilag_matched: {
    icon: LinkIcon,
    color: "text-purple-600 dark:text-purple-400",
    bg: "bg-purple-100 dark:bg-purple-900/30"
  },
  bilag_categorized: {
    icon: TagIcon,
    color: "text-amber-600 dark:text-amber-400",
    bg: "bg-amber-100 dark:bg-amber-900/30"
  },
  bilag_error: {
    icon: AlertCircleIcon,
    color: "text-red-600 dark:text-red-400",
    bg: "bg-red-100 dark:bg-red-900/30"
  },
  processing_error: {
    icon: AlertCircleIcon,
    color: "text-red-600 dark:text-red-400",
    bg: "bg-red-100 dark:bg-red-900/30"
  },
  default: {
    icon: SparklesIcon,
    color: "text-primary",
    bg: "bg-primary/10"
  }
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return "nå";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min siden`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} t siden`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "i går";
  if (days < 7) return `${days} dager siden`;
  return date.toLocaleDateString("nb-NO", { day: "numeric", month: "short" });
}

// ============================================================================
// MOCK DATA (for development)
// ============================================================================

const mockActivities: CiriActivity[] = [
  {
    id: "1",
    type: "email_received",
    title: "E-post mottatt",
    description: "Mottok faktura fra Elkjøp Norge AS med 1 vedlegg",
    metadata: { from: "faktura@elkjop.no", attachments: 1 },
    created_at: new Date(Date.now() - 1000 * 60 * 5).toISOString()
  },
  {
    id: "2",
    type: "bilag_processed",
    title: "Bilag behandlet",
    description: "Behandlet faktura_elkjop_jan2025.pdf - kr 15 499",
    metadata: { amount: 15499, supplier: "Elkjøp" },
    created_at: new Date(Date.now() - 1000 * 60 * 4).toISOString()
  },
  {
    id: "3",
    type: "bilag_matched",
    title: "Bilag matchet",
    description: "Matchet faktura med banktransaksjon fra 24. jan",
    metadata: { transaction_date: "2025-01-24" },
    created_at: new Date(Date.now() - 1000 * 60 * 4).toISOString()
  },
  {
    id: "4",
    type: "email_received",
    title: "E-post mottatt",
    description: "Mottok kvittering fra Circle K med 1 vedlegg",
    metadata: { from: "kvittering@circlek.no", attachments: 1 },
    created_at: new Date(Date.now() - 1000 * 60 * 30).toISOString()
  },
  {
    id: "5",
    type: "bilag_processed",
    title: "Bilag behandlet",
    description: "Behandlet kvittering_circlek.pdf - kr 892,30",
    metadata: { amount: 892.30, supplier: "Circle K" },
    created_at: new Date(Date.now() - 1000 * 60 * 29).toISOString()
  },
  {
    id: "6",
    type: "bilag_categorized",
    title: "Auto-kategorisert",
    description: "Circle K-kvittering kategorisert som Reise (drivstoff)",
    metadata: { category: "reise" },
    created_at: new Date(Date.now() - 1000 * 60 * 28).toISOString()
  },
  {
    id: "7",
    type: "email_ignored",
    title: "E-post ignorert",
    description: "Nyhetsbrev fra LinkedIn ble ignorert",
    metadata: { from: "messages-noreply@linkedin.com" },
    created_at: new Date(Date.now() - 1000 * 60 * 60).toISOString()
  }
];

// ============================================================================
// ACTIVITY ITEM COMPONENT
// ============================================================================

function ActivityItem({
  activity,
  index,
  compact = false
}: {
  activity: CiriActivity;
  index: number;
  compact?: boolean;
}) {
  const config = activityTypeConfig[activity.type] || activityTypeConfig.default;
  const Icon = config.icon;

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05 }}
      className={cn(
        "group relative flex gap-3",
        compact ? "py-2" : "py-3"
      )}
    >
      {/* Timeline line */}
      {!compact && (
        <div className="absolute left-[15px] top-10 bottom-0 w-px bg-border group-last:hidden" />
      )}

      {/* Icon */}
      <div className={cn(
        "relative z-10 flex shrink-0 items-center justify-center rounded-full",
        config.bg,
        compact ? "size-6" : "size-8"
      )}>
        <Icon className={cn(config.color, compact ? "size-3" : "size-4")} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className={cn(
            "font-medium",
            compact ? "text-xs" : "text-sm"
          )}>
            {activity.title}
          </p>
          <span className={cn(
            "shrink-0 text-muted-foreground",
            compact ? "text-[10px]" : "text-xs"
          )}>
            {formatTimeAgo(activity.created_at)}
          </span>
        </div>
        <p className={cn(
          "text-muted-foreground truncate",
          compact ? "text-[11px]" : "text-xs"
        )}>
          {activity.description}
        </p>
      </div>
    </motion.div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function CiriActivityFeed({
  className,
  maxItems = 10,
  showHeader = true,
  compact = false
}: ActivityFeedProps) {
  const [activities, setActivities] = useState<CiriActivity[]>(mockActivities);
  const [isLoading, setIsLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(new Date());

  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

  const fetchActivities = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/email/activities?limit=${maxItems}`);
      if (response.ok) {
        const data = await response.json();
        if (data.activities && data.activities.length > 0) {
          setActivities(data.activities);
        }
        // If no activities from API, keep mock data for demo
      }
    } catch {
      // Keep mock data on error
    } finally {
      setIsLoading(false);
      setLastUpdate(new Date());
    }
  };

  // Poll for updates every 30 seconds
  useEffect(() => {
    fetchActivities();
    const interval = setInterval(fetchActivities, 30000);
    return () => clearInterval(interval);
  }, [maxItems]);

  const displayedActivities = activities.slice(0, maxItems);

  if (compact) {
    return (
      <div className={cn("space-y-1", className)}>
        <AnimatePresence mode="popLayout">
          {displayedActivities.map((activity, index) => (
            <ActivityItem
              key={activity.id}
              activity={activity}
              index={index}
              compact
            />
          ))}
        </AnimatePresence>
      </div>
    );
  }

  return (
    <Card className={className}>
      {showHeader && (
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CiriLogo size="sm" />
              <div>
                <CardTitle className="text-base">Hva gjør Ciri?</CardTitle>
                <p className="text-xs text-muted-foreground">
                  Siste aktiviteter
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="size-8"
              onClick={fetchActivities}
              disabled={isLoading}
            >
              <RefreshCwIcon className={cn("size-4", isLoading && "animate-spin")} />
            </Button>
          </div>
        </CardHeader>
      )}
      <CardContent className={showHeader ? "pt-0" : ""}>
        {displayedActivities.length > 0 ? (
          <ScrollArea className="h-[300px] pr-4">
            <div className="space-y-0">
              <AnimatePresence mode="popLayout">
                {displayedActivities.map((activity, index) => (
                  <ActivityItem
                    key={activity.id}
                    activity={activity}
                    index={index}
                  />
                ))}
              </AnimatePresence>
            </div>
          </ScrollArea>
        ) : (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="flex size-12 items-center justify-center rounded-full bg-muted mb-3">
              <ClockIcon className="size-6 text-muted-foreground" />
            </div>
            <p className="font-medium text-sm">Ingen aktivitet ennå</p>
            <p className="text-xs text-muted-foreground mt-1">
              Ciri venter på innkommende e-poster
            </p>
          </div>
        )}

        {/* Last update indicator */}
        <div className="flex items-center justify-center gap-2 mt-4 pt-3 border-t">
          <div className="size-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs text-muted-foreground">
            Lytter på innkommende e-post
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// EMAIL SETUP GUIDE COMPONENT
// ============================================================================

export function EmailSetupGuide() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MailIcon className="size-5" />
          Sett opp e-postovervåking
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          La Ciri automatisk hente fakturaer og kvitteringer fra e-posten din.
        </p>

        <div className="space-y-3">
          <div className="rounded-lg border p-3">
            <p className="font-medium text-sm mb-1">1. Videresend e-poster</p>
            <p className="text-xs text-muted-foreground">
              Sett opp automatisk videresending av fakturaer til:
            </p>
            <code className="mt-2 block rounded bg-muted px-2 py-1 text-xs font-mono">
              bilag@dittselskap.ciri.no
            </code>
          </div>

          <div className="rounded-lg border p-3">
            <p className="font-medium text-sm mb-1">2. Eller send manuelt</p>
            <p className="text-xs text-muted-foreground">
              Videresend enkeltfakturaer direkte til Ciri når du mottar dem.
            </p>
          </div>

          <div className="rounded-lg border p-3">
            <p className="font-medium text-sm mb-1">3. Ciri gjør resten</p>
            <p className="text-xs text-muted-foreground">
              Ciri leser fakturaen, kategoriserer den, og matcher den med banktransaksjoner.
            </p>
          </div>
        </div>

        <Badge variant="outline" className="w-full justify-center py-2">
          <SparklesIcon className="mr-2 size-3" />
          Automatisk OCR og kategorisering
        </Badge>
      </CardContent>
    </Card>
  );
}
