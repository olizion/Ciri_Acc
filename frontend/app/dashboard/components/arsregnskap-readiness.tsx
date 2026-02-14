"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle2Icon,
  AlertCircleIcon,
  ClipboardCheckIcon,
  ChevronRightIcon,
  FileTextIcon,
  CalculatorIcon,
  ScaleIcon,
  FileCheckIcon
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ReadinessItem {
  name: string;
  status: "complete" | "pending" | "warning";
  detail?: string;
  icon: React.ReactNode;
}

const readinessItems: ReadinessItem[] = [
  {
    name: "Bilag komplett",
    status: "complete",
    detail: "Alle 247 bilag bokført",
    icon: <FileTextIcon className="size-4" />
  },
  {
    name: "Bankavstemming",
    status: "complete",
    detail: "Avstemt per 31.12",
    icon: <CalculatorIcon className="size-4" />
  },
  {
    name: "MVA-oppgaver",
    status: "complete",
    detail: "Alle 6 terminer sendt",
    icon: <FileCheckIcon className="size-4" />
  },
  {
    name: "Avskrivninger",
    status: "warning",
    detail: "Trenger gjennomgang",
    icon: <ScaleIcon className="size-4" />
  },
  {
    name: "Periodiseringer",
    status: "pending",
    detail: "Venter på bekreftelse",
    icon: <ClipboardCheckIcon className="size-4" />
  }
];

export default function ArsregnskapReadiness() {
  const completedItems = readinessItems.filter((item) => item.status === "complete").length;
  const totalItems = readinessItems.length;
  const readinessScore = Math.round((completedItems / totalItems) * 100);

  return (
    <Card className="relative overflow-hidden">
      {/* Decorative background */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-[var(--primary)]/5 via-transparent to-[var(--secondary)]/5" />

      <CardHeader className="relative">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              <ClipboardCheckIcon className="size-5 text-[var(--primary)]" />
              Årsregnskap 2025
            </CardTitle>
            <CardDescription>Status for årsslutt</CardDescription>
          </div>
          <div className="text-right">
            <div className="font-display text-4xl font-bold text-[var(--primary)]">
              {readinessScore}%
            </div>
            <Badge
              variant="secondary"
              className="mt-1 border-[var(--primary)]/20 bg-[var(--primary)]/10 text-[var(--primary)]">
              Nesten klar
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="relative space-y-6">
        {/* Progress bar */}
        <div className="space-y-2">
          <Progress value={readinessScore} className="h-3" />
          <p className="text-muted-foreground text-sm">
            {completedItems} av {totalItems} oppgaver fullført
          </p>
        </div>

        {/* Checklist */}
        <div className="space-y-3">
          {readinessItems.map((item, index) => (
            <div
              key={index}
              className={cn(
                "flex items-center gap-3 rounded-lg border p-3 transition-colors",
                item.status === "complete" && "border-green-200 bg-green-50/50 dark:border-green-900/30 dark:bg-green-950/20",
                item.status === "warning" && "border-amber-200 bg-amber-50/50 dark:border-amber-900/30 dark:bg-amber-950/20",
                item.status === "pending" && "border-muted"
              )}>
              <div
                className={cn(
                  "flex size-8 items-center justify-center rounded-full",
                  item.status === "complete" && "bg-green-100 text-green-600 dark:bg-green-900/30",
                  item.status === "warning" && "bg-amber-100 text-amber-600 dark:bg-amber-900/30",
                  item.status === "pending" && "bg-muted text-muted-foreground"
                )}>
                {item.status === "complete" ? (
                  <CheckCircle2Icon className="size-4" />
                ) : item.status === "warning" ? (
                  <AlertCircleIcon className="size-4" />
                ) : (
                  item.icon
                )}
              </div>
              <div className="flex-1">
                <p className="font-medium">{item.name}</p>
                <p className="text-muted-foreground text-sm">{item.detail}</p>
              </div>
              {item.status !== "complete" && (
                <Button variant="ghost" size="sm" className="shrink-0">
                  Se
                  <ChevronRightIcon className="ml-1 size-4" />
                </Button>
              )}
            </div>
          ))}
        </div>

        {/* Action buttons */}
        <div className="flex gap-3">
          <Button className="flex-1">
            <ClipboardCheckIcon className="mr-2 size-4" />
            Generer årsregnskap
          </Button>
          <Button variant="outline">Forhåndsvis</Button>
        </div>

        {/* Deadline info */}
        <div className="rounded-lg border border-[var(--primary)]/20 bg-[var(--primary)]/5 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Frist for innsending</p>
              <p className="text-muted-foreground text-sm">30. juni 2026</p>
            </div>
            <Badge variant="secondary">152 dager igjen</Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
