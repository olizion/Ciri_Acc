"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, CalendarIcon, SparklesIcon } from "lucide-react";
import {
  CiriKPICards,
  UpcomingPaymentsCard,
  ArsregnskapReadiness,
  BilagFeed,
  CiriActivity,
  CiriChatWidget
} from "./components";

export default function DashboardContent() {
  const today = new Date();
  const greeting = getGreeting();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="mb-1 flex items-center gap-2">
            <h1 className="font-display text-2xl font-bold tracking-tight lg:text-3xl">
              {greeting}, Henrik
            </h1>
            <Badge
              variant="secondary"
              className="border-[var(--primary)]/20 bg-[var(--primary)]/10 text-[var(--primary)]">
              <SparklesIcon className="mr-1 size-3" />
              Ciri aktiv
            </Badge>
          </div>
          <p className="text-muted-foreground">
            Her er en oversikt over regnskapet til Mitt Konsulentselskap AS
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <CalendarIcon className="mr-2 size-4" />
            {today.toLocaleDateString("nb-NO", { month: "long", year: "numeric" })}
          </Button>
          <Button size="sm">
            <Download className="mr-2 size-4" />
            <span className="hidden sm:inline">Eksporter</span>
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div>
        <CiriKPICards />
      </div>

      {/* Main Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column - 2 cols */}
        <div className="space-y-6 lg:col-span-2">
          {/* Bilag Feed */}
          <BilagFeed />
        </div>

        {/* Right Column - 1 col */}
        <div className="space-y-6">
          {/* Arsregnskap Readiness */}
          <ArsregnskapReadiness />
        </div>
      </div>

      {/* Bottom Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Ciri Activity */}
        <CiriActivity />

        {/* Upcoming Payments */}
        <UpcomingPaymentsCard />

        {/* Chat Widget */}
        <CiriChatWidget />
      </div>
    </div>
  );
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 6) return "God natt";
  if (hour < 12) return "God morgen";
  if (hour < 18) return "God dag";
  return "God kveld";
}
