"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ClockIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { ciriTimeline } from "../data/ciri-timeline";
import type { MVATermin } from "../types";

interface CiriActivityTimelineProps {
  currentTermin: MVATermin;
}

export function CiriActivityTimeline({ currentTermin }: CiriActivityTimelineProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <ClockIcon className="size-5" />
          Ciri-aktivitet for {currentTermin.termin}
        </CardTitle>
        <CardDescription>
          Tidslinje over hva Ciri har gjort for å forberede MVA-meldingen
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="relative">
          <div className="absolute left-5 top-0 h-full w-px bg-gradient-to-b from-green-500 via-[var(--primary)]/50 to-[var(--primary)]/30" />

          <div className="space-y-4">
            {ciriTimeline.map((event, index) => {
              const Icon = event.icon;
              const isScheduled = event.type === "scheduled";
              const isLastCompleted = event.type === "completed" && ciriTimeline[index + 1]?.type === "scheduled";

              return (
                <div key={event.id} className="relative flex gap-4 pl-2">
                  {isScheduled && index > 0 && ciriTimeline[index - 1]?.type === "completed" && (
                    <div className="absolute -top-2 left-0 right-0 flex items-center gap-2 pl-12">
                      <div className="h-px flex-1 bg-border" />
                      <span className="rounded-full bg-muted px-2 py-0.5 text-[12px] font-medium uppercase tracking-wider text-muted-foreground">
                        Planlagt
                      </span>
                      <div className="h-px flex-1 bg-border" />
                    </div>
                  )}
                  <div
                    className={cn(
                      "relative z-10 flex size-7 shrink-0 items-center justify-center rounded-full border-2 bg-background",
                      isScheduled
                        ? "border-dashed border-[var(--primary)]/50 bg-[var(--primary)]/5"
                        : isLastCompleted
                          ? "border-green-500 bg-green-50 dark:bg-green-900/30"
                          : "border-green-500/50 bg-green-50/50 dark:bg-green-900/20"
                    )}
                  >
                    <Icon
                      className={cn(
                        "size-3.5",
                        isScheduled
                          ? "text-[var(--primary)]/70"
                          : "text-green-600"
                      )}
                    />
                  </div>
                  <div className={cn("flex-1 pb-4", isScheduled && index > 0 && ciriTimeline[index - 1]?.type === "completed" && "pt-4")}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <p className={cn(
                          "text-sm",
                          isScheduled && "text-muted-foreground",
                          isLastCompleted && "font-medium text-green-700 dark:text-green-400"
                        )}>
                          {event.action}
                        </p>
                        {isScheduled && (
                          <Badge variant="outline" className="text-[12px] px-1.5 py-0">
                            Planlagt
                          </Badge>
                        )}
                      </div>
                      <span className={cn(
                        "text-xs",
                        isScheduled ? "text-[var(--primary)]" : "text-muted-foreground"
                      )}>
                        {isScheduled
                          ? new Date(event.timestamp.replace(" ", "T")).toLocaleDateString("nb-NO", { day: "numeric", month: "short" })
                          : event.timestamp.split(" ")[1]}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
