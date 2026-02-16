"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogTrigger } from "@/components/ui/dialog";
import {
  SendIcon,
  ClockIcon,
  SparklesIcon,
  FileTextIcon,
  TrendingUpIcon,
  TrendingDownIcon,
  ReceiptIcon,
  CalendarIcon
} from "lucide-react";
import CiriLogo from "@/components/layout/ciri-logo";
import { MVAPreviewDialog } from "./mva-preview-dialog";
import type { MVATermin } from "../types";

interface CiriSummaryCardProps {
  currentTermin: MVATermin;
  previewOpen: boolean;
  onPreviewOpenChange: (open: boolean) => void;
}

export function CiriSummaryCard({ currentTermin, previewOpen, onPreviewOpenChange }: CiriSummaryCardProps) {
  return (
    <Card className="relative overflow-hidden border-[var(--primary)]/30">
      <div className="pointer-events-none absolute -right-20 -top-20 size-64 rounded-full bg-[var(--primary)]/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-10 -left-10 size-40 rounded-full bg-[var(--secondary)]/10 blur-2xl" />

      <CardHeader className="pb-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <CiriLogo size="sm" />
              <span className="absolute -bottom-0.5 -right-0.5 flex size-3">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-green-400 opacity-75" />
                <span className="relative inline-flex size-3 rounded-full bg-green-500" />
              </span>
            </div>
            <div>
              <CardTitle className="flex items-center gap-2">
                <SparklesIcon className="size-5 text-[var(--primary)]" />
                Ciri håndterer MVA-meldingen
              </CardTitle>
              <CardDescription>
                Autonom modus aktiv for {currentTermin.termin}
              </CardDescription>
            </div>
          </div>
          <Badge className="border-[var(--primary)]/30 bg-[var(--primary)]/10 text-[var(--primary)]">
            <ClockIcon className="mr-1 size-3" />
            Planlagt innsending
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        <div className="rounded-xl border-2 border-[var(--primary)]/30 bg-gradient-to-r from-[var(--primary)]/10 via-[var(--primary)]/5 to-transparent p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex size-12 items-center justify-center rounded-full bg-[var(--primary)]/20">
                <SendIcon className="size-6 text-[var(--primary)]" />
              </div>
              <div>
                <p className="font-medium text-[var(--primary)]">Automatisk innsending planlagt</p>
                <p className="text-sm text-muted-foreground">
                  Ciri sender MVA-meldingen til Altinn <span className="font-semibold text-foreground">8. februar 2026 kl. 09:00</span>
                </p>
              </div>
            </div>
            <div className="hidden text-right sm:block">
              <p className="text-2xl font-bold text-[var(--primary)]">7 dager</p>
              <p className="text-xs text-muted-foreground">til innsending</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border bg-gradient-to-br from-[var(--primary)]/5 to-transparent p-5">
          <div className="flex gap-4">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[var(--primary)]/10">
              <SparklesIcon className="size-5 text-[var(--primary)]" />
            </div>
            <div className="space-y-2">
              <p className="text-sm leading-relaxed">
                <span className="font-medium">Jeg har gjennomgått alle 86 bilag</span> fra november og desember 2025.
                MVA-oppgaven er ferdig beregnet og validert mot SAF-T-kravene.
              </p>
              <p className="text-sm leading-relaxed text-muted-foreground">
                Basert på <span className="font-medium text-foreground">kr 181 000</span> i avgiftspliktig salg
                og <span className="font-medium text-foreground">kr 87 120</span> i fradragsberettigede kostnader,
                er netto MVA å betale <span className="font-semibold text-[var(--primary)]">kr 23 450</span>.
              </p>
              <p className="text-sm text-muted-foreground">
                Fristen er 10. februar 2026. Jeg sender meldingen automatisk <span className="font-medium text-foreground">2 dager før fristen</span> for å sikre at alt er i orden.
                Du trenger ikke gjøre noe — jeg gir deg beskjed når det er sendt.
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-4">
          <div className="rounded-lg border bg-white/50 p-4 dark:bg-white/5">
            <div className="flex items-center gap-2 text-muted-foreground">
              <TrendingUpIcon className="size-4 text-green-600" />
              <span className="text-xs">Utgående MVA</span>
            </div>
            <p className="font-display mt-1 text-xl font-semibold">
              kr {currentTermin.utgaende.toLocaleString("nb-NO")}
            </p>
          </div>
          <div className="rounded-lg border bg-white/50 p-4 dark:bg-white/5">
            <div className="flex items-center gap-2 text-muted-foreground">
              <TrendingDownIcon className="size-4 text-red-500" />
              <span className="text-xs">Inngående MVA</span>
            </div>
            <p className="font-display mt-1 text-xl font-semibold">
              kr {currentTermin.inngaende.toLocaleString("nb-NO")}
            </p>
          </div>
          <div className="rounded-lg border bg-white/50 p-4 dark:bg-white/5">
            <div className="flex items-center gap-2 text-muted-foreground">
              <ReceiptIcon className="size-4 text-[var(--primary)]" />
              <span className="text-xs">Netto å betale</span>
            </div>
            <p className="font-display mt-1 text-xl font-semibold text-[var(--primary)]">
              kr {Math.abs(currentTermin.tilGode).toLocaleString("nb-NO")}
            </p>
          </div>
          <div className="rounded-lg border bg-white/50 p-4 dark:bg-white/5">
            <div className="flex items-center gap-2 text-muted-foreground">
              <CalendarIcon className="size-4" />
              <span className="text-xs">Frist</span>
            </div>
            <p className="font-display mt-1 text-xl font-semibold">
              9 dager
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <Dialog open={previewOpen} onOpenChange={onPreviewOpenChange}>
            <DialogTrigger asChild>
              <Button variant="outline" className="flex-1 gap-2">
                <FileTextIcon className="size-4" />
                Se MVA-oppgave
              </Button>
            </DialogTrigger>
            <MVAPreviewDialog isAutoMode />
          </Dialog>
          <Button variant="ghost" className="flex-1 gap-2 text-muted-foreground hover:text-destructive">
            <ClockIcon className="size-4" />
            Utsett automatisk innsending
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
