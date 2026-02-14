"use client";

import { Card, CardContent, CardHeader, CardTitle, CardAction } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  FileTextIcon,
  CheckCircle2Icon,
  ClockIcon,
  AlertCircleIcon,
  ChevronRightIcon,
  PlusIcon,
  SparklesIcon
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { nb } from "date-fns/locale";

interface BilagItem {
  id: string;
  supplier: string;
  amount: string;
  date: Date;
  status: "auto_posted" | "pending" | "needs_review";
  category: string;
  confidence?: number;
}

const recentBilag: BilagItem[] = [
  {
    id: "2025-0247",
    supplier: "Adobe Systems",
    amount: "kr 4 500",
    date: new Date(Date.now() - 1000 * 60 * 15),
    status: "auto_posted",
    category: "Programvare",
    confidence: 98
  },
  {
    id: "2025-0246",
    supplier: "Telenor Norge",
    amount: "kr 899",
    date: new Date(Date.now() - 1000 * 60 * 60 * 2),
    status: "auto_posted",
    category: "Telefon",
    confidence: 99
  },
  {
    id: "2025-0245",
    supplier: "Ukjent leverandør",
    amount: "kr 2 340",
    date: new Date(Date.now() - 1000 * 60 * 60 * 4),
    status: "needs_review",
    category: "Trenger kategori"
  },
  {
    id: "2025-0244",
    supplier: "Ruter AS",
    amount: "kr 814",
    date: new Date(Date.now() - 1000 * 60 * 60 * 8),
    status: "pending",
    category: "Reise"
  },
  {
    id: "2025-0243",
    supplier: "AWS",
    amount: "kr 3 200",
    date: new Date(Date.now() - 1000 * 60 * 60 * 12),
    status: "auto_posted",
    category: "Hosting",
    confidence: 97
  },
  {
    id: "2025-0242",
    supplier: "Circle K",
    amount: "kr 650",
    date: new Date(Date.now() - 1000 * 60 * 60 * 24),
    status: "auto_posted",
    category: "Drivstoff",
    confidence: 95
  }
];

const statusConfig = {
  auto_posted: {
    label: "Automatisk bokført",
    icon: CheckCircle2Icon,
    color: "text-green-600",
    bgColor: "bg-green-50 dark:bg-green-950/30"
  },
  pending: {
    label: "Venter godkjenning",
    icon: ClockIcon,
    color: "text-amber-600",
    bgColor: "bg-amber-50 dark:bg-amber-950/30"
  },
  needs_review: {
    label: "Trenger gjennomgang",
    icon: AlertCircleIcon,
    color: "text-red-500",
    bgColor: "bg-red-50 dark:bg-red-950/30"
  }
};

export default function BilagFeed() {
  const pendingCount = recentBilag.filter(
    (b) => b.status === "pending" || b.status === "needs_review"
  ).length;

  return (
    <Card className="flex flex-col">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <FileTextIcon className="size-5" />
          Siste bilag
        </CardTitle>
        <CardAction>
          <Button variant="outline" size="sm">
            <PlusIcon className="mr-1 size-4" />
            Last opp
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent className="flex-1 p-0">
        <ScrollArea className="h-[400px]">
          <div className="space-y-1 px-6 pb-6">
            {recentBilag.map((bilag) => {
              const status = statusConfig[bilag.status as keyof typeof statusConfig] ?? statusConfig.pending;
              const StatusIcon = status.icon;

              return (
                <div
                  key={bilag.id}
                  className={cn(
                    "group relative flex items-center gap-4 rounded-lg border p-4 transition-all hover:border-[var(--primary)]/30 hover:bg-[var(--primary)]/5",
                    bilag.status !== "auto_posted" && status.bgColor
                  )}>
                  {/* Thumbnail/Icon */}
                  <div className="bg-muted flex size-12 shrink-0 items-center justify-center rounded-lg">
                    <FileTextIcon className="text-muted-foreground size-6" />
                  </div>

                  {/* Content */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate font-medium">{bilag.supplier}</p>
                      {bilag.confidence && bilag.confidence >= 95 && (
                        <SparklesIcon className="size-3.5 text-[var(--primary)]" />
                      )}
                    </div>
                    <div className="text-muted-foreground mt-0.5 flex items-center gap-2 text-sm">
                      <span>#{bilag.id}</span>
                      <span>·</span>
                      <span>{bilag.category}</span>
                      <span>·</span>
                      <span>
                        {formatDistanceToNow(bilag.date, { addSuffix: true, locale: nb })}
                      </span>
                    </div>
                  </div>

                  {/* Amount and Status */}
                  <div className="flex shrink-0 items-center gap-4">
                    <div className="text-right">
                      <p className="font-display font-semibold">{bilag.amount}</p>
                      <div className={cn("flex items-center gap-1 text-xs", status.color)}>
                        <StatusIcon className="size-3" />
                        <span>{status.label}</span>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="opacity-0 transition-opacity group-hover:opacity-100">
                      <ChevronRightIcon className="size-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>

        {/* Footer */}
        <div className="border-t px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {pendingCount > 0 && (
                <Badge variant="secondary" className="bg-amber-100 text-amber-700 dark:bg-amber-900/30">
                  {pendingCount} venter
                </Badge>
              )}
              <span className="text-muted-foreground text-sm">
                Ciri har bokført 12 bilag automatisk i dag
              </span>
            </div>
            <Button variant="link" size="sm" className="text-[var(--primary)]">
              Se alle bilag
              <ChevronRightIcon className="ml-1 size-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
