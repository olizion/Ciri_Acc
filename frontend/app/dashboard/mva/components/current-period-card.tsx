"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogTrigger } from "@/components/ui/dialog";
import {
  TrendingUpIcon,
  TrendingDownIcon,
  ReceiptIcon,
  SendIcon,
  FileTextIcon
} from "lucide-react";
import { MVAPreviewDialog } from "./mva-preview-dialog";
import type { MVATermin } from "../types";

interface CurrentPeriodCardProps {
  currentTermin: MVATermin;
}

export function CurrentPeriodCard({ currentTermin }: CurrentPeriodCardProps) {
  return (
    <Card className="relative overflow-hidden border-[var(--primary)]/30 bg-gradient-to-br from-[var(--primary)]/5 via-transparent to-[var(--secondary)]/5">
      <div className="pointer-events-none absolute -right-20 -top-20 size-64 rounded-full bg-[var(--primary)]/10 blur-3xl" />
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <Badge className="mb-2 border-[var(--primary)]/30 bg-[var(--primary)]/10 text-[var(--primary)]">
              Klar til innsending
            </Badge>
            <CardTitle className="text-xl">
              {currentTermin.termin} ({currentTermin.period})
            </CardTitle>
            <CardDescription>
              Frist: {new Date(currentTermin.deadline!).toLocaleDateString("nb-NO", {
                day: "numeric",
                month: "long",
                year: "numeric"
              })}
            </CardDescription>
          </div>
          <div className="text-right">
            <p className="text-muted-foreground text-sm">Å betale</p>
            <p className="font-display text-3xl font-bold text-[var(--primary)]">
              kr {Math.abs(currentTermin.tilGode).toLocaleString("nb-NO")}
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid gap-6 sm:grid-cols-3">
          <div className="rounded-lg border bg-white/50 p-4 dark:bg-white/5">
            <div className="flex items-center gap-2">
              <TrendingUpIcon className="size-4 text-green-600" />
              <span className="text-muted-foreground text-sm">Utgående MVA</span>
            </div>
            <p className="font-display mt-1 text-2xl font-semibold">
              kr {currentTermin.utgaende.toLocaleString("nb-NO")}
            </p>
          </div>
          <div className="rounded-lg border bg-white/50 p-4 dark:bg-white/5">
            <div className="flex items-center gap-2">
              <TrendingDownIcon className="size-4 text-red-500" />
              <span className="text-muted-foreground text-sm">Inngående MVA</span>
            </div>
            <p className="font-display mt-1 text-2xl font-semibold">
              kr {currentTermin.inngaende.toLocaleString("nb-NO")}
            </p>
          </div>
          <div className="rounded-lg border bg-white/50 p-4 dark:bg-white/5">
            <div className="flex items-center gap-2">
              <ReceiptIcon className="size-4 text-[var(--primary)]" />
              <span className="text-muted-foreground text-sm">Netto</span>
            </div>
            <p className="font-display mt-1 text-2xl font-semibold text-[var(--primary)]">
              kr {Math.abs(currentTermin.tilGode).toLocaleString("nb-NO")}
            </p>
          </div>
        </div>
        <div className="mt-6 flex gap-3">
          <Button className="flex-1">
            <SendIcon className="mr-2 size-4" />
            Send til Altinn
          </Button>
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline">
                <FileTextIcon className="mr-2 size-4" />
                Forhåndsvis
              </Button>
            </DialogTrigger>
            <MVAPreviewDialog />
          </Dialog>
        </div>
      </CardContent>
    </Card>
  );
}
