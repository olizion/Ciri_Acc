"use client";

import { useState, useCallback, useEffect } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  RefreshCwIcon,
  FileTextIcon,
  CheckCircle2Icon,
  WalletIcon,
  SparklesIcon,
  TrendingUpIcon,
  BarChart3Icon,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ── Mock dashboard content ──

function MockStatsRow() {
  return (
    <div className="grid grid-cols-3 gap-4">
      <div className="rounded-lg border bg-gradient-to-br from-[var(--primary)]/[0.06] to-transparent p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-muted-foreground">Totalt i år</span>
          <FileTextIcon className="size-4 text-muted-foreground" />
        </div>
        <p className="font-display text-2xl font-bold">247</p>
        <p className="text-xs text-muted-foreground mt-1">bilag registrert</p>
      </div>
      <div className="rounded-lg border bg-gradient-to-br from-green-500/[0.06] to-transparent p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-muted-foreground">Bokført</span>
          <CheckCircle2Icon className="size-4 text-green-600" />
        </div>
        <p className="font-display text-2xl font-bold text-green-600">231</p>
        <p className="text-xs text-muted-foreground mt-1">93.5% fullført</p>
      </div>
      <div className="rounded-lg border bg-gradient-to-br from-amber-500/[0.06] to-transparent p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-muted-foreground">Total MVA</span>
          <WalletIcon className="size-4 text-amber-600" />
        </div>
        <p className="font-display text-2xl font-bold">kr 482 310</p>
        <p className="text-xs text-muted-foreground mt-1">fradragsberettiget</p>
      </div>
    </div>
  );
}

function MockBilagList() {
  const items = [
    { nr: "2025-0247", vendor: "Microsoft Norway AS", amount: "kr 4 990", status: "Bokført", color: "text-green-600 bg-green-100" },
    { nr: "2025-0246", vendor: "Figma Inc.", amount: "kr 1 250", status: "Venter", color: "text-amber-600 bg-amber-100" },
    { nr: "2025-0245", vendor: "AWS Europe", amount: "kr 8 320", status: "Bokført", color: "text-green-600 bg-green-100" },
    { nr: "2025-0244", vendor: "Telenor ASA", amount: "kr 599", status: "Bokført", color: "text-green-600 bg-green-100" },
  ];

  return (
    <div className="rounded-lg border divide-y">
      {items.map((item) => (
        <div key={item.nr} className="flex items-center gap-4 p-3.5">
          <div className="flex size-9 items-center justify-center rounded-lg bg-[var(--primary)]/10">
            <span className="text-xs font-bold text-[var(--primary)]">
              {item.vendor.split(" ").map(w => w[0]).join("").slice(0, 2)}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs text-muted-foreground">#{item.nr}</span>
              <span className="font-medium text-sm truncate">{item.vendor}</span>
            </div>
          </div>
          <span className="font-mono text-sm font-medium">{item.amount}</span>
          <Badge variant="outline" className={cn("text-xs", item.color)}>
            {item.status}
          </Badge>
        </div>
      ))}
    </div>
  );
}

function MockChart() {
  const bars = [65, 45, 80, 55, 90, 70, 85, 40, 75, 60, 95, 50];
  const months = ["Jan", "Feb", "Mar", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Des"];

  return (
    <div className="rounded-lg border p-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-medium text-sm">Månedlig aktivitet</h3>
          <p className="text-xs text-muted-foreground">Bilag per måned i 2025</p>
        </div>
        <BarChart3Icon className="size-4 text-muted-foreground" />
      </div>
      <div className="flex items-end gap-1.5 h-28">
        {bars.map((h, i) => (
          <div key={i} className="flex-1 flex flex-col items-center gap-1">
            <div
              className="w-full rounded-t bg-[var(--primary)]/20 hover:bg-[var(--primary)]/40 transition-colors"
              style={{ height: `${h}%` }}
            />
            <span className="text-[9px] text-muted-foreground">{months[i]}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function MockCiriCard() {
  return (
    <div className="rounded-lg border border-[var(--primary)]/20 bg-[var(--primary)]/[0.04] p-4">
      <div className="flex items-start gap-3">
        <div className="flex size-9 items-center justify-center rounded-full bg-[var(--primary)]/10">
          <SparklesIcon className="size-4 text-[var(--primary)]" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium text-[var(--primary)] mb-1">Ciri sitt sammendrag</p>
          <p className="text-sm text-foreground/70 leading-relaxed">
            Du har 16 bilag som venter på godkjenning. 3 av disse er utenlandsfakturaer
            som krever snudd avregning. Alle MVA-fradrag er oppdaterte for Q1 2025.
          </p>
          <div className="flex gap-2 mt-3">
            <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
              <TrendingUpIcon className="size-3 mr-1" />
              93% treffsikkerhet
            </Badge>
            <Badge variant="outline" className="text-xs">247 bilag behandlet</Badge>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Auto-replaying preview ──

function CrystallizePreview() {
  const [key, setKey] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => setKey((k) => k + 1), 3500);
    return () => clearInterval(interval);
  }, []);

  const replay = useCallback(() => setKey((k) => k + 1), []);

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">Crystallize — Staggered</h2>
            <p className="text-sm text-muted-foreground">
              Hvert panel skarpstilles med 120ms forsinkelse — en bølge av klarhet.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={replay} className="gap-2">
            <RefreshCwIcon className="size-3.5" />
            Replay
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div key={key} className="space-y-4">
          <div className="animate-crystallize-stagger-1">
            <MockStatsRow />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="animate-crystallize-stagger-2">
              <MockBilagList />
            </div>
            <div className="space-y-4">
              <div className="animate-crystallize-stagger-3">
                <MockChart />
              </div>
              <div className="animate-crystallize-stagger-4">
                <MockCiriCard />
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Page ──

export default function LoadingDemoPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight">Crystallize Loading</h1>
        <p className="text-muted-foreground">
          Aktiv animasjon — auto-replay hvert 3.5s. Denne effekten brukes på alle dashboard-sider.
        </p>
      </div>
      <CrystallizePreview />
    </div>
  );
}
