"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CalendarIcon, SparklesIcon, ChevronRightIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { statusConfig } from "../constants";
import type { MVATermin } from "../types";

interface AllTerminerListProps {
  terminer: MVATermin[];
  autonomyMode: "assistant" | "autonomous";
  onTerminClick: (termin: MVATermin) => void;
}

export function AllTerminerList({ terminer, autonomyMode, onTerminClick }: AllTerminerListProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CalendarIcon className="size-5" />
          Alle terminer 2025
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {terminer.map((termin) => {
            const status = statusConfig[termin.status as keyof typeof statusConfig] ?? statusConfig.upcoming;
            const StatusIcon = status.icon;

            return (
              <div
                key={termin.id}
                onClick={() => onTerminClick(termin)}
                className={cn(
                  "group flex items-center gap-4 rounded-lg border p-4 transition-all cursor-pointer hover:border-[var(--primary)]/30 hover:bg-[var(--primary)]/5",
                  termin.status === "ready" && "border-[var(--primary)]/30 bg-[var(--primary)]/5"
                )}>
                <div
                  className={cn(
                    "flex size-10 shrink-0 items-center justify-center rounded-full",
                    status.bgColor
                  )}>
                  <StatusIcon className={cn("size-5", status.color)} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{termin.termin}</p>
                    <Badge variant="outline" className="text-xs">
                      {termin.period}
                    </Badge>
                    {termin.status === "submitted" && autonomyMode === "autonomous" && (
                      <Badge variant="secondary" className="gap-1 text-xs">
                        <SparklesIcon className="size-3" />
                        Ciri
                      </Badge>
                    )}
                  </div>
                  <p className="text-muted-foreground text-sm">
                    {termin.status === "submitted"
                      ? `Sendt ${new Date(termin.submittedDate!).toLocaleDateString("nb-NO")}`
                      : termin.status === "ready"
                        ? `Frist: ${new Date(termin.deadline!).toLocaleDateString("nb-NO")}`
                        : "Kommende"}
                  </p>
                </div>
                <div className="hidden grid-cols-3 gap-8 text-right sm:grid">
                  <div>
                    <p className="text-muted-foreground text-xs">Utgående</p>
                    <p className="font-display font-medium">
                      kr {termin.utgaende.toLocaleString("nb-NO")}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Inngående</p>
                    <p className="font-display font-medium">
                      kr {termin.inngaende.toLocaleString("nb-NO")}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Netto</p>
                    <p className="font-display font-medium text-[var(--primary)]">
                      kr {Math.abs(termin.tilGode).toLocaleString("nb-NO")}
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="opacity-0 transition-opacity group-hover:opacity-100">
                  <ChevronRightIcon className="size-4" />
                </Button>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
