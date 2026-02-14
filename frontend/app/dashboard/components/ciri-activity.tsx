"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  BrainCircuitIcon,
  CheckCircle2Icon,
  FileTextIcon,
  MailIcon,
  CalculatorIcon,
  SparklesIcon
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { nb } from "date-fns/locale";

interface ActivityItem {
  id: string;
  type: "bilag_posted" | "email_processed" | "mva_calculated" | "learning";
  title: string;
  detail: string;
  timestamp: Date;
}

const activityItems: ActivityItem[] = [
  {
    id: "1",
    type: "bilag_posted",
    title: "Bilag automatisk bokført",
    detail: "Adobe Systems → Konto 6540 Programvare",
    timestamp: new Date(Date.now() - 1000 * 60 * 5)
  },
  {
    id: "2",
    type: "email_processed",
    title: "E-post behandlet",
    detail: "Faktura fra Telenor mottatt og bokført",
    timestamp: new Date(Date.now() - 1000 * 60 * 45)
  },
  {
    id: "3",
    type: "mva_calculated",
    title: "MVA beregnet",
    detail: "6. termin klar til innsending: kr 23 450",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2)
  },
  {
    id: "4",
    type: "learning",
    title: "Nytt mønster lært",
    detail: "GitHub faktura → Konto 6540",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 4)
  },
  {
    id: "5",
    type: "bilag_posted",
    title: "Bilag automatisk bokført",
    detail: "Ruter AS → Konto 7140 Reise",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 6)
  }
];

const typeConfig = {
  bilag_posted: {
    icon: FileTextIcon,
    color: "text-green-600",
    bgColor: "bg-green-100 dark:bg-green-900/30"
  },
  email_processed: {
    icon: MailIcon,
    color: "text-blue-600",
    bgColor: "bg-blue-100 dark:bg-blue-900/30"
  },
  mva_calculated: {
    icon: CalculatorIcon,
    color: "text-purple-600",
    bgColor: "bg-purple-100 dark:bg-purple-900/30"
  },
  learning: {
    icon: SparklesIcon,
    color: "text-amber-600",
    bgColor: "bg-amber-100 dark:bg-amber-900/30"
  }
};

export default function CiriActivity() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <BrainCircuitIcon className="size-5 text-[var(--primary)]" />
          Ciri aktivitet
          <Badge
            variant="secondary"
            className="ml-auto border-green-200 bg-green-100 text-green-700 dark:border-green-900/30 dark:bg-green-900/30">
            <span className="mr-1.5 size-1.5 animate-pulse rounded-full bg-green-500" />
            Aktiv
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative space-y-4">
          {/* Timeline line */}
          <div className="absolute left-4 top-2 h-[calc(100%-16px)] w-px bg-gradient-to-b from-[var(--primary)]/50 via-border to-transparent" />

          {activityItems.map((item) => {
            const config = typeConfig[item.type as keyof typeof typeConfig] ?? typeConfig.learning;
            const Icon = config.icon;

            return (
              <div key={item.id} className="relative flex gap-4 pl-1">
                {/* Icon */}
                <div
                  className={cn(
                    "relative z-10 flex size-8 shrink-0 items-center justify-center rounded-full",
                    config.bgColor
                  )}>
                  <Icon className={cn("size-4", config.color)} />
                </div>

                {/* Content */}
                <div className="flex-1 space-y-1 pb-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">{item.title}</p>
                    <span className="text-muted-foreground text-xs">
                      {formatDistanceToNow(item.timestamp, { addSuffix: true, locale: nb })}
                    </span>
                  </div>
                  <p className="text-muted-foreground text-sm">{item.detail}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Stats */}
        <div className="mt-4 grid grid-cols-3 gap-4 rounded-lg border bg-gradient-to-br from-[var(--primary)]/5 to-transparent p-4">
          <div className="text-center">
            <div className="font-display text-2xl font-bold text-[var(--primary)]">247</div>
            <p className="text-muted-foreground text-xs">Bilag i år</p>
          </div>
          <div className="text-center">
            <div className="font-display text-2xl font-bold text-[var(--primary)]">98%</div>
            <p className="text-muted-foreground text-xs">Auto-bokført</p>
          </div>
          <div className="text-center">
            <div className="font-display text-2xl font-bold text-[var(--primary)]">18t</div>
            <p className="text-muted-foreground text-xs">Spart tid</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
