"use client";

import Link from "next/link";
import {
  BookOpenIcon,
  BrainCircuitIcon,
  LandmarkIcon,
  ReceiptIcon,
  CalculatorIcon,
  UsersIcon,
  FileBarChartIcon,
  MailIcon,
  ShieldCheckIcon,
  CpuIcon,
  ArrowRightIcon,
  type LucideIcon
} from "lucide-react";
import { cn } from "@/lib/utils";

// Section metadata matching the dokumentasjon page
const SECTION_META: Record<string, { title: string; icon: LucideIcon; description: string }> = {
  "kom-i-gang": {
    title: "Kom i gang",
    icon: BookOpenIcon,
    description: "Opprett konto, koble bank og send ditt forste bilag."
  },
  bokforing: {
    title: "Bokforing",
    icon: BrainCircuitIcon,
    description: "AI-drevet bokforing med OCR og smart kontering."
  },
  bank: {
    title: "Bank og transaksjoner",
    icon: LandmarkIcon,
    description: "Importer transaksjoner, match mot bilag og regler."
  },
  faktura: {
    title: "Faktura",
    icon: ReceiptIcon,
    description: "Opprett, send og spor fakturaer med automatisk purring."
  },
  mva: {
    title: "MVA-handtering",
    icon: CalculatorIcon,
    description: "MVA-beregning, fradrag og rapportering."
  },
  lonn: {
    title: "Lonn og personal",
    icon: UsersIcon,
    description: "Lonnskjoring, skattekort og A-melding."
  },
  rapporter: {
    title: "Rapporter",
    icon: FileBarChartIcon,
    description: "Resultat, balanse, arsoppgjor og SAF-T."
  },
  "e-post": {
    title: "E-post automatisering",
    icon: MailIcon,
    description: "Automatisk bilagsopprettelse fra innboksen."
  },
  sikkerhet: {
    title: "Sikkerhet og GDPR",
    icon: ShieldCheckIcon,
    description: "Kryptering, tilgangskontroll og personvern."
  },
  "teknisk-arkitektur": {
    title: "Teknisk arkitektur",
    icon: CpuIcon,
    description: "Konfidensscoring, regelsystem og laering."
  }
};

interface LearnMoreDocsProps {
  sections: string[];
  className?: string;
  variant?: "default" | "marketing";
}

export default function LearnMoreDocs({
  sections,
  className,
  variant = "default"
}: LearnMoreDocsProps) {
  const items = sections.map((id) => ({ id, ...SECTION_META[id] })).filter((item) => item.title);

  if (items.length === 0) return null;

  return (
    <div className={cn("mt-12", className)}>
      <div
        className={cn(
          "rounded-2xl border p-6",
          variant === "marketing"
            ? "border-[#3E715C]/15 bg-[#3E715C]/[0.03]"
            : "border-border bg-muted/50"
        )}>
        <div className="flex items-center gap-2.5">
          <BookOpenIcon className="h-4 w-4 text-primary" />
          <p className="text-[12px] font-bold tracking-[0.1em] text-primary uppercase">Lær mer</p>
        </div>
        <p className="mt-1.5 text-[13px] text-muted-foreground">
          Utforsk relaterte emner i dokumentasjonen.
        </p>

        <div
          className={cn(
            "mt-4 grid gap-2",
            items.length === 1
              ? "grid-cols-1"
              : items.length === 2
                ? "grid-cols-1 sm:grid-cols-2"
                : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
          )}>
          {items.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.id}
                href={`/dokumentasjon?section=${item.id}`}
                className={cn(
                  "group flex items-start gap-3 rounded-xl border px-4 py-3 transition-all",
                  variant === "marketing"
                    ? "border-[#3E715C]/10 bg-white/60 hover:border-[#3E715C]/30 hover:bg-white hover:shadow-sm"
                    : "border-border bg-card hover:border-primary/30 hover:shadow-sm hover:shadow-primary/5"
                )}>
                <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 transition-colors group-hover:bg-primary/15">
                  <Icon className="h-4 w-4 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <p className="text-[12px] font-semibold text-foreground">{item.title}</p>
                    <ArrowRightIcon className="h-3 w-3 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
                  </div>
                  <p className="mt-0.5 text-[13px] leading-relaxed text-muted-foreground">
                    {item.description}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
